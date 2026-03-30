import { Router } from "express";
import type { Server } from "socket.io";
import multer from "multer";
import type { Types } from "mongoose";
import { requireAuth } from "../middleware/auth";
import { createRateLimit } from "../middleware/rate-limit";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { moderateMessage } from "../lib/moderation";
import { serializeMessage } from "../lib/serializers";
import { cloudinary } from "../config/cloudinary";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
const messageRateLimit = createRateLimit({ windowMs: 60_000, max: 120, prefix: "messages" });

function chatContainsUser(chatMembers: Types.ObjectId[], userId: string) {
  return chatMembers.some((member) => String(member) === userId);
}

function validateMessageBody(body: unknown) {
  const value = typeof body === "string" ? body.trim() : "";
  return value.slice(0, 2000);
}

router.post("/:chatId", requireAuth, messageRateLimit, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  const { contentType = "text", replyToMessageId, media } = req.body;
  const body = validateMessageBody(req.body.body);

  if (!chat || !chatContainsUser(chat.members as Types.ObjectId[], req.user!.id)) {
    return res.status(404).json({ message: "Chat not found." });
  }

  if (!["text", "image", "gif"].includes(contentType)) {
    return res.status(400).json({ message: "Unsupported message type." });
  }

  if (!body && !media?.url) {
    return res.status(400).json({ message: "Message content is required." });
  }

  const moderation = moderateMessage(body);
  const message = await Message.create({
    chatId: chat.id,
    senderId: req.user!.id,
    body,
    contentType,
    media,
    replyToMessageId,
    moderation,
    readBy: [req.user!.id]
  });

  chat.lastMessage = {
    body: message.body || `${contentType} shared`,
    senderId: req.user!._id,
    createdAt: message.createdAt
  };
  await chat.save();

  const payload = await serializeMessage(message);
  const io = req.app.get("io") as Server;
  io.to(chat.id).emit("message:created", payload);

  return res.status(201).json({ message: payload });
});

router.patch("/:messageId", requireAuth, messageRateLimit, async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message || String(message.senderId) !== req.user!.id) {
    return res.status(404).json({ message: "Message not found." });
  }

  const nextBody = validateMessageBody(req.body.body);
  if (!nextBody) {
    return res.status(400).json({ message: "Message body cannot be empty." });
  }

  message.body = nextBody;
  message.editedAt = new Date();
  message.moderation = moderateMessage(message.body);
  await message.save();

  const payload = await serializeMessage(message);
  const io = req.app.get("io") as Server;
  io.to(String(message.chatId)).emit("message:updated", payload);

  return res.json({ message: payload });
});

router.delete("/:messageId", requireAuth, messageRateLimit, async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message || String(message.senderId) !== req.user!.id) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.deletedAt = new Date();
  await message.save();

  const payload = await serializeMessage(message);
  const io = req.app.get("io") as Server;
  io.to(String(message.chatId)).emit("message:updated", payload);

  return res.json({ message: payload });
});

router.post("/:messageId/reactions", requireAuth, messageRateLimit, async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  const emoji = String(req.body.emoji ?? "").trim().slice(0, 24);

  if (!message || !emoji) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.reactions = message.reactions.filter(
    (reaction: { userId: Types.ObjectId; emoji: string }) => String(reaction.userId) !== req.user!.id || reaction.emoji !== emoji
  );
  message.reactions.push({ userId: req.user!._id, emoji });
  await message.save();

  const payload = await serializeMessage(message);
  const io = req.app.get("io") as Server;
  io.to(String(message.chatId)).emit("message:updated", payload);

  return res.json({ message: payload });
});

router.post("/upload", requireAuth, messageRateLimit, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required." });
  }

  if (!req.file.mimetype.startsWith("image/")) {
    return res.status(400).json({ message: "Only image uploads are supported." });
  }

  if (!cloudinary.config().cloud_name) {
    return res.status(400).json({ message: "Cloudinary is not configured." });
  }

  const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: "yazko"
  });

  return res.json({
    media: {
      url: uploaded.secure_url,
      publicId: uploaded.public_id
    }
  });
});

export { router as messagesRouter };

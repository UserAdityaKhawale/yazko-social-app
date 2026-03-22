import { Router } from "express";
import type { Server } from "socket.io";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { moderateMessage } from "../lib/moderation";
import { serializeMessage } from "../lib/serializers";
import { cloudinary } from "../config/cloudinary";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/:chatId", requireAuth, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);
  const { body, contentType = "text", replyToMessageId, media } = req.body;

  if (!chat || !chat.members.some((member: import("mongoose").Types.ObjectId) => String(member) === req.user!.id)) {
    return res.status(404).json({ message: "Chat not found." });
  }

  if (!body && !media?.url) {
    return res.status(400).json({ message: "Message content is required." });
  }

  const moderation = moderateMessage(body ?? "");
  const message = await Message.create({
    chatId: chat.id,
    senderId: req.user!.id,
    body: body ?? "",
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

router.patch("/:messageId", requireAuth, async (req, res) => {
  const message = await Message.findById(req.params.messageId);

  if (!message || String(message.senderId) !== req.user!.id) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.body = req.body.body ?? message.body;
  message.editedAt = new Date();
  message.moderation = moderateMessage(message.body);
  await message.save();

  const payload = await serializeMessage(message);
  const io = req.app.get("io") as Server;
  io.to(String(message.chatId)).emit("message:updated", payload);

  return res.json({ message: payload });
});

router.delete("/:messageId", requireAuth, async (req, res) => {
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

router.post("/:messageId/reactions", requireAuth, async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  const { emoji } = req.body;

  if (!message || !emoji) {
    return res.status(404).json({ message: "Message not found." });
  }

  message.reactions = message.reactions.filter(
    (reaction: { userId: import("mongoose").Types.ObjectId; emoji: string }) => String(reaction.userId) !== req.user!.id || reaction.emoji !== emoji
  );
  message.reactions.push({ userId: req.user!._id, emoji });
  await message.save();

  const payload = await serializeMessage(message);
  const io = req.app.get("io") as Server;
  io.to(String(message.chatId)).emit("message:updated", payload);

  return res.json({ message: payload });
});

router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required." });
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


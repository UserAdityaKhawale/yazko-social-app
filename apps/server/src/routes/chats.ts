import { Router } from "express";
import { Types } from "mongoose";
import { requireAuth } from "../middleware/auth";
import { createRateLimit } from "../middleware/rate-limit";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { serializeChat, serializeMessage } from "../lib/serializers";

const router = Router();
const chatRateLimit = createRateLimit({ windowMs: 60_000, max: 40, prefix: "chats" });

router.get("/", requireAuth, chatRateLimit, async (req, res) => {
  const chats = await Chat.find({ members: req.user!.id }).sort({ updatedAt: -1 });
  return res.json({ chats: chats.map(serializeChat) });
});

router.post("/", requireAuth, chatRateLimit, async (req, res) => {
  const { type, memberIds, name } = req.body as {
    type: "private" | "group";
    memberIds: string[];
    name?: string;
  };

  const members = [...new Set([req.user!.id, ...(memberIds ?? [])])].filter(Boolean);

  if (!type || members.length < 2) {
    return res.status(400).json({ message: "A chat needs at least two members." });
  }

  if (type === "private" && members.length !== 2) {
    return res.status(400).json({ message: "Private chats must have exactly two members." });
  }

  if (type === "group") {
    const normalizedName = String(name ?? "").trim();
    if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 60) {
      return res.status(400).json({ message: "Group chats need a name between 2 and 60 characters." });
    }
  }

  const chat = await Chat.create({
    type,
    name: type === "group" ? String(name).trim() : undefined,
    members
  });

  return res.status(201).json({ chat: serializeChat(chat) });
});

router.get("/:chatId/messages", requireAuth, chatRateLimit, async (req, res) => {
  const chat = await Chat.findById(req.params.chatId);

  if (!chat || !chat.members.some((member: Types.ObjectId) => String(member) === req.user!.id)) {
    return res.status(404).json({ message: "Chat not found." });
  }

  const messages = await Message.find({ chatId: chat.id }).sort({ createdAt: 1 }).limit(100);
  const payload = await Promise.all(messages.map((message) => serializeMessage(message)));

  return res.json({ messages: payload });
});

router.post("/:chatId/read", requireAuth, chatRateLimit, async (req, res) => {
  await Message.updateMany(
    {
      chatId: req.params.chatId,
      readBy: { $ne: req.user!.id }
    },
    { $push: { readBy: req.user!._id } }
  );

  return res.json({ ok: true });
});

export { router as chatsRouter };

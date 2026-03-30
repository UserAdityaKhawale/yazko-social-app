import type { IUserDocument } from "../models/User";
import type { IChatDocument } from "../models/Chat";
import type { IMessageDocument } from "../models/Message";

export function serializeUser(user: IUserDocument) {
  return {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatar: user.avatar,
    bio: user.bio,
    mood: user.mood,
    createdAt: user.createdAt
  };
}

export function serializeChat(chat: IChatDocument) {
  return {
    id: chat.id,
    type: chat.type,
    name: chat.name,
    members: chat.members,
    lastMessage: chat.lastMessage,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt
  };
}

export async function serializeMessage(message: IMessageDocument) {
  await message.populate([
    { path: "senderId", select: "username avatar mood" },
    { path: "replyToMessageId", select: "body senderId contentType media" }
  ]);

  return {
    id: message.id,
    chatId: message.chatId,
    sender: message.senderId,
    body: message.deletedAt ? "Message removed" : message.body,
    contentType: message.contentType,
    media: message.media,
    replyToMessageId: message.replyToMessageId,
    moderation: message.moderation,
    reactions: message.reactions,
    readBy: message.readBy,
    editedAt: message.editedAt,
    deletedAt: message.deletedAt,
    createdAt: message.createdAt
  };
}

"use client";

import { create } from "zustand";
import type { Chat, Message } from "@/lib/types";

type ChatState = {
  chats: Chat[];
  activeChatId: string | null;
  messagesByChat: Record<string, Message[]>;
  typingByChat: Record<string, string[]>;
  setChats: (chats: Chat[]) => void;
  setActiveChat: (chatId: string) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  addMessage: (chatId: string, message: Message) => void;
  upsertMessage: (chatId: string, message: Message) => void;
  setTypingUsers: (chatId: string, usernames: string[]) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  messagesByChat: {},
  typingByChat: {},
  setChats: (chats) => set({ chats }),
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  setMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: messages
      }
    })),
  addMessage: (chatId, message) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: [...(state.messagesByChat[chatId] ?? []), message]
      }
    })),
  upsertMessage: (chatId, message) =>
    set((state) => {
      const currentMessages = state.messagesByChat[chatId] ?? [];
      const index = currentMessages.findIndex((current) => current.id === message.id);
      const nextMessages = [...currentMessages];

      if (index === -1) {
        nextMessages.push(message);
      } else {
        nextMessages[index] = message;
      }

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: nextMessages
        }
      };
    }),
  setTypingUsers: (chatId, usernames) =>
    set((state) => ({
      typingByChat: {
        ...state.typingByChat,
        [chatId]: usernames
      }
    }))
}));

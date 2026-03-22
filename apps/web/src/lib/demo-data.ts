import type { Chat, Message, User } from "@/lib/types";

const now = new Date().toISOString();

export const demoUser: User = {
  id: "demo-user",
  username: "yazko-demo",
  email: "demo@yazko.local",
  avatar: "",
  bio: "Testing the free local-first Yazko demo.",
  mood: "grinding",
  createdAt: now
};

export const demoUsers: User[] = [
  demoUser,
  {
    id: "user-aarav",
    username: "Aarav",
    email: "aarav@yazko.local",
    avatar: "",
    bio: "Always online for memes.",
    mood: "locked in",
    createdAt: now
  },
  {
    id: "user-priya",
    username: "Priya",
    email: "priya@yazko.local",
    avatar: "",
    bio: "Collector of reaction-worthy replies.",
    mood: "plotting",
    createdAt: now
  }
];

export const demoChats: Chat[] = [
  {
    id: "chat-demo-1",
    type: "private",
    name: "Aarav",
    members: ["demo-user", "user-aarav"],
    lastMessage: {
      body: "Bring that orange UI energy here.",
      senderId: "user-aarav",
      createdAt: now
    },
    createdAt: now,
    updatedAt: now
  },
  {
    id: "chat-demo-2",
    type: "group",
    name: "Neon Squad",
    members: ["demo-user", "user-aarav", "user-priya"],
    lastMessage: {
      body: "Tonight we polish the demo screens.",
      senderId: "user-priya",
      createdAt: now
    },
    createdAt: now,
    updatedAt: now
  }
];

export const demoMessages: Record<string, Message[]> = {
  "chat-demo-1": [
    {
      id: "msg-1",
      chatId: "chat-demo-1",
      sender: {
        id: "user-aarav",
        username: "Aarav",
        avatar: ""
      },
      body: "Bring that orange UI energy here.",
      contentType: "text",
      moderation: {
        flagged: false,
        reasons: []
      },
      reactions: [{ userId: "demo-user", emoji: "fire" }],
      readBy: ["demo-user", "user-aarav"],
      createdAt: now
    },
    {
      id: "msg-2",
      chatId: "chat-demo-1",
      sender: {
        id: "demo-user",
        username: "yazko-demo",
        avatar: ""
      },
      body: "Already on it. Demo mode is enough for V1 polish.",
      contentType: "text",
      moderation: {
        flagged: false,
        reasons: []
      },
      reactions: [],
      readBy: ["demo-user"],
      createdAt: now
    }
  ],
  "chat-demo-2": [
    {
      id: "msg-3",
      chatId: "chat-demo-2",
      sender: {
        id: "user-priya",
        username: "Priya",
        avatar: ""
      },
      body: "Tonight we polish the demo screens.",
      contentType: "text",
      moderation: {
        flagged: false,
        reasons: []
      },
      reactions: [{ userId: "demo-user", emoji: "love" }],
      readBy: ["demo-user", "user-priya"],
      createdAt: now
    }
  ]
};

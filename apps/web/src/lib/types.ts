export type User = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar: string;
  bio: string;
  mood: string;
  createdAt: string;
};

export type Chat = {
  id: string;
  type: "private" | "group";
  name?: string;
  members: string[];
  lastMessage?: {
    body?: string;
    senderId?: string;
    createdAt?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  chatId: string;
  sender: {
    _id?: string;
    id?: string;
    username: string;
    avatar: string;
    mood?: string;
  };
  body: string;
  contentType: "text" | "image" | "gif";
  media?: {
    url?: string;
    publicId?: string;
  };
  replyToMessageId?: {
    _id?: string;
    body?: string;
    contentType?: string;
    media?: { url?: string };
    senderId?: string;
  };
  moderation: {
    flagged: boolean;
    reasons: string[];
  };
  reactions: Array<{
    userId: string;
    emoji: string;
  }>;
  readBy: string[];
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
};

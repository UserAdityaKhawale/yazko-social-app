import type { Chat, Message, User } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Request failed.");
  }

  return payload as T;
}

export const api = {
  signup: (body: { username: string; firstName: string; lastName: string; email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  me: (token: string) => request<{ user: User }>("/users/me", {}, token),
  discoverUsers: (token: string, search = "") =>
    request<{ users: User[] }>(`/users/discover?search=${encodeURIComponent(search)}`, {}, token),
  updateProfile: (token: string, body: Partial<Pick<User, "username" | "bio" | "mood" | "avatar">>) =>
    request<{ user: User }>(
      "/users/me",
      {
        method: "PATCH",
        body: JSON.stringify(body)
      },
      token
    ),
  chats: (token: string) => request<{ chats: Chat[] }>("/chats", {}, token),
  createChat: (
    token: string,
    body: { type: "private" | "group"; memberIds: string[]; name?: string }
  ) =>
    request<{ chat: Chat }>(
      "/chats",
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      token
    ),
  messages: (token: string, chatId: string) =>
    request<{ messages: Message[] }>(`/chats/${chatId}/messages`, {}, token),
  createMessage: (
    token: string,
    chatId: string,
    body: {
      body?: string;
      contentType?: "text" | "image" | "gif";
      replyToMessageId?: string;
      media?: { url: string; publicId?: string };
    }
  ) =>
    request<{ message: Message }>(
      `/messages/${chatId}`,
      {
        method: "POST",
        body: JSON.stringify(body)
      },
      token
    ),
  updateMessage: (token: string, messageId: string, body: { body: string }) =>
    request<{ message: Message }>(
      `/messages/${messageId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body)
      },
      token
    ),
  deleteMessage: (token: string, messageId: string) =>
    request<{ message: Message }>(
      `/messages/${messageId}`,
      {
        method: "DELETE"
      },
      token
    ),
  reactToMessage: (token: string, messageId: string, emoji: string) =>
    request<{ message: Message }>(
      `/messages/${messageId}/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ emoji })
      },
      token
    ),
  markRead: (token: string, chatId: string) =>
    request<{ ok: boolean }>(
      `/chats/${chatId}/read`,
      {
        method: "POST"
      },
      token
    ),
  uploadMedia: (token: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return request<{ media: { url: string; publicId?: string } }>(
      "/messages/upload",
      {
        method: "POST",
        body: formData
      },
      token
    );
  }
};

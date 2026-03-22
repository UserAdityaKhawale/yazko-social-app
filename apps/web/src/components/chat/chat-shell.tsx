"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Bell,
  Check,
  CheckCheck,
  ImageIcon,
  Laugh,
  LogOut,
  MessageCircle,
  MessageCircleReply,
  Mic,
  Pencil,
  Phone,
  PhoneCall,
  Search,
  Send,
  Settings,
  Sparkles,
  Trash2,
  UserCircle2,
  Users,
  Video
} from "lucide-react";
import { api } from "@/lib/api";
import type { Chat, Message, User } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useAuthStore } from "@/store/use-auth-store";
import { useChatStore } from "@/store/use-chat-store";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
const QUICK_REACTIONS = ["fire", "lol", "wild", "love"];
const MOODS = ["grinding", "tired", "plotting", "locked in"];
const CHAT_FILTERS = ["All", "Unread", "Groups", "Pinned"] as const;
const TABS = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "groups", label: "Groups", icon: Users },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "notifications", label: "Alerts", icon: Bell },
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "settings", label: "Settings", icon: Settings }
] as const;
const CALL_LOG = [
  { id: "call-1", name: "Aarav", state: "Missed", type: "Voice", time: "8:42 PM" },
  { id: "call-2", name: "Neon Squad", state: "Outgoing", type: "Video", time: "7:18 PM" },
  { id: "call-3", name: "Priya", state: "Incoming", type: "Voice", time: "Yesterday" }
];
const ALERTS = [
  { id: "alert-1", title: "New message", body: "Aarav dropped a new reply in your active chat." },
  { id: "alert-2", title: "Missed call", body: "You missed a voice call from Priya." },
  { id: "alert-3", title: "Mention", body: "Neon Squad mentioned you in the group thread." }
];

type AppTab = (typeof TABS)[number]["id"];
type TypingEvent = { chatId: string; isTyping: boolean; username: string };

function initials(value?: string) {
  return (value ?? "Y")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AvatarTile({ src, label, size = 44 }: { src?: string; label?: string; size?: number }) {
  if (src) {
    return <img alt={label ?? "Avatar"} className="rounded-[1.25rem] object-cover" height={size} src={src} width={size} />;
  }

  return (
    <div
      className="grid place-items-center rounded-[1.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,94,0,0.22),rgba(255,255,255,0.06))] font-semibold text-white"
      style={{ height: size, width: size }}
    >
      {initials(label)}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/8 bg-white/[0.025] p-8">
      <div className="max-w-md text-center">
        <h2 className="text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-400">{body}</p>
      </div>
    </div>
  );
}

function chatTitle(chat: Chat, currentUser?: User | null) {
  if (chat.type === "group") return chat.name ?? "Group chat";
  return chat.name ?? (chat.members.find((member) => member !== currentUser?.id) ?? "Direct thread");
}

function filterMatches(chat: Chat, filter: (typeof CHAT_FILTERS)[number], index: number) {
  if (filter === "Unread") return Boolean(chat.lastMessage?.body);
  if (filter === "Groups") return chat.type === "group";
  if (filter === "Pinned") return index < 2;
  return true;
}

export function ChatShell() {
  const { token, user, clearSession, setSession } = useAuthStore();
  const { chats, activeChatId, messagesByChat, typingByChat, setChats, setActiveChat, setMessages, upsertMessage, setTypingUsers } = useChatStore();

  const [activeTab, setActiveTab] = useState<AppTab>("chats");
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [discoverResults, setDiscoverResults] = useState<User[]>([]);
  const [chatFilter, setChatFilter] = useState<(typeof CHAT_FILTERS)[number]>("All");
  const [uploading, setUploading] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [notice, setNotice] = useState("Phase 3 interaction polish is active.");
  const [error, setError] = useState("");
  const [profileDraft, setProfileDraft] = useState({ username: user?.username ?? "", bio: user?.bio ?? "", mood: user?.mood ?? "grinding" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<number | null>(null);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];
  const visibleMessages = activeMessages.filter((message) => {
    if (!messageSearch.trim()) return true;
    const query = messageSearch.toLowerCase();
    return message.body.toLowerCase().includes(query) || message.sender.username.toLowerCase().includes(query);
  });
  const filteredChats = chats.filter((chat, index) => filterMatches(chat, chatFilter, index));
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  const activeTyping = typingByChat[activeChatId ?? ""] ?? [];

  useEffect(() => {
    const authToken = token ?? "";
    if (!authToken) {
      setLoading(false);
      return;
    }

    async function bootstrap() {
      try {
        const [meResponse, chatsResponse, discoverResponse] = await Promise.all([api.me(authToken), api.chats(authToken), api.discoverUsers(authToken)]);
        setSession(authToken, meResponse.user);
        setProfileDraft({ username: meResponse.user.username, bio: meResponse.user.bio, mood: meResponse.user.mood });
        setChats(chatsResponse.chats);
        setDiscoverResults(discoverResponse.users);
        if (chatsResponse.chats[0]) setActiveChat(chatsResponse.chats[0].id);
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load the app.");
      } finally {
        setLoading(false);
      }
    }

    bootstrap().catch(console.error);
  }, [setActiveChat, setChats, setSession, token]);

  useEffect(() => {
    const authToken = token ?? "";
    if (!authToken) return;

    const socket = io(SOCKET_URL, { auth: { token: authToken } });
    socket.on("message:created", (message: Message) => upsertMessage(message.chatId, message));
    socket.on("message:updated", (message: Message) => upsertMessage(message.chatId, message));
    socket.on("chat:typing", ({ chatId, isTyping, username }: TypingEvent) => {
      const current = typingByChat[chatId] ?? [];
      setTypingUsers(chatId, isTyping ? Array.from(new Set([...current, username])) : current.filter((value) => value !== username));
    });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, [setTypingUsers, token, typingByChat, upsertMessage]);

  useEffect(() => {
    const authToken = token ?? "";
    if (!authToken || !activeChatId) return;

    socketRef.current?.emit("chat:join", activeChatId);
    api.messages(authToken, activeChatId)
      .then(({ messages }) => {
        setMessages(activeChatId, messages);
        return api.markRead(authToken, activeChatId);
      })
      .then(() => socketRef.current?.emit("chat:read", { chatId: activeChatId }))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load messages."));
  }, [activeChatId, setMessages, token]);

  const quickReplies = useMemo(() => {
    const lastMessage = activeMessages.at(-1)?.body?.toLowerCase() ?? "";
    if (lastMessage.includes("link")) return ["send it", "drop it here", "need that asap"];
    if (lastMessage.includes("?")) return ["lol yes", "gimme 2 mins", "wait what happened"];
    return ["trueee", "that is wild", "i'm in"];
  }, [activeMessages]);

  async function handleSend() {
    if (!token || !activeChatId || !composer.trim()) return;
    setError("");
    try {
      const response = editingMessageId
        ? await api.updateMessage(token, editingMessageId, { body: composer })
        : await api.createMessage(token, activeChatId, { body: composer, replyToMessageId: replyTarget?.id });
      upsertMessage(activeChatId, response.message);
      setComposer("");
      setReplyTarget(null);
      setEditingMessageId(null);
      setShowEmojiTray(false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Could not send message.");
    }
  }

  async function handleReaction(messageId: string, emoji: string) {
    if (!token || !activeChatId) return;
    try {
      const { message } = await api.reactToMessage(token, messageId, emoji);
      upsertMessage(activeChatId, message);
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : "Could not react to message.");
    }
  }

  async function handleDelete(messageId: string) {
    if (!token || !activeChatId) return;
    try {
      const { message } = await api.deleteMessage(token, messageId);
      upsertMessage(activeChatId, message);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete message.");
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!token || !activeChatId || !file) return;
    setUploading(true);
    setError("");
    try {
      const { media } = await api.uploadMedia(token, file);
      const contentType = file.type.includes("gif") ? "gif" : "image";
      const { message } = await api.createMessage(token, activeChatId, { body: composer, contentType, media, replyToMessageId: replyTarget?.id });
      upsertMessage(activeChatId, message);
      setComposer("");
      setReplyTarget(null);
      setEditingMessageId(null);
      setShowEmojiTray(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function handleTyping(nextValue: string) {
    setComposer(nextValue);
    if (!activeChatId || !socketRef.current) return;
    socketRef.current.emit("chat:typing", { chatId: activeChatId, isTyping: true });
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(() => {
      socketRef.current?.emit("chat:typing", { chatId: activeChatId, isTyping: false });
    }, 900);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleHeaderAction(action: "search" | "call" | "video") {
    if (action === "search") {
      setShowSearchPanel((current) => !current);
      setNotice("In-chat search toggled for the active conversation.");
      return;
    }
    if (!activeChat) {
      setNotice("Pick a chat first to use chat actions.");
      return;
    }
    setNotice(action === "call" ? `Voice call UI primed for ${chatTitle(activeChat, user)}.` : `Video call UI primed for ${chatTitle(activeChat, user)}.`);
  }

  function handleVoiceNotePlaceholder() {
    setNotice(activeChat ? `Voice note flow staged for ${chatTitle(activeChat, user)}.` : "Pick a chat first to use voice notes.");
  }

  async function saveProfile() {
    if (!token) return;
    try {
      const { user: nextUser } = await api.updateProfile(token, profileDraft);
      setSession(token, nextUser);
      setNotice("Profile changes saved locally.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not update profile.");
    }
  }

  if (!token) return null;
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#050505] text-zinc-300">Loading Yazko...</div>;

  const chatHeaderSubtitle = activeTyping.length ? `${activeTyping.join(", ")} typing right now` : notice;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,94,0,0.12),transparent_18%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.04),transparent_18%),#050505] px-4 py-4 text-white lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 rounded-[2rem] border border-white/8 bg-[#0d0d10]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <aside className="hidden w-[108px] shrink-0 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-3 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[#FF5E00] text-lg font-bold text-white shadow-[0_12px_40px_rgba(255,94,0,0.28)]">
              Y
            </div>
            <div className="mt-6 space-y-2">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={[
                      "flex w-full flex-col items-center gap-2 rounded-[1.25rem] px-2 py-3 text-[11px] font-medium transition",
                      active ? "bg-[#FF5E00] text-white shadow-[0_12px_30px_rgba(255,94,0,0.25)]" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                    ].join(" ")}
                    onClick={() => setActiveTab(tab.id)}
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-[1.4rem] border border-white/8 bg-black/30 p-3 text-center">
              <AvatarTile label={user?.username} size={44} src={user?.avatar} />
              <p className="mt-3 truncate text-sm font-semibold text-white">{user?.username}</p>
              <p className="text-xs capitalize text-[#ffb082]">{user?.mood ?? "online"}</p>
            </div>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white"
              onClick={clearSession}
              type="button"
            >
              <LogOut className="h-4 w-4" />
              Exit
            </button>
          </div>
        </aside>

        <aside className="w-full max-w-[360px] shrink-0 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Yazko V1</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">Conversations</h1>
            </div>
            <button
              className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white"
              onClick={() => setNotice("Fresh chat composer is queued for Phase 4.")}
              type="button"
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-black/25 p-2">
            <div className="flex items-center gap-3 px-3 pb-2 pt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              <Search className="h-4 w-4" />
              Search chats
            </div>
            <Input className="border-0 bg-transparent" placeholder="Find a thread" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {CHAT_FILTERS.map((filter) => (
              <button
                key={filter}
                className={[
                  "rounded-full border px-3 py-2 text-xs font-medium transition",
                  chatFilter === filter ? "border-[#FF5E00]/30 bg-[#FF5E00]/14 text-[#ffb082]" : "border-white/8 bg-white/[0.03] text-zinc-400 hover:text-white"
                ].join(" ")}
                onClick={() => setChatFilter(filter)}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {filteredChats.map((chat, index) => {
              const title = chatTitle(chat, user);
              const active = activeChatId === chat.id;
              const preview = chat.lastMessage?.body || (chat.type === "group" ? "Group energy is warming up." : "Say something to get the thread moving.");
              const unread = Boolean(chat.lastMessage?.body) && index < 3;
              return (
                <button
                  key={chat.id}
                  className={[
                    "w-full rounded-[1.5rem] border p-3 text-left transition",
                    active ? "border-[#FF5E00]/25 bg-[linear-gradient(180deg,rgba(255,94,0,0.16),rgba(255,255,255,0.02))] shadow-[0_18px_50px_rgba(255,94,0,0.16)]" : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                  ].join(" ")}
                  onClick={() => {
                    setActiveTab("chats");
                    setActiveChat(chat.id);
                    setNotice(`${title} is active.`);
                  }}
                  type="button"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <AvatarTile label={title} size={54} />
                      {index < 2 ? <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#111113] bg-emerald-400" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{title}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">{chat.type === "group" ? "Group" : index < 2 ? "Pinned" : "Direct"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">{formatRelative(chat.updatedAt || chat.lastMessage?.createdAt)}</p>
                          {unread ? <span className="mt-2 inline-flex rounded-full bg-[#FF5E00] px-2 py-0.5 text-[10px] font-semibold text-white">new</span> : null}
                        </div>
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <p className="line-clamp-2 text-sm leading-6 text-zinc-400">{preview}</p>
                        <span className="mt-1 text-zinc-500">{unread ? <CheckCheck className="h-4 w-4 text-[#ff9b61]" /> : <Check className="h-4 w-4" />}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 flex-1 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4">
          {activeTab !== "chats" ? (
            activeTab === "calls" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Call log</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Calls</h2>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {CALL_LOG.map((call) => (
                    <div key={call.id} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-lg font-semibold text-white">{call.name}</p>
                          <p className="mt-1 text-sm text-zinc-400">{call.state} • {call.type}</p>
                        </div>
                        <div className="rounded-full bg-[#FF5E00]/15 px-3 py-1 text-xs font-medium text-[#ffb082]">{call.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "notifications" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Basic alerts</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Notifications</h2>
                </div>
                <div className="space-y-3">
                  {ALERTS.map((alert) => (
                    <div key={alert.id} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                      <p className="text-base font-semibold text-white">{alert.title}</p>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">{alert.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "profile" ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Identity layer</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Profile</h2>
                </div>
                <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/25 p-5">
                    <AvatarTile label={user?.username} size={84} src={user?.avatar} />
                    <h3 className="mt-4 text-xl font-semibold text-white">{user?.username}</h3>
                    <p className="mt-1 text-sm text-zinc-400">@{user?.username?.toLowerCase()}</p>
                    <p className="mt-4 rounded-full bg-[#FF5E00]/12 px-3 py-2 text-sm capitalize text-[#ffb082]">{profileDraft.mood}</p>
                  </div>
                  <div className="rounded-[1.75rem] border border-white/8 bg-black/25 p-5">
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Username</p>
                        <Input value={profileDraft.username} onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value }))} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Bio</p>
                        <Textarea value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Mood</p>
                        <div className="flex flex-wrap gap-2">
                          {MOODS.map((mood) => (
                            <button
                              key={mood}
                              className={[
                                "rounded-full border px-3 py-2 text-xs font-medium capitalize transition",
                                profileDraft.mood === mood ? "border-[#FF5E00]/30 bg-[#FF5E00]/14 text-[#ffb082]" : "border-white/8 bg-white/[0.03] text-zinc-400 hover:text-white"
                              ].join(" ")}
                              onClick={() => setProfileDraft((current) => ({ ...current, mood }))}
                              type="button"
                            >
                              {mood}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button onClick={() => void saveProfile()} type="button">Save profile</Button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "settings" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Lean controls</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Settings</h2>
                </div>
                <div className="grid gap-3 xl:grid-cols-2">
                  {[
                    ["Profile", "Name, photo and username"],
                    ["Account", "Security notifications and info"],
                    ["Privacy", "Blocked contacts and disappearing messages"],
                    ["Chats", "Theme, wallpaper and bubble feel"],
                    ["Video & voice", "Camera, microphone and speakers"],
                    ["Help", "Support, privacy and feedback"]
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                      <p className="text-lg font-semibold text-white">{title}</p>
                      <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === "groups" ? (
              <EmptyPanel body="Basic create-group and group chat are next in line after the core chat pass." title="Groups are staged" />
            ) : (
              <EmptyPanel body="This panel is coming next." title="Soon" />
            )
          ) : (
            <div className="flex h-full min-h-[700px] flex-col">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
                <div className="flex items-center gap-4">
                  <AvatarTile label={chatTitle(activeChat ?? chats[0] ?? { id: "", type: "private", members: [], createdAt: "", updatedAt: "" }, user)} size={56} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#ff9b61]">Phase 3</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{activeChat ? chatTitle(activeChat, user) : "Pick a conversation"}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{chatHeaderSubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => handleHeaderAction("search")} type="button"><Search className="h-4 w-4" /></button>
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => handleHeaderAction("call")} type="button"><Phone className="h-4 w-4" /></button>
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => handleHeaderAction("video")} type="button"><Video className="h-4 w-4" /></button>
                </div>
              </div>

              {showSearchPanel ? (
                <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3">
                  <Input placeholder="Search messages in this thread" value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} />
                </div>
              ) : null}

              <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
                {visibleMessages.length === 0 ? (
                  <div className="grid h-full min-h-[360px] place-items-center rounded-[1.5rem] border border-dashed border-white/10 bg-black/20 text-center text-zinc-500">
                    <div>
                      <p className="text-lg text-white">No messages yet</p>
                      <p className="mt-2 text-sm">Start the conversation and the cloud bubbles will show up here.</p>
                    </div>
                  </div>
                ) : null}

                {visibleMessages.map((message, index) => {
                  const mine = message.sender.id === user?.id || message.sender._id === user?.id;
                  const selectedReaction = message.reactions.find((reaction) => reaction.userId === user?.id)?.emoji;
                  return (
                    <div key={message.id} className={mine ? "ml-auto max-w-[82%]" : "max-w-[82%]"}>
                      <div
                        className={[
                          "relative overflow-hidden rounded-[2rem] border px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)]",
                          mine
                            ? "rounded-br-[0.7rem] border-[#FF5E00]/25 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_24%),linear-gradient(180deg,rgba(255,94,0,0.24),rgba(255,94,0,0.12))]"
                            : "rounded-bl-[0.7rem] border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]"
                        ].join(" ")}
                      >
                        <div className="absolute inset-x-6 top-0 h-8 rounded-full bg-white/10 blur-2xl" />
                        <div className="relative">
                          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                            <span className="font-semibold text-white">{message.sender.username}</span>
                            <span>{formatRelative(message.createdAt)}</span>
                            {message.editedAt ? <span className="text-[#ffb082]">edited</span> : null}
                          </div>
                          {message.replyToMessageId?.body ? (
                            <button
                              className="mt-3 w-full rounded-[1.1rem] border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-zinc-300"
                              onClick={() => setNotice(`Reply context: ${message.replyToMessageId?.body}`)}
                              type="button"
                            >
                              Replying to: {message.replyToMessageId.body}
                            </button>
                          ) : null}
                          <p className="relative mt-3 whitespace-pre-wrap text-[15px] leading-7 text-white">{message.deletedAt ? "Message deleted" : message.body}</p>
                          {message.media?.url ? <img alt="attachment" className="mt-3 max-h-64 w-full rounded-[1.4rem] object-cover" src={message.media.url} /> : null}
                        </div>
                      </div>

                      <div className={mine ? "mt-2 flex flex-wrap items-center justify-end gap-2" : "mt-2 flex flex-wrap items-center gap-2"}>
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={`${message.id}-${emoji}`}
                            className={[
                              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                              selectedReaction === emoji ? "border-[#FF5E00]/35 bg-[#FF5E00]/16 text-[#ffb082]" : "border-white/8 bg-white/[0.03] text-zinc-400 hover:text-white"
                            ].join(" ")}
                            onClick={() => void handleReaction(message.id, emoji)}
                            type="button"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-white" onClick={() => setReplyTarget(message)} type="button"><MessageCircleReply className="h-3.5 w-3.5" /></button>
                        {mine && !message.deletedAt ? (
                          <>
                            <button
                              className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-white"
                              onClick={() => {
                                setComposer(message.body);
                                setEditingMessageId(message.id);
                                setReplyTarget(null);
                                setNotice("Editing message...");
                              }}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-rose-300" onClick={() => void handleDelete(message.id)} type="button"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        ) : null}
                        <span className="text-xs text-zinc-500">{mine ? index % 2 === 0 ? "read" : "sent" : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3 rounded-[1.75rem] border border-white/8 bg-black/25 p-4">
                {replyTarget ? (
                  <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[#FF5E00]/20 bg-[#FF5E00]/10 px-4 py-3 text-sm text-[#ffd3bd]">
                    <div>
                      <p className="font-medium">Replying to {replyTarget.sender.username}</p>
                      <p className="mt-1 truncate text-xs text-[#ffd3bd]/80">{replyTarget.body}</p>
                    </div>
                    <button className="text-xs font-semibold uppercase tracking-[0.2em]" onClick={() => setReplyTarget(null)} type="button">Clear</button>
                  </div>
                ) : null}
                {editingMessageId ? (
                  <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
                    <span>Editing a previous message</span>
                    <button
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
                      onClick={() => {
                        setEditingMessageId(null);
                        setComposer("");
                      }}
                      type="button"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-[#FF5E00]/30 hover:text-white"
                      onClick={() => setComposer(reply)}
                      type="button"
                    >
                      {reply}
                    </button>
                  ))}
                </div>

                {showEmojiTray ? (
                  <div className="flex flex-wrap gap-2 rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-3">
                    {[
                      "lol",
                      "wow",
                      "omg",
                      "real",
                      "bet",
                      "brb",
                      "hehe",
                      "gg"
                    ].map((chip) => (
                      <button
                        key={chip}
                        className="rounded-full border border-white/8 bg-black/20 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-[#FF5E00]/30 hover:text-white"
                        onClick={() => setComposer((current) => `${current}${current ? " " : ""}${chip}`)}
                        type="button"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <Textarea
                    className="min-h-[96px] flex-1 resize-none border-white/8 bg-white/[0.03]"
                    onChange={(event) => handleTyping(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Write a message. Press Enter to send, Shift+Enter for a new line."
                    value={composer}
                  />
                  <div className="flex flex-col gap-2">
                    <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => setShowEmojiTray((current) => !current)} type="button"><Laugh className="h-4 w-4" /></button>
                    <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => fileInputRef.current?.click()} type="button"><ImageIcon className="h-4 w-4" /></button>
                    <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={handleVoiceNotePlaceholder} type="button"><Mic className="h-4 w-4" /></button>
                    <Button className="h-[52px] w-[52px] justify-center rounded-[1rem] p-0" disabled={!composer.trim() || uploading} onClick={() => void handleSend()} type="button">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {error ? <p className="rounded-[1rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}
                <input className="hidden" onChange={handleUpload} ref={fileInputRef} type="file" />
              </div>
            </div>
          )}
        </main>

        <aside className="hidden w-[300px] shrink-0 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4 xl:block">
          <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Live context</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Right rail</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Status</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{notice}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Discover</p>
              <div className="mt-3 space-y-3">
                {discoverResults.slice(0, 4).map((person) => (
                  <div key={person.id} className="flex items-center gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-3">
                    <AvatarTile label={person.username} size={38} src={person.avatar} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{person.username}</p>
                      <p className="truncate text-xs text-zinc-500">{person.bio || person.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}


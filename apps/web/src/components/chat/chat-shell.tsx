"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  ImageIcon,
  Laugh,
  LogOut,
  MessageCircle,
  MessageCircleReply,
  Mic,
  Pencil,
  Phone,
  PhoneCall,
  Play,
  Plus,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCircle2,
  Users,
  Video,
  X
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
const QUICK_CHIPS = ["trueee", "send it", "on my way", "that is clean"];
const MOODS = ["grinding", "tired", "plotting", "locked in"];
const CHAT_FILTERS = ["All", "Unread", "Groups", "Pinned"] as const;
const APP_TABS = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "calls", label: "Calls", icon: PhoneCall },
  { id: "groups", label: "Groups", icon: Users },
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "settings", label: "Settings", icon: Settings }
] as const;
const CALL_FILTERS = ["All", "Missed", "Voice", "Video"] as const;
const CALL_LOG = [
  { id: "call-1", name: "Aarav", mode: "voice", status: "Missed", when: "8:42 PM", duration: "00:00" },
  { id: "call-2", name: "Neon Squad", mode: "video", status: "Outgoing", when: "Yesterday", duration: "14:32" },
  { id: "call-3", name: "Priya", mode: "voice", status: "Incoming", when: "Mon", duration: "05:18" },
  { id: "call-4", name: "UI Sync", mode: "video", status: "Missed", when: "Sun", duration: "00:00" }
] as const;

type TypingEvent = {
  chatId: string;
  isTyping: boolean;
  username: string;
};

type AppTab = (typeof APP_TABS)[number]["id"];
type CallFilter = (typeof CALL_FILTERS)[number];

type StoryItem = {
  id: string;
  userId: string;
  name: string;
  caption: string;
  type: "image" | "video";
  preview: string;
  seen?: boolean;
  mine?: boolean;
  durationLabel?: string;
};

const STORY_ITEMS_SEED: StoryItem[] = [
  {
    id: "story-me",
    userId: "story-owner",
    name: "Your story",
    caption: "Drop a quick moment.",
    type: "image",
    preview: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    mine: true,
    durationLabel: "new"
  },
  {
    id: "story-aarav",
    userId: "user-aarav",
    name: "Aarav",
    caption: "Late night UI grind.",
    type: "video",
    preview: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    durationLabel: "0:09"
  },
  {
    id: "story-priya",
    userId: "user-priya",
    name: "Priya",
    caption: "Moodboard drop.",
    type: "image",
    preview: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    seen: true,
    durationLabel: "seen"
  },
  {
    id: "story-squad",
    userId: "group-neon",
    name: "Neon Squad",
    caption: "Team check-in.",
    type: "video",
    preview: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80",
    durationLabel: "0:07"
  }
];

function initials(label?: string) {
  return (label ?? "Y")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function AvatarTile({ src, label, size = 44 }: { src?: string; label?: string; size?: number }) {
  if (src) {
    return <img alt={label ?? "Avatar"} className="rounded-[1.15rem] object-cover" height={size} src={src} width={size} />;
  }

  return (
    <div
      className="grid place-items-center rounded-[1.15rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,94,0,0.22),rgba(255,255,255,0.05))] font-semibold text-white"
      style={{ height: size, width: size }}
    >
      {initials(label)}
    </div>
  );
}

function getChatTitle(chat: Chat) {
  return chat.name ?? (chat.type === "group" ? "Group chat" : "Direct chat");
}

export function ChatShell() {
  const { token, user, clearSession, setSession } = useAuthStore();
  const { chats, activeChatId, messagesByChat, typingByChat, setChats, setActiveChat, setMessages, upsertMessage, setTypingUsers } = useChatStore();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>("chats");
  const [chatFilter, setChatFilter] = useState<(typeof CHAT_FILTERS)[number]>("All");
  const [callFilter, setCallFilter] = useState<CallFilter>("All");
  const [composer, setComposer] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [discoverResults, setDiscoverResults] = useState<User[]>([]);
  const [profileDraft, setProfileDraft] = useState({ username: user?.username ?? "", bio: user?.bio ?? "", mood: user?.mood ?? "grinding" });
  const [messageSearch, setMessageSearch] = useState("");
  const [searchPeople, setSearchPeople] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [notice, setNotice] = useState("Yazko is live.");
  const [error, setError] = useState("");
  const [callBanner, setCallBanner] = useState<{ mode: "voice" | "video"; label: string } | null>(null);
  const [storyItems, setStoryItems] = useState<StoryItem[]>(STORY_ITEMS_SEED);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const storyInputRef = useRef<HTMLInputElement | null>(null);

  const activeMessages = activeChatId ? messagesByChat[activeChatId] ?? [] : [];
  const filteredMessages = activeMessages.filter((message) => {
    if (!messageSearch.trim()) return true;
    const query = messageSearch.toLowerCase();
    return message.body.toLowerCase().includes(query) || message.sender.username.toLowerCase().includes(query);
  });
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
  const activeTyping = typingByChat[activeChatId ?? ""] ?? [];
  const filteredChats = chats.filter((chat, index) => {
    if (chatFilter === "Unread") return Boolean(chat.lastMessage?.body);
    if (chatFilter === "Groups") return chat.type === "group";
    if (chatFilter === "Pinned") return index < 2;
    return true;
  });
  const visiblePeople = discoverResults.filter((person) => {
    if (!searchPeople.trim()) return true;
    const query = searchPeople.toLowerCase();
    return person.username.toLowerCase().includes(query) || person.email.toLowerCase().includes(query);
  });
  const activeStory = storyItems.find((story) => story.id === activeStoryId) ?? null;
  const visibleCalls = CALL_LOG.filter((call) => {
    if (callFilter === "Missed") return call.status === "Missed";
    if (callFilter === "Voice") return call.mode === "voice";
    if (callFilter === "Video") return call.mode === "video";
    return true;
  });

  useEffect(() => {
    const authToken = token ?? "";

    if (!authToken) {
      setLoading(false);
      return;
    }

    async function bootstrap() {
      setError("");
      try {
        const [meResponse, chatsResponse, discoverResponse] = await Promise.all([api.me(authToken), api.chats(authToken), api.discoverUsers(authToken)]);
        setSession(authToken, meResponse.user);
        setProfileDraft({ username: meResponse.user.username, bio: meResponse.user.bio, mood: meResponse.user.mood });
        setChats(chatsResponse.chats);
        setDiscoverResults(discoverResponse.users);
        if (chatsResponse.chats[0]) {
          setActiveChat(chatsResponse.chats[0].id);
          setNotice("Connected.");
        } else {
          setNotice("Your inbox is empty. Start a conversation.");
        }
      } catch (bootstrapError) {
        setChats([]);
        setDiscoverResults([]);
        setNotice("Connection issue.");
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Could not load your workspace.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
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

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
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
    if (lastMessage.includes("?") || lastMessage.includes("when")) return ["give me 2 mins", "yes", "checking now"];
    return QUICK_CHIPS;
  }, [activeMessages]);

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

  function resetComposerState() {
    setComposer("");
    setReplyTarget(null);
    setEditingMessageId(null);
    setShowEmojiTray(false);
  }

  async function handleSend() {
    if (!token || !activeChatId || !composer.trim()) return;

    try {
      const response = editingMessageId
        ? await api.updateMessage(token, editingMessageId, { body: composer })
        : await api.createMessage(token, activeChatId, { body: composer, replyToMessageId: replyTarget?.id });
      upsertMessage(activeChatId, response.message);
      resetComposerState();
      setNotice(editingMessageId ? "Message updated." : "Message sent.");
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
      setNotice("Message removed.");
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
      const { message } = await api.createMessage(token, activeChatId, {
        body: composer,
        contentType,
        media,
        replyToMessageId: replyTarget?.id
      });
      upsertMessage(activeChatId, message);
      resetComposerState();
      setNotice("Media sent.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function handleCallStart(mode: "voice" | "video", label: string) {
    setActiveTab("calls");
    setCallBanner({ mode, label });
    setNotice(`${mode === "voice" ? "Voice" : "Video"} call ready for ${label}.`);
  }


  function openStory(storyId: string) {
    setActiveStoryId(storyId);
    setStoryItems((current) => current.map((story) => (story.id === storyId ? { ...story, seen: true } : story)));
  }

  function closeStory() {
    setActiveStoryId(null);
  }

  function validateVideoLength(file: File) {
    return new Promise<number>((resolve, reject) => {
      const video = document.createElement("video");
      const objectUrl = URL.createObjectURL(file);
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(objectUrl);
        resolve(duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read video."));
      };
      video.src = objectUrl;
    });
  }

  async function handleStoryUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      setError("Stories only support images or videos.");
      event.target.value = "";
      return;
    }

    if (isVideo) {
      try {
        const duration = await validateVideoLength(file);
        if (duration > 10) {
          setError("Story videos must be 10 seconds or less.");
          event.target.value = "";
          return;
        }
      } catch (storyError) {
        setError(storyError instanceof Error ? storyError.message : "Could not read video.");
        event.target.value = "";
        return;
      }
    }

    const preview = URL.createObjectURL(file);
    const nextStory: StoryItem = {
      id: `story-${Date.now()}`,
      userId: user?.id ?? "story-owner",
      name: "Your story",
      caption: isVideo ? "Fresh clip." : "Fresh drop.",
      type: isVideo ? "video" : "image",
      preview,
      mine: true,
      durationLabel: isVideo ? "0:10 max" : "new"
    };

    setStoryItems((current) => [nextStory, ...current.filter((story) => !story.mine)]);
    setNotice(isVideo ? "Story video added." : "Story image added.");
    setError("");
    setActiveStoryId(nextStory.id);
    event.target.value = "";
  }
  async function saveProfile() {
    if (!token) return;

    try {
      const { user: nextUser } = await api.updateProfile(token, profileDraft);
      setSession(token, nextUser);
      setNotice("Profile saved.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not update profile.");
    }
  }

  if (!token) return null;
  if (loading) return <div className="grid min-h-screen place-items-center bg-[#050505] text-zinc-300">Loading...</div>;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,94,0,0.12),transparent_18%),#050505] px-4 py-4 text-white lg:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1600px] gap-4 rounded-[2rem] border border-white/8 bg-[#0d0d10]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <aside className="hidden w-[108px] shrink-0 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-3 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[#FF5E00] text-lg font-bold text-white shadow-[0_12px_40px_rgba(255,94,0,0.28)]">
              Y
            </div>
            <div className="mt-6 space-y-2">
              {APP_TABS.map((tab) => {
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
              <div className="mx-auto w-fit">
                <AvatarTile label={user?.username} size={44} src={user?.avatar} />
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-white">{user?.username}</p>
              <p className="text-xs capitalize text-[#ffb082]">{user?.mood ?? "online"}</p>
            </div>
            <button className="flex w-full items-center justify-center gap-2 rounded-[1.15rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-sm text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={clearSession} type="button">
              <LogOut className="h-4 w-4" />
              Exit
            </button>
          </div>
        </aside>

        <aside className="w-full max-w-[360px] shrink-0 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Yazko</p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{activeTab === "calls" ? "Call hub" : "Conversations"}</h1>
            </div>
            <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => setNotice("Realtime sync active.")} type="button">
              <Sparkles className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 rounded-[1.45rem] border border-white/8 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <AvatarTile label={user?.username} src={user?.avatar} size={48} />
              <div>
                <p className="font-semibold text-white">{user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.username}</p>
                <p className="text-sm text-zinc-400">{user?.email ?? "No email available"}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-zinc-400">Live workspace</p>
          </div>

          {activeTab === "calls" ? (
            <>
              <div className="mt-5 flex flex-wrap gap-2">
                {CALL_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    className={[
                      "rounded-full border px-3 py-2 text-xs font-medium transition",
                      callFilter === filter ? "border-[#FF5E00]/30 bg-[#FF5E00]/14 text-[#ffb082]" : "border-white/8 bg-white/[0.03] text-zinc-400 hover:text-white"
                    ].join(" ")}
                    onClick={() => setCallFilter(filter)}
                    type="button"
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {visibleCalls.map((call) => (
                  <button
                    key={call.id}
                    className="w-full rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-white/15"
                    onClick={() => handleCallStart(call.mode, call.name)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{call.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{call.status} - {call.mode} - {call.when}</p>
                      </div>
                      <div className="rounded-full bg-[#FF5E00]/12 px-3 py-1 text-[11px] uppercase text-[#ffb082]">{call.duration}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="mt-5 rounded-[1.45rem] border border-white/8 bg-black/20 p-3">
                <div className="flex items-center gap-2 px-2 pb-2">
                  <Search className="h-4 w-4 text-zinc-500" />
                  <Input className="border-0 bg-transparent" placeholder="Search people" value={searchPeople} onChange={(event) => setSearchPeople(event.target.value)} />
                </div>
                <div className="mt-2 space-y-2">
                  {visiblePeople.slice(0, 4).map((person) => (
                    <div className="flex items-center justify-between rounded-[1.15rem] border border-white/8 bg-white/[0.03] p-3" key={person.id}>
                      <div>
                        <p className="text-sm font-semibold text-white">{person.username}</p>
                        <p className="text-xs text-zinc-500">{person.mood}</p>
                      </div>
                      <span className="text-xs text-[#ff9b61]">Discover</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#ff9b61]">Stories</p>
                    <p className="mt-1 text-sm text-zinc-400">Images and videos up to 10s.</p>
                  </div>
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => storyInputRef.current?.click()} title="Add story" type="button">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {storyItems.map((story) => (
                    <button className="group w-[92px] shrink-0 text-left" key={story.id} onClick={() => openStory(story.id)} type="button">
                      <div className={[
                        "relative rounded-[1.45rem] p-[2px] transition",
                        story.seen ? "bg-white/10" : "bg-[linear-gradient(135deg,rgba(255,94,0,0.95),rgba(255,176,130,0.9),rgba(255,255,255,0.55))]"
                      ].join(" ")}>
                        <div className="relative h-[118px] overflow-hidden rounded-[1.35rem] border border-white/8 bg-black/40">
                          <img alt={story.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" src={story.preview} />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.72))]" />
                          <div className="absolute left-2 right-2 top-2 flex items-center justify-between">
                            <span className="rounded-full bg-black/45 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-white/80">{story.mine ? "You" : story.type}</span>
                            {story.type === "video" ? <Play className="h-3.5 w-3.5 text-white" /> : null}
                          </div>
                          <div className="absolute inset-x-2 bottom-2">
                            <p className="truncate text-xs font-semibold text-white">{story.name}</p>
                            <p className="mt-1 truncate text-[11px] text-white/70">{story.caption}</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <input accept="image/*,video/*" className="hidden" onChange={handleStoryUpload} ref={storyInputRef} type="file" />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
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
                  const title = getChatTitle(chat);
                  const active = chat.id === activeChatId;
                  const unread = index < 2 && Boolean(chat.lastMessage?.body);
                  return (
                    <button
                      className={[
                        "w-full rounded-[1.45rem] border p-4 text-left transition",
                        active ? "border-[#FF5E00]/35 bg-[linear-gradient(180deg,rgba(255,94,0,0.16),rgba(255,255,255,0.02))]" : "border-white/8 bg-white/[0.03] hover:border-white/15"
                      ].join(" ")}
                      key={chat.id}
                      onClick={() => {
                        setActiveTab("chats");
                        setActiveChat(chat.id);
                        setNotice(`${title} is active.`);
                      }}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <AvatarTile label={title} size={50} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="truncate text-sm font-semibold text-white">{title}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">{chat.type === "group" ? "Group" : index < 2 ? "Pinned" : "Direct"}</p>
                            </div>
                            <div className="text-right text-xs text-zinc-500">
                              <p>{formatRelative(chat.updatedAt || chat.lastMessage?.createdAt)}</p>
                              {unread ? <CheckCheck className="ml-auto mt-2 h-4 w-4 text-[#ff9b61]" /> : <Check className="ml-auto mt-2 h-4 w-4" />}
                            </div>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-400">{chat.lastMessage?.body ?? "Start the next conversation."}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </aside>

        <main className="min-w-0 flex-1 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4">
          {activeTab === "calls" ? (
            <div className="space-y-5">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#ff9b61]">Calls</p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">Recent call activity</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Calls, missed, and quick relaunch.</p>
                  </div>
                  
                </div>
              </div>

              {callBanner ? (
                <div className="rounded-[1.5rem] border border-[#FF5E00]/25 bg-[linear-gradient(180deg,rgba(255,94,0,0.16),rgba(255,94,0,0.08))] p-5 shadow-[0_18px_50px_rgba(255,94,0,0.12)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-[#ffb082]">Calling now</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{callBanner.label}</h2>
                      <p className="mt-2 text-sm text-[#ffd4bf]">{callBanner.mode === "voice" ? "Voice call interface primed." : "Video call interface primed."}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setCallBanner(null)} type="button" variant="ghost">Dismiss</Button>
                      <Button onClick={() => setNotice(`Call reminder saved for ${callBanner.label}.`)} type="button">Set reminder</Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {visibleCalls.map((call) => (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.35rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 transition hover:border-white/15" key={call.id}>
                    <div className="flex items-center gap-3">
                      <div className="rounded-[1rem] border border-white/10 bg-black/30 p-3 text-zinc-300">
                        {call.mode === "voice" ? <Phone className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{call.name}</p>
                          <span className={[
                            "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]",
                            call.status === "Missed" ? "bg-rose-500/10 text-rose-300" : "bg-white/[0.05] text-zinc-400"
                          ].join(" ")}>{call.status}</span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{call.when} - {call.duration} - {call.mode === "voice" ? "Voice call" : "Video call"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleCallStart("voice", call.name)} type="button" variant="ghost">Voice</Button>
                      <Button onClick={() => handleCallStart("video", call.name)} type="button">Video</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "profile" ? (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                <div className="flex items-center gap-4">
                  <AvatarTile label={user?.username} src={user?.avatar} size={72} />
                  <div>
                    <p className="text-xl font-semibold text-white">{user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.username}</p>
                    <p className="mt-1 text-sm text-zinc-400">@{user?.username}</p>
                    <p className="mt-3 inline-flex rounded-full bg-[#FF5E00]/12 px-3 py-1 text-xs capitalize text-[#ffb082]">{profileDraft.mood}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-zinc-400">{profileDraft.bio || "Add a bio."}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-[#ff9b61]">Edit profile</p>
                <div className="mt-4 space-y-3">
                  <Input placeholder="Username" value={profileDraft.username} onChange={(event) => setProfileDraft((current) => ({ ...current, username: event.target.value }))} />
                  <Textarea placeholder="Bio" value={profileDraft.bio} onChange={(event) => setProfileDraft((current) => ({ ...current, bio: event.target.value }))} />
                  <select className="w-full rounded-[1.15rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" onChange={(event) => setProfileDraft((current) => ({ ...current, mood: event.target.value }))} value={profileDraft.mood}>
                    {MOODS.map((mood) => (
                      <option key={mood} value={mood}>{mood}</option>
                    ))}
                  </select>
                  <Button onClick={() => void saveProfile()} type="button">Save profile</Button>
                </div>
              </div>
            </div>
          ) : activeTab === "settings" ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Chats", "Theme, wallpaper, spacing."],
                ["Calls", "Ringtone and layout."],
                ["Stories", "Images and 10s videos."],
                ["Safety", "Moderation and privacy."]
              ].map(([title, body]) => (
                <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-5" key={title}>
                  <p className="text-lg font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-7 text-zinc-400">{body}</p>
                </div>
              ))}
            </div>
          ) : activeTab === "groups" ? (
            <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-[#ff9b61]">Groups</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Groups</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Group chats land here.</p>
            </div>
          ) : (
            <div className="flex h-full min-h-[700px] flex-col">
              {activeStory ? (
                <div className="mb-4 overflow-hidden rounded-[1.6rem] border border-[#FF5E00]/20 bg-[linear-gradient(180deg,rgba(255,94,0,0.12),rgba(0,0,0,0.4))] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                  <div className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/40">
                    <img alt={activeStory.name} className="h-[260px] w-full object-cover md:h-[320px]" src={activeStory.preview} />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.24),rgba(0,0,0,0.78))]" />
                    <div className="absolute inset-x-0 top-0 p-4">
                      <div className="h-1.5 rounded-full bg-white/15">
                        <div className="h-full w-2/3 rounded-full bg-[#FF5E00]" />
                      </div>
                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <AvatarTile label={activeStory.name} size={44} />
                          <div>
                            <p className="text-sm font-semibold text-white">{activeStory.name}</p>
                            <p className="text-xs text-white/70">{activeStory.type === "video" ? "Video story" : "Photo story"} - {activeStory.durationLabel ?? "new"}</p>
                          </div>
                        </div>
                        <button className="rounded-full border border-white/12 bg-black/35 p-2 text-white/80 transition hover:text-white" onClick={closeStory} type="button">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                      <p className="text-sm uppercase tracking-[0.25em] text-[#ffb082]">Story</p>
                      <h3 className="mt-2 text-2xl font-semibold text-white">{activeStory.caption}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button onClick={() => setNotice(`Replied to ${activeStory.name}'s story.`)} type="button">Reply</Button>
                        <Button onClick={() => setNotice(`Reacted to ${activeStory.name}'s story.`)} type="button" variant="ghost">React</Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
                <div className="flex items-center gap-4">
                  <AvatarTile label={activeChat ? getChatTitle(activeChat) : "Chat"} size={56} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-[#ff9b61]">Chat</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">{activeChat ? getChatTitle(activeChat) : "Pick a conversation"}</h2>
                    <p className="mt-1 text-sm text-zinc-400">{activeTyping.length ? `${activeTyping.join(", ")} typing...` : notice}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => setNotice("Search is on.")} type="button"><Search className="h-4 w-4" /></button>
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => handleCallStart("voice", activeChat ? getChatTitle(activeChat) : "this chat")} type="button"><Phone className="h-4 w-4" /></button>
                  <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => handleCallStart("video", activeChat ? getChatTitle(activeChat) : "this chat")} type="button"><Video className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-4 rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-3">
                <Input placeholder="Search messages in this thread" value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} />
              </div>

              <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-[1.75rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
                {filteredMessages.map((message, index) => {
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
                          {message.replyToMessageId?.body ? <p className="mt-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">{message.replyToMessageId.body}</p> : null}
                          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-white">{message.deletedAt ? "Message deleted" : message.body}</p>
                          {message.media?.url ? <img alt="attachment" className="mt-3 max-h-64 w-full rounded-[1.4rem] object-cover" src={message.media.url} /> : null}
                          {message.moderation.flagged ? <p className="mt-3 text-xs text-rose-300">Warning: {message.moderation.reasons.join(", ")}</p> : null}
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
                            {emoji} {message.reactions.filter((reaction) => reaction.emoji === emoji).length || ""}
                          </button>
                        ))}
                        <button className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-white" onClick={() => setReplyTarget(message)} type="button"><MessageCircleReply className="h-3.5 w-3.5" /></button>
                        {!message.deletedAt ? (
                          <>
                            <button
                              className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-white"
                              onClick={() => {
                                setComposer(message.body);
                                setEditingMessageId(message.id);
                                setReplyTarget(null);
                                setNotice("Editing message.");
                              }}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button className="rounded-full border border-white/8 bg-white/[0.03] p-2 text-zinc-400 transition hover:text-rose-300" onClick={() => void handleDelete(message.id)} type="button"><Trash2 className="h-3.5 w-3.5" /></button>
                          </>
                        ) : null}
                        <span className="text-xs text-zinc-500">{mine ? (index % 2 === 0 ? "read" : "sent") : ""}</span>
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
                    <span>Editing message</span>
                    <button className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400" onClick={resetComposerState} type="button">Cancel</button>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((reply) => (
                    <button className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-[#FF5E00]/30 hover:text-white" key={reply} onClick={() => setComposer(reply)} type="button">
                      {reply}
                    </button>
                  ))}
                </div>

                {showEmojiTray ? (
                  <div className="flex flex-wrap gap-2 rounded-[1.3rem] border border-white/8 bg-white/[0.03] p-3">
                    {["lol", "wow", "omg", "real", "bet", "brb", "gg", "clean"].map((chip) => (
                      <button className="rounded-full border border-white/8 bg-black/20 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-[#FF5E00]/30 hover:text-white" key={chip} onClick={() => setComposer((current) => `${current}${current ? " " : ""}${chip}`)} type="button">
                        {chip}
                      </button>
                    ))}
                  </div>
                ) : null}

                {error ? <p className="rounded-[1rem] border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

                <div className="flex gap-3">
                  <Textarea className="min-h-[98px] flex-1 resize-none border-white/8 bg-white/[0.03]" onChange={(event) => handleTyping(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Write a message" value={composer} />
                  <div className="flex flex-col gap-2">
                    <button className={["rounded-[1rem] border p-3 transition", showEmojiTray ? "border-[#FF5E00]/35 bg-[#FF5E00]/12 text-[#ffb082]" : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-[#FF5E00]/35 hover:text-white"].join(" ")} onClick={() => setShowEmojiTray((current) => !current)} title="Quick words" type="button"><Laugh className="h-4 w-4" /></button>
                    <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => fileInputRef.current?.click()} title="Attach media" type="button"><ImageIcon className="h-4 w-4" /></button>
                    <button className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-3 text-zinc-300 transition hover:border-[#FF5E00]/35 hover:text-white" onClick={() => setNotice(activeChat ? `Voice note soon for ${getChatTitle(activeChat)}.` : "Pick a chat first.")} title="Voice note" type="button"><Mic className="h-4 w-4" /></button>
                    <Button className="h-[52px] w-[52px] justify-center rounded-[1rem] p-0 shadow-[0_12px_30px_rgba(255,94,0,0.18)]" disabled={!composer.trim() || uploading} onClick={() => void handleSend()} type="button">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <input accept="image/*,image/gif" className="hidden" onChange={handleUpload} ref={fileInputRef} type="file" />
              </div>
            </div>
          )}
        </main>

        <aside className="hidden w-[300px] shrink-0 rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-4 xl:block">
          <p className="text-xs uppercase tracking-[0.35em] text-[#ff9b61]">Now</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Activity</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Status</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{notice}</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Recent calls</p>
              <div className="mt-3 space-y-3">
                {CALL_LOG.slice(0, 3).map((call) => (
                  <button className="flex w-full items-center justify-between rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-3 text-left transition hover:border-white/15" key={call.id} onClick={() => handleCallStart(call.mode, call.name)} type="button">
                    <div>
                      <p className="text-sm font-medium text-white">{call.name}</p>
                      <p className="text-xs text-zinc-500">{call.mode} - {call.status}</p>
                    </div>
                    {call.mode === "voice" ? <Phone className="h-4 w-4 text-zinc-400" /> : <Video className="h-4 w-4 text-zinc-400" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/8 bg-black/25 p-4">
              <p className="text-sm font-semibold text-white">Safety</p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-300">
                <li className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-rose-300" />Moderation on</li>
                <li>Stories support images and short clips</li>
                <li>Private chat space</li>
                <li className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#ff9b61]" />Calls ready</li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
















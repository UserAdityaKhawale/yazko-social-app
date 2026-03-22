import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "./config/env";
import { verifyToken } from "./lib/auth";
import { User } from "./models/User";

type TypingPayload = {
  chatId: string;
  isTyping: boolean;
};

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as string | undefined;

      if (!token) {
        return next(new Error("Authentication required."));
      }

      const payload = verifyToken(token);
      const user = await User.findById(payload.userId);

      if (!user) {
        return next(new Error("User not found."));
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error("Invalid session."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("chat:join", (chatId: string) => {
      socket.join(chatId);
    });

    socket.on("chat:typing", ({ chatId, isTyping }: TypingPayload) => {
      socket.to(chatId).emit("chat:typing", {
        chatId,
        isTyping,
        userId: socket.data.user.id,
        username: socket.data.user.username
      });
    });

    socket.on("chat:read", ({ chatId }: { chatId: string }) => {
      socket.to(chatId).emit("chat:read", {
        chatId,
        userId: socket.data.user.id
      });
    });
  });

  return io;
}


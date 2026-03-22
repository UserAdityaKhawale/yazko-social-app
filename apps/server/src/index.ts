import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "http";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { chatsRouter } from "./routes/chats";
import { healthRouter } from "./routes/health";
import { messagesRouter } from "./routes/messages";
import { usersRouter } from "./routes/users";
import { createSocketServer } from "./socket";

async function start() {
  await connectDatabase();

  const app = express();
  const server = http.createServer(app);
  const io = createSocketServer(server);
  app.set("io", io);

  app.use(
    cors({
      origin: env.clientUrl,
      credentials: false
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));

  app.get("/", (_req, res) => {
    res.json({ name: "Yazko API", status: "ok" });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/chats", chatsRouter);
  app.use("/api/messages", messagesRouter);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error." });
  });

  server.listen(env.port, () => {
    console.log(`Yazko server running on http://localhost:${env.port}`);
  });

  return io;
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import http from "http";
import { connectDatabase } from "./config/db";
import { env } from "./config/env";
import { createLogger } from "./lib/logger";
import { attachRequestMeta, applySecurityHeaders } from "./middleware/observability";
import { authRouter } from "./routes/auth";
import { chatsRouter } from "./routes/chats";
import { healthRouter } from "./routes/health";
import { messagesRouter } from "./routes/messages";
import { usersRouter } from "./routes/users";
import { createSocketServer } from "./socket";

async function start() {
  const logger = createLogger(env.logLevel);
  await connectDatabase();

  const app = express();
  const server = http.createServer(app);
  const io = createSocketServer(server);

  app.set("io", io);
  app.set("logger", logger);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.clientOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS."));
      },
      credentials: false
    })
  );
  app.use(applySecurityHeaders);
  app.use(attachRequestMeta);
  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));

  app.get("/", (_req, res) => {
    res.json({ name: "Yazko API", status: "ok", env: env.nodeEnv });
  });

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/chats", chatsRouter);
  app.use("/api/messages", messagesRouter);

  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId = res.locals.requestId;
    logger.error("http.error", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      message: err.message,
      stack: env.isProduction ? undefined : err.stack
    });

    res.status(500).json({
      message: env.isProduction ? "Internal server error." : err.message || "Internal server error.",
      requestId
    });
  });

  function shutdown(signal: string) {
    logger.info("server.shutdown", { signal });
    server.close(() => {
      logger.info("server.closed");
      process.exit(0);
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  server.listen(env.port, () => {
    logger.info("server.started", {
      port: env.port,
      env: env.nodeEnv,
      clientOrigins: env.clientOrigins
    });
  });
}

start().catch((error) => {
  const logger = createLogger(env.logLevel);
  logger.error("server.start_failed", {
    message: error instanceof Error ? error.message : "Unknown startup error",
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});

import type { NextFunction, Request, Response } from "express";
import { requestId } from "../lib/logger";

export function attachRequestMeta(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const id = requestId();

  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);

  const logger = req.app.get("logger");

  res.on("finish", () => {
    logger?.info?.("http.request", {
      requestId: id,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip
    });
  });

  next();
}

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}

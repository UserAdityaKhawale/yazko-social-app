import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getIp(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function createRateLimit(options: { windowMs: number; max: number; prefix: string }) {
  const { windowMs, max, prefix } = options;

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const key = `${prefix}:${getIp(req)}`;
    const now = Date.now();
    const current = buckets.get(key);

    if (!current || now > current.resetAt) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      next();
      return;
    }

    if (current.count >= max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000));
      res.status(429).json({ message: "Too many requests. Please try again shortly." });
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
}

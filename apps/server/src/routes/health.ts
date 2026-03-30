import { Router } from "express";
import mongoose from "mongoose";
import { env } from "../config/env";

const router = Router();
const bootedAt = Date.now();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    env: env.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    uptimeMs: Date.now() - bootedAt,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

export { router as healthRouter };
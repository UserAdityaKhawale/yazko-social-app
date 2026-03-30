import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serializers";
import { createRateLimit } from "../middleware/rate-limit";
import { User } from "../models/User";

const router = Router();
const profileRateLimit = createRateLimit({ windowMs: 60_000, max: 30, prefix: "users" });

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: serializeUser(req.user!) });
});

router.get("/discover", requireAuth, profileRateLimit, async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const query = search
    ? {
        _id: { $ne: req.user!._id },
        $or: [
          { username: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      }
    : { _id: { $ne: req.user!._id } };

  const users = await User.find(query).limit(12);
  return res.json({ users: users.map(serializeUser) });
});

router.patch("/me", requireAuth, profileRateLimit, async (req, res) => {
  const { username, firstName, lastName, bio, mood, avatar } = req.body;
  const user = req.user!;

  if (typeof username === "string" && username.trim()) {
    const normalizedUsername = normalizeText(username).replace(/\s/g, "");

    if (normalizedUsername.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters long." });
    }

    const existing = await User.findOne({ username: normalizedUsername, _id: { $ne: user._id } });
    if (existing) {
      return res.status(409).json({ message: "That username is already in use." });
    }

    user.username = normalizedUsername;
  }

  if (typeof firstName === "string") {
    user.firstName = normalizeText(firstName).slice(0, 50);
  }

  if (typeof lastName === "string") {
    user.lastName = normalizeText(lastName).slice(0, 50);
  }

  if (typeof bio === "string") {
    user.bio = bio.trim().slice(0, 180);
  }

  if (typeof mood === "string") {
    user.mood = mood.trim().slice(0, 40);
  }

  if (typeof avatar === "string") {
    user.avatar = avatar;
  }

  await user.save();

  return res.json({ user: serializeUser(user) });
});

export { router as usersRouter };

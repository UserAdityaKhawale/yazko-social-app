import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serializers";
import { User } from "../models/User";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  return res.json({ user: serializeUser(req.user!) });
});

router.get("/discover", requireAuth, async (req, res) => {
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

router.patch("/me", requireAuth, async (req, res) => {
  const { username, bio, mood, avatar } = req.body;
  const user = req.user!;

  if (username) {
    user.username = username;
  }

  if (typeof bio === "string") {
    user.bio = bio;
  }

  if (typeof mood === "string") {
    user.mood = mood;
  }

  if (typeof avatar === "string") {
    user.avatar = avatar;
  }

  await user.save();

  return res.json({ user: serializeUser(user) });
});

export { router as usersRouter };

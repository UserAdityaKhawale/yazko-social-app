import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { env } from "../config/env";
import { signToken } from "../lib/auth";
import { serializeUser } from "../lib/serializers";
import { User } from "../models/User";

const router = Router();
const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "Username, email, and password are required." });
  }

  const exists = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username }]
  });

  if (exists) {
    return res.status(409).json({ message: "That email or username is already in use." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username,
    email: email.toLowerCase(),
    passwordHash
  });

  return res.status(201).json({
    token: signToken(user.id),
    user: serializeUser(user)
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  return res.json({
    token: signToken(user.id),
    user: serializeUser(user)
  });
});

router.post("/google", async (req, res) => {
  const { token } = req.body;

  if (!token || !googleClient) {
    return res.status(400).json({ message: "Google sign-in is not configured." });
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: env.googleClientId
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    return res.status(400).json({ message: "Google account is missing an email." });
  }

  let user = await User.findOne({ email: payload.email.toLowerCase() });

  if (!user) {
    const fallbackName = payload.name?.replace(/\s+/g, "").toLowerCase() ?? "yazkouser";
    user = await User.create({
      username: `${fallbackName}${Math.floor(Math.random() * 1000)}`,
      email: payload.email.toLowerCase(),
      googleId: payload.sub,
      avatar: payload.picture
    });
  }

  return res.json({
    token: signToken(user.id),
    user: serializeUser(user)
  });
});

export { router as authRouter };


import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import { Router } from "express";
import { env } from "../config/env";
import { signToken } from "../lib/auth";
import { serializeUser } from "../lib/serializers";
import { createRateLimit } from "../middleware/rate-limit";
import { User } from "../models/User";

const router = Router();
const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;
const authRateLimit = createRateLimit({ windowMs: 60_000, max: 12, prefix: "auth" });
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "10minutemail.com",
  "temp-mail.org",
  "tempmail.com",
  "guerrillamail.com",
  "mailinator.com",
  "yopmail.com",
  "sharklasers.com",
  "getnada.com",
  "trashmail.com",
  "dispostable.com"
]);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isDisposableEmail(email: string) {
  const domain = email.split("@")[1] ?? "";
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

router.post("/signup", authRateLimit, async (req, res) => {
  const { username, firstName, lastName, email, password } = req.body;

  if (!username || !firstName || !lastName || !email || !password) {
    return res.status(400).json({ message: "Username, first name, last name, email, and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedUsername = normalizeName(String(username)).replace(/\s/g, "");
  const normalizedFirstName = normalizeName(String(firstName));
  const normalizedLastName = normalizeName(String(lastName));

  if (normalizedUsername.length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters long." });
  }

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (isDisposableEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Temporary email addresses are not allowed." });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
  });

  if (exists) {
    return res.status(409).json({ message: "That email or username is already in use." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: normalizedUsername,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email: normalizedEmail,
    passwordHash
  });

  return res.status(201).json({
    token: signToken(user.id),
    user: serializeUser(user)
  });
});

router.post("/login", authRateLimit, async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email });

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

router.post("/google", authRateLimit, async (req, res) => {
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
    const nameParts = payload.name?.trim().split(/\s+/) ?? [];
    user = await User.create({
      username: `${fallbackName}${Math.floor(Math.random() * 1000)}`,
      firstName: nameParts[0] ?? "Yazko",
      lastName: nameParts.slice(1).join(" "),
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

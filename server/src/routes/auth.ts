import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../lib/mailer";

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(payload: { userId: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing in .env");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// REGISTER
router.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, password: passwordHash, name: name ?? null },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const token = signToken({ userId: user.id });
  res.cookie("token", token, cookieOptions());

  res.json({ user });
});

// LOGIN
router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.password) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({ userId: user.id });
  res.cookie("token", token, cookieOptions());

  res.json({ user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } });
});

// DEMO (one-click try)
router.post("/demo", async (_req, res) => {
  const demoEmail = "demo@jobtracker.app";

  let user = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!user) {
    const passwordHash = await bcrypt.hash("DemoPassword123!", 12);
    user = await prisma.user.create({
      data: { email: demoEmail, password: passwordHash, name: "Demo User" },
    });

    await prisma.application.createMany({
      data: [
        { userId: user.id, company: "Acme Corp", role: "Frontend Developer", stage: "APPLIED" },
        { userId: user.id, company: "Nimbus", role: "Full Stack Dev", stage: "INTERVIEW" },
      ],
    });
  }

  const token = signToken({ userId: user.id });
  res.cookie("token", token, cookieOptions());

  res.json({ user: { id: user.id, email: user.email, name: user.name } });
});

router.post("/logout", async (_req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("token", {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  });

  res.json({ ok: true });
});

// ME (get current user)
router.get("/me", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ message: "Not logged in" });

  try {
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) return res.status(401).json({ message: "Invalid session" });
    res.json({ user });
  } catch {
    res.status(401).json({ message: "Invalid session" });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  const EmailSchema = z.object({
    email: z.string().email(),
  });

  const parsed = EmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid email" });
  }

  const { email } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user?.email === "demo@jobtracker.app") {
  return res.json({
    ok: true,
    message: "If an account exists for that email, we sent a reset link.",
  });
}

// Always return success to avoid account enumeration
if (!user) {
  return res.json({
    ok: true,
    message: "If an account exists for that email, we sent a reset link.",
  });
}
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const resetLink = `${process.env.APP_URL}/reset-password?token=${rawToken}`;

  try {
    await sendPasswordResetEmail(user.email, resetLink);
  } catch (err) {
    console.error("Failed to send reset email:", err);
    return res.status(500).json({ message: "Failed to send reset email" });
  }

  return res.json({
    ok: true,
    message: "If an account exists for that email, we sent a reset link.",
  });
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  const ResetSchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8),
  });

  const parsed = ResetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const { token, password } = parsed.data;
  const hashedToken = hashResetToken(token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (user?.email === "demo@jobtracker.app") {
  return res.status(400).json({ message: "Reset not allowed for demo account" });
}

  if (!user) {
    return res.status(400).json({ message: "Invalid or expired reset link" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return res.json({
    ok: true,
    message: "Password has been reset successfully",
  });
});

export default router;

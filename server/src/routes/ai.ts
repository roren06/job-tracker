// server/src/routes/ai.ts
import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../middleware/requireAuth"; // adjust if your path differs
import { prisma } from "../prisma"; // adjust if your prisma export path differs
import type { AuthedRequest } from "../middleware/requireAuth";

const router = Router();
// ✅ Protect ALL /api/ai routes
router.use(requireAuth);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type AiAction =
  | "resume_bullet"
  | "followup_email"
  | "improve_notes"
  | "interview_tips"
  | "cover_letter";

function assertEnv() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error("Missing OPENAI_API_KEY");
    (err as any).statusCode = 500;
    throw err;
  }
}

function badRequest(message: string): never {
  const err = new Error(message);
  (err as any).statusCode = 400;
  throw err;
}

/**
 * POST /api/ai/generate
 * Body:
 * {
 *   action: "resume_bullet" | "followup_email" | "improve_notes" | "interview_tips" | "cover_letter",
 *   application: {
 *     company: string,
 *     role: string,
 *     stage?: string,
 *     notes?: string,
 *     jobUrl?: string,
 *     location?: string,
 *     salaryRange?: string
 *   },
 *   prompt?: string
 * }
 */

router.get("/usage/:applicationId", async (req: AuthedRequest, res) => {
  const applicationId = String(req.params.applicationId ?? "").trim();
  if (!applicationId) return res.status(400).json({ error: "Missing applicationId." });

  const count = await prisma.aiGeneration.count({
    where: { userId: req.userId!, applicationId },
  });

  // optional: last generated timestamp
  const last = await prisma.aiGeneration.findFirst({
    where: { userId: req.userId!, applicationId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, mode: true, action: true },
  });

  return res.json({
    count,
    last: last
      ? {
          createdAt: last.createdAt,
          mode: last.mode,
          action: last.action,
        }
      : null,
  });
});

router.get("/history/:applicationId", async (req: AuthedRequest, res) => {
  const applicationId = String(req.params.applicationId ?? "").trim();

  if (!applicationId) {
    return res.status(400).json({ error: "Missing applicationId." });
  }

  const items = await prisma.aiGeneration.findMany({
    where: {
      userId: req.userId!,   // ok because requireAuth sets it
      applicationId,         // ✅ now guaranteed string
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return res.json({ items });
});

router.post("/generate", async (req: AuthedRequest, res) => {
  try {
    assertEnv();

    const { action, application, prompt } = req.body as {
      action?: AiAction;
      application?: any;
      prompt?: string;
    };

    if (!action) badRequest("Missing action.");

    const allowed: AiAction[] = [
      "resume_bullet",
      "followup_email",
      "improve_notes",
      "interview_tips",
      "cover_letter",
    ];
    if (!allowed.includes(action)) badRequest("Invalid action.");

    if (!application || typeof application !== "object")
      badRequest("Missing application.");

    const company = String(application.company ?? "").trim();
    const role = String(application.role ?? "").trim();
    const applicationId = typeof application.id === "string" ? application.id.trim() : "";
  if (!applicationId) badRequest("Missing application.id.");

  // ✅ Security: make sure this application belongs to the logged-in user
  const owned = await prisma.application.findFirst({
    where: { id: applicationId, userId: req.userId!, deletedAt: null },
    select: { id: true },
  });

  if (!owned) {
    return res.status(404).json({ error: "Application not found." });
  }
    if (!company) badRequest("Missing application.company.");
    if (!role) badRequest("Missing application.role.");

    const stage = application.stage ? String(application.stage) : undefined;
    const notes = application.notes ? String(application.notes) : "";
    const jobUrl = application.jobUrl ? String(application.jobUrl) : undefined;
    const location = application.location ? String(application.location) : undefined;
    const salaryRange = application.salaryRange
      ? String(application.salaryRange)
      : undefined;

    const userPrompt = typeof prompt === "string" ? prompt.trim() : "";

    const instructions = [
      "You are an AI assistant embedded in a Job Application Tracker SaaS.",
      "Return concise, high-signal content. No markdown unless asked.",
      "Never invent company-specific facts. If missing info, make reasonable, clearly-labeled assumptions.",
      "Avoid sensitive personal data. Do not request passwords or secrets.",
    ].join(" ");

    const actionSpec: Record<AiAction, string> = {
      resume_bullet:
        "Write 1 strong, metrics-friendly resume bullet tailored to this role. Use action verb + impact. If no metrics, suggest a plausible metric placeholder like '(X%)' but label it as placeholder.",
      followup_email:
        "Draft a professional follow-up email after an application or interview. Keep it under 150 words. Include a subject line. Use a polite, confident tone.",
      improve_notes:
        "Rewrite the notes into clean, structured, skimmable bullet points. Preserve facts, remove fluff. If notes are empty, propose 5 note prompts to capture next.",
      interview_tips:
        "Provide 6 interview prep tips specific to the role, including 2 likely questions + what a good answer should cover.",
      cover_letter:
        "Write a concise, professional cover letter tailored to this role and company. Keep it under 250 words. Focus on relevant skills, impact, and motivation. Do not invent false experience.",
    };

    const input = [
      {
        role: "user" as const,
        content: [
          {
            type: "input_text" as const,
            text: [
              `Action: ${action}`,
              `Company: ${company}`,
              `Role: ${role}`,
              stage ? `Stage: ${stage}` : "",
              location ? `Location: ${location}` : "",
              salaryRange ? `Salary range: ${salaryRange}` : "",
              jobUrl ? `Job URL: ${jobUrl}` : "",
              notes ? `Notes: ${notes}` : "Notes: (empty)",
              userPrompt ? `Extra user prompt: ${userPrompt}` : "",
              "",
              `Task: ${actionSpec[action]}`,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ];

    const model = process.env.OPENAI_MODEL || "gpt-5";

    let text = "";
    let mode: "live" | "demo" = "live";

try {
  const response = await openai.responses.create({
    model,
    instructions,
    input,
    max_output_tokens: 350,
  });

  text = (response as any).output_text?.trim?.() ?? "";

} catch (err: any) {

  console.warn("OpenAI unavailable, using dev fallback.");

  // DEV FALLBACK (FREE, no billing required)
  if (process.env.NODE_ENV !== "production") {
    text = mockAiResponse(action, company, role, notes, userPrompt);
    mode = "demo";
  } else {
    throw err;
  }
}

    if (!text) {
      return res.status(502).json({ error: "AI returned an empty response." });
    }

    // Save AI output to history (best-effort; do not fail request if history write fails)
// Save AI output to history (best-effort; do not fail request if history write fails)
try {

  // ✅ Use the validated applicationId from earlier
// (do not recompute)

  if (!applicationId) {
    console.warn("No application.id provided; skipping AI history save.");
  } else {
    await prisma.aiGeneration.create({
      data: {
        userId: req.userId!,
        applicationId,
        action,
        mode, // use the actual mode variable
        prompt: userPrompt || null,
        output: text,
      },
    });
  }

} catch (e) {
  console.error("AI history write failed:", e);
}

    return res.json({ text, mode });
  } catch (err: any) {
    console.error("AI route error:", {
  statusCode: err?.statusCode,
  name: err?.name,
  message: err?.message,
  stack: err?.stack,
});

    const status = err?.statusCode || 500;

    if (status === 400) return res.status(400).json({ error: err.message });

    return res.status(status).json({
      error:
        status === 401
          ? "AI service misconfigured."
          : status === 429
          ? "AI is rate-limited. Try again shortly."
          : "AI request failed.",
    });
  }
});

export default router;

// ===== DEV FALLBACK (FREE, NO BILLING REQUIRED) =====
function mockAiResponse(
  action: AiAction,
  company: string,
  role: string,
  notes?: string,
  userPrompt?: string
): string {

  const p = (userPrompt || "").toLowerCase();

  function applyStyle(text: string): string {

    let result = text;

    // shorter / concise
    if (p.includes("short") || p.includes("shorter") || p.includes("concise")) {
      result = result.split("\n").slice(0, 3).join("\n");
    }

    // more technical
    if (p.includes("technical")) {
      result = result
        .replace(/frontend/gi, "frontend (React, TypeScript, async state management)")
        .replace(/performance/gi, "runtime performance and render efficiency")
        .replace(/scalable/gi, "scalable, production-grade");
    }

    // add metrics
    if (p.includes("metric") || p.includes("metrics") || p.includes("quant")) {
      result += "\n• (Add measurable impact: e.g., improved performance by X% or reduced load time by Y%)";
    }

    // formal tone
    if (p.includes("formal")) {
      result = result.replace(/I wanted to/g, "I am writing to");
    }

    // friendly tone
    if (p.includes("friendly")) {
      result = "Tone: friendly\n" + result;
    }

    return result;
  }

  switch (action) {

    case "resume_bullet":
      return applyStyle(
        `• Built scalable frontend features using React and async data patterns, improving UX responsiveness and maintainability (placeholder metric: +20%).`
      );

    case "followup_email":
      return applyStyle(
        `Subject: Follow-up on ${role} application

Dear ${company} Hiring Team,

I wanted to follow up on my application for the ${role} position. I remain very interested in contributing to your team and would appreciate any updates.

Thank you for your time and consideration.

Best regards,
[Your Name]`
      );

    case "improve_notes":
      return applyStyle(
        `• Applied for ${role} at ${company}
• Focus on frontend architecture and performance
• Highlight experience with React Query and async state
• Prepare discussion on scalable component systems
• Review company tech stack before interview`
      );

    case "interview_tips":
      return applyStyle(
        `• Review React state management and async patterns
• Prepare examples of performance optimization
• Expect architecture and scalability questions
• Practice explaining technical decisions clearly
• Prepare real-world problem-solving examples
• Research the company's product and tech stack`
      );

    case "cover_letter":
      return applyStyle(
        `Dear ${company} Hiring Team,

I am excited to apply for the ${role} position. My experience building production-grade React applications and scalable frontend systems aligns well with your needs.

I would welcome the opportunity to contribute to your team.

Best regards,
[Your Name]`
      );

    default:
      return "AI response generated.";
  }
}
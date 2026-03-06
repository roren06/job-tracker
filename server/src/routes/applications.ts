import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthedRequest } from "../middleware/requireAuth";

const router = Router();

// ✅ Protect ALL /api/applications routes
router.use(requireAuth);

const StageEnum = z.enum([
  "SAVED",
  "APPLIED",
  "INTERVIEW",
  "FINAL",
  "OFFER",
  "REJECTED",
]);

type Stage = z.infer<typeof StageEnum>;

const CreateSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  stage: StageEnum.optional(),
  location: z.string().optional(),
  salaryRange: z.string().optional(),
  jobUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

const UpdateSchema = z.object({
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  stage: StageEnum.optional(),
  location: z.string().nullable().optional(),
  salaryRange: z.string().nullable().optional(),
  jobUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
});

/**
 * GET /api/applications
 * List cards
 */
router.get("/", async (req: AuthedRequest, res) => {
  const apps = await prisma.application.findMany({
    where: { userId: req.userId!, deletedAt: null },
    // stable sort for board:
    orderBy: [{ stage: "asc" }, { position: "asc" }, { updatedAt: "desc" }],
  });

  res.json({ applications: apps });
});

/**
 * GET /api/applications/summary
 * Simple summary (optional if you still use /api/analytics/summary)
 */
router.get("/summary", async (req: AuthedRequest, res) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.userId!, deletedAt: null },
      select: { stage: true },
    });

    const total = applications.length;

    const byStage: Record<Stage, number> = {
      SAVED: 0,
      APPLIED: 0,
      INTERVIEW: 0,
      FINAL: 0,
      OFFER: 0,
      REJECTED: 0,
    };

    for (const app of applications) {
      byStage[app.stage as Stage] = (byStage[app.stage as Stage] ?? 0) + 1;
    }

    const interviews = byStage.INTERVIEW + byStage.FINAL;
    const offers = byStage.OFFER;
    const acceptanceRate = total > 0 ? Math.round((offers / total) * 100) : 0;

    res.json({ total, byStage, interviews, offers, acceptanceRate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

/**
 * POST /api/applications
 * Create new card
 */
router.post("/", async (req: AuthedRequest, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const stage = (parsed.data.stage ?? "SAVED") as Stage;

  // Find last position in that stage for this user
  const last = await prisma.application.findFirst({
    where: { userId: req.userId!, stage, deletedAt: null, },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const nextPos = (last?.position ?? -1) + 1;

  const app = await prisma.application.create({
    data: {
      userId: req.userId!,
      company: parsed.data.company,
      role: parsed.data.role,
      stage,
      position: nextPos,
      location: parsed.data.location ?? null,
      salaryRange: parsed.data.salaryRange ?? null,
      jobUrl: parsed.data.jobUrl ?? null,
      notes: parsed.data.notes ?? null,
    },
  });

  res.status(201).json({ application: app });
});

/**
 * PATCH /api/applications/:id
 * Edit card / move stage (does NOT handle ordering; reorder endpoint does that)
 */
router.patch("/:id", async (req: AuthedRequest, res) => {
  const appId = String(req.params.id);

  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const existing = await prisma.application.findFirst({
    where: { id: appId, userId: req.userId!, deletedAt: null },
  });
  if (!existing) return res.status(404).json({ message: "Not found" });

  const data: {
    company?: string;
    role?: string;
    stage?: Stage;
    location?: string | null;
    salaryRange?: string | null;
    jobUrl?: string | null;
    notes?: string | null;
  } = {};

  if (parsed.data.company !== undefined) data.company = parsed.data.company;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.stage !== undefined) data.stage = parsed.data.stage as Stage;
  if (parsed.data.location !== undefined) data.location = parsed.data.location;
  if (parsed.data.salaryRange !== undefined) data.salaryRange = parsed.data.salaryRange;
  if (parsed.data.jobUrl !== undefined) data.jobUrl = parsed.data.jobUrl;
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

  const updated = await prisma.application.update({
    where: { id: appId },
    data,
  });

  res.json({ application: updated });
});

/**
 * DELETE /api/applications/:id
 * Soft delete (sets deletedAt)
 */
router.delete("/:id", async (req: AuthedRequest, res) => {
  const appId = String(req.params.id);

  const existing = await prisma.application.findFirst({
    where: { id: appId, userId: req.userId!, deletedAt: null },
  });

  if (!existing) {
    return res.status(404).json({ message: "Not found" });
  }

  const updated = await prisma.application.update({
    where: { id: appId },
    data: { deletedAt: new Date() },
  });

  res.json({ ok: true, application: updated });
});

/**
 * POST /api/applications/:id/restore
 * Restore soft-deleted app
 */
router.post("/:id/restore", async (req: AuthedRequest, res) => {
  const appId = String(req.params.id);

  const existing = await prisma.application.findFirst({
    where: { id: appId, userId: req.userId! },
  });

  if (!existing) {
    return res.status(404).json({ message: "Not found" });
  }

  const restored = await prisma.application.update({
    where: { id: appId },
    data: { deletedAt: null },
  });

  res.json({ ok: true, application: restored });
});

/**
 * POST /api/applications/reorder
 * Body: { stage, orderedIds }
 * Updates position inside ONE stage
 */
router.post("/reorder", async (req: AuthedRequest, res) => {
  const body = req.body as { stage: Stage; orderedIds: string[] };

  if (!body?.stage || !Array.isArray(body.orderedIds)) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const { stage, orderedIds } = body;

  // Validate ids belong to user + stage
  const rows = await prisma.application.findMany({
    where: {
      userId: req.userId!,
      stage,
      deletedAt: null,
      id: { in: orderedIds },
    },
    select: { id: true },
  });

  if (rows.length !== orderedIds.length) {
    return res.status(400).json({ message: "Invalid ids for this stage" });
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.application.update({
        where: { id },
        data: { position: index },
      })
    )
  );

  res.json({ ok: true });
});

export default router;
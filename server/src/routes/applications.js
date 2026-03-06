"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
// ✅ Protect ALL /api/applications routes
router.use(requireAuth_1.requireAuth);
const StageEnum = zod_1.z.enum([
    "SAVED",
    "APPLIED",
    "INTERVIEW",
    "FINAL",
    "OFFER",
    "REJECTED",
]);
const CreateSchema = zod_1.z.object({
    company: zod_1.z.string().min(1),
    role: zod_1.z.string().min(1),
    stage: StageEnum.optional(),
    location: zod_1.z.string().optional(),
    salaryRange: zod_1.z.string().optional(),
    jobUrl: zod_1.z.string().url().optional(),
    notes: zod_1.z.string().optional(),
});
const UpdateSchema = zod_1.z.object({
    company: zod_1.z.string().min(1).optional(),
    role: zod_1.z.string().min(1).optional(),
    stage: StageEnum.optional(),
    location: zod_1.z.string().nullable().optional(),
    salaryRange: zod_1.z.string().nullable().optional(),
    jobUrl: zod_1.z.string().url().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
/**
 * GET /api/applications
 * List cards
 */
router.get("/", async (req, res) => {
    const apps = await prisma_1.prisma.application.findMany({
        where: { userId: req.userId, deletedAt: null },
        // stable sort for board:
        orderBy: [{ stage: "asc" }, { position: "asc" }, { updatedAt: "desc" }],
    });
    res.json({ applications: apps });
});
/**
 * GET /api/applications/summary
 * Simple summary (optional if you still use /api/analytics/summary)
 */
router.get("/summary", async (req, res) => {
    try {
        const applications = await prisma_1.prisma.application.findMany({
            where: { userId: req.userId, deletedAt: null },
            select: { stage: true },
        });
        const total = applications.length;
        const byStage = {
            SAVED: 0,
            APPLIED: 0,
            INTERVIEW: 0,
            FINAL: 0,
            OFFER: 0,
            REJECTED: 0,
        };
        for (const app of applications) {
            byStage[app.stage] = (byStage[app.stage] ?? 0) + 1;
        }
        const interviews = byStage.INTERVIEW + byStage.FINAL;
        const offers = byStage.OFFER;
        const acceptanceRate = total > 0 ? Math.round((offers / total) * 100) : 0;
        res.json({ total, byStage, interviews, offers, acceptanceRate });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load summary" });
    }
});
/**
 * POST /api/applications
 * Create new card
 */
router.post("/", async (req, res) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.flatten());
    const stage = (parsed.data.stage ?? "SAVED");
    // Find last position in that stage for this user
    const last = await prisma_1.prisma.application.findFirst({
        where: { userId: req.userId, stage, deletedAt: null, },
        orderBy: { position: "desc" },
        select: { position: true },
    });
    const nextPos = (last?.position ?? -1) + 1;
    const app = await prisma_1.prisma.application.create({
        data: {
            userId: req.userId,
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
router.patch("/:id", async (req, res) => {
    const appId = String(req.params.id);
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json(parsed.error.flatten());
    const existing = await prisma_1.prisma.application.findFirst({
        where: { id: appId, userId: req.userId, deletedAt: null },
    });
    if (!existing)
        return res.status(404).json({ message: "Not found" });
    const data = {};
    if (parsed.data.company !== undefined)
        data.company = parsed.data.company;
    if (parsed.data.role !== undefined)
        data.role = parsed.data.role;
    if (parsed.data.stage !== undefined)
        data.stage = parsed.data.stage;
    if (parsed.data.location !== undefined)
        data.location = parsed.data.location;
    if (parsed.data.salaryRange !== undefined)
        data.salaryRange = parsed.data.salaryRange;
    if (parsed.data.jobUrl !== undefined)
        data.jobUrl = parsed.data.jobUrl;
    if (parsed.data.notes !== undefined)
        data.notes = parsed.data.notes;
    const updated = await prisma_1.prisma.application.update({
        where: { id: appId },
        data,
    });
    res.json({ application: updated });
});
/**
 * DELETE /api/applications/:id
 * Soft delete (sets deletedAt)
 */
router.delete("/:id", async (req, res) => {
    const appId = String(req.params.id);
    const existing = await prisma_1.prisma.application.findFirst({
        where: { id: appId, userId: req.userId, deletedAt: null },
    });
    if (!existing) {
        return res.status(404).json({ message: "Not found" });
    }
    const updated = await prisma_1.prisma.application.update({
        where: { id: appId },
        data: { deletedAt: new Date() },
    });
    res.json({ ok: true, application: updated });
});
/**
 * POST /api/applications/:id/restore
 * Restore soft-deleted app
 */
router.post("/:id/restore", async (req, res) => {
    const appId = String(req.params.id);
    const existing = await prisma_1.prisma.application.findFirst({
        where: { id: appId, userId: req.userId },
    });
    if (!existing) {
        return res.status(404).json({ message: "Not found" });
    }
    const restored = await prisma_1.prisma.application.update({
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
router.post("/reorder", async (req, res) => {
    const body = req.body;
    if (!body?.stage || !Array.isArray(body.orderedIds)) {
        return res.status(400).json({ message: "Invalid payload" });
    }
    const { stage, orderedIds } = body;
    // Validate ids belong to user + stage
    const rows = await prisma_1.prisma.application.findMany({
        where: {
            userId: req.userId,
            stage,
            deletedAt: null,
            id: { in: orderedIds },
        },
        select: { id: true },
    });
    if (rows.length !== orderedIds.length) {
        return res.status(400).json({ message: "Invalid ids for this stage" });
    }
    await prisma_1.prisma.$transaction(orderedIds.map((id, index) => prisma_1.prisma.application.update({
        where: { id },
        data: { position: index },
    })));
    res.json({ ok: true });
});
exports.default = router;
//# sourceMappingURL=applications.js.map
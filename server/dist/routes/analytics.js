"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../prisma");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
// ✅ Protect ALL /api/analytics routes
router.use(requireAuth_1.requireAuth);
function normalizeRange(raw) {
    const v = String(raw ?? "30d");
    if (v === "7d" || v === "30d" || v === "90d" || v === "all")
        return v;
    return "30d";
}
// Start at LOCAL midnight, N-1 days back, inclusive
function startDateFromRange(range) {
    if (range === "all")
        return null;
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    start.setDate(start.getDate() - (days - 1)); // inclusive range
    return start;
}
// Local YYYY-MM-DD (timezone-safe)
function yyyyMmDdLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
router.get("/summary", async (req, res) => {
    const range = normalizeRange(req.query.range);
    const start = startDateFromRange(range);
    const where = { userId: req.userId, deletedAt: null };
    if (start)
        where.createdAt = { gte: start };
    const apps = await prisma_1.prisma.application.findMany({
        where,
        select: { stage: true, createdAt: true },
    });
    const byStage = {
        SAVED: 0,
        APPLIED: 0,
        INTERVIEW: 0,
        FINAL: 0,
        OFFER: 0,
        REJECTED: 0,
    };
    const byDay = {};
    for (const a of apps) {
        const st = a.stage;
        byStage[st] = (byStage[st] ?? 0) + 1;
        const day = yyyyMmDdLocal(a.createdAt);
        byDay[day] = (byDay[day] ?? 0) + 1;
    }
    // Extra KPIs (range-based because we're filtering apps by createdAt)
    const interviews = (byStage.INTERVIEW ?? 0) + (byStage.FINAL ?? 0);
    const offers = byStage.OFFER ?? 0;
    const applied = byStage.APPLIED ?? 0;
    // simple acceptance rate: offers / applied
    const acceptanceRate = applied > 0 ? offers / applied : 0;
    res.json({
        range,
        start: start ? start.toISOString() : null,
        total: apps.length,
        byStage,
        byDay,
        interviews,
        offers,
        acceptanceRate,
    });
});
exports.default = router;
//# sourceMappingURL=analytics.js.map
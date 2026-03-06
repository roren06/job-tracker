"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const applications_1 = __importDefault(require("./routes/applications"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const ai_1 = __importDefault(require("./routes/ai"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const isProd = process.env.NODE_ENV === "production";
// ✅ Auth/session endpoints should not be cached
app.set("etag", false);
// ✅ important for secure cookies behind Render proxy
app.set("trust proxy", 1);
// ✅ allowed origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.CLIENT_URL,
].filter(Boolean);
// 1) CORS must be BEFORE routes
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // allow non-browser tools or same-origin requests
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));
// 2) Parsers
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// 3) Routes
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "job-tracker-api" });
});
app.use("/api/auth", auth_1.default);
app.use("/api/applications", applications_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/ai", ai_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
//# sourceMappingURL=index.js.map
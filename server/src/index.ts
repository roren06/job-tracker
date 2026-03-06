import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import applicationsRoutes from "./routes/applications";
import analyticsRoutes from "./routes/analytics";
import aiRouter from "./routes/ai";

dotenv.config();

const app = express();
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
app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser tools or same-origin requests
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// 2) Parsers
app.use(express.json());
app.use(cookieParser());

// 3) Routes
app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "job-tracker-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
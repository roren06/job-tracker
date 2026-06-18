import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "../hooks/useMe";
import { startDemoLogin } from "../lib/demoLogin";
import "./Landing.css";

const GITHUB_URL = "https://github.com/roren06/job-tracker";

const FEATURES = [
  {
    icon: "📋",
    title: "Kanban Board",
    desc: "Drag applications across Saved → Applied → Interview → Offer. Reorder cards within each stage.",
  },
  {
    icon: "📊",
    title: "Analytics Dashboard",
    desc: "Track application volume, funnel breakdown, activity streaks, and acceptance rate over time.",
  },
  {
    icon: "✨",
    title: "AI Assistant",
    desc: "Generate cover letters, follow-up emails, resume bullets, and interview prep — per application.",
  },
];

const TECH = [
  "React 19",
  "TypeScript",
  "Vite",
  "TanStack Query",
  "dnd-kit",
  "Node.js",
  "Express",
  "Prisma",
  "PostgreSQL",
  "OpenAI",
];

const PREVIEW_COLUMNS = [
  {
    title: "Applied",
    count: 2,
    cards: [
      { company: "Vercel", role: "Full Stack Dev" },
      { company: "Linear", role: "Software Engineer" },
    ],
  },
  {
    title: "Interview",
    count: 2,
    cards: [
      { company: "Figma", role: "Frontend Developer" },
      { company: "Shopify", role: "React Developer" },
    ],
  },
  {
    title: "Offer",
    count: 1,
    cards: [{ company: "Cloudflare", role: "Full Stack Engineer" }],
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isLoggedIn = Boolean(me?.user);

  async function onDemo() {
    if (loading) return;
    setErr(null);
    setLoading(true);
    try {
      await startDemoLogin(qc, navigate);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Demo login failed";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="landingPage">
      <nav className="landingNav">
        <div className="landingNavInner">
          <Link to="/" className="landingBrand">
            <img src="/jobtracker.png" alt="" className="landingBrandIcon" />
            <span>Job Tracker</span>
          </Link>

          <div className="landingNavActions">
            {isLoggedIn ? (
              <Link to="/board" className="landingBtn ghost">
                Go to Board
              </Link>
            ) : (
              <Link to="/login" className="landingBtn ghost">
                Sign in
              </Link>
            )}
            <button
              type="button"
              className="landingBtn primary"
              onClick={isLoggedIn ? () => navigate("/board") : onDemo}
              disabled={loading}
            >
              {loading ? "Loading..." : isLoggedIn ? "Open Board" : "Try Demo"}
            </button>
          </div>
        </div>
      </nav>

      <main className="landingMain">
        <section className="landingHero">
          <div className="landingHeroCopy">
            <p className="landingEyebrow">Full-stack portfolio project</p>
            <h1 className="landingTitle">
              Track your job search like a{" "}
              <span className="landingTitleAccent">Kanban board</span>
            </h1>
            <p className="landingSubtitle">
              Organize applications across hiring stages, visualize your pipeline with
              analytics, and get AI help for every role — cover letters, follow-ups, and
              interview prep.
            </p>

            <div className="landingCtas">
              <button
                type="button"
                className="landingBtn primary lg"
                onClick={isLoggedIn ? () => navigate("/board") : onDemo}
                disabled={loading}
              >
                {loading ? "Starting demo..." : isLoggedIn ? "Go to Board" : "Try live demo — no signup"}
              </button>
              <Link to="/login" className="landingBtn outline lg">
                {isLoggedIn ? "Switch account" : "Create account"}
              </Link>
            </div>

            {err && <div className="landingError">{err}</div>}

            <p className="landingHint">
              Demo loads 10 sample applications across every stage. Reset on each visit.
            </p>
          </div>

          <div className="landingPreview" aria-hidden="true">
            <div className="landingPreviewChrome">
              <span className="landingDot red" />
              <span className="landingDot yellow" />
              <span className="landingDot green" />
              <span className="landingPreviewUrl">job-tracker.app/board</span>
            </div>
            <div className="landingPreviewBoard">
              {PREVIEW_COLUMNS.map((col) => (
                <div key={col.title} className="landingPreviewCol">
                  <div className="landingPreviewColHead">
                    <span>{col.title}</span>
                    <span className="landingPreviewPill">{col.count}</span>
                  </div>
                  <div className="landingPreviewColBody">
                    {col.cards.map((card) => (
                      <div key={card.company} className="landingPreviewCard">
                        <div className="landingPreviewCardCo">{card.company}</div>
                        <div className="landingPreviewCardRole">{card.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="landingFeatures">
          <h2 className="landingSectionTitle">Everything you need to stay organized</h2>
          <div className="landingFeatureGrid">
            {FEATURES.map((f) => (
              <article key={f.title} className="landingFeatureCard">
                <div className="landingFeatureIcon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landingTech">
          <h2 className="landingSectionTitle">Built with</h2>
          <div className="landingTechPills">
            {TECH.map((t) => (
              <span key={t} className="landingTechPill">
                {t}
              </span>
            ))}
          </div>
        </section>

        <section className="landingCtaBand">
          <h2>See it in action</h2>
          <p>Jump into a pre-loaded demo board in one click.</p>
          <button
            type="button"
            className="landingBtn primary lg"
            onClick={isLoggedIn ? () => navigate("/board") : onDemo}
            disabled={loading}
          >
            {isLoggedIn ? "Open your board" : "Launch demo"}
          </button>
        </section>
      </main>

      <footer className="landingFooter">
        <p>Built by <a href="https://github.com/roren06" target="_blank" rel="noreferrer">roren06</a></p>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="landingFooterLink">
          View source on GitHub →
        </a>
      </footer>
    </div>
  );
}

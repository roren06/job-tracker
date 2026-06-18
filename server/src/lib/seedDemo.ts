import type { ApplicationStage } from "@prisma/client";
import { prisma } from "../prisma";

export const DEMO_EMAIL = "demo@jobtracker.app";

type SeedApp = {
  company: string;
  role: string;
  stage: ApplicationStage;
  position: number;
  location?: string;
  salaryRange?: string;
  jobUrl?: string;
  notes?: string;
};

const DEMO_APPLICATIONS: SeedApp[] = [
  {
    company: "Stripe",
    role: "Frontend Engineer",
    stage: "SAVED",
    position: 0,
    location: "Remote (US)",
    salaryRange: "$140k–$180k",
    jobUrl: "https://stripe.com/jobs",
    notes: "Strong React + TypeScript team. Referral from Alex.",
  },
  {
    company: "Notion",
    role: "Product Engineer",
    stage: "SAVED",
    position: 1,
    location: "San Francisco, CA",
    salaryRange: "$150k–$190k",
    notes: "Bookmarked from Hacker News thread. Great design culture.",
  },
  {
    company: "Vercel",
    role: "Full Stack Developer",
    stage: "APPLIED",
    position: 0,
    location: "Remote",
    salaryRange: "$130k–$170k",
    jobUrl: "https://vercel.com/careers",
    notes: "Submitted tailored resume on Feb 12. Waiting for recruiter screen.",
  },
  {
    company: "Linear",
    role: "Software Engineer",
    stage: "APPLIED",
    position: 1,
    location: "Remote (EU/US)",
    salaryRange: "$135k–$175k",
    notes: "Applied via careers page. Portfolio project highlighted.",
  },
  {
    company: "Figma",
    role: "Frontend Developer",
    stage: "INTERVIEW",
    position: 0,
    location: "New York, NY",
    salaryRange: "$145k–$185k",
    notes: "Recruiter screen done. Technical round scheduled for next Tuesday.",
  },
  {
    company: "Shopify",
    role: "React Developer",
    stage: "INTERVIEW",
    position: 1,
    location: "Remote (Canada)",
    salaryRange: "$120k–$155k",
    notes: "Completed take-home. Presentation with hiring manager on Friday.",
  },
  {
    company: "Datadog",
    role: "Software Engineer II",
    stage: "FINAL",
    position: 0,
    location: "Boston, MA",
    salaryRange: "$155k–$195k",
    notes: "Final round with VP Engineering. Prep: system design + leadership stories.",
  },
  {
    company: "Cloudflare",
    role: "Full Stack Engineer",
    stage: "OFFER",
    position: 0,
    location: "Remote",
    salaryRange: "$160k base + equity",
    notes: "Offer received! $160k base, 15% bonus, RSUs. Decision deadline: March 28.",
  },
  {
    company: "Meta",
    role: "Frontend Engineer",
    stage: "REJECTED",
    position: 0,
    location: "Menlo Park, CA",
    salaryRange: "$180k–$220k",
    notes: "Rejected after onsite. Feedback: strong coding, need more system design depth.",
  },
  {
    company: "Airbnb",
    role: "UI Engineer",
    stage: "REJECTED",
    position: 1,
    location: "Remote (US)",
    salaryRange: "$150k–$190k",
    notes: "No response after 3 weeks. Sent follow-up email.",
  },
];

export async function seedDemoApplications(userId: string) {
  await prisma.application.deleteMany({ where: { userId } });
  await prisma.application.createMany({
    data: DEMO_APPLICATIONS.map((app) => ({ ...app, userId })),
  });
}

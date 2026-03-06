import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
  timeout: 8000,
  headers: {
    "Cache-Control": "no-store",
  },
});

export type AiAction =
  | "resume_bullet"
  | "followup_email"
  | "improve_notes"
  | "interview_tips"
  | "cover_letter";

export type AiGenerateRequest = {
  action: AiAction;
  application: {
    id: string;
    company: string;
    role: string;
    stage?: string;
    notes?: string | null;
    jobUrl?: string | null;
    location?: string | null;
    salaryRange?: string | null;
  };
  prompt?: string;
};

export type AiGenerateResponse = {
  text: string;
  mode?: "live" | "demo";
};

export async function generateAI(payload: AiGenerateRequest): Promise<AiGenerateResponse> {
  const res = await api.post<AiGenerateResponse>("/ai/generate", payload);
  return res.data;
}

export type AiHistoryItem = {
  id: string;
  action: string;
  mode: string;
  prompt: string | null;
  output: string;
  createdAt: string;
};

export async function getAiHistory(applicationId: string) {
  const res = await api.get(`/ai/history/${applicationId}`);
  return res.data as { items: AiHistoryItem[] };
}

export type AiUsage = {
  count: number;
  last: null | {
    createdAt: string;
    mode: "live" | "demo" | string;
    action: string;
  };
};

export async function getAiUsage(applicationId: string) {
  const res = await api.get(`/ai/usage/${applicationId}`);
  return res.data as AiUsage;
}

export async function requestPasswordReset(email: string) {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
}
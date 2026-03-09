import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import "./Board.css";
import { useTheme } from "../lib/useTheme";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { generateAI, type AiAction } from "../lib/api"; // adjust path if api.ts is elsewhere
import { useMutation } from "@tanstack/react-query";
import type { AiHistoryItem } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useMe } from "../hooks/useMe";

type Stage = "SAVED" | "APPLIED" | "INTERVIEW" | "FINAL" | "OFFER" | "REJECTED";

type Application = {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  location?: string | null;
  salaryRange?: string | null;
  jobUrl?: string | null;
  notes?: string | null;
};

const COLUMN_PREFIX = "column:";

function columnDroppableId(stage: Stage) {
  return `${COLUMN_PREFIX}${stage}`;
}

function isColumnId(id: string) {
  return id.startsWith(COLUMN_PREFIX);
}

function stageFromColumnId(id: string): Stage {
  return id.replace(COLUMN_PREFIX, "") as Stage;
}

const STAGES: { key: Stage; label: string }[] = [
  { key: "SAVED", label: "Saved" },
  { key: "APPLIED", label: "Applied" },
  { key: "INTERVIEW", label: "Interview" },
  { key: "FINAL", label: "Final" },
  { key: "OFFER", label: "Offer" },
  { key: "REJECTED", label: "Rejected" },
];

function Column({
  stage,
  title,
  count,
  children,
}: {
  stage: Stage;
  title: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: columnDroppableId(stage) });

  return (
  <div ref={setNodeRef} className="boardColumn">
    <div className="boardColumnHeader">
      <h3 className="boardColumnTitle">{title}</h3>
      <div className="boardPill">{count}</div>
    </div>

    <div className="boardColumnBody">
      <div className="boardColumnBodyInner">{children}</div>
    </div>
  </div>
  );
}

function Card({
  app,
  onChangeStage,
  onOpen,
  onDelete,
}: {
  app: Application;
  onChangeStage: (id: string, stage: Stage) => void;
  onOpen: (app: Application) => void;
  isUpdating: boolean;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform, transition } =
    useSortable({ id: app.id });

  const style: React.CSSProperties = {
    border: "1px solid var(--border2)",
    borderRadius: 12,
    padding: 10,
    opacity: isDragging ? 0.15 : 1,
    filter: isDragging ? "saturate(0.7)" : "none",
    cursor: "grab",
    boxShadow: "var(--shadowSoft)",
    position: "relative",
    zIndex: 1,
    color: "var(--text-primary)",
    transform: CSS.Transform.toString(transform),
    transition: transition
      ? `${transition}, box-shadow 150ms ease`
      : "box-shadow 150ms ease",
  };

  return (
    <div
      className="boardCard"
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={() => onOpen(app)}
    >

      <button
  type="button"
  className="cardQuickDelete"
  title="Delete"
  aria-label="Delete application"
  onPointerDown={(e) => e.stopPropagation()} // prevents drag start
  onClick={(e) => {
    e.stopPropagation();
    onDelete(app.id);
  }}
>
  🗑
</button>


      <div style={{ fontWeight: 700 }}>{app.company}</div>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>{app.role}</div>

      <select
  className="cardStageSelect"
  value={app.stage}
  onChange={(e) => onChangeStage(app.id, e.target.value as Stage)}
>
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ✅ OverlayCard must be OUTSIDE Card() so DragOverlay can see it
function OverlayCard({
  app,
  onChangeStage,
  onOpen,
}: {
  app: Application;
  onChangeStage: (id: string, stage: Stage) => void;
  onOpen: (app: Application) => void;
}) {
  const style: React.CSSProperties = {
    borderRadius: 12,
    padding: 10,
    width: 260,
    cursor: "grabbing",
    boxShadow: "var(--overlayCardShadow)",
    color: "var(--text-primary)",
    transform: "translateZ(0)",
    pointerEvents: "none",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    background: "var(--overlayCardBg)",
    border: "1px solid var(--overlayCardBorder)",
    outline: "1px solid rgba(255,255,255,0.18)",
    outlineOffset: "-1px",
  };

  return (
    <div className="boardCard" style={style} onDoubleClick={() => onOpen(app)}>
      <div style={{ fontWeight: 700 }}>{app.company}</div>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>{app.role}</div>

      <select
  className="cardStageSelect"
  value={app.stage}
  onChange={(e) => onChangeStage(app.id, e.target.value as Stage)}
>
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}



function BoardSkeleton() {
  return (
    <div className="appShell">
      <div className="appContainer">
        <div className="boardShell">
          <div className="boardContainer">
            <div className="boardInner">
              {/* Topbar Skeleton */}
              <div className="topbarSticky">
                <div className="topbarPill skeletonTopbar">
                  <div className="skel skelTitle" />
                  <div className="skeletonCenter">
                    <div className="skel skelInput" />
                    <div className="skel skelInput" />
                    <div className="skel skelInput" />
                    <div className="skel skelSelect" />
                    <div className="skel skelBtn" />
                  </div>
                  <div className="skeletonRight">
                    <div className="skel skelSmall" />
                    <div className="skel skelIcon" />
                    <div className="skel skelBtn" />
                  </div>
                </div>
              </div>

              {/* Board Skeleton */}
              <div className="boardGrid">
                <div className="boardColumnsGrid">
                  {STAGES.map((s) => (
                    <div key={s.key} className="boardColumn skeletonColumn">
                      <div className="boardColumnHeader skeletonHeader">
                        <div className="skel skelColTitle" />
                        <div className="skel skelPill" />
                      </div>

                      <div className="boardColumnBody">
                        <div className="boardColumnBodyInner">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="skeletonCard">
                              <div className="skel skelLine1" />
                              <div className="skel skelLine2" />
                              <div className="skel skelLine3" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* subtle footer space */}
              <div style={{ height: 24 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileMenu({
  theme,
  onToggleTheme,
  onGoAnalytics,
  onLogout,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onGoAnalytics: () => void;
  onLogout: () => void;
}) {
  const { data } = useMe();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  const label =
    (data?.user?.name && String(data.user.name).trim()) ||
    (data?.user?.email && String(data.user.email).trim()) ||
    "Account";

  React.useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="profileMenu" ref={ref}>
      <button
        type="button"
        className="logoutBtn profileBtn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="profileAvatar" aria-hidden="true">
  <span className="profileAvatarIcon">👤</span>
</span>
        <span className="profileLabel">{label}</span>
        <span className="profileChevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div className="profileDropdown" role="menu">
          <button
            type="button"
            className="profileItem"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onGoAnalytics();
            }}
          >
            Analytics
          </button>

          <button
            type="button"
            className="profileItem"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onToggleTheme();
            }}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>

          <div className="profileDivider" />

          <button
            type="button"
            className="profileItem danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Board() {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [aiOutput, setAiOutput] = useState<string>("");
  const [aiPanelLoading, setAiPanelLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiMode, setAiMode] = useState<"live" | "demo">("demo");
  const [aiAction, setAiAction] = useState<AiAction | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const aiCarouselRef = useRef<HTMLDivElement | null>(null);
  const [aiAutoScrollPaused, setAiAutoScrollPaused] = useState(false);
  const aiPauseTimerRef = useRef<number | null>(null);
  const aiScrollbarDraggingRef = useRef(false);
  const [aiHistory, setAiHistory] = useState<AiHistoryItem[]>([]);
  const [aiHistoryLoading, setAiHistoryLoading] = useState(false);
  const [lastAiAction, setLastAiAction] = useState<AiAction | null>(null);
  const [lastAiPrompt, setLastAiPrompt] = useState<string>("");
  const [aiUsage, setAiUsage] = useState<{ count: number; last: any | null }>({
  count: 0,
  last: null,
  });
  const [aiUsageLoading, setAiUsageLoading] = useState(false);
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [mobileStage, setMobileStage] = useState<Stage>("SAVED");

const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 520);

useEffect(() => {
  const onResize = () => setIsMobile(window.innerWidth <= 520);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

const stagesToRender: { key: Stage; label: string }[] = isMobile
  ? STAGES.filter((s) => s.key === mobileStage)
  : STAGES;

  function toggleAiOpen() {
    setAiOpen((v) => !v);
  }

  async function refreshAiUsage(appId: string) {
  setAiUsageLoading(true);
  try {
    const res = await api.get(`/ai/usage/${appId}`);
    setAiUsage(res.data);
  } catch {
    setAiUsage({ count: 0, last: null });
  } finally {
    setAiUsageLoading(false);
  }
}

  const [aiAutoSaveAfterInsert, setAiAutoSaveAfterInsert] = useState(true);

  function isPointerOnHorizontalScrollbar(
  e: React.PointerEvent<HTMLDivElement>
) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();

  // bottom area where scrollbar exists
  const scrollbarHitAreaPx = 14;

  return e.clientY >= rect.bottom - scrollbarHitAreaPx;
}

function pauseAiAutoScroll(tempMs = 1200) {
  setAiAutoScrollPaused(true);

  if (aiPauseTimerRef.current) {
    window.clearTimeout(aiPauseTimerRef.current);
  }

  aiPauseTimerRef.current = window.setTimeout(() => {
    setAiAutoScrollPaused(false);
    aiPauseTimerRef.current = null;
  }, tempMs);
}


  type Toast = {
  id: string;
  message: string;
  type: "success" | "error";
  actionLabel?: string;
  onAction?: () => void;

  // NEW
  durationMs?: number;   // auto-close duration
  showProgress?: boolean; // render progress bg only when true
};

const [toasts, setToasts] = useState<Toast[]>([]);

function removeToast(id: string) {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}

function pushToast(
  input: string | Omit<Toast, "id">,
  type: Toast["type"] = "success"
) {
  const toast: Omit<Toast, "id"> =
    typeof input === "string" ? { message: input, type } : input;

  const id = crypto.randomUUID();
  const duration = toast.durationMs ?? 2500;

  setToasts((prev) => [...prev, { id, ...toast }]);

  window.setTimeout(() => {
    removeToast(id);
  }, duration);
}

  const [form, setForm] = useState<{ company: string; role: string; stage: Stage }>(
    {
      company: "",
      role: "",
      stage: "SAVED",
    }
  );

  const { theme, toggle } = useTheme();

  const [selected, setSelected] = useState<Application | null>(null);
  const [draft, setDraft] = useState({
    company: "",
    role: "",
    stage: "SAVED" as Stage,
    location: "",
    salaryRange: "",
    jobUrl: "",
    notes: "",
  });

  const {
  data,
  isLoading,
  refetch,
} = useQuery({
  queryKey: ["applications"],
  queryFn: async () => {
    const res = await api.get("/applications");
    return res.data as { applications: Application[] };
  },
  staleTime: 10_000,
});

// ===== AI Assistant (Phase 3 Core) =====
function formatAiForNotes(action: AiAction | null, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (!action) return trimmed;

  switch (action) {
    case "resume_bullet": {
      // Ensure bullet prefix
      return trimmed.startsWith("•") ? trimmed : `• ${trimmed}`;
    }

    case "followup_email":
    case "cover_letter": {
      // Keep as a clean block (no changes)
      return trimmed;
    }

    case "improve_notes":
    case "interview_tips": {
      // If it looks like bullets already, keep. Otherwise turn lines into bullets.
      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      const alreadyBulleted = lines.every((l) => l.startsWith("•") || l.startsWith("-"));
      if (alreadyBulleted) return lines.join("\n");
      return lines.map((l) => `• ${l}`).join("\n");
    }

    default:
      return trimmed;
  }
}

async function insertAiIntoNotes() {
  if (!aiOutput) return;

  const formatted = formatAiForNotes(aiAction, aiOutput);
  if (!formatted) return;

  // ✅ APPEND only (safe default)
  const current = (draft.notes ?? "").trim();
  const nextNotes = current ? `${current}\n\n${formatted}` : formatted;

  // Update UI immediately
  setDraft((prev) => ({ ...prev, notes: nextNotes }));

  pushToast({ message: "Inserted into notes", type: "success" });

  // Optional: auto-save to DB immediately after insert
  if (aiAutoSaveAfterInsert && selected && !isSaving) {
    try {
      setIsSaving(true);

      await api.patch(`/applications/${selected.id}`, {
        notes: nextNotes ? nextNotes : null,
      });

      pushToast({ message: "Notes saved", type: "success" });
      refetch();
    } catch {
      pushToast({ message: "Failed to auto-save notes", type: "error" });
    } finally {
      setIsSaving(false);
    }
  }
}

function regenerateAi() {
  if (!selected || !lastAiAction) {
    pushToast({ message: "Nothing to regenerate", type: "error" });
    return;
  }

  setShowAiPanel(true);
  setAiPanelLoading(true);
  setAiOutput("");

  setAiPrompt(lastAiPrompt);

  aiMutation.mutate(lastAiAction);
}

async function replaceNotesWithAi() {
  if (!aiOutput) return;

  const formatted = formatAiForNotes(aiAction, aiOutput);
  if (!formatted) return;

  const ok = window.confirm(
    "Replace your Notes with the AI result? This will overwrite your current notes."
  );
  if (!ok) return;

  // Replace
  setDraft((prev) => ({ ...prev, notes: formatted }));

  pushToast({ message: "Notes replaced", type: "success" });

  if (aiAutoSaveAfterInsert && selected && !isSaving) {
    try {
      setIsSaving(true);

      await api.patch(`/applications/${selected.id}`, {
        notes: formatted ? formatted : null,
      });

      pushToast({ message: "Notes saved", type: "success" });
      refetch();
    } catch {
      pushToast({ message: "Failed to auto-save notes", type: "error" });
    } finally {
      setIsSaving(false);
    }
  }
}

const aiMutation = useMutation({
  mutationFn: async (action: AiAction) => {
    const company = draft.company?.trim();
    const role = draft.role?.trim();
    if (!company || !role) {
      throw new Error("Company and role are required for AI generation.");
    }

    if (!selected) {
    pushToast({ message: "Open an application first.", type: "error" });
    return;
    }

    return generateAI({
      action,
      application: {
    id: selected.id,
    company: draft.company,
    role: draft.role,
    stage: draft.stage,
    notes: draft.notes,
    jobUrl: draft.jobUrl,
    location: draft.location,
    salaryRange: draft.salaryRange,
  },
    prompt: aiPrompt.trim() ? aiPrompt.trim() : undefined,
  });
  },
  onMutate: (action) => {
    setAiAction(action);
  },
  onSuccess: (data, action) => {
  const text = data?.text ?? "";

  setAiOutput(text);
  setAiPanelLoading(false);

  if (text) {
    setLastAiAction(action);
    setLastAiPrompt(aiPrompt);

    pushToast({ message: "AI generated", type: "success" });
    setShowAiPanel(true);

    // ✅ ADD THIS LINE (usage indicator refresh)
    if (selected?.id) refreshAiUsage(selected.id);

  } else {
    pushToast({ message: "AI returned empty result", type: "error" });
  }
},

  onError: (err: any) => {
    setAiPanelLoading(false);   // ✅ stop loading even on error
    
    const msg =
      err?.response?.data?.error ||
      err?.message ||
      "AI request failed.";
    pushToast({ message: msg, type: "error" });
  },
  onSettled: () => {
    setAiAction(null);
  },
});



  const apps = data?.applications ?? [];
  const [optimisticStageById, setOptimisticStageById] = useState<Record<string, Stage>>(
    {}
  );
  const activeApp = activeId ? apps.find((a) => a.id === activeId) : null;

  const stagedApps = apps.map((a) => ({
    ...a,
    stage: optimisticStageById[a.id] ?? a.stage,
  }));

  // ✅ Stable ordering store
  const [orderByStage, setOrderByStage] = useState<Record<Stage, string[]>>({
    SAVED: [],
    APPLIED: [],
    INTERVIEW: [],
    FINAL: [],
    OFFER: [],
    REJECTED: [],
  });

  const orderRef = useRef(orderByStage);

  useEffect(() => {
    orderRef.current = orderByStage;
  }, [orderByStage]);

  useEffect(() => {
  if (!selected?.id) return;

  setAiHistoryLoading(true);

  api
    .get(`/ai/history/${selected.id}`)
    .then((res) => {
      setAiHistory(res.data?.items ?? []);
    })
    .catch(() => {
      setAiHistory([]);
    })
    .finally(() => {
      setAiHistoryLoading(false);
    });
}, [selected?.id]);

  const filteredApps = stagedApps.filter((a) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return a.company.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  });

  const visibleIdSet = useMemo(() => new Set(filteredApps.map((a) => a.id)), [filteredApps]);

  const appById = useMemo(() => {
    const map = new Map<string, Application>();
    for (const a of stagedApps) map.set(a.id, a);
    return map;
  }, [stagedApps]);

  useEffect(() => {
  return () => {
    if (aiPauseTimerRef.current) window.clearTimeout(aiPauseTimerRef.current);
  };
}, []);

  // ✅ Initialize/reconcile stable order when data changes
  useEffect(() => {
  // Initialize / reconcile orderByStage from latest data + optimistic stages
  if (!apps.length) return;

  const staged = apps.map((a) => ({
    ...a,
    stage: optimisticStageById[a.id] ?? a.stage,
  }));

  setOrderByStage((prev) => {
    const nextByStage: Record<Stage, string[]> = {
      SAVED: [],
      APPLIED: [],
      INTERVIEW: [],
      FINAL: [],
      OFFER: [],
      REJECTED: [],
    };

    for (const app of staged) nextByStage[app.stage].push(app.id);

    const result: Record<Stage, string[]> = { ...nextByStage };

    (Object.keys(nextByStage) as Stage[]).forEach((stage) => {
      const prevOrder = prev[stage] ?? [];
      const nextSet = new Set(nextByStage[stage]);

      const kept = prevOrder.filter((id) => nextSet.has(id));
      const appended = nextByStage[stage].filter((id) => !kept.includes(id));

      result[stage] = [...kept, ...appended];
    });

    // IMPORTANT: only update state if something actually changed
    let changed = false;
    (Object.keys(result) as Stage[]).forEach((stage) => {
      const a = prev[stage] ?? [];
      const b = result[stage] ?? [];
      if (a.length !== b.length) changed = true;
      else {
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) {
            changed = true;
            break;
          }
        }
      }
    });

    return changed ? result : prev;
  });
}, [apps, optimisticStageById]);


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function createApplication() {
  if (isCreating) return;
  if (!form.company.trim() || !form.role.trim()) return;

  setIsCreating(true);
  try {
    await api.post("/applications", form);
    pushToast({ message: "Application added", type: "success" });
    setForm({ company: "", role: "", stage: "SAVED" });
    refetch();
  } catch (e) {
    pushToast({ message: "Failed to add application", type: "error" });
    throw e;
  } finally {
    setIsCreating(false);
  }
}

const [isDeleting, setIsDeleting] = useState(false);

async function restoreApplication(id: string) {
  await api.post(`/applications/${id}/restore`);
}

async function deleteApplication(id: string) {
  if (isDeleting) return;

  setIsDeleting(true);

  try {
    // 1️⃣ Get the full app BEFORE deleting (needed for undo)
    const appToRestore = apps.find((a) => a.id === id);
    if (!appToRestore) return;

    // 2️⃣ Delete (soft delete API)
    await api.delete(`/applications/${id}`);

    // 4️⃣ Show toast WITH undo
    pushToast({
      message: "Application deleted",
      type: "success",
      durationMs: 10000,
      showProgress: true,
      actionLabel: "Undo",
      onAction: async () => {
    await restoreApplication(id);
    pushToast("Restored", "success");
    refetch();
    },
    });

    refetch();
  } catch (e) {
    pushToast("Failed to delete", "error");
  } finally {
    setIsDeleting(false);
  }
}

  async function updateStage(
  id: string,
  stage: Stage,
  opts?: { silent?: boolean } // silent = no toast
) {
  setOptimisticStageById((prev) => ({ ...prev, [id]: stage }));
  setUpdatingIds((prev) => new Set(prev).add(id));

  try {
    await api.patch(`/applications/${id}`, { stage });

    // ✅ only toast when NOT silent (dropdown change, etc.)
    if (!opts?.silent) {
      pushToast(`Moved to ${stage}`, "success");
    }

    setOptimisticStageById((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    // ✅ avoid refetch spam on drag moves (silent)
    if (!opts?.silent) {
      refetch();
    }
  } catch (e) {
    if (!opts?.silent) pushToast("Failed to update stage", "error");

    setOptimisticStageById((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    throw e;
  } finally {
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }
}

  async function logout() {
    await api.post("/auth/logout");
    window.location.href = "/login";
  }

  function findStageOfCard(cardId: string): Stage | null {
  const current = orderRef.current;
  for (const stage of Object.keys(current) as Stage[]) {
    if (current[stage].includes(cardId)) return stage;
  }
  return null;
}

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragCancel() {
    setActiveId(null);
  }

  async function persistStageOrder(stage: Stage, orderedIds: string[]) {
  await api.post("/applications/reorder", { stage, orderedIds });
  }

  async function onDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  setActiveId(null);

  if (!over) return;

  const draggedId = String(active.id);
  const overId = String(over.id);

  const fromStage = findStageOfCard(draggedId);
  if (!fromStage) return;

  let toStage: Stage | null = null;
  let toIndex: number | null = null;

  if (isColumnId(overId)) {
    toStage = stageFromColumnId(overId);
    toIndex = orderByStage[toStage].length;
  } else {
    const overStage = findStageOfCard(overId);
    if (!overStage) return;
    toStage = overStage;
    toIndex = orderByStage[toStage].indexOf(overId);
  }

  if (toStage == null || toIndex == null) return;

  // ✅ SAME COLUMN REORDER
  if (fromStage === toStage) {
    const oldIndex = orderByStage[fromStage].indexOf(draggedId);
    const newIndex = toIndex;

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const nextOrder = arrayMove(orderByStage[fromStage], oldIndex, newIndex);

    setOrderByStage((prev) => ({
      ...prev,
      [fromStage]: nextOrder,
    }));

    try {
      await persistStageOrder(fromStage, nextOrder);
      // optional toast for reorder (comment out if you don't want it)
      // pushToast("Reordered", "success");
    } catch {
      pushToast("Failed to save order", "error");
      refetch();
    }
    return;
  }

  // ✅ CROSS COLUMN MOVE
  const fromNext = orderByStage[fromStage].filter((id) => id !== draggedId);

  const dest = [...orderByStage[toStage]];
  const insertIndex = Math.max(0, Math.min(toIndex, dest.length));
  dest.splice(insertIndex, 0, draggedId);
  const toNext = dest;

  setOrderByStage((prev) => ({
    ...prev,
    [fromStage]: fromNext,
    [toStage!]: toNext,
  }));

  try {
  await updateStage(draggedId, toStage, { silent: true });

  await Promise.all([
    persistStageOrder(fromStage, fromNext),
    persistStageOrder(toStage, toNext),
  ]);

  pushToast(`Moved to ${toStage}`, "success");

  // no immediate refetch here
} catch {
  pushToast("Failed to move card", "error");
  refetch();
}
}

  function openDrawer(app: Application) {
    setAiPrompt("");
    setAiMode("demo");
    setAiOutput("");
    setAiAction(null);
    setSelected(app);
    refreshAiUsage(app.id);
    setDraft({
      company: app.company,
      role: app.role,
      stage: app.stage,
      location: app.location ?? "",
      salaryRange: app.salaryRange ?? "",
      jobUrl: app.jobUrl ?? "",
      notes: app.notes ?? "",
    });
  }

  function closeDrawer() {
    setSelected(null);
  }

  async function saveDrawer() {
  if (!selected) return;
  if (isSaving) return;

  setIsSaving(true);
  try {
    await api.patch(`/applications/${selected.id}`, {
      company: draft.company,
      role: draft.role,
      stage: draft.stage,
      location: draft.location ? draft.location : null,
      salaryRange: draft.salaryRange ? draft.salaryRange : null,
      jobUrl: draft.jobUrl ? draft.jobUrl : null,
      notes: draft.notes ? draft.notes : null,
    });

    pushToast({ message: "Changes saved", type: "success" });
    closeDrawer();
    refetch();
  } catch (e) {
    pushToast({ message: "Failed to save changes", type: "error" });
    throw e;
  } finally {
    setIsSaving(false);
  }
}



  if (isLoading) return <BoardSkeleton />;

  return (
  <div className="appShell">
    {/* Toasts */}
<div
  className="toastStack"
  aria-live="polite"
  aria-relevant="additions removals"
>
  {toasts.map((t) => (
    <div key={t.id} className={`toast ${t.type}`}>
      {/* progress bg ONLY when showProgress = true */}
      {t.showProgress ? (
        <div
          className="toastProgressBg"
          style={{ ["--toastDur" as any]: `${t.durationMs ?? 2500}ms` }}
        />
      ) : null}

      <div className="toastRow">
        <div className="toastMsg">{t.message}</div>

        <div className="toastActions">
          {t.actionLabel && t.onAction ? (
            <button
              className="toastAction"
              type="button"
              onClick={() => {
                t.onAction?.();
                removeToast(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          ) : null}

          <button
            className="toastClose"
            type="button"
            aria-label="Close"
            onClick={() => removeToast(t.id)}
          >
            <span>✕</span>
          </button>
        </div>
      </div>
    </div>
  ))}
</div>

    <div className="appContainer">
        <div
          className="boardShell"
          style={{ background: "var(--bg)", color: "var(--text-primary)" }}
        >
          <div className="boardContainer">
            <div className="boardInner">
              {/* Top Bar */}
<div className="topbarSticky">
  <div className="topbarPill">
    {/* LEFT: Brand */}
    <div className="topbarLeft">
      <div className="brandTitle">Job Tracker</div>
    </div>

    {/* RIGHT: Form Controls + Meta */}
    <div className="topbarRight">
      <div className="topbarControls">

        <input
          className="topInput topSearchInput"
          placeholder="Search.."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isCreating}
        />

        <input
          className="topInput"
          placeholder="Company"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          disabled={isCreating}
        />

        <input
          className="topInput"
          placeholder="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          disabled={isCreating}
        />

        <div className="topSelectWrapper">
          <select
            className="topSelect"
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
            disabled={isCreating}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="topSelectArrow">▾</span>
        </div>

        <button
          className="primaryBtn"
          onClick={createApplication}
          disabled={isCreating}
        >
          {isCreating ? "Adding..." : "Add"}
        </button>
      </div>

      <div className="totalText">
        Total: <b>{filteredApps.length}</b>
      </div>

      <div className="topbarActions">
  <ProfileMenu
    theme={theme}
    onToggleTheme={toggle}
    onGoAnalytics={() => navigate("/analytics")}
    onLogout={logout}
  />
</div>
    </div>
  </div>
</div>

{isMobile && (
  <div style={{ margin: "12px 0" }}>
    <div className="topSelectWrapper" style={{ width: "100%" }}>
      <select
        className="topSelect"
        value={mobileStage}
        onChange={(e) => setMobileStage(e.target.value as Stage)}
        style={{ width: "100%" }}
      >
        {STAGES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      <span className="topSelectArrow">▾</span>
    </div>
  </div>
)}

              {/* Board */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={onDragStart}
                onDragCancel={onDragCancel}
                onDragEnd={onDragEnd}
              >
                <div className="boardGrid">
                  <div className="boardColumnsGrid">
                    {stagesToRender.map((s: { key: Stage; label: string }) => {
  const orderedIds = orderByStage[s.key];
  const visibleIds = orderedIds.filter((id: string) => visibleIdSet.has(id));

  return (
    <Column
      key={s.key}
      stage={s.key}
      title={s.label}
      count={visibleIds.length}
    >
                          <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
  {visibleIds.length === 0 ? (
    <div className="emptyState">
      <div className="emptyIcon" aria-hidden="true">＋</div>
      <div className="emptyTitle">No items</div>
      <div className="emptySub">Drop a card here or add a new one.</div>
    </div>
  ) : (
    visibleIds.map((id) => {
      const app = appById.get(id);
      if (!app) return null;

      return (
        <Card
          key={id}
          app={app}
          onChangeStage={updateStage}
          onOpen={openDrawer}
          isUpdating={updatingIds.has(id)}
          onDelete={deleteApplication}
        />
      );
    })
  )}
</SortableContext>

                        </Column>
                      );
                    })}
                  </div>
                </div>

                <DragOverlay>
                  {activeApp ? (
                    <OverlayCard
                      app={activeApp}
                      onChangeStage={updateStage}
                      onOpen={openDrawer}
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>

          {/* Drawer */}
          {selected ? (
            <div className="drawerOverlay" onClick={closeDrawer}>
            <div className="drawerPanel" onClick={(e) => e.stopPropagation()}>

                <div className="drawerHeaderRow">

                <div className="drawerTitle">Edit Application</div>

                <button className="drawerCloseBtn" onClick={closeDrawer} aria-label="Close">
                  ✕
                </button>

                </div>

                <div className="drawerForm">
                  <label>
                    <div className="drawerLabel">Company</div>
                    <input
                      className="drawerField"
                      value={draft.company}
                      onChange={(e) => setDraft({ ...draft, company: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label>
                    <div className="drawerLabel">Role</div>
                    <input
                      className="drawerField"
                      value={draft.role}
                      onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label>
                    <div className="drawerLabel">Stage</div>
                    <select
                      className="drawerField"
                      value={draft.stage}
                      onChange={(e) =>
                        setDraft({ ...draft, stage: e.target.value as Stage })
                      }
                      style={{ width: "100%" }}
                    >
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <div className="drawerLabel">Location</div>
                    <input
                      className="drawerField"
                      value={draft.location}
                      onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label>
                    <div className="drawerLabel">Salary Range</div>
                    <input
                      className="drawerField"
                      value={draft.salaryRange}
                      onChange={(e) =>
                        setDraft({ ...draft, salaryRange: e.target.value })
                      }
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label>
                    <div className="drawerLabel">Job URL</div>
                    <input
                      className="drawerField"
                      value={draft.jobUrl}
                      onChange={(e) => setDraft({ ...draft, jobUrl: e.target.value })}
                      style={{ width: "100%" }}
                    />
                  </label>

                  <label>
                    <div className="drawerLabel">Notes</div>
                    <textarea
                      className="drawerField"
                      value={draft.notes}
                      onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                      style={{ width: "100%", minHeight: 140 }}
                    />
                  </label>

                  {/* AI Assistant (Collapsible) */}
<div className="drawerSection">
  <button
    type="button"
    className="drawerSectionHeader"
    onClick={toggleAiOpen}
    aria-expanded={aiOpen}
  >
    <span className={`drawerChevron ${aiOpen ? "open" : ""}`} aria-hidden="true">
      ▸
    </span>
    <span className="drawerSectionTitle">AI Assistant</span>

    {/* right side meta (optional, still visible when collapsed) */}
    <div className="drawerSectionMeta">
      <div className={`aiModeBadge ${aiMode}`}>{aiMode === "live" ? "Live" : "Demo"}</div>

      <div
        className="aiUsagePill"
        title={aiUsage.last ? `Last: ${aiUsage.last.action}` : ""}
      >
        {aiUsageLoading ? "AI: …" : `AI: ${aiUsage.count}`}
      </div>
    </div>
  </button>

  {aiOpen && (
    <div className="drawerSectionBody">
      {/* Prompt */}
      <div className="drawerAiPrompt">
        <div className="drawerLabel" style={{ opacity: 0.8 }}>
          Prompt (optional)
        </div>
        <input
          className="drawerField"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder='e.g. "Make it more technical" or "Shorter and punchier"'
          disabled={aiMutation.isPending || isSaving || isDeleting}
          style={{ width: "100%" }}
        />
      </div>

      {/* Actions carousel */}
      <div
        ref={aiCarouselRef}
        className={`drawerAiCarousel ${aiAutoScrollPaused ? "isPaused" : "isAuto"}`}
        role="group"
        aria-label="AI actions"
        onPointerDown={(e) => {
          if (isPointerOnHorizontalScrollbar(e)) {
            aiScrollbarDraggingRef.current = true;
            setAiAutoScrollPaused(true);
          }
        }}
        onPointerUp={() => {
          if (aiScrollbarDraggingRef.current) {
            aiScrollbarDraggingRef.current = false;
            pauseAiAutoScroll(900);
          }
        }}
        onPointerCancel={() => {
          aiScrollbarDraggingRef.current = false;
          pauseAiAutoScroll(900);
        }}
        onScroll={() => {
          if (aiScrollbarDraggingRef.current) {
            pauseAiAutoScroll(900);
          }
        }}
      >
        <div className="drawerAiCarouselTrack">
          <button
            type="button"
            className="drawerAiChip"
            onClick={() => {
              setAiOpen(true);
              setAiAction("improve_notes");
              setShowAiPanel(true);
              setAiPanelLoading(true);
              setAiOutput("");
              aiMutation.mutate("improve_notes");
            }}
            disabled={aiMutation.isPending || isSaving || isDeleting}
          >
            Improve Notes
          </button>

          <button
            type="button"
            className="drawerAiChip"
            onClick={() => {
              setAiOpen(true);
              setAiAction("resume_bullet");
              setShowAiPanel(true);
              setAiPanelLoading(true);
              setAiOutput("");
              aiMutation.mutate("resume_bullet");
            }}
            disabled={aiMutation.isPending || isSaving || isDeleting}
          >
            Resume Bullet
          </button>

          <button
            type="button"
            className="drawerAiChip"
            onClick={() => {
              setAiOpen(true);
              setAiAction("followup_email");
              setShowAiPanel(true);
              setAiPanelLoading(true);
              setAiOutput("");
              aiMutation.mutate("followup_email");
            }}
            disabled={aiMutation.isPending || isSaving || isDeleting}
          >
            Follow-up Email
          </button>

          <button
            type="button"
            className="drawerAiChip"
            onClick={() => {
              setAiOpen(true);
              setAiAction("interview_tips");
              setShowAiPanel(true);
              setAiPanelLoading(true);
              setAiOutput("");
              aiMutation.mutate("interview_tips");
            }}
            disabled={aiMutation.isPending || isSaving || isDeleting}
          >
            Interview Tips
          </button>

          <button
            type="button"
            className="drawerAiChip"
            onClick={() => {
              setAiOpen(true);
              setAiAction("cover_letter");
              setShowAiPanel(true);
              setAiPanelLoading(true);
              setAiOutput("");
              aiMutation.mutate("cover_letter");
            }}
            disabled={aiMutation.isPending || isSaving || isDeleting}
          >
            Cover Letter
          </button>
        </div>
      </div>

      {/* History */}
      <div className="drawerAiHistory">
        <div className="drawerLabel" style={{ marginTop: 12 }}>
          Recent AI generations
        </div>

        {aiHistoryLoading ? (
          <div className="aiHistoryLoading">Loading...</div>
        ) : aiHistory.length === 0 ? (
          <div className="aiHistoryEmpty">No history yet</div>
        ) : (
          <div className="aiHistoryList">
            {aiHistory.map((item) => (
              <button
                key={item.id}
                className="aiHistoryItem"
                onClick={() => {
                  setAiOutput(item.output);
                  setShowAiPanel(true);
                }}
              >
                <div className="aiHistoryAction">{item.action.replace("_", " ")}</div>
                <div className="aiHistoryDate">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )}
</div>

                  <div className="drawerFooter">

  <button className="drawerBtn primary" onClick={saveDrawer} disabled={isSaving || isDeleting}>
  {isSaving ? "Saving..." : "Save"}
</button>

<button className="drawerBtn ghost" onClick={closeDrawer} disabled={isSaving || isDeleting}>
  Cancel
</button>


  <div style={{ flex: 1 }} />

  <button
    onClick={() => selected && deleteApplication(selected.id)}
    disabled={isSaving || isDeleting}
    className="dangerBtn"
  >
    {isDeleting ? "Deleting..." : "Delete"}
  </button>
  </div>
  

                  </div>
                </div>
              </div>
          ) : null}
          {showAiPanel && (
  <div className="aiPanelOverlay" onClick={() => setShowAiPanel(false)}>
    <div className="aiPanel" onClick={(e) => e.stopPropagation()}>
      <div className="aiPanelHeader">
        <div>{aiPanelLoading ? "Generating..." : "Generated"}</div>
        <button onClick={() => setShowAiPanel(false)}>✕</button>
      </div>

      <div className="aiPanelBody">
        {aiPanelLoading ? (
    <div className="aiSkeleton">
      <div className="aiSkelLine" />
      <div className="aiSkelLine" />
      <div className="aiSkelLine" />
      <div className="aiSkelLine short" />
    </div>
  ) : (
    <pre>{aiOutput}</pre>
  )}
      </div>

      {!aiPanelLoading && (
        <div className="aiPanelFooter">
  <div className="aiPanelControls">
    <div className="aiToggleGroup" role="group" aria-label="Insert mode">
    </div>

    <label className="aiCheck">
      <input
        type="checkbox"
        checked={aiAutoSaveAfterInsert}
        onChange={(e) => setAiAutoSaveAfterInsert(e.target.checked)}
      />
      Auto-save
    </label>
  </div>

  <button
  type="button"
  onClick={insertAiIntoNotes}
  disabled={!aiOutput || aiPanelLoading || isSaving || isDeleting}
>
  Insert into Notes
</button>

<button
  onClick={regenerateAi}
  disabled={aiMutation.isPending || !lastAiAction}
>
  Regenerate
</button>

<button
  type="button"
  onClick={replaceNotesWithAi}
  disabled={!aiOutput || aiPanelLoading || isSaving || isDeleting}
>
  Replace Notes
</button>
</div>
      )}
    </div>
  </div>
)}

</div>

        </div>
      </div>
   
  );
}

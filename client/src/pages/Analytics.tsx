import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import "./Analytics.css";
import { useTheme } from "../lib/useTheme";
import { useNavigate } from "react-router-dom";

type Stage = "SAVED" | "APPLIED" | "INTERVIEW" | "FINAL" | "OFFER" | "REJECTED";

type AnalyticsSummary = {
  total: number;
  byStage: Record<Stage, number>;
  byDay: Record<string, number>;
  interviews?: number;
  offers?: number;
  acceptanceRate?: number;
};

function formatStageLabel(stage: Stage) {
  switch (stage) {
    case "SAVED":
      return "Saved";
    case "APPLIED":
      return "Applied";
    case "INTERVIEW":
      return "Interview";
    case "FINAL":
      return "Final";
    case "OFFER":
      return "Offer";
    case "REJECTED":
      return "Rejected";
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type RangeKey = "7d" | "30d" | "90d" | "all";

function daysFromRange(r: RangeKey): number | null {
  if (r === "7d") return 7;
  if (r === "30d") return 30;
  if (r === "90d") return 90;
  return null;
}

// Safe parse "YYYY-MM-DD" into a Date at local noon (avoids timezone edge cases)
function parseYMD(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

function yyyMmDd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatYMDShort(ymd: string) {
  // "2026-02-21" -> "Feb 21"
  const d = parseYMD(ymd);
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function pickMostCommonStage(byStage: Record<Stage, number>): { stage: Stage; count: number } | null {
  const entries = (Object.entries(byStage) as [Stage, number][])
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  if (!entries.length) return null;
  const [stage, count] = entries[0];
  if (!count) return null;
  return { stage, count };
}

function computeStreakDays(entries: { date: string; value: number }[]) {
  // assumes entries are sorted ascending by date
  const set = new Set(entries.filter(e => e.value > 0).map(e => e.date));
  if (set.size === 0) return 0;

  // streak ending today (local date)
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let streak = 0;
  for (;;) {
    const ymd = yyyMmDd(today);
    if (!set.has(ymd)) break;
    streak += 1;
    today.setDate(today.getDate() - 1);
  }
  return streak;
}

export default function Analytics() {
  const navigate = useNavigate();
  type RangeKey = "7d" | "30d" | "90d" | "all";
  const [range, setRange] = useState<RangeKey>("30d");

  const { theme, toggle } = useTheme();

  

  const { data, isLoading, isError } = useQuery({
  queryKey: ["analytics-summary", range],
  queryFn: async () => {
    const res = await api.get(`/analytics/summary?range=${range}`);
    return res.data as AnalyticsSummary;
  },
  staleTime: 10_000,
});

  const summary: AnalyticsSummary = data ?? {
    total: 0,
    byStage: {
      SAVED: 0,
      APPLIED: 0,
      INTERVIEW: 0,
      FINAL: 0,
      OFFER: 0,
      REJECTED: 0,
    },
    byDay: {},
  };

  // Filter byDay by range (client-side)
  const filteredByDay = useMemo(() => {
    const entries = Object.entries(summary.byDay)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    const days = daysFromRange(range);
    if (!days) return entries;

    const cutoff = new Date();
    cutoff.setHours(12, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));

    return entries.filter((d) => parseYMD(d.date) >= cutoff);
  }, [summary.byDay, range]);

  // Total within selected range (based on byDay)
  const rangeTotal = useMemo(() => {
    return filteredByDay.reduce((sum, d) => sum + (d.value ?? 0), 0);
  }, [filteredByDay]);

  const kpis = useMemo(() => {
  const applied = summary.byStage.APPLIED ?? 0;
  const interviewing = (summary.byStage.INTERVIEW ?? 0) + (summary.byStage.FINAL ?? 0);
  const offers = summary.byStage.OFFER ?? 0;

  const interviewRate = applied > 0 ? interviewing / applied : 0;
  const offerRateFromInterview = interviewing > 0 ? offers / interviewing : 0;
  const offerRateOverall = applied > 0 ? offers / applied : 0;

  function pct(n: number) {
    return `${Math.round(n * 100)}%`;
  }

  return [
    { label: "Total", value: summary.total },
    { label: "Applied", value: applied },
    { label: "Interviewing", value: interviewing },
    { label: "Offers", value: offers },
    { label: "Interview rate", value: pct(interviewRate) },
    { label: "Offer rate", value: pct(offerRateOverall) },
    { label: "Offer / Interview", value: pct(offerRateFromInterview) },
  ];
}, [summary]);

  // Stage rows (all-time, until backend supports per-stage range)
  const stageRows = useMemo(() => {
    const entries = (Object.keys(summary.byStage) as Stage[]).map((s) => ({
      stage: s,
      label: formatStageLabel(s),
      value: summary.byStage[s] ?? 0,
    }));
    return entries;
  }, [summary.byStage]);

  const series = useMemo(() => {
    const days = filteredByDay;
    const max = days.reduce((m, d) => Math.max(m, d.value), 0);
    return { days, max };
  }, [filteredByDay]);

    const pipelineHealth = useMemo(() => {
    const days = daysFromRange(range); // 7/30/90/null (all)
    const totalInRange = range === "all" ? summary.total : rangeTotal;

    // avg per week
    const weeks = days ? days / 7 : Math.max(1, Math.ceil(Object.keys(summary.byDay).length / 7));
    const perWeek = weeks ? totalInRange / weeks : totalInRange;

    // best day
    const best = filteredByDay.reduce(
      (acc, d) => (d.value > acc.value ? d : acc),
      { date: "", value: 0 }
    );

    // most common stage (all time for now)
    const common = pickMostCommonStage(summary.byStage);

    // streak (based on filteredByDay)
    const streak = computeStreakDays(filteredByDay);

    return {
      totalInRange,
      perWeek,
      bestDay: best.date ? { date: best.date, value: best.value } : null,
      common,
      streak,
    };
  }, [range, summary.total, summary.byDay, summary.byStage, rangeTotal, filteredByDay]);

  const quickInsights = useMemo(() => {
    const lines: string[] = [];

    if (range === "all") {
      lines.push(`You have ${plural(summary.total, "application")} in total.`);
    } else {
      lines.push(`You added ${plural(pipelineHealth.totalInRange, "application")} in the last ${range.toUpperCase()}.`);
    }

    if (pipelineHealth.bestDay) {
      lines.push(
        `Most active day: ${pipelineHealth.bestDay.date} (${plural(pipelineHealth.bestDay.value, "application")}).`
      );
    }

    if (pipelineHealth.common) {
      lines.push(
        `Most of your pipeline is in ${formatStageLabel(pipelineHealth.common.stage)} (${pipelineHealth.common.count}).`
      );
    }

    if (pipelineHealth.streak > 0) {
      lines.push(`Current streak: ${plural(pipelineHealth.streak, "day")} with at least 1 application.`);
    } else {
      lines.push(`No current streak yet — add one application today to start one.`);
    }

    // tiny hint for the empty chart
    if (series.days.length === 0) {
      lines.push(`No time-series data for this range yet.`);
    }

    return lines;
  }, [range, summary.total, pipelineHealth, series.days.length]);

  if (isLoading) {
    return (
      <div className="analyticsShell">
        <div className="analyticsInner">
          <div className="analyticsHeaderTop">
  <div>
    <div className="analyticsTitle">Analytics</div>
    <div className="analyticsSub">Pipeline snapshot based on your applications.</div>
  </div>

  {/* ✅ Toggle BEFORE 7D (same row as range pills) */}
  <div className="rangeRow">
    <button
      type="button"
      className="analyticsIconBtn"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>

    {(["7d", "30d", "90d", "all"] as const).map((r) => (
      <button
        key={r}
        type="button"
        className={`rangePill ${range === r ? "isActive" : ""}`}
        onClick={() => setRange(r)}
      >
        {r === "7d" ? "7D" : r === "30d" ? "30D" : r === "90d" ? "90D" : "ALL"}
      </button>
    ))}
  </div>
</div>

          <div className="analyticsTwoCol">
            <div className="analyticsCard" style={{ minHeight: 260 }} />
            <div className="analyticsCard" style={{ minHeight: 260 }} />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="analyticsShell">
        <div className="analyticsInner">
          <div className="analyticsHeader">
            <div className="analyticsTitle">Analytics</div>
            <div className="analyticsSub">Couldn’t load analytics. Try again.</div>
          </div>

          <div className="analyticsCard">
            <div style={{ opacity: 0.8 }}>Backend endpoint missing?</div>
            <div style={{ marginTop: 10, opacity: 0.7 }}>
              We’ll add <code>/analytics/summary</code> next.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analyticsShell">
      <div className="analyticsInner">
        {/* ✅ UPDATED HEADER (title + subtitle + range pills) */}
        <div className="analyticsHeader">
  <div className="analyticsHeaderTop">
    {/* LEFT */}
    <div className="analyticsHeaderLeft">
      <div className="analyticsTitle">Analytics</div>
      <div className="analyticsSub">
        Pipeline snapshot based on your applications.
      </div>
    </div>

    {/* RIGHT: Toggle + Pills (same row, right aligned) */}
    <div className="analyticsHeaderRight">
      <button
        className="analyticsIconBtn"
        onClick={toggle}
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "🌙" : "☀️"}
      </button>

      {(["7d", "30d", "90d", "all"] as const).map((r) => (
        <button
          key={r}
          type="button"
          className={`rangePill ${range === r ? "isActive" : ""}`}
          onClick={() => setRange(r)}
        >
          {r === "7d" ? "7D" : r === "30d" ? "30D" : r === "90d" ? "90D" : "ALL"}
        </button>
      ))}

      <button className="rangePill" onClick={() => navigate("/board")}>
  ← Board
</button>
    </div>
  </div>
</div>
        <div className="analyticsGrid">
          {kpis.map((k) => (
            <div key={k.label} className="analyticsCard">
              <div className="analyticsKpiLabel">{k.label}</div>
              <div className="analyticsKpiValue">{k.value}</div>
            </div>
          ))}
        </div>

                {/* Pipeline health row */}
        <div className="healthGrid">
          <div className="analyticsCard">
            <div className="analyticsKpiLabel">Avg / week</div>
            <div className="analyticsKpiValue">{pipelineHealth.perWeek.toFixed(1)}</div>
            <div className="analyticsHint">Based on selected range</div>
          </div>

          <div className="analyticsCard">
            <div className="analyticsKpiLabel">Best day</div>
            <div className="analyticsKpiValue">
              {pipelineHealth.bestDay ? formatYMDShort(pipelineHealth.bestDay.date) : "—"}
            </div>
            <div className="analyticsHint">
              {pipelineHealth.bestDay ? `${pipelineHealth.bestDay.value} added` : "No data yet"}
            </div>
          </div>

          <div className="analyticsCard">
            <div className="analyticsKpiLabel">Top stage</div>
            <div className="analyticsKpiValue">
              {pipelineHealth.common ? formatStageLabel(pipelineHealth.common.stage) : "—"}
            </div>
            <div className="analyticsHint">
              {pipelineHealth.common ? `${pipelineHealth.common.count} items` : "No data yet"}
            </div>
          </div>

          <div className="analyticsCard">
            <div className="analyticsKpiLabel">Streak</div>
            <div className="analyticsKpiValue">{pipelineHealth.streak}</div>
            <div className="analyticsHint">days in a row</div>
          </div>
        </div>

        {/* Quick insights */}
        <div className="analyticsCard insightsCard">
          <div className="analyticsCardTitle">Quick insights</div>
          <ul className="insightsList">
            {quickInsights.map((t, i) => (
              <li key={i} className="insightItem">
                <span className="insightDot" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="analyticsTwoCol">
          {/* Stage distribution (all time for now) */}
          <div className="analyticsCard">
            <div className="analyticsCardTitle">
              Stage distribution <span style={{ opacity: 0.6, fontWeight: 600 }}>(all time)</span>
            </div>

            <div className="barList">
              {stageRows.map((r) => {
                const pct = summary.total ? (r.value / summary.total) * 100 : 0;
                return (
                  <div key={r.stage} className="barRow">
                    <div className="barLabel">{r.label}</div>
                    <div className="barTrack">
                      <div className="barFill" style={{ width: `${clamp(pct, 0, 100)}%` }} />
                    </div>
                    <div className="barValue">{r.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Over time (range-based) */}
          <div className="analyticsCard">
            <div className="analyticsCardTitle">Applications over time</div>

            {series.days.length === 0 ? (
              <div className="analyticsEmpty">
                No time-series data for this range yet.
              </div>
            ) : (
              <div className="sparkWrap">
                {series.days.map((d) => {
                  const h = series.max ? (d.value / series.max) * 100 : 0;
                  return (
                    <div key={d.date} className="sparkCol" title={`${d.date}: ${d.value}`}>
                      <div className="sparkBar" style={{ height: `${clamp(h, 6, 100)}%` }} />
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
              Showing <b>{range === "all" ? "all time" : range}</b> totals.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sb } from "../lib/supabase";
import type { Investigation, Verdict, QueryRun } from "../lib/types";
import { VerdictCard } from "../components/VerdictCard";
import { SqlBlock } from "../components/SqlBlock";
import { format, formatDistanceToNow } from "date-fns";
import { CAUSE_CONFIG } from "../lib/types";
import { ArrowLeft, Check, Loader2, Clock, AlertTriangle, GitBranch, AlertOctagon, CheckCircle2, HelpCircle, Database } from "lucide-react";
import type { CauseLabel } from "../lib/types";

const CAUSE_STYLE: Record<string, { color: string }> = {
  flag:         { color: "#ff5470" },
  deploy:       { color: "#ffb547" },
  both:         { color: "#ff7b3d" },
  neither:      { color: "#2ecc8a" },
  inconclusive: { color: "#6b7280" },
};

const CAUSE_ICON_MAP: Record<CauseLabel, React.FC<{ size?: number; strokeWidth?: number }>> = {
  flag:         AlertTriangle,
  deploy:       GitBranch,
  both:         AlertOctagon,
  neither:      CheckCircle2,
  inconclusive: HelpCircle,
};

function CauseIcon({ label, size = 18 }: { label: CauseLabel; size?: number }) {
  const Icon = CAUSE_ICON_MAP[label] ?? HelpCircle;
  return <Icon size={size} strokeWidth={2} />;
}

function TimelineStep({ label, time, done, active }: { label: string; time: string | null; done: boolean; active?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start", position: "relative" }}>
      <div style={{ flexShrink: 0, position: "relative", zIndex: 2 }}>
        <div
          style={{
            width: 30, height: 30,
            borderRadius: "50%",
            background: done
              ? "linear-gradient(135deg, #7c6dff, #5b4eda)"
              : active
              ? "rgba(78,168,255,0.12)"
              : "rgba(255,255,255,0.04)",
            border: done
              ? "2px solid rgba(124,109,255,0.5)"
              : active
              ? "2px solid rgba(78,168,255,0.35)"
              : "2px solid rgba(255,255,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: done ? "0 0 14px rgba(124,109,255,0.3)" : "none",
            color: done ? "#fff" : active ? "#4ea8ff" : "#3a3a5a",
          }}
        >
          {done
            ? <Check size={13} strokeWidth={2.5} />
            : active
            ? <Loader2 size={12} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
            : <Clock size={12} strokeWidth={1.8} />
          }
        </div>
      </div>
      <div style={{ paddingTop: 4, paddingBottom: 24 }}>
        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: done ? "#f0f0fa" : "#4a4a7a" }}>{label}</div>
        {time ? (
          <div style={{ fontSize: "0.72rem", color: "#4a4a7a", marginTop: 2, fontFamily: "var(--font-mono)" }}>
            {format(new Date(time), "MMM d, HH:mm:ss")}
          </div>
        ) : (
          <div style={{ fontSize: "0.72rem", color: "#2a2a4a", marginTop: 2 }}>—</div>
        )}
      </div>
    </div>
  );
}

export function InvestigationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [queryRuns, setQueryRuns] = useState<QueryRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState<{ key: string; data: string | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      sb.from("investigations").select("*").eq("id", id).single(),
      sb.from("verdicts").select("*").eq("investigation_id", id).single(),
      sb.from("query_runs").select("*").eq("investigation_id", id).order("executed_at"),
    ]).then(([invRes, verdictRes, queryRes]) => {
      if (invRes.data) setInvestigation(invRes.data as Investigation);
      if (verdictRes.data) setVerdict(verdictRes.data as Verdict);
      if (queryRes.data) setQueryRuns(queryRes.data as QueryRun[]);
      setLoading(false);
    });
  }, [id]);

  const handleViewResult = async (storageKey: string) => {
    setResultModal({ key: storageKey, data: null });
    const { data, error } = await sb.storage.from("investigations").download(storageKey);
    if (data && !error) {
      const text = await data.text();
      try { setResultModal({ key: storageKey, data: JSON.stringify(JSON.parse(text), null, 2) }); }
      catch { setResultModal({ key: storageKey, data: text }); }
    } else {
      setResultModal({ key: storageKey, data: `Error: ${error?.message ?? "Unknown"}` });
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        {[220, 120, 340].map((h, i) => <div key={i} className="shimmer" style={{ height: h, borderRadius: 14 }} />)}
      </div>
    );
  }

  if (!investigation) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <p style={{ color: "#5a5a8a", fontSize: "1.1rem", marginBottom: 16 }}>Investigation not found</p>
        <button onClick={() => navigate("/dashboard")} className="btn-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={14} strokeWidth={2} /> Dashboard
        </button>
      </div>
    );
  }

  const verdictStyle = verdict ? CAUSE_STYLE[verdict.cause_label] : null;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {/* ── Back ── */}
      <button
        onClick={() => navigate("/dashboard")}
        className="btn-ghost animate-fade-in"
        style={{ marginBottom: 20, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}
      >
        <ArrowLeft size={14} strokeWidth={2} /> Dashboard
      </button>

      {/* ── Hero Header ── */}
      <div
        className="glass animate-slide-down"
        style={{
          padding: "24px 28px",
          marginBottom: 18,
          borderColor: verdictStyle ? `rgba(${verdictStyle.color.replace("#", "")},0.15)` : undefined,
          background: verdict
            ? `linear-gradient(135deg, ${CAUSE_STYLE[verdict.cause_label]?.color ?? "#22223a"}18 0%, rgba(14,14,24,0.9) 100%)`
            : undefined,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {verdict && (
          <div style={{
            position: "absolute", top: 0, right: 0, width: 200, height: 200,
            background: `radial-gradient(circle, ${verdictStyle?.color}18 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />
        )}

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              {verdict && (
                <div style={{ color: verdictStyle?.color, opacity: 0.9 }}>
                  <CauseIcon label={verdict.cause_label} size={22} />
                </div>
              )}
              <h1 style={{ fontSize: "1.6rem", fontWeight: 900, color: "#f0f0fa", letterSpacing: "-0.025em", fontFamily: "var(--font-mono)" }}>
                {investigation.identifier}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#6060a0", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
                {investigation.trigger_type.replace("_", " ")}
              </span>
              <span style={{ color: "#2a2a4a" }}>·</span>
              <span style={{ fontSize: "0.78rem", color: "#4a4a7a" }}>
                {formatDistanceToNow(new Date(investigation.enqueued_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <span className={`badge badge-${investigation.status}`} style={{ flexShrink: 0 }}>
            {investigation.status}
          </span>
        </div>
      </div>

      {/* ── Timeline + Verdict ── */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, marginBottom: 18 }}>
        {/* Timeline */}
        <div className="glass animate-slide-up" style={{ padding: "20px 18px", position: "relative" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3a3a6a", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 16 }}>
            Timeline
          </div>
          <div style={{ position: "absolute", left: 33, top: 56, bottom: 24, width: 1, background: "linear-gradient(to bottom, rgba(124,109,255,0.3), transparent)" }} />
          <TimelineStep label="Occurred"  time={investigation.occurred_at}  done />
          <TimelineStep label="Enqueued"  time={investigation.enqueued_at}  done />
          <TimelineStep label="Started"   time={investigation.started_at}   done={!!investigation.started_at} active={investigation.status === "running"} />
          <TimelineStep label="Completed" time={investigation.completed_at} done={!!investigation.completed_at} />
        </div>

        {/* Verdict */}
        <div className="animate-slide-up delay-1">
          {verdict ? (
            <VerdictCard verdict={verdict} identifier={investigation.identifier} />
          ) : investigation.status === "failed" ? (
            <div className="glass" style={{ padding: "24px", borderColor: "rgba(255,84,112,0.2)", height: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff5470", fontWeight: 700, marginBottom: 8 }}>
                <AlertTriangle size={16} strokeWidth={2} /> Analysis Failed
              </div>
              <pre style={{ fontSize: "0.78rem", color: "#6060a0", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap" }}>
                {investigation.error_message}
              </pre>
            </div>
          ) : (
            <div className="glass" style={{ padding: "48px", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <Loader2 size={36} color="#4ea8ff" strokeWidth={1.5} style={{ animation: "spin 1.5s linear infinite", opacity: 0.7 }} />
              <p style={{ color: "#4a4a7a", fontSize: "0.88rem" }}>Analysis in progress…</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SQL Evidence ── */}
      {queryRuns.length > 0 && (
        <div className="animate-slide-up delay-2">
          {/* Coral callout — explains what Coral did */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(124,109,255,0.06)",
              border: "1px solid rgba(124,109,255,0.15)",
              marginBottom: 14,
            }}
          >
            <Database size={13} color="#7c6dff" strokeWidth={2} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.75rem", color: "#7070a0", lineHeight: 1.4 }}>
              All {queryRuns.length} {queryRuns.length === 1 ? "query" : "queries"} ran as federated SQL through Coral's local engine across{" "}
              {verdict?.sources_used.length ?? 0} source{(verdict?.sources_used.length ?? 0) !== 1 ? "s" : ""} — no per-API rate limits, no separate clients.
            </span>
            {/* Sources chips */}
            {verdict?.sources_used.map((s) => (
              <span
                key={s}
                style={{
                  fontSize: "0.65rem",
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: "rgba(124,109,255,0.1)",
                  border: "1px solid rgba(124,109,255,0.2)",
                  color: "#a095ff",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}
              >
                {s}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3a3a6a", letterSpacing: "0.09em", textTransform: "uppercase" }}>
              SQL Evidence
            </div>
            <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6, background: "rgba(124,109,255,0.1)", border: "1px solid rgba(124,109,255,0.2)", color: "#a095ff", fontFamily: "var(--font-mono)" }}>
              {queryRuns.length} {queryRuns.length === 1 ? "query" : "queries"}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queryRuns.map((qr, i) => (
              <SqlBlock
                key={qr.id}
                query={qr}
                index={i}
                onViewResult={qr.result_storage_key ? () => handleViewResult(qr.result_storage_key!) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Result Modal ── */}
      {resultModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setResultModal(null); }}
        >
          <div className="glass-bright animate-scale-in" style={{ width: "90%", maxWidth: 700, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6, background: "rgba(46,204,138,0.1)", border: "1px solid rgba(46,204,138,0.2)", color: "#2ecc8a", fontFamily: "var(--font-mono)" }}>
                  JSON
                </span>
                <span style={{ fontSize: "0.8rem", color: "#5a5a8a", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
                  {resultModal.key}
                </span>
              </div>
              <button onClick={() => setResultModal(null)} style={{ background: "none", border: "none", color: "#4a4a7a", cursor: "pointer", fontSize: 18, lineHeight: 1, display: "flex", alignItems: "center" }}>
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
              {resultModal.data == null ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Loader2 size={24} color="#4a4a7a" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
                </div>
              ) : (
                <pre style={{ fontSize: "0.78rem", fontFamily: "var(--font-mono)", color: "#9eaabe", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {resultModal.data}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

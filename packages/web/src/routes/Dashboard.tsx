import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, CheckCircle2, Clock, Flag,
  AlertTriangle, GitBranch, AlertOctagon, HelpCircle,
  Terminal, Zap, Globe, Loader2, Copy, Check
} from "lucide-react";
import { sb, API_URL } from "../lib/supabase";
import { subscribeToVerdicts, subscribeToInvestigations } from "../lib/realtime";
import type { InvestigationWithVerdict, Verdict, Investigation, CauseLabel } from "../lib/types";
import { MetricCard } from "../components/MetricCard";
import { VerdictCard } from "../components/VerdictCard";
import { formatDistanceToNow } from "date-fns";

const FILTERS: { key: CauseLabel | "all"; label: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }[] = [
  { key: "all",          label: "All",          Icon: Globe },
  { key: "flag",         label: "Flag",         Icon: AlertTriangle },
  { key: "deploy",       label: "Deploy",       Icon: GitBranch },
  { key: "both",         label: "Both",         Icon: AlertOctagon },
  { key: "neither",      label: "Neither",      Icon: CheckCircle2 },
  { key: "inconclusive", label: "Inconclusive", Icon: HelpCircle },
];

function EmptyState({ onTrigger }: { onTrigger: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 20px",
        gap: 20,
        borderRadius: 16,
        border: "1px dashed rgba(124,109,255,0.2)",
        background: "rgba(124,109,255,0.02)",
      }}
      className="animate-border-glow"
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: "linear-gradient(135deg, rgba(124,109,255,0.12) 0%, rgba(255,84,112,0.06) 100%)",
          border: "1px solid rgba(124,109,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 40px rgba(124,109,255,0.12)",
          color: "#7c6dff",
        }}
        className="animate-float"
      >
        <Zap size={30} strokeWidth={1.8} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "1rem", fontWeight: 700, color: "#9090b8", marginBottom: 6 }}>
          No investigations yet
        </p>
        <p style={{ fontSize: "0.82rem", color: "#4a4a7a", lineHeight: 1.55, maxWidth: 300 }}>
          Send a webhook from your terminal to watch the Gemini agent correlate your sources live
        </p>
      </div>
      <button className="btn-primary" onClick={onTrigger}>
        <Terminal size={14} strokeWidth={2.2} /> Simulate Webhook
      </button>
    </div>
  );
}

function RunningRow({ identifier, status, enqueuedAt }: { identifier: string; status: string; enqueuedAt: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 20px",
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(22,22,42,0.75) 0%, rgba(14,14,26,0.85) 100%)",
        border: "1px solid rgba(78,168,255,0.14)",
        boxShadow: "0 0 20px rgba(78,168,255,0.05)",
      }}
    >
      {/* Pulsing dot */}
      <div
        style={{ width: 9, height: 9, borderRadius: "50%", background: "#4ea8ff", boxShadow: "0 0 12px rgba(78,168,255,0.7)", flexShrink: 0 }}
        className="animate-pulse-dot"
      />

      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: "#f0f0fa", fontSize: "0.9rem", fontFamily: "var(--font-mono)", letterSpacing: "-0.01em" }}>
            {identifier}
          </span>
          <span className={`badge badge-${status}`}>{status}</span>
        </div>
        <p style={{ fontSize: "0.78rem", color: "#4a4a7a" }}>
          Triggered {formatDistanceToNow(new Date(enqueuedAt), { addSuffix: true })} · Agent querying sources
        </p>
      </div>

      {/* Spinner */}
      <Loader2 size={16} color="#4ea8ff" strokeWidth={2} style={{ animation: "spin 1s linear infinite", flexShrink: 0, opacity: 0.7 }} />
    </div>
  );
}

const LD_CURL = `curl -X POST http://localhost:3001/webhooks/launchdarkly \\
  -H "Content-Type: application/json" \\
  -d '{"kind":"flag","name":"checkout-v2","date":'$(date +%s000)'}'`;

const VERCEL_CURL = `curl -X POST http://localhost:3001/webhooks/vercel \\
  -H "Content-Type: application/json" \\
  -d '{"type":"deployment","payload":{"deployment":{"name":"api-refactor","url":"https://api.vercel.app"}}}'`;

export function Dashboard() {
  const navigate = useNavigate();
  const [investigations, setInvestigations] = useState<InvestigationWithVerdict[]>([]);
  const [filter, setFilter] = useState<CauseLabel | "all">("all");
  const [loading, setLoading] = useState(true);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const fetchData = useCallback(async () => {
    const { data } = await sb
      .from("investigations")
      .select("*, verdicts(*)")
      .order("enqueued_at", { ascending: false })
      .limit(50);
    if (data) setInvestigations(data as InvestigationWithVerdict[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const unsubV = subscribeToVerdicts((verdict: Verdict) => {
      setInvestigations((prev) =>
        prev.map((inv) =>
          inv.id === verdict.investigation_id
            ? { ...inv, verdicts: [verdict], status: "complete" }
            : inv
        )
      );
      setNewIds((prev) => new Set(prev).add(verdict.investigation_id));
      setTimeout(() => {
        setNewIds((prev) => { const n = new Set(prev); n.delete(verdict.investigation_id); return n; });
      }, 4000);
    });

    const unsubI = subscribeToInvestigations((inv: Investigation) => {
      setInvestigations((prev) => {
        const exists = prev.find((p) => p.id === inv.id);
        return exists
          ? prev.map((p) => (p.id === inv.id ? { ...p, ...inv } : p))
          : [{ ...inv, verdicts: [] } as InvestigationWithVerdict, ...prev];
      });
    });

    return () => { unsubV(); unsubI(); };
  }, []);

  const total      = investigations.length;
  const completed  = investigations.filter((i) => i.status === "complete").length;
  const running    = investigations.filter((i) => ["running", "pending"].includes(i.status)).length;
  const flagIssues = investigations.filter(
    (i) => i.verdicts[0]?.cause_label === "flag" || i.verdicts[0]?.cause_label === "both"
  ).length;

  const filtered = filter === "all"
    ? investigations
    : investigations.filter((i) => i.verdicts[0]?.cause_label === filter);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      {/* ── Header ── */}
      <div className="animate-slide-down" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f0f0fa", letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 6 }}>
            Incident Dashboard
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#4a4a7a", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-flex", width: 6, height: 6, borderRadius: "50%", background: "#2ecc8a", boxShadow: "0 0 6px rgba(46,204,138,0.7)" }} className="animate-pulse-dot" />
            AI-powered blast radius analysis · live via Supabase Realtime
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <button className="btn-primary" onClick={() => setShowWebhookModal(true)}>
            <Terminal size={14} strokeWidth={2.2} /> Simulate Webhook
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Total Analyses" value={total}      icon={<BarChart2   size={15} strokeWidth={2} />} delay={0}   />
        <MetricCard label="Completed"      value={completed}  icon={<CheckCircle2 size={15} strokeWidth={2} />} colorVar="#2ecc8a" glowColor="46,204,138"  delay={60}  />
        <MetricCard label="In Progress"    value={running}    icon={<Clock        size={15} strokeWidth={2} />} colorVar="#ffb547" glowColor="255,181,71"  delay={120} />
        <MetricCard label="Flag Issues"    value={flagIssues} icon={<Flag         size={15} strokeWidth={2} />} colorVar="#ff5470" glowColor="255,84,112"  delay={180} />
      </div>

      {/* ── Filter bar ── */}
      <div style={{ marginBottom: 20 }}>
        <div className="segmented-control">
          {FILTERS.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={filter === key ? "active" : ""}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <Icon size={12} strokeWidth={2.2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Count row ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: "0.78rem", color: "#4a4a7a" }}>
          {filtered.length === 0 ? "No results" : `${filtered.length} investigation${filtered.length !== 1 ? "s" : ""}`}
          {filter !== "all" && (
            <span style={{ color: "#5a5a8a" }}>
              {" "}· filtered by <span style={{ color: "#a095ff" }}>{filter}</span>
            </span>
          )}
        </span>
        {filter !== "all" && (
          <button
            onClick={() => setFilter("all")}
            style={{ fontSize: "0.72rem", color: "#5a5a8a", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", borderRadius: 4, transition: "color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#a095ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "#5a5a8a"; }}
          >
            × clear
          </button>
        )}
      </div>

      {/* ── Investigations List ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 82, borderRadius: 12 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onTrigger={() => setShowWebhookModal(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((inv, idx) => {
            const verdict = inv.verdicts[0];
            const isNew = newIds.has(inv.id);
            if (verdict) {
              return (
                <div key={inv.id} className={isNew ? "animate-slide-down" : undefined} style={{ animationDelay: `${idx * 25}ms` }}>
                  <VerdictCard
                    verdict={verdict}
                    identifier={inv.identifier}
                    triggeredAt={formatDistanceToNow(new Date(inv.enqueued_at), { addSuffix: true })}
                    compact
                    onClick={() => navigate(`/investigations/${inv.id}`)}
                  />
                </div>
              );
            }
            return <RunningRow key={inv.id} identifier={inv.identifier} status={inv.status} enqueuedAt={inv.enqueued_at} />;
          })}
        </div>
      )}

      {/* ── Webhook Modal ── */}
      {showWebhookModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowWebhookModal(false); }}
        >
          <div className="glass-bright animate-scale-in" style={{ width: "100%", maxWidth: 640, padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(124,109,255,0.12)", border: "1px solid rgba(124,109,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c6dff", boxShadow: "0 0 16px rgba(124,109,255,0.15)" }}>
                  <Terminal size={18} strokeWidth={2} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.01em", marginBottom: 2 }}>Simulate Webhook Event</h2>
                  <p style={{ fontSize: "0.78rem", color: "#4a4a7a" }}>Run these cURL commands in your terminal to trigger the live pipeline</p>
                </div>
              </div>
              <button onClick={() => setShowWebhookModal(false)} className="btn-ghost" style={{ padding: "6px 12px" }}>Close</button>
            </div>

            {/* LaunchDarkly Webhook */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Flag size={14} color="#405BFF" strokeWidth={2.5} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#c0c0e0" }}>LaunchDarkly (Flag Flip)</span>
              </div>
              <div style={{ position: "relative" }}>
                <pre style={{ margin: 0, padding: "16px 80px 16px 16px", background: "#0a0a14", border: "1px solid rgba(124,109,255,0.2)", borderRadius: 12, fontSize: "0.75rem", color: "#9eaabe", fontFamily: "var(--font-mono)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {LD_CURL}
                </pre>
                <button
                  className="btn-ghost"
                  onClick={() => handleCopy(LD_CURL, "ld")}
                  style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: "0.7rem" }}
                >
                  {copied === "ld" ? <Check size={12} color="#2ecc8a" /> : <Copy size={12} />}
                  {copied === "ld" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Vercel Webhook */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <GitBranch size={14} color="#e0e0e0" strokeWidth={2.5} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#c0c0e0" }}>Vercel (Deployment)</span>
              </div>
              <div style={{ position: "relative" }}>
                <pre style={{ margin: 0, padding: "16px 80px 16px 16px", background: "#0a0a14", border: "1px solid rgba(124,109,255,0.2)", borderRadius: 12, fontSize: "0.75rem", color: "#9eaabe", fontFamily: "var(--font-mono)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {VERCEL_CURL}
                </pre>
                <button
                  className="btn-ghost"
                  onClick={() => handleCopy(VERCEL_CURL, "vercel")}
                  style={{ position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: "0.7rem" }}
                >
                  {copied === "vercel" ? <Check size={12} color="#2ecc8a" /> : <Copy size={12} />}
                  {copied === "vercel" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

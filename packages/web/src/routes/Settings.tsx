import React, { useEffect, useState } from "react";
import { sb, API_URL } from "../lib/supabase";
import type { Source } from "../lib/types";
import { formatDistanceToNow } from "date-fns";
import {
  Server, Radio, Flag, Bug, CheckCircle2, XCircle,
  Wifi, WifiOff, RefreshCw, Database,
} from "lucide-react";

// Source-specific icon components
function VercelIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2L2 19.5h20L12 2z" />
    </svg>
  );
}

const SOURCE_META: Record<string, { Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>; color: string; description: string }> = {
  launchdarkly: {
    Icon: Flag,
    color: "#405BFF",
    description: "Feature flag audit log & flag state",
  },
  sentry: {
    Icon: Bug,
    color: "#F55353",
    description: "Error events, issues & performance",
  },
  vercel: {
    Icon: VercelIcon,
    color: "#e0e0e0",
    description: "Deployment logs & build status",
  },
};

const STATUS_CONFIG: Record<string, { dot: string; label: string; glow: string; Icon: React.FC<{ size?: number; strokeWidth?: number }> }> = {
  healthy:      { dot: "#2ecc8a", label: "Healthy",      glow: "0 0 10px rgba(46,204,138,0.5)",  Icon: CheckCircle2 },
  degraded:     { dot: "#ffb547", label: "Degraded",     glow: "0 0 10px rgba(255,181,71,0.5)",  Icon: RefreshCw },
  error:        { dot: "#ff5470", label: "Error",        glow: "0 0 10px rgba(255,84,112,0.5)",  Icon: XCircle },
  disconnected: { dot: "#6b7280", label: "Disconnected", glow: "none",                             Icon: WifiOff },
};

// These just show configured/not-configured — no actual values exposed
const INTEGRATION_STATUS = [
  { key: "Supabase",       configured: true,  note: "Database & realtime" },
  { key: "Redis (Upstash)", configured: true,  note: "Job queue backend" },
  { key: "Gemini API",     configured: true,  note: "AI analysis engine" },
  { key: "Coral MCP",      configured: true,  note: "SQL federation layer" },
];

export function Settings() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    sb.from("sources").select("*").then(({ data }) => {
      if (data) setSources(data as Source[]);
      setLoading(false);
    });
  }, []);

  const pingApi = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch(`${API_URL}/health`);
      setPingResult(res.ok ? "ok" : "error");
    } catch {
      setPingResult("error");
    } finally {
      setPinging(false);
    }
  };

  const sectionLabel = (text: string) => (
    <div
      style={{
        fontSize: "0.65rem",
        fontWeight: 700,
        color: "#3a3a6a",
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      {/* ── Header ── */}
      <div className="animate-slide-down" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f0f0fa", letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ fontSize: "0.82rem", color: "#4a4a7a" }}>
          System health, data source status, and integration overview
        </p>
      </div>

      {/* ── API Health ── */}
      <div style={{ marginBottom: 16 }}>
        {sectionLabel("API Server")}
        <div className="glass animate-slide-up" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(124,109,255,0.1)",
                  border: "1px solid rgba(124,109,255,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#7c6dff",
                }}
              >
                <Server size={17} strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "#f0f0fa", fontSize: "0.9rem" }}>Blast Radius API</div>
                <div style={{ fontSize: "0.75rem", color: "#3a3a6a", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {API_URL}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {pingResult && (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {pingResult === "ok"
                    ? <CheckCircle2 size={14} color="#2ecc8a" strokeWidth={2} />
                    : <XCircle size={14} color="#ff5470" strokeWidth={2} />
                  }
                  <span style={{ fontSize: "0.75rem", color: pingResult === "ok" ? "#2ecc8a" : "#ff5470", fontWeight: 600 }}>
                    {pingResult === "ok" ? "Online" : "Offline"}
                  </span>
                </div>
              )}
              <button
                className="btn-ghost"
                onClick={pingApi}
                disabled={pinging}
                style={{ fontSize: "0.78rem", padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <RefreshCw size={12} strokeWidth={2} style={pinging ? { animation: "spin 1s linear infinite" } : {}} />
                {pinging ? "Pinging…" : "Ping"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Data Sources Health ── */}
      <div className="animate-slide-up delay-1" style={{ marginBottom: 16 }}>
        {sectionLabel("Data Sources")}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {loading
            ? [1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 68, borderRadius: 12 }} />)
            : sources.map((src) => {
                const meta = SOURCE_META[src.name] ?? { Icon: Database, color: "#7070a0", description: "External connector" };
                const statusCfg = STATUS_CONFIG[src.status] ?? STATUS_CONFIG.disconnected;
                const { Icon: SrcIcon } = meta;
                const { Icon: StatusIcon } = statusCfg;
                return (
                  <div
                    key={src.name}
                    className="glass"
                    style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}
                  >
                    {/* Source icon */}
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: `${meta.color}14`,
                        border: `1px solid ${meta.color}28`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                        color: meta.color,
                      }}
                    >
                      <SrcIcon size={16} strokeWidth={2} />
                    </div>

                    {/* Name + env vars */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#f0f0fa", fontSize: "0.88rem" }}>{src.display_name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#3a3a6a", marginTop: 2 }}>
                        {src.last_checked_at
                          ? `Checked ${formatDistanceToNow(new Date(src.last_checked_at), { addSuffix: true })}`
                          : "Never checked"}
                      </div>
                    </div>

                    {/* Status */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <div
                        className={src.status === "healthy" ? "animate-pulse-dot" : undefined}
                        style={{ width: 7, height: 7, borderRadius: "50%", background: statusCfg.dot, boxShadow: statusCfg.glow }}
                      />
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {React.createElement(StatusIcon as any, { size: 12, style: { color: statusCfg.dot }, strokeWidth: 2.2 })}
                      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: statusCfg.dot }}>{statusCfg.label}</span>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>

      {/* ── Integration Status (no sensitive values) ── */}
      <div className="animate-slide-up delay-2" style={{ marginBottom: 16 }}>
        {sectionLabel("Integrations Configured")}
        <div className="glass" style={{ overflow: "hidden" }}>
          {INTEGRATION_STATUS.map(({ key, configured, note }, i) => (
            <div
              key={key}
              style={{
                padding: "13px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: i < INTEGRATION_STATUS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                {configured
                  ? <CheckCircle2 size={14} color="#2ecc8a" strokeWidth={2} />
                  : <XCircle size={14} color="#ff5470" strokeWidth={2} />
                }
                <span style={{ fontWeight: 600, color: "#c0c0e0", fontSize: "0.85rem" }}>{key}</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#3a3a6a" }}>{note}</span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: configured ? "rgba(46,204,138,0.08)" : "rgba(255,84,112,0.08)",
                  border: `1px solid ${configured ? "rgba(46,204,138,0.2)" : "rgba(255,84,112,0.2)"}`,
                  color: configured ? "#2ecc8a" : "#ff5470",
                  letterSpacing: "0.04em",
                }}
              >
                {configured ? "CONFIGURED" : "MISSING"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Realtime ── */}
      <div className="glass animate-slide-up delay-3" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: 9,
            background: "rgba(46,204,138,0.08)",
            border: "1px solid rgba(46,204,138,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#2ecc8a",
          }}
        >
          <Radio size={16} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: "#f0f0fa", fontSize: "0.88rem" }}>Supabase Realtime</div>
          <div style={{ fontSize: "0.72rem", color: "#4a4a7a", marginTop: 2 }}>
            Subscribed to{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "#6060a0", fontSize: "0.68rem" }}>public.investigations</code>
            {" "}&{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "#6060a0", fontSize: "0.68rem" }}>public.verdicts</code>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <div className="animate-pulse-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#2ecc8a", boxShadow: "0 0 8px rgba(46,204,138,0.5)" }} />
          <Wifi size={13} color="#2ecc8a" strokeWidth={2} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#2ecc8a" }}>Live</span>
        </div>
      </div>
    </div>
  );
}

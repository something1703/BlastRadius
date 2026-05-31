import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import type { Source } from "../lib/types";
import { formatDistanceToNow } from "date-fns";
import { Flag, Bug, Database, CheckCircle2, XCircle, AlertTriangle, WifiOff, Network } from "lucide-react";

function VercelIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2L2 19.5h20L12 2z" />
    </svg>
  );
}

const SOURCE_META: Record<string, {
  Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;
  description: string;
}> = {
  launchdarkly: { Icon: Flag,        color: "#405BFF", description: "Feature flag audit log & flag state" },
  sentry:       { Icon: Bug,         color: "#F55353", description: "Error events, issues & performance" },
  vercel:       { Icon: VercelIcon,  color: "#e0e0e0", description: "Deployment logs & build status" },
};

const STATUS_CONFIG: Record<string, {
  dot: string;
  label: string;
  glow: string;
  Icon: React.FC<{ size?: number; strokeWidth?: number }>;
  textColor: string;
}> = {
  healthy:      { dot: "#2ecc8a", label: "Healthy",      glow: "0 0 10px rgba(46,204,138,0.5)",  Icon: CheckCircle2,   textColor: "#2ecc8a" },
  degraded:     { dot: "#ffb547", label: "Degraded",     glow: "0 0 10px rgba(255,181,71,0.5)",  Icon: AlertTriangle,  textColor: "#ffb547" },
  error:        { dot: "#ff5470", label: "Error",        glow: "0 0 10px rgba(255,84,112,0.5)",  Icon: XCircle,        textColor: "#ff5470" },
  disconnected: { dot: "#6b7280", label: "Disconnected", glow: "none",                            Icon: WifiOff,        textColor: "#6b7280" },
};

export function Sources() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.from("sources").select("*").then(({ data }) => {
      if (data) setSources(data as Source[]);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {/* ── Header ── */}
      <div className="animate-slide-down" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f0f0fa", letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 6 }}>
          Sources
        </h1>
        <p style={{ fontSize: "0.82rem", color: "#4a4a7a" }}>
          Connected data sources powering the Coral SQL federation engine
        </p>
      </div>

      {/* ── Source Cards ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 180, borderRadius: 14 }} />)}
        </div>
      ) : sources.length === 0 ? (
        <div className="glass" style={{ padding: "48px 24px", textAlign: "center", marginBottom: 20 }}>
          <p style={{ color: "#5a5a8a" }}>No sources found — run the schema migration first.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
          {sources.map((src, i) => {
            const meta = SOURCE_META[src.name] ?? { Icon: Database, color: "#7070a0", description: "External connector" };
            const statusCfg = STATUS_CONFIG[src.status] ?? STATUS_CONFIG.disconnected;
            const { Icon: SrcIcon } = meta;
            const { Icon: StatusIcon } = statusCfg;
            return (
              <div
                key={src.name}
                className="glass animate-slide-up"
                style={{
                  padding: "22px 20px",
                  animationDelay: `${i * 60}ms`,
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.2s ease, border-color 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${meta.color}80, transparent)` }} />

                {/* Icon + Status row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div
                    style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: `${meta.color}14`,
                      border: `1px solid ${meta.color}28`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: meta.color,
                      boxShadow: `0 0 16px ${meta.color}20`,
                    }}
                  >
                    <SrcIcon size={20} strokeWidth={2} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div
                      className={src.status === "healthy" ? "animate-pulse-dot" : undefined}
                      style={{ width: 7, height: 7, borderRadius: "50%", background: statusCfg.dot, boxShadow: statusCfg.glow, flexShrink: 0 }}
                    />
                    <StatusIcon size={12} color={statusCfg.dot} strokeWidth={2.2} />
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: statusCfg.textColor, letterSpacing: "0.04em" }}>
                      {statusCfg.label.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Name + description */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f0f0fa", marginBottom: 4, letterSpacing: "-0.01em" }}>
                    {src.display_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#4a4a7a", lineHeight: 1.45 }}>
                    {meta.description}
                  </div>
                </div>

                {/* Last checked */}
                <div style={{ fontSize: "0.7rem", color: "#3a3a6a", fontFamily: "var(--font-mono)", marginTop: "auto" }}>
                  {src.last_checked_at
                    ? `Checked ${formatDistanceToNow(new Date(src.last_checked_at), { addSuffix: true })}`
                    : "Never checked"}
                </div>

                {/* Error */}
                {src.last_error && (
                  <div style={{ marginTop: 10, fontSize: "0.7rem", padding: "8px 10px", borderRadius: 8, background: "rgba(255,84,112,0.06)", border: "1px solid rgba(255,84,112,0.15)", color: "#ff7090", fontFamily: "var(--font-mono)", lineHeight: 1.4 }}>
                    {src.last_error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Coral info banner ── */}
      <div
        className="glass animate-slide-up delay-4"
        style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 10,
            background: "rgba(124,109,255,0.1)",
            border: "1px solid rgba(124,109,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#7c6dff",
            flexShrink: 0,
          }}
        >
          <Network size={18} strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#a095ff", marginBottom: 3 }}>
            Coral SQL Federation Engine
          </div>
          <div style={{ fontSize: "0.75rem", color: "#4a4a7a", lineHeight: 1.5 }}>
            All sources above are federated through the Coral MCP protocol. The AI agent queries them using standard SQL via{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "#7070a0", fontSize: "0.7rem" }}>execute_query</code>.
          </div>
        </div>
      </div>
    </div>
  );
}

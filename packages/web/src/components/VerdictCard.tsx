import { AlertTriangle, GitBranch, AlertOctagon, CheckCircle2, HelpCircle, ChevronRight } from "lucide-react";
import type { Verdict, CauseLabel } from "../lib/types";
import { CAUSE_CONFIG } from "../lib/types";

interface VerdictCardProps {
  verdict: Verdict;
  identifier?: string;
  triggeredAt?: string;
  compact?: boolean;
  onClick?: () => void;
}

const CAUSE_STYLE: Record<string, { color: string; glow: string; bg: string; border: string }> = {
  flag:         { color: "#ff5470", glow: "rgba(255,84,112,0.28)",  bg: "rgba(255,84,112,0.07)",  border: "rgba(255,84,112,0.2)" },
  deploy:       { color: "#ffb547", glow: "rgba(255,181,71,0.28)",  bg: "rgba(255,181,71,0.07)",  border: "rgba(255,181,71,0.2)" },
  both:         { color: "#ff7b3d", glow: "rgba(255,123,61,0.28)",  bg: "rgba(255,123,61,0.07)",  border: "rgba(255,123,61,0.2)" },
  neither:      { color: "#2ecc8a", glow: "rgba(46,204,138,0.24)",  bg: "rgba(46,204,138,0.07)",  border: "rgba(46,204,138,0.18)" },
  inconclusive: { color: "#6b7280", glow: "rgba(107,114,128,0.2)",  bg: "rgba(107,114,128,0.07)", border: "rgba(107,114,128,0.15)" },
};

const CAUSE_ICON_MAP: Record<CauseLabel, React.FC<{ size?: number; strokeWidth?: number }>> = {
  flag:         AlertTriangle,
  deploy:       GitBranch,
  both:         AlertOctagon,
  neither:      CheckCircle2,
  inconclusive: HelpCircle,
};

function CauseIcon({ label, size = 16, strokeWidth = 2 }: { label: CauseLabel; size?: number; strokeWidth?: number }) {
  const Icon = CAUSE_ICON_MAP[label] ?? HelpCircle;
  return <Icon size={size} strokeWidth={strokeWidth} />;
}

function ConfidenceRing({ value, color = "#7c6dff" }: { value: number; color?: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="50" height="50" style={{ flexShrink: 0 }}>
      <circle cx="25" cy="25" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3.5" />
      <circle
        cx="25" cy="25" r={r}
        fill="none"
        stroke={color}
        strokeWidth="3.5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 25 25)"
        style={{
          transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)",
          filter: `drop-shadow(0 0 4px ${color}80)`,
        }}
      />
      <text
        x="25" y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f0f0fa"
        fontSize="10"
        fontWeight="700"
        fontFamily="var(--font-mono)"
      >
        {value}%
      </text>
    </svg>
  );
}

export function VerdictCard({ verdict, identifier, triggeredAt, compact, onClick }: VerdictCardProps) {
  const cfg = CAUSE_CONFIG[verdict.cause_label];
  const sty = CAUSE_STYLE[verdict.cause_label] ?? CAUSE_STYLE.inconclusive;
  const conf = Math.round(verdict.cause_confidence * 100);

  /* ——— COMPACT LIST ROW ——— */
  if (compact) {
    return (
      <div
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 18px 14px 20px",
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(20,20,36,0.8) 0%, rgba(13,13,22,0.9) 100%)",
          border: "1px solid rgba(255,255,255,0.06)",
          cursor: "pointer",
          transition: "all 0.18s ease",
          position: "relative",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = sty.border;
          el.style.boxShadow = `0 4px 24px ${sty.glow}`;
          el.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement;
          el.style.borderColor = "rgba(255,255,255,0.06)";
          el.style.boxShadow = "none";
          el.style.transform = "translateY(0)";
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: "absolute",
            left: 0, top: 0, bottom: 0,
            width: 3,
            background: sty.color,
            borderRadius: "12px 0 0 12px",
            boxShadow: `0 0 10px ${sty.glow}`,
          }}
        />

        {/* Cause icon */}
        <div
          style={{
            width: 38, height: 38,
            borderRadius: 10,
            background: sty.bg,
            border: `1px solid ${sty.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: sty.color,
          }}
        >
          <CauseIcon label={verdict.cause_label} size={17} strokeWidth={2.2} />
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontWeight: 700,
                color: "#f0f0fa",
                fontSize: "0.88rem",
                letterSpacing: "-0.01em",
                fontFamily: "var(--font-mono)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 200,
              }}
            >
              {identifier ?? verdict.investigation_id.slice(0, 8)}
            </span>
            <span className={`badge badge-${verdict.cause_label}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CauseIcon label={verdict.cause_label} size={9} strokeWidth={2.5} />
              {cfg.label}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.78rem",
              color: "#6060a0",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {verdict.cause_reasoning}
          </p>
        </div>

        {/* Right: confidence + time */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <ConfidenceRing value={conf} color={sty.color} />
          <span style={{ fontSize: "0.7rem", color: "#4a4a7a", whiteSpace: "nowrap" }}>{triggeredAt}</span>
        </div>

        {/* Chevron */}
        <ChevronRight size={14} color="#404068" strokeWidth={2} style={{ flexShrink: 0 }} />
      </div>
    );
  }

  /* ——— FULL DETAIL CARD ——— */
  return (
    <div
      style={{
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(20,20,38,0.85) 0%, rgba(13,13,24,0.92) 100%)",
        border: `1px solid ${sty.border}`,
        boxShadow: `0 0 48px ${sty.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: `linear-gradient(135deg, ${sty.bg} 0%, transparent 100%)`,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 48, height: 48,
            borderRadius: 13,
            background: sty.bg,
            border: `1px solid ${sty.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: sty.color,
            boxShadow: `0 0 20px ${sty.glow}`,
          }}
        >
          <CauseIcon label={verdict.cause_label} size={22} strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>
              {identifier}
            </span>
            <span className={`badge badge-${verdict.cause_label}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CauseIcon label={verdict.cause_label} size={9} strokeWidth={2.5} />
              {cfg.label}
            </span>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#6060a0" }}>
            Verdict:{" "}
            <span style={{ color: sty.color, fontWeight: 600 }}>
              {cfg.label.toUpperCase()} CAUSED THIS
            </span>
          </div>
        </div>
        <ConfidenceRing value={conf} color={sty.color} />
      </div>

      {/* Reasoning */}
      <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3a3a6a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          AI Reasoning
        </div>
        <p style={{ fontSize: "0.875rem", color: "#9090b8", lineHeight: 1.68 }}>{verdict.cause_reasoning}</p>
      </div>

      {/* Impact metrics */}
      <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Error Δ",       value: verdict.error_delta_pct != null ? `${verdict.error_delta_pct > 0 ? "+" : ""}${verdict.error_delta_pct}%` : "—", glow: "255,84,112" },
          { label: "Latency Δ",     value: verdict.latency_delta_ms != null ? `${verdict.latency_delta_ms}ms` : "—",                                     glow: "255,181,71" },
          { label: "Users Affected",value: verdict.users_affected?.toLocaleString() ?? "—",                                                              glow: "78,168,255"  },
        ].map(({ label, value, glow }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 600, color: "#3a3a6a", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.02em", textShadow: `0 0 20px rgba(${glow},0.3)` }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Cohorts */}
      {verdict.cohorts.length > 0 && (
        <div style={{ padding: "18px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#3a3a6a", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Impact Cohorts</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {verdict.cohorts.map((c, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.8rem", color: "#7070a0" }}>{c.dimension}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#a095ff" }}>{c.pct_of_impact}%</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${c.pct_of_impact}%`,
                      background: "linear-gradient(90deg, #5b4eda, #7c6dff)",
                      boxShadow: "0 0 8px rgba(124,109,255,0.4)",
                      [("--bar-width" as string)]: `${c.pct_of_impact}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources + Actions */}
      <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: "0.7rem", color: "#3a3a6a" }}>Sources:</span>
          {verdict.sources_used.map((s) => (
            <span key={s} style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#7070a0", fontFamily: "var(--font-mono)" }}>
              {s}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {verdict.actions.map((a, i) => (
            <button key={i} className="btn-ghost" style={{ fontSize: "0.78rem", padding: "6px 12px" }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  colorVar?: string;
  glowColor?: string;
  delay?: number;
}

export function MetricCard({ label, value, icon, colorVar, glowColor, delay = 0 }: MetricCardProps) {
  const accentRgb = glowColor ?? "124,109,255";

  return (
    <div
      className="glass stat-card animate-slide-up"
      style={{
        padding: "20px 20px 18px",
        animationDelay: `${delay}ms`,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Background radial tint */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 80% 10%, rgba(${accentRgb},0.07) 0%, transparent 65%)`,
          pointerEvents: "none",
        }}
      />

      {/* Top row: label + icon */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 16,
          position: "relative",
        }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#4a4a7a",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            lineHeight: 1.3,
          }}
        >
          {label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `rgba(${accentRgb}, 0.1)`,
            border: `1px solid rgba(${accentRgb}, 0.2)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: colorVar ?? `rgb(${accentRgb})`,
            boxShadow: `0 0 12px rgba(${accentRgb}, 0.12)`,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div
        style={{
          fontSize: "2.2rem",
          fontWeight: 900,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: colorVar ?? "#f0f0fa",
          textShadow: glowColor ? `0 0 28px rgba(${glowColor},0.35)` : undefined,
          position: "relative",
        }}
      >
        {value}
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.45), transparent)`,
          opacity: 0.7,
        }}
      />
    </div>
  );
}

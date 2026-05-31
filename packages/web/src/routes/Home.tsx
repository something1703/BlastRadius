import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Flag, Bug, Database, Sparkles, Zap, Network, Play, ArrowRight,
  Radio, Star, GitBranch, CheckCircle2, BarChart2, ChevronRight,
  Terminal,
} from "lucide-react";

function VercelIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M12 2L2 19.5h20L12 2z" />
    </svg>
  );
}

const TECH_STACK = [
  { name: "LaunchDarkly", Icon: Flag,       color: "#405BFF", desc: "Feature flag events" },
  { name: "Sentry",       Icon: Bug,        color: "#F55353", desc: "Error telemetry" },
  { name: "Vercel",       Icon: VercelIcon, color: "#e0e0e0", desc: "Deploy webhooks" },
  { name: "Coral",        Icon: Database,   color: "#7c6dff", desc: "SQL federation" },
  { name: "Gemini",       Icon: Sparkles,   color: "#4ea8ff", desc: "AI agent loop" },
  { name: "Supabase",     Icon: Zap,        color: "#2ecc8a", desc: "Realtime verdicts" },
];

const FLOW_STEPS = [
  {
    Icon: Flag,
    title: "Flag Flip Detected",
    detail: "LaunchDarkly webhook fires on flag state change",
    color: "#405BFF",
    glow: "rgba(64,91,255,0.35)",
    bgRgb: "64,91,255",
  },
  {
    Icon: Database,
    title: "Coral SQL Federation",
    detail: "Gemini agent writes & executes cross-source SQL JOIN queries",
    color: "#7c6dff",
    glow: "rgba(124,109,255,0.4)",
    bgRgb: "124,109,255",
  },
  {
    Icon: Bug,
    title: "Error Correlation",
    detail: "Sentry + Vercel events joined against flag timeline",
    color: "#F55353",
    glow: "rgba(245,83,83,0.35)",
    bgRgb: "245,83,83",
  },
  {
    Icon: Radio,
    title: "Live Verdict",
    detail: "Structured verdict pushed via Supabase Realtime",
    color: "#2ecc8a",
    glow: "rgba(46,204,138,0.35)",
    bgRgb: "46,204,138",
  },
];

export function Home() {
  const navigate = useNavigate();
  const [showSql, setShowSql] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070d",
        backgroundImage: `
          radial-gradient(ellipse 100% 60% at 50% -5%, rgba(124,109,255,0.12) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 85% 90%, rgba(255,84,112,0.06) 0%, transparent 60%),
          radial-gradient(ellipse 40% 35% at 10% 60%, rgba(64,91,255,0.05) 0%, transparent 60%)
        `,
        fontFamily: "var(--font-sans)",
        overflowX: "hidden",
      }}
    >
      {/* ── Nav Bar ── */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 48px",
          borderBottom: "1px solid rgba(255,255,255,0.04)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "rgba(7,7,13,0.85)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(124,109,255,0.25) 0%, rgba(255,84,112,0.12) 100%)",
              border: "1px solid rgba(124,109,255,0.28)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(124,109,255,0.2)",
              color: "#7c6dff",
            }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: 20, height: 20, objectFit: "contain" }} />
          </div>
          <div>
            <span style={{ fontSize: "1rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.02em" }}>
              Blast Radius
            </span>
            <span
              style={{
                marginLeft: 8, fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                background: "rgba(124,109,255,0.12)", border: "1px solid rgba(124,109,255,0.25)",
                color: "#a095ff", letterSpacing: "0.06em", textTransform: "uppercase",
              }}
            >
              Beta
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8,
              fontSize: "0.82rem", fontWeight: 500, color: "#7070a0", background: "transparent",
              border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none", transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = "#f0f0fa"; el.style.borderColor = "rgba(255,255,255,0.14)"; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.color = "#7070a0"; el.style.borderColor = "rgba(255,255,255,0.06)"; }}
          >
            <Star size={13} strokeWidth={2} /> GitHub
          </a>
          <button className="btn-primary" onClick={() => navigate("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            Open Dashboard <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        style={{
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
          padding: "100px 24px 80px", position: "relative", maxWidth: 860, margin: "0 auto",
        }}
      >
        <div
          className="hero-glow"
          style={{
            width: 600, height: 300, top: 40, left: "50%", transform: "translateX(-50%)",
            background: "radial-gradient(ellipse, rgba(124,109,255,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Eyebrow */}
        <div
          className="animate-slide-down"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 99,
            background: "rgba(124,109,255,0.08)", border: "1px solid rgba(124,109,255,0.2)",
            fontSize: "0.78rem", fontWeight: 600, color: "#a095ff", letterSpacing: "0.04em", marginBottom: 28,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c6dff", boxShadow: "0 0 8px rgba(124,109,255,0.8)" }} className="animate-pulse-dot" />
          AI-Powered Incident Intelligence · Built with Coral MCP
        </div>

        {/* Headline */}
        <h1
          className="animate-slide-up"
          style={{
            fontSize: "clamp(2.4rem, 6vw, 3.8rem)", fontWeight: 900, color: "#f0f0fa",
            letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 20, position: "relative",
          }}
        >
          Know exactly what{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7c6dff 0%, #ff5470 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}
          >
            broke production
          </span>{" "}
          in seconds
        </h1>

        {/* Subheadline */}
        <p
          className="animate-slide-up delay-1"
          style={{ fontSize: "1.1rem", color: "#7070a0", lineHeight: 1.65, maxWidth: 600, marginBottom: 40 }}
        >
          Blast Radius correlates your LaunchDarkly flag flips, Vercel deploys, and Sentry errors
          using a Gemini AI agent that writes live federated SQL queries across all your sources —
          and delivers a verdict in real-time.
        </p>

        {/* CTAs */}
        <div
          className="animate-slide-up delay-2"
          style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
        >
          <button
            className="btn-primary"
            onClick={() => navigate("/dashboard")}
            style={{ padding: "13px 28px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 8px 32px rgba(124,109,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}
          >
            <Play size={15} strokeWidth={2.2} /> Launch Dashboard
          </button>
          <button
            className="btn-ghost"
            onClick={() => setShowSql((v) => !v)}
            style={{ padding: "13px 24px", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 7 }}
          >
            {showSql ? "Hide" : "How it works"}
            <ChevronRight size={15} strokeWidth={2} style={{ transition: "transform 0.2s", transform: showSql ? "rotate(90deg)" : "rotate(0deg)" }} />
          </button>
        </div>

        {/* Stats row */}
        <div
          className="animate-fade-in delay-4"
          style={{
            display: "flex", gap: 32, alignItems: "center", marginTop: 52, padding: "16px 32px",
            borderRadius: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {[
            { value: "~60s", label: "Time to verdict" },
            { value: "3+",   label: "Data sources" },
            { value: "Live", label: "Real-time streaming" },
            { value: "AI",   label: "Gemini agent loop" },
          ].map(({ value, label }, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: "0.72rem", color: "#4a4a7a", marginTop: 2, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pipeline Flow ── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4a4a7a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            The pipeline
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.03em" }}>
            From alert to verdict in one loop
          </h2>
        </div>

        {/* Flow diagram */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 56, overflowX: "auto", padding: "4px 0" }}>
          {FLOW_STEPS.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < FLOW_STEPS.length - 1 ? "1" : "0 1 auto", minWidth: 160 }}>
              <div
                className="animate-slide-up step-card"
                style={{ animationDelay: `${i * 80}ms`, flex: 1, textAlign: "center", padding: "24px 20px" }}
              >
                <div
                  style={{
                    width: 52, height: 52, borderRadius: 13,
                    background: `rgba(${step.bgRgb},0.1)`,
                    border: `1px solid rgba(${step.bgRgb},0.3)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 14px",
                    boxShadow: `0 0 20px ${step.glow}`,
                    color: step.color,
                  }}
                >
                  <step.Icon size={22} strokeWidth={1.8} />
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#f0f0fa", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#5a5a8a", lineHeight: 1.45 }}>
                  {step.detail}
                </div>
              </div>

              {i < FLOW_STEPS.length - 1 && (
                <div style={{ width: 40, flexShrink: 0, height: 2, position: "relative", overflow: "hidden", background: "rgba(124,109,255,0.12)" }}>
                  <div
                    style={{
                      position: "absolute", top: 0, left: "-50%", width: "50%", height: "100%",
                      background: "linear-gradient(90deg, transparent, #7c6dff, transparent)",
                      animation: `flowPulse ${2.5 + i * 0.3}s ease-in-out infinite`,
                      animationDelay: `${i * 0.4}s`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* SQL Reveal */}
        {showSql && (
          <div className="animate-scale-in" style={{ marginBottom: 56 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <p style={{ fontSize: "0.85rem", color: "#6a6a9a" }}>
                Here's the actual cross-source SQL query Gemini wrote to correlate the flag flip with the Sentry error:
              </p>
            </div>
            <div style={{ background: "#0a0a14", border: "1px solid rgba(124,109,255,0.2)", borderRadius: 14, overflow: "hidden", boxShadow: "0 0 40px rgba(124,109,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["#ff5f57", "#ffbd2e", "#28c840"].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                ))}
                <span style={{ flex: 1, textAlign: "center", fontSize: "0.72rem", color: "#4a4a7a", fontFamily: "var(--font-mono)", letterSpacing: "0.03em" }}>
                  Coral federated query — checkout-v2 × sentry correlation
                </span>
                <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: 5, background: "rgba(46,204,138,0.08)", border: "1px solid rgba(46,204,138,0.15)", color: "#2ecc8a", fontFamily: "var(--font-mono)" }}>
                  LIVE
                </span>
              </div>
              <pre style={{ padding: "20px 24px", fontFamily: "var(--font-mono)", fontSize: "0.82rem", lineHeight: 1.75, color: "#9eaabe", margin: 0, overflowX: "auto" }}>
                <span style={{ color: "#546e7a", fontStyle: "italic" }}>{"-- Coral federated query: flag flip × Sentry error join\n"}</span>
                <span style={{ color: "#c792ea", fontWeight: 500 }}>{"SELECT\n"}</span>
                {"  f.key                "}<span style={{ color: "#c792ea", fontWeight: 500 }}>AS </span><span style={{ color: "#82aaff" }}>flag</span>
                {",\n  f.flipped_at         "}<span style={{ color: "#c792ea", fontWeight: 500 }}>AS </span><span style={{ color: "#82aaff" }}>flip_time</span>
                {",\n  e.title              "}<span style={{ color: "#c792ea", fontWeight: 500 }}>AS </span><span style={{ color: "#82aaff" }}>error_title</span>
                {",\n  e.first_seen,\n  EXTRACT(EPOCH "}<span style={{ color: "#c792ea", fontWeight: 500 }}>FROM </span>{"(e.first_seen - f.flipped_at)) / "}<span style={{ color: "#f78c6c" }}>60</span>
                {"\n                       "}<span style={{ color: "#c792ea", fontWeight: 500 }}>AS </span><span style={{ color: "#82aaff" }}>lag_minutes</span>
                {"\n"}<span style={{ color: "#c792ea", fontWeight: 500 }}>FROM </span><span style={{ color: "#c3e88d" }}>launchdarkly</span>{".flag_evaluations f\n"}
                <span style={{ color: "#c792ea", fontWeight: 500 }}>JOIN </span><span style={{ color: "#c3e88d" }}>sentry</span>{".issues e\n  "}
                <span style={{ color: "#c792ea", fontWeight: 500 }}>ON </span>{"e.first_seen "}<span style={{ color: "#c792ea", fontWeight: 500 }}>BETWEEN </span>{"f.flipped_at\n                      "}
                <span style={{ color: "#c792ea", fontWeight: 500 }}>AND </span>{"f.flipped_at + "}<span style={{ color: "#c792ea", fontWeight: 500 }}>INTERVAL </span><span style={{ color: "#c3e88d" }}>'2 hours'</span>
                {"\n"}<span style={{ color: "#c792ea", fontWeight: 500 }}>WHERE </span>{"f.key = "}<span style={{ color: "#c3e88d" }}>'checkout-v2'</span>
                {"\n"}<span style={{ color: "#c792ea", fontWeight: 500 }}>ORDER BY </span>{"e.first_seen;"}
              </pre>
            </div>
          </div>
        )}
      </section>

      {/* ── Three Feature Cards ── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4a4a7a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
            Why Blast Radius
          </div>
          <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.03em" }}>
            Infrastructure, not a script
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#5a5a8a", marginTop: 10, maxWidth: 500, margin: "10px auto 0" }}>
            Most incident tools just grep logs. We built a federated SQL agent that correlates events across sources.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { num: "01", Icon: GitBranch,  title: "Federated SQL Engine",    body: "Coral MCP lets our Gemini agent write a single SQL JOIN across LaunchDarkly, Sentry, and Vercel as if they were one database.", rgb: "124,109,255" },
            { num: "02", Icon: Sparkles,   title: "Discovery-First Agent",   body: "The agent first introspects available schemas, then designs queries based on what data actually exists — no hallucinated column names.", rgb: "78,168,255" },
            { num: "03", Icon: BarChart2,  title: "Real-Time Verdicts",      body: "Verdicts are structured Zod-validated JSON, written to Supabase, and streamed live to the dashboard via Postgres Realtime channels.", rgb: "46,204,138" },
          ].map(({ num, Icon, title, body, rgb }, i) => (
            <div key={i} className="step-card animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 11,
                    background: `rgba(${rgb},0.1)`, border: `1px solid rgba(${rgb},0.25)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: `rgb(${rgb})`,
                    boxShadow: `0 0 20px rgba(${rgb},0.2)`,
                  }}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <span style={{ fontSize: "2rem", fontWeight: 900, color: "rgba(255,255,255,0.04)", letterSpacing: "-0.04em", fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                  {num}
                </span>
              </div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#f0f0fa", marginBottom: 10, letterSpacing: "-0.01em" }}>{title}</h3>
              <p style={{ fontSize: "0.82rem", color: "#6a6a9a", lineHeight: 1.6 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 80px", textAlign: "center" }}>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#4a4a7a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 24 }}>
          Built with
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {TECH_STACK.map(({ name, Icon, color, desc }) => (
            <div key={name} className="tech-badge animate-fade-in" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ color, flexShrink: 0, filter: `drop-shadow(0 0 6px ${color}60)` }}>
                <Icon size={16} strokeWidth={2} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#c0c0e0" }}>{name}</div>
                <div style={{ fontSize: "0.68rem", color: "#4a4a7a", marginTop: 1 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: "0 24px 100px" }}>
        <div
          style={{
            maxWidth: 700, margin: "0 auto", textAlign: "center", padding: "60px 40px", borderRadius: 20,
            background: "linear-gradient(135deg, rgba(124,109,255,0.1) 0%, rgba(255,84,112,0.06) 100%)",
            border: "1px solid rgba(124,109,255,0.2)",
            boxShadow: "0 0 80px rgba(124,109,255,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
            position: "relative", overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 300, height: 200, background: "radial-gradient(ellipse, rgba(124,109,255,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div
            style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, rgba(124,109,255,0.18) 0%, rgba(255,84,112,0.1) 100%)", border: "1px solid rgba(124,109,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", color: "#7c6dff", boxShadow: "0 0 32px rgba(124,109,255,0.25)" }}
            className="animate-float"
          >
            <CheckCircle2 size={28} strokeWidth={1.8} />
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f0f0fa", letterSpacing: "-0.03em", marginBottom: 12 }}>
            See it in action
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#6a6a9a", lineHeight: 1.6, marginBottom: 28, maxWidth: 450, margin: "0 auto 28px" }}>
            Open the dashboard and click "Simulate Webhook" to get a cURL command. Paste it in your terminal and watch the live AI pipeline react instantly.
          </p>
          <button
            className="btn-primary"
            onClick={() => navigate("/dashboard")}
            style={{ padding: "14px 32px", fontSize: "1rem", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 8px 40px rgba(124,109,255,0.5), inset 0 1px 0 rgba(255,255,255,0.15)" }}
          >
            <Terminal size={16} strokeWidth={2.2} /> Simulate Webhook
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "24px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo.png" alt="Logo" style={{ width: 16, height: 16, objectFit: "contain", filter: "grayscale(100%) opacity(0.6)" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3a3a6a" }}>Blast Radius</span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "#2a2a4a" }}>
          Built with Coral MCP + Gemini + Supabase Realtime
        </span>
      </footer>
    </div>
  );
}

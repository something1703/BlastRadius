import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { sb } from "../lib/supabase";
import { formatDistanceToNow, format } from "date-fns";
import { ChevronDown, Code2, Search, Clock } from "lucide-react";

interface QueryRunWithInvestigation {
  id: string;
  investigation_id: string;
  purpose: string;
  sql: string;
  row_count: number;
  result_storage_key: string | null;
  executed_at: string;
  investigations: {
    identifier: string;
    trigger_type: string;
    status: string;
  } | null;
}

function tokenizeSqlInline(sql: string) {
  return sql.replace(/\s+/g, " ").trim().slice(0, 120) + (sql.length > 120 ? "…" : "");
}

export function Activity() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<QueryRunWithInvestigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    sb.from("query_runs")
      .select("*, investigations(identifier, trigger_type, status)")
      .order("executed_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setRuns(data as QueryRunWithInvestigation[]);
        setLoading(false);
      });
  }, []);

  const grouped = runs.reduce<Record<string, QueryRunWithInvestigation[]>>((acc, run) => {
    const key = run.investigation_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(run);
    return acc;
  }, {});

  const groupEntries = Object.entries(grouped);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%" }}>
      {/* ── Header ── */}
      <div className="animate-slide-down" style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f0f0fa", letterSpacing: "-0.035em", lineHeight: 1.1, marginBottom: 6 }}>
          Activity
        </h1>
        <p style={{ fontSize: "0.82rem", color: "#4a4a7a" }}>
          Every SQL query the AI agent executed — full reproducibility trail
        </p>
      </div>

      {/* ── Stats bar ── */}
      <div
        className="glass animate-slide-up"
        style={{ padding: "16px 22px", marginBottom: 20, display: "flex", gap: 28, alignItems: "center" }}
      >
        {[
          { label: "Total Queries",      value: runs.length,                                              color: "#f0f0fa" },
          { label: "Investigations",     value: groupEntries.length,                                      color: "#f0f0fa" },
          { label: "Avg Queries / Run",  value: groupEntries.length ? Math.round(runs.length / groupEntries.length) : 0, color: "#f0f0fa" },
          { label: "With Results",       value: runs.filter((r) => r.result_storage_key).length,          color: "#2ecc8a" },
        ].map(({ label, value, color }, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: i > 0 ? 0 : 0 }}>
            {i > 0 && <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.06)", marginRight: 28 }} />}
            <div>
              <div style={{ fontSize: "0.68rem", color: "#3a3a6a", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="shimmer" style={{ height: 100, borderRadius: 12 }} />)}
        </div>
      ) : groupEntries.length === 0 ? (
        <div className="glass" style={{ padding: "60px 24px", textAlign: "center" }}>
          <Clock size={32} color="#3a3a6a" strokeWidth={1.5} style={{ marginBottom: 12 }} />
          <p style={{ color: "#5a5a8a", fontSize: "1rem", marginBottom: 6 }}>No query runs yet</p>
          <p style={{ color: "#3a3a6a", fontSize: "0.82rem" }}>Trigger an analysis from the Dashboard to see activity here</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {groupEntries.map(([invId, invRuns], gIdx) => {
            const inv = invRuns[0].investigations;
            const isExpanded = expandedId === invId;
            return (
              <div
                key={invId}
                className="glass animate-slide-up"
                style={{ animationDelay: `${gIdx * 40}ms`, overflow: "hidden" }}
              >
                {/* Group header */}
                <div
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                    borderBottom: isExpanded ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : invId)}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: "rgba(124,109,255,0.1)",
                      border: "1px solid rgba(124,109,255,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      color: "#7c6dff",
                    }}
                  >
                    <Search size={14} strokeWidth={2} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{ fontWeight: 700, color: "#f0f0fa", fontSize: "0.9rem", fontFamily: "var(--font-mono)", cursor: "pointer" }}
                        onClick={(e) => { e.stopPropagation(); navigate(`/investigations/${invId}`); }}
                      >
                        {inv?.identifier ?? invId.slice(0, 8)}
                      </span>
                      <span
                        style={{
                          fontSize: "0.67rem", padding: "2px 7px", borderRadius: 5,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                          color: "#5a5a8a", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600,
                        }}
                      >
                        {inv?.trigger_type?.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#4a4a7a", marginTop: 2 }}>
                      {invRuns.length} queries · last {formatDistanceToNow(new Date(invRuns[0].executed_at), { addSuffix: true })}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem", padding: "3px 10px", borderRadius: 99,
                      background: "rgba(124,109,255,0.1)", border: "1px solid rgba(124,109,255,0.18)",
                      color: "#a095ff", fontFamily: "var(--font-mono)", fontWeight: 600,
                    }}
                  >
                    {invRuns.length} SQL
                  </span>

                  <ChevronDown
                    size={15}
                    color="#5a5a8a"
                    strokeWidth={2}
                    style={{ flexShrink: 0, transition: "transform 0.2s ease", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </div>

                {/* Expanded query rows */}
                {isExpanded && (
                  <div>
                    {invRuns.map((run, rIdx) => (
                      <div
                        key={run.id}
                        style={{
                          padding: "12px 18px",
                          borderBottom: rIdx < invRuns.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        {/* Step number */}
                        <div
                          style={{
                            width: 22, height: 22, borderRadius: "50%",
                            background: "rgba(124,109,255,0.08)",
                            border: "1px solid rgba(124,109,255,0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.64rem", color: "#6a6aaa", fontWeight: 700, flexShrink: 0, marginTop: 2,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {rIdx + 1}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#c0c0e0" }}>{run.purpose}</span>
                            <span style={{ fontSize: "0.7rem", color: "#4a4a7a", fontFamily: "var(--font-mono)" }}>
                              {run.row_count} rows
                            </span>
                            {run.result_storage_key && (
                              <span style={{ fontSize: "0.67rem", padding: "1px 6px", borderRadius: 4, background: "rgba(46,204,138,0.07)", border: "1px solid rgba(46,204,138,0.15)", color: "#2ecc8a" }}>
                                stored
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Code2 size={11} color="#3a3a6a" strokeWidth={2} style={{ flexShrink: 0 }} />
                            <div
                              style={{
                                flex: 1,
                                fontSize: "0.7rem",
                                fontFamily: "var(--font-mono)",
                                color: "#4a4a7a",
                                background: "rgba(0,0,0,0.2)",
                                padding: "5px 10px",
                                borderRadius: 6,
                                border: "1px solid rgba(255,255,255,0.04)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {tokenizeSqlInline(run.sql)}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, textAlign: "right" }}>
                          <div style={{ fontSize: "0.7rem", color: "#3a3a6a", fontFamily: "var(--font-mono)" }}>
                            {format(new Date(run.executed_at), "HH:mm:ss")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

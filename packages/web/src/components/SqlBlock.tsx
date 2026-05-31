import type { QueryRun } from "../lib/types";

interface SqlBlockProps {
  query: QueryRun;
  index?: number;
  onViewResult?: () => void;
}

/** Very lightweight SQL syntax colorizer */
function tokenizeSql(sql: string): string {
  const keywords = /\b(SELECT|FROM|WHERE|AND|OR|ORDER|BY|LIMIT|JOIN|LEFT|RIGHT|INNER|ON|GROUP|HAVING|WITH|AS|IN|NOT|IS|NULL|DISTINCT|COUNT|MAX|MIN|SUM|AVG|CASE|WHEN|THEN|ELSE|END|BETWEEN|LIKE|EXISTS|INSERT|UPDATE|SET|DELETE)\b/gi;
  const strings = /'[^']*'/g;
  const numbers = /\b\d+(\.\d+)?\b/g;
  const comments = /--.*/g;

  return sql
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(comments, (m) => `<span class="sql-comment">${m}</span>`)
    .replace(strings, (m) => `<span class="sql-string">${m}</span>`)
    .replace(numbers, (m) => `<span class="sql-number">${m}</span>`)
    .replace(keywords, (m) => `<span class="sql-keyword">${m.toUpperCase()}</span>`);
}

export function SqlBlock({ query, index = 0, onViewResult }: SqlBlockProps) {
  return (
    <div
      className="terminal-window animate-slide-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Title bar */}
      <div className="terminal-titlebar">
        {/* Mac dots */}
        <div className="terminal-dot" style={{ background: "#ff5f57" }} />
        <div className="terminal-dot" style={{ background: "#ffbd2e" }} />
        <div className="terminal-dot" style={{ background: "#28c840" }} />

        {/* Purpose label */}
        <div style={{ flex: 1, textAlign: "center", fontSize: "0.72rem", color: "#5a5a8a", fontWeight: 500, letterSpacing: "0.02em" }}>
          {query.purpose}
        </div>

        {/* Row count + view result button */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.7rem", color: "#4a4a7a", fontFamily: "var(--font-mono)" }}>
            {query.row_count} rows
          </span>
          {onViewResult && (
            <button
              onClick={onViewResult}
              style={{
                fontSize: "0.7rem",
                padding: "3px 10px",
                borderRadius: 6,
                background: "rgba(124,109,255,0.12)",
                border: "1px solid rgba(124,109,255,0.2)",
                color: "#a095ff",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,109,255,0.22)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,109,255,0.12)"; }}
            >
              ◈ view result
            </button>
          )}
        </div>
      </div>

      {/* SQL body */}
      <div
        className="terminal-body"
        dangerouslySetInnerHTML={{ __html: tokenizeSql(query.sql) }}
      />
    </div>
  );
}

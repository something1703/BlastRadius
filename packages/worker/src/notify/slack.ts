import type { Verdict } from "../verdict/schema.js";

const BADGE: Record<Verdict["cause"]["label"], { color: string; emoji: string }> = {
  flag:         { color: "#A32D2D", emoji: "🚨" },
  deploy:       { color: "#854F0B", emoji: "🚧" },
  both:         { color: "#854F0B", emoji: "⚠️" },
  neither:      { color: "#3B6D11", emoji: "✅" },
  inconclusive: { color: "#5F5E5A", emoji: "🔍" },
};

function formatVerdictForConsole(verdict: Verdict): string {
  const b = BADGE[verdict.cause.label];
  const lines = [
    ``,
    `${"═".repeat(60)}`,
    `${b.emoji}  BLAST RADIUS VERDICT: ${verdict.cause.label.toUpperCase()}`,
    `${"═".repeat(60)}`,
    ``,
    `Trigger:     ${verdict.trigger.identifier} (${verdict.trigger.type})`,
    `Occurred:    ${verdict.trigger.occurred_at}`,
    `Confidence:  ${Math.round(verdict.cause.confidence * 100)}%`,
    ``,
    `📝 Reasoning:`,
    `   ${verdict.cause.reasoning}`,
    ``,
    `📊 Impact:`,
    `   Error delta:    ${verdict.impact.error_delta_pct ?? "—"}%`,
    `   Latency delta:  ${verdict.impact.latency_delta_ms ?? "—"} ms`,
    `   Users affected: ${verdict.impact.users_affected ?? "—"}`,
  ];

  if (verdict.impact.cohorts.length > 0) {
    lines.push(``, `👥 Cohorts:`);
    for (const c of verdict.impact.cohorts) {
      lines.push(`   ${c.dimension}: ${c.pct_of_impact}%`);
    }
  }

  lines.push(
    ``,
    `🔎 Evidence: ${verdict.evidence.queries.length} queries across [${verdict.evidence.sources_used.join(", ")}]`,
  );

  if (verdict.actions.length > 0) {
    lines.push(``, `⚡ Recommended Actions:`);
    for (const a of verdict.actions) {
      lines.push(`   [${a.type.toUpperCase()}] ${a.label}`);
    }
  }

  lines.push(``, `${"═".repeat(60)}`, ``);
  return lines.join("\n");
}

export async function postVerdict(verdict: Verdict): Promise<void> {
  if (process.env.STUB_SLACK === "true") {
    console.log(formatVerdictForConsole(verdict));
    return;
  }

  // Real Slack integration
  const b = BADGE[verdict.cause.label];
  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${b.emoji} Blast Radius verdict: ${verdict.cause.label.toUpperCase()}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${verdict.trigger.identifier}* — ${verdict.cause.reasoning}\nConfidence: *${Math.round(verdict.cause.confidence * 100)}%*`,
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Error delta*\n${verdict.impact.error_delta_pct ?? "—"}%`,
        },
        {
          type: "mrkdwn",
          text: `*Users affected*\n${verdict.impact.users_affected ?? "—"}`,
        },
        {
          type: "mrkdwn",
          text: `*Sources used*\n${verdict.evidence.sources_used.join(", ")}`,
        },
        {
          type: "mrkdwn",
          text: `*Top cohort*\n${verdict.impact.cohorts[0]?.dimension ?? "—"}`,
        },
      ],
    },
  ];

  const resp = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: process.env.SLACK_CHANNEL_ID,
      attachments: [{ color: b.color, blocks }],
    }),
  });

  if (!resp.ok) {
    throw new Error(`Slack post failed: ${resp.status} ${await resp.text()}`);
  }
}

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from the project root (c:\BlastRadius\.env)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { createCoralClient } from "../coral/client.js";
import { runAnalysis } from "./loop.js";
import type { Job } from "./loop.js";

const occurredAt = process.argv[4] ?? new Date().toISOString();
const epochMs = new Date(occurredAt).getTime();
const windowMs = 24 * 60 * 60 * 1000; // 24 hours

const job: Job = {
  trigger_type: (process.argv[2] as Job["trigger_type"]) ?? "flag_flip",
  identifier: process.argv[3] ?? "checkout-v2",
  occurred_at: occurredAt,
  hint: `PRE-COMPUTED EPOCH: The occurred_at timestamp ${occurredAt} equals ${epochMs} in epoch milliseconds. For LaunchDarkly audit_log queries, use "from" = '${epochMs - windowMs}' AND "to" = '${epochMs + windowMs}' to get a ±24 hour window. For Vercel deployments, filter created_at BETWEEN ${epochMs - windowMs} AND ${epochMs + windowMs}. DO NOT attempt to compute epoch values yourself — use these pre-computed values.`,
};

console.log("🏴‍☠️ Blast Radius — Agent Harness");
console.log("Job:", JSON.stringify(job, null, 2));
console.log("---");

const coral = await createCoralClient();
try {
  console.time("⏱ analysis");
  const verdict = await runAnalysis(job, coral, {
    onQuery: (record) => {
      console.log(`  📊 Query: ${record.sql.substring(0, 100)}... → ${record.row_count} rows`);
    },
  });
  console.timeEnd("⏱ analysis");
  console.log("\n✅ VERDICT:");
  console.log(JSON.stringify(verdict, null, 2));
} catch (err) {
  console.error("❌ Analysis failed:", (err as Error).message);
  process.exit(1);
} finally {
  await coral.close();
}

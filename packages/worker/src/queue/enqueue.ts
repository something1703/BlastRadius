import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { Queue } from "bullmq";
import { createRedisConnection, QUEUE_NAME } from "./connection.js";
import type { Job } from "../agent/loop.js";

const redis = createRedisConnection();
const queue = new Queue<Job>(QUEUE_NAME, { connection: redis });

const job: Job = {
  trigger_type: (process.argv[2] as Job["trigger_type"]) ?? "flag_flip",
  identifier: process.argv[3] ?? "checkout-v2",
  occurred_at: process.argv[4] ?? new Date().toISOString(),
};

console.log("📤 Enqueuing job:", JSON.stringify(job, null, 2));

const enqueued = await queue.add("analyze", job, {
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 100 },
});

console.log("✅ Enqueued job:", enqueued.id);
await queue.close();
await redis.quit();

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import IORedis, { type Redis } from "ioredis";

// Upstash Redis connection via standard ioredis TCP
// We parse the REST URL to extract the host for the TCP connection
function getRedisConfig() {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!restUrl || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in .env"
    );
  }

  // Extract hostname from the REST URL (e.g. "https://foo.upstash.io" -> "foo.upstash.io")
  const hostname = new URL(restUrl).hostname;

  return {
    host: hostname,
    port: 6379,
    password: token,
    maxRetriesPerRequest: null,
    tls: {},
  };
}

export function createRedisConnection(): Redis {
  const config = getRedisConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (IORedis as any)(config) as Redis;
}

export const QUEUE_NAME = "blast-radius-analyses";

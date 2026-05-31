/**
 * Fires 3 distinct Sentry errors with different timestamps
 * so the agent has varied data to correlate against flag flips.
 *
 * Error 1: ~35 min ago  — correlates with feature-checkout-v-2 flip
 * Error 2: ~95 min ago  — correlates with feature-dark-mode flip
 * Error 3: ~3h 10m ago  — independent error, no nearby flag flip
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });

const DSN = process.env.SENTRY_DSN;
const AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;

if (!DSN || !AUTH_TOKEN) {
  console.error("Missing SENTRY_DSN or SENTRY_AUTH_TOKEN in .env");
  process.exit(1);
}

// Parse DSN to get store endpoint and key
const dsnUrl = new URL(DSN);
const sentryKey = dsnUrl.username;
const projectId = dsnUrl.pathname.replace("/", "");
const storeUrl = `${dsnUrl.protocol}//${dsnUrl.host}/api/${projectId}/store/`;

const authHeader = `Sentry sentry_version=7,sentry_key=${sentryKey},sentry_secret=`;

const now = Date.now();
const min = 60 * 1000;

const errors = [
  {
    name: "TypeError: Cannot read properties of undefined (reading 'plan')",
    type: "TypeError",
    value: "Cannot read properties of undefined (reading 'plan')",
    // ~35 min ago — shortly after feature-checkout-v-2 was flipped
    timestamp: new Date(now - 35 * min).toISOString(),
    tags: { flag: "feature-checkout-v-2", environment: "test", component: "checkout" },
    transaction: "POST /api/checkout/session",
    fingerprint: ["checkout-plan-undefined"],
  },
  {
    name: "NetworkError: Stripe webhook timeout after 30000ms",
    type: "NetworkError",
    value: "Stripe webhook timeout after 30000ms",
    // ~95 min ago — shortly after feature-dark-mode was turned on
    timestamp: new Date(now - 95 * min).toISOString(),
    tags: { flag: "feature-dark-mode", environment: "test", component: "payments" },
    transaction: "POST /api/webhooks/stripe",
    fingerprint: ["stripe-webhook-timeout"],
  },
  {
    name: "ValidationError: Invalid coupon code format 'INVALID_2024'",
    type: "ValidationError",
    value: "Invalid coupon code format 'INVALID_2024'",
    // ~3h 10min ago — no flag flip nearby, so agent should say 'neither'
    timestamp: new Date(now - 190 * min).toISOString(),
    tags: { environment: "test", component: "billing" },
    transaction: "POST /api/billing/apply-coupon",
    fingerprint: ["invalid-coupon-format"],
  },
];

for (const err of errors) {
  const payload = {
    event_id: Math.random().toString(16).slice(2).padEnd(32, "0"),
    timestamp: err.timestamp,
    platform: "node",
    level: "error",
    transaction: err.transaction,
    tags: err.tags,
    fingerprint: err.fingerprint,
    exception: {
      values: [
        {
          type: err.type,
          value: err.value,
          stacktrace: {
            frames: [
              {
                filename: "src/api/checkout.ts",
                function: "processCheckout",
                lineno: 42,
                colno: 18,
                in_app: true,
              },
            ],
          },
        },
      ],
    },
    request: {
      method: "POST",
      url: `https://blast-radius.vercel.app${err.transaction}`,
    },
  };

  const res = await fetch(storeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Sentry-Auth": authHeader,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  const status = res.ok ? "✓" : "✗";
  console.log(`${status} [${err.timestamp}] ${err.name}`);
  if (!res.ok) console.log(`  Response: ${text.slice(0, 200)}`);
}

console.log("\nDone. 3 errors sent to Sentry.");

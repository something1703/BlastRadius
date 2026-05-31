#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          💥 Blast Radius Worker — Starting Up            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────────────────
# Provision Coral sources from environment variables.
# Run all `coral source add` calls in the BACKGROUND so node
# starts immediately and satisfies Cloud Run's startup probe.
# (The new Coral CLI auto-confirms in non-TTY environments.)
# ──────────────────────────────────────────────────────────
echo "→ Provisioning Coral data sources (background)..."

if [ -n "${LAUNCHDARKLY_API_TOKEN:-}" ]; then
  coral source add launchdarkly 2>&1 &
  echo "  ↗ launchdarkly (background)"
else
  echo "  ⏭ launchdarkly — LAUNCHDARKLY_API_TOKEN not set, skipping"
fi

if [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
  coral source add sentry 2>&1 &
  echo "  ↗ sentry (background)"
else
  echo "  ⏭ sentry — SENTRY_AUTH_TOKEN not set, skipping"
fi

if [ -n "${DATADOG_API_KEY:-}" ]; then
  coral source add datadog 2>&1 &
  echo "  ↗ datadog (background)"
else
  echo "  ⏭ datadog — DATADOG_API_KEY not set, skipping"
fi

if [ -n "${POSTHOG_API_KEY:-}" ]; then
  coral source add posthog 2>&1 &
  echo "  ↗ posthog (background)"
else
  echo "  ⏭ posthog — POSTHOG_API_KEY not set, skipping"
fi

# Vercel uses a YAML spec file
if [ -f "/app/sources/vercel.yaml" ]; then
  coral source add --file /app/sources/vercel.yaml 2>&1 &
  echo "  ↗ vercel (background)"
else
  echo "  ⏭ vercel — /app/sources/vercel.yaml not found, skipping"
fi

echo ""
echo "→ Coral provisioning running in background — worker starting now"
echo ""

# ──────────────────────────────────────────────────────────
# Validate critical env vars before starting the worker
# ──────────────────────────────────────────────────────────
MISSING_VARS=0

for VAR in UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY GEMINI_API_KEY; do
  if [ -z "${!VAR:-}" ]; then
    echo "  ✗ Missing required env var: $VAR"
    MISSING_VARS=$((MISSING_VARS + 1))
  else
    echo "  ✓ $VAR is set"
  fi
done

if [ "$MISSING_VARS" -gt 0 ]; then
  echo ""
  echo "ERROR: $MISSING_VARS required env var(s) are missing. Exiting."
  exit 1
fi

echo ""
echo "→ All checks passed. Starting worker..."
echo ""

# Hand off to the CMD (node dist/queue/worker.js)
exec "$@"

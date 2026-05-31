#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          💥 Blast Radius Worker — Starting Up            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ──────────────────────────────────────────────────────────
# Provision Coral sources from environment variables.
# Each `coral source add` is non-interactive — credentials
# are picked up from named env vars per the source spec.
# We use `|| true` so a missing credential skips gracefully.
# ──────────────────────────────────────────────────────────
echo "→ Provisioning Coral data sources..."

if [ -n "${LAUNCHDARKLY_API_TOKEN:-}" ]; then
  coral source add launchdarkly --yes 2>&1 && echo "  ✓ launchdarkly" || echo "  ⚠ launchdarkly skipped"
else
  echo "  ⏭ launchdarkly — LAUNCHDARKLY_API_TOKEN not set, skipping"
fi

if [ -n "${SENTRY_AUTH_TOKEN:-}" ]; then
  coral source add sentry --yes 2>&1 && echo "  ✓ sentry" || echo "  ⚠ sentry skipped"
else
  echo "  ⏭ sentry — SENTRY_AUTH_TOKEN not set, skipping"
fi

if [ -n "${DATADOG_API_KEY:-}" ]; then
  coral source add datadog --yes 2>&1 && echo "  ✓ datadog" || echo "  ⚠ datadog skipped"
else
  echo "  ⏭ datadog — DATADOG_API_KEY not set, skipping"
fi

if [ -n "${POSTHOG_API_KEY:-}" ]; then
  coral source add posthog --yes 2>&1 && echo "  ✓ posthog" || echo "  ⚠ posthog skipped"
else
  echo "  ⏭ posthog — POSTHOG_API_KEY not set, skipping"
fi

# Vercel uses a YAML spec file
if [ -f "/app/sources/vercel.yaml" ]; then
  coral source add --file /app/sources/vercel.yaml --yes 2>&1 && echo "  ✓ vercel" || echo "  ⚠ vercel skipped"
else
  echo "  ⏭ vercel — /app/sources/vercel.yaml not found, skipping"
fi

echo ""
echo "→ Active Coral sources:"
coral sources list 2>/dev/null || echo "  (none listed)"
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

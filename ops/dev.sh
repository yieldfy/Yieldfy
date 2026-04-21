#!/usr/bin/env bash
# Launch the full devnet stack locally: optimizer on :4000, dashboard on :8080.
# Ctrl-C kills both.
#
# Prereqs:
#   - ./ops/scripts/init:devnet has run once (produces ops/artifacts/devnet/)
#   - apps/dashboard/.env exists (copy from .env.example)
#   - npm install has been run at the repo root
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

ATTESTOR="$REPO_ROOT/ops/artifacts/devnet/attestor.json"
if [[ ! -f "$ATTESTOR" ]]; then
  echo "[dev] missing $ATTESTOR — run: npm --prefix ops/scripts run init:devnet" >&2
  exit 1
fi
if [[ ! -f "$REPO_ROOT/apps/dashboard/.env" ]]; then
  echo "[dev] missing apps/dashboard/.env — cp apps/dashboard/.env.example apps/dashboard/.env" >&2
  exit 1
fi

echo "[dev] starting optimizer on :4000"
(
  cd services/optimizer
  YIELDFY_ATTESTOR_KEY="$(cat "$ATTESTOR")" \
  SOLANA_RPC_URL="${SOLANA_RPC_URL:-https://api.devnet.solana.com}" \
  PORT=4000 \
  npx tsx watch src/server.ts
) &
OPT_PID=$!

echo "[dev] starting dashboard on :8080"
npm -w @yieldfy/dashboard run dev &
DASH_PID=$!

trap 'echo "[dev] shutting down"; kill $OPT_PID $DASH_PID 2>/dev/null; wait 2>/dev/null; exit 0' INT TERM

echo "[dev] ready:"
echo "  optimizer → http://localhost:4000"
echo "  dashboard → http://localhost:8080"
echo "[dev] Ctrl-C to stop"

wait

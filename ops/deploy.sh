#!/usr/bin/env bash
# Yieldfy Anchor program deploy helper.
# Usage: ./ops/deploy.sh [devnet|mainnet-beta]
#
# Steps:
#   1. anchor build
#   2. anchor deploy --provider.cluster <cluster>
#   3. copy IDL → packages/sdk/src/idl/yieldfy.json
#   4. print the program ID so it can be pasted into apps/dashboard/.env
#      (VITE_YIELDFY_PROGRAM_ID) and programs/yieldfy/src/lib.rs declare_id!.
set -euo pipefail

CLUSTER="${1:-devnet}"
if [[ "$CLUSTER" != "devnet" && "$CLUSTER" != "mainnet-beta" ]]; then
  echo "usage: $0 [devnet|mainnet-beta]" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "[deploy] building anchor program"
anchor build

echo "[deploy] deploying to $CLUSTER"
anchor deploy --provider.cluster "$CLUSTER"

IDL_SRC="$REPO_ROOT/target/idl/yieldfy.json"
IDL_DST="$REPO_ROOT/packages/sdk/src/idl/yieldfy.json"
if [[ -f "$IDL_SRC" ]]; then
  cp "$IDL_SRC" "$IDL_DST"
  echo "[deploy] idl -> $IDL_DST"
else
  echo "[deploy] WARN: $IDL_SRC not found — anchor build may have failed" >&2
fi

PROGRAM_ID="$(solana address -k "$REPO_ROOT/target/deploy/yieldfy-keypair.json")"
echo "[deploy] program id: $PROGRAM_ID"
echo
echo "next steps:"
echo "  1. set VITE_YIELDFY_PROGRAM_ID=$PROGRAM_ID in apps/dashboard/.env"
echo "  2. if the id differs from declare_id! in programs/yieldfy/src/lib.rs,"
echo "     update it, rebuild, and redeploy."
echo "  3. npm -w @yieldfy/sdk run build"
echo "  4. bump packages/sdk version, tag sdk-vX.Y.Z to trigger release-sdk.yml"

#!/usr/bin/env bash
# Bulk-fetch every arXiv paper cited in ar5iv.css comments.
# Use as the regression corpus seed for `node tools/visual.mjs`.
#
# Skips IDs that already have a local copy (so re-runs are cheap).
# Reports failures at the end; doesn't abort on a single fetch error.
#
# Usage:
#   ./examples/fetch-corpus.sh          # default source: arxiv (newer)
#   ./examples/fetch-corpus.sh ar5iv    # use the older ar5iv labs build

set -uo pipefail

SOURCE="${1:-arxiv}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CORPUS_FILE="$REPO_ROOT/tools/corpus.txt"

# Paper IDs are the single source of truth in tools/corpus.txt.
# Read one ID per non-blank, non-comment line.
mapfile -t IDS < <(grep -v '^\s*\(#\|$\)' "$CORPUS_FILE" | grep -v '^$')

FAILED=()
SKIPPED=()
FETCHED=()

for ID in "${IDS[@]}"; do
  SAFE_ID="${ID//\//_}"
  LOCAL="$SCRIPT_DIR/$SOURCE-$SAFE_ID.html"
  if [[ -f "$LOCAL" ]]; then
    SKIPPED+=("$ID")
    continue
  fi
  echo "fetching $ID..."
  if "$SCRIPT_DIR/fetch.sh" -s "$SOURCE" "$ID" > /dev/null 2>&1; then
    FETCHED+=("$ID")
  else
    FAILED+=("$ID")
  fi
done

echo
echo "fetched: ${#FETCHED[@]}  skipped (already present): ${#SKIPPED[@]}  failed: ${#FAILED[@]}"
if (( ${#FAILED[@]} )); then
  echo
  echo "failed IDs (may be withdrawn, renamed, or just not yet HTML-rendered):"
  printf '  %s\n' "${FAILED[@]}"
fi

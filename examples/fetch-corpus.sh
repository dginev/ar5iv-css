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

# Paper IDs harvested from `ar5iv.css` comments. Update by re-running:
#   grep -oE 'arXiv:[0-9]{4}\.[0-9]{4,5}(v[0-9]+)?|arXiv:[a-z-]+/[0-9]{7}|[^0-9a-zA-Z][0-9]{4}\.[0-9]{4,5}(v[0-9]+)?|[a-z-]{2,}/[0-9]{7}' css/ar5iv.css \
#     | grep -oE '[0-9]{4}\.[0-9]{4,5}(v[0-9]+)?|[a-z-]{2,}/[0-9]{7}' \
#     | sort -u
IDS=(
  0708.2787
  0709.4011
  0709.4426
  0901.0489
  1004.5196
  1109.5581
  1403.1525
  1502.04633
  1504.02179
  1604.02256
  1607.01446
  1701.00123
  1703.08608
  1707.04393
  1708.02728
  1712.01103
  1810.10704
  1909.02255
  1910.06706
  1910.06709
  1910.08129
  1911.01547
  1912.02875
  2005.00832
  2006.09882
  2006.13760
  2006.16852
  2105.00613
  2105.04227
  2105.10386
  2106.15835
  2108.04810
  2109.04981
  2110.07681
  2111.00396
  2111.08099
  2111.15640
  2201.00244
  2406.04076
  2407.16893
  2501.11021
  2503.09799
  2510.11037
  astro-ph/0001001
  cs/0001008
  hep-th/0001161
  math/0002050
)

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

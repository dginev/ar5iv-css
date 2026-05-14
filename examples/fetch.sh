#!/usr/bin/env bash
# Fetch an arXiv article and rewrite its stylesheet references to use
# the local css/ directory, so the page can be opened directly in a
# browser while testing local CSS edits.
#
# Two sources:
#   ar5iv  (default) — https://ar5iv.labs.arxiv.org/html/<id>
#                      uses ar5iv's older LaTeXML build.
#   arxiv           — https://arxiv.org/html/<id>
#                      uses arxiv.org's newer LaTeXML, which emits
#                      `--ltx-*-color` custom properties on inline
#                      `style=""` — that's the surface the
#                      `--fn-*` dark-mode inversion targets.
#                      Use this source when demoing colour behaviour.
#
# Usage:
#   ./fetch.sh <arxiv-id>                e.g. ./fetch.sh 1910.06709
#   ./fetch.sh -s arxiv <arxiv-id>       e.g. ./fetch.sh -s arxiv 2501.11021
#   ./fetch.sh -s ar5iv <arxiv-id>       e.g. ./fetch.sh -s ar5iv astro-ph/0001001
#
# Output: examples/<source>-<id>.html (with the unmodified copy at
#         <source>-<id>.original.html)
#
# All root-relative URLs other than the two repo-owned stylesheets are
# absolutised back to the source host so the page chrome still works.

set -euo pipefail

SOURCE="ar5iv"
if [[ "${1:-}" == "-s" ]]; then
  SOURCE="$2"
  shift 2
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 [-s ar5iv|arxiv] <arxiv-id>" >&2
  exit 1
fi

case "$SOURCE" in
  ar5iv) HOST="https://ar5iv.labs.arxiv.org" ;;
  arxiv) HOST="https://arxiv.org" ;;
  *) echo "Unknown source: $SOURCE (expected ar5iv or arxiv)" >&2; exit 1 ;;
esac

ID="$1"
SAFE_ID="${ID//\//_}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ORIGINAL="$SCRIPT_DIR/$SOURCE-$SAFE_ID.original.html"
LOCAL="$SCRIPT_DIR/$SOURCE-$SAFE_ID.html"

curl -sSL --fail -o "$ORIGINAL" "$HOST/html/$ID"

# Use ERE so the (a|b) alternation works portably across GNU/BSD sed.
# Stylesheet rewrites cover both source endpoints:
#   ar5iv.labs.arxiv.org → /assets/ar5iv*.css
#   arxiv.org/html       → /static/browse/.../arxiv-html-papers-*.css
# In both cases we redirect the main theme stylesheet to our local
# ar5iv.css and drop the fonts link onto our local ar5iv-fonts.css.
sed -E \
  -e 's|href="/assets/ar5iv-fonts\.[0-9.]+\.css"|href="../css/ar5iv-fonts.css"|g' \
  -e 's|href="/assets/ar5iv\.[0-9.]+\.css"|href="../css/ar5iv.css"|g' \
  -e 's|href="/static/browse/[^"]*arxiv-html-papers[^"]*\.css"|href="../css/ar5iv.css"|g' \
  -e 's|href="/static/[^"]*arxiv-fonts[^"]*\.css"|href="../css/ar5iv-fonts.css"|g' \
  -e "s|(href\|src)=\"/\"|\\1=\"$HOST/\"|g" \
  -e "s|(href\|src)=\"/([^\"/])|\\1=\"$HOST/\\2|g" \
  "$ORIGINAL" > "$LOCAL"

# Inject our ar5iv-fonts.css link if the source didn't have one to
# rewrite (arxiv.org/html sometimes inlines font-face declarations
# rather than @link-ing a separate fonts stylesheet).
if ! grep -q 'ar5iv-fonts\.css' "$LOCAL"; then
  sed -i 's|<link href="../css/ar5iv.css"|<link rel="stylesheet" href="../css/ar5iv-fonts.css" /><link href="../css/ar5iv.css"|' "$LOCAL"
fi

echo "Wrote $LOCAL"
echo "Open in a browser:   file://$LOCAL"

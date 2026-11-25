#!/usr/bin/env bash
# Export the committed HEAD as a clean deploy folder for one edition.
#   scripts/export-edition.sh en /path/to/out   -> English site (lumen-eye-clinic)
#   scripts/export-edition.sh he /path/to/out   -> Hebrew site  (lumen-eye-clinic-he)
# Deploy from the exported folder (not a git worktree): the Netlify uploader follows
# git links back to the live working tree, which may contain unfinished agent edits.
set -euo pipefail
locale="${1:?locale (en|he)}"; out="${2:?output dir}"
rm -rf "$out" && mkdir -p "$out"
git -C "$(dirname "$0")/.." archive HEAD | tar -x -C "$out"
if [ "$locale" != "en" ]; then
  sed -i "s#^  command = .*#  command = \"VITE_LOCALE=$locale npx vite build\"#" "$out/netlify.toml"
fi
echo "exported $(git -C "$(dirname "$0")/.." rev-parse --short HEAD) for '$locale' to $out"

#!/usr/bin/env bash
# Syncs the root promptscript skill (SKILL.md + references/) to the copies
# that feed the compiler.
#
# Target skill directories such as .claude/skills/ are compiler output: they are
# written by `prs compile` through includePromptScriptSkill and carry a
# generation marker. Copying an unmarked file over them makes compilation refuse
# to overwrite its own output.
#
# Usage:
#   ./scripts/sync-skill.sh          # copy root -> destinations
#   ./scripts/sync-skill.sh --check  # verify all copies match (CI mode)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/skills/promptscript"

DESTINATIONS=(
  "$ROOT/packages/cli/skills/promptscript"
  "$ROOT/.promptscript/skills/promptscript"
)

if [ ! -f "$SOURCE/SKILL.md" ]; then
  echo "ERROR: $SOURCE/SKILL.md not found" >&2
  exit 1
fi

# Hash manifest of the skill directory: relative path + content hash per file.
skill_manifest() {
  local dir="$1"
  (cd "$dir" && find . -type f | LC_ALL=C sort | while read -r f; do
    printf '%s  %s\n' "$(shasum -a 256 "$f" | cut -d' ' -f1)" "${f#./}"
  done)
}

if [ "${1:-}" = "--check" ]; then
  failed=0
  for dest in "${DESTINATIONS[@]}"; do
    if [ ! -f "$dest/SKILL.md" ]; then
      echo "MISSING: $dest" >&2
      failed=1
      continue
    fi
    if [ "$(skill_manifest "$SOURCE")" != "$(skill_manifest "$dest")" ]; then
      echo "OUT OF SYNC: $dest" >&2
      failed=1
    fi
  done
  if [ "$failed" -ne 0 ]; then
    echo "Run './scripts/sync-skill.sh' to fix." >&2
    exit 1
  fi
  echo "All promptscript skill copies in sync."
  exit 0
fi

for dest in "${DESTINATIONS[@]}"; do
  mkdir -p "$dest"
  rm -rf "$dest"
  cp -R "$SOURCE" "$dest"
  echo "Synced: $dest"
done

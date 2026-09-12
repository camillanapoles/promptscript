#!/usr/bin/env bash
set -euo pipefail
# End-to-end eval: compiles the ops-center fixture through the real CLI and
# asserts the language semantics survive compilation.
#
# Usage:
#   bash evals/run-eval.sh                    # repo checkout (CI / dev)
#   PRS_CMD=<bin> bash evals/run-eval.sh     # alternative single command
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# How to invoke the CLI. Default: the repo's own cli.ts through the swc
# loader, executed from the repo root (the bare loader specifier resolves
# there) and pointed at the fixture with --cwd. Override with a single
# command (e.g. an installed prs binary path) via PRS_CMD — it runs with
# the fixture as its working directory.
run_prs() {
  if [ -n "${PRS_CMD:-}" ]; then
    (cd "$WORK" && $PRS_CMD "$@")
  else
    (cd "$ROOT" && node --import @swc-node/register/esm-register \
      ./packages/cli/src/cli.ts "$@" --cwd "$WORK")
  fi
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cp -R "$ROOT/evals/fixtures/ops-center/." "$WORK/"
cd "$WORK"

run_prs validate --strict
run_prs compile

# Template parameter interpolation via @inherit
grep -q "ops-center" CLAUDE.md
grep -q "8080" CLAUDE.md
# field! replacement in @extend
grep -q "Use Vitest" CLAUDE.md
if grep -q "Use Jest" CLAUDE.md; then echo "eval fail: inherited value survived field! replacement" >&2; exit 1; fi
# @override of an imported field
grep -q "PascalCase components ONLY" CLAUDE.md
if grep -q "kebab-case files" CLAUDE.md; then echo "eval fail: @override did not replace" >&2; exit 1; fi
# @header section title
grep -q "Engineering Rules" CLAUDE.md
# @use fragment with only-filter kept standards and knowledge
grep -q "Conventional Commits" CLAUDE.md
grep -q "Release checklist" CLAUDE.md

# Emitted artifacts
test -f .claude/skills/deploy/SKILL.md
test -f .claude/agents/reviewer.md
test -f .github/agents/reviewer.md
test -f .github/prompts/test.prompt.md
test -f .cursor/commands/test.md
test -f .claude/skills/promptscript/SKILL.md
# Hook emitted for claude, omitted for github (target override)
grep -q "greet" .claude/settings.json
if grep -rq "greet" .github/hooks/ 2>/dev/null; then echo "eval fail: greet leaked into github hooks" >&2; exit 1; fi
# Markdown skill composed as a phase with provenance
grep -q "Phase 1: vue-review" .claude/skills/deploy/SKILL.md

echo "eval: ops-center fixture OK"

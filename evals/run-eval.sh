#!/usr/bin/env bash
# End-to-end eval: compiles the ops-center fixture through the real CLI and
# asserts the language semantics survive compilation.
#
# Usage:
#   PRS_CMD="pnpm prs" bash evals/run-eval.sh   # from-repo (CI / dev)
#   PRS_CMD="prs" bash evals/run-eval.sh        # installed CLI
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PRS_CMD="${PRS_CMD:-pnpm prs}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cp -R "$ROOT/evals/fixtures/ops-center/." "$WORK/"
cd "$WORK"

$PRS_CMD validate --strict
$PRS_CMD compile

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

# ADR-0001: Bundled skill conforms to the Agent Skills spec

- **Status**: Accepted (2026-09-11)
- **Supersedes**: none

## Context

The auto-injected `promptscript` skill (`skills/promptscript/SKILL.md`) is
distributed to every compilation target and installed standalone in shared
skill directories such as `~/.agents/skills/`. The Agent Skills specification
(agentskills.io) governs that format, and the official `skills-ref` validator
rejected our file on two counts:

- `compatibility` was a YAML list; the spec requires a string of at most 500
  characters describing environment requirements.
- `user-invocable` is not a spec field; only `name`, `description`, `license`,
  `compatibility`, `metadata`, and `allowed-tools` are allowed.

The body was also 1316 lines (~11.5k tokens) against the spec's progressive
disclosure guidance (<500 lines, <5k tokens in `SKILL.md`, deep material in
`references/`).

## Decision

1. Frontmatter carries only spec-allowed fields. `user-invocable` is dropped:
   the Factory target defaults it to `true` and only emits non-defaults, so the
   filtered output is semantically identical.
2. `SKILL.md` becomes a ~210-line core (frontmatter, file structure, content
   types, version gates, quick composition rules, workflow, gotchas, migration)
   plus seven `references/*.md` files loaded on demand, with a routing table and
   an explicit fallback note for single-file injected copies.
3. `scripts/sync-skill.sh` syncs the whole skill directory (references
   included) with a hash-manifest check mode.

## Consequences

- `skills-ref validate` passes; harnesses that warn on spec violations stay
  quiet (pi, Claude Code, GitHub Copilot, …).
- Every invocation loads ~2.9k tokens instead of ~11.5k.
- Compiled single-file injections ship the core with the fallback note; full
  directories (repo, `~/.agents`) ship the references too.
- The Factory frontmatter filter test was updated: filtered output is
  `{name, description}` because the redundant explicit default no longer
  exists in the source.

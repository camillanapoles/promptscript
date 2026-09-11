---
# promptscript-generated: 2026-09-11T20:10:00.000Z | source: .promptscript/project.prs | target: claude
name: promptscript
description: >-
  PromptScript language expert for reading, writing, modifying, and
  troubleshooting .prs files. Use when working with PromptScript syntax,
  creating or editing .prs files, adding blocks like @identity, @standards,
  @restrictions, @shortcuts, @skills, or @agents, configuring
  promptscript.yaml, resolving compilation errors, understanding inheritance
  (@inherit), composition (@use, @extend, @override), contextual @header
  metadata, or migrating AI instructions to PromptScript. Also use when asked
  about the 49 built-in compilation targets, including GitHub Copilot, Claude
  Code, Cursor, Antigravity, Factory AI, and AGENTS.md-based platforms.
license: MIT
compatibility: Any Agent Skills-compatible agent. Compiling or validating .prs files additionally requires the prs CLI (Node.js 20+).
allowed-tools: Read Write Glob Grep Bash
metadata:
  author: PromptScript
  homepage: https://getpromptscript.dev
---

# PromptScript Language Guide

PromptScript is a domain-specific language that compiles `.prs` files into native instruction formats for AI coding assistants (GitHub Copilot, Claude Code, Cursor, Antigravity, Factory AI, OpenCode, Gemini CLI). One source of truth, multiple outputs.

This file holds the knowledge needed on every task. Deep-dive material lives in `references/` — load it on demand:

| Read this file…               | …when the task involves                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `references/blocks.md`        | Writing or reviewing any `@block`: properties, shapes, `@skills` (params, dependencies, contracts, shared resources), `@agents`, `@examples`, `@header`                                               |
| `references/composition.md`   | `@inherit`, `@use` (URL imports, registries, block filtering, markdown imports), `@extend` (`field!`, skill-aware merge, negation, sealed), `@override`, inline skill composition, template variables |
| `references/hooks-plugins.md` | `@hooks` (events, scripts, per-target overrides), `@mcpServers`, `@plugins`                                                                                                                           |
| `references/configuration.md` | `promptscript.yaml` (targets, registries, auto-injection), lockfile, policy engine                                                                                                                    |
| `references/validation.md`    | Syntax version gates, PS0XX validation rules, `prs validate --fix`, `prs upgrade`                                                                                                                     |
| `references/cli.md`           | Exact flags for any `prs` command                                                                                                                                                                     |
| `references/targets.md`       | Output paths per target, PS4001 collision reconciliation, formatter docs, auto-compilation hooks                                                                                                      |

If `references/` is not present next to this file (single-file injected copy), the core below still applies; for deep detail run `prs <command> --help` or read https://getpromptscript.dev/.

## Core Workflow

1. Write or edit `.prs` source files under `.promptscript/` (`prs init` scaffolds a new project and auto-detects existing files).
2. `prs validate --strict` — fix errors before compiling.
3. `prs compile` — regenerate native outputs. `.prs` changes take effect only after compiling.
4. `prs diff --target <name>` — verify the generated output changed as intended.

Migrating existing AI instructions: `prs import CLAUDE.md` (auto-detects the source format) or `prs migrate` for the interactive flow — see [Migration](#migration) below.

## File Structure

A `.prs` file contains ordered declarations. Syntax `1.5.0` applies `@inherit`,
`@use`, local blocks, `@extend`, and `@override` in source order. Put `@meta`
first.

```
# Comments start with #

@meta { ... }           # Required metadata
@inherit @path          # Single inheritance (optional)
@use @path [as alias]   # Imports/mixins (optional, multiple)

@identity { ... }       # AI persona
@context { ... }        # Project context
@standards { ... }      # Coding conventions
@restrictions { ... }   # Hard rules
@shortcuts { ... }      # Command aliases
@knowledge { ... }      # Reference documentation
@skills { ... }         # Reusable skill definitions
@agents { ... }         # Subagent definitions
@workflows { ... }      # Repeatable agent procedures
@examples { ... }       # Few-shot input/output examples (syntax 1.2.0+)
@params { ... }         # Template parameters
@guards { ... }         # File globs and priorities
@hooks { ... }          # Portable lifecycle hooks (syntax 1.4.0+)
@mcpServers { ... }     # MCP server configurations (syntax 1.4.0+)
@plugins { ... }        # Capability bundles (syntax 1.4.0+)
@local { ... }          # Private config (not committed)
@extend path { ... }    # Modify imported blocks
@override path { ... }  # Replace one complete existing target (syntax 1.5.0+)
@custom-name { ... }    # Arbitrary named blocks
```

Contextual `@header` entries appear inside supported owner blocks, not at the
top level.

## Content Types

PromptScript has four canonical content shapes inside blocks:

### Text Content

Use triple quotes (three double-quote characters) to wrap multiline text.
Text is automatically dedented - leading whitespace from source indentation is stripped.
Use for prose, markdown, or freeform content.

Example: `@identity` with a text block describing an AI persona starting with "You are..."

### Object Content (key-value pairs)

```
@context {
  project: "My App"
  team: "Frontend"
  monorepo: {
    tool: "Nx"
    packageManager: "pnpm"
  }
}
```

Values can be strings (quoted or unquoted), numbers, booleans, nested objects, or arrays.

### Array Content

```
@standards {
  code: [
    "Use strict TypeScript",
    "Named exports only"
  ]
}

@restrictions {
  - "Never use any type"
  - "Never commit secrets"
}
```

### Mixed Content

Blocks can contain both object properties and text in the same block.
Place the triple-quoted text block alongside key-value pairs.

## Syntax Version Gates

The `syntax` field in `@meta` declares the language version (semver). Features are gated:

- `1.1.0` — `@agents`, `@workflows`
- `1.2.0` — `@examples`
- `1.3.0` — explicit regular block field replacement (`field!: value`)
- `1.4.0` — `@hooks`, `@mcpServers`, `@plugins`
- `1.5.0` — `@header` section titles, `@override`, unquoted `${VAR}` values

All other built-in blocks are available from `1.0.0`. Version mismatch diagnostics and auto-fix: `references/validation.md`.

## Inheritance and Composition — Quick Rules

- `@inherit` — single, linear, one per file. Child blocks merge on top of parent. `@use` — multiple mixins.
- Merge rules: text concatenated with deduplication; objects deep merged (imported source wins same-shape conflicts); arrays unique concatenation; shape mismatch — existing target body wins.
- `@extend` adds to imported/inherited blocks; `field!: value` replaces one regular field (1.3.0+); `@override path { … }` atomically replaces a complete existing target (1.5.0+, target must exist).
- Template variables `{{var}}` are defined in a parent file's `@meta` `params` and passed by the child via `@inherit ./parent(key: value)` or `@use` — never from `promptscript.yaml` or CLI flags.
- Alias imports (`@use @core/typescript as ts`) enable targeted `@extend ts.standards { … }`.

Full semantics (URL imports, registries, block filtering, markdown imports, skill-aware merge strategies, `!` negation, sealed properties, overlay warnings, inline skill composition): `references/composition.md`.

## Project Organization

Typical modular structure:

```
.promptscript/
  project.prs      # Entry: @meta, @inherit, @use, @identity, @agents
  context.prs      # @context (architecture, tech stack)
  standards.prs    # @standards (coding conventions)
  restrictions.prs # @restrictions (hard rules)
  commands.prs     # @shortcuts and @knowledge
```

The entry file uses `@use ./context`, `@use ./standards`, etc. to compose them.

## Gotchas

1. Missing @meta block - every .prs file needs `@meta` with `id` and `syntax`
2. Multiple @inherit - only one per file; use `@use` for additional imports
3. Extending an unknown path - target an inherited or local block, or use an imported alias
4. Unquoted strings with special chars - quote strings containing `:`, `#`, `{`, `}`
5. Forgetting to compile - `.prs` changes need `prs compile` to take effect
6. Triple quotes inside triple quotes - not supported; describe content textually instead
7. Using `{{var}}` in the root file without `@inherit` - template variables only work
   in a parent file that defines `params` in `@meta`, with values passed by the child
   via `@inherit ./parent(key: value)` or `@use ./fragment(key: value)`. They are NOT
   set from `promptscript.yaml` or CLI flags
8. Using `@examples` with `syntax: "1.0.0"` or `"1.1.0"` - `@examples` requires
   syntax version `1.2.0`. Run `prs validate --fix` to auto-upgrade

## Migration

### Automated: `prs import`

The fastest way to convert existing AI instructions to PromptScript:

```
prs import CLAUDE.md                    # Convert a single file
prs import .github/copilot-instructions.md
prs import AGENTS.md --output ./imported
prs import --dry-run CLAUDE.md          # Preview without writing
```

`prs import` automatically detects the source format (Claude, GitHub Copilot,
Cursor, Factory, etc.), maps content to appropriate PromptScript blocks,
generates a valid `.prs` file with `@meta` block, and preserves the original
intent and structure.

Supported source formats:

- `CLAUDE.md` (Claude Code)
- `.github/copilot-instructions.md` (GitHub Copilot)
- `.cursorrules` or `.cursor/rules/*.mdc` (Cursor)
- `AGENTS.md` (Factory AI / Codex)
- `.clinerules` (Cline), `.roorules` (Roo Code)
- `.windsurf/rules/*.md` (Windsurf)
- Any Markdown-based AI instruction file

### Manual Migration

For complex migrations or when `prs import` needs refinement:

| Source Pattern                      | PromptScript Block |
| ----------------------------------- | ------------------ |
| "You are..." persona text           | `@identity`        |
| Project description, tech stack     | `@context`         |
| Coding conventions, style rules     | `@standards`       |
| "Never...", "Always...", hard rules | `@restrictions`    |
| `/command` definitions              | `@shortcuts`       |
| Skill/tool definitions              | `@skills`          |
| Agent/subagent configs              | `@agents`          |
| Reference docs, API specs           | `@knowledge`       |

After import, split into modular files (`context.prs`, `standards.prs`, etc.)
and compose with `@use` in `project.prs`. Run `prs validate --strict` then
`prs compile` to verify output matches the original.

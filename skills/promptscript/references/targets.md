# Output Targets

49 supported targets. Key examples:

| Target      | Main File                       | Skills                                             |
| ----------- | ------------------------------- | -------------------------------------------------- |
| GitHub      | .github/copilot-instructions.md | .github/skills/\*/SKILL.md                         |
| Claude      | CLAUDE.md                       | .claude/skills/\*/SKILL.md                         |
| Cursor      | .cursor/rules/project.mdc       | .agents/skills/\*/SKILL.md                         |
| Antigravity | .agent/rules/project.md         | -                                                  |
| Factory     | AGENTS.md                       | .factory/skills/\*/SKILL.md, .factory/droids/\*.md |
| OpenCode    | OPENCODE.md                     | .opencode/skills/\*/SKILL.md                       |
| Gemini      | GEMINI.md                       | .agents/skills/\*/skill.md                         |
| Windsurf    | .windsurf/rules/project.md      | .windsurf/skills/\*/SKILL.md                       |
| Cline       | .clinerules                     | -                                                  |
| Roo Code    | .roorules                       | -                                                  |
| Codex       | AGENTS.md                       | .agents/skills/\*/SKILL.md                         |
| Continue    | .continue/rules/project.md      | -                                                  |
| Hermes      | AGENTS.md                       | -                                                  |
| + 36 more   |                                 | See full list in documentation                     |

Targets that share an output path (for example Factory, Codex, and every AGENTS.md target) are
reconciled in one output plan before anything is written. Identical content merges silently;
differing content reports `PS4001`, where a formatter output replaces an earlier one and a
resource or the auto-injected PromptScript skill keeps the file already planned. Paths are compared
case-insensitively and NFC-normalized on every platform.

## Formatter Documentation

For detailed information about each formatter's output paths, supported features, quirks, and example outputs, see the PromptScript documentation at https://getpromptscript.dev/:

- **Full formatter reference:** `docs/reference/formatters/` in the PromptScript repository (https://github.com/prscrpt/promptscript) — 7 dedicated pages + index of all 49
- **llms-full.txt:** Available at the docs site root - contains all documentation in a single file for LLM consumption
- **Dedicated pages exist for:** Claude Code, GitHub Copilot, Cursor, Antigravity, Factory AI, Gemini CLI, OpenCode
- **All 49 formatters indexed at:** `docs/reference/formatters/index.md` with output paths, tier, and feature flags

## Auto-Compilation Hooks

Instead of running `prs compile --watch` manually, install hooks so your AI tool
triggers compilation automatically when you edit `.prs` files:

```
prs hooks install          # Auto-detect and install for all detected tools
prs hooks install claude   # Install for a specific tool
```

Hooks also protect generated files from direct edits — when an AI agent tries
to edit a compiled output (e.g., CLAUDE.md), the write is blocked with a message
pointing to the source `.prs` file. Supported tools: Claude Code, Factory AI,
Cursor, Windsurf, Cline, GitHub Copilot, Gemini CLI.

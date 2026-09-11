# Hooks, MCP Servers, and Plugins

Blocks for portable automation. All three require syntax `1.4.0`.

## @hooks

Portable lifecycle hooks. Each hook needs exactly one of `command` or `script`.

```
@hooks {
  validate-types: {
    event: "post-tool-use"
    matcher: "Edit|Write"
    script: {
      path: ".promptscript/scripts/validate.py"
      interpreter: "python3"
      args: ["--strict"]
    }
    cwd: "project"
    timeoutMs: 120000
    statusMessage: "Checking TypeScript"
    continueOnFailure: false
    enabled: true
    targets: {
      factory: { matcher: "Execute" }
      vscode: { matcher: "run_in_terminal" }
      github: { enabled: false }
    }
  }
}
```

Portable events:

| Event                  | Meaning                   |
| ---------------------- | ------------------------- |
| `pre-terminal-command` | Before a terminal command |
| `pre-tool-use`         | Before a tool invocation  |
| `post-tool-use`        | After a tool invocation   |
| `session-start`        | Agent session start       |
| `setup`                | Session setup             |
| `subagent-start`       | Subagent start            |
| `notification`         | Agent notification        |
| `stop`                 | Agent stop                |

`command` is a non-empty string array. Shell interpolation (`$()`, backticks,
`${...}`) is forbidden. `script` requires:

- `path` under `.promptscript/scripts/`, using forward slashes.
- Existing regular file at compile time.
- No traversal, absolute path, invalid segment, or symlink escape.
- Explicit interpreter: `python3`, `python`, `node`, `deno`, `bun`, `ruby`, `php`,
  `perl`, `bash`, `sh`, `zsh`, `pwsh`, or `powershell`.
- Optional `args` string array; each argument remains one argument.

`cwd: "project"` runs from project root. Other values are portable forward-slash
paths relative to project root. Hook config file location does not set command cwd.
Environment-root and Git-root wrappers exit before script or command execution when
the required root is unavailable. Native-cwd and workspace-cwd targets retain host
cwd fields and report `PS4002` when PromptScript cannot verify that cwd.
`timeoutMs` range is 100-600000. `matcher` uses target-native tool names, so a
matcher valid for one target may match nothing on another.

`pre-terminal-command` supplies native defaults: Factory `Execute`, Claude and
Codex `Bash`, Windsurf `pre_run_command`, Cursor `run_terminal_cmd`, Gemini
`run_shell_command`, and VS Code `run_in_terminal`. Override a native tool name
with `targets.<name>.matcher`. Cursor, Gemini, and VS Code report best-effort
`PS4002` warnings. GitHub and Grok omit the event with `PS4002`.

Target overrides may change `event`, `matcher`, `timeoutMs`, `statusMessage`,
`continueOnFailure`, `enabled`, or `cwd`. Native hook files are emitted only in
target modes that support additional files:

| Target         | Hook output                                                            | Mode                |
| -------------- | ---------------------------------------------------------------------- | ------------------- |
| Claude Code    | `.claude/settings.json`                                                | `full`              |
| Factory AI     | `.factory/hooks.json`                                                  | `multifile`, `full` |
| GitHub Copilot | `.github/hooks/promptscript.json`                                      | `multifile`, `full` |
| Cursor         | `.cursor/hooks.json`                                                   | `full`              |
| Codex          | `.codex/hooks.json`                                                    | `multifile`, `full` |
| Gemini CLI     | `.gemini/settings.json`                                                | `multifile`, `full` |
| Windsurf       | `.windsurf/hooks.json`                                                 | `multifile`, `full` |
| Grok Build     | `.grok/hooks/promptscript.json`                                        | `full`              |
| VS Code Agent  | `.github/hooks/promptscript-vscode.json` when `vscode` override exists | target-specific     |

Simple mode and targets without native project hooks report `PS4002` instead of
silently dropping hooks. Use `prs compile --watch` as fallback. Plugin-only and
agent-scoped integrations are not emitted as universal project hooks.

Each generated command carries a PromptScript ownership marker. CLI cleanup removes
only marked entries and preserves user hooks/settings. Removing `@hooks` removes a
fully owned generated hook file and prunes directories left empty. `prs hooks install factory`
migrates unambiguous legacy hooks from `.factory/settings.json`; ambiguous
entries remain for manual review.

Factory compilation performs the same migration when `.factory/hooks.json` is
absent. Use `prs compile --dry-run` to preview the changes or
`--no-migrate-factory-hooks` to keep warning-only behavior. Unknown events,
malformed entries, and mixed ownership abort without a partial migration.

`@hooks` compilation is separate from `prs hooks install`. The latter installs
auto-compilation and generated-output protection for supported AI tools. Copilot VS
Code Agent hooks use `promptscript-vscode.json`; GitHub Copilot repository hooks use
`promptscript.json`.

## @mcpServers

Project-local Model Context Protocol servers.

```
@mcpServers {
  issue-tracker: {
    transport: "stdio"
    command: ["node", "./tools/issues.mjs"]
    env: { LOG_LEVEL: "info" }
  }
}
```

Use `stdio` with `command`, or `http`/`sse` with `url`. Keep credentials out of
`.prs` files and provide them through target-native secret management.

## @plugins

Portable capability bundles.

```
@plugins {
  security-suite: {
    description: "Security review tooling"
    version: "1.0.0"
    skills: ["security-review"]
    hooks: ["validate-types"]
    mcpServers: ["issue-tracker"]
  }
}
```

# Block Reference

Detailed reference for every PromptScript block. The core file structure and content types are in `SKILL.md`.

## @meta (required)

```
@meta {
  id: "project-id"        # Required: unique identifier
  syntax: "1.0.0"         # Required: syntax version (semver)
  org: "Company Name"     # Optional
  team: "Frontend"        # Optional
  tags: [react, ts]       # Optional
  params: {               # Optional: template parameters
    projectName: string
    port: number = 3000
    debug?: boolean
    framework: enum("react", "vue") = "react"
  }
}
```

## @identity

Defines AI persona. Start with "You are..." for consistent output across all formatters.
Contains a triple-quoted text block with the persona description.

## @context

Project context with structured properties (project, team, languages, runtime)
plus optional triple-quoted text for architecture details, diagrams, etc.

## @standards

Category-based conventions. Any category name is valid:

```
@standards {
  typescript: ["Strict mode", "No any type"]
  naming: ["Files: kebab-case.ts", "Classes: PascalCase"]
  git: {
    format: "Conventional Commits"
    types: [feat, fix, docs, refactor, test, chore]
  }
}
```

Category names are arbitrary. `@standards` can also contain free-form text:

```
@standards {
  """
  ## Formatting
  Preserve heading structure and use four-space indentation.

  ## Testing
  Add regression coverage for every behavior change.
  """
  typescript: ["Strict mode", "Named exports only"]
  git: {
    format: "Conventional Commits"
  }
}
```

Free-form text is dedented and rendered with its Markdown heading structure. Factory
monolith output nests it under `Conventions & Patterns`; split Factory rules adjust
heading levels relative to the generated section. Custom structured categories remain
available to formatters that support them.

## @restrictions

Hard rules as a list of dash-prefixed strings:

```
@restrictions {
  - "Never expose API keys"
  - "Never commit secrets to version control"
  - "Always validate user input"
}
```

## @shortcuts

Simple strings appear as documentation. Objects with `prompt: true` generate
executable prompt/command files for GitHub Copilot and Cursor:

```
@shortcuts {
  "/review": "Review code for quality"
  "/test": {
    prompt: true
    description: "Write unit tests"
    content: (triple-quoted text with instructions)
  }
}
```

> `@commands` is a backwards-compatible alias for `@shortcuts` — prefer `@shortcuts` in new files.

## @skills

Reusable skill definitions with metadata:

```
@skills {
  commit: {
    description: "Create git commits"
    trigger: "commit, git commit"
    disableModelInvocation: true
    userInvocable: true
    allowedTools: ["Bash", "Read"]
    content: (triple-quoted text with skill instructions)
  }
}
```

Properties: description (required), content (required), trigger, disableModelInvocation,
userInvocable, allowedTools, context ("fork" or "inherit"), agent, requires, references, inputs, outputs.

The `references` property attaches external files to the skill's context:

```
@skills {
  architecture-review: {
    description: "Review architecture decisions"
    references: [
      ./references/architecture.md
      ./references/modules.md
    ]
    content: (triple-quoted text)
  }
}
```

Allowed file types: `.md`, `.json`, `.yaml`, `.yml`, `.txt`, `.csv`. Paths are resolved relative
to the `.prs` file. Formatters emit referenced files alongside SKILL.md in the output directory.

### Parameterized Skills

Skills in `.promptscript/skills/<name>/SKILL.md` support template parameters via
YAML frontmatter. Define `params` in frontmatter and use `{{variable}}` in content:

```yaml
---
name: review
description: 'Review {{language}} code for {{standard}}'
params:
  language:
    type: string
  standard:
    type: string
    default: 'best practices'
references:
  - references/architecture.md
---
Review the code using {{language}} conventions following {{standard}}.
```

The `references` field in SKILL.md frontmatter lists files to attach to the skill's context.
Paths are relative to the SKILL.md file.

Imported SKILL.md frontmatter is bounded: 256 KiB per document, 10,000 YAML nodes, 32 nesting
levels, 2,000 entries per mapping or sequence, and 64 KiB per string value. Documents over any
limit are rejected before their YAML values are converted.

Pass values in `@skills` block:

```
@skills {
  review: {
    description: "Review code"
    language: "typescript"
    standard: "strict mode"
  }
}
```

Non-reserved properties (anything other than description, content, trigger,
userInvocable, allowedTools, disableModelInvocation, context, agent, requires,
inputs, outputs) are treated as skill parameter arguments.

### Skill Dependencies

Skills can declare dependencies on other skills via `requires`:

```
@skills {
  deploy: {
    description: "Deploy service"
    requires: ["lint-check", "test-suite"]
    content: (triple-quoted text)
  }
}
```

The validator (PS016) checks that required skills exist, detects self-references,
and catches circular dependency chains.

### Skill Contracts (Inputs/Outputs)

Skills can declare typed inputs and outputs in SKILL.md frontmatter:

```yaml
---
name: security-scan
description: 'Scan for vulnerabilities'
inputs:
  files:
    description: 'Files to scan'
    type: string
  severity:
    description: 'Minimum severity'
    type: enum
    options: [low, medium, high]
    default: medium
outputs:
  report:
    description: 'Scan report'
    type: string
  passed:
    description: 'Whether scan passed'
    type: boolean
---
```

Field types: `string`, `number`, `boolean`, `enum` (with `options` list).
The validator (PS017) checks field types, ensures enum fields have options,
and warns if param names collide with input names.

### Shared Resources

Skills in a folder can share common resources via `.promptscript/shared/`:

```
.promptscript/
  shared/
    templates.md         # Shared across all skills
    style-guide.md
  skills/
    review/
      SKILL.md           # Gets @shared/templates.md, @shared/style-guide.md
    deploy/
      SKILL.md           # Also gets shared resources
```

Files in `shared/` are automatically included in every skill with `@shared/` prefix.

## @agents

Custom subagent definitions. Compiles to `.claude/agents/` for Claude Code,
`.github/agents/` for GitHub Copilot, `.factory/droids/` for Factory AI, etc.

```
@agents {
  code-reviewer: {
    description: "Reviews code quality"
    tools: ["Read", "Grep", "Glob", "Bash"]
    model: "sonnet"
    permissionMode: "default"
    content: (triple-quoted text with agent instructions)
  }
}
```

Imported agent definitions are qualified by an aliased `@use`:

```
@use ./frontend-team as frontend
@use ./backend-team as backend
```

If both imports define `reviewer`, the resolved names are `frontend.reviewer` and
`backend.reviewer`. Unique unaliased imports keep their original names. Conflicting unaliased
definitions stop compilation with source and import diagnostics instead of silently overwriting
one another. Native targets map dots to hyphens, so `frontend.reviewer` becomes
`frontend-reviewer`.

Supports mixed models per agent: `specModel` sets a different model for
Specification/planning mode (GitHub, Factory), `specReasoningEffort` sets reasoning
effort for the spec model (Factory only, values: "low", "medium", "high").

Factory AI droids support additional properties: `model` (any model ID or "inherit"),
`reasoningEffort` ("low", "medium", "high"), and `tools` (category name like "read-only"
or array of tool IDs).

## @workflows

Repeatable multi-step agent procedures. Requires syntax `1.1.0`.

```
@workflows {
  release: {
    description: "Prepare a validated release"
    content: """
      1. Run formatting, linting, type checks, and tests.
      2. Validate compiled output.
      3. Stop before publishing and request approval.
    """
  }
}
```

Targets with native workflow discovery emit dedicated workflow files. Other targets
retain workflow instructions in their main output when supported.

## @examples

Structured few-shot examples for AI assistants (requires syntax `1.2.0`):

```
@meta {
  id: "commit-style"
  syntax: "1.2.0"
}

@examples {
  feat-commit: {
    description: "Feature commit with scope"
    input: "Added user authentication with JWT tokens"
    output: "feat(auth): add JWT-based user authentication"
  }
}
```

Each entry is a named example with `input` and `output` (both required),
plus optional `description`. Multi-line content uses triple-quoted strings.

Examples can also be attached to skills via the `examples` property:

```
@skills {
  commit: {
    description: "Create conventional commits"
    examples: {
      basic: {
        input: "Added dark mode toggle"
        output: "feat(settings): add dark mode toggle"
      }
    }
    content: (triple-quoted text)
  }
}
```

## @knowledge

Reference documentation as triple-quoted text. Used for command references,
API docs, and other material that should appear in the output.

## @params

Template parameter definitions with types: string, number, boolean, enum("a", "b").
Optional parameters use `?` suffix. Defaults use `= value`.

## @guards

File glob patterns and priority rules for path-specific instructions.

## @local

Private local configuration. Not included in compiled output or committed to git.

## Custom Blocks

`@custom-name { ... }` declares arbitrary named blocks for project-specific data.
Unknown block names produce warning PS019 with fuzzy-match suggestions.

## Generated Section Headers (@header, syntax 1.5.0)

Use `@header` inside a registered owner block to rename human-readable output
sections without changing filenames, frontmatter, XML tags, or structured keys:

```promptscript
@meta { id: "localized" syntax: "1.5.0" }

@standards {
  @header "Coding Rules"
  @header git-commits "Commit Rules"
  code: ["Use strict TypeScript"]
}
```

- `@header "Title"` targets the block's primary section.
- `@header <section-key> "Title"` targets an owned derived section.
- Titles must be non-empty, single-line strings.
- Source overrides take precedence over formatter configuration and target defaults.
- Child inheritance, imported source, and the latest root extension take precedence.
- An initial `## Heading` in a registered text-only primary owner is a syntax
  1.5.0 compatibility fallback. Explicit `@header` metadata wins.
- Ordinary `header` and `headers` fields remain domain data.

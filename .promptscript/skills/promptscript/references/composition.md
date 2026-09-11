# Inheritance and Composition

How `.prs` files share and modify content.

## @inherit (single, linear)

One per file. Child blocks merge on top of parent:

```
@inherit @company/frontend-team
@inherit ./parent
@inherit @stacks/react-app(projectName: "my-app", port: 3000)
```

## @use (multiple, mixins)

Import and merge fragments:

```
@use @core/security
@use @core/quality
@use ./local-config
@use @core/typescript as ts   # alias enables @extend access
```

### URL imports (Go-module style)

Import directly from any Git repository by host path - no alias required:

```
@use github.com/acme/shared-standards/@fragments/security
@use gitlab.com/myorg/prompts/@stacks/python
```

Version pinning with `@`:

```
@use github.com/acme/shared-standards/@org/base@1.2.0    # exact version
@use github.com/acme/shared-standards/@org/base@^1.0.0   # semver range
@use github.com/acme/shared-standards/@org/base@main     # branch
```

### Registry aliases

Short names for Git repository URLs, configured in `promptscript.yaml`:

```yaml
registries:
  company:
    url: github.com/acme/promptscript-registry
```

Then use the alias as scope prefix:

```
@use @company/security
@inherit @company/base-config
```

Merge rules:

- Text: concatenated with deduplication
- Objects: deep merged (imported source wins same-shape conflicts)
- Arrays: unique concatenation
- Shape mismatch: existing target body wins

Under syntax `1.5.0`, later local blocks, `@extend`, and `@override`
operations apply to the accumulated import result in declaration order.

## Block Filtering

Control which blocks are imported using the reserved `only` and `exclude` parameters:

```
@use ./shared-config(only: ["skills", "context"])
@use ./shared-config(exclude: ["knowledge"])
@use ./shared-config(exclude: ["knowledge"], mode: "strict")
```

Rules:

- `only` and `exclude` are mutually exclusive — using both is a validation error (PS021)
- Values are block type names: `identity`, `context`, `standards`, `knowledge`, `skills`, `shortcuts`, `agents`, etc.
- Block filtering does not apply to `@inherit` directives

## Markdown Imports

Import skills directly from `.md` files (v1.8+). No external tools needed:

```
@use ./skills/frontend-design.md
@use ./shared/commit.md as commit
@use github.com/anthropics/skills/commit@1.0.0
@use github.com/repo/skills/gitnexus         # directory → SKILL.md
```

Content detection: PromptScript blocks in `.md` are parsed as a `.prs` fragment;
YAML frontmatter with `name`/`description` is loaded as a skill definition;
otherwise content is treated as free-form knowledge.

CLI management:

```
prs skills add github.com/anthropics/skills/commit@1.0.0
prs skills remove commit
prs skills list
prs skills update
```

## @extend (modify existing or imported blocks)

Use a direct path for inherited or local blocks:

```
@extend standards.testing {
  coverage: 95
}
```

Use an alias when targeting a specific imported block:

```
@use @core/typescript as ts

@extend ts.standards {
  testing: { coverage: 95 }
}
```

### Replacing regular block fields

Syntax `1.3.0` supports explicit replacement of complete regular block field values:

```
@meta { id: "project" syntax: "1.3.0" }

@inherit ./company-base

@extend standards {
  testing!: ["Use Vitest"]
  linting: ["Use ESLint"]
}
```

`testing!` replaces the inherited value. Fields without `!` keep normal merge behavior.
Replacement works after `@inherit` and `@use`, including aliases and nested target paths.
A missing field is set. The modifier is rejected for `@skills`, which retain their dedicated
merge and sealing semantics.

### Replacing complete targets with @override

Syntax `1.5.0` adds atomic replacement for an existing block or nested value:

```
@meta { id: "project" syntax: "1.5.0" }

@standards {
  testing: ["Use Jest", "Use Mocha"]
}

@override standards.testing {
  ["Use Vitest"]
}
```

`@override` requires the complete target path to exist, applies in declaration
order, and cannot bypass sealed skill properties. Later `@extend` declarations
merge into the replacement. Use `@extend` for additive changes, `field!` for
compatibility replacement of one direct regular field, and `@override` for
intentional complete replacement.

### Skill-aware @extend semantics

When extending a skill definition via `@extend`, individual skill properties follow specific merge
strategies rather than the generic block merge rules:

| Strategy          | Properties                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Replace**       | content, description, trigger, userInvocable, allowedTools, disableModelInvocation, context, agent, license |
| **Append**        | references, examples, requires                                                                              |
| **Shallow merge** | params, inputs, outputs                                                                                     |

Example — extending a base skill to add references and override content:

```
@use @company/skills as skills

@extend skills.code-review {
  content: (triple-quoted text with overridden instructions)
  references: [
    ./extra-context.md
  ]
}
```

The `references` array from the base skill and the overlay are combined (append). The `content`
field from the overlay replaces the base (replace).

### Reference negation

Use `!` prefix in `@extend` to remove entries from a lower layer's append-strategy arrays:

```
@extend skills.code-review {
  references: [
    "!references/deprecated.md"
    "references/replacement.md"
  ]
}
```

Path matching is normalized (`"!./foo.md"` matches `"foo.md"`). Only works in `@extend` blocks
on `references` and `requires`. Validator PS028 warns about `!` in base definitions.

### Overlay consistency warnings

The resolver emits warnings during compile when an overlay drifts from its base. Always shown
(not gated by `--verbose`):

- **Orphaned extend** — `@extend target "X" not found — overlay will be ignored.` Triggered when
  the targeted block doesn't exist (base removed or renamed).
- **Stale skill target** — `@extend creates new skill "X" — base does not define it.` Triggered
  when an `@extend` inside `@skills` would create a new skill instead of extending an existing one.
- **Negation orphan** — `Negation "!path" did not match any base entry — it may be stale.`
  Triggered when a `!entry` in references/requires doesn't match anything in the base.

These come from the resolver, not the validator (PS0XX rules). They appear during `prs compile`,
not `prs validate`.

### Sealed properties

Prevent `@extend` from overriding specified replace-strategy properties:

```
@skills {
  deploy: {
    content: (triple-quoted text with critical workflow)
    sealed: ["content", "description"]
  }
}
```

`sealed: true` seals all replace-strategy properties. Attempting to override a sealed
property is a hard compilation error. Only the base skill author can set `sealed` —
overlays cannot add or modify it. Append-strategy properties remain extendable.
Validator PS029 warns about invalid entries in `sealed`.

### Skill composition (inline @use)

Import sub-skills within a `@skills` block to compose multi-phase workflows:

```
@skills {
  ops: {
    description: "Production triage"
    content: (triple-quoted text with orchestrator instructions)
  }
  @use ./phases/health-scan
  @use ./phases/triage
  @use ./phases/code-fix as autofix
}
```

Each `@use` resolves the referenced `.prs` file, extracts its skill definition and context
blocks, and flattens them as numbered phase sections into the parent skill's content. The
`as alias` form controls the phase display name. Validator PS027 checks composition validity.

## Parameterized Inheritance (Template Variables)

Use `{{variable}}` placeholders in a **parent/template** file, and pass values
from the **child** file via `@inherit` or `@use` with `(key: value)` syntax.

**IMPORTANT:** Variables are NOT set from `promptscript.yaml` or CLI. They are
passed from one `.prs` file to another through `@inherit` or `@use`.

**Step 1: Create the template** (parent file with `params` in `@meta`):

```
# base.prs - reusable template
@meta {
  id: "service-template"
  syntax: "1.0.0"
  params: {
    serviceName: string
    port?: number = 3000
  }
}

@identity {
  """
  You are working on {{serviceName}} running on port {{port}}.
  """
}
```

**Step 2: Inherit with values** (child file passes params):

```
# project.prs - concrete project
@meta { id: "user-api" syntax: "1.0.0" }

@inherit ./base(serviceName: "user-api", port: 8080)
```

After compilation, `{{serviceName}}` becomes `user-api` and `{{port}}` becomes `8080`.

The same works with `@use`:

```
@use ./base(serviceName: "auth-service") as auth
```

**Parameter types:** `string`, `number`, `boolean`, `enum("a", "b")`.
Optional params use `?` suffix. Defaults use `= value`.
Missing required params produce a compile error.

**Multi-service pattern** - reuse one template across many projects:

```
services/
  base.prs                          # template with params
  user-api/
    promptscript.yaml               # source: project.prs
    project.prs                     # @inherit ../base(serviceName: "user-api")
  auth-service/
    promptscript.yaml
    project.prs                     # @inherit ../base(serviceName: "auth-service")
```

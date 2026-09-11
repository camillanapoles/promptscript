# Configuration: promptscript.yaml

## Auto-injection

The PromptScript skill (this skill) is automatically included when compiling with
`prs compile`. No manual copying needed. To disable, set
`includePromptScriptSkill: false` in your `promptscript.yaml`.

```
id: my-project
syntax: "1.1.0"
description: "My project description"
input:
  entry: .promptscript/project.prs
  include: ['.promptscript/**/*.prs']
targets:
  github:
    version: full      # simple | multifile | full
  claude:
    version: full
  cursor:
    version: standard
  antigravity:
    version: frontmatter
  factory:
    version: full
  windsurf:             # 41 additional targets supported
    version: simple
  cline:
    version: simple
registry:
  git: https://github.com/org/registry.git
  ref: main
registries:
  company:
    url: github.com/acme/promptscript-registry
  oss:
    url: github.com/prscrpt/community-registry
    ref: v2
policies:
  - name: adjacent-layers-only
    kind: layer-boundary
    severity: error
    layers: ['@core', '@team', '@project']
    maxDistance: 1
```

## Lockfile: `promptscript.lock`

When remote imports are used, run `prs lock` to generate or update the lockfile
before compilation. It records the exact resolved commit for each dependency.
Integrity hashes (SHA-256) are included for registry references to detect
tampering or drift. This enables reproducible builds across machines and CI.
Commit `promptscript.lock` to version control.

Use `--ignore-hashes` on `prs compile` or `prs validate` to skip integrity
hash verification when needed.

## Policy Engine

Define organizational policies in `promptscript.yaml` to validate skill extensions:

```yaml
policies:
  - name: adjacent-layers-only
    kind: layer-boundary
    description: 'Only adjacent layers can extend each other'
    severity: error
    layers: ['@core', '@team', '@project']
    maxDistance: 1

  - name: protect-content
    kind: property-protection
    description: 'Content override requires explicit approval'
    severity: warning
    properties: ['content', 'description']

  - name: approved-registries
    kind: registry-allowlist
    description: 'Extensions must come from approved registries'
    severity: error
    allowed: ['@core', '@team']
```

Policy kinds: `layer-boundary` (controls layer distance), `property-protection`
(prevents overriding specific properties), `registry-allowlist` (restricts extension sources).
Severity: `error` (fails validation) or `warning` (reported only).
Skip with `--skip-policies` during development (never in CI).

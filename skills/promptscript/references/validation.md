# Syntax Versions and Validation

The `syntax` field in `@meta` declares the PromptScript language version (semver).

## Known Versions

| Version | What it adds                                                                                                            |
| ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `1.0.0` | Core blocks (identity, context, standards, restrictions, knowledge, shortcuts, commands, guards, params, skills, local) |
| `1.1.0` | Adds `@agents` and `@workflows`; reserves internal `@prompts`                                                           |
| `1.2.0` | Adds `@examples` (few-shot input/output pairs)                                                                          |
| `1.3.0` | Adds explicit regular block field replacement in `@extend`                                                              |
| `1.4.0` | Adds `@hooks`, `@mcpServers`, and `@plugins`                                                                            |
| `1.5.0` | Adds `@header` section titles, `@override` replacement, and unquoted `${VAR}` values                                    |

## Block Version Requirements

| Block         | Minimum Syntax Version |
| ------------- | ---------------------- |
| `@agents`     | `1.1.0`                |
| `@workflows`  | `1.1.0`                |
| `@examples`   | `1.2.0`                |
| `@hooks`      | `1.4.0`                |
| `@mcpServers` | `1.4.0`                |
| `@plugins`    | `1.4.0`                |

All other built-in blocks are available from `1.0.0`.
Regular block field replacement with `field!: value` requires syntax `1.3.0`.
Generated section title overrides with `@header` require syntax `1.5.0`.
Atomic replacement with `@override` requires syntax `1.5.0`.
Unquoted `${VAR}` references as values require syntax `1.5.0`.

## Validation Rules

- **PS018 (`syntax-version-compat`)**: warns when resolved blocks or syntax features require a higher version than declared. Requirements from inheritance, imports, and skill composition are included. Suggestion: run `prs validate --fix`.
- **PS019 (`unknown-block-name`)**: warns when a block name is not a known PromptScript type, with fuzzy-match suggestions for typos.
- **PS016**: checks that skills required via `requires` exist, detects self-references, and catches circular dependency chains.
- **PS017**: checks skill contract field types, ensures enum fields have options, and warns if param names collide with input names.
- **PS021 (`use-block-filter`)**: errors when `only` and `exclude` are both specified in `@use` parameters.
- **PS025 (`valid-skill-references`)**: errors when a `references` entry points to a file with a disallowed extension or a path that cannot be resolved.
- **PS026 (`safe-reference-content`)**: warns when a referenced file contains potentially sensitive content (e.g., secrets, credentials).
- **PS027 (`valid-skill-composition`)**: warns about conflicting phase names or excessive phases in composed skills.
- **PS028 (`valid-append-negation`)**: warns when negation prefix `!` appears in base skill definitions (only effective in `@extend`).
- **PS029 (`valid-sealed-property`)**: warns when `sealed` contains non-replace-strategy property names.
- **PS030 (`policy-compliance`)**: validates skill extensions against organizational policies defined in `promptscript.yaml`.
- **PS034 (`valid-hooks`)**: validates portable hook events, commands/scripts, paths, interpreters, timeouts, cwd, and target overrides.
- **PS037 (`valid-section-headers`)**: rejects invalid titles, unknown or unowned section keys, duplicate overrides, and nested extension overrides.
- **PS038 (`valid-block-shape`)**: rejects unsupported built-in block shapes and warns about formatter-sensitive legacy shapes or multiline shortcut scalars.
- **PS039 (`agent-namespaces`)**: validates qualified agent name segments and checks them against recorded import provenance.

Target formatters report **PS4002** when a hook event or field has no native equivalent,
when a target cannot guarantee project-root execution, or when output mode cannot emit
the additional hook file.

## Fixing Syntax Versions

```
prs validate --fix          # Auto-fix syntax versions in .prs files
prs upgrade                 # Upgrade all .prs files to the latest version
```

`--fix` rewrites the `syntax: "..."` line in each file's `@meta` block to match the minimum version required by resolved blocks and syntax features. It follows inheritance, imports, and skill composition. It only upgrades, never downgrades.

`prs upgrade` upgrades all files to the latest known syntax version regardless of what blocks they use.

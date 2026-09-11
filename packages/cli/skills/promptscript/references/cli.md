# CLI Commands

```
prs init                    # Initialize project (auto-detects existing files)
prs init --yes --targets claude factory
prs init --dry-run          # Preview initialization
prs init --auto-import      # Initialize + static import of existing files
prs migrate                 # Interactive migration flow
prs migrate --static        # Non-interactive static import
prs migrate --llm           # Generate AI-assisted migration prompt
prs migrate --static --dry-run
prs compile                 # Compile to all targets
prs compile --watch         # Watch mode
prs compile --ignore-hashes # Skip integrity hash verification
prs build <name>            # Compile a named build profile
prs validate --strict       # Validate syntax
prs validate --fix          # Auto-fix syntax version declarations
prs validate --skip-policies # Skip policy engine evaluation
prs upgrade                 # Upgrade all .prs files to latest syntax version
prs import CLAUDE.md        # Import existing AI instructions
prs import CLAUDE.md --dry-run # Preview import conversion
prs inspect <skill>         # Show skill composition provenance
prs inspect <skill> --layers # Show layer-level breakdown
prs explain <path>          # Explain source and composition provenance
prs explain <path> --format json # Machine-readable provenance history
prs hooks install           # Install auto-compilation hooks for AI tools
prs hooks install claude    # Install hooks for a specific tool
prs hooks uninstall         # Remove installed auto-compilation hooks
prs hooks uninstall claude  # Remove hooks for a specific tool
prs skills add <source>     # Add a remote skill (@use + lock update + SKILL.md validation)
prs skills add <source> --strict          # Treat validation warnings as errors
prs skills add <source> --skip-validation # Bypass Agent Skills spec checks (not recommended)
prs skills remove <name>    # Remove a skill (@use line + lock entry)
prs skills list             # List all imported skills
prs skills update           # Re-resolve markdown-imported skills (re-validates + re-hashes)
prs pull                    # Update registry
prs diff --target claude    # Show compilation diff
prs diff --all --format json # Machine-readable diff report for CI
prs diff --format json --include-content # Include generated content in the report
prs lock                    # Generate/update promptscript.lock
prs lock --dry-run          # Preview lockfile changes
prs update                  # Re-resolve all remote imports to latest
prs update <url>            # Update a specific registry
prs vendor sync             # Copy cached deps to .promptscript/vendor/
prs vendor check            # Verify vendor matches lockfile
prs resolve @alias/path     # Debug: show how an import resolves
prs registry list           # Show configured registries and aliases
prs registry add <alias> <url>  # Add a registry alias
```

`prs init --yes` requires explicit, detected, or user-configured targets. It does not invent
default tools. For existing projects, `prs migrate` preserves `promptscript.yaml`, isolates static
output under `.promptscript/migrated/`, leaves source instructions untouched, and performs no
writes when no candidates are detected.

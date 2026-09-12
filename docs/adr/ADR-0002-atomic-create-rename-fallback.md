# ADR-0002: Guarded create falls back to rename without links

- **Status**: Accepted (2026-09-11)
- **Supersedes**: none

## Context

`GUARDED_CREATE_SCRIPT` publishes compiled outputs by creating a temporary
file (`O_EXCL | O_NOFOLLOW`), writing and fsyncing it, then
`link(temp, name)` + `unlink(temp)`. The hardlink gives an atomic exclusive
create: `link(2)` fails if the target exists, without clobbering it.

On Android app storage (Termux on f2fs behind SELinux) `link(2)` is denied
outright with `EACCES` — even from the shell. Every `prs compile` write failed
with "output path was not safe to create", while `init` (different write path)
and read-only commands worked. Filesystems without hardlink support are rare
but real: Android, some network and FUSE mounts.

## Decision

Keep the hardlink as the default strategy. When `linkSync` fails with
`EACCES`, `EPERM`, or `EXDEV`, re-check that the target does not exist and
fall back to `renameSync(temporary, name)` — atomic within the same directory,
and the same primitive `GUARDED_REWRITE_SCRIPT` already uses.
`PROMPTSCRIPT_CREATE_STRATEGY=rename` forces the rename path; it doubles as a
deterministic hook for tests on filesystems where links work.

## Consequences

- `prs compile` works on Android/Termux and other hardlink-denying
  filesystems.
- The rename path has a narrow TOCTOU window between the existence re-check
  and the rename (the link path has none). The window exists only on the
  fallback path; a concurrent creator could be clobbered. Accepted for this
  environment class.
- Exclusive-create semantics are preserved for the observable
  create-twice case (returns `skipped`, first write wins), covered by
  `create-hook-output-fallback.spec.ts`.

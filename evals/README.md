# Evals

End-to-end fixtures that drive the real CLI and assert language semantics
survive compilation — the layer unit tests mock away.

## Run

```bash
bash evals/run-eval.sh                    # repo checkout (CI runs this)
PRS_CMD=<installed-prs> bash evals/run-eval.sh
```

CI gates this eval on the `25.x` matrix leg (`ci.yml`, "Eval Fixture Compile").

## Fixtures

- `fixtures/ops-center/` — exercises `@meta` template params, `@inherit` with
  values, `@use` with `only:` block filtering, `@extend` with `field!`
  replacement, `@override`, `@header` section titles, markdown skill
  composition (inline `@use` phase), `@agents`, `@shortcuts` with
  `prompt: true`, and `@hooks` with per-target overrides.

## Adding an eval

Copy the closest fixture, extend it, and assert observable output in
`run-eval.sh` (grep on generated files, `test -f` on artifacts). Keep the
runner deterministic — no network, no sleeps.

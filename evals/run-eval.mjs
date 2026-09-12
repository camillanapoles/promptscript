// End-to-end eval: compiles the ops-center fixture through the real CLI and
// asserts the language semantics survive compilation.
//
// Usage:
//   node evals/run-eval.mjs                 # repo checkout (CI / dev)
//   PRS_CMD="prs" node evals/run-eval.mjs   # alternative single command
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The fixture must live INSIDE the repo tree: project discovery anchors on
// the process cwd and rejects paths outside the project root, while the bare
// swc loader specifier resolves by walking up from the cwd to the repo's
// node_modules. A transient directory one level below the repo root
// satisfies both.
const WORK = join(ROOT, '.eval-run');
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK);
// The swc loader discovers tsconfig.json from the process cwd; without the
// repo's path mappings the CLI's TypeScript sources cannot resolve their
// imports. Extending the base config keeps the mappings anchored to the
// repo root (relative paths in an extended config resolve against the
// config that declares them).
writeFileSync(
  join(WORK, 'tsconfig.json'),
  JSON.stringify({ extends: '../tsconfig.base.json' }, null, 2) + '\n'
);

const failures = [];
function check(label, condition) {
  if (!condition) failures.push(label);
}

try {
  cpSync(join(ROOT, 'evals/fixtures/ops-center'), WORK, { recursive: true });

  const prsCmd = process.env.PRS_CMD;

  function runPrs(args) {
    // Both paths run with the transient in-repo fixture dir as cwd: project
    // discovery finds the fixture config, and the bare swc loader specifier
    // (default path) resolves by walking up to the repo's node_modules — the
    // same resolution the repo's own package.json scripts rely on.
    const result = prsCmd
      ? spawnSync(prsCmd, args, { cwd: WORK, shell: true, stdio: 'inherit' })
      : spawnSync(
          process.execPath,
          [
            '--import',
            '@swc-node/register/esm-register',
            join(ROOT, 'packages/cli/src/cli.ts'),
            ...args,
          ],
          { cwd: WORK, stdio: 'inherit' }
        );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`prs ${args.join(' ')} exited with ${result.status}`);
    }
  }

  runPrs(['validate', '--strict']);
  runPrs(['compile']);

  const read = (file) => readFileSync(join(WORK, file), 'utf-8');
  const claude = read('CLAUDE.md');

  // Template parameter interpolation via @inherit
  check('serviceName interpolated', claude.includes('ops-center'));
  check('port interpolated', claude.includes('8080'));
  // field! replacement in @extend
  check('field! replacement applied', claude.includes('Use Vitest'));
  check('inherited value replaced', !claude.includes('Use Jest'));
  // @override of an imported field
  check('@override applied', claude.includes('PascalCase components ONLY'));
  check('overridden value gone', !claude.includes('kebab-case files'));
  // @header section title
  check('@header title present', claude.includes('Engineering Rules'));
  // @use fragment with only-filter kept standards and knowledge
  check('fragment standards kept', claude.includes('Conventional Commits'));
  check('fragment knowledge kept', claude.includes('Release checklist'));

  // Emitted artifacts
  check('claude skill emitted', existsSync(join(WORK, '.claude/skills/deploy/SKILL.md')));
  check('claude agent emitted', existsSync(join(WORK, '.claude/agents/reviewer.md')));
  check('github agent emitted', existsSync(join(WORK, '.github/agents/reviewer.md')));
  check('github prompt emitted', existsSync(join(WORK, '.github/prompts/test.prompt.md')));
  check('cursor command emitted', existsSync(join(WORK, '.cursor/commands/test.md')));
  check(
    'auto-injected skill emitted',
    existsSync(join(WORK, '.claude/skills/promptscript/SKILL.md'))
  );
  // Hook emitted for claude, omitted for github (target override)
  check('greet hook in claude settings', read('.claude/settings.json').includes('greet'));
  const githubHooks = join(WORK, '.github/hooks');
  if (existsSync(githubHooks)) {
    for (const file of readdirSync(githubHooks)) {
      check(
        `greet leaked into github/hooks/${file}`,
        !readFileSync(join(githubHooks, file), 'utf-8').includes('greet')
      );
    }
  }
  // Markdown skill composed as a phase with provenance
  check(
    'markdown skill composed as phase',
    read('.claude/skills/deploy/SKILL.md').includes('Phase 1: vue-review')
  );

  if (failures.length > 0) {
    console.error(`eval fail: ${failures.length} assertion(s):`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log('eval: ops-center fixture OK');
} finally {
  rmSync(WORK, { recursive: true, force: true });
}

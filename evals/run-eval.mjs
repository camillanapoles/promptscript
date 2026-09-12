// End-to-end eval: compiles the ops-center fixture through the real CLI and
// asserts the language semantics survive compilation.
//
// Usage:
//   node evals/run-eval.mjs                 # repo checkout (CI / dev)
//   PRS_CMD="prs" node evals/run-eval.mjs   # alternative single command
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = mkdtempSync(join(tmpdir(), 'prs-eval-'));

const failures = [];
function check(label, condition) {
  if (!condition) failures.push(label);
}

try {
  cpSync(join(ROOT, 'evals/fixtures/ops-center'), WORK, { recursive: true });

  const prsCmd = process.env.PRS_CMD;

  function runPrs(args) {
    // Default path mirrors the repo's own package.json scripts (e.g.
    // docs:validate): bare loader specifier with the repo as cwd — the exact
    // combination CI already runs green. The fixture reaches the CLI through
    // absolute paths (validate positional files) and --cwd (compile); the
    // installed-CLI override runs with the fixture as cwd, where project
    // discovery needs no flags.
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
          { cwd: ROOT, stdio: 'inherit' }
        );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`prs ${args.join(' ')} exited with ${result.status}`);
    }
  }

  runPrs(['validate', '--strict', join(WORK, '.promptscript/project.prs')]);
  runPrs(['compile', '--cwd', WORK]);

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

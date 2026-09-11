import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHookOutputSafely } from '../managed-output-cleanup.js';

describe('createHookOutputSafely create strategy', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'prs-guarded-create-'));
  });

  afterEach(async () => {
    delete process.env.PROMPTSCRIPT_CREATE_STRATEGY;
    await rm(dir, { recursive: true, force: true });
  });

  it('creates output via the hardlink strategy by default', async () => {
    const target = join(dir, 'default.txt');

    await expect(createHookOutputSafely(target, dir, 'linked', 0o644)).resolves.toBe(true);
    await expect(readFile(target, 'utf-8')).resolves.toBe('linked');
  });

  it('creates output via rename when PROMPTSCRIPT_CREATE_STRATEGY=rename', async () => {
    process.env.PROMPTSCRIPT_CREATE_STRATEGY = 'rename';
    const target = join(dir, 'renamed.txt');

    await expect(createHookOutputSafely(target, dir, 'renamed', 0o644)).resolves.toBe(true);
    await expect(readFile(target, 'utf-8')).resolves.toBe('renamed');
  });

  it('keeps exclusive-create semantics on the rename path', async () => {
    process.env.PROMPTSCRIPT_CREATE_STRATEGY = 'rename';
    const target = join(dir, 'exclusive.txt');

    await expect(createHookOutputSafely(target, dir, 'first', 0o644)).resolves.toBe(true);
    await expect(createHookOutputSafely(target, dir, 'second', 0o644)).resolves.toBe(false);
    await expect(readFile(target, 'utf-8')).resolves.toBe('first');
  });

  it('leaves no temporary files behind after a successful rename', async () => {
    process.env.PROMPTSCRIPT_CREATE_STRATEGY = 'rename';
    const target = join(dir, 'clean.txt');

    await expect(createHookOutputSafely(target, dir, 'payload', 0o644)).resolves.toBe(true);
    const entries = await readdir(dir);
    expect(entries).toEqual(['clean.txt']);
  });
});

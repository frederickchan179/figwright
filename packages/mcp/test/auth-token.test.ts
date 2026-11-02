import { chmodSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadAuthToken, tokensMatch } from '../src/auth-token.js';

describe('tokensMatch', () => {
  it('accepts the same token and rejects a different one, including a different length', () => {
    expect(tokensMatch('figwright-test-token', 'figwright-test-token')).toBe(true);
    expect(tokensMatch('figwright-test-token', 'figwright-test-tokex')).toBe(false);
    expect(tokensMatch(undefined, 'figwright-test-token')).toBe(false);
    expect(tokensMatch('short', 'figwright-test-token')).toBe(false);
  });
});

describe('loadAuthToken', () => {
  it('prefers the environment and does not create a file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figwright-auth-'));
    const filePath = join(dir, 'auth-token');
    expect(loadAuthToken(filePath, 'from-env')).toBe('from-env');
    expect(existsSync(filePath)).toBe(false);
  });

  it('creates a private file and then reads it back', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figwright-auth-'));
    const filePath = join(dir, 'nested', 'auth-token');
    const created = loadAuthToken(filePath, undefined);
    expect(created.length).toBeGreaterThan(20);
    expect(readFileSync(filePath, 'utf8').trim()).toBe(created);
    expect(loadAuthToken(filePath, undefined)).toBe(created);
    expect(statSync(filePath).mode & 0o777).toBe(
      process.platform === 'win32' ? statSync(filePath).mode & 0o777 : 0o600,
    );
    expect(statSync(join(dir, 'nested')).mode & 0o777).toBe(
      process.platform === 'win32' ? statSync(join(dir, 'nested')).mode & 0o777 : 0o700,
    );
  });

  it('keeps an existing token and tightens a loose mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'figwright-auth-'));
    const filePath = join(dir, 'auth-token');
    writeFileSync(filePath, 'already-there\n', { mode: 0o644 });
    expect(loadAuthToken(filePath, '  ')).toBe('already-there');
    if (process.platform !== 'win32') chmodSync(filePath, 0o644);
    loadAuthToken(filePath, undefined);
    const mode = statSync(filePath).mode & 0o777;
    expect(mode).toBe(process.platform === 'win32' ? mode : 0o600);
  });
});

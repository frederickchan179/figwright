import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Header followers send on /ping, /rpc and /abdicate.
 *
 * A browser WebSocket to loopback cannot be told apart from the Figma plugin by Origin alone: both
 * show up as the string "null". The token is the secret a web page cannot read. It lives in the
 * user's home directory, mode 0600, and is baked into the plugin when that plugin is built on this
 * machine. Another user on the machine cannot read the file. A process already running as this user
 * can, which is the same boundary as the rest of the home directory.
 */
export const AUTH_HEADER = 'x-figwright-token';

export const authTokenPath = (): string => join(homedir(), '.figwright', 'auth-token');

const tighten = (path: string, mode: number): void => {
  try {
    chmodSync(path, mode);
  } catch {
    // Windows only honors the read-only bit. Failing to tighten must not stop the server.
  }
};

const readExisting = (filePath: string): string | undefined => {
  try {
    const text = readFileSync(filePath, 'utf8').trim();
    return text === '' ? undefined : text;
  } catch {
    return undefined;
  }
};

const writeTokenFile = (filePath: string, token: string): void => {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  tighten(dir, 0o700);
  try {
    writeFileSync(filePath, `${token}\n`, { mode: 0o600, flag: 'wx' });
  } catch (err) {
    // Another process created it between the read and the write. Use that one.
    const existing = readExisting(filePath);
    if (existing !== undefined) return;
    throw err;
  }
  tighten(filePath, 0o600);
};

/**
 * The token this process must present and require.
 *
 * `FIGWRIGHT_TOKEN` wins when it is set, so tests never touch the home directory. Otherwise the
 * file is created on first use. Callers cache the result for the life of the process: rotating the
 * file means restarting the server and rebuilding the plugin.
 */
export const loadAuthToken = (filePath: string, envValue: string | undefined): string => {
  const fromEnv = envValue?.trim();
  if (fromEnv) return fromEnv;
  const existing = readExisting(filePath);
  if (existing !== undefined) {
    tighten(dirname(filePath), 0o700);
    tighten(filePath, 0o600);
    return existing;
  }
  const created = randomBytes(32).toString('base64url');
  writeTokenFile(filePath, created);
  // Lost the create race: the other process's token is the one on disk.
  return readExisting(filePath) ?? created;
};

let cached: string | undefined;

export const localAuthToken = (): string => {
  cached ??= loadAuthToken(authTokenPath(), process.env.FIGWRIGHT_TOKEN);
  return cached;
};

/** Equal-length compare. A length mismatch still touches `expected` so the timing does not skip it. */
export const tokensMatch = (presented: string | undefined, expected: string): boolean => {
  const actual = Buffer.from(presented ?? '');
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) {
    timingSafeEqual(wanted, wanted);
    return false;
  }
  return timingSafeEqual(actual, wanted);
};

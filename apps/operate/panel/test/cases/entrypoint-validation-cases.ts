/** Production configuration validation scenarios for the production entrypoint. */
import { test } from 'node:test';
import {
  tmpDir,
  dbPath,
  productionEntrypointEnv,
  expectEntrypointFailure,
  fs,
  path,
} from '../support/entrypoint-fixture';

export function registerEntrypointValidationScenarios(): void {
  test('`tsx app.ts` fails fast in production without Redis config', async () => {
    await expectEntrypointFailure(
      productionEntrypointEnv(dbPath),
      /REDIS_URL is required in production/
    );
  });

  test('`tsx app.ts` fails fast in production with weak default password', async () => {
    const weakDbPath = path.join(tmpDir, `weak-default-${Date.now()}.db`);
    await expectEntrypointFailure(
      productionEntrypointEnv(weakDbPath, {
        ALLOW_DEFAULT_CREDENTIALS: 'true',
        DEFAULT_USERNAME: 'admin',
        DEFAULT_PASSWORD: 'change-me',
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /DEFAULT_PASSWORD uses a weak placeholder value in production/
    );
  });

  test('`tsx app.ts` fails fast in production with weak SESSION_SECRET', async () => {
    await expectEntrypointFailure(
      productionEntrypointEnv(path.join(tmpDir, `weak-session-${Date.now()}.db`), {
        SESSION_SECRET: 'change-me',
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /SESSION_SECRET must be a strong secret in production \(32\+ chars, not a placeholder, and not trivially guessable\)/
    );
  });

  test('`tsx app.ts` fails fast in production with short SESSION_SECRET', async () => {
    await expectEntrypointFailure(
      productionEntrypointEnv(path.join(tmpDir, `short-session-${Date.now()}.db`), {
        SESSION_SECRET: 'abc12345',
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /SESSION_SECRET must be a strong secret in production \(32\+ chars, not a placeholder, and not trivially guessable\)/
    );
  });

  test('`tsx app.ts` fails fast in production when explicit DB_PATH is invalid', async () => {
    const invalidDbParent = path.join(tmpDir, 'not-a-directory');
    fs.writeFileSync(invalidDbParent, 'not a directory');
    await expectEntrypointFailure(
      productionEntrypointEnv(path.join(invalidDbParent, '3rr.db'), {
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /Failed to open DB/
    );
  });

  test('`tsx app.ts` rejects a production database in a writable directory', async () => {
    if (process.platform === 'win32') return;
    const unsafeParent = path.join(tmpDir, `unsafe-db-parent-${Date.now()}`);
    fs.mkdirSync(unsafeParent, { mode: 0o777 });
    fs.chmodSync(unsafeParent, 0o777);

    await expectEntrypointFailure(
      productionEntrypointEnv(path.join(unsafeParent, '3rr.db'), {
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /Database parent must not be group- or world-writable/
    );
  });

  test('`tsx app.ts` rejects a production database symlink', async () => {
    if (process.platform === 'win32') return;
    const safeParent = path.join(tmpDir, `safe-db-parent-${Date.now()}`);
    fs.mkdirSync(safeParent, { mode: 0o700 });
    const outside = path.join(tmpDir, `outside-${Date.now()}.db`);
    fs.writeFileSync(outside, '');
    fs.symlinkSync(outside, path.join(safeParent, '3rr.db'));

    await expectEntrypointFailure(
      productionEntrypointEnv(path.join(safeParent, '3rr.db'), {
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /Database path must be a regular file, not a link/
    );
  });

  test('`tsx app.ts` rejects a hard-linked production database', async () => {
    if (process.platform === 'win32') return;
    const safeParent = path.join(tmpDir, `linked-db-parent-${Date.now()}`);
    fs.mkdirSync(safeParent, { mode: 0o700 });
    const linkedDatabase = path.join(safeParent, '3rr.db');
    fs.writeFileSync(linkedDatabase, '', { mode: 0o600 });
    fs.linkSync(linkedDatabase, path.join(safeParent, 'second-link.db'));

    await expectEntrypointFailure(
      productionEntrypointEnv(linkedDatabase, {
        REDIS_URL: 'redis://127.0.0.1:6380',
      }),
      /Database file must have exactly one hard link/
    );
  });
}

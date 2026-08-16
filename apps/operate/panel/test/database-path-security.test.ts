/** Adversarial filesystem checks for the SQLite database path boundary. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { openSecureDatabase } from '../utils/databaseFile';
import { validateDatabaseFile } from '../utils/databaseFileIdentity';

let tmpDir: string;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), '3rr-db-path-security-'));
  fs.chmodSync(tmpDir, 0o700);
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function privateParent(name: string): string {
  const parent = path.join(tmpDir, name);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  fs.chmodSync(parent, 0o700);
  return parent;
}

function expectDatabasePathRejection(databasePath: string, reason: RegExp): void {
  assert.throws(() => openSecureDatabase(databasePath, 'production'), reason);
}

test('creates a private database at new absolute and cwd-relative paths', () => {
  const absolutePath = path.join(privateParent('new-absolute'), 'panel.db');
  const relativePath = path.relative(
    process.cwd(),
    path.join(privateParent('new-relative'), 'panel.db')
  );
  const missingParentPath = path.join(tmpDir, 'missing-parent', 'nested', 'panel.db');

  for (const databasePath of [absolutePath, relativePath, missingParentPath]) {
    const database = openSecureDatabase(databasePath, 'production');
    database.exec('CREATE TABLE path_security (id INTEGER PRIMARY KEY)');
    database.close();
    assert.equal(fs.lstatSync(path.resolve(databasePath)).mode & 0o777, 0o600);
  }
  assert.equal(fs.lstatSync(path.dirname(missingParentPath)).mode & 0o777, 0o700);
});

test('tightens an owned legacy 0644 database and keeps it usable', () => {
  const databasePath = path.join(privateParent('legacy'), 'panel.db');
  fs.writeFileSync(databasePath, '', { mode: 0o644 });
  fs.chmodSync(databasePath, 0o644);

  const database = openSecureDatabase(databasePath, 'production');
  database.exec('CREATE TABLE legacy_database (id INTEGER PRIMARY KEY)');
  database.close();

  assert.equal(fs.lstatSync(databasePath).mode & 0o777, 0o600);
});

test('rejects symlink, hard-link, directory, and FIFO database paths', () => {
  if (process.platform === 'win32') return;
  const parent = privateParent('unsafe-types');
  const target = path.join(parent, 'target.db');
  fs.writeFileSync(target, '', { mode: 0o600 });
  fs.chmodSync(target, 0o600);

  const symlink = path.join(parent, 'symlink.db');
  fs.symlinkSync(target, symlink);
  expectDatabasePathRejection(symlink, /regular file, not a link/);

  const hardlink = path.join(parent, 'hardlink.db');
  fs.linkSync(target, hardlink);
  expectDatabasePathRejection(hardlink, /exactly one hard link/);

  const directory = path.join(parent, 'directory.db');
  fs.mkdirSync(directory, { mode: 0o700 });
  expectDatabasePathRejection(directory, /regular file, not a link/);

  const fifo = path.join(parent, 'fifo.db');
  execFileSync('mkfifo', [fifo]);
  expectDatabasePathRejection(fifo, /regular file, not a link/);
});

test('rejects an unsafe production parent and a linked SQLite sidecar', () => {
  if (process.platform === 'win32') return;
  const unsafeParent = privateParent('unsafe-parent');
  fs.chmodSync(unsafeParent, 0o777);
  expectDatabasePathRejection(path.join(unsafeParent, 'panel.db'), /group- or world-writable/);

  const nonDirectoryParent = path.join(tmpDir, 'non-directory-parent');
  fs.writeFileSync(nonDirectoryParent, 'not a directory');
  assert.throws(() => openSecureDatabase(path.join(nonDirectoryParent, 'panel.db'), 'production'));

  const parent = privateParent('unsafe-sidecar');
  const databasePath = path.join(parent, 'panel.db');
  fs.writeFileSync(databasePath, '', { mode: 0o600 });
  fs.chmodSync(databasePath, 0o600);
  const sidecarTarget = path.join(parent, 'sidecar-target');
  fs.writeFileSync(sidecarTarget, '', { mode: 0o600 });
  fs.chmodSync(sidecarTarget, 0o600);
  fs.symlinkSync(sidecarTarget, `${databasePath}-wal`);
  expectDatabasePathRejection(databasePath, /regular file, not a link/);
});

test('rejects an existing database that is not owned by the panel user', () => {
  const getuid = process.getuid;
  if (!getuid || getuid() === 0) return;
  const databasePath = path.join(privateParent('wrong-owner'), 'panel.db');
  fs.writeFileSync(databasePath, '', { mode: 0o600 });
  fs.chmodSync(databasePath, 0o600);
  Object.defineProperty(process, 'getuid', { configurable: true, value: () => getuid() + 1 });
  try {
    assert.throws(
      () => validateDatabaseFile(databasePath, 'production'),
      /must be owned by the panel user or root/
    );
  } finally {
    Object.defineProperty(process, 'getuid', { configurable: true, value: getuid });
  }
});

test('fails closed when the database file or parent is swapped before SQLite opens it', () => {
  const fileParent = privateParent('file-swap');
  const filePath = path.join(fileParent, 'panel.db');
  expectDatabasePathRejectionAfterSwap(
    filePath,
    (databasePath) => {
      fs.renameSync(databasePath, `${databasePath}.original`);
      fs.writeFileSync(databasePath, '', { mode: 0o600 });
      fs.chmodSync(databasePath, 0o600);
    },
    /file identity changed while opening/
  );

  const parentPath = privateParent('parent-swap');
  const parentDatabasePath = path.join(parentPath, 'panel.db');
  expectDatabasePathRejectionAfterSwap(
    parentDatabasePath,
    (databasePath) => {
      const oldParent = `${path.dirname(databasePath)}.original`;
      fs.renameSync(path.dirname(databasePath), oldParent);
      fs.mkdirSync(path.dirname(databasePath), { mode: 0o700 });
      fs.chmodSync(path.dirname(databasePath), 0o700);
      fs.writeFileSync(databasePath, '', { mode: 0o600 });
      fs.chmodSync(databasePath, 0o600);
    },
    /parent identity changed while opening/
  );
});

function expectDatabasePathRejectionAfterSwap(
  databasePath: string,
  swap: (canonicalPath: string) => void,
  reason: RegExp
): void {
  assert.throws(() => openSecureDatabase(databasePath, 'production', { beforeOpen: swap }), reason);
}

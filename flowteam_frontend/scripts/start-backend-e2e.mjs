import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

function resolveBackendDir() {
  return path.resolve(process.cwd(), '..', 'flowteam_backend');
}

function resolvePython(backendDir) {
  const windowsPython = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
  if (fs.existsSync(windowsPython)) return windowsPython;

  const posixPython = path.join(backendDir, 'venv', 'bin', 'python');
  if (fs.existsSync(posixPython)) return posixPython;

  return 'python';
}

function runOrThrow(command, args, options) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

const backendDir = resolveBackendDir();
const python = resolvePython(backendDir);

const env = { ...process.env };
env.USE_SQLITE ??= 'True';
env.DISABLE_REDIS ??= 'True';
if (!env.DATABASE_URL) {
  const dbFile = path.join(os.tmpdir(), `flowteam-e2e-${process.pid}-${crypto.randomUUID()}.sqlite3`);
  env.DATABASE_URL = `sqlite:///${dbFile.replace(/\\/g, '/')}`;
}

runOrThrow(python, ['manage.py', 'migrate', '--noinput'], { cwd: backendDir, env });

const child = spawn(python, ['manage.py', 'runserver', '8000'], {
  cwd: backendDir,
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    child.kill(signal);
  });
}

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

// Ensure a superuser exists for admin/super-admin E2E flows.
env.E2E_SUPERUSER_EMAIL ??= 'admin@flowteam.test';
env.E2E_SUPERUSER_PASSWORD ??= 'AdminPass123!';
env.E2E_SUPERUSER_NAME ??= 'E2E Super Admin';
runOrThrow(
  python,
  [
    'manage.py',
    'shell',
    '-c',
    [
      "from django.contrib.auth import get_user_model",
      "User=get_user_model()",
      "email=__import__('os').environ['E2E_SUPERUSER_EMAIL']",
      "pw=__import__('os').environ['E2E_SUPERUSER_PASSWORD']",
      "name=__import__('os').environ.get('E2E_SUPERUSER_NAME','E2E Super Admin')",
      "u=User.objects.filter(email=email).first()",
      "created=False",
      "if not u:",
      "  u=User.objects.create_superuser(email=email,password=pw,full_name=name)",
      "  created=True",
      "else:",
      "  u.is_staff=True; u.is_superuser=True; u.set_password(pw); u.full_name=name; u.save()",
      "print('E2E superuser ready:', email, 'created' if created else 'updated')",
    ].join('; '),
  ],
  { cwd: backendDir, env }
);

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

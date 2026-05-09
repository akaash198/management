import argparse
import io
import os
import posixpath
import re
import sys
from typing import Optional, Tuple

import paramiko


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy FlowTeam to a Hetzner VM via SSH (Paramiko).")
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True)
    parser.add_argument("--ssh-key", required=True, help="SSH private key contents (PEM).")

    parser.add_argument("--deploy-path", default="/opt/flowteam")
    parser.add_argument("--server-ip", default=None, help="Used to fill ALLOWED_HOSTS in .env.prod if created.")
    parser.add_argument("--write-env-prod", action="store_true", help="Create .env.prod from template if missing.")
    parser.add_argument(
        "--env-postgres-password",
        default=None,
        help="Optional: fill POSTGRES_PASSWORD when creating .env.prod.",
    )
    parser.add_argument(
        "--env-secret-key",
        default=None,
        help="Optional: fill SECRET_KEY when creating .env.prod.",
    )
    parser.add_argument(
        "--allowed-hosts",
        default=None,
        help="Optional: override ALLOWED_HOSTS when creating .env.prod (comma-separated).",
    )

    parser.add_argument("--ghcr-username", default=None)
    parser.add_argument("--ghcr-token", default=None)
    parser.add_argument("--registry", default="ghcr.io")
    parser.add_argument("--image-backend", default=None)
    parser.add_argument("--image-frontend", default=None)
    parser.add_argument("--deploy-sha", default=None)

    parser.add_argument("--bootstrap-ufw", action="store_true", help="Configure UFW to allow only SSH + 80/tcp.")
    parser.add_argument("--upload", action="store_true", help="Upload docker-compose.prod.yml and Caddyfile.")
    parser.add_argument("--deploy", action="store_true", help="Run docker compose pull/migrate/up.")

    return parser.parse_args()


def _load_private_key(key_text: str) -> paramiko.PKey:
    key_text = key_text.strip() + "\n"
    key_buf = io.StringIO(key_text)
    last_exc: Optional[Exception] = None
    for key_cls in (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey, paramiko.DSSKey):
        try:
            key_buf.seek(0)
            return key_cls.from_private_key(key_buf)
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
    raise RuntimeError(f"Unable to parse SSH private key ({type(last_exc).__name__}: {last_exc})")


def _connect(host: str, user: str, key_text: str) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    pkey = _load_private_key(key_text)
    client.connect(hostname=host, username=user, pkey=pkey, timeout=30, banner_timeout=30, auth_timeout=30)
    return client


def _run(client: paramiko.SSHClient, command: str) -> Tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(command)
    _ = stdin
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    return exit_code, out, err


def _ensure_dir(client: paramiko.SSHClient, path: str) -> None:
    code, _, err = _run(client, f"mkdir -p {path}")
    if code != 0:
        raise RuntimeError(f"mkdir failed: {err.strip()}")

    # Make sure docker compose can read files even if deploy user isn't root.
    _run(client, f"chmod 755 {path} || true")


def _sftp_put_text(sftp: paramiko.SFTPClient, remote_path: str, text: str, mode: int = 0o644) -> None:
    tmp_path = remote_path + ".tmp"
    with sftp.file(tmp_path, "w") as f:
        f.write(text)
    sftp.chmod(tmp_path, mode)
    sftp.posix_rename(tmp_path, remote_path)


def _sftp_put_file(sftp: paramiko.SFTPClient, local_path: str, remote_path: str, mode: int = 0o644) -> None:
    tmp_path = remote_path + ".tmp"
    sftp.put(local_path, tmp_path)
    sftp.chmod(tmp_path, mode)
    sftp.posix_rename(tmp_path, remote_path)


def _remote_exists(client: paramiko.SSHClient, remote_path: str) -> bool:
    code, _, _ = _run(client, f"test -f {remote_path}")
    return code == 0


def _render_env_prod(template_text: str, *, server_ip: Optional[str], allowed_hosts: Optional[str]) -> str:
    text = template_text
    if allowed_hosts:
        text = re.sub(r"^ALLOWED_HOSTS=.*$", f"ALLOWED_HOSTS={allowed_hosts}", text, flags=re.MULTILINE)
    elif server_ip:
        text = re.sub(r"^ALLOWED_HOSTS=.*$", f"ALLOWED_HOSTS={server_ip},localhost,127.0.0.1", text, flags=re.MULTILINE)
    return text


def _bootstrap_ufw(client: paramiko.SSHClient) -> None:
    # Keep it simple/idempotent.
    cmds = [
        "ufw --force reset",
        "ufw allow OpenSSH",
        "ufw allow 80/tcp",
        "ufw --force enable",
        "ufw status verbose",
    ]
    for cmd in cmds:
        code, out, err = _run(client, cmd)
        if code != 0:
            raise RuntimeError(f"UFW cmd failed ({cmd}): {err.strip()}")
        if out:
            print(out.strip())


def main() -> int:
    args = _parse_args()

    if not (args.upload or args.write_env_prod or args.bootstrap_ufw or args.deploy):
        print("Nothing to do: pass at least one of --upload, --write-env-prod, --bootstrap-ufw, --deploy", file=sys.stderr)
        return 2

    local_compose = os.path.join("deploy", "docker-compose.prod.yml")
    local_caddyfile = os.path.join("deploy", "Caddyfile")
    local_env_example = os.path.join("deploy", ".env.prod.example")

    if args.upload:
        for p in (local_compose, local_caddyfile):
            if not os.path.exists(p):
                print(f"Missing required file: {p}", file=sys.stderr)
                return 2

    if args.write_env_prod and not os.path.exists(local_env_example):
        print(f"Missing required file: {local_env_example}", file=sys.stderr)
        return 2

    with _connect(args.host, args.user, args.ssh_key) as client:
        _ensure_dir(client, args.deploy_path)
        with client.open_sftp() as sftp:
            if args.upload:
                _sftp_put_file(
                    sftp,
                    local_compose,
                    posixpath.join(args.deploy_path, "docker-compose.prod.yml"),
                )
                _sftp_put_file(
                    sftp,
                    local_caddyfile,
                    posixpath.join(args.deploy_path, "Caddyfile"),
                )

            if args.write_env_prod:
                remote_env = posixpath.join(args.deploy_path, ".env.prod")
                if not _remote_exists(client, remote_env):
                    template = open(local_env_example, "r", encoding="utf-8").read()
                    rendered = _render_env_prod(template, server_ip=args.server_ip, allowed_hosts=args.allowed_hosts)
                    if args.env_postgres_password:
                        rendered = re.sub(
                            r"^POSTGRES_PASSWORD=.*$",
                            f"POSTGRES_PASSWORD={args.env_postgres_password}",
                            rendered,
                            flags=re.MULTILINE,
                        )
                    if args.env_secret_key:
                        rendered = re.sub(
                            r"^SECRET_KEY=.*$",
                            f"SECRET_KEY={args.env_secret_key}",
                            rendered,
                            flags=re.MULTILINE,
                        )
                    _sftp_put_text(sftp, remote_env, rendered, mode=0o600)
                    print(f"Created {remote_env}")
                else:
                    print("Skipping .env.prod (already exists).")

        if args.bootstrap_ufw:
            _bootstrap_ufw(client)

        if args.deploy:
            if not (args.ghcr_username and args.ghcr_token):
                raise RuntimeError("Deploy requires --ghcr-username and --ghcr-token.")
            if not (args.image_backend and args.image_frontend):
                raise RuntimeError("Deploy requires --image-backend and --image-frontend.")

            deploy_sha = args.deploy_sha or ""
            cd = f"cd {args.deploy_path}"
            login = f"echo '{args.ghcr_token}' | docker login '{args.registry}' -u '{args.ghcr_username}' --password-stdin"
            pull = (
                f"IMAGE_BACKEND='{args.image_backend}' IMAGE_FRONTEND='{args.image_frontend}' "
                f"docker compose --env-file .env.prod -f docker-compose.prod.yml pull"
            )
            migrate = (
                f"IMAGE_BACKEND='{args.image_backend}' IMAGE_FRONTEND='{args.image_frontend}' "
                f"docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm backend "
                f"python manage.py migrate --noinput"
            )
            up = (
                f"IMAGE_BACKEND='{args.image_backend}' IMAGE_FRONTEND='{args.image_frontend}' "
                f"docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans"
            )
            tag = (
                f"echo '{deploy_sha}' > current.sha && "
                f"echo \"$(date -u +%Y-%m-%dT%H:%M:%SZ) {deploy_sha}\" >> releases.log"
                if deploy_sha
                else "true"
            )

            for cmd in (cd, login, tag, pull, migrate, up):
                code, out, err = _run(client, cmd)
                if out:
                    print(out.strip())
                if code != 0:
                    raise RuntimeError(f"Remote command failed ({cmd}): {err.strip()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

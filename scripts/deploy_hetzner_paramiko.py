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
    key_group = parser.add_mutually_exclusive_group(required=True)
    key_group.add_argument("--ssh-key", help="SSH private key contents (PEM/OpenSSH).")
    key_group.add_argument("--ssh-key-file", help="Path to SSH private key file (PEM/OpenSSH).")

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
    parser.add_argument("--prune", action="store_true", help="Run docker system prune -af before uploading to free disk space.")
    parser.add_argument("--upload", action="store_true", help="Upload docker-compose.prod.yml and Caddyfile.")
    parser.add_argument("--update-env-prod", action="store_true", help="Patch existing .env.prod with current allowed-hosts, cors, frontend-url values.")
    parser.add_argument("--deploy", action="store_true", help="Run docker compose pull/migrate/up.")

    return parser.parse_args()


def _load_private_key(key_text: str) -> paramiko.PKey:
    if key_text.strip().startswith("ssh-"):
        raise RuntimeError(
            "Provided SSH key material looks like a public key (starts with 'ssh-'). "
            "Supply the *private* key (e.g. '-----BEGIN OPENSSH PRIVATE KEY-----')."
        )
    key_text = key_text.replace("\r\n", "\n").replace("\r", "\n").strip() + "\n"
    first_line = key_text.splitlines()[0] if key_text.strip() else ""
    if first_line:
        print(f"SSH key header: {first_line}")
    key_buf = io.StringIO(key_text)
    last_exc: Optional[Exception] = None
    key_classes = [
        getattr(paramiko, "Ed25519Key", None),
        getattr(paramiko, "RSAKey", None),
        getattr(paramiko, "ECDSAKey", None),
        getattr(paramiko, "DSSKey", None),
    ]
    errors = []
    for key_cls in [c for c in key_classes if c is not None]:
        try:
            key_buf.seek(0)
            return key_cls.from_private_key(key_buf)
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            errors.append(f"{getattr(key_cls, '__name__', str(key_cls))}: {type(exc).__name__}: {exc}")
    details = "; ".join(errors[-3:]) if errors else f"{type(last_exc).__name__}: {last_exc}"
    raise RuntimeError(f"Unable to parse SSH private key ({details})")


def _connect(host: str, user: str, key_text: str) -> paramiko.SSHClient:
    pkey = _load_private_key(key_text)
    fp_hex = pkey.get_fingerprint().hex()
    fp_colon = ":".join(fp_hex[i : i + 2] for i in range(0, len(fp_hex), 2))

    def _try_connect(*, disabled_algorithms: Optional[dict] = None) -> paramiko.SSHClient:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=host,
            username=user,
            pkey=pkey,
            timeout=30,
            banner_timeout=30,
            auth_timeout=30,
            allow_agent=False,
            look_for_keys=False,
            disabled_algorithms=disabled_algorithms,
        )
        return client

    try:
        return _try_connect()
    except paramiko.AuthenticationException as exc:
        raise RuntimeError(
            f"SSH authentication failed for {user}@{host}.\n"
            f"- Key fingerprint offered: {fp_colon}\n"
            "- Fix: ensure the matching *public* key is present in the target user's ~/.ssh/authorized_keys, "
            "and that HETZNER_USER matches that account.\n"
            "- If you meant to use the repo deploy key, make sure GitHub secret HETZNER_SSH_KEY contains the "
            "matching *private* key (not the .pub)."
        ) from exc
    except (paramiko.AuthenticationException, paramiko.SSHException) as exc:
        if isinstance(pkey, paramiko.RSAKey):
            for disabled in (
                {"pubkeys": ["ssh-rsa"]},
                {"pubkeys": ["rsa-sha2-256", "rsa-sha2-512"]},
            ):
                try:
                    return _try_connect(disabled_algorithms=disabled)
                except (paramiko.AuthenticationException, paramiko.SSHException):
                    continue
            if "no RSA pubkey algorithms are configured" in str(exc):
                raise RuntimeError(
                    "SSH server rejected RSA keys (no RSA pubkey algorithms enabled). "
                    "Use an Ed25519/ECDSA key for deployment, or update the server SSHD config to allow RSA."
                ) from exc
        raise


def _run(client: paramiko.SSHClient, command: str) -> Tuple[int, str, str]:
    stdin, stdout, stderr = client.exec_command(command)
    _ = stdin
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    exit_code = stdout.channel.recv_exit_status()
    return exit_code, out, err


def _upload_bytes(client: paramiko.SSHClient, data: bytes, remote_path: str, mode: int = 0o644) -> None:
    """Write bytes to a remote file by piping through stdin — no SFTP required.

    Uses a .tmp-then-rename pattern for atomicity, and sudo-with-fallback
    so it works whether or not the deploy user owns the target directory.
    """
    tmp_path = remote_path + ".tmp"
    mode_oct = oct(mode)[2:]

    # Write via stdin: `cat > tmp` then atomic rename + chmod.
    # Use sudo for the move/chmod so root-owned directories work too.
    cmd = (
        f"cat > {tmp_path} && "
        f"(sudo mv {tmp_path} {remote_path} && sudo chmod {mode_oct} {remote_path} || "
        f"mv {tmp_path} {remote_path} && chmod {mode_oct} {remote_path})"
    )
    transport = client.get_transport()
    if transport is None:
        raise RuntimeError("SSH transport is not available")
    chan = transport.open_session()
    chan.exec_command(cmd)
    chan.sendall(data)
    chan.shutdown_write()
    exit_code = chan.recv_exit_status()
    err = chan.recv_stderr(65536).decode("utf-8", errors="replace")
    chan.close()
    if exit_code != 0:
        raise RuntimeError(f"Upload to {remote_path} failed (exit {exit_code}): {err.strip()}")


def _upload_file(client: paramiko.SSHClient, local_path: str, remote_path: str, mode: int = 0o644) -> None:
    with open(local_path, "rb") as f:
        data = f.read()
    _upload_bytes(client, data, remote_path, mode=mode)


def _upload_text(client: paramiko.SSHClient, text: str, remote_path: str, mode: int = 0o644) -> None:
    _upload_bytes(client, text.encode("utf-8"), remote_path, mode=mode)


def _ensure_dir(client: paramiko.SSHClient, path: str) -> None:
    code, _, err = _run(client, f"mkdir -p {path} 2>/dev/null || sudo mkdir -p {path}")
    if code != 0:
        raise RuntimeError(f"mkdir failed: {err.strip()}")
    _run(client, f"sudo chmod 755 {path} || chmod 755 {path} || true")


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


def _patch_env_prod(client: paramiko.SSHClient, remote_env: str, patches: dict) -> None:
    """Update specific keys in an existing .env.prod on the remote host."""
    code, out, _ = _run(client, f"cat {remote_env}")
    if code != 0:
        print(f"  {remote_env} not found, skipping patch.")
        return
    lines = out.splitlines()
    new_lines = []
    patched = set()
    for line in lines:
        key = line.split("=", 1)[0].strip()
        if key in patches:
            new_lines.append(f"{key}={patches[key]}")
            patched.add(key)
        else:
            new_lines.append(line)
    for key, val in patches.items():
        if key not in patched:
            new_lines.append(f"{key}={val}")
    _upload_text(client, "\n".join(new_lines) + "\n", remote_env, mode=0o600)
    for key in patches:
        print(f"  Patched {key}")


def _bootstrap_ufw(client: paramiko.SSHClient) -> None:
    cmds = [
        "sudo ufw --force reset",
        "sudo ufw allow OpenSSH",
        "sudo ufw allow 80/tcp",
        "sudo ufw --force enable",
        "sudo ufw status verbose",
    ]
    for cmd in cmds:
        code, out, err = _run(client, cmd)
        if code != 0:
            raise RuntimeError(f"UFW cmd failed ({cmd}): {err.strip()}")
        if out:
            print(out.strip())


def main() -> int:
    args = _parse_args()

    ssh_key_text: Optional[str] = args.ssh_key
    if args.ssh_key_file:
        ssh_key_text = open(args.ssh_key_file, "r", encoding="utf-8").read()
    if not ssh_key_text:
        print("Missing SSH key material", file=sys.stderr)
        return 2

    if not (args.upload or args.write_env_prod or args.bootstrap_ufw or args.deploy or args.prune):
        print("Nothing to do: pass at least one of --upload, --write-env-prod, --bootstrap-ufw, --prune, --deploy", file=sys.stderr)
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

    with _connect(args.host, args.user, ssh_key_text) as client:
        _ensure_dir(client, args.deploy_path)

        # Always report disk usage so CI logs show available space.
        _, df_out, _ = _run(client, "df -h /")
        print(f"Disk usage:\n{df_out.strip()}")

        if args.prune:
            print("Pruning unused Docker images, containers, networks and build cache...")
            code, out, err = _run(client, "docker system prune -af --volumes 2>&1 || docker system prune -af 2>&1")
            if out:
                print(out.strip())
            _, df_out, _ = _run(client, "df -h /")
            print(f"Disk usage after prune:\n{df_out.strip()}")

        if args.upload:
            _upload_file(client, local_compose, posixpath.join(args.deploy_path, "docker-compose.prod.yml"))
            print("Uploaded docker-compose.prod.yml")
            _upload_file(client, local_caddyfile, posixpath.join(args.deploy_path, "Caddyfile"))
            print("Uploaded Caddyfile")

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
                _upload_text(client, rendered, remote_env, mode=0o600)
                print(f"Created {remote_env}")
            else:
                print("Skipping .env.prod (already exists).")

        if args.update_env_prod:
            remote_env = posixpath.join(args.deploy_path, ".env.prod")
            allowed = args.allowed_hosts or (f"app.cowrkflow.com,{args.server_ip},localhost,127.0.0.1" if args.server_ip else None)
            patches = {}
            if allowed:
                patches["ALLOWED_HOSTS"] = allowed
                patches["CORS_ALLOWED_ORIGINS"] = "https://app.cowrkflow.com"
                patches["FRONTEND_BASE_URL"] = "https://app.cowrkflow.com"

            # Optional: patch email settings from CI environment variables (values are not printed).
            # Only apply keys that are explicitly present and non-empty.
            env_patch_keys = [
                "EMAIL_PROVIDER",
                "EMAIL_BACKEND",
                "DEFAULT_FROM_EMAIL",
                "EMAIL_HOST",
                "EMAIL_PORT",
                "EMAIL_HOST_USER",
                "EMAIL_HOST_PASSWORD",
                "EMAIL_USE_TLS",
                "EMAIL_USE_SSL",
                "RESEND_API_KEY",
                "SENDGRID_API_KEY",
            ]
            for key in env_patch_keys:
                val = (os.environ.get(key) or "").strip()
                if val:
                    patches[key] = val
            # GITHUB_* env vars are reserved by GitHub Actions runner, so they are
            # passed with a COWRK_ prefix and remapped here before patching .env.prod.
            cowrk_github_keys = {
                "COWRK_GITHUB_CLIENT_ID": "GITHUB_CLIENT_ID",
                "COWRK_GITHUB_CLIENT_SECRET": "GITHUB_CLIENT_SECRET",
                "COWRK_GITHUB_REDIRECT_URI": "GITHUB_REDIRECT_URI",
                "COWRK_GITHUB_WEBHOOK_SECRET": "GITHUB_WEBHOOK_SECRET",
            }
            for env_key, patch_key in cowrk_github_keys.items():
                val = (os.environ.get(env_key) or "").strip()
                if val:
                    patches[patch_key] = val
            print(f"Patching {remote_env}...")
            _patch_env_prod(client, remote_env, patches)

        if args.bootstrap_ufw:
            _bootstrap_ufw(client)

        if args.deploy:
            if not (args.ghcr_username and args.ghcr_token):
                raise RuntimeError("Deploy requires --ghcr-username and --ghcr-token.")
            if not (args.image_backend and args.image_frontend):
                raise RuntimeError("Deploy requires --image-backend and --image-frontend.")

            deploy_sha = args.deploy_sha or ""
            dp = args.deploy_path
            login = f"echo '{args.ghcr_token}' | docker login '{args.registry}' -u '{args.ghcr_username}' --password-stdin"
            pull = (
                f"cd {dp} && IMAGE_BACKEND='{args.image_backend}' IMAGE_FRONTEND='{args.image_frontend}' "
                f"docker compose --env-file .env.prod -f docker-compose.prod.yml pull"
            )
            migrate = (
                f"cd {dp} && IMAGE_BACKEND='{args.image_backend}' IMAGE_FRONTEND='{args.image_frontend}' "
                f"docker compose --env-file .env.prod -f docker-compose.prod.yml run --rm backend "
                f"python manage.py migrate --noinput"
            )
            up = (
                f"cd {dp} && IMAGE_BACKEND='{args.image_backend}' IMAGE_FRONTEND='{args.image_frontend}' "
                f"docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --remove-orphans"
            )
            tag = (
                f"cd {dp} && echo '{deploy_sha}' > current.sha && "
                f"echo \"$(date -u +%Y-%m-%dT%H:%M:%SZ) {deploy_sha}\" >> releases.log"
                if deploy_sha
                else "true"
            )

            for cmd in (login, tag, pull, migrate, up):
                code, out, err = _run(client, cmd)
                if out:
                    print(out.strip())
                if code != 0:
                    raise RuntimeError(f"Remote command failed ({cmd}): {err.strip()}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

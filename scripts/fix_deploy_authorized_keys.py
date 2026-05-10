import argparse
import getpass
import os
import posixpath

import paramiko


DEFAULT_PUBKEY_FILE = os.path.join("deploy", "keys", "hetzner_deploy_ed25519.pub")


def _run(ssh: paramiko.SSHClient, cmd: str) -> None:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    _ = stdin
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out.strip():
        print(out.strip())
    if code != 0:
        raise RuntimeError(f"Command failed ({code}): {cmd}\n{err.strip()}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fix /home/<user>/.ssh/authorized_keys on a remote host using Paramiko.",
    )
    parser.add_argument("--host", required=True)
    parser.add_argument("--user", required=True, help="SSH user (must be root or a sudoer if you adjust commands).")
    auth = parser.add_mutually_exclusive_group(required=True)
    auth.add_argument("--password", action="store_true", help="Prompt for SSH password.")
    auth.add_argument("--ssh-key-file", help="Path to SSH private key file (ed25519/rsa/etc).")
    parser.add_argument("--target-user", default="deploy", help="User to receive the authorized_keys file.")
    pub = parser.add_mutually_exclusive_group(required=False)
    pub.add_argument("--pubkey", help="Public key line to write into authorized_keys.")
    pub.add_argument(
        "--pubkey-file",
        default=DEFAULT_PUBKEY_FILE if os.path.exists(DEFAULT_PUBKEY_FILE) else None,
        help=f"Path to .pub file (default: {DEFAULT_PUBKEY_FILE} if it exists).",
    )

    args = parser.parse_args()

    pubkey_line = (args.pubkey or "").strip()
    if not pubkey_line and args.pubkey_file:
        pubkey_line = open(args.pubkey_file, "r", encoding="utf-8").read().strip()
    if not pubkey_line:
        raise SystemExit("Missing public key. Pass --pubkey or --pubkey-file.")
    if not pubkey_line.startswith("ssh-"):
        raise SystemExit("Public key must start with 'ssh-' (OpenSSH public key format).")
    pubkey_line = pubkey_line.replace("\r\n", "\n").replace("\r", "\n").strip() + "\n"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    if args.password:
        pw = getpass.getpass(f"{args.user}@{args.host} password: ")
        ssh.connect(
            hostname=args.host,
            username=args.user,
            password=pw,
            timeout=30,
            banner_timeout=30,
            auth_timeout=30,
            allow_agent=False,
            look_for_keys=False,
        )
    else:
        pkey = None
        try:
            pkey = paramiko.Ed25519Key.from_private_key_file(args.ssh_key_file)
        except Exception:  # noqa: BLE001
            try:
                pkey = paramiko.RSAKey.from_private_key_file(args.ssh_key_file)
            except Exception as exc:  # noqa: BLE001
                raise RuntimeError(f"Unable to load private key: {exc}") from exc

        ssh.connect(
            hostname=args.host,
            username=args.user,
            pkey=pkey,
            timeout=30,
            banner_timeout=30,
            auth_timeout=30,
            allow_agent=False,
            look_for_keys=False,
        )

    target_home = f"/home/{args.target_user}"
    ssh_dir = posixpath.join(target_home, ".ssh")
    auth_keys = posixpath.join(ssh_dir, "authorized_keys")

    # Ensure user exists + SSH dir exists with strict permissions.
    _run(
        ssh,
        f"id -u {args.target_user} >/dev/null 2>&1 || adduser --disabled-password --gecos '' {args.target_user}",
    )
    _run(ssh, f"install -d -m 700 -o {args.target_user} -g {args.target_user} {ssh_dir}")

    # Write authorized_keys via SFTP to avoid terminal wrapping / CRLF issues.
    with ssh.open_sftp() as sftp:
        tmp = auth_keys + ".tmp"
        with sftp.file(tmp, "w") as f:
            f.write(pubkey_line)
        sftp.chmod(tmp, 0o600)
        sftp.posix_rename(tmp, auth_keys)

    _run(ssh, f"chown {args.target_user}:{args.target_user} {auth_keys}")
    _run(ssh, f"chmod 600 {auth_keys}")

    # Verify the key parses + show it.
    _run(ssh, f"ssh-keygen -lf {auth_keys}")
    _run(ssh, f"tail -n 1 {auth_keys}")

    ssh.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

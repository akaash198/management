"""
Connects to the production server via SSH and runs seed_amazon_qc_demo
(Amazon Quick Commerce — London, 3-zone dark-store network).

Usage:
    python run_seed_amazon_qc.py           # seed
    python run_seed_amazon_qc.py --reset   # reset then re-seed
"""

import argparse
import sys
import paramiko

HOST      = "65.21.111.177"
PORT      = 22
USER      = "deploy"
KEY_PATH  = r"C:\Users\akaas\.ssh\hetzner_ed25519"
DEMO_PASS = "Amazon@London25"


def run(client, cmd, timeout=180):
    print(f"\n$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        print(out)
    if err:
        print("[stderr]", err)
    return out.strip()


def main():
    parser = argparse.ArgumentParser(description="Seed Amazon QC London demo on production.")
    parser.add_argument("--reset", action="store_true", help="Reset existing demo data before seeding.")
    args = parser.parse_args()

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {USER}@{HOST}:{PORT} ...")
    client.connect(HOST, port=PORT, username=USER, key_filename=KEY_PATH, timeout=15)
    print("Connected.\n")

    # Locate manage.py
    result = run(client, "find /home /var /srv /opt /root -name 'manage.py' 2>/dev/null | grep -v venv | head -5")
    lines = [l.strip() for l in result.splitlines() if "manage.py" in l]
    if not lines:
        print("ERROR: Could not find manage.py on server.")
        client.close()
        sys.exit(1)

    manage_py   = lines[0]
    backend_dir = manage_py.replace("/manage.py", "")
    print(f"Backend : {backend_dir}")

    # Locate python binary
    venv_python = run(client, f"ls {backend_dir}/venv/bin/python 2>/dev/null || which python3")
    python_bin  = venv_python.strip().splitlines()[-1]
    print(f"Python  : {python_bin}")

    # Upload seed command
    local_seed  = r"d:\management\flowteam_backend\apps\companies\management\commands\seed_amazon_qc_demo.py"
    remote_seed = f"{backend_dir}/apps/companies/management/commands/seed_amazon_qc_demo.py"
    print(f"\nUploading seed command → {remote_seed}")
    sftp = client.open_sftp()
    sftp.put(local_seed, remote_seed)
    sftp.close()
    print("Upload complete.")

    # Reset if requested
    if args.reset:
        print("\nResetting existing demo data...")
        run(client,
            f"cd {backend_dir} && DEMO_PASSWORD='{DEMO_PASS}' {python_bin} manage.py seed_amazon_qc_demo --reset --confirm",
            timeout=120)

    # Run seed
    print("\nRunning seed...")
    run(client,
        f"cd {backend_dir} && DEMO_PASSWORD='{DEMO_PASS}' {python_bin} manage.py seed_amazon_qc_demo",
        timeout=300)

    client.close()
    print("\nDone.")


if __name__ == "__main__":
    main()

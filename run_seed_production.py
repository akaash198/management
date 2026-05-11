"""
Connects to the production server via SSH and runs seed_company_demo.
"""

import paramiko
import sys

HOST      = "65.21.111.177"
PORT      = 22
USER      = "deploy"
KEY_PATH  = r"C:\Users\akaas\.ssh\hetzner_ed25519"
DEMO_PASS = "Demo@123"

def run(client, cmd, timeout=120):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        print(out)
    if err:
        print("[stderr]", err)
    return out.strip()

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f"Connecting to {USER}@{HOST}:{PORT} with key {KEY_PATH} ...")
    client.connect(HOST, port=PORT, username=USER, key_filename=KEY_PATH, timeout=15)
    print("Connected.\n")

    # Step 1: find manage.py
    result = run(client, "find /home /var /srv /opt /root -name 'manage.py' 2>/dev/null | grep -v venv | head -10")

    if not result:
        print("manage.py not found in common locations. Trying broader search...")
        result = run(client, "find / -name 'manage.py' 2>/dev/null | grep -v venv | grep -v node_modules | head -10")

    lines = [l.strip() for l in result.splitlines() if l.strip() and "manage.py" in l]
    if not lines:
        print("ERROR: Could not locate manage.py on the server.")
        client.close()
        sys.exit(1)

    manage_py = lines[0]
    backend_dir = manage_py.replace("/manage.py", "")
    print(f"\nFound backend at: {backend_dir}")

    # Step 2: find python / virtualenv
    venv_python = run(client, f"ls {backend_dir}/venv/bin/python 2>/dev/null || ls {backend_dir}/../venv/bin/python 2>/dev/null || which python3")
    python_bin = venv_python.strip().splitlines()[-1] if venv_python.strip() else "python3"
    print(f"Using python: {python_bin}")

    # Step 3: run seed
    seed_cmd = f"cd {backend_dir} && DEMO_PASSWORD='{DEMO_PASS}' {python_bin} manage.py seed_company_demo"
    print(f"\nRunning seed command...")
    run(client, seed_cmd, timeout=180)

    client.close()
    print("\nDone.")

if __name__ == "__main__":
    main()

"""
Connects to the production server via SSH, uploads a Django shell script,
runs it inside the backend container, then cleans up.
"""

import paramiko
import io

HOST     = "65.21.111.177"
PORT     = 22
USER     = "root"
SSH_PASS = "Gomathi@19"

DJANGO_SCRIPT = """\
from django.contrib.auth import get_user_model
User = get_user_model()
emails = [
    'sarah@nova-agency.com',
    'alex@nova-agency.com',
    'priya@nova-agency.com',
    'jordan@nova-agency.com',
    'dana@nova-agency.com',
    'marcus@nova-agency.com',
]
for email in emails:
    try:
        u = User.objects.get(email=email)
        u.set_password('Demo@123')
        u.save()
        print('Updated:', email)
    except User.DoesNotExist:
        print('Not found:', email)
"""

REMOTE_SCRIPT = "/tmp/reset_demo_passwords.py"

def run(client, cmd, timeout=60):
    print(f"$ {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    if out:
        print(out)
    if err:
        print("[stderr]", err)
    return out

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    print(f"Connecting to {USER}@{HOST} ...")
    client.connect(HOST, port=PORT, username=USER, password=SSH_PASS, timeout=15)
    print("Connected.\n")

    # Upload script to server
    sftp = client.open_sftp()
    sftp.putfo(io.BytesIO(DJANGO_SCRIPT.encode()), REMOTE_SCRIPT)
    sftp.close()
    print(f"Uploaded script to {REMOTE_SCRIPT}\n")

    # Copy script into container and run it
    run(client, f"docker cp {REMOTE_SCRIPT} flowteam-backend-1:{REMOTE_SCRIPT}")
    run(client, f"docker exec flowteam-backend-1 python manage.py shell < {REMOTE_SCRIPT}")

    # Cleanup
    run(client, f"rm {REMOTE_SCRIPT}")
    run(client, f"docker exec flowteam-backend-1 rm {REMOTE_SCRIPT}")

    client.close()
    print("\nDone. All demo accounts now use password: Demo@123")

if __name__ == "__main__":
    main()

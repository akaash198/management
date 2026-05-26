import paramiko
import os

HOST = "65.21.111.177"
PORT = 22

keys = [
    r"C:\Users\akaas\.ssh\hetzner_ed25519",
    r"d:\management\deploy\keys\hetzner_deploy_ed25519",
    r"d:\management\deploy\keys\hetzner_deploy_ed25519_ci",
    r"d:\management\deploy\keys\hetzner_deploy_rsa",
    r"d:\management\deploy\keys\hetzner_deploy_rsa_pem",
]

users = ["deploy", "root"]

def test_connection():
    for key in keys:
        if not os.path.exists(key):
            print(f"Key not found: {key}")
            continue
        for user in users:
            print(f"Testing key {os.path.basename(key)} for user {user}...")
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            try:
                client.connect(HOST, port=PORT, username=user, key_filename=key, timeout=5)
                print(f"SUCCESS! user={user}, key={key}")
                
                # Run quick docker ps to verify docker is accessible
                stdin, stdout, stderr = client.exec_command("docker ps", timeout=10)
                out = stdout.read().decode("utf-8", errors="replace")
                err = stderr.read().decode("utf-8", errors="replace")
                print("docker ps output:")
                print(out)
                if err:
                    print("docker ps stderr:", err)
                    
                client.close()
                return user, key
            except Exception as e:
                print(f"Failed: {e}")
            finally:
                client.close()
    return None

if __name__ == "__main__":
    test_connection()

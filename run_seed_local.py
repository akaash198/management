import os
import subprocess
import sys

def main():
    # Detect platform-specific python binary
    python_bin = sys.executable
    
    # Path to manage.py
    # Assuming the script is run from the root directory 'd:\management'
    backend_dir = os.path.join(os.getcwd(), "flowteam_backend")
    manage_py = os.path.join(backend_dir, "manage.py")
    
    if not os.path.exists(manage_py):
        print(f"ERROR: Could not find manage.py at {manage_py}")
        sys.exit(1)
        
    print(f"Found backend at: {backend_dir}")
    print(f"Using python: {python_bin}")
    
    # Environment variables
    env = os.environ.copy()
    env["DEMO_PASSWORD"] = "Demo@123"

    # Check if running in Docker
    is_docker = os.path.exists(os.path.join(os.getcwd(), "docker-compose.yml"))
    
    if is_docker:
        print("Detected docker-compose.yml, running via Docker...")
        cmd = ["docker", "compose", "exec", "-e", "DEMO_PASSWORD=Demo@123", "backend", "python", "manage.py", "seed_company_demo"]
        cwd = os.getcwd()
    else:
        # Command to run locally
        cmd = [python_bin, "manage.py", "seed_company_demo"]
        cwd = backend_dir
    
    print(f"\nRunning seed command: {' '.join(cmd)}")
    
    try:
        # Run the command
        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Stream the output
        for line in process.stdout:
            print(line, end="")
            
        process.wait()
        
        if process.returncode == 0:
            print("\nSeeding completed successfully.")
        else:
            print(f"\nSeeding failed with return code {process.returncode}")
            
    except Exception as e:
        print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    main()

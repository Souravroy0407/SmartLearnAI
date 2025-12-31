import subprocess
import sys

with open("verify_log.txt", "w") as f:
    try:
        # Run the inner script
        result = subprocess.run(
            [sys.executable, "backend/verify_features.py"], 
            capture_output=True, 
            text=True,
            cwd=r"d:\Codes\Projects\SmartLearn AI"
        )
        f.write("STDOUT:\n")
        f.write(result.stdout)
        f.write("\nSTDERR:\n")
        f.write(result.stderr)
        f.write(f"\nReturn Code: {result.returncode}\n")
    except Exception as e:
        f.write(f"Wrapper Failed: {e}")

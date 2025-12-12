import requests
import time

# Configuration
BASE_URL = "https://localhost:5174/api/auth/login" # Using the HTTPS port we just set up, or 8000 if accessing backend directly
# We should target the backend port directly to avoid CORS/network noise if possible, but user asked for "webpage" context. 
# Usually backend runs on 8000. Let's try 8000 first as it's the direct API.
BACKEND_URL = "http://localhost:8000/api/auth/login"

EMAIL = "test@example.com" # We need a user that likely exists or we can just try to login as 'admin'
PASSWORD_LIST = [f"password{i}" for i in range(20)]

def run_attack():
    print(f"[*] Starting Brute Force Attack on {BACKEND_URL}")
    print(f"[*] Target User: {EMAIL}")
    print("[*] Attempting 20 rapid login requests...")

    success_count = 0
    blocked_count = 0

    for i, password in enumerate(PASSWORD_LIST):
        try:
            response = requests.post(BACKEND_URL, json={"email": EMAIL, "password": password})
            
            if response.status_code == 200:
                print(f"[{i+1}] SUCCESS: Login successful (Password found: {password})")
                break # unlikely, but just in case
            elif response.status_code == 401:
                print(f"[{i+1}] FAILED: Incorrect password (Status: 401) - Server accepted the attempt")
                success_count += 1
            elif response.status_code == 429:
                print(f"[{i+1}] BLOCKED: Rate limit hit (Status: 429) - Server stopped us!")
                blocked_count += 1
            else:
                print(f"[{i+1}] ERROR: Status {response.status_code}")
                
        except Exception as e:
            print(f"[{i+1}] REQUEST ERROR: {e}")
        
    print("\n[*] Attack Finished")
    if blocked_count == 0:
        print("[CRITICAL] VULNERABILITY CONFIRMED: The server allowed ALL attempts. No rate limiting detected.")
    else:
        print("[SAFE] SECURE: The server blocked excessive attempts.")

if __name__ == "__main__":
    run_attack()

import requests
import sys

BASE_URL = "http://localhost:8000/api"
EMAIL = "debug_user_v2@example.com"
PASSWORD = "password123"

def debug_login():
    print(f"Attempting login for {EMAIL}...")
    try:
        # Register first to be sure
        print("Registering...")
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASSWORD, "full_name": "Debug User"})
        print(f"Registration Status: {reg_resp.status_code}")
        if reg_resp.status_code != 200:
            print(f"Registration Body: {reg_resp.text}")

        # Login
        print("Logging in...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        print(f"Login Status Code: {resp.status_code}")
        print(f"Login Response: {resp.text}", flush=True)
        
    except Exception as e:
        print(f"Request failed: {e}", flush=True)

if __name__ == "__main__":
    debug_login()

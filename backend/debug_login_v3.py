import requests
import traceback

BASE_URL = "http://localhost:8000/api"
EMAIL = "debug_user_v3@example.com"
PASSWORD = "password123"

def log(msg):
    with open("debug_log_v3.txt", "a") as f:
        f.write(msg + "\n")
    print(msg)

def debug_login():
    log(f"Attempting login for {EMAIL}...")
    try:
        # Register
        log("Registering...")
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASSWORD, "full_name": "Debug User"})
        log(f"Registration Status: {reg_resp.status_code}")
        if reg_resp.status_code != 200:
            log(f"Registration Body: {reg_resp.text}")

        # Login
        log("Logging in...")
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        log(f"Login Status Code: {resp.status_code}")
        log(f"Login Response: {resp.text}")
        
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            log(f"Got Token. Checking /me endpoint...")
            headers = {"Authorization": f"Bearer {token}"}
            me_resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
            log(f"/me Status Code: {me_resp.status_code}")
            log(f"/me Response: {me_resp.text}")
        
    except Exception as e:
        log(f"Request failed: {e}")
        log(traceback.format_exc())

if __name__ == "__main__":
    # Clear log
    with open("debug_log_v3.txt", "w") as f:
        f.write("Starting Trace\n")
    debug_login()

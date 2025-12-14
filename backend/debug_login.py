import requests

BASE_URL = "http://localhost:8000/api"
EMAIL = "test_planner@example.com"
PASSWORD = "password123"

def debug_login():
    print(f"Attempting login for {EMAIL}...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")
        
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    debug_login()

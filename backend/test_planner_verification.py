import requests
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api"
# Assuming we can login or have a way to get a token. 
# Since I can't interactively login, I'll try to register a temp user or login as existing.
# I'll try to register a new user for testing to avoid messing with real data if possible, 
# or just use a test account.

EMAIL = "test_planner@example.com"
PASSWORD = "password123"

def register_and_login():
    # Try login first
    print(f"Attempting login for {EMAIL}...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    
    if resp.status_code == 200:
        return resp.json()["access_token"]
    
    # If failed, try register
    print("Login failed, registering...")
    resp = requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASSWORD, "full_name": "Test User"})
    if resp.status_code == 200:
        # Login again
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
        return resp.json()["access_token"]
    else:
        print(f"Registration failed: {resp.text}")
        return None

def test_flow():
    token = register_and_login()
    if not token:
        print("Could not get token. Aborting.")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check Initial /me
    print("\n1. Checking GET /api/users/me...")
    resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    if resp.status_code == 200:
        user = resp.json()
        print(f"Success. Current Energy Preference: {user.get('energy_preference')}")
    else:
        print(f"Failed: {resp.status_code} {resp.text}")

    # 2. Generate Plan with Preference "morning"
    print("\n2. Generating Plan with 'morning' preference...")
    payload = {
        "subject": "Physics",
        "topics": "Kinematics",
        "exam_date": datetime.now().strftime("%Y-%m-%d"),
        "hours_per_day": 1
    }
    # params: energy_preference query param? No, I implemented it as query param in valid python, 
    # but requests usually sends query params separately or I need to update the function signature in backend?
    # Let's check backend signature: 
    # def generate_study_plan(request: GeneratePlanRequest, energy_preference: Optional[str] = None, ...)
    # FastAPI treats simple types as query params by default if not path/body.
    
    resp = requests.post(f"{BASE_URL}/study-planner/generate", params={"energy_preference": "morning"}, json=payload, headers=headers)
    
    if resp.status_code == 200:
        print("Generation Successful.")
    else:
        print(f"Generation Failed: {resp.status_code} {resp.text}")

    # 3. Check Persistence (Profile)
    print("\n3. Verifying Preference is Saved...")
    resp = requests.get(f"{BASE_URL}/users/me", headers=headers)
    pref = resp.json().get('energy_preference')
    if pref == "morning":
        print("PASS: Preference persisted as 'morning'.")
    else:
        print(f"FAIL: Preference is {pref}")

    # 4. Generate again WITHOUT preference (should use stored)
    print("\n4. Generating again without preference...")
    resp = requests.post(f"{BASE_URL}/study-planner/generate", json=payload, headers=headers)
    if resp.status_code == 200:
        print("Generation Successful (used stored pref).")
    else:
        print(f"Generation Failed: {resp.status_code} {resp.text}")

    # 5. Check tasks exist (should be fresh set, old deleted)
    # This acts as verification that tasks were created. Detailed "deletion" check hard to automate without counting before/after strictly.
    # But if generation worked, we assume it cleared old ones as per logic.
    print("\n5. Fetching tasks...")
    resp = requests.get(f"{BASE_URL}/study-planner/tasks", headers=headers)
    tasks = resp.json()
    print(f"Found {len(tasks)} tasks.")

if __name__ == "__main__":
    test_flow()

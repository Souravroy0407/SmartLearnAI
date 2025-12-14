import requests
from datetime import datetime

BASE_URL = "http://localhost:8000/api"
EMAIL = "test_planner@example.com"
PASSWORD = "password123"

def test_reoptimize():
    # Login
    print("Logging in...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
    if resp.status_code != 200:
        print("Login failed. Trying register...")
        # Try register if login fails (if it's a new test run or DB reset)
        requests.post(f"{BASE_URL}/auth/register", json={"email": EMAIL, "password": PASSWORD, "full_name": "Test User"})
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": EMAIL, "password": PASSWORD})
        
    if resp.status_code != 200:
        print("Login completely failed.")
        return

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Ensure we have tasks
    print("\n1. Ensuring tasks exist...")
    # Generate if empty
    tasks_resp = requests.get(f"{BASE_URL}/study-planner/tasks", headers=headers)
    if len(tasks_resp.json()) == 0:
        print("No tasks found. Generating...")
        payload = {
            "subject": "Math",
            "topics": "Calculus",
            "exam_date": datetime.now().strftime("%Y-%m-%d"),
            "hours_per_day": 2
        }
        requests.post(f"{BASE_URL}/study-planner/generate", json=payload, headers=headers)

    # 2. Check current times
    print("\n2. Checking current task times...")
    tasks = requests.get(f"{BASE_URL}/study-planner/tasks", headers=headers).json()
    if not tasks:
        print("Still no tasks. Aborting.")
        return
    
    print(f"Sample Task Time: {tasks[0]['start_time']}")

    # 3. Re-optimize to NIGHT
    print("\n3. Re-optimizing to NIGHT (Peak: 7 PM / 19:00)...")
    resp = requests.post(f"{BASE_URL}/study-planner/reoptimize", params={"energy_preference": "night"}, headers=headers)
    print(f"Response: {resp.text}")

    # 4. Verify Time Change
    print("\n4. Verifying time change...")
    new_tasks = requests.get(f"{BASE_URL}/study-planner/tasks", headers=headers).json()
    
    # Check if any task is now in evening (19:00+)
    night_tasks = 0
    for t in new_tasks:
        dt = datetime.fromisoformat(t['start_time'])
        if dt.hour >= 19:
            night_tasks += 1
            
    print(f"Found {night_tasks} tasks scheduled for Night (19:00+).")
    if night_tasks > 0:
        print("SUCCESS: Tasks moved to night.")
    else:
        print("WARNING: No tasks moved to night. (Maybe all tasks were 'easy'?)")

    # 5. Re-optimize to MORNING
    print("\n5. Re-optimizing to MORNING (Peak: 6 AM)...")
    requests.post(f"{BASE_URL}/study-planner/reoptimize", params={"energy_preference": "morning"}, headers=headers)
    
    new_tasks_morning = requests.get(f"{BASE_URL}/study-planner/tasks", headers=headers).json()
    morning_tasks = 0
    for t in new_tasks_morning:
        dt = datetime.fromisoformat(t['start_time'])
        if dt.hour >= 6 and dt.hour < 12:
            morning_tasks += 1
            
    print(f"Found {morning_tasks} tasks scheduled for Morning (06:00-12:00).")
    if morning_tasks > 0:
        print("SUCCESS: Tasks moved to morning.")

if __name__ == "__main__":
    test_reoptimize()

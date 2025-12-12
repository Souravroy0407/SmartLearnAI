import requests
import json

URL = "http://localhost:8000/api/auth/login"

def test_login(email, password):
    print(f"Testing login for {email}...")
    try:
        response = requests.post(URL, json={"email": email, "password": password})
        if response.status_code == 200:
            print(f"SUCCESS: {response.json()}")
        else:
            print(f"FAILURE: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_login("admin@gmail.com", "123@")
    test_login("teacher@gmail.com", "123@")
    test_login("sr7744941@gmail.com", "123@")

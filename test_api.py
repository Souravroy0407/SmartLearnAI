import requests
import time

URL = "http://localhost:8000/api/auth/register"
DATA = {
    "email": "api_test_user@example.com",
    "password": "strongpassword123",
    "full_name": "API Tester"
}

print(f"Sending POST to {URL}...")
try:
    response = requests.post(URL, json=DATA)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")

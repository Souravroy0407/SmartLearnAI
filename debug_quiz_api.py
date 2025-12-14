import requests
import sys

def test_api():
    try:
        print("Testing GET http://localhost:8000/api/quiz/")
        response = requests.get("http://localhost:8000/api/quiz/")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response JSON:")
            print(response.json())
        else:
            print("Error Text:")
            print(response.text)
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()

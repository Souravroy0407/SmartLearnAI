from dotenv import load_dotenv
import os

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
if key:
    print("API Key is PRESENT")
    print(f"Key length: {len(key)}")
    print(f"First 4 chars: {key[:4]}")
else:
    print("API Key is MISSING")


import uvicorn

if __name__ == "__main__":
    print("---------------------------------------------------------")
    print("Starting SmartLearn AI Backend for Mobile & Local access")
    print("Listening on: http://0.0.0.0:8000")
    print("---------------------------------------------------------")
    
    # This configuration forces the server to listen on all network interfaces
    # making it accessible to your phone at http://192.168.x.x:8000
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

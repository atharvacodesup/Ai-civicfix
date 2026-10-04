import urllib.request
import json

api_key = "AIzaSyDv2u7LmOoblfK7_OpxrY3orh9Sat3zOmA"
project_id = "ai-civicfix"
app_id = "1:921736225560:web:4a724d5b595d72e0af346d"

url = f"https://firebaseappcheck.googleapis.com/v1/projects/{project_id}/apps/{app_id}:exchangeDebugToken?key={api_key}"
debug_token = "ddf51d8b-a36d-4299-ab88-4c0f9b9f6d3e"

req = urllib.request.Request(
    url,
    data=json.dumps({"debug_token": debug_token}).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req) as resp:
        print("Success:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode())
except Exception as ex:
    print("Error:", ex)

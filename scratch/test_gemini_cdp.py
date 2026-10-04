import subprocess
import time
import json
import urllib.request
import urllib.error

# Launch Edge headless with remote debugging port
edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9222",
    "--disable-gpu",
    "--no-first-run",
    "--user-data-dir=C:\\Users\\Atharv Naik\\Desktop\\AI-CivicFix-Manual-UI\\scratch\\edge-profile",
    "http://localhost:8000/ai-test.html"
], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

try:
    time.sleep(2)
    # Check CDP endpoint
    res = urllib.request.urlopen("http://127.0.0.1:9222/json")
    pages = json.loads(res.read().decode())
    print("CDP pages found:", len(pages))
    for p in pages:
        print("Page:", p.get("title"), p.get("url"), p.get("webSocketDebuggerUrl"))
finally:
    proc.terminate()

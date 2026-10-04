import subprocess
import time
import json
import urllib.request
import sys
from ws_client import SimpleWebSocket

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
    # Find page
    res = urllib.request.urlopen("http://127.0.0.1:9222/json")
    pages = json.loads(res.read().decode())
    target = None
    for p in pages:
        if "ai-test.html" in p.get("url", ""):
            target = p
            break
    if not target:
        print("Could not find ai-test.html target in:", pages)
        sys.exit(1)

    ws_url = target["webSocketDebuggerUrl"]
    print("Connecting to ws:", ws_url)
    ws = SimpleWebSocket(ws_url)

    # Enable console & runtime
    req_id = 1
    def send_cmd(method, params=None):
        global req_id
        msg = {"id": req_id, "method": method, "params": params or {}}
        req_id += 1
        ws.send(json.dumps(msg))
        return msg["id"]

    send_cmd("Runtime.enable")
    send_cmd("Console.enable")
    send_cmd("Network.enable")

    # Give page time to load module scripts
    time.sleep(2)

    # Click the button via JavaScript
    click_id = send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('test-btn').click();"
    })
    print("Clicked Test Gemini button. Waiting for response...")

    start_time = time.time()
    console_logs = []
    final_result = None

    while time.time() - start_time < 25:
        try:
            raw = ws.recv()
            msg = json.loads(raw)
            if msg.get("method") == "Console.messageAdded":
                text = msg["params"]["message"]["text"]
                console_logs.append(text)
                print(f"[Console] {text}")
            elif msg.get("method") == "Runtime.consoleAPICalled":
                args = [a.get("value", "") for a in msg["params"].get("args", [])]
                text = " ".join(str(a) for a in args)
                console_logs.append(text)
                print(f"[Console API] {text}")
        except Exception:
            pass

        # Poll the DOM every 1.5 seconds
        time.sleep(1.5)
        poll_id = send_cmd("Runtime.evaluate", {
            "expression": "JSON.stringify({ status: document.getElementById('status-text').textContent, response: document.getElementById('response-box').textContent, error: document.getElementById('error-box').textContent })",
            "returnByValue": True
        })
        # Wait for reply
        for _ in range(5):
            raw = ws.recv()
            reply = json.loads(raw)
            if reply.get("id") == poll_id:
                val = json.loads(reply.get("result", {}).get("result", {}).get("value", "{}"))
                if val.get("response") or val.get("error"):
                    final_result = val
                    break
        if final_result:
            break

    print("\n--- TEST RUN RESULTS ---")
    print("Final DOM State:", final_result)
    print("Console Messages Collected:", len(console_logs))

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()

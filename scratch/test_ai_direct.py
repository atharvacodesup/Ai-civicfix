import subprocess
import time
import json
import urllib.request
import base64
import sys

# Start http server
server_proc = subprocess.Popen([
    sys.executable, "-m", "http.server", "8000"
], cwd=r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI", stdout=subprocess.PIPE, stderr=subprocess.PIPE)

time.sleep(1.5)

# Read test-pothole.jpg and convert to data URI
pothole_path = r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI\assets\test-pothole.jpg"
with open(pothole_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
data_uri = f"data:image/jpeg;base64,{b64}"

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9228",
    "--disable-gpu",
    "--no-first-run",
    "--user-data-dir=C:\\Users\\Atharv Naik\\Desktop\\AI-CivicFix-Manual-UI\\scratch\\edge-profile-direct-2",
    "http://localhost:8000/ai-test.html"
], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

try:
    time.sleep(2)
    sys.path.append(r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI\scratch")
    from ws_client import SimpleWebSocket

    res = urllib.request.urlopen("http://127.0.0.1:9228/json")
    pages = json.loads(res.read().decode())
    target = None
    for p in pages:
        if "ai-test.html" in p.get("url", ""):
            target = p
            break
    if not target and pages:
        target = pages[0]

    ws = SimpleWebSocket(target["webSocketDebuggerUrl"])
    req_id = 1
    def send_cmd(method, params=None):
        global req_id
        msg = {"id": req_id, "method": method, "params": params or {}}
        req_id += 1
        ws.send(json.dumps(msg))
        return msg["id"]

    send_cmd("Runtime.enable")
    send_cmd("Console.enable")

    # Call analyzeCivicImage directly via module import
    test_script = f"""
    (async () => {{
        try {{
            const {{ analyzeCivicImage }} = await import('./js/ai-service.js');
            window.__aiResult = await analyzeCivicImage('{data_uri}', 'Large pothole in the middle of the road causing hazard to vehicles.');
        }} catch (err) {{
            window.__aiError = err.message || String(err);
        }}
    }})();
    """
    send_cmd("Runtime.evaluate", {"expression": test_script})
    print("Triggered direct analyzeCivicImage on test-pothole.jpg. Waiting for Gemini...")

    start_time = time.time()
    final_result = None

    while time.time() - start_time < 35:
        time.sleep(2)
        poll_id = send_cmd("Runtime.evaluate", {
            "expression": "JSON.stringify({ result: window.__aiResult, error: window.__aiError })",
            "returnByValue": True
        })

        while True:
            raw = ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == poll_id:
                val = json.loads(msg.get("result", {}).get("result", {}).get("value", "{}"))
                if val.get("result") or val.get("error"):
                    final_result = val
                break
            elif msg.get("method") == "Console.messageAdded":
                print("[Console]", msg["params"]["message"]["text"])
            elif msg.get("method") == "Runtime.consoleAPICalled":
                args = [a.get("value", "") for a in msg["params"].get("args", [])]
                print("[Console API]", " ".join(str(a) for a in args))

        if final_result:
            break

    print("\n--- GEMINI DIRECT IMAGE ANALYSIS RESULT ---")
    print(json.dumps(final_result, indent=2))

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
    server_proc.terminate()

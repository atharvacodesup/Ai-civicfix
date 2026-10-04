import subprocess
import time
import json
import urllib.request
import base64
import os
import sys

# Start http server
server_proc = subprocess.Popen([
    sys.executable, "-m", "http.server", "8000"
], cwd=r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI", stdout=subprocess.PIPE, stderr=subprocess.PIPE)

time.sleep(1.5)

pothole_path = r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI\assets\test-pothole.jpg"
with open(pothole_path, "rb") as f:
    b64 = base64.b64encode(f.read()).decode("ascii")
data_uri = f"data:image/jpeg;base64,{b64}"

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
proc = subprocess.Popen([
    edge_path,
    "--headless=new",
    "--remote-debugging-port=9227",
    "--disable-gpu",
    "--no-first-run",
    "--user-data-dir=C:\\Users\\Atharv Naik\\Desktop\\AI-CivicFix-Manual-UI\\scratch\\edge-profile-analysis-3",
    "http://localhost:8000/citizen/report.html"
], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

try:
    time.sleep(2)
    sys.path.append(r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI\scratch")
    from ws_client import SimpleWebSocket

    res = urllib.request.urlopen("http://127.0.0.1:9227/json")
    pages = json.loads(res.read().decode())
    target = None
    for p in pages:
        if "report.html" in p.get("url", ""):
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

    # Set sessionStorage while on report.html and navigate to analysis.html
    init_script = f"""
    sessionStorage.setItem('civicfix_analysis_image', '{data_uri}');
    sessionStorage.setItem('civicfix_analysis_desc', 'Severe pothole observed on main road corridor.');
    window.location.href = 'analysis.html';
    """
    send_cmd("Runtime.evaluate", {"expression": init_script})
    print("Navigated to analysis.html with test pothole image. Waiting for Gemini...")

    start_time = time.time()
    final_state = None

    while time.time() - start_time < 35:
        time.sleep(2)
        poll_id = send_cmd("Runtime.evaluate", {
            "expression": """JSON.stringify({
                loading: document.getElementById('ai-loading-state') ? !document.getElementById('ai-loading-state').classList.contains('hidden') : null,
                error: document.getElementById('ai-error-state') ? !document.getElementById('ai-error-state').classList.contains('hidden') : null,
                errorDetail: document.getElementById('ai-error-detail') ? document.getElementById('ai-error-detail').textContent : '',
                result: document.getElementById('ai-result-state') ? !document.getElementById('ai-result-state').classList.contains('hidden') : null,
                singleView: document.getElementById('single-issue-view') ? !document.getElementById('single-issue-view').classList.contains('hidden') : false,
                multiView: document.getElementById('multi-issue-view') ? !document.getElementById('multi-issue-view').classList.contains('hidden') : false,
                currentReport: window.AppState ? window.AppState.currentReport : null
            })""",
            "returnByValue": True
        })

        while True:
            raw = ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == poll_id:
                val = json.loads(msg.get("result", {}).get("result", {}).get("value", "{}"))
                if val.get("result") or val.get("error"):
                    final_state = val
                break
            elif msg.get("method") == "Console.messageAdded":
                print("[Console]", msg["params"]["message"]["text"])
            elif msg.get("method") == "Runtime.consoleAPICalled":
                args = [a.get("value", "") for a in msg["params"].get("args", [])]
                print("[Console API]", " ".join(str(a) for a in args))

        if final_state and (final_state.get("result") or final_state.get("error")):
            break

    print("\n--- GEMINI CIVIC IMAGE ANALYSIS TEST RESULT ---")
    print(json.dumps(final_state, indent=2))

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
    server_proc.terminate()

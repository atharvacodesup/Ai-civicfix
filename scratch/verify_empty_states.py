import json
import urllib.request
import time
import os
import subprocess
import shutil
import sys

print("==================================================")
print("TESTING CLEAN OPERATIONAL EMPTY STATES IN BROWSER")
print("==================================================")

edge_paths = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Users\Atharv Naik\AppData\Local\Microsoft\Edge\Application\msedge.exe"
]
edge_exe = None
for p in edge_paths:
    if os.path.exists(p):
        edge_exe = p
        break

if not edge_exe:
    print("Edge not found, skipping.")
    sys.exit(0)

port = 9336
profile_dir = os.path.abspath("scratch/edge-profile-empty-states")
if os.path.exists(profile_dir):
    try:
        shutil.rmtree(profile_dir)
    except:
        pass
os.makedirs(profile_dir, exist_ok=True)

proc = subprocess.Popen([
    edge_exe,
    f"--remote-debugging-port={port}",
    f"--user-data-dir={profile_dir}",
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

time.sleep(2)

try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
        tabs = json.loads(resp.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import ws_client as ws_mod
    ws = ws_mod.SimpleWebSocket(ws_url)

    msg_id = 1
    def send_cmd(method, params=None):
        global msg_id
        msg_id += 1
        req = {"id": msg_id, "method": method, "params": params or {}}
        ws.send(json.dumps(req))
        while True:
            res = json.loads(ws.recv())
            if res.get("id") == msg_id:
                return res

    send_cmd("Page.enable")
    send_cmd("Runtime.enable")

    # 1. Login as citizen
    print("\n1. Logging in as Citizen (citizen.alpha@aicivicfix.demo)...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/login.html"})
    time.sleep(1.5)

    login_eval = send_cmd("Runtime.evaluate", {
        "expression": """
        new Promise((resolve, reject) => {
            document.getElementById('login-email').value = 'citizen.alpha@aicivicfix.demo';
            document.getElementById('login-password').value = 'Pwd@123';
            window.loginUser('citizen.alpha@aicivicfix.demo', 'Pwd@123')
                .then(u => resolve(u))
                .catch(e => reject(e.message));
        });
        """,
        "awaitPromise": True
    })

    # Test Citizen My Reports (empty state)
    print("\n2. Testing Citizen My Reports (citizen/reports.html)...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/citizen/reports.html"})
    time.sleep(2)
    cit_html = send_cmd("Runtime.evaluate", {
        "expression": "document.body.innerText",
        "returnByValue": True
    })["result"]["value"]
    assert "You haven't submitted any reports yet" in cit_html, f"Expected empty state in citizen reports. Got: {cit_html[:300]}"
    print("  [OK] Citizen empty state confirmed: 'You haven\\'t submitted any reports yet.'")

    # 3. Test Department Dashboard (empty state)
    print("\n3. Testing Department Dashboard (admin/department.html)...")
    # Login as PWD admin
    send_cmd("Page.navigate", {"url": "http://localhost:8000/login.html"})
    time.sleep(1.5)
    send_cmd("Runtime.evaluate", {
        "expression": """
        new Promise((resolve, reject) => {
            document.getElementById('login-email').value = 'pwd.admin@aicivicfix.demo';
            document.getElementById('login-password').value = 'Pwd@123';
            window.loginUser('pwd.admin@aicivicfix.demo', 'Pwd@123')
                .then(u => resolve(u))
                .catch(e => reject(e.message));
        });
        """,
        "awaitPromise": True
    })
    send_cmd("Page.navigate", {"url": "http://localhost:8000/admin/department.html"})
    time.sleep(2.5)

    dept_res = send_cmd("Runtime.evaluate", {
        "expression": """
        ({
            total: document.getElementById('metric-total-reports').textContent,
            active: document.getElementById('metric-active-reports').textContent,
            high: document.getElementById('metric-high-priority').textContent,
            resolved: document.getElementById('metric-resolved-reports').textContent,
            tableText: document.getElementById('dept-issues-table').innerText
        })
        """,
        "returnByValue": True
    })["result"]["value"]
    print(f"  Department Metrics: Total={dept_res['total']}, Active={dept_res['active']}, High={dept_res['high']}, Resolved={dept_res['resolved']}")
    assert dept_res['total'] in ['0', '00'], f"Expected 0 total reports, got {dept_res['total']}"
    assert "No reports have been assigned to this department yet" in dept_res['tableText'], "Expected department empty state"
    print("  [OK] Department empty state confirmed: 'No reports have been assigned to this department yet.'")

    # 4. Test Master Incidents List (empty state)
    print("\n4. Testing Master Incidents List (admin/master-issues.html)...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/admin/master-issues.html"})
    time.sleep(2)
    master_table_text = send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('admin-issues-table').innerText",
        "returnByValue": True
    })["result"]["value"]
    assert "No master incidents found" in master_table_text, f"Expected 'No master incidents found', got: {master_table_text}"
    print("  [OK] Master incidents empty state confirmed: 'No master incidents found.'")

    # 5. Test Super Admin Dashboard (empty state)
    print("\n5. Testing Super Admin Dashboard (admin/dashboard.html)...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/admin/dashboard.html"})
    time.sleep(2)
    dash_res = send_cmd("Runtime.evaluate", {
        "expression": """
        ({
            masterCount: document.getElementById('metric-dash-master').textContent,
            reportsCount: document.getElementById('metric-dash-reports').textContent,
            featuredId: document.getElementById('featured-incident-id').textContent,
            tableText: document.getElementById('admin-dashboard-table').innerText
        })
        """,
        "returnByValue": True
    })["result"]["value"]
    print(f"  Admin Dashboard: MasterCount={dash_res['masterCount']}, ReportsCount={dash_res['reportsCount']}, Featured='{dash_res['featuredId']}'")
    assert dash_res['masterCount'] == "0", f"Expected 0 master incidents, got {dash_res['masterCount']}"
    assert dash_res['featuredId'] == "No active incidents", f"Expected 'No active incidents', got {dash_res['featuredId']}"
    assert "No master incidents recorded" in dash_res['tableText'], "Expected 'No master incidents recorded'"
    print("  [OK] Super Admin dashboard confirmed clean with 0 incidents.")

    # 6. Test Field Officer Work (empty state)
    print("\n6. Testing Field Officer Work Queue (field/work.html)...")
    # Login as field officer
    send_cmd("Page.navigate", {"url": "http://localhost:8000/login.html"})
    time.sleep(1.5)
    send_cmd("Runtime.evaluate", {
        "expression": """
        new Promise((resolve, reject) => {
            document.getElementById('login-email').value = 'field@gmail.com';
            document.getElementById('login-password').value = 'Pwd@123';
            window.loginUser('field@gmail.com', 'Pwd@123')
                .then(u => resolve(u))
                .catch(e => reject(e.message));
        });
        """,
        "awaitPromise": True
    })
    send_cmd("Page.navigate", {"url": "http://localhost:8000/field/work.html"})
    time.sleep(2)
    field_text = send_cmd("Runtime.evaluate", {
        "expression": "document.body.innerText",
        "returnByValue": True
    })["result"]["value"]
    assert "No work assigned yet" in field_text, f"Expected 'No work assigned yet', got: {field_text[:300]}"
    print("  [OK] Field officer empty state confirmed: 'No work assigned yet.'")

    # 7. Test Municipal Analytics (empty state)
    print("\n7. Testing Municipal Analytics (admin/analytics.html)...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/admin/analytics.html"})
    time.sleep(2)
    analytics_res = send_cmd("Runtime.evaluate", {
        "expression": """
        ({
            repCount: document.getElementById('metric-analytics-reports').textContent,
            calloutText: document.getElementById('analytics-impact-callout').innerText
        })
        """,
        "returnByValue": True
    })["result"]["value"]
    print(f"  Analytics: Consolidated={analytics_res['repCount']}")
    print(f"  Callout: {analytics_res['calloutText']}")
    assert analytics_res['repCount'] == "0", f"Expected 0 reports, got {analytics_res['repCount']}"
    assert "0 citizen complaints recorded" in analytics_res['calloutText'], "Expected 0 complaints in callout"
    print("  [OK] Analytics confirmed clean with 0 reports and zero-state consolidation callout.")

    print("\n==================================================")
    print("ALL BROWSER OPERATIONAL EMPTY STATES VERIFIED!")
    print("==================================================")

finally:
    try:
        proc.terminate()
        proc.wait(timeout=3)
    except:
        proc.kill()
    if os.path.exists(profile_dir):
        try:
            shutil.rmtree(profile_dir)
        except:
            pass

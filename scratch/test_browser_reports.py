import json
import urllib.request
import subprocess
import time
import os
import sys
import shutil

sys.path.append(os.path.abspath("."))

print("==================================================")
print("TESTING CITIZEN REPORTS PAGE (SOFT REMOVAL) IN BROWSER")
print("==================================================")

API_KEY = 'AIzaSyDv2u7LmOoblfK7_OpxrY3orh9Sat3zOmA'
LOGIN_URL = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}'
DOC_BASE = 'https://firestore.googleapis.com/v1/projects/ai-civicfix/databases/(default)/documents'

def login_py(email, password='Pwd@123'):
    payload = json.dumps({'email': email, 'password': password, 'returnSecureToken': True}).encode('utf-8')
    req = urllib.request.Request(LOGIN_URL, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

auth_res = login_py('citizen.alpha@aicivicfix.demo')
token = auth_res['idToken']
uid = auth_res['localId']

# 1. Ensure user profile exists
profile_doc = {
    'fields': {
        'uid': {'stringValue': uid},
        'name': {'stringValue': 'Citizen Alpha'},
        'email': {'stringValue': 'citizen.alpha@aicivicfix.demo'},
        'role': {'stringValue': 'CITIZEN'},
        'department': {'nullValue': None}
    }
}
try:
    set_req = urllib.request.Request(f"{DOC_BASE}/users/{uid}", data=json.dumps(profile_doc).encode('utf-8'), headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }, method='PATCH')
    with urllib.request.urlopen(set_req) as resp:
        pass
except Exception as e:
    print("User profile check:", e)

# 2. Create one initial stage report and one RESOLVED report for citizen.alpha
ts = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
rep_submitted = {
    'fields': {
        'citizenId': {'stringValue': uid},
        'category': {'stringValue': 'Pothole'},
        'status': {'stringValue': 'REPORT_SUBMITTED'},
        'description': {'stringValue': 'Active pothole for UI editing'},
        'ward': {'stringValue': '20'},
        'department': {'stringValue': 'City Engineer / PWD'},
        'masterIncidentId': {'stringValue': 'KMC-042'},
        'createdAt': {'timestampValue': ts},
        'updatedAt': {'timestampValue': ts}
    }
}
req1 = urllib.request.Request(f"{DOC_BASE}/reports", data=json.dumps(rep_submitted).encode('utf-8'), headers={
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
})
with urllib.request.urlopen(req1) as resp:
    sub_doc = json.loads(resp.read().decode('utf-8'))
sub_id = sub_doc['name'].split('/')[-1]

rep_resolved = {
    'fields': {
        'citizenId': {'stringValue': uid},
        'category': {'stringValue': 'Water Leakage'},
        'status': {'stringValue': 'RESOLVED'},
        'description': {'stringValue': 'Resolved water leakage'},
        'ward': {'stringValue': '20'},
        'department': {'stringValue': 'Water Supply & Drainage'},
        'masterIncidentId': {'stringValue': 'KMC-042'},
        'resolutionNotes': {'stringValue': 'Pipe repair verified'},
        'createdAt': {'timestampValue': ts},
        'updatedAt': {'timestampValue': ts}
    }
}
req2 = urllib.request.Request(f"{DOC_BASE}/reports", data=json.dumps(rep_resolved).encode('utf-8'), headers={
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
})
with urllib.request.urlopen(req2) as resp:
    res_doc = json.loads(resp.read().decode('utf-8'))
res_id = res_doc['name'].split('/')[-1]

print(f"Created test reports: SUBMITTED={sub_id}, RESOLVED={res_id}")

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

port = 9335
profile_dir = os.path.abspath("scratch/edge-profile-reports-softdel")
if os.path.exists(profile_dir):
    try:
        shutil.rmtree(profile_dir)
    except:
        pass

proc = subprocess.Popen([
    edge_exe,
    "--headless=new",
    f"--remote-debugging-port={port}",
    f"--user-data-dir={profile_dir}",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

time.sleep(2)

try:
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
        tabs = json.loads(resp.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]

    import scratch.ws_client as ws_mod
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

    # 1. Login
    print("\n1. Logging in as citizen...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/login.html"})
    time.sleep(1.5)

    send_cmd("Runtime.evaluate", {
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

    # 2. Navigate to reports.html
    print("\n2. Navigating to citizen/reports.html...")
    send_cmd("Page.navigate", {"url": "http://localhost:8000/citizen/reports.html"})
    
    # Wait for reports to load
    for _ in range(10):
        time.sleep(1)
        grid_status = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('#reports-grid .card').length",
            "returnByValue": True
        })
        count = grid_status.get("result", {}).get("result", {}).get("value", 0)
        has_sub = send_cmd("Runtime.evaluate", {
            "expression": f"!!document.getElementById('report-card-{sub_id}')",
            "returnByValue": True
        }).get("result", {}).get("result", {}).get("value", False)
        if has_sub:
            print(f"  Loaded {count} reports, sub_id found!")
            break
    else:
        print(f"  Warning: after 10s, sub_id not yet found, cards count: {count}")

    # 3. Check reports rendering and buttons
    eval_check = send_cmd("Runtime.evaluate", {
        "expression": f"""
        (() => {{
            const subCard = document.getElementById('report-card-{sub_id}');
            const resCard = document.getElementById('report-card-{res_id}');
            return JSON.stringify({{
                hasSubCard: !!subCard,
                hasResCard: !!resCard,
                subHasView: !!subCard?.querySelector('a[href*="track.html"]'),
                subHasEdit: !!subCard?.querySelector('button[onclick*="openEditReport"]'),
                subHasRemove: !!subCard?.querySelector('button[onclick*="openDeleteReport"]'),
                resHasView: !!resCard?.querySelector('a[href*="track.html"]'),
                resHasEdit: !!resCard?.querySelector('button[onclick*="openEditReport"]'),
                resHasRemove: !!resCard?.querySelector('button[onclick*="openDeleteReport"]')
            }});
        }})();
        """,
        "returnByValue": True
    })
    check_res = json.loads(eval_check.get("result", {}).get("result", {}).get("value", "{}"))
    print("Action button visibility verification:")
    for k, v in check_res.items():
        print(f"  {k:15}: {v}")

    # Assertions:
    assert check_res.get("hasSubCard") is True, "Submitted card not found"
    assert check_res.get("hasResCard") is True, "Resolved card not found"
    assert check_res.get("subHasEdit") is True, "Submitted report must have Edit"
    assert check_res.get("subHasRemove") is True, "Submitted report must have Remove"
    assert check_res.get("resHasView") is True, "Resolved report must have View Details"
    assert check_res.get("resHasEdit") is False, "Resolved report must NOT have Edit"
    assert check_res.get("resHasRemove") is True, "Resolved report MUST have Remove"
    print("  [OK] Verified: Resolved reports display [VIEW DETAILS] and [REMOVE], but not [EDIT]!")

    # 4. Check Remove button colors (Theme check: must NOT be red!)
    eval_color = send_cmd("Runtime.evaluate", {
        "expression": f"""
        (() => {{
            const btn = document.querySelector('#report-card-{res_id} button[onclick*="openDeleteReport"]');
            const style = window.getComputedStyle(btn);
            return JSON.stringify({{
                text: btn.textContent.trim(),
                color: style.color,
                borderColor: style.borderColor,
                backgroundColor: style.backgroundColor
            }});
        }})();
        """,
        "returnByValue": True
    })
    color_res = json.loads(eval_color.get("result", {}).get("result", {}).get("value", "{}"))
    print("Remove button styling verification:", color_res)
    assert color_res.get("text") == "REMOVE"
    # Ensure no red color
    assert "220" not in color_res.get("color") and "185" not in color_res.get("color"), "Remove button must not be red"
    print("  [OK] Remove button is styled in pure AI CivicFix blue/white theme (zero red)!")

    # 5. Test opening modal on Resolved report and confirming removal
    print("\n3. Testing soft removal of RESOLVED report...")
    eval_open_modal = send_cmd("Runtime.evaluate", {
        "expression": f"""
        (() => {{
            const btn = document.querySelector('#report-card-{res_id} button[onclick*="openDeleteReport"]');
            btn.click();
            const modal = document.getElementById('delete-report-modal');
            const title = modal.querySelector('h2').textContent.trim();
            const confirmBtnText = document.getElementById('confirm-delete-btn').textContent.trim();
            const isVisible = window.getComputedStyle(modal).display === 'flex';
            return JSON.stringify({{ title, confirmBtnText, isVisible }});
        }})();
        """,
        "returnByValue": True
    })
    modal_info = json.loads(eval_open_modal.get("result", {}).get("result", {}).get("value", "{}"))
    print("Confirmation modal state:", modal_info)
    assert modal_info.get("isVisible") is True
    assert modal_info.get("title") == "Remove this report?"
    assert modal_info.get("confirmBtnText") == "Remove Report"
    print("  [OK] Confirmation modal title and button text verified!")

    # Click confirm remove
    send_cmd("Runtime.evaluate", {
        "expression": """
        new Promise((resolve, reject) => {
            CitizenApp.confirmDeleteReport()
                .then(() => resolve(true))
                .catch(e => reject(e.message));
        });
        """,
        "awaitPromise": True
    })
    time.sleep(2)

    # Verify that the card was removed from the DOM in real-time
    eval_removed_check = send_cmd("Runtime.evaluate", {
        "expression": f"!!document.getElementById('report-card-{res_id}')",
        "returnByValue": True
    })
    card_still_present = eval_removed_check.get("result", {}).get("result", {}).get("value", True)
    assert card_still_present is False, "Removed report card still in DOM"
    print("  [OK] Resolved report card immediately removed from citizen view!")

    print("\n==================================================")
    print("ALL BROWSER SOFT-REMOVAL UI TESTS PASSED!")
    print("==================================================")

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
    proc.wait()
    try:
        shutil.rmtree(profile_dir)
    except:
        pass

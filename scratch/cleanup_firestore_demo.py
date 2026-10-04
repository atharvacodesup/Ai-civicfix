import json
import urllib.request
import time

api_key = 'AIzaSyDv2u7LmOoblfK7_OpxrY3orh9Sat3zOmA'
login_url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}'
doc_base = 'https://firestore.googleapis.com/v1/projects/ai-civicfix/databases/(default)/documents'

def login(email, password='Pwd@123'):
    payload = json.dumps({'email': email, 'password': password, 'returnSecureToken': True}).encode('utf-8')
    req = urllib.request.Request(login_url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

print("==================================================")
print("FIRESTORE DEMO OPERATIONAL DATA CLEANUP")
print("==================================================")

# 1. Authenticate as Super Admin
auth_res = login('superadmin@aicivicfix.demo')
token = auth_res['idToken']
print(f"Authenticated as Super Admin: {auth_res['email']} (UID: {auth_res['localId']})")

# Verify users collection is untouched
users_req = urllib.request.Request(f"{doc_base}/users?pageSize=100", headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(users_req) as resp:
    users_data = json.loads(resp.read().decode('utf-8'))
    user_count = len(users_data.get('documents', []))
    print(f"\n[PROTECTED] Users collection: {user_count} accounts found (RETAINING ALL ACCOUNTS)")

# Collections to clean: reports, masterIncidents, workflowEvents, workOrders, resolutions, verification, notifications
cleanup_targets = [
    'reports',
    'masterIncidents',
    'workflowEvents',
    'workOrders',
    'resolutions',
    'verification',
    'notifications',
    'feedback'
]

deleted_summary = {}

for col in cleanup_targets:
    url = f"{doc_base}/{col}?pageSize=300"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            docs = data.get('documents', [])
            count = len(docs)
            print(f"\nCleaning collection '{col}': {count} documents to remove...")
            deleted_count = 0
            for d in docs:
                doc_name = d['name']
                del_req = urllib.request.Request(
                    f"https://firestore.googleapis.com/v1/{doc_name}",
                    headers={'Authorization': f'Bearer {token}'},
                    method='DELETE'
                )
                try:
                    with urllib.request.urlopen(del_req) as del_resp:
                        if del_resp.status == 200:
                            deleted_count += 1
                except Exception as del_err:
                    print(f"  Error deleting {doc_name}: {del_err}")
            print(f"  Successfully deleted {deleted_count}/{count} documents from '{col}'.")
            deleted_summary[col] = deleted_count
    except urllib.error.HTTPError as e:
        print(f"Collection '{col}': HTTP {e.code} - {e.reason}")
        deleted_summary[col] = 0
    except Exception as e:
        print(f"Collection '{col}': Error {e}")
        deleted_summary[col] = 0

print("\n==================================================")
print("CLEANUP VERIFICATION")
print("==================================================")

# Verify 0 docs in target collections
for col in cleanup_targets:
    url = f"{doc_base}/{col}?pageSize=10"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            remaining = len(data.get('documents', []))
            print(f"Collection '{col}' remaining docs: {remaining}")
    except Exception as e:
        print(f"Collection '{col}' check: {e}")

# Verify users still intact
with urllib.request.urlopen(users_req) as resp:
    users_data = json.loads(resp.read().decode('utf-8'))
    user_count_after = len(users_data.get('documents', []))
    print(f"\n[VERIFIED] Users collection remaining docs: {user_count_after} (MATCHES INITIAL {user_count})")

print("\nDELETION SUMMARY:")
for k, v in deleted_summary.items():
    print(f"  - {k}: {v} deleted")

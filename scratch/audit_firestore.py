import json
import urllib.request

api_key = 'AIzaSyDv2u7LmOoblfK7_OpxrY3orh9Sat3zOmA'
login_url = f'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={api_key}'
doc_base = 'https://firestore.googleapis.com/v1/projects/ai-civicfix/databases/(default)/documents'

def login(email, password='Pwd@123'):
    payload = json.dumps({'email': email, 'password': password, 'returnSecureToken': True}).encode('utf-8')
    req = urllib.request.Request(login_url, data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

auth_res = login('pwd.admin@aicivicfix.demo')
token = auth_res['idToken']

collections_to_check = [
    'users',
    'reports',
    'masterIncidents',
    'workflowEvents',
    'workOrders',
    'resolutions',
    'verification',
    'notifications',
    'analytics',
    'feedback'
]

print("==================================================")
print("FIRESTORE COLLECTION AUDIT")
print("==================================================")

for col in collections_to_check:
    url = f"{doc_base}/{col}?pageSize=300"
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            docs = data.get('documents', [])
            print(f"Collection '{col}': {len(docs)} documents found")
            for d in docs[:10]: # print sample up to 10
                doc_id = d['name'].split('/')[-1]
                fields = d.get('fields', {})
                sample_summary = {}
                for k in ['email', 'role', 'name', 'status', 'department', 'title', 'category', 'problemType', 'type']:
                    if k in fields:
                        v = list(fields[k].values())[0]
                        sample_summary[k] = v
                print(f"  - [{doc_id}] {sample_summary}")
            if len(docs) > 10:
                print(f"  ... and {len(docs) - 10} more documents")
    except urllib.error.HTTPError as e:
        print(f"Collection '{col}': HTTP {e.code} - {e.reason}")
    except Exception as e:
        print(f"Collection '{col}': Error {e}")

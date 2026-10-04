import urllib.request
import urllib.parse
import json

query = """
[out:json][timeout:25];
(
  relation["boundary"="administrative"]["admin_level"="8"]["name:en"="Kolhapur"];
  relation["boundary"="administrative"]["name"="कोल्हापूर"];
  relation["boundary"="administrative"]["name"~"Kolhapur Municipal Corporation"];
);
out body;
>;
out skel qt;
"""

url = "https://overpass-api.de/api/interpreter"
data = urllib.parse.urlencode({'data': query}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'User-Agent': 'AICivicFix-LocationEngine/1.0'})

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Total elements:", len(res.get("elements", [])))
        for el in res.get("elements", []):
            if el.get("type") == "relation":
                print("Relation ID:", el.get("id"), "Tags:", el.get("tags"))
except Exception as e:
    print("Error:", e)

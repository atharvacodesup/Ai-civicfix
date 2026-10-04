import urllib.request
import urllib.parse
import json

url = "https://nominatim.openstreetmap.org/search?city=Kolhapur&state=Maharashtra&country=India&polygon_geojson=1&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'AICivicFix-LocationEngine/1.0 (contact: admin@aicivicfix.demo)'})
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"Results count: {len(data)}")
        for i, item in enumerate(data):
            print(f"--- Item {i} ---")
            print("display_name:", item.get("display_name"))
            print("type:", item.get("type"), "class:", item.get("class"))
            print("geojson type:", item.get("geojson", {}).get("type"))
            coords = item.get("geojson", {}).get("coordinates", [])
            print("coords length:", len(coords))
            bbox = item.get("boundingbox")
            print("boundingbox:", bbox)
except Exception as e:
    print("Error:", e)

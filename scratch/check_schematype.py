import urllib.request

data = urllib.request.urlopen('https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js').read().decode('utf-8')
idx = data.find('SchemaType')
while idx != -1:
    print("--- SchemaType match ---")
    print(data[idx-50:idx+200])
    idx = data.find('SchemaType', idx+1)

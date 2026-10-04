import urllib.request

data = urllib.request.urlopen('https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js').read().decode('utf-8')
idx = data.find('responseMimeType')
while idx != -1:
    print("--- responseMimeType match ---")
    print(data[idx-100:idx+250])
    idx = data.find('responseMimeType', idx+1)

idx2 = data.find('responseSchema')
while idx2 != -1:
    print("--- responseSchema match ---")
    print(data[idx2-100:idx2+250])
    idx2 = data.find('responseSchema', idx2+1)

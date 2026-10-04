import urllib.request

data = urllib.request.urlopen('https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js').read().decode('utf-8')
idx = data.find('inlineData')
while idx != -1:
    print("--- inlineData match ---")
    print(data[idx-100:idx+250])
    idx = data.find('inlineData', idx+1)

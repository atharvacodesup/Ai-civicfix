import urllib.request
import re

data = urllib.request.urlopen('https://www.gstatic.com/firebasejs/12.19.0/firebase-ai.js').read().decode('utf-8')
idx = data.find('class GoogleAIBackend')
print(data[idx-100:idx+600])

idx2 = data.find('class Backend')
print("--- Backend ---")
print(data[idx2:idx2+600])

idx3 = data.find('firebasevertexai.googleapis.com')
print("--- Host matches ---")
print(data[idx3-200:idx3+400] if idx3 != -1 else "Not found")

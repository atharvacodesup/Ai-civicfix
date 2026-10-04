import os

for k, v in os.environ.items():
    if any(term in k.lower() for term in ['firebase', 'appcheck', 'gemini', 'google']):
        print(f"{k} = {v}")
print("Done checking env vars")

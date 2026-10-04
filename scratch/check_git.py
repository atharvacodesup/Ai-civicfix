import subprocess

try:
    res = subprocess.run(["git", "log", "-n", "20", "--oneline"], capture_output=True, text=True)
    print("Git commits:")
    print(res.stdout)
except Exception as e:
    print("Git error:", e)

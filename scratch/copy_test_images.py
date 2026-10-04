import shutil
import os

source_dir = r"C:\Users\Atharv Naik\.gemini\antigravity-ide\brain\a292ec09-63e9-4672-a4eb-8534d7d92686"
dest_dir = r"c:\Users\Atharv Naik\Desktop\AI-CivicFix-Manual-UI\assets"

files = [
    ("test_pothole_photo_1791055107034.jpg", "test-pothole.jpg"),
    ("test_garbage_photo_1791055124830.jpg", "test-garbage.jpg"),
    ("test_streetlight_photo_1791055140692.jpg", "test-streetlight.jpg")
]

for src_name, dst_name in files:
    src_path = os.path.join(source_dir, src_name)
    dst_path = os.path.join(dest_dir, dst_name)
    if os.path.exists(src_path):
        shutil.copyfile(src_path, dst_path)
        print(f"Copied {src_name} -> {dst_name} ({os.path.getsize(dst_path)} bytes)")
    else:
        print(f"File not found: {src_path}")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
抽獎系統音效下載腳本
Downloads sound effects for the lottery system
"""

import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sfx_dir = Path("public/sfx")
sfx_dir.mkdir(parents=True, exist_ok=True)

print("開始下載抽獎音效檔案...\n")

# 音效下載清單
# 注意：如果自動下載失敗，請手動從以下網站下載：
# - Mixkit: https://mixkit.co/free-sound-effects/
# - Pixabay: https://pixabay.com/sound-effects/
# - Freesound: https://freesound.org/

downloads = [
    {
        "name": "spinning.mp3",
        "description": "滾輪轉動音效",
        "urls": [
            "https://assets.mixkit.co/sfx/download/mixkit-slot-machine-spin-1109.mp3",
        ]
    },
    {
        "name": "win.mp3",
        "description": "中獎音效",
        "urls": [
            "https://assets.mixkit.co/sfx/download/mixkit-winning-chimes-2015.mp3",
        ]
    },
    {
        "name": "confetti.mp3",
        "description": "煙火彩帶音效",
        "urls": [
            "https://assets.mixkit.co/sfx/download/mixkit-party-pop-confetti-3017.mp3",
        ]
    },
    {
        "name": "drumroll.mp3",
        "description": "鼓聲音效（選用）",
        "urls": [
            "https://assets.mixkit.co/sfx/download/mixkit-drum-roll-566.mp3",
        ]
    }
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Accept": "*/*",
    "Referer": "https://mixkit.co/"
}

for item in downloads:
    file_path = sfx_dir / item["name"]
    print(f"正在下載: {item['description']} ({item['name']})...")
    
    success = False
    for url in item["urls"]:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status == 200:
                    with open(file_path, 'wb') as f:
                        f.write(response.read())
                    
                    if file_path.exists() and file_path.stat().st_size > 0:
                        file_size = file_path.stat().st_size / 1024
                        print(f"  [OK] 下載成功! (大小: {file_size:.2f} KB)")
                        success = True
                        break
        except Exception as e:
            continue
    
    if not success:
        print(f"  [X] 下載失敗")
        print(f"    請手動從以下網站下載:")
        print(f"    - Mixkit: https://mixkit.co/free-sound-effects/")
        print(f"    - Pixabay: https://pixabay.com/sound-effects/")
        print(f"    - Freesound: https://freesound.org/")
    
    print()

print("下載完成!\n")
print("如果某些檔案下載失敗，請手動從以下網站下載:")
print("1. Mixkit: https://mixkit.co/free-sound-effects/")
print("2. Pixabay: https://pixabay.com/sound-effects/")
print("3. Freesound: https://freesound.org/\n")
print("搜尋關鍵字建議:")
print("- spinning: slot machine, wheel spin, rolling")
print("- win: win sound, victory, fanfare, celebration")
print("- confetti: fireworks, party popper, celebration")
print("- drumroll: drum roll, suspense")


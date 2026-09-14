# -*- coding: utf-8 -*-
import urllib.request
import os
import sys

# id -> short url
urls = {
    "spacecore": "https://aka.doubaocdn.com/s/nSL5kwa42N",
    "traphouse": "https://aka.doubaocdn.com/s/VPouNznIEG",
    "weirdcore": "https://aka.doubaocdn.com/s/Sf29bhJKRU",
    "citypop": "https://aka.doubaocdn.com/s/olw3A0ytVo",
    "cyberwave": "https://aka.doubaocdn.com/s/769L4J9DcB",
    "darkwave": "https://aka.doubaocdn.com/s/7YbvFeHHD9",
    "foamcore": "https://aka.doubaocdn.com/s/kV5c55bnGC",
    "retrowave": "https://aka.doubaocdn.com/s/F9PJhVZsZQ",
    "synthwave": "https://aka.doubaocdn.com/s/iBGyMViqj1",
    "vaporwave": "https://aka.doubaocdn.com/s/Ohmd8mPBQE",
    "biopunk": "https://aka.doubaocdn.com/s/gATZnuPoht",
    "crybaby": "https://aka.doubaocdn.com/s/FCiDzomNAU",
    "cyberpunk": "https://aka.doubaocdn.com/s/F9VGU9Gjbu",
    "deep-web": "https://aka.doubaocdn.com/s/1l9UstwxEM",
    "digitalcore": "https://aka.doubaocdn.com/s/Bxd8ij1nIb",
    "frutiger-aero": "https://aka.doubaocdn.com/s/OoeYI0mbEW",
    "seapunk": "https://aka.doubaocdn.com/s/faPdnF7WSa",
    "solarpunk": "https://aka.doubaocdn.com/s/Ztr7fSeLf8",
    "webcore": "https://aka.doubaocdn.com/s/DdspkyP8Yx",
    "y2k": "https://aka.doubaocdn.com/s/0YO4jRAUdG",
    "black-metal": "https://aka.doubaocdn.com/s/WZwWW4Jmvt",
    "cybergoth": "https://aka.doubaocdn.com/s/C9mSXsZK3Y",
    "dark-academia": "https://aka.doubaocdn.com/s/9CHB59ess4",
    "dark-romanticism": "https://aka.doubaocdn.com/s/C0DCUMtwkU",
    "emo": "https://aka.doubaocdn.com/s/acGeVwcVHQ",
    "gothic": "https://aka.doubaocdn.com/s/OIpxrKYshs",
}

out_dir = r"C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\assets"
os.makedirs(out_dir, exist_ok=True)

def download(aid, url):
    dest = os.path.join(out_dir, "aesthetic-%s.jpg" % aid)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            with open(dest, "wb") as f:
                f.write(data)
            size = len(data)
            ok_size = size > 10 * 1024
            jpeg = data[:2] == b"\xff\xd8"
            return dest, size, ok_size, jpeg, None
        except Exception as e:
            last = e
    return dest, 0, False, False, str(last)

ok, fail = [], []
for aid in sorted(urls):
    dest, size, ok_size, jpeg, err = download(aid, urls[aid])
    status = "OK" if (ok_size and jpeg) else "FAIL"
    print("%s %-16s size=%d jpeg=%s %s" % (status, aid, size, jpeg, (err or "")))
    if ok_size and jpeg:
        ok.append(aid)
    else:
        fail.append(aid)

print("\nTOTAL:", len(ok), "OK,", len(fail), "FAIL")
if fail:
    print("FAILED:", fail)

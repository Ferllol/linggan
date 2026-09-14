# -*- coding: utf-8 -*-
import os

out_dir = r"C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\assets"
ids = ["spacecore","traphouse","weirdcore","citypop","cyberwave","darkwave",
       "foamcore","retrowave","synthwave","vaporwave","biopunk","crybaby",
       "cyberpunk","deep-web","digitalcore","frutiger-aero","seapunk","solarpunk",
       "webcore","y2k","black-metal","cybergoth","dark-academia","dark-romanticism",
       "emo","gothic"]

try:
    from PIL import Image
    have_pil = True
except Exception:
    have_pil = False

print("PIL available:", have_pil)

bad = []
for aid in ids:
    p = os.path.join(out_dir, "aesthetic-%s.jpg" % aid)
    size = os.path.getsize(p) if os.path.exists(p) else 0
    ok = size > 10 * 1024
    parse = "?"
    if have_pil and ok:
        try:
            im = Image.open(p)
            im.load()
            parse = "OK (%dx%d)" % im.size
        except Exception as e:
            parse = "ERR: %s" % e
            ok = False
    print("%-18s size=%8d >10KB=%s parse=%s" % (aid, size, ok, parse))
    if not ok:
        bad.append(aid)

print("\nCHECK: %d/%d valid, bad=%s" % (len(ids)-len(bad), len(ids), bad))

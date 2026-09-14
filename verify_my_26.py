# -*- coding: utf-8 -*-
import os
from PIL import Image

BASE = r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\assets'

STYLE_IDS = [
    "art-deco", "bauhaus", "constructivism", "cubism", "dadaism",
    "expressionism", "fauvism", "futurism", "impressionism", "minimalism",
    "pop-art", "surrealism", "wabi-sabi",
    "angelcore", "clowncore", "cottagecore", "crystalcore", "devilcore",
    "dreamcore", "fairycore", "goblincore", "grungecore", "kidcore",
    "liminal-space", "naturecore", "oceancore",
]

problems = []
ok_count = 0
for sid in STYLE_IDS:
    path = os.path.join(BASE, f'aesthetic-{sid}.jpg')
    if not os.path.exists(path):
        problems.append((sid, 'MISSING'))
        continue
    size = os.path.getsize(path)
    if size <= 10240:
        problems.append((sid, f'size {size} <= 10KB'))
        continue
    try:
        with Image.open(path) as im:
            im.verify()
        with Image.open(path) as im:
            fmt = im.format
            w, h = im.size
        ok_count += 1
        print(f'OK {sid}: {size} bytes, {fmt}, {w}x{h}')
    except Exception as e:
        problems.append((sid, f'parse error: {e}'))

print('-' * 50)
print(f'TOTAL OK: {ok_count} / {len(STYLE_IDS)}')
print('PROBLEMS:', problems if problems else 'none')

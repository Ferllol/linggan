# -*- coding: utf-8 -*-
import json, io, sys

target_ids = [
    "spacecore", "traphouse", "weirdcore",
    "citypop", "cyberwave", "darkwave", "foamcore", "retrowave", "synthwave", "vaporwave",
    "biopunk", "crybaby", "cyberpunk", "deep-web", "digitalcore", "frutiger-aero", "seapunk",
    "solarpunk", "webcore", "y2k",
    "black-metal", "cybergoth", "dark-academia", "dark-romanticism", "emo", "gothic"
]

with open('data/aesthetics.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Normalize to a list of aesthetic dicts
items = []
if isinstance(data, dict):
    for k, v in data.items():
        if isinstance(v, list):
            items.extend(v)
        elif isinstance(v, dict) and ('id' in v or 'name' in v):
            items.append(v)
elif isinstance(data, list):
    items = data

# Print keys of first item to understand schema
if items and isinstance(items[0], dict):
    print("SAMPLE ITEM KEYS:", list(items[0].keys()))
    print("SAMPLE ITEM:", json.dumps(items[0], ensure_ascii=False)[:1500])
    print("=====")

found = []
for it in items:
    if not isinstance(it, dict):
        continue
    aid = it.get('id') or it.get('name') or it.get('slug') or ''
    if aid in target_ids:
        found.append(it)

print("FOUND", len(found), "of", len(target_ids))
missing = [t for t in target_ids if t not in [f.get('id') or f.get('name') or f.get('slug') for f in found]]
print("MISSING:", missing)

out = {}
for it in found:
    aid = it.get('id') or it.get('name') or it.get('slug')
    out[aid] = it

with open('data/extracted_26.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=2)

# Print compact per-style info
for aid in target_ids:
    it = out.get(aid, {})
    print("###", aid)
    for field in ['id', 'name', 'colors', 'palette', 'elements', 'materials', 'iconography', 'description', 'summary']:
        if field in it:
            val = it[field]
            if isinstance(val, (list, dict)):
                print(" ", field, ":", json.dumps(val, ensure_ascii=False)[:800])
            else:
                print(" ", field, ":", str(val)[:800])

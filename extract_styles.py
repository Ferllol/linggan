# -*- coding: utf-8 -*-
import json

STYLE_IDS = [
    "art-deco", "bauhaus", "constructivism", "cubism", "dadaism",
    "expressionism", "fauvism", "futurism", "impressionism", "minimalism",
    "pop-art", "surrealism", "wabi-sabi",
    "angelcore", "clowncore", "cottagecore", "crystalcore", "devilcore",
    "dreamcore", "fairycore", "goblincore", "grungecore", "kidcore",
    "liminal-space", "naturecore", "oceancore",
]

with open(r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\data\aesthetics.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

aesthetics = data['aesthetics']
by_id = {a['id']: a for a in aesthetics}

missing = [sid for sid in STYLE_IDS if sid not in by_id]
print("MISSING:", missing)

out = {}
for sid in STYLE_IDS:
    a = by_id[sid]
    out[sid] = {
        "name_cn": a["name_cn"],
        "name_en": a["name_en"],
        "definition": a["definition"],
        "colors": a["colors"],
        "elements": a["elements"],
        "materials": a["materials"],
        "iconography": a["iconography"],
    }

with open(r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\style_data_26.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

print("saved", len(out), "styles")

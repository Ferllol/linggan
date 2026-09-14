# -*- coding: utf-8 -*-
import json, sys

path = r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\data\aesthetics.json'
raw = open(path, 'rb').read()
print('BOM 检查:', '无 BOM' if not raw.startswith(b'\xef\xbb\xbf') else '!! 含 BOM')
data = json.loads(raw.decode('utf-8'))
print('JSON 解析: OK')

aes = data['aesthetics']
fam = data['families']
fam_ids = {f['id'] for f in fam}
print('meta.count:', data['meta']['count'], '实际条目:', len(aes))

REQUIRED = ['id', 'name_cn', 'name_en', 'family', 'definition', 'origin',
            'colors', 'elements', 'materials', 'iconography', 'related', 'image', 'sources']
errors = []
for s in aes:
    for k in REQUIRED:
        if k not in s:
            errors.append('%s 缺字段 %s' % (s.get('id', '?'), k))
            continue
        v = s[k]
        if isinstance(v, str):
            if v.strip() == '':
                errors.append('%s.%s 为空' % (s['id'], k))
        elif isinstance(v, list):
            if len(v) == 0:
                errors.append('%s.%s 为空列表' % (s['id'], k))
    if s['family'] not in fam_ids:
        errors.append('%s family 不存在: %s' % (s['id'], s['family']))
    if not s['image'].startswith('assets/aesthetic-') or not s['image'].endswith('.jpg'):
        errors.append('%s image 格式错误: %s' % (s['id'], s['image']))
    if not (3 <= len(s['colors']) <= 5):
        errors.append('%s colors 数量=%d' % (s['id'], len(s['colors'])))
    if not (3 <= len(s['related']) <= 8):
        errors.append('%s related 数量=%d' % (s['id'], len(s['related'])))

# 对称性全量复核
rel_map = {}
for s in aes:
    for r in s['related']:
        rel_map[(s['id'], r['id'])] = r['score']
sym_err = 0
for (a, b), sc in rel_map.items():
    if (b, a) not in rel_map:
        print('缺少反向:', a, '->', b)
        sym_err += 1
    elif rel_map[(b, a)] != sc:
        print('分数不一致:', a, b, sc, 'vs', rel_map[(b, a)])
        sym_err += 1
print('对称性复核: %s（检查 %d 条有向关联）' % ('通过' if sym_err == 0 else '失败', len(rel_map)))
print('关联对总数（无向）:', len(rel_map) // 2)

# id 唯一性
ids = [s['id'] for s in aes]
print('id 唯一性:', '通过' if len(ids) == len(set(ids)) else '失败')

# 家族统计
from collections import Counter
print('各家族数量:', dict(Counter(s['family'] for s in aes)))

if errors:
    print('== 字段错误 ==')
    for e in errors[:50]:
        print(e)
    sys.exit(1)
print('必填字段校验: 全部通过')

# -*- coding: utf-8 -*-
import json
from collections import Counter

PATH = r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\data\aesthetics.json'
raw = open(PATH, 'rb').read()
print('BOM:', '无BOM' if not raw.startswith(b'\xef\xbb\xbf') else '!! 有BOM')
data = json.loads(raw.decode('utf-8'))
aes = data['aesthetics']
print('JSON 解析 OK；条目数:', len(aes), 'meta.count:', data['meta']['count'])

DIM = ['color_intensity', 'tech', 'nature', 'darkness', 'retro', 'refinement']
NEW = ['history', 'definition_detail', 'visual_features', 'representatives', 'applications', 'related_terms', 'radar_scores']
errors = []
todo_cnt = 0
field_fill = {f: 0 for f in NEW}
radar_dist = {d: [] for d in DIM}

for s in aes:
    sid = s['id']
    for fld in NEW:
        v = s.get(fld)
        nonempty = False
        if isinstance(v, str):
            nonempty = bool(v.strip())
        elif isinstance(v, list):
            nonempty = len(v) >= 2
        elif isinstance(v, dict):
            nonempty = len(v) > 0
        if nonempty:
            field_fill[fld] += 1
        else:
            errors.append('%s.%s 未填充' % (sid, fld))
        if isinstance(v, str) and '待核实' in v:
            todo_cnt += v.count('待核实')
        if isinstance(v, list):
            for it in v:
                if isinstance(it, str) and '待核实' in it:
                    todo_cnt += it.count('待核实')
    # radar
    rs = s.get('radar_scores', {})
    for d in DIM:
        if d not in rs or not isinstance(rs[d], int) or not (0 <= rs[d] <= 100):
            errors.append('%s.radar_scores.%s 非法' % (sid, d))
        else:
            radar_dist[d].append(rs[d])
    # visual_features
    vf = s.get('visual_features', {})
    if not vf.get('color_system', '').strip():
        errors.append('%s.visual_features.color_system 空' % sid)
    if not vf.get('elements') or not vf.get('materials'):
        errors.append('%s.visual_features 缺 elements/materials' % sid)
    if len(s.get('representatives', [])) < 3 or len(s.get('applications', [])) < 3 or len(s.get('related_terms', [])) < 2:
        errors.append('%s 数组长度不足' % sid)

# 对称性
rel = {}
for s in aes:
    for r in s['related']:
        rel[(s['id'], r['id'])] = r['score']
bad = 0
for (a, b), sc in rel.items():
    if rel.get((b, a)) != sc:
        bad += 1
print('对称性: %s（有向关联 %d 条，异常 %d）' % ('通过' if bad == 0 else '失败', len(rel), bad))

# 家族计数
print('各家族数量:', dict(Counter(s['family'] for s in aes)))
print('新增字段填充率:')
for f in NEW:
    print('  %-18s %d/79 (%.1f%%)' % (f, field_fill[f], field_fill[f] / 79 * 100))
print('待核实出现总次数:', todo_cnt)
print('雷达分分布(最小/中位/最大):')
for d in DIM:
    vs = sorted(radar_dist[d])
    print('  %-16s %d / %d / %d' % (d, vs[0], vs[len(vs)//2], vs[-1]))

if errors:
    print('== 错误 ==')
    for e in errors[:50]:
        print(e)
    raise SystemExit(1)
print('全部校验通过')

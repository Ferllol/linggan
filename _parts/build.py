# -*- coding: utf-8 -*-
"""棂感 index.html 构建脚本：读取 aesthetics.json，生成静态卡片 + 内联数据，组装最终单文件。"""
import json, html, os

BASE = r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan'
PARTS = os.path.join(BASE, '_parts')

with open(os.path.join(BASE, 'data', 'aesthetics.json'), encoding='utf-8') as f:
    data = json.load(f)

families = {x['id']: x for x in data['families']}
aesthetics = data['aesthetics']

PLUS = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'

cards = []
for i, a in enumerate(aesthetics):
    fam = families.get(a['family'], {})
    fam_name = fam.get('name', a['family'])
    fam_color = fam.get('color', '#9a97a8')
    colors = a.get('colors') or ['#33334a']
    thumb_bg = 'linear-gradient(135deg,%s,%s)' % (colors[0], colors[1 % len(colors)])
    dots = ''.join('<i style="background:%s"></i>' % c for c in colors[:4])
    elems = ' · '.join((a.get('elements') or [])[:3])
    delay = min(i * 22, 520)
    alt = html.escape(a['name_cn'] + ' ' + a['name_en'])
    card = (
        '<article class="card" data-id="%s" data-family="%s" tabindex="0" style="--d:%dms" aria-label="查看 %s">\n'
        '  <div class="thumb" style="background:%s">\n'
        '    <span class="fam-badge" style="--fc:%s">%s</span>\n'
        '    <img src="%s" alt="%s" loading="lazy" onerror="this.style.display=\'none\'">\n'
        '  </div>\n'
        '  <div class="card-body">\n'
        '    <div class="card-name"><h3>%s</h3><span class="en">%s</span></div>\n'
        '    <div class="card-elements">%s</div>\n'
        '    <div class="card-foot">\n'
        '      <span class="dots">%s</span>\n'
        '      <button class="add-btn" data-id="%s" type="button" aria-label="加入搭配 %s"><span class="ico">%s</span><span class="lbl">加入搭配</span></button>\n'
        '    </div>\n'
        '  </div>\n'
        '</article>'
    ) % (
        html.escape(a['id']), html.escape(a['family']), delay, html.escape(a['name_cn']),
        thumb_bg, fam_color, html.escape(fam_name),
        html.escape(a['image']), alt,
        html.escape(a['name_cn']), html.escape(a['name_en']),
        html.escape(elems), dots,
        html.escape(a['id']), html.escape(a['name_cn']), PLUS
    )
    cards.append(card)

cards_html = '\n'.join(cards)

with open(os.path.join(PARTS, 'part1.html'), encoding='utf-8') as f:
    part1 = f.read()
with open(os.path.join(PARTS, 'part2.html'), encoding='utf-8') as f:
    part2 = f.read()
with open(os.path.join(PARTS, 'part3.js'), encoding='utf-8') as f:
    part3 = f.read()

assert '<!--__CARDS__-->' in part2, 'cards placeholder missing in part2'
part2 = part2.replace('<!--__CARDS__-->', cards_html)

data_js = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

html_out = (part1 + '\n' + part2 +
            '\n<script>\nconst DATA = ' + data_js + ';\n</script>\n' +
            '<script>\n' + part3 + '\n</script>\n</body>\n</html>\n')

out_path = os.path.join(BASE, 'index.html')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(html_out)

print('cards generated:', len(cards))
print('html bytes:', len(html_out.encode('utf-8')))
print('img tags:', html_out.count('<img'))
print('written:', out_path)

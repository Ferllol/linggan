# -*- coding: utf-8 -*-
import io
src = r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\index.html'
html = io.open(src, encoding='utf-8').read()

# Test A: select 4 styles, go to #/match
inject_a = ("<script>window.addEventListener('load',function(){setTimeout(function(){"
            "['art-deco','bauhaus','retrowave','cyberpunk'].forEach(function(id){"
            "var b=document.querySelector('.add-btn[data-id=\"'+id+'\"]');"
            "if(b)b.click();});"
            "setTimeout(function(){location.hash='#/match';},400);"
            "},600);});</script>")
io.open(r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\_t_match.html','w',encoding='utf-8').write(
    html.replace('</body>', inject_a + '</body>'))

# Test B: pick 3 radar styles, go to #/radar
inject_b = ("<script>window.addEventListener('load',function(){setTimeout(function(){"
            "location.hash='#/radar';"
            "setTimeout(function(){['cyberpunk','mori-kei','vaporwave'].forEach(function(id){"
            "var p=document.querySelector('.pick-chip[data-pick=\"'+id+'\"]');"
            "if(p)p.click();});"
            "},500);"
            "},600);});</script>")
io.open(r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\_t_radar.html','w',encoding='utf-8').write(
    html.replace('</body>', inject_b + '</body>'))
print('test files written')

# -*- coding: utf-8 -*-
import io, re
h = io.open(r'C:\Users\张王浩慈\Doubao\chats\2026-09-10\new-chat\linggan\index.html', encoding='utf-8').read()
m = re.search(r'<h1 class="hero-title">.*?</h1>', h, re.S)
print(m.group(0) if m else 'not found')

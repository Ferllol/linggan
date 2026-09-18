/* =========================================================================
   棂感 · 风格搭配师 · 对话球（C 计划前端）
   —— 检索在本地（advisor-engine.js），只有「候选 + 对话」会发往 Worker。
   —— 依赖：window.LINGGAN_DATA、window.StyleAdvisor
   ========================================================================= */
(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  var CFG = window.LINGGAN_ADVISOR || {};
  // 代理层部署在 Netlify Functions（*.netlify.app 在中国大陆实测可达；
  // *.workers.dev 与 *.vercel.app 均被墙，故不用）。密钥只存在 Netlify 服务端。
  var API = CFG.api || 'https://glowing-nasturtium-e13f61.netlify.app/.netlify/functions/chat';
  try {
    var override = localStorage.getItem('linggan_advisor_api');
    if (override) API = override;
  } catch (e) {}

  // 地址仍是占位符时不要假装联网：直接给明确提示，避免访客看到「网络不通」而困惑
  var CONFIGURED = !/YOUR-SUBDOMAIN|YOUR-SITE/.test(API);

  var LS_HISTORY = 'linggan_advisor_history';
  var MAX_TURNS = 6;          // 送往 Worker 的历史轮数上限
  var TOP_K = 6;              // 每轮送去的候选风格数（RAG 关键：只送最相关的几条）

  if (!window.StyleAdvisor || !window.LINGGAN_DATA) {
    console.warn('[搭配师] 缺少 StyleAdvisor 或 LINGGAN_DATA，未启动');
    return;
  }

  /* ---------- 状态 ---------- */
  var history = [];           // [{role:'user'|'assistant', content}]
  var busy = false;

  try {
    var saved = localStorage.getItem(LS_HISTORY);
    if (saved) history = JSON.parse(saved) || [];
  } catch (e) { history = []; }

  function persist() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-40))); } catch (e) {}
  }

  /* ---------- DOM ---------- */
  var fab, panel, listEl, inputEl, sendBtn, closeBtn, tipEl, quickEl;

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }

  /* ---------- 站内上下文：让小棂「看见」用户当前选了什么 ---------- */
  function currentRoute() {
    var h = location.hash || '#/';
    if (h === '#/' || h === '#/home') return 'home';
    if (h === '#/match') return 'match';
    if (h === '#/radar') return 'radar';
    return 'other';
  }
  function nameOf(id) {
    var list = (window.LINGGAN_DATA && window.LINGGAN_DATA.aesthetics) || [];
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i].name_cn; }
    return id;
  }
  function selFor(route) {
    var st = window.__LINGGAN_STATE || {};
    if (route === 'match') return (st.selected || []).slice();
    if (route === 'radar') return (st.radar || []).slice();
    return [];
  }
  function quickActions() {
    var route = currentRoute();
    if (route === 'match') {
      var sel = selFor('match');
      if (sel.length >= 2) {
        var names = sel.map(nameOf).join('、');
        return [
          { label: '写成一整段灵感文案', text: '我在搭配台选了：' + names + '。请把这组搭成一段可直接用的灵感文案，说明它们为什么能在一起、适合什么场合。' },
          { label: '哪个当主角？', text: '我在搭配台选了：' + names + '。哪个最适合当主打，其余怎么当呼应？' },
          { label: '还缺哪一类？', text: '我在搭配台选了：' + names + '。这组还缺什么气质？帮我把缺的那一类补上。' }
        ];
      }
      return [{ label: '搭配台怎么用？', text: '搭配台怎么用？我该选几个风格，棂感会怎么算适配度？' }];
    }
    if (route === 'radar') {
      var rd = selFor('radar');
      if (rd.length >= 2) {
        var rn = rd.map(nameOf).join('、');
        return [
          { label: '一句话讲清差别', text: '我在对比雷达里选了：' + rn + '。请用一句话讲清它们最核心的差别，不要罗列维度。' },
          { label: '哪个更适合拍人像？', text: '我在对比雷达里比较：' + rn + '。用来拍人像的话哪个更合适，为什么？' },
          { label: '它们能混搭吗？', text: '我在对比雷达里比较：' + rn + '。这几个能混搭吗？如果能，主次怎么分？' }
        ];
      }
      return [{ label: '六个维度怎么看？', text: '对比雷达的六个维度分别是什么意思？我该怎么用它挑风格？' }];
    }
    return [
      { label: '秋冬街拍，低调有质感', text: '想拍一组秋冬街拍，低调但有质感' },
      { label: '暗黑国风海报', text: '我要做一张暗黑国风的海报' },
      { label: '奶油白 + 蕾丝', text: '喜欢奶油白和蕾丝，温柔一点' }
    ];
  }
  function renderQuick() {
    if (!quickEl) return;
    var acts = quickActions();
    quickEl.innerHTML = acts.map(function (a, i) {
      return '<button class="lg-quick" type="button" data-qi="' + i + '">' + esc(a.label) + '</button>';
    }).join('');
    quickEl._acts = acts;
  }
  /* 把当前选择作为上下文注入（不额外发请求，只随用户提问附带） */
  function contextNote() {
    var route = currentRoute();
    var sel = selFor(route);
    if (!sel.length) return '';
    var where = route === 'match' ? '搭配台' : '对比雷达';
    return '【站内上下文】用户此刻在「' + where + '」，已选 ' + sel.length + ' 个风格：' +
      sel.map(nameOf).join('、') + '。请直接结合这个上下文回答，不要再问他选了什么。';
  }

  function build() {
    fab = el('button', 'lg-fab');
    fab.type = 'button';
    fab.setAttribute('aria-label', '打开小棂·风格搭配助手');
    fab.innerHTML =
      '<span class="lg-fab-ic"><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3 1.2-4.2A8 8 0 1 1 21 12z"/><path d="M9 11h.01M12.5 11h.01M16 11h.01"/></svg></span>' +
      '<span class="lg-fab-tx">小棂</span>';

    panel = el('section', 'lg-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '小棂·风格化搭配助手对话');
    panel.innerHTML =
      '<header class="lg-head">' +
        '<span class="lg-orb"></span>' +
        '<div class="lg-head-tx"><b>小棂</b><small>你的风格化搭配助手</small></div>' +
        '<button class="lg-close" type="button" aria-label="关闭">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
      '</header>' +
      '<div class="lg-list" id="lg-list"></div>' +
      '<div class="lg-quickrow" id="lg-quick"></div>' +
      '<div class="lg-tip">小棂只做风格搭配；在搭配台 / 对比雷达里选好风格，它会结合你的选择给建议。</div>' +
      '<form class="lg-inrow">' +
        '<input class="lg-input" type="text" placeholder="说说你的场合、情绪、颜色或材质…" autocomplete="off" maxlength="200">' +
        '<button class="lg-send" type="submit" aria-label="发送">' +
          '<svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 8 6 8-16-8z"/></svg>' +
        '</button>' +
      '</form>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    listEl = panel.querySelector('#lg-list');
    inputEl = panel.querySelector('.lg-input');
    sendBtn = panel.querySelector('.lg-send');
    closeBtn = panel.querySelector('.lg-close');
    tipEl = panel.querySelector('.lg-tip');
    quickEl = panel.querySelector('#lg-quick');

    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    panel.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      ask(inputEl.value);
    });
    if (quickEl) {
      quickEl.addEventListener('click', function (e) {
        var b = e.target.closest('[data-qi]');
        if (!b || !quickEl._acts) return;
        var act = quickEl._acts[+b.getAttribute('data-qi')];
        if (act) ask(act.text);
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('open')) close();
    });

    renderHistory();
  }

  function open() {
    renderQuick();
    panel.classList.add('open');
    document.body.classList.add('lg-open');
    fab.classList.add('hide');
    setTimeout(function () { inputEl.focus(); }, 260);
  }
  function close() {
    panel.classList.remove('open');
    document.body.classList.remove('lg-open');
    fab.classList.remove('hide');
  }

  /* ---------- 渲染 ---------- */
  function bubble(role, html) {
    var wrap = el('div', 'lg-msg ' + role);
    var inner = el('div', 'lg-bubble');
    if (html) inner.innerHTML = html; else inner.textContent = '';
    wrap.appendChild(inner);
    listEl.appendChild(wrap);
    scrollDown();
    return inner;
  }
  function scrollDown() {
    requestAnimationFrame(function () { listEl.scrollTop = listEl.scrollHeight; });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 把回复里的风格 id 变成可点卡片
  function decorate(text, picks) {
    var html = esc(text).replace(/\n/g, '<br>');
    if (picks && picks.length) {
      var byId = {};
      (window.LINGGAN_DATA.aesthetics || []).forEach(function (a) { byId[a.id] = a; });
      var chips = picks.filter(function (id) { return byId[id]; }).map(function (id) {
        var a = byId[id];
        return '<button class="lg-chip" type="button" data-goto="' + esc(a.id) + '">' +
               '<img src="' + esc(a.image) + '" alt="" loading="lazy">' +
               '<span>' + esc(a.name_cn) + '</span></button>';
      }).join('');
      if (chips) html += '<div class="lg-chips">' + chips + '</div>';
    }
    return html;
  }

  function renderHistory() {
    listEl.innerHTML = '';
    if (!history.length) {
      bubble('assistant',
        '你好，我是小棂 —— 你的风格化搭配助手。<br>告诉我你要去什么场合、想要什么感觉，' +
        '或者直接说一个喜欢的颜色 / 材质，我来帮你配。');
      return;
    }
    history.slice(-12).forEach(function (m) {
      var inner = bubble(m.role === 'user' ? 'user' : 'assistant', '');
      if (m.role === 'user') inner.textContent = m.content;
      else inner.innerHTML = decorate(m.content, m.picks);
    });
  }

  /* ---------- 请求 ---------- */
  function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;

    // 代理层未配置：给出明确提示而不是发一个注定失败的请求
    if (!CONFIGURED) {
      bubble('user', esc(text));
      bubble('assistant', '小棂还在接线中 —— 代理层地址尚未配置，暂时无法作答。<br>' +
        '你仍可以正常使用搭配台、对比雷达、棂能测试等全部本地功能。');
      return;
    }

    inputEl.value = '';

    history.push({ role: 'user', content: text });
    bubble('user', esc(text));
    persist();

    // 1) 本地检索：只把最相关的 TOP_K 条送去云端
    var cands = [];
    try {
      var res = window.StyleAdvisor.retrieve(text, TOP_K);
      cands = res.list.map(function (r) {
        var a = r.a;
        var fam = (window.LINGGAN_DATA.families || []).filter(function (f) { return f.id === a.family; })[0] || {};
        var cat = (window.LINGGAN_DATA.categories || []).filter(function (c) { return c.id === a.category; })[0] || {};
        return {
          id: a.id, name_cn: a.name_cn, name_en: a.name_en,
          family_name: fam.name, category_name: cat.name,
          year: a.year, definition: a.definition,
          elements: a.elements, materials: a.materials,
          related: (a.related || []).slice(0, 3)
        };
      });
    } catch (e) {
      console.warn('[搭配师] 检索失败', e);
    }

    // 2) 组装请求：若用户在搭配台/对比雷达有选择，把上下文附在最后一条用户消息里
    var msgs = history.slice(-MAX_TURNS * 2).map(function (m) {
      return { role: m.role, content: m.content };
    });
    var ctx = contextNote();
    if (ctx && msgs.length) {
      for (var mi = msgs.length - 1; mi >= 0; mi--) {
        if (msgs[mi].role === 'user') {
          msgs[mi] = { role: 'user', content: msgs[mi].content + '\n\n' + ctx };
          break;
        }
      }
    }

    busy = true;
    sendBtn.disabled = true;
    var thinking = bubble('assistant', '<span class="lg-dots"><i></i><i></i><i></i></span>');

    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    // 首次请求可能触发云端函数冷启动（实测可达数十秒），故超时给足 90s
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 90000);

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs, candidates: cands }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (o) {
        clearTimeout(timer);
        busy = false; sendBtn.disabled = false;
        if (!o.ok || !o.j || typeof o.j.reply !== 'string') {
          var msg = (o.j && o.j.message) || '小棂暂时联系不上，稍后再试。';
          thinking.innerHTML = '<span class="lg-err">' + esc(msg) + '</span>';
          return;
        }
        thinking.innerHTML = decorate(o.j.reply, o.j.picks || []);
        history.push({ role: 'assistant', content: o.j.reply, picks: o.j.picks || [] });
        persist();
        scrollDown();
      })
      .catch(function (e) {
        clearTimeout(timer);
        busy = false; sendBtn.disabled = false;
        var m = (e && e.name === 'AbortError')
          ? '等太久了，模型没有响应。可能刚好在冷启动，再试一次通常就快了。'
          : '没能连上小棂的服务（网络受限或代理未部署）。';
        thinking.innerHTML = '<span class="lg-err">' + esc(m) + '</span>';
      });
  }

  /* ---------- 风格卡跳转 ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.lg-chip[data-goto]');
    if (!b) return;
    var id = b.getAttribute('data-goto');
    if (window.openDetail) { close(); window.openDetail(id); }
    else { location.hash = '#/'; }
  });

  /* ---------- 启动 ---------- */
  function init() { build(); renderQuick(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.StyleAdvisorChat = { open: open, close: close, ask: ask,
    refresh: function(){ try { renderQuick(); } catch(e){} },
    _history: function () { return history; } };
})();

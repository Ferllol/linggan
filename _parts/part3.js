/* ===================== 棂感 · 应用逻辑 ===================== */
(function(){
'use strict';

/* ---------- 常量与索引 ---------- */
var FAMILIES = DATA.families || [];
var FAM_MAP = {};
FAMILIES.forEach(function(f){ FAM_MAP[f.id] = f; });
var AESTHETICS = DATA.aesthetics || [];
var BY_ID = {};
AESTHETICS.forEach(function(a){ BY_ID[a.id] = a; });

var MAX_SEL = 6, MIN_SEL = 2;
var state = { family:'all', query:'', selected:[], radar:[] };
var searchIndex = {};
var io = null, graphChart = null, radarChart = null;
var reduceMotion = false;
var cvs, ctx, dots = [];
var toastTimer = null;
var narrowMQ = window.matchMedia('(max-width: 1100px)');
var inspireTick = 0;
var dailyId = null, bottleTimer = null;

var DIM_META = [
  {k:'color_intensity', cn:'色彩浓度', desc:'色彩饱和度与视觉冲击力'},
  {k:'tech',            cn:'科技感',   desc:'数字、未来、机械与赛博元素的浓度'},
  {k:'nature',          cn:'自然感',   desc:'植物、原生、有机与田园气质'},
  {k:'darkness',        cn:'暗黑度',   desc:'暗色、神秘、哥特与压抑的程度'},
  {k:'retro',           cn:'复古度',   desc:'对过去年代美学的引用与怀旧浓度'},
  {k:'refinement',      cn:'精致度',   desc:'工艺、细节、奢华与克制的程度'}
];
var RADAR_COLORS = ['#00e5ff','#ff2fd6','#ffb74d','#7cb342','#ab47bc','#f48fb1'];

var svgPlus  = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
var svgCheck = '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>';

/* ---------- 工具 ---------- */
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function swatch(a, i){ return (a.colors && a.colors.length) ? a.colors[i % a.colors.length] : '#33334a'; }
function famColor(id){ var f = FAM_MAP[id]; return f ? f.color : '#9a97a8'; }
function famName(id){ var f = FAM_MAP[id]; return f ? f.name : id; }
function prettyHost(u){ try { return new URL(u).hostname; } catch(e){ return u; } }
function mixHex(c1, c2, t){
  function hx(c){ c = c.replace('#',''); return [parseInt(c.substr(0,2),16),parseInt(c.substr(2,2),16),parseInt(c.substr(4,2),16)]; }
  var a = hx(c1), b = hx(c2);
  function p(n){ return (n<16?'0':'')+n.toString(16); }
  return '#' + p(Math.round(a[0]+(b[0]-a[0])*t)) + p(Math.round(a[1]+(b[1]-a[1])*t)) + p(Math.round(a[2]+(b[2]-a[2])*t));
}
function scoreColor(s){
  if (s == null) return '#3a3a4c';
  var t = Math.max(0, Math.min(1, (s-50)/40));
  return t < 0.5 ? mixHex('#5d6d8c','#00e5ff',t*2) : mixHex('#00e5ff','#ff2fd6',(t-0.5)*2);
}
function toast(msg, type){
  var t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + (type || '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.className = 'toast'; }, 2400);
}
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ---------- 侧边栏状态 ---------- */
function isNarrow(){ return narrowMQ.matches; }
function sidebarVisible(){
  if (isNarrow() && !document.body.classList.contains('drawer-open')) return false;
  if (document.body.classList.contains('side-collapsed')) return false;
  return true;
}
function setSideMode(mode){
  document.body.classList.toggle('side-collapsed', mode === 'collapsed');
  document.body.classList.toggle('side-expanded', mode !== 'collapsed');
  try { localStorage.setItem('linggan.side', mode); } catch(e){}
  scheduleGraphRefresh();
}
function toggleSideDesktop(){
  if (isNarrow()){ closeDrawer(); return; }
  var toCollapsed = !document.body.classList.contains('side-collapsed');
  setSideMode(toCollapsed ? 'collapsed' : 'expanded');
}
function openDrawer(){
  if (!isNarrow()) return;
  document.body.classList.add('drawer-open');
  document.body.style.overflow = 'hidden';
  scheduleGraphRefresh();
}
function closeDrawer(){
  document.body.classList.remove('drawer-open');
  document.body.style.overflow = '';
  scheduleGraphRefresh();
}
function scheduleGraphRefresh(){ setTimeout(function(){ renderGraph(); renderRadar(); }, 420); }

/* ---------- Hash 路由 ---------- */
var ROUTES = {
  '#/':        'view-home',
  '#/home':    'view-home',
  '#/match':   'view-match',
  '#/radar':   'view-radar',
  '#/test':     'view-soon',
  '#/timeline': 'view-soon',
  '#/favorites':'view-soon'
};
var SOON_TITLES = {
  '#/test':     {title:'风格体质测试', desc:'回答 12 个问题，棂感会从你的偏好里解读出你天生亲近的美学基因。即将上线。'},
  '#/timeline': {title:'风格时间轴', desc:'沿时间之河看美学风格如何诞生、流行与复兴——从 1925 年的巴黎到今天的赛博空间。即将上线。'},
  '#/favorites':{title:'我的收藏', desc:'收藏你心动的风格，建立自己的灵感私人馆。本地浏览器存储，不上传云端。即将上线。'}
};
function currentRoute(){ var h = location.hash || '#/'; return ROUTES[h] ? h : '#/'; }
function navigate(){
  var route = currentRoute();
  var viewId = ROUTES[route];
  var views = document.querySelectorAll('.view');
  for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
  var el = $(viewId);
  if (el){
    el.classList.add('active');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }
  /* 侧边栏高亮 */
  var rails = document.querySelectorAll('.rail-item');
  for (var j = 0; j < rails.length; j++) rails[j].classList.toggle('active', rails[j].dataset.route === route);
  /* 占位视图文案 */
  if (viewId === 'view-soon'){
    var meta = SOON_TITLES[route] || {title:'敬请期待', desc:'这个功能正在构思中。'};
    $('soon-title').textContent = meta.title;
    $('soon-desc').textContent = meta.desc;
  }
  if (isNarrow()) closeDrawer();
  window.scrollTo({top:0, behavior:'auto'});
  /* 图表在视图激活后 resize */
  if (graphChart){ setTimeout(function(){ graphChart.resize(); }, 60); }
  if (radarChart){ setTimeout(function(){ radarChart.resize(); }, 60); }
}

/* ---------- 家族筛选 / 搜索 ---------- */
function renderFamilyChips(){
  var row = $('fam-row'); row.innerHTML = '';
  var list = [{id:'all', name:'全部', color:'#9a97a8'}].concat(FAMILIES);
  var counts = {};
  AESTHETICS.forEach(function(a){ counts[a.family] = (counts[a.family] || 0) + 1; });
  list.forEach(function(f){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (state.family === f.id ? ' on' : '');
    btn.style.setProperty('--fc', f.color);
    btn.dataset.fam = f.id;
    var n = f.id === 'all' ? AESTHETICS.length : (counts[f.id] || 0);
    btn.innerHTML = '<span class="dot"></span>' + esc(f.name) + '<span class="cnt">' + n + '</span>';
    btn.addEventListener('click', function(){ state.family = f.id; applyFilters(); syncChips(); });
    row.appendChild(btn);
  });
}
function syncChips(){
  var chips = document.querySelectorAll('#fam-row .chip');
  for (var i = 0; i < chips.length; i++)
    chips[i].className = 'chip' + (chips[i].dataset.fam === state.family ? ' on' : '');
}
function buildSearchIndex(){
  AESTHETICS.forEach(function(a){
    var fam = FAM_MAP[a.family];
    searchIndex[a.id] = (a.name_cn + ' ' + a.name_en + ' ' + (fam ? fam.name : '') + ' ' +
      (a.definition || '') + ' ' + (a.definition_detail || '') + ' ' + (a.history || '') + ' ' +
      (a.elements || []).join(' ') + ' ' + (a.materials || []).join(' ') + ' ' +
      (a.iconography || []).join(' ') + ' ' + (a.related_terms || []).join(' ') + ' ' +
      (a.representatives || []).join(' ')).toLowerCase();
  });
}
function applyFilters(){
  var cards = document.querySelectorAll('#grid .card');
  var visible = 0;
  for (var i = 0; i < cards.length; i++){
    var c = cards[i];
    var famOk = state.family === 'all' || c.dataset.family === state.family;
    var qOk = !state.query || searchIndex[c.dataset.id].indexOf(state.query) > -1;
    var show = famOk && qOk;
    c.classList.toggle('hidden', !show);
    if (show) visible++;
  }
  $('empty').className = 'empty' + (visible === 0 ? ' show' : '');
  $('result-count').textContent = visible + ' / ' + AESTHETICS.length;
  $('clear-search').className = 'clear-btn' + (state.query ? ' show' : '');
}

/* ---------- 选择搭配 ---------- */
function toggleSelect(id){
  var i = state.selected.indexOf(id);
  if (i > -1){ state.selected.splice(i, 1); toast('已从搭配中移除「' + BY_ID[id].name_cn + '」'); }
  else {
    if (state.selected.length >= MAX_SEL){ toast('最多同时选择 ' + MAX_SEL + ' 个风格', 'warn'); return; }
    state.selected.push(id);
    toast('已加入「' + BY_ID[id].name_cn + '」，当前共 ' + state.selected.length + ' 个', 'ok');
  }
  syncAddButtons(); renderMatch(); updateIndicators();
}
function removeSel(id){
  var i = state.selected.indexOf(id);
  if (i > -1){ state.selected.splice(i, 1); toast('已移除「' + BY_ID[id].name_cn + '」'); }
  syncAddButtons(); renderMatch(); updateIndicators();
}
function syncAddButtons(){
  var btns = document.querySelectorAll('.add-btn, .detail-add');
  for (var i = 0; i < btns.length; i++){
    var b = btns[i];
    var on = state.selected.indexOf(b.dataset.id) > -1;
    b.classList.toggle('on', on);
    var lbl = b.querySelector('.lbl'); if (lbl) lbl.textContent = on ? '已加入' : '加入搭配';
    var ico = b.querySelector('.ico'); if (ico) ico.innerHTML = on ? svgCheck : svgPlus;
  }
}
function updateIndicators(){
  var n = state.selected.length;
  $('side-count').textContent = n;
  $('fab-num').textContent = n;
  var showFab = n > 0 && (isNarrow() || document.body.classList.contains('side-collapsed'));
  $('fab').classList.toggle('show', showFab);
}

/* ---------- 每日风格 / 漂流瓶 ---------- */
function dateSeed(str){
  var h = 0;
  for (var i = 0; i < str.length; i++){ h = (h * 31 + str.charCodeAt(i)) >>> 0; }
  return h;
}
function todayId(){
  var d = new Date();
  var key = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  return AESTHETICS[dateSeed(key) % AESTHETICS.length].id;
}
function renderDaily(){
  dailyId = todayId();
  var a = BY_ID[dailyId];
  var fam = FAM_MAP[a.family];
  var intro = a.definition_detail || a.definition || '';
  var firstSentence = intro.split(/[。！！]/)[0] || intro;
  $('daily-root').innerHTML =
    '<div class="daily" id="daily-card">' +
      '<div class="daily-img" style="background:linear-gradient(135deg,' + swatch(a,0) + ',' + swatch(a,1) + ')">' +
        '<img src="' + a.image + '" alt="' + esc(a.name_cn) + '" loading="lazy" onerror="this.style.display=\'none\'"></div>' +
      '<div class="daily-info">' +
        '<span class="daily-tag"><span class="dot"></span>今日风格 · ' + new Date().toLocaleDateString('zh-CN') + '</span>' +
        '<div class="daily-name">' + esc(a.name_cn) + '</div>' +
        '<div class="daily-en">' + esc(a.name_en) + '</div>' +
        '<span class="daily-fam" style="--fc:' + famColor(a.family) + '">' + esc(fam.name) + '</span>' +
        '<p class="daily-desc">' + esc(firstSentence) + '</p>' +
        '<div class="daily-actions">' +
          '<button class="btn-primary" id="daily-detail" type="button">查看详情</button>' +
          '<button class="btn-ghost" id="daily-bottle" type="button">漂流瓶 · 随机一个</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  $('daily-detail').addEventListener('click', function(){ openDetail(a.id); });
  $('daily-bottle').addEventListener('click', drawBottle);
}
function drawBottle(){
  var card = $('daily-card');
  if (!card) return;
  clearInterval(bottleTimer);
  card.classList.add('flipping');
  var n = 0;
  bottleTimer = setInterval(function(){
    var pick = AESTHETICS[Math.floor(Math.random()*AESTHETICS.length)];
    card.querySelector('.daily-img img').src = pick.image;
    card.querySelector('.daily-name').textContent = pick.name_cn;
    card.querySelector('.daily-en').textContent = pick.name_en;
    var fam = FAM_MAP[pick.family];
    var famEl = card.querySelector('.daily-fam');
    famEl.textContent = fam.name; famEl.style.setProperty('--fc', famColor(pick.family));
    var intro = (pick.definition_detail || pick.definition || '').split(/[。！！]/)[0];
    card.querySelector('.daily-desc').textContent = intro;
    n++;
    if (n >= 9){
      clearInterval(bottleTimer);
      card.classList.remove('flipping');
      var finalPick = AESTHETICS[Math.floor(Math.random()*AESTHETICS.length)];
      /* 定格后绑定查看详情到本次随机结果 */
      card.dataset.bottleId = finalPick.id;
      card.querySelector('.daily-img img').src = finalPick.image;
      card.querySelector('.daily-name').textContent = finalPick.name_cn;
      card.querySelector('.daily-en').textContent = finalPick.name_en;
      var ff = FAM_MAP[finalPick.family];
      var fe = card.querySelector('.daily-fam');
      fe.textContent = ff.name; fe.style.setProperty('--fc', famColor(finalPick.family));
      var fi = (finalPick.definition_detail || finalPick.definition || '').split(/[。！！]/)[0];
      card.querySelector('.daily-desc').textContent = fi;
      toast('漂流瓶停在「' + finalPick.name_cn + '」', 'ok');
      var btn = $('daily-detail');
      if (btn) btn.onclick = function(){ openDetail(finalPick.id); };
    }
  }, 90);
}

/* ---------- 跑马灯 ---------- */
function renderMarquee(){
  var names = AESTHETICS.slice().sort(function(a,b){
    return (b.related||[]).length - (a.related||[]).length;
  }).slice(0, 24).map(function(a, i){
    return '<span class="' + (i % 4 === 0 ? 'hl' : '') + '">' + esc(a.name_cn) + '</span><span>·</span>';
  }).join('');
  $('marquee-track').innerHTML = names + names;
}

/* ---------- 搭配数据 ---------- */
function pairInfo(a, b){
  var A = BY_ID[a], B = BY_ID[b];
  var ra = null, rb = null;
  for (var i = 0; i < A.related.length; i++) if (A.related[i].id === b) ra = A.related[i];
  for (var j = 0; j < B.related.length; j++) if (B.related[j].id === a) rb = B.related[j];
  if (ra && rb){
    var score = Math.round((ra.score + rb.score) / 2);
    return {a:a, b:b, score:score, reason: ra.score >= rb.score ? ra.reason : rb.reason};
  }
  if (ra) return {a:a, b:b, score:ra.score, reason:ra.reason};
  if (rb) return {a:a, b:b, score:rb.score, reason:rb.reason};
  return {a:a, b:b, score:null, reason:'数据中暂无直接关联，二者可视为独立风格各自发挥。'};
}
function pairAll(ids){
  var out = [];
  for (var i = 0; i < ids.length; i++)
    for (var j = i+1; j < ids.length; j++) out.push(pairInfo(ids[i], ids[j]));
  return out;
}

/* ---------- 混搭灵感生成 ---------- */
function keywordsOf(a){
  var pool = (a.elements || []).concat(a.iconography || []).concat(a.related_terms || []);
  return pool.filter(Boolean);
}
var INSP_TEMPLATES = [
  function(ids, kws){
    var a = BY_ID[ids[0]], b = BY_ID[ids[1]];
    var ka = pick(kws[0]), kb = pick(kws[1]);
    var mood = pick(['低语','狂想','诗篇','寓言','回声','梦境','序曲','夜谭']);
    return {
      quote: esc(a.name_cn) + ' <span class="x">×</span> ' + esc(b.name_cn) + ' = ' +
             '<em style="font-style:normal;color:#fff">' + esc(ka) + '与' + esc(kb) + '的' + mood + '</em>',
      sub: '当' + a.name_cn + '的' + (pick(kws[0]) || '气质') + '遇见' + b.name_cn + '的' + (pick(kws[1]) || '氛围') +
           '，两种语言在同一个画面里低语——一种冷静，一种热烈，却意外地合拍。'
    };
  },
  function(ids, kws){
    var names = ids.map(function(id){ return BY_ID[id].name_cn; });
    var ka = pick(kws[0]) || '光', kb = pick(kws[1]) || '影';
    var mood = pick(['碰撞','融合','对话','共振','交织','交响']);
    return {
      quote: esc(names.join(' × ')) + ' <span class="x">=</span> ' +
             '<em style="font-style:normal;color:#fff">' + esc(ka) + '与' + esc(kb) + '的' + mood + '</em>',
      sub: '这不是简单的拼贴，而是一次' + mood + '：把' + names[0] + '的骨架装进' + names[1] + '的皮肤里，' +
           '再让' + (names[2] || '光') + '在缝隙里流动。'
    };
  },
  function(ids, kws){
    var a = BY_ID[ids[0]], b = BY_ID[ids[1]];
    var mood = pick(['夜航','梦游','独白','回响','速写','切片']);
    var ka = pick(kws[0]) || '几何', kb = pick(kws[1]) || '霓虹';
    return {
      quote: '在' + esc(a.name_cn) + '与' + esc(b.name_cn) + '之间<span class="x">，</span>' +
             '<em style="font-style:normal;color:#fff">' + esc(ka) + '化作' + esc(kb) + '的' + mood + '</em>',
      sub: '想象一段没有台词的镜头：' + (pick(kws[0]) || '质感') + '慢慢浮出水面，' +
           (pick(kws[1]) || '情绪') + '在角落里亮起来——这就是这组搭配想讲的故事。'
    };
  }
];
function renderInspire(ids){
  inspireTick = (inspireTick + 1) % INSP_TEMPLATES.length;
  var kws = ids.map(function(id){ return keywordsOf(BY_ID[id]); });
  var tpl = INSP_TEMPLATES[inspireTick];
  var out = tpl(ids, kws);
  var el = $('inspire-quote');
  var sub = $('inspire-sub');
  if (!el || !sub) return;
  el.style.opacity = 0;
  setTimeout(function(){
    el.innerHTML = out.quote;
    sub.textContent = out.sub;
    el.style.transition = 'opacity .3s'; el.style.opacity = 1;
  }, reduceMotion ? 0 : 160);
}

/* ---------- 搭配台视图渲染 ---------- */
function buildReport(pairs){
  var scored = pairs.filter(function(p){ return p.score != null; });
  if (!scored.length){
    return '<div class="report-text">所选风格之间暂无直接关联数据。可在首页点击卡片详情，查看各风格的关联风格。</div>';
  }
  var sum = 0; scored.forEach(function(p){ sum += p.score; });
  var avg = sum / scored.length;
  var high = scored[0], low = scored[0];
  scored.forEach(function(p){ if (p.score > high.score) high = p; if (p.score < low.score) low = p; });
  var spread = high.score - low.score;
  var hub = null, hubAvg = -1;
  state.selected.forEach(function(id){
    var ps = scored.filter(function(p){ return p.a === id || p.b === id; });
    if (ps.length){
      var m = 0; ps.forEach(function(p){ m += p.score; }); m /= ps.length;
      if (m > hubAvg){ hubAvg = m; hub = id; }
    }
  });
  var advice;
  if (avg >= 75) advice = '所选风格的整体契合度很高，它们共享相近的气质基因与视觉语言，融合时容易形成统一而有辨识度的整体，适合作为同一场景、同一角色的连贯风格基底。';
  else if (avg >= 62) advice = '整体契合度良好，多数风格之间能找到共通的设计母题或情绪基调。建议以高适配对为核心基调，其余风格作为层次与点缀。';
  else if (avg >= 50) advice = '所选风格的差异大于共性，更像一次风格对冲实验。建议控制各风格的占比与边界，用「一主多辅」的方式避免互相消解。';
  else advice = '所选风格之间普遍缺乏直接关联，各自拥有独立的语言体系。除非刻意追求反差碰撞，否则建议只保留其中 2–3 个核心风格。';
  if (spread >= 25) advice += ' 组合中同时存在高契合的黄金搭档与明显对立的风格对，主视觉交给高适配对，低适配对仅作局部点缀。';
  return '<div class="report-hero">' +
    '<div class="report-num">' + Math.round(avg) + '<small> / 100</small></div>' +
    '<div class="report-keys">' +
      '<div class="k"><b>最佳搭档</b><span>' + esc(BY_ID[high.a].name_cn) + ' × ' + esc(BY_ID[high.b].name_cn) + '</span><em>' + high.score + '</em></div>' +
      '<div class="k"><b>最远距离</b><span>' + esc(BY_ID[low.a].name_cn) + ' × ' + esc(BY_ID[low.b].name_cn) + '</span><em>' + low.score + '</em></div>' +
      '<div class="k"><b>搭配中枢</b><span>' + esc(BY_ID[hub].name_cn) + '</span><em>' + Math.round(hubAvg) + '</em></div>' +
    '</div></div>' +
    '<div class="report-text">' + advice + '</div>';
}
function renderMatch(){
  var root = $('match-root');
  var sel = state.selected.slice();
  if (!sel.length){
    root.innerHTML =
      '<div class="panel" style="text-align:center;padding:60px 24px">' +
        '<b style="font-family:var(--serif);font-size:22px;color:#fff;display:block;margin-bottom:10px">搭配台是空的</b>' +
        '<p style="color:var(--muted);font-size:14px;max-width:440px;margin:0 auto 22px">回到首页，在风格卡片上点「加入搭配」，挑选 2–6 个风格，这里会生成两两适配矩阵、搭配报告、关系网络与一段混搭灵感。</p>' +
        '<button class="btn-primary" id="match-go-home" type="button">去挑风格</button>' +
      '</div>';
    $('match-go-home').addEventListener('click', function(){ location.hash = '#/'; });
    updateIndicators();
    return;
  }
  var chips = sel.map(function(id){
    var a = BY_ID[id];
    return '<div class="sel-item">' +
      '<div class="mini" style="background:linear-gradient(135deg,' + swatch(a,0) + ',' + swatch(a,1) + ')">' +
        '<img src="' + a.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></div>' +
      '<div class="nm"><b>' + esc(a.name_cn) + '</b><span>' + esc(a.name_en) + '</span></div>' +
      '<button class="rm" type="button" data-rm="' + id + '" aria-label="移除 ' + esc(a.name_cn) + '">×</button></div>';
  }).join('');
  var html = '<div class="panel"><div class="ph">已选 ' + sel.length + ' 个风格' +
    (sel.length < MIN_SEL ? '（再选 ' + (MIN_SEL - sel.length) + ' 个开始分析）' : '') + '</div>' +
    '<div class="sel-list">' + chips + '</div></div>';

  if (sel.length >= MIN_SEL){
    var pairs = pairAll(sel);
    html += '<div class="panel inspire"><div class="ph">混搭灵感</div>' +
      '<div class="inspire-quote" id="inspire-quote"></div>' +
      '<div class="inspire-sub" id="inspire-sub"></div>' +
      '<button class="btn-ghost inspire-btn" id="inspire-retry" type="button">' +
      '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>换一个灵感</button></div>';
    html += '<div class="panel"><div class="ph">整体搭配报告</div>' + buildReport(pairs) + '</div>';
    var rows = pairs.slice().sort(function(x,y){ return (y.score||0)-(x.score||0); }).map(function(p){
      var A = BY_ID[p.a], B = BY_ID[p.b];
      return '<div class="pair-row">' +
        '<div class="pair-name"><span class="f" style="--fc:' + famColor(A.family) + '"></span>' + esc(A.name_cn) +
        '<span class="vs">×</span><span class="f" style="--fc:' + famColor(B.family) + '"></span>' + esc(B.name_cn) + '</div>' +
        '<div class="pair-score">' + (p.score == null ? '—' : p.score) + '</div>' +
        '<div class="pair-mid"><div class="pair-bar"><i style="width:' + (p.score == null ? 0 : p.score) + '%"></i></div>' +
        '<div class="pair-reason">' + esc(p.reason) + '</div></div></div>';
    }).join('');
    html += '<div class="panel"><div class="ph">两两适配矩阵</div>' + rows + '</div>';
    var famSeen = {}, legend = [];
    sel.forEach(function(id){ var f = BY_ID[id].family; if (!famSeen[f]){ famSeen[f]=1; legend.push(f); } });
    var legendHtml = legend.map(function(f){
      return '<span class="lg-fam" style="--fc:' + famColor(f) + '"><i></i>' + esc(FAM_MAP[f].name) + '</span>';
    }).join('');
    html += '<div class="panel"><div class="ph">关系网络</div>' +
      '<div class="graph-legend">' + legendHtml +
      '<span class="lg-edge">边线粗细与颜色表示适配度<span class="sw"></span>低 → 高</span></div>' +
      '<div id="graph"></div></div>';
  }
  root.innerHTML = html;
  updateIndicators();
  if (sel.length >= MIN_SEL){
    renderInspire(sel);
    $('inspire-retry').addEventListener('click', function(){ renderInspire(sel); });
  }
  renderGraph();
}

/* ---------- ECharts 力导向图 ---------- */
function renderGraph(){
  if (graphChart){ graphChart.dispose(); graphChart = null; }
  var el = $('graph');
  if (!el) return;
  if (location.hash !== '#/match') return;
  if (typeof window.echarts === 'undefined'){
    el.innerHTML = '<div class="graph-fallback"><b>关系图暂不可用</b>' +
      'ECharts 库未能从 CDN 加载（可能处于离线环境），上方矩阵已完整展示适配关系。' +
      '<button class="btn-ghost" id="graph-retry" type="button" style="margin-top:8px">重新加载图表库</button></div>';
    var retry = $('graph-retry');
    if (retry) retry.addEventListener('click', loadEcharts);
    return;
  }
  var sel = state.selected;
  if (sel.length < 2) return;
  var nodes = sel.map(function(id){
    var a = BY_ID[id];
    return {id:id, name:a.name_cn, symbolSize:32,
      itemStyle:{color:famColor(a.family), shadowBlur:14, shadowColor:famColor(a.family)}};
  });
  var links = [];
  pairAll(sel).forEach(function(p){
    if (p.score == null) return;
    links.push({source:p.a, target:p.b, value:p.score,
      lineStyle:{width:1.5+p.score/20, color:scoreColor(p.score), opacity:.4+p.score/220, curveness:.08}});
  });
  var opt = {
    backgroundColor:'transparent',
    tooltip:{backgroundColor:'rgba(18,18,26,.94)', borderColor:'rgba(255,255,255,.16)', textStyle:{color:'#eae8f2', fontSize:12},
      formatter:function(params){
        if (params.dataType === 'edge'){
          var d = params.data;
          return '<b>' + BY_ID[d.source].name_cn + ' × ' + BY_ID[d.target].name_cn + '</b><br/>适配度 <b>' + d.value + '</b> / 100';
        }
        var a = BY_ID[params.data.id];
        return '<b>' + a.name_cn + '</b><br/><span style="color:#9895a8;font-size:11px">' + a.name_en + '</span>';
      }},
    series:[{type:'graph', layout:'force', roam:true, data:nodes, links:links,
      label:{show:true, position:'bottom', fontSize:11, color:'#cfccda', formatter:function(p){ return p.data.name; }},
      force:{repulsion:420, edgeLength:[80,150], gravity:.08},
      emphasis:{focus:'adjacency', lineStyle:{width:4}},
      lineStyle:{curveness:.08}}]
  };
  try { graphChart = echarts.init(el); graphChart.setOption(opt); }
  catch(err){
    el.innerHTML = '<div class="graph-fallback"><b>关系图渲染失败</b>' + esc((err && err.message) || '未知错误') + '</div>';
    graphChart = null;
  }
}

/* ---------- 雷达视图 ---------- */
function renderRadar(){
  var root = $('radar-root');
  var sel = state.radar.slice();
  var pickables = AESTHETICS.slice(0).sort(function(x,y){ return x.name_cn.localeCompare(y.name_cn, 'zh'); });
  var optionsHtml = pickables.map(function(a){
    var on = sel.indexOf(a.id) > -1;
    return '<button class="pick-chip' + (on ? ' on' : '') + '" data-pick="' + a.id + '" type="button">' +
      '<span class="dot" style="--fc:' + famColor(a.family) + '"></span>' + esc(a.name_cn) + '</button>';
  }).join('');
  if (!sel.length){
    root.innerHTML =
      '<div class="panel"><div class="ph">选择对比风格（已选 0 / 3）</div>' +
      '<div class="radar-pick" id="radar-pick">' + optionsHtml + '</div></div>' +
      '<div class="panel" style="text-align:center;padding:50px 20px"><b style="font-family:var(--serif);font-size:18px;color:#cfccda">请选择 2–3 个风格开始对比</b></div>';
    renderRadarPicker();
    return;
  }
  var chips = sel.map(function(id, idx){
    var a = BY_ID[id];
    return '<button class="pick-chip on" data-rm="' + id + '" type="button"><span class="dot" style="--fc:' + RADAR_COLORS[idx % RADAR_COLORS.length] + '"></span>' + esc(a.name_cn) + ' ×</button>';
  }).join('');
  root.innerHTML =
    '<div class="panel"><div class="ph">已选 ' + sel.length + ' / 3</div>' +
      '<div class="radar-pick" id="radar-pick">' + optionsHtml + '</div></div>' +
    '<div class="panel"><div class="ph">六维雷达</div>' +
      '<div id="radar"></div>' +
      '<div class="radar-read" id="radar-read"></div>' +
    '</div>' +
    '<div class="panel"><div class="ph">维度说明</div><div class="radar-dims">' +
      DIM_META.map(function(d){ return '<div class="rdim"><b>' + d.cn + '</b><span>' + d.desc + '</span></div>'; }).join('') +
    '</div></div>';
  renderRadarPicker();
  /* 解读 */
  if (sel.length >= 2){
    var dimA = DIM_META.map(function(d){ return d; });
    var cmp = [];
    for (var k = 1; k < sel.length; k++){
      var A = BY_ID[sel[0]], B = BY_ID[sel[k]];
      var advA = [], advB = [];
      dimA.forEach(function(d){
        var va = (A.radar_scores && A.radar_scores[d.k]) || 0;
        var vb = (B.radar_scores && B.radar_scores[d.k]) || 0;
        if (va - vb >= 15) advA.push(d.cn);
        else if (vb - va >= 15) advB.push(d.cn);
      });
      var s = A.name_cn + '在' + (advA.join('、') || '各自维度') + '上高于' + B.name_cn;
      if (advB.length) s += '，而' + B.name_cn + '在' + advB.join('、') + '上占据优势';
      cmp.push(s);
    }
    $('radar-read').textContent = cmp.join('；') + '。';
  } else {
    $('radar-read').textContent = '再选至少 1 个风格开始对比。';
  }
  /* ECharts radar */
  if (typeof window.echarts === 'undefined'){
    $('radar').innerHTML = '<div class="graph-fallback"><b>雷达图暂不可用</b>ECharts 未加载。<button class="btn-ghost" id="radar-retry" type="button" style="margin-top:8px">重新加载</button></div>';
    var rr = $('radar-retry'); if (rr) rr.addEventListener('click', loadEcharts);
    return;
  }
  if (radarChart){ radarChart.dispose(); radarChart = null; }
  var indicator = DIM_META.map(function(d){ return {name:d.cn, max:100}; });
  var seriesData = sel.map(function(id, idx){
    var a = BY_ID[id];
    var vals = DIM_META.map(function(d){ return (a.radar_scores && a.radar_scores[d.k]) || 0; });
    return {value:vals, name:a.name_cn,
      lineStyle:{color:RADAR_COLORS[idx % RADAR_COLORS.length], width:2.5},
      itemStyle:{color:RADAR_COLORS[idx % RADAR_COLORS.length]},
      areaStyle:{opacity:.18}};
  });
  try {
    radarChart = echarts.init($('radar'));
    radarChart.setOption({
      backgroundColor:'transparent',
      tooltip:{},
      legend:{bottom:0, textStyle:{color:'#cfccda', fontSize:12}, icon:'circle'},
      radar:{indicator:indicator, radius:'62%', center:['50%','48%'],
        axisName:{color:'#9895a8', fontSize:11},
        splitLine:{lineStyle:{color:'rgba(255,255,255,.12)'}},
        splitArea:{areaStyle:{color:['rgba(255,255,255,.02)','rgba(255,255,255,.04)']}},
        axisLine:{lineStyle:{color:'rgba(255,255,255,.14)'}}},
      series:[{type:'radar', data:seriesData}]
    });
  } catch(err){
    $('radar').innerHTML = '<div class="graph-fallback"><b>雷达图渲染失败</b>' + esc((err && err.message) || '') + '</div>';
  }
}
function renderRadarPicker(){
  var root = $('radar-pick');
  if (!root) return;
  root.addEventListener('click', function(e){
    var p = e.target.closest('[data-pick]');
    if (p){
      var id = p.dataset.pick;
      var i = state.radar.indexOf(id);
      if (i > -1){ state.radar.splice(i, 1); }
      else {
        if (state.radar.length >= 3){ toast('最多对比 3 个风格', 'warn'); return; }
        state.radar.push(id);
      }
      renderRadar();
      return;
    }
    var rm = e.target.closest('[data-rm]');
    if (rm){
      var j = state.radar.indexOf(rm.dataset.rm);
      if (j > -1) state.radar.splice(j, 1);
      renderRadar();
    }
  });
}
function loadEcharts(){
  if (typeof window.echarts !== 'undefined'){ renderGraph(); renderRadar(); return; }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
  s.onload = function(){ toast('图表库加载成功', 'ok'); renderGraph(); renderRadar(); };
  s.onerror = function(){ toast('图表库加载失败，请检查网络', 'warn'); };
  document.head.appendChild(s);
}

/* ---------- 色板复制 ---------- */
function copyText(text){
  function done(){ toast('已复制 ' + text, 'ok'); }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(function(){ fallbackCopy(text); });
  } else { fallbackCopy(text); }
}
function fallbackCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('已复制 ' + text, 'ok'); }
  catch(e){ toast('复制失败，请手动复制', 'warn'); }
  document.body.removeChild(ta);
}

/* ---------- 详情模态 ---------- */
function relCard(rel){
  var b = BY_ID[rel.id]; if (!b) return '';
  return '<button class="rel-card" type="button" data-nav="' + b.id + '">' +
    '<div class="rel-thumb" style="background:linear-gradient(135deg,' + swatch(b,0) + ',' + swatch(b,1) + ')">' +
      '<img src="' + b.image + '" alt="' + esc(b.name_cn) + '" loading="lazy" onerror="this.style.display=\'none\'"></div>' +
    '<div class="rel-info">' +
      '<div class="rel-name">' + esc(b.name_cn) + '<span class="en">' + esc(b.name_en) + '</span>' +
      '<span style="margin-left:auto;font-family:var(--serif);font-weight:700;color:#fff;font-size:14px">' + rel.score + '</span></div>' +
      '<div class="rel-bar"><i style="width:' + rel.score + '%"></i></div>' +
      '<div class="rel-reason">' + esc(rel.reason) + '</div>' +
    '</div></button>';
}
function openDetail(id){
  var a = BY_ID[id]; if (!a) return;
  var fam = FAM_MAP[a.family];
  var palette = (a.colors || []).map(function(c){
    return '<div class="sw" data-copy="' + c + '" title="点击复制 ' + c + '"><i style="background:' + c + '"></i><span>' + c.toUpperCase() + '</span></div>';
  }).join('');
  function tags(arr){ return (arr || []).map(function(t){ return '<span>' + esc(t) + '</span>'; }).join(''); }
  var vf = a.visual_features || {};
  var sources = (a.sources || []).map(function(s){
    return '<a href="' + esc(s) + '" target="_blank" rel="noopener">' +
      '<svg viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>' +
      '<span>' + esc(prettyHost(s)) + '</span></a>';
  }).join('');
  var onSel = state.selected.indexOf(a.id) > -1;
  $('detail-root').innerHTML =
    '<div class="detail-top">' +
      '<button class="back-btn" id="detail-close" type="button">' +
      '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>关闭</button>' +
      '<button class="btn-ghost detail-add" data-id="' + a.id + '" type="button">' +
      '<span class="ico">' + (onSel ? svgCheck : svgPlus) + '</span><span class="lbl">' + (onSel ? '已加入' : '加入搭配') + '</span></button>' +
    '</div>' +
    '<div class="detail-layout">' +
      '<div class="detail-img" style="background:linear-gradient(135deg,' + swatch(a,0) + ',' + swatch(a,1) + ')">' +
        '<img src="' + a.image + '" alt="' + esc(a.name_cn) + ' ' + esc(a.name_en) + '" onerror="this.style.display=\'none\'"></div>' +
      '<div class="detail-info">' +
        '<div class="detail-head">' +
          '<span class="fam-tag" style="--fc:' + famColor(a.family) + '">' + esc(fam.name) + '</span>' +
          '<h2>' + esc(a.name_cn) + '</h2><div class="en">' + esc(a.name_en) + '</div></div>' +
        '<div class="palette">' + palette + '</div>' +
        '<div class="blk"><h4>一句话定义</h4><p>' + esc(a.definition) + '</p></div>' +
        '<div class="blk"><h4>定义详解</h4><p>' + esc(a.definition_detail || a.definition) + '</p></div>' +
        '<div class="blk"><h4>起源与历史</h4><p>' + esc(a.history || a.origin) + '</p></div>' +
      '</div></div>' +
    '<div class="blk"><h4>视觉特征</h4>' +
      (vf.color_system ? '<p style="margin-bottom:14px"><b style="color:#fff">色彩体系 · </b>' + esc(vf.color_system) + '</p>' : '') +
      '<div class="feat-row">' +
        '<div class="fr"><b>核心元素</b><div class="chip-tags">' + tags(vf.elements || a.elements) + '</div></div>' +
        '<div class="fr"><b>材质纹理</b><div class="chip-tags">' + tags(vf.materials || a.materials) + '</div></div>' +
      '</div></div>' +
    '<div class="blk"><h4>代表作品 / 人物 / 场景</h4><div class="chip-tags">' + tags(a.representatives) + '</div></div>' +
    '<div class="blk"><h4>应用示例</h4><div class="chip-tags">' + tags(a.applications) + '</div></div>' +
    '<div class="blk"><h4>相关词条</h4><div class="chip-tags">' + tags(a.related_terms) + '</div></div>' +
    (sources ? '<div class="sources"><h4>参考来源</h4>' + sources + '</div>' : '') +
    '<div class="related">' +
      '<h3>关联风格</h3><div class="related-sub">依据定义、起源与视觉语言计算的适配关系，点击卡片可跳转</div>' +
      '<div class="related-grid">' + (a.related || []).map(relCard).join('') + '</div></div>';
  var modal = $('detail-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  syncAddButtons();
  modal.scrollTop = 0;
}
function closeDetail(){
  var modal = $('detail-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (!document.body.classList.contains('drawer-open')) document.body.style.overflow = '';
}

/* ---------- 粒子背景 ---------- */
function initCanvas(){
  cvs = $('bg-canvas'); if (!cvs) return;
  ctx = cvs.getContext('2d');
  reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size(){ cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
  size();
  dots = [];
  var n = reduceMotion ? 22 : 36;
  for (var i = 0; i < n; i++){
    dots.push({x:Math.random(), y:Math.random(), r:.6+Math.random()*1.6,
      spd:.0006+Math.random()*.0016, ph:Math.random()*Math.PI*2,
      amp:.015+Math.random()*.04,
      c: Math.random()<.5 ? '0,229,255' : '255,47,214'});
  }
  (function frame(){
    if (!ctx) return;
    ctx.clearRect(0,0,cvs.width,cvs.height);
    var now = performance.now();
    for (var i = 0; i < dots.length; i++){
      var d = dots[i];
      d.y += d.spd;
      if (d.y > 1.04) d.y = -.04;
      var x = (d.x + Math.sin(now*.0002 + d.ph)*d.amp) * cvs.width;
      var y = d.y * cvs.height;
      var a = .13 + Math.abs(Math.sin(now*.0006 + d.ph))*.26;
      ctx.beginPath();
      ctx.arc(x, y, d.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(' + d.c + ',' + a.toFixed(3) + ')';
      ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(' + d.c + ',.85)';
      ctx.fill(); ctx.shadowBlur = 0;
    }
    requestAnimationFrame(frame);
  })();
}

/* ---------- 滚动揭示 ---------- */
function observeReveals(){
  var els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)){ for (var i=0;i<els.length;i++) els[i].classList.add('in'); return; }
  if (!io){
    io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if (en.isIntersecting){ en.target.classList.add('in'); io.unobserve(en.target); } });
    }, {threshold:.15});
  }
  for (var k = 0; k < els.length; k++) io.observe(els[k]);
  /* 卡片入场 */
  var cards = document.querySelectorAll('#grid .card:not(.in)');
  if (!io){ for (var j=0;j<cards.length;j++) cards[j].classList.add('in'); return; }
  cards.forEach(function(card, idx){
    setTimeout(function(){ io.observe(card); }, Math.min(idx*20, 600));
  });
}

/* ---------- 自定义光标 + 磁性按钮 ---------- */
function initCursor(){
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced) return;
  document.body.classList.add('has-cursor');
  var dot = document.querySelector('.cursor-dot');
  var ring = document.querySelector('.cursor-ring');
  var mx = -100, my = -100, rx = -100, ry = -100;
  document.addEventListener('mousemove', function(e){
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });
  (function follow(){
    rx += (mx - rx) * .18; ry += (my - ry) * .18;
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
    requestAnimationFrame(follow);
  })();
  document.addEventListener('mouseover', function(e){
    var t = e.target.closest('a,button,.card,.chip,.pick-chip,.sw,.ref-card');
    ring.classList.toggle('grow', !!t);
  });
}
function initMagnetic(){
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduced) return;
  var targets = document.querySelectorAll('.btn-primary,.btn-ghost,.add-btn,.fab');
  targets.forEach(function(btn){
    btn.addEventListener('mousemove', function(e){
      var r = btn.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width/2);
      var dy = e.clientY - (r.top + r.height/2);
      btn.style.transform = 'translate(' + (dx*.12).toFixed(1) + 'px,' + (dy*.18).toFixed(1) + 'px)';
    });
    btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
  });
}

/* ---------- 事件绑定 ---------- */
function bindEvents(){
  /* 卡片网格 */
  $('grid').addEventListener('click', function(e){
    var add = e.target.closest('.add-btn');
    if (add){ e.stopPropagation(); toggleSelect(add.dataset.id); return; }
    var card = e.target.closest('.card');
    if (card) openDetail(card.dataset.id);
  });
  $('grid').addEventListener('keydown', function(e){
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('card')){
      e.preventDefault(); openDetail(e.target.dataset.id);
    }
  });

  /* 详情模态 */
  $('detail-modal').addEventListener('click', function(e){
    if (e.target === $('detail-modal')){ closeDetail(); return; }
    if (e.target.closest('#detail-close')){ closeDetail(); return; }
    if (e.target.closest('.detail-add')){ toggleSelect(e.target.closest('.detail-add').dataset.id); return; }
    var sw = e.target.closest('.sw');
    if (sw){ copyText(sw.dataset.copy); sw.classList.add('copied');
      setTimeout(function(){ sw.classList.remove('copied'); }, 1500); return; }
    var nav = e.target.closest('.rel-card');
    if (nav) openDetail(nav.dataset.nav);
  });

  /* 侧边栏导航 */
  document.querySelectorAll('.rail-item[data-route]').forEach(function(item){
    item.addEventListener('click', function(){
      location.hash = item.dataset.route;
      if (isNarrow()) closeDrawer();
    });
  });
  /* 折叠按钮 */
  $('side-toggle').addEventListener('click', toggleSideDesktop);
  /* 抽屉与 FAB */
  $('side-scrim').addEventListener('click', closeDrawer);
  $('menu-btn').addEventListener('click', openDrawer);
  $('fab').addEventListener('click', function(){
    if (isNarrow()) openDrawer();
    else if (document.body.classList.contains('side-collapsed')) setSideMode('expanded');
    else location.hash = '#/match';
  });
  /* 占位返回 */
  $('soon-back').addEventListener('click', function(){ location.hash = '#/'; });

  /* 搜索 */
  $('search').addEventListener('input', function(){
    state.query = this.value.trim().toLowerCase();
    applyFilters();
  });
  $('clear-search').addEventListener('click', function(){
    $('search').value = ''; state.query = ''; applyFilters(); $('search').focus();
  });

  /* hash 路由 */
  window.addEventListener('hashchange', navigate);

  /* 键盘 */
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape'){
      if ($('detail-modal').classList.contains('open')) closeDetail();
      else if (document.body.classList.contains('drawer-open')) closeDrawer();
    }
  });

  /* 尺寸变化 */
  var resizeRaf = null;
  window.addEventListener('resize', function(){
    if (graphChart){ cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(function(){ graphChart.resize(); }); }
    if (radarChart){ cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(function(){ radarChart.resize(); }); }
    if (ctx){ cvs.width = window.innerWidth; cvs.height = window.innerHeight; }
    updateIndicators();
  });
  if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', updateIndicators);
}

/* ---------- 初始化 ---------- */
function init(){
  if (document.documentElement.classList) document.documentElement.classList.add('io');
  try {
    var saved = localStorage.getItem('linggan.side');
    if (saved === 'collapsed') document.body.classList.add('side-collapsed');
  } catch(e){}
  renderFamilyChips();
  buildSearchIndex();
  var totalRel = 0;
  AESTHETICS.forEach(function(a){ totalRel += (a.related || []).length; });
  $('stat-c').textContent = totalRel;
  applyFilters();
  bindEvents();
  renderDaily();
  renderMarquee();
  renderMatch();
  renderRadar();
  updateIndicators();
  navigate();
  initCanvas();
  observeReveals();
  initCursor();
  initMagnetic();
  window.setTimeout(function(){
    if (typeof window.echarts === 'undefined') loadEcharts();
  }, 4000);
}

if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
else { init(); }

})();

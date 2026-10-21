/* ==========================================================================
   棂感 · AI 提示词工坊（v2.5）
   --------------------------------------------------------------------------
   把「风格数据 + 用途方向 + 目标模型」拼成可直接粘贴的 AI 生图提示词。
   · 单一风格：详情页 / 搭配台只选 1 个时使用
   · 混搭风格：搭配台选 2–6 个时，以第一个为主基调（约六成）融合其余风格
   · 模型决定语言与写法：豆包 Seedream（中文长句）、Midjourney（英文 + 参数）、
     Flux / SD（英文 + 负面提示词）、通义万相（中文关键词）
   对外只暴露 window.LingganPrompt = { mount, build, MODELS, DIRS }。
   ========================================================================== */
(function(){
'use strict';

/* ---------- 家族气质（中 / 英） ---------- */
var FAMILY_ZH = {
  ism:      '艺术史流派语言，经典构图与考究材质',
  core:     '生活方式氛围，沉浸式的日常场景',
  wave:     '复古未来感，霓虹与屏幕质感',
  digital:  '数字原生视觉，界面与像素语言',
  dark:     '暗调氛围，低调光线与深阴影',
  fresh:    '柔和自然光，清透轻盈的呼吸感',
  retro:    '年代质感，印刷与轻度褪色',
  kawaii:   '日系街头与萌感，夸张可爱的比例',
  china:    '东方气韵，传统纹样与矿物色'
};
var FAMILY_EN = {
  ism:      'landmark art movement, art-historical reference',
  core:     'internet-born lifestyle aesthetic, immersive subculture mood',
  wave:     'retro-futurist wave aesthetic, neon glow, analog screen texture',
  digital:  'digital-native visual language, screen-space rendering',
  dark:     'dark romantic atmosphere, low-key lighting, deep shadows',
  fresh:    'soft natural light, airy delicate mood',
  retro:    'vintage reference, aged print texture, nostalgic cast',
  kawaii:   'Japanese street-fashion energy, playful exaggerated proportions',
  china:    'Chinese classical aesthetics, traditional motifs, oriental pigments'
};

/* ---------- 目标模型 ---------- */
var MODELS = [
  { id:'seedream', name:'豆包 Seedream', short:'Seedream', lang:'zh', writes:'rich',
    desc:'中文自然语言长句，适合豆包 / 即梦 / Seedream' },
  { id:'midjourney', name:'Midjourney', short:'MJ', lang:'en', writes:'params',
    desc:'英文短语 + 画幅参数（--ar / --style raw / --v 7）' },
  { id:'flux', name:'Flux / SD', short:'Flux', lang:'en', writes:'negative',
    desc:'英文短语 + 独立负面提示词，适合 Flux / Stable Diffusion / WebUI' },
  { id:'wanx', name:'通义万相', short:'万相', lang:'zh', writes:'dense',
    desc:'中文关键词堆叠，适合通义万相 / 可图 / 文心一格' }
];

/* ---------- 用途方向 ---------- */
var DIRS = [
  { id:'poster', name:'海报', ratio:'3:4',
    zh:'画面：竖版海报主视觉（3:4）。主体居中偏上，上方留出标题区，版式干净、可叠加中文标题，整体凝练有冲击力。',
    en:'vertical poster key visual, centered subject in the upper middle, clean negative space for a headline, bold graphic composition',
    lightZh:'戏剧性主光，主体边缘高光，背景适度压暗以留出标题空间',
    lightEn:'dramatic key light, rim highlight on the subject, darkened background for headline space',
    negEn:'illegible text, cluttered layout, cramped composition' },
  { id:'product', name:'产品图', ratio:'1:1',
    zh:'画面：产品级静物（1:1）。主体置于简洁背景中央，柔和主光加侧后方轮廓光，材质与工艺细节清晰，可直接当电商主图。',
    en:'commercial product still life, subject centered on a minimal background, soft key light with rim light, crisp material and craft detail',
    lightZh:'柔光箱主光加轮廓光，背景干净，高光受控、材质层次分明',
    lightEn:'softbox key light with rim light, clean backdrop, controlled highlights, rich material texture',
    negEn:'messy background, harsh reflections, plastic look' },
  { id:'character', name:'人物写真', ratio:'2:3',
    zh:'画面：人物半身肖像（2:3）。自然的表情与姿态，妆造与服装贴合风格气质，浅景深，肖像级皮肤质感。',
    en:'editorial portrait, half body, natural pose and expression, wardrobe and makeup matching the aesthetic, shallow depth of field',
    lightZh:'柔和窗光或伦勃朗光，面部立体，皮肤质感细腻自然',
    lightEn:'soft window light or Rembrandt lighting, sculpted face, natural skin texture',
    negEn:'distorted face, extra limbs, bad anatomy, waxy skin' },
  { id:'scene', name:'场景概念', ratio:'16:9',
    zh:'画面：场景概念图（16:9）。广角建立空间关系，前景 / 中景 / 远景分层，环境光与体积雾塑造氛围，电影级调色。',
    en:'wide-angle environment concept art, layered foreground midground and background, atmospheric haze, cinematic color grading',
    lightZh:'自然天光混合体积雾与实景光源，层次通透，电影级调色',
    lightEn:'natural daylight mixed with volumetric haze and practical lights, cinematic grading',
    negEn:'flat lighting, empty foreground, muddy colors' },
  { id:'illustration', name:'插画', ratio:'4:5',
    zh:'画面：插画（4:5）。平面化构图，用线条与色块概括形体，装饰性纹理做点缀，适合书籍内页与社媒配图。',
    en:'stylized editorial illustration, flat graphic composition, bold shapes and clean outline work, decorative texture accents',
    lightZh:'均匀柔光，色块干净，装饰纹理清晰可辨',
    lightEn:'even soft light, clean color blocks, readable decorative texture',
    negEn:'muddy colors, inconsistent line weight, photobash' },
  { id:'branding', name:'品牌视觉', ratio:'1:1',
    zh:'画面：品牌视觉（1:1）。简洁留白，标志性图形与配色系统清晰，可延展到包装、名片与招牌。',
    en:'brand identity key visual, minimal layout with a clear logo mark, systematic color palette, packaging and signage ready',
    lightZh:'柔和均匀棚光，留白干净，图形边缘锐利',
    lightEn:'even studio light, generous clean space, crisp graphic edges',
    negEn:'generic template look, cluttered logo, noisy background' }
];

/* ---------- 状态（模型 / 方向 记住上次选择） ---------- */
var LS_KEY = 'linggan.prompt.v1';
var state = { model:'seedream', dir:'poster' };
(function load(){
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    var o = JSON.parse(raw);
    if (!o) return;
    if (byId(MODELS, o.model)) state.model = o.model;
    if (byId(DIRS, o.dir)) state.dir = o.dir;
  } catch(e){}
})();
function save(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch(e){}
}

/* ---------- 小工具 ---------- */
function byId(list, id){
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return list[0];
}
function clean(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
function firstSentence(s){
  s = clean(s);
  var i = s.search(/[。；;]/);
  return i > 1 ? s.slice(0, i) : s;
}
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function listJoin(arr, n, sep){
  return (arr || []).slice(0, n).join(sep == null ? '、' : sep);
}
function uniq(arr){
  var out = [], seen = {};
  for (var i = 0; i < arr.length; i++){
    var v = String(arr[i] || '').toUpperCase();
    if (v && !seen[v]){ seen[v] = 1; out.push(v); }
  }
  return out;
}
function colorHexes(style, n){
  return (style.colors || []).slice(0, n).map(function(c){ return String(c).toUpperCase(); });
}
function mergedColors(styles, total){
  var out = [];
  styles.forEach(function(s, i){
    out = out.concat(colorHexes(s, i === 0 ? Math.min(3, s.colors ? s.colors.length : 0) : 2));
  });
  return uniq(out).slice(0, total || 6);
}
function colorSystem(style){
  var vf = style.visual_features || {};
  /* 数据里的色彩体系描述自带句号，去掉结尾标点避免出现「。。」 */
  return clean(vf.color_system).replace(/[。．.；;，,、\s]+$/, '');
}

/* ---------- 中文 · 长句版（Seedream） ---------- */
function buildZhRich(styles, dir){
  var main = styles[0], rest = styles.slice(1);
  var fam = FAMILY_ZH[main.family] || '';
  var lines = [];

  lines.push(dir.zh);

  if (!rest.length){
    lines.push('风格基调：「' + clean(main.name_cn) + '（' + clean(main.name_en) + '）」—— ' +
      firstSentence(main.definition) + '。');
  } else {
    lines.push('主基调：「' + clean(main.name_cn) + '（' + clean(main.name_en) + '）」（约占六成）—— ' +
      firstSentence(main.definition) + '。');
    var blend = rest.map(function(s){
      var kw = listJoin(s.elements, 2);
      return '「' + clean(s.name_cn) + '」的' + (kw || '气质');
    }).join('、');
    lines.push('融合：把' + blend + '作为点缀穿插进来（其余风格合占四成），整体保持一个主视觉、不互相打架。');
  }

  var cs = colorSystem(main);
  lines.push('配色：主色 ' + colorHexes(main, 4).join(' / ') + (cs ? '；' + cs : '') + '。');

  var els = listJoin(main.elements || (main.visual_features || {}).elements, 4);
  if (els) lines.push('核心元素：' + els + '。');

  var mats = listJoin(main.materials || (main.visual_features || {}).materials, 3);
  if (mats) lines.push('材质质感：' + mats + '。');

  if (main.iconography && main.iconography.length) lines.push('意象参考：' + listJoin(main.iconography, 3) + '。');

  if (rest.length){
    var others = rest.map(function(s){
      return '「' + clean(s.name_cn) + '」用 ' + colorHexes(s, 2).join(' / ');
    }).join('；');
    if (others) lines.push('辅色：' + others + '，只用在局部层次与点缀上。');
  }

  if (fam) lines.push('气质：' + fam + '。');
  lines.push('光线与画质：' + dir.lightZh + '；高细节、材质真实、构图讲究，专业级美术指导。');
  lines.push('画幅：' + dir.ratio + '。');

  return lines.join('\n');
}

/* ---------- 中文 · 关键词版（通义万相） ---------- */
function buildZhDense(styles, dir){
  var main = styles[0], rest = styles.slice(1);
  var bits = [];
  bits.push(clean(main.name_cn) + dir.name);
  if (rest.length) bits.push('融合 ' + rest.map(function(s){ return clean(s.name_cn); }).join(' / '));
  var els = listJoin(main.elements || (main.visual_features || {}).elements, 3);
  if (els) bits.push(els.replace(/、/g, '，'));
  var mats = listJoin(main.materials || (main.visual_features || {}).materials, 2);
  if (mats) bits.push(mats.replace(/、/g, '，'));
  bits.push('主色 ' + mergedColors(styles, 5).join(' '));
  if (main.iconography && main.iconography.length) bits.push(main.iconography[0]);
  bits.push(dir.lightZh.replace(/；.*$/, ''));
  bits.push('高清细节，专业美术指导');
  bits.push('画幅 ' + dir.ratio);
  return bits.join('，') + '。';
}

/* ---------- 英文（Midjourney / Flux） ---------- */
function buildEn(styles, dir){
  var main = styles[0], rest = styles.slice(1);
  var bits = [];
  bits.push(dir.en);
  bits.push(clean(main.name_en) + ' aesthetic');
  if (FAMILY_EN[main.family]) bits.push(FAMILY_EN[main.family]);
  if (rest.length){
    bits.push('blended with ' + rest.map(function(s){ return clean(s.name_en) + ' motifs'; }).join(' and ') +
      ', dominant first style around 60% of the frame');
  }
  bits.push('color palette ' + mergedColors(styles, 5).join(', '));
  bits.push(dir.lightEn);
  bits.push('highly detailed, sharp focus, professional art direction');
  return bits.join(', ') + '.';
}

function negativeFor(dir, styles){
  var extra = clean(dir.negEn);
  var base = 'lowres, blurry, jpeg artifacts, watermark, signature, text overlay, deformed hands, extra fingers, bad anatomy, oversaturated, plastic skin';
  return base + (extra ? ', ' + extra : '');
}

/* ---------- 对外：生成 ---------- */
function build(styles, modelId, dirId){
  var list = (styles || []).filter(Boolean);
  if (!list.length) return { text:'', negative:'', meta:'', hint:'' };
  var model = byId(MODELS, modelId || state.model);
  var dir = byId(DIRS, dirId || state.dir);
  var text = '', negative = '';

  if (model.lang === 'en'){
    text = buildEn(list, dir);
    if (model.writes === 'params') text += ' --ar ' + dir.ratio.replace(':', ':') + ' --style raw --v 7';
    if (model.writes === 'negative') negative = negativeFor(dir, list);
  } else if (model.writes === 'dense'){
    text = buildZhDense(list, dir);
  } else {
    text = buildZhRich(list, dir);
  }

  var mix = list.length > 1;
  var hint = mix
    ? '主风格取搭配台里的<b>第一个</b>（约占六成），其余风格均分点缀；换主角就调整选择顺序。'
    : '想换画面内容，直接改开头那句「画面：…」即可，后面的风格参数保持不动。';
  if (model.writes === 'negative') hint += ' 负面提示词建议和正向一起粘贴。';
  if (model.lang === 'en') hint += ' 英文模型以风格名、配色与构图为主干，想更细可把「核心元素」译成英文追加。';

  return {
    text: text,
    negative: negative,
    meta: dir.name + ' · ' + model.name + ' · ' + text.length + ' 字',
    hint: hint,
    model: model,
    dir: dir
  };
}

/* ---------- 复制 ---------- */
function copy(text, btn, doneLabel){
  var label = doneLabel || '已复制';
  var old = btn ? btn.textContent : '';
  function ok(){
    if (btn){
      btn.textContent = label;
      btn.classList.add('is-copied');
      setTimeout(function(){ btn.textContent = old; btn.classList.remove('is-copied'); }, 1600);
    }
  }
  function fallback(){
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-9999px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); ok(); } catch(e){}
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(ok).catch(fallback);
  } else { fallback(); }
}

/* ---------- 面板渲染 ---------- */
var instances = [];

function chipsHtml(list, current, kind){
  return list.map(function(m){
    var ratio = (kind === 'dir') ? '<span class="lgp-ratio">' + m.ratio + '</span>' : '';
    return '<button type="button" class="lgp-chip' + (m.id === current ? ' on' : '') + '"' +
      ' data-lgp-' + kind + '="' + m.id + '" title="' + esc(m.desc || m.name) + '">' +
      esc(m.name) + ratio + '</button>';
  }).join('');
}

function paint(root, styles){
  var model = byId(MODELS, state.model);
  var dir = byId(DIRS, state.dir);
  var chipsModel = root.querySelector('[data-lgp-model-chips]');
  var chipsDir = root.querySelector('[data-lgp-dir-chips]');
  if (chipsModel) chipsModel.innerHTML = chipsHtml(MODELS, model.id, 'model');
  if (chipsDir) chipsDir.innerHTML = chipsHtml(DIRS, dir.id, 'dir');

  var out = build(styles, model.id, dir.id);
  var textEl = root.querySelector('[data-lgp-text]');
  var metaEl = root.querySelector('[data-lgp-meta]');
  var hintEl = root.querySelector('[data-lgp-hint]');
  var negWrap = root.querySelector('[data-lgp-neg-wrap]');
  var negEl = root.querySelector('[data-lgp-neg]');
  var copyBtn = root.querySelector('[data-lgp-copy]');

  if (textEl) textEl.textContent = out.text;
  if (metaEl) metaEl.textContent = out.meta;
  if (hintEl) hintEl.innerHTML = out.hint;
  if (negWrap && negEl){
    if (out.negative){ negEl.textContent = out.negative; negWrap.hidden = false; }
    else { negEl.textContent = ''; negWrap.hidden = true; }
  }
  if (copyBtn) copyBtn.setAttribute('data-lgp-copy', out.text);
}

function mount(el, styles){
  if (!el) return;
  var list = (styles || []).filter(Boolean);
  if (!list.length){ el.innerHTML = ''; return; }

  el.innerHTML =
    '<div class="lgp">' +
      '<div class="lgp-controls">' +
        '<div class="lgp-field"><span class="lgp-lb">模型</span>' +
          '<div class="lgp-chips" data-lgp-model-chips role="group" aria-label="提示词用于哪个模型"></div></div>' +
        '<div class="lgp-field"><span class="lgp-lb">方向</span>' +
          '<div class="lgp-chips" data-lgp-dir-chips role="group" aria-label="提示词用于什么方向"></div></div>' +
      '</div>' +
      '<div class="lgp-out">' +
        '<div class="lgp-bar">' +
          '<span class="lgp-tag">正向提示词</span>' +
          '<span class="lgp-meta" data-lgp-meta></span>' +
          '<button type="button" class="lgp-copy" data-lgp-copy>一键复制</button>' +
        '</div>' +
        '<pre class="lgp-text" data-lgp-text></pre>' +
        '<div data-lgp-neg-wrap hidden>' +
          '<div class="lgp-sub"><span>负面提示词</span>' +
            '<button type="button" class="lgp-copy-sm" data-lgp-copy-neg>复制负面词</button></div>' +
          '<pre class="lgp-neg" data-lgp-neg></pre>' +
        '</div>' +
        '<p class="lgp-hint" data-lgp-hint></p>' +
      '</div>' +
    '</div>';

  var root = el.firstChild;

  root.addEventListener('click', function(e){
    var mBtn = e.target.closest('[data-lgp-model]');
    if (mBtn){
      state.model = mBtn.getAttribute('data-lgp-model');
      save(); paintAll();
      return;
    }
    var dBtn = e.target.closest('[data-lgp-dir]');
    if (dBtn){
      state.dir = dBtn.getAttribute('data-lgp-dir');
      save(); paintAll();
      return;
    }
    var cBtn = e.target.closest('[data-lgp-copy]');
    if (cBtn){ copy(cBtn.getAttribute('data-lgp-copy'), cBtn, '已复制 ✓'); return; }
    var nBtn = e.target.closest('[data-lgp-copy-neg]');
    if (nBtn){
      var nEl = root.querySelector('[data-lgp-neg]');
      if (nEl) copy(nEl.textContent, nBtn, '已复制 ✓');
      return;
    }
  });

  instances = instances.filter(function(it){ return document.body.contains(it.el); });
  instances.push({ el: el, root: root, styles: list });
  paint(root, list);
}

function paintAll(){
  instances = instances.filter(function(it){ return document.body.contains(it.el); });
  instances.forEach(function(it){
    /* 容器被重新渲染过（root 已不在文档里）时，用新的根节点继续 */
    if (!document.body.contains(it.root)){
      var next = it.el.querySelector('.lgp');
      if (!next) return;
      it.root = next;
    }
    paint(it.root, it.styles);
  });
}

window.LingganPrompt = {
  mount: mount,
  build: build,
  MODELS: MODELS,
  DIRS: DIRS,
  state: state
};

})();

/* A 计划 · 风格搭配师规则引擎（浏览器版，由 build.py 生成，勿手改）
   单一源: advisor-engine2.js ｜ 生成命令: python _proto/build.py */
/* =========================================================================
   A 计划 v2 · 风格搭配师（纯规则）
   对外：StyleAdvisor.answer(text) / .retrieve(text, k) / .parse(text)
   ========================================================================= */
var StyleAdvisor = (function(){
  var DATA = window.LINGGAN_DATA || {aesthetics:[],families:[],categories:[]};
  var AES = DATA.aesthetics || [];
  var FAM = {}, CAT = {};
  (DATA.families||[]).forEach(function(f){ FAM[f.id]=f; });
  (DATA.categories||[]).forEach(function(c){ CAT[c.id]=c; });
  var BY = {}; AES.forEach(function(a){ BY[a.id]=a; });

  /* ---------- 1. 同义桥接表：把「用户的话」接到「库里的词」 ----------
     这是纯规则方案的关键：没有它，用户说「街拍」永远匹配不到「街头」。 */
  var SYN = {
    // 场合 / 媒介
    '街拍':['街头','户外','城市','路面','滑板','球鞋'], '街头':['街头','滑板','球鞋','潮流'],
    '通勤':['极简','高级','简约','西装','利落'], '上班':['极简','高级','简约'],
    '约会':['浪漫','温柔','柔美','蕾丝'], '婚礼':['浪漫','优雅','蕾丝','白','薄纱','珍珠'],
    '旅行':['户外','自然','风景','公路','山'], '度假':['户外','自然','海岸','阳光'],
    '家居':['室内','空间','木质','家居'], '装修':['室内','空间','建筑','材质'],
    '海报':['平面','排版','视觉','图形'], '平面':['平面','排版','图形','构成'],
    '品牌':['平面','视觉','标识','高级'], '字体':['字体','无衬线','排版'],
    '摄影':['摄影','影像','取景','胶片'], '照片':['摄影','影像','胶片'],
    '短片':['影像','剪辑','镜头','影视'], '视频':['影像','剪辑','镜头'],
    '电影':['影像','影视','镜头','胶片'], '剪辑':['影像','剪辑','镜头'],
    '音乐':['音乐','专辑','唱片','音色'], '专辑':['专辑','唱片','封面'],
    '封面':['封面','专辑','海报'], '游戏':['游戏','像素','虚拟','界面'],
    '界面':['界面','数字','像素','网格'], '网页':['网页','数字','像素','终端'],
    // 质感 / 气质
    '质感':['材质','纹理','皮革','金属','哑光','做旧'],
    '低调':['极简','低饱和','暗色','低调','简约','素色'],
    '高级':['高级','精致','质感','优雅','极简'],
    '秋冬':['暗色','皮革','羊毛','针织','大地色','天鹅绒'],
    '春夏':['明亮','清爽','薄纱','轻盈','浅色'],
    '显瘦':['暗色','利落','深色'],
    '个性':['前卫','张扬','先锋','拼贴','解构'],
    '干净':['极简','简约','留白','低饱和'],
    '有氛围':['氛围','光影','朦胧','雾'],
    // 颜色口语
    '奶油':['米白','浅黄','奶','柔','粉彩'], '大地色':['大地色','棕','土','沙','木'],
    '莫兰迪':['低饱和','灰调','柔和','哑光'], '马卡龙':['粉','甜','糖','柔和'],
    '荧光':['荧光','霓虹','高饱和','LED'], '金属色':['金属','铬','银','铜'],
    // 材质口语
    '做旧':['做旧','磨损','锈蚀','褪色','复古'], '生锈':['锈蚀','做旧','金属'],
    '毛绒':['羊毛','绒','针织','柔软'], '透明':['透明','玻璃','薄纱','亚克力'],
    // 风格口语
    '酷':['冷峻','硬核','暗黑','前卫','机能'], '帅':['利落','机能','硬朗','皮革','铆钉'],
    '甜酷':['粉','蕾丝','皮','铆钉','朋克'], '森系':['自然','森','植物','棉麻'],
    '氛围感':['氛围','光影','朦胧','雾','胶片'], 'ins风':['极简','低饱和','北欧','留白'],
    '老钱':['老钱','优雅','精致','低调','质感'], '法式':['优雅','浪漫','慵懒','蕾丝','碎花'],
    '日系':['日系','清爽','自然','棉麻','原木'], '韩系':['简约','温柔','低饱和','米白','柔'],
    '港风':['复古','胶片','浓烈','霓虹'], '末世':['废土','荒芜','残破','锈蚀'],
    '废土':['废土','荒芜','残破','锈蚀','沙尘'], '科幻':['科幻','未来','机械','金属'],
    '太空':['太空','星','宇宙','银'], '深海':['深海','水','幽蓝','暗'], '森林':['森林','树','苔藓','绿'],
    '雪':['雪','白','冰','寒'], '沙漠':['沙','干裂','荒芜','土黄','尘'],
    // 补充：质感/气质口语（提升「低调有质感」这类表达）
    '有质感':['材质','纹理','皮革','哑光','金属'], '质感好':['材质','纹理','哑光','精致'],
    '破败':['残破','废土','锈蚀','荒芜','剥落'], '显贵':['老钱','优雅','精致','质感','高级'],
    '不张扬':['低饱和','暗色','极简','简约'], '素':['素色','米白','低饱和','极简'],
    '浓':['高饱和','浓烈','对比'], '淡':['低饱和','浅色','柔和'],
    // 补充：具体媒介
    '拍摄':['摄影','影像','取景'], '镜头':['影像','影视','镜头'], '配色':['配色','色板','色彩'],
    '色板':['配色','色彩','色板'], '留白':['留白','极简','水墨'], '水墨':['水墨','墨','留白','宣纸'],
    '赛博朋克':['赛博','霓虹','科技','未来'], '赛博':['赛博','霓虹','科技','未来','机械'],
    '蒸汽波':['蒸汽波','霓虹','复古未来'], '霓虹':['霓虹','荧光','LED','灯管'],
    '科幻':['科幻','未来','机械','金属','太空'], '未来感':['未来','科技','机械'],
    '科技感':['科技','机械','金属','数字'], '科幻感':['科幻','未来','机械'],
    '胶片':['胶片','颗粒','褪色','噪点','旧照片'], '像素':['像素','8-bit','网格','复古游戏'],
    '电子':['电子','合成器','霓虹','科技'], '摇滚':['摇滚','朋克','皮衣','铆钉'],
    // 依据 probe-vocab.js 实测：以下口语词用户在语料中无对应，需显式桥接
    '装修':['室内','空间','建筑','木质','极简','工业'], '改造':['室内','空间','建筑'],
    '约会':['浪漫','温柔','柔美','蕾丝','甜'], '初恋':['甜','柔','粉','少女'],
    '茶室':['木','禅','静','原木','纸'], '禅意':['极简','留白','静','自然','墨'],
    '茶':['木','禅','静','绿'], '书房':['书','木','纸','静','图书'],
    '波西米亚':['碎花','流苏','棉麻','大地色','长途旅行'], '民俗':['碎花','流苏','手工','民族'],
    '彩窗':['玻璃','教堂','彩色','光'], '教堂':['哥特','石','穹顶','彩绘'],
    '肃穆':['庄重','暗','石','对称','仪式'], '仪式感':['庄重','对称','仪式','礼'],
    '工业':['钢','铁','机械','厂房','锈蚀','管道','混凝土'],
    '工业风':['钢','铁','机械','厂房','锈蚀','管道','混凝土'],
    '咖啡店':['咖啡','木','暖','桌'], '咖啡':['咖啡','木','暖','桌'],
    '夜景':['夜','霓虹','灯','都市','暗'], '霓虹灯':['霓虹','灯管','荧光','LED'],
    '长裙':['裙','棉麻','薄纱','碎花'], '少女':['甜','粉','蕾丝','可爱','柔'],
    '莫兰迪':['低饱和','灰调','柔','哑光','素色'], '马卡龙':['粉彩','甜','柔','浅色'],
    '冷淡':['极简','低饱和','素','冷'], '清冷':['冷','素','静','淡','极简'],
    '野性':['兽','原始','粗犷','自然','皮革'], '张扬':['高饱和','撞色','前卫','解构'],
    '破败':['残破','废墟','荒芜','锈蚀','剥落'], '显贵':['老钱','精致','优雅','质感','高级'],
    '界面设计':['界面','网格','字体','像素'], 'ui设计':['界面','网格','字体','像素']
  };

  /* ---------- 2. 意图画像：口语 → 雷达维度目标值 ---------- */
  var MOOD = {
    '暗黑':{darkness:88,refinement:55}, '黑暗':{darkness:88}, '神秘':{darkness:80,refinement:70},
    '阴郁':{darkness:85,nature:25}, '忧郁':{darkness:70,nature:40,retro:60}, '压抑':{darkness:82,color_intensity:30},
    '治愈':{nature:80,refinement:60,darkness:20}, '温柔':{refinement:78,nature:65,color_intensity:35},
    '甜':{color_intensity:82,refinement:55}, '可爱':{color_intensity:75,tech:25,darkness:20},
    '清冷':{darkness:55,nature:55,color_intensity:35,refinement:75}, '冷淡':{color_intensity:28,refinement:78,darkness:55},
    '浪漫':{refinement:82,nature:60,color_intensity:60}, '高级':{refinement:85,color_intensity:40},
    '优雅':{refinement:88,color_intensity:45}, '华丽':{refinement:82,color_intensity:80},
    '科技':{tech:90,darkness:60}, '未来':{tech:88,darkness:55,retro:15}, '赛博':{tech:92,darkness:75,color_intensity:80},
    '怀旧':{retro:88,nature:40}, '复古':{retro:88}, '做旧':{retro:80,darkness:60},
    '自然':{nature:88,tech:12}, '户外':{nature:85,tech:20}, '野性':{nature:70,darkness:60,color_intensity:65},
    '梦幻':{refinement:70,nature:60,color_intensity:65}, '极简':{refinement:80,color_intensity:25},
    '低调':{refinement:76,color_intensity:30,darkness:58}, '高级感':{refinement:85,color_intensity:42},
    '张扬':{color_intensity:88,refinement:35}, '炸裂':{color_intensity:92,tech:60},
    '平静':{darkness:45,nature:65,color_intensity:30}, '干净':{refinement:78,color_intensity:30,nature:55},
    '硬核':{tech:70,darkness:75,color_intensity:65,refinement:30},
    '松弛':{nature:70,refinement:50,color_intensity:40}, '慵懒':{nature:65,refinement:52},
    '庄重':{refinement:82,darkness:60,color_intensity:45}, '东方':{nature:55,retro:80,refinement:82},
    '学院':{retro:78,refinement:75,nature:45}, '街头':{color_intensity:70,tech:45,refinement:35,darkness:50},
    '秋冬':{darkness:65,retro:55,nature:50,color_intensity:40},
    '春夏':{color_intensity:65,nature:65,darkness:25,refinement:55},
    '显贵':{refinement:84,color_intensity:38,darkness:52}, '老钱':{refinement:84,color_intensity:38,retro:66},
    '破败':{darkness:80,nature:40,refinement:26,retro:70}, '残破':{darkness:78,nature:42,refinement:26,retro:70},
    '荒芜':{nature:62,darkness:72,refinement:28}, '粗糙':{refinement:26,nature:62},
    '利落':{refinement:70,color_intensity:34,darkness:56}, '干练':{refinement:72,color_intensity:34},
    '柔和':{refinement:74,nature:64,color_intensity:40}, '明亮':{color_intensity:70,nature:60,darkness:22},
    '清爽':{nature:72,color_intensity:50,darkness:25,refinement:62}, '朦胧':{refinement:66,nature:58,color_intensity:45},
    '浓烈':{color_intensity:86,refinement:44}, '安静':{darkness:48,nature:64,color_intensity:30},
    '华丽':{refinement:82,color_intensity:80}, '朴素':{refinement:62,color_intensity:28,nature:58},
    '先锋':{tech:72,color_intensity:70,refinement:40}, '前卫':{tech:70,color_intensity:68,refinement:40},
    '张扬':{color_intensity:88,refinement:32}, '野性':{nature:72,darkness:62,color_intensity:66,refinement:32},
    '禅意':{refinement:84,nature:74,color_intensity:22,darkness:40,tech:14},
    '肃穆':{refinement:80,darkness:70,color_intensity:35},
    '工业':{tech:74,darkness:72,refinement:32,color_intensity:40},
    '波西米亚':{nature:76,retro:72,color_intensity:62,refinement:46},
    '胶片':{retro:82,refinement:56,color_intensity:42},
    '少女':{color_intensity:76,refinement:64,darkness:20,nature:52}
  };
  var SCENE = {
    '街拍':{fam:{core:1.14,fresh:1.10,kawaii:1.08},cat:{fashion:1.20,lifestyle:1.08}},
    '穿搭':{cat:{fashion:1.30,lifestyle:1.08}}, '衣服':{cat:{fashion:1.30}}, '造型':{cat:{fashion:1.24}},
    '家居':{cat:{architecture:1.24,lifestyle:1.18}}, '装修':{cat:{architecture:1.30}}, '室内':{cat:{architecture:1.24}},
    '海报':{cat:{design:1.30}}, '平面':{cat:{design:1.30}}, '品牌':{cat:{design:1.24}},
    '字体':{cat:{design:1.20}}, '排版':{cat:{design:1.20}},
    '摄影':{cat:{media:1.24}}, '照片':{cat:{media:1.24}}, '影像':{cat:{media:1.30}},
    '短片':{cat:{media:1.30}}, '视频':{cat:{media:1.30}}, '电影':{cat:{media:1.30}}, '剪辑':{cat:{media:1.30}},
    '音乐':{cat:{music:1.35}}, '专辑':{cat:{music:1.35}}, '封面':{cat:{music:1.16,design:1.16}},
    '游戏':{cat:{digital:1.20,media:1.14}}, '界面':{cat:{digital:1.30}}, '网页':{cat:{digital:1.24}}, '数字':{cat:{digital:1.30}},
    '婚礼':{mood:{'浪漫':1},cat:{fashion:1.14,lifestyle:1.08}}, '约会':{mood:{'浪漫':1,'温柔':1}},
    '通勤':{mood:{'干净':1,'极简':1},cat:{fashion:1.24}}, '旅行':{mood:{'自然':1},cat:{lifestyle:1.18}},
    '国风':{fam:{china:1.40}}, '中国':{fam:{china:1.30}}, '东方':{fam:{china:1.30}},
    '日系':{fam:{kawaii:1.26,fresh:1.14}}, '和风':{fam:{kawaii:1.22}},
    '复古':{fam:{retro:1.24,wave:1.14}}, '怀旧':{fam:{retro:1.24}},
    '二次元':{fam:{kawaii:1.28}}, '动漫':{fam:{kawaii:1.24,digital:1.10}}
  };
  var HUE = [
    { k:['玫红','酒红','猩红','砖红','朱红','红'], h:[340,18],  sat:52, name:'红' },
    { k:['橙','橘','琥珀','焦糖'],                    h:[18,45],  sat:50, name:'橙' },
    { k:['金黄','黄','香槟'],                         h:[45,70],  sat:45, name:'黄' },
    { k:['橄榄','薄荷','青绿','绿'],                   h:[70,170], sat:42, name:'绿' },
    { k:['湖蓝','青','蓝绿'],                         h:[170,200],sat:45, name:'青' },
    { k:['宝蓝','藏青','靛','天蓝','蓝'],              h:[200,255],sat:45, name:'蓝' },
    { k:['罗兰','薰衣草','葡萄','紫'],                h:[255,292],sat:45, name:'紫' },
    { k:['樱','桃','玫瑰','粉'],                      h:[292,350],sat:45, name:'粉' },
    { k:['黑色','玄','墨','黑'],                       dark:1, name:'黑' },
    { k:['奶油','米白','素','雪','白'],                light:1, name:'白' },
    { k:['银','灰调','灰'],                           gray:1, name:'灰' },
    { k:['大地','土','棕','褐','驼','卡其'],           h:[20,50], sat:28, name:'棕' }
  ];

  /* ---------- 3. 语料索引 + IDF ---------- */
  var DOC = AES.map(function(a){
    var terms = [];
    function push(v){ if(v) terms = terms.concat(Array.isArray(v)?v:[v]); }
    push(a.name_cn); push(a.name_en); push(a.definition); push(a.elements);
    push(a.materials); push(a.iconography); push(a.related_terms); push(a.applications);
    push((FAM[a.family]||{}).name); push((CAT[a.category]||{}).name); push((a.parent?'子风格':''));
    var lowTerms = terms.map(function(x){ return String(x).toLowerCase(); });
    return { a:a, terms:terms, lowTerms:lowTerms, hay:lowTerms.join(' ') };
  });
  var DF = {};
  DOC.forEach(function(d){
    var seen = {};
    d.terms.forEach(function(t){
      var s = String(t).toLowerCase();
      if(s.length < 2 || seen[s]) return;
      seen[s] = 1; DF[s] = (DF[s]||0)+1;
    });
  });
  var N = DOC.length;
  var IDF_MAX = Math.log(1 + N);

  /* 子串索引：substrDF[s] = 存在「比 s 更长且包含 s」的词条的文档数。
     一次性构建，之后模糊匹配查表 O(1)，避免每次查询都遍历 204 篇文档。 */
  var substrDF = null;
  function buildSubstrIndex(){
    substrDF = Object.create(null);
    for(var di = 0; di < DOC.length; di++){
      var lt = DOC[di].lowTerms, seen = Object.create(null);
      for(var ti = 0; ti < lt.length; ti++){
        var t = lt[ti];
        if(t.length < 4) continue;                 // 需要比查询词更长 => 词条至少 4 字
        for(var len = 3; len < t.length; len++){
          for(var st = 0; st + len <= t.length; st++){
            var sub = t.slice(st, st + len);
            if(!seen[sub]){ seen[sub] = 1; substrDF[sub] = (substrDF[sub]||0) + 1; }
          }
        }
      }
    }
  }
  function substrDocFreq(term){
    if(!substrDF) buildSubstrIndex();
    return substrDF[term] || 0;
  }
  function idf(t){ return Math.log(1 + N / (1 + (DF[String(t).toLowerCase()]||0))); }

  /* ---------- 4. 颜色工具 ---------- */
  function hex2hsl(hex){
    hex = String(hex||'').replace('#','');
    if(hex.length===3) hex = hex.split('').map(function(c){return c+c;}).join('');
    if(hex.length!==6) return null;
    var r=parseInt(hex.slice(0,2),16)/255, g=parseInt(hex.slice(2,4),16)/255, b=parseInt(hex.slice(4,6),16)/255;
    var mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, h=0, s=0;
    if(mx!==mn){ var d=mx-mn; s = l>.5 ? d/(2-mx-mn) : d/(mx+mn);
      if(mx===r) h=((g-b)/d+(g<b?6:0)); else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; }
    return {h:h,s:s*100,l:l*100};
  }
  function hueIn(h,r){ return r[0]<=r[1] ? (h>=r[0]&&h<=r[1]) : (h>=r[0]||h<=r[1]); }

  /* ---------- 5. 解析 ---------- */
  var STOP = ['的','了','想','要','一个','一种','帮我','给我','推荐','风格','感觉','一点','比较','有点','很','挺','喜欢','想要','这','那','我','你','是','和','跟','或者','还是','但','不','太','有','没','怎么','什么','吗','呢','吧','啊','就','都','会','能','可以','请','说','看看','组','个','套','些','让','做','拍','点','感','种'];
  function uniq(a){ return a.filter(function(v,i){ return a.indexOf(v)===i; }); }

  function parse(text){
    var low = String(text||'').toLowerCase();
    var tags = [], mood = {}, fam = {}, cat = {}, colors = [];
    var corpusTerms = {};   // term -> weight（来自原词或同义桥接）

    // 5.1 情绪 / 场景 / 颜色 词典命中
    Object.keys(MOOD).forEach(function(k){
      if(low.indexOf(k) > -1){
        tags.push(k);
        var m = MOOD[k];
        Object.keys(m).forEach(function(d){ mood[d] = Math.max(mood[d]||0, m[d]); });
      }
    });
    Object.keys(SCENE).forEach(function(k){
      if(low.indexOf(k) > -1){
        var s = SCENE[k];
        if(s.fam) Object.keys(s.fam).forEach(function(f){ fam[f]=Math.max(fam[f]||0,s.fam[f]); });
        if(s.cat) Object.keys(s.cat).forEach(function(c){ cat[c]=Math.max(cat[c]||0,s.cat[c]); });
        if(s.mood) Object.keys(s.mood).forEach(function(mm){
          var src = MOOD[mm]||{}; Object.keys(src).forEach(function(d){ mood[d]=Math.max(mood[d]||0,src[d]); });
        });
        tags.push(k);
      }
    });
    HUE.forEach(function(rule){
      var bw = 0, bwName = '';
      rule.k.forEach(function(w){
        if(low.indexOf(w) === -1) return;
        var weight = w.length >= 2 ? 1 : 0.25;      // 单字（黑/白/灰/素…）极易误匹配
        if(weight > bw){ bw = weight; bwName = w; }
      });
      if(bw > 0){ colors.push({ rule:rule, weight:bw }); tags.push(bwName); }
    });

    // 5.2 同义桥接：口语词 → 语料词
    Object.keys(SYN).forEach(function(k){
      if(low.indexOf(k) > -1){
        tags.push(k);
        SYN[k].forEach(function(t){ corpusTerms[t.toLowerCase()] = Math.max(corpusTerms[t.toLowerCase()]||0, 0.6); });
      }
    });

    // 5.3 原词直取：中文 2~4 字 n-gram（长词优先），英文整词
    (low.match(/[a-z][a-z0-9\-]{1,}/g)||[]).forEach(function(w){ corpusTerms[w] = Math.max(corpusTerms[w]||0, 1); });
    low.replace(/[^\u4e00-\u9fa5]/g,' ').split(/\s+/).filter(Boolean).forEach(function(seg){
      for(var n=Math.min(4,seg.length); n>=2; n--){
        for(var i=0;i+n<=seg.length;i++){
          var w = seg.slice(i,i+n);
          if(STOP.indexOf(w) > -1) continue;
          if(DF[w] === undefined) continue;          // 库里没有这个词，直接丢弃（关键降噪）
          corpusTerms[w] = Math.max(corpusTerms[w]||0, n >= 4 ? 1.35 : (n === 3 ? 1.15 : 0.7));
        }
      }
    });

    return { raw:text, tags:uniq(tags), mood:mood, fam:fam, cat:cat, colors:colors, terms:corpusTerms };
  }

  /* ---------- 6. 打分 ---------- */
  function scoreDoc(d, intent){
    var a = d.a, why = [], s = 0;
    var matched = [];

    // 6.1 关键词命中：IDF × 词长加成 × 桥接权重
    var kw = 0, totalW = 0, matchedW = 0;
    Object.keys(intent.terms).forEach(function(t){
      if(t.length < 2) return;
      var dfr = (DF[t]||0) / N;                     // 文档频率占比
      var generic = dfr > 0.25 ? 0.35 : (dfr > 0.12 ? 0.65 : 1);   // 泛词降权
      var w = idf(t) * (1 + Math.min(t.length-2,3)*0.30) * intent.terms[t] * generic;
      totalW += w;
      if(d.hay.indexOf(String(t).toLowerCase()) === -1) return;
      matched.push({ t:t, w:w });
      kw += w; matchedW += w;
    });
    // 6.1b 模糊反向匹配：查询词被更长的语料词包含时也算部分命中（「电影」↔「电影院」）。
    //       只对 >=3 字的词启用，短词易误匹配（如「海报」会被「海」命中）。
    var fuzzyW = 0;
    Object.keys(intent.terms).forEach(function(t){
      if(t.length < 3) return;
      var hitExact = false;
      for(var mi2 = 0; mi2 < matched.length; mi2++){ if(matched[mi2].t === t){ hitExact = true; break; } }
      if(hitExact) return;
      var docs = substrDocFreq(t);
      if(!docs) return;
      var idfF = Math.log(1 + N / (1 + docs));
      var dfrF = docs / N;
      var genericF = dfrF > 0.25 ? 0.35 : (dfrF > 0.12 ? 0.65 : 1);
      var wF = idfF * (1 + Math.min(t.length-2,3)*0.30) * intent.terms[t] * genericF * 0.55;
      fuzzyW += wF;
      matched.push({ t:t + '(模糊)', w:wF });
    });

    matched.sort(function(x,y){ return y.w-x.w; });
    if(matched.length){
      // 关键：按「查询词加权覆盖率」而非「匹配到的最强词」计分。
      // 否则查询中最具区分度的词（如「九十年代」）没被命中也不受惩罚。
      var coverage = totalW > 0 ? (matchedW + fuzzyW) / totalW : 0;
      var strength = Math.min((kw + fuzzyW) / (IDF_MAX*1.45), 1);
      s += (coverage * 0.72 + strength * 0.28) * 42;
      why.push('命中「' + matched.slice(0,3).map(function(o){return o.t;}).join('」「') + '」'
               + (coverage < 0.6 ? '（覆盖'+Math.round(coverage*100)+'%）' : ''));
    }

    // 6.2 情绪 → 雷达贴合
    var mk = Object.keys(intent.mood);
    if(mk.length){
      var radar = a.radar_scores||{}, diff=0, n=0;
      mk.forEach(function(k){ if(typeof radar[k]==='number'){ diff += Math.abs(radar[k]-intent.mood[k]); n++; } });
      if(n){ var fit = 1-(diff/n)/100; s += Math.max(fit,0)*26; why.push('情绪贴合 '+Math.round(fit*100)+'%'); }
    }

    // 6.3 颜色命中：按「色板中命中该色相的比例 × 单色强度」计分。
    //     旧逻辑只要有一个色命中就给满分，导致几乎所有风格都能靠「白/粉/黑」拿分，排序被冲平。
    if(intent.colors.length){
      var cols = (a.colors||[]).map(hex2hsl).filter(Boolean);
      if(cols.length){
        var best = 0, bestName = '';
        intent.colors.forEach(function(cw){
          var rule = cw.rule, sum = 0;
          cols.forEach(function(c){
            var sc = 0;
            if(rule.dark  && c.l < 24) sc = 1;
            if(rule.light && c.l > 80) sc = 1;
            if(rule.gray  && c.s < 12) sc = 1;
            if(rule.h){
              var hf = hueIn(c.h, rule.h) ? 1 : 0;
              if(!hf){ var d1=Math.min(Math.abs(c.h-rule.h[0]),360-Math.abs(c.h-rule.h[0]));
                       var d2=Math.min(Math.abs(c.h-rule.h[1]),360-Math.abs(c.h-rule.h[1]));
                       var dd=Math.min(d1,d2); hf = dd<30 ? (1-dd/30)*0.5 : 0; }
              // 色相词要求真实饱和度，单字弱色相再折半
              var sf = rule.sat ? Math.min(1, Math.max(0,(c.s - 8)) / rule.sat) : 1;
              sc = hf * sf;
              if(cw.weight < 1) sc *= 0.6;
            }
            sum += sc;
          });
          var frac = sum / cols.length;          // 色板占比：主色真的对才算
          if(frac > best){ best = frac; bestName = rule.name; }
        });
        if(best > 0.12){
          s += Math.min(best, 1) * 11;
          why.push('配色接近'+bestName+'（色板占比'+Math.round(best*100)+'%）');
        }
      }
    }

    // 6.4 家族 / 分类倾向（乘性）
    if(intent.fam[a.family]){ s *= 1.10; why.push((FAM[a.family]||{}).name+'倾向'); }
    if(intent.cat[a.category]){ s *= 1.07; why.push((CAT[a.category]||{}).name+'领域'); }

    // 6.4b 名称直呼：查询词命中风格名（中/英）时给强力加成
    var nmBonus = 0, nmHit = '';
    Object.keys(intent.terms).forEach(function(t){
      if(t.length < 2) return;
      var cn = String(a.name_cn||'').toLowerCase(), en = String(a.name_en||'').toLowerCase();
      if(cn.indexOf(t) > -1 || cn === t){ if(intent.terms[t] > nmBonus){ nmBonus = intent.terms[t]; nmHit = a.name_cn; } }
      else if(en.indexOf(t) > -1){ if(intent.terms[t]*0.9 > nmBonus){ nmBonus = intent.terms[t]*0.9; nmHit = a.name_en; } }
    });
    if(nmBonus > 0){
      s += Math.min(nmBonus, 1.4) * 26;
      why.push('名称直呼「' + nmHit + '」');
    }

    // 6.5 无任何有效信号时得 0 分（否则「你好」也会命中原型全库）
    if(kw === 0 && mk.length === 0 && intent.colors.length === 0) return { a:a, score:0, why:[], matched:[] };

    // 6.6 可复现的微小扰动
    s += (a.id.length % 7) * 0.08;
    return { a:a, score:Math.round(s*10)/10, why:why, matched:matched.slice(0,4).map(function(o){return o.t;}) };
  }

  var _lastAll = [];
  function retrieve(text, k){
    var intent = parse(text);
    var ranked = DOC.map(function(d){ return scoreDoc(d,intent); })
                    .filter(function(r){ return r.score > 0.05; })
                    .sort(function(x,y){ return y.score - x.score || (x.a.id < y.a.id ? -1 : 1); });
    _lastAll = ranked;
    return { intent:intent, list:ranked.slice(0, k||6), all:ranked };
  }

  /* ---------- 7. 搭配 ---------- */
  function relOf(a,id){ return (a.related||[]).filter(function(x){ return x.id===id; })[0] || null; }
  function pairBetween(a,b){
    var r = relOf(a,b.id) || relOf(b,a.id);
    if(r) return { score:r.score, reason:r.reason, real:true };
    var sameFam = a.family===b.family, sameCat = a.category===b.category;
    var sc = sameFam ? 62 : 46; if(sameCat) sc += 6;
    return { score:sc, real:false, reason: sameFam
      ? '同属'+(FAM[a.family]||{}).name+'，气质同源，叠在一起不打架。'
      : '分属'+(FAM[a.family]||{}).name+'与'+(FAM[b.family]||{}).name+'，跨家族互补，对比更利落。' };
  }

  /* ---------- 8. 话术 ---------- */
  var OPEN = {
    scene:['按你说的场景，我筛出这几条：','这个场合有得配，方向很清楚：'],
    mood:['这个气质挺具体的，好办：','按这个感觉挑，最贴的是这几条：'],
    color:['从配色切入最直接：','颜色是个好抓手，这几条最接近：'],
    vague:['信息不多，我先给几个方向，你挑一个我再细化：','说的有点笼统，先看这几条：']
  };
  function pick(a,seed){ return a[Math.abs(seed)%a.length]; }

  function renderMatch(r){
    var a = r.a, fam = FAM[a.family]||{}, cat = CAT[a.category]||{};
    var L = [];
    L.push(a.name_cn + '（' + a.name_en + '）');
    L.push('· ' + (a.definition||''));
    var pts = [];
    if(a.elements&&a.elements.length) pts.push('元素：'+a.elements.slice(0,3).join('、'));
    if(a.materials&&a.materials.length) pts.push('材质：'+a.materials.slice(0,3).join('、'));
    if(pts.length) L.push('· ' + pts.join('｜'));
    L.push('· 归属：'+(fam.name||'')+' · '+(cat.name||'')+(a.year?' · '+a.year:''));
    if(r.why.length) L.push('· 匹配点：'+r.why.join('；'));
    return L.join('\n');
  }
  function renderCombo(a,b,pr){
    var L = [];
    L.push('【主打】'+a.name_cn+'　+　【呼应】'+b.name_cn+'　契合度 '+pr.score);
    L.push(pr.reason);
    var act = [];
    if(a.applications&&a.applications.length) act.push('· '+a.name_cn+' → '+a.applications[0]);
    if(b.applications&&b.applications.length) act.push('· '+b.name_cn+' → '+b.applications[0]);
    if(a.colors&&a.colors.length&&b.colors&&b.colors.length)
      act.push('· 配色：以 '+a.colors[0].toUpperCase()+' 打底，用 '+b.colors[0].toUpperCase()+' 点睛。');
    if(act.length) L.push(act.join('\n'));
    return L.join('\n');
  }

  function answer(text){
    var res = retrieve(text, 6), intent = res.intent, list = res.list;
    var seed = String(text||'').length;
    var L = [];
    if(!list.length){
      L.push('这条我库里暂时没有能对上的。');
      L.push('我的知识范围就是棂感库里的 '+AES.length+' 种风格。换个说法通常就通了——加一个场合（街拍／家居／海报）、一种情绪（清冷／治愈／硬核）、或者一个颜色、一种材质。');
      return { reply:L.join('\n\n'), plan:{intent:intent, list:[], all:_lastAll.slice(0,5)} };
    }
    var kind = intent.colors.length ? 'color' : (Object.keys(intent.mood).length ? 'mood' : (intent.tags.length ? 'scene' : 'vague'));
    L.push(pick(OPEN[kind], seed));
    var top = list.slice(0,3);
    L.push(top.map(function(r,i){ return (i+1)+'. '+renderMatch(r); }).join('\n\n'));
    if(top.length >= 2){
      var bp=null;
      for(var i=1;i<top.length;i++){ var pr=pairBetween(top[0].a,top[i].a); if(!bp||pr.score>bp.pr.score) bp={b:top[i].a,pr:pr}; }
      L.push('可直接用的组合：\n\n'+renderCombo(top[0].a,bp.b,bp.pr));
    }
    L.push('想更准，补一个信息就行：场合（去哪、干什么）、情绪（想要什么感觉）、或一个颜色／材质。也可以让我直接把配色和生图提示词拼出来。');
    return { reply:L.join('\n\n'), plan:{ intent:intent, list:list.map(function(r){
      return { id:r.a.id, name:r.a.name_cn, score:r.score, why:r.why, matched:r.matched };
    }) } };
  }

  return { answer:answer, retrieve:retrieve, parse:parse, _aes:AES, _doc:DOC.length, _all:function(){return _lastAll;}, _fam:FAM, _cat:CAT };
})();
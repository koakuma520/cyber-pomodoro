// 灵感库 — 婚礼案例馆
var galleryPage = {
  cases: [
    { id: 'c1', title: '星空主题婚礼', icon: '🌟', tag: '森系唯美',
      desc: '深蓝星空主题搭配银色喜糖盒，甜品台采用星空棒棒糖和水晶糖果，整场婚礼梦幻如银河。喜糖定制为星座主题，每颗糖都是独一无二的星球。',
      color: 'linear-gradient(135deg, #1a1a3e, #2d2d6b, #4a4a8a)' },
    { id: 'c2', title: '故宫红金婚礼', icon: '🏮', tag: '中式典雅',
      desc: '传统红金配色，龙凤呈祥铁盒喜糖，搭配中式桌花和灯笼装饰。迎宾区定制烫金喜糖袋，每个细节都洋溢着东方韵味。',
      color: 'linear-gradient(135deg, #8b1a1a, #c41e3a, #d4a853)' },
    { id: 'c3', title: '花园森系婚礼', icon: '🌿', tag: '森系清新',
      desc: '户外花园婚礼，森系伴手礼套装（糖果+蜂蜜+干花香包），桌花采用白绿色系自然风格，甜品台用木质托盘和鲜花点缀。',
      color: 'linear-gradient(135deg, #4a7c59, #6db893, #a8d5ba)' },
    { id: 'c4', title: '蒂芙尼蓝婚礼', icon: '💎', tag: '轻奢优雅',
      desc: '全场蒂芙尼蓝配色，搭配白色玫瑰和香槟金细节。喜糖采用同色系礼盒，内置定制巧克力和水晶糖，清新高级感十足。',
      color: 'linear-gradient(135deg, #5fb0a8, #7ec8c0, #a8ddd7)' },
    { id: 'c5', title: '粉色梦境婚礼', icon: '🌸', tag: '浪漫少女',
      desc: '全粉色系婚礼，法式玫瑰喜糖礼盒搭配粉色丝绒糖袋。甜品台用三层粉白蛋糕，背景纱幔用粉色+LED灯串，唯美到窒息。',
      color: 'linear-gradient(135deg, #f5b8bb, #e8878a, #fef0f1)' },
    { id: 'c6', title: '香槟金轻奢婚礼', icon: '🥂', tag: '高级质感',
      desc: '全场香槟金主色调，皮质伴手礼盒、金属框迎宾牌、香槟色桌花装饰，每一处都透着低调的奢华感。喜糖为金色包装手工巧克力。',
      color: 'linear-gradient(135deg, #e8d5a3, #c9a65e, #a8893c)' }
  ],

  selectedCase: null,

  async render() {
    P.currentPage = 'gallery';
    updateHeader();
    renderBottomNav();

    if (this.selectedCase) {
      this.renderDetail();
    } else {
      this.renderList();
    }
    this.bindEvents();
  },

  renderList() {
    var content = document.getElementById('content');

    var html = '';

    // Banner
    html += '<div class="banner" style="background:linear-gradient(135deg,#f5b8bb,#e8878a,#7ec8c0);">';
    html += '<div style="text-align:center;">';
    html += '<div style="font-size:2rem;margin-bottom:4px;">📸</div>';
    html += '<div style="font-size:1rem;">真实婚礼案例馆</div>';
    html += '<div style="font-size:0.7rem;font-weight:400;opacity:0.85;">每一场婚礼，都是独一无二的甜蜜故事</div>';
    html += '</div>';
    html += '</div>';

    // 分类标签
    html += '<div class="category-tabs">';
    html += '<div class="cat-tab active" data-filter="all">全部案例</div>';
    html += '<div class="cat-tab" data-filter="森系唯美">🌿 森系</div>';
    html += '<div class="cat-tab" data-filter="中式典雅">🏮 中式</div>';
    html += '<div class="cat-tab" data-filter="轻奢优雅">💎 轻奢</div>';
    html += '<div class="cat-tab" data-filter="浪漫少女">🌸 浪漫</div>';
    html += '</div>';

    // 案例网格
    html += '<div class="case-grid" id="caseGrid">';
    this.cases.forEach(function (c) {
      html += '<div class="case-card" data-id="' + c.id + '" data-tag="' + c.tag + '">';
      html += '<div class="case-card-img" style="background:' + c.color + ';">' + c.icon + '</div>';
      html += '<div class="case-card-body">';
      html += '<div class="case-card-title">' + escHtml(c.title) + '</div>';
      html += '<div class="case-card-desc">' + escHtml(c.desc.substring(0, 50)) + '...</div>';
      html += '<span class="case-card-tag">' + escHtml(c.tag) + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    content.innerHTML = html;
  },

  renderDetail() {
    var c = this.selectedCase;
    var content = document.getElementById('content');

    var html = '';

    // 返回按钮
    html += '<div style="margin-bottom:12px;">';
    html += '<button class="btn btn-secondary btn-sm" id="btnBack">← 返回案例列表</button>';
    html += '</div>';

    // 案例大图
    html += '<div class="case-detail-img" style="background:' + c.color + ';font-size:6rem;">' + c.icon + '</div>';

    // 案例信息
    html += '<div class="card"><div class="card-body">';
    html += '<h2 style="font-size:1.1rem;margin-bottom:4px;">' + escHtml(c.title) + '</h2>';
    html += '<span class="case-card-tag" style="margin-bottom:12px;">' + escHtml(c.tag) + '</span>';
    html += '<p style="font-size:0.9rem;color:var(--text-secondary);line-height:1.8;">' + escHtml(c.desc) + '</p>';
    html += '</div></div>';

    // 关联产品推荐
    html += '<div class="card"><div class="card-header"><span class="card-title">🎁 本案同款好物</span></div>';
    html += '<div class="card-body">';
    html += '<div style="display:flex;gap:10px;overflow-x:auto;">';
    html += '<div onclick="window.location.hash=\'#/home\'" style="flex-shrink:0;width:140px;text-align:center;cursor:pointer;">';
    html += '<div style="width:100%;aspect-ratio:1;background:var(--accent-light);border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;font-size:2rem;">🍬</div>';
    html += '<div style="font-size:0.75rem;margin-top:4px;">喜糖定制</div>';
    html += '</div>';
    html += '<div onclick="window.location.hash=\'#/home\'" style="flex-shrink:0;width:140px;text-align:center;cursor:pointer;">';
    html += '<div style="width:100%;aspect-ratio:1;background:var(--gold-light);border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;font-size:2rem;">🎀</div>';
    html += '<div style="font-size:0.75rem;margin-top:4px;">伴手礼盒</div>';
    html += '</div>';
    html += '<div onclick="window.location.hash=\'#/consult\'" style="flex-shrink:0;width:140px;text-align:center;cursor:pointer;">';
    html += '<div style="width:100%;aspect-ratio:1;background:var(--tiffany-light);border-radius:var(--radius-xs);display:flex;align-items:center;justify-content:center;font-size:2rem;">💒</div>';
    html += '<div style="font-size:0.75rem;margin-top:4px;">咨询同款</div>';
    html += '</div>';
    html += '</div>';
    html += '</div></div>';

    // 底部咨询入口
    html += '<div style="text-align:center;padding:20px;">';
    html += '<p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:10px;">💡 喜欢这场婚礼风格？</p>';
    html += '<a href="#/consult" class="btn btn-primary">💒 立即咨询 · 获取报价</a>';
    html += '</div>';

    content.innerHTML = html;
  },

  bindEvents() {
    var self = this;

    // 分类筛选
    document.querySelectorAll('.cat-tab[data-filter]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        document.querySelectorAll('.cat-tab[data-filter]').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var filter = tab.getAttribute('data-filter');

        document.querySelectorAll('.case-card').forEach(function (card) {
          if (filter === 'all' || card.getAttribute('data-tag') === filter) {
            card.style.display = '';
          } else {
            card.style.display = 'none';
          }
        });
      });
    });

    // 案例点击
    document.querySelectorAll('.case-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-id');
        var found = self.cases.find(function (c) { return c.id === id; });
        if (found) {
          self.selectedCase = found;
          self.render();
        }
      });
    });

    // 返回
    var btnBack = document.getElementById('btnBack');
    if (btnBack) {
      btnBack.addEventListener('click', function () {
        self.selectedCase = null;
        self.render();
      });
    }
  }
};

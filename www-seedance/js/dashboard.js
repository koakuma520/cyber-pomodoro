// Seedance Studio Pro — 首页仪表盘
var _dashboardLoaded = false;

async function initDashboard() {
  renderDashboardSkeleton();
  if (!AUTH.token) {
    renderDashboardGuest();
    return;
  }
  try {
    var data = await apiGet('/api/dashboard');
    renderDashboardStats(data.stats);
    renderDashboardRecent(data.recentWorks);
    renderDashboardActions(data.quickActions);
    _dashboardLoaded = true;
  } catch (e) {
    renderDashboardGuest();
  }
}

function refreshDashboard() {
  _dashboardLoaded = false;
  initDashboard();
}

function renderDashboardSkeleton() {
  var panel = document.getElementById('tab-dashboard');
  if (!panel) return;
  panel.innerHTML =
    '<div class="dashboard-hero">'
    + '<div class="dash-hero-left">'
    + '<h1 class="dash-hero-title">AI 视频创作工作台</h1>'
    + '<p class="dash-hero-desc">将商品转化为营销视频，支持多模型路由，电商模板一键生成</p>'
    + '</div>'
    + '<div class="dash-hero-right" id="dashHeroActions"></div>'
    + '</div>'
    + '<div class="dash-stats-grid" id="dashStatsGrid"></div>'
    + '<div class="dash-section" id="dashSection">'
    + '<div class="dash-section-header"><h2>📜 最近作品</h2><button class="btn btn-xs btn-link" onclick="switchTab(\'works\')">查看全部 →</button></div>'
    + '<div class="dash-recent-grid" id="dashRecentGrid"></div>'
    + '</div>';
}

function renderDashboardGuest() {
  // 落地页 — 展示产品价值主张
  var hero = document.querySelector('.dashboard-hero');
  if (hero) {
    hero.innerHTML =
      '<div class="dash-hero-left">'
      + '<h1 class="dash-hero-title">AI 电商短视频批量生成平台</h1>'
      + '<p class="dash-hero-desc">把商品链接变成可直接投放的营销视频，支持淘宝/1688/京东/Shopify，1人管100个账号的内容产能</p>'
      + '<div style="margin-top:12px;display:flex;gap:8px;">'
      + '<button class="btn btn-primary" onclick="showAuthModal(\'register\')" style="background:#fff;color:var(--accent);">🚀 免费注册 · 送5积分</button>'
      + '<button class="btn btn-secondary" onclick="showAuthModal(\'login\')" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.25);">登录</button>'
      + '</div></div>'
      + '<div class="dash-hero-right"></div>';
  }
  var stats = document.getElementById('dashStatsGrid');
  if (stats) {
    stats.innerHTML =
      '<div class="landing-features">'
      + '<div class="landing-feature-card"><span class="lfc-icon">🔗</span><h3>商品链接转视频</h3><p>粘贴淘宝/1688/京东/Shopify链接，自动提取商品信息，AI生成营销脚本</p></div>'
      + '<div class="landing-feature-card"><span class="lfc-icon">🤖</span><h3>多模型路由</h3><p>集成了可灵Kling、通义万相、Atlas Cloud，智能故障转移，确保生成成功</p></div>'
      + '<div class="landing-feature-card"><span class="lfc-icon">📦</span><h3>25+电商模板</h3><p>覆盖服装、美妆、食品、3C数码、家居、母婴等行业，一键套用专业营销文案</p></div>'
      + '<div class="landing-feature-card"><span class="lfc-icon">📤</span><h3>多平台适配</h3><p>自动生成9:16(抖音)/16:9(YouTube)/1:1(淘宝)/3:4(小红书)多尺寸版本</p></div>'
      + '<div class="landing-feature-card"><span class="lfc-icon">⭐</span><h3>积分制付费</h3><p>免费版每月5积分，个人版199元/80积分，专业版599元/300积分，用多少扣多少</p></div>'
      + '<div class="landing-feature-card"><span class="lfc-icon">🎭</span><h3>短剧工作台</h3><p>多场景批量生成，角色库+场景库，适合剧情类营销内容创作</p></div>'
      + '</div>';
  }
  var recent = document.getElementById('dashRecentGrid');
  if (recent) {
    recent.innerHTML =
      '<div style="text-align:center;padding:40px 16px;color:var(--text-secondary);">'
      + '<div style="font-size:36px;margin-bottom:8px;">🎬</div>'
      + '<p style="font-size:14px;margin-bottom:12px;">注册即送 5 积分，免费体验 AI 视频生成</p>'
      + '<button class="btn btn-primary" onclick="showAuthModal(\'register\')">免费注册，开始创作</button></div>';
  }
  var actions = document.getElementById('dashHeroActions');
  if (actions) { actions.innerHTML = ''; }
  document.getElementById('dashSection') && (document.getElementById('dashSection').style.display = 'none');
}

function renderDashboardStats(stats) {
  var grid = document.getElementById('dashStatsGrid');
  if (!grid) return;
  var cards = [
    { icon: '📹', value: stats.thisMonthGenerations + '<span class="stat-unit">/' + stats.quotaLimit + '</span>', label: '本月生成', color: '#7c6ff8' },
    { icon: '⭐', value: stats.balance, label: '账户积分', color: '#f59e0b' },
    { icon: '📊', value: stats.successRate + '<span class="stat-unit">%</span>', label: '成功率', color: '#34d399' },
    { icon: '💎', value: stats.plan, label: '当前套餐', color: '#60a5fa' }
  ];
  var html = '';
  for (var i = 0; i < cards.length; i++) {
    var c = cards[i];
    html += '<div class="stat-card">'
      + '<div class="stat-icon" style="background:' + c.color + '20;color:' + c.color + ';">' + c.icon + '</div>'
      + '<div class="stat-body"><div class="stat-value">' + c.value + '</div><div class="stat-label">' + c.label + '</div></div>'
      + '</div>';
  }
  grid.innerHTML = html;
}

function renderDashboardRecent(works) {
  var grid = document.getElementById('dashRecentGrid');
  if (!grid) return;
  if (!works || works.length === 0) {
    grid.innerHTML = '<div class="dash-empty"><div class="empty-icon">📭</div><p>暂无生成记录，去创建你的第一条视频吧</p></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < works.length; i++) {
    var w = works[i];
    var dateStr = w.createdAt ? new Date(w.createdAt).toLocaleDateString('zh-CN') : '';
    html += '<div class="dash-work-card"' + (w.videoUrl ? ' onclick="switchTab(\'generate\');setTimeout(function(){var v=document.getElementById(\'resultVideo\');if(v){v.src=\'' + escHtml(w.videoUrl) + '\';v.play();}},300)"' : '') + '>'
      + (w.videoUrl
        ? '<video src="' + escHtml(w.videoUrl) + '" muted preload="metadata" playsinline></video>'
        : '<div class="dash-work-placeholder">🎬</div>')
      + '<div class="dash-work-info"><div class="dash-work-prompt">' + escHtml((w.prompt || '').substring(0, 50) + ((w.prompt || '').length > 50 ? '...' : '')) + '</div>'
      + '<div class="dash-work-meta">' + dateStr + ' · ' + (w.cost || 0) + '分</div></div></div>';
  }
  grid.innerHTML = html;
}

function renderDashboardActions(actions) {
  var el = document.getElementById('dashHeroActions');
  if (!el || !actions) return;
  var html = '';
  for (var i = 0; i < actions.length; i++) {
    var a = actions[i];
    html += '<button class="dash-action-btn" onclick="' + (a.tab === 'recharge' ? 'rechargeModal()' : 'switchTab(\'' + a.tab + '\')') + '">'
      + '<span class="dash-action-icon">' + a.icon + '</span>'
      + '<span class="dash-action-label">' + a.label + '</span>'
      + '<span class="dash-action-desc">' + a.desc + '</span></button>';
  }
  el.innerHTML = html;
}

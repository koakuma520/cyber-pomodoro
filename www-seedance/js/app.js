// Seedance Studio Pro — 应用入口和初始化
var _appInited = false;
var _currentTab = 'dashboard';
var _imageModeActive = false;

function switchTab(tab) {
  _currentTab = tab;
  document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.toggle('active', t.getAttribute('data-tab') === tab); });
  document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var panel = document.getElementById('tab-' + tab);
  if (panel) panel.classList.add('active');

  if (tab === 'dashboard') {
    initDashboard();
  } else if (tab === 'datacenter') {
    initAnalytics();
  } else if (tab === 'assets') {
    initAssets();
  } else if (tab === 'drama') {
    S.mode = 'drama';
    if (typeof dramaInit === 'function') dramaInit();
  } else if (tab === 'templates') {
    renderTemplateFullGrid();
  } else if (tab === 'works') {
    loadHist();  // 刷新数据
    renderWorksFullPage();
  } else if (tab === 'generate') {
    // 恢复之前的选择模式
    var activeMode = document.querySelector('.mode-tab.active');
    S.mode = activeMode ? (activeMode.getAttribute('data-mode') || 'text') : 'text';
    document.getElementById('templateQuickBar').style.display = '';
    document.getElementById('genBtn').style.display = '';
    if (typeof updateCost === 'function') updateCost();
  }
}

function toggleSettings() {
  var el = document.getElementById('settingsModal');
  if (el) el.classList.toggle('open');
}

function closeSettings() {
  var el = document.getElementById('settingsModal');
  if (el) el.classList.remove('open');
}

function toggleImageMode() {
  _imageModeActive = document.getElementById('imageModeToggle').checked;
  document.getElementById('imageGroup').style.display = _imageModeActive ? 'block' : 'none';
  S.mode = _imageModeActive ? 'image' : 'text';
}

function renderTemplateFullGrid() {
  var grid = document.getElementById('templateFullGrid');
  if (!grid) return;
  var tpls = ECOM_TPL;
  var html = '';
  for (var i = 0; i < tpls.length; i++) {
    var t = tpls[i];
    html += '<div class="template-card" data-tpl-id="' + t.id + '" title="' + escHtml(t.tips || '') + '" onclick="useTemplate(\'' + t.id + '\')">'
      + '<span class="tpl-icon">' + (t.icon || '📦') + '</span>'
      + '<div class="tpl-name">' + escHtml(t.name) + '</div>'
      + '<div class="tpl-tip">' + escHtml(t.tips || t.industry || '') + '</div></div>';
  }
  grid.innerHTML = html;
}

function renderWorksFullPage() {
  var grid = document.getElementById('worksFullGrid');
  if (!grid) return;
  var html = '';
  for (var i = 0; i < ALL_HISTORY.length; i++) {
    var h = ALL_HISTORY[i];
    html += '<div class="work-card"><video src="' + (h.videoUrl || '') + '" muted preload="metadata" playsinline></video>'
      + '<div class="work-info"><div class="w-prompt">' + escHtml(h.prompt || '') + '</div>'
      + '<div class="w-meta">' + (h.createdAt ? new Date(h.createdAt).toLocaleString('zh-CN') : '') + ' · ' + (h.cost || 36) + '分</div></div>'
      + '<div class="work-actions"><button class="btn btn-xs" onclick="playHistVideo(\'' + escHtml(h.videoUrl || '') + '\');switchTab(\'generate\');">▶ 播放</button>'
      + '<button class="btn btn-xs" onclick="copyHistPrompt(\'' + escHtml(h.prompt || '') + '\')">📋 复制</button></div></div>';
  }
  if (!html) html = '<div style="text-align:center;padding:48px 24px;color:var(--text-secondary);"><div style="font-size:48px;margin-bottom:12px;">📭</div><p>暂无作品</p></div>';
  grid.innerHTML = html;
}

function filterWorksFull() {
  var q = (document.getElementById('worksSearchFull')?.value || '').toLowerCase();
  var grid = document.getElementById('worksFullGrid');
  if (!grid) return;
  var cards = grid.querySelectorAll('.work-card');
  for (var i = 0; i < cards.length; i++) {
    var prompt = (cards[i].querySelector('.w-prompt')?.textContent || '').toLowerCase();
    cards[i].style.display = !q || prompt.includes(q) ? '' : 'none';
  }
}

async function initApp() {
  if (_appInited) return;
  _appInited = true;

  var apiConf = {}; try { apiConf = JSON.parse(localStorage.getItem(SK.API_KEY) || '{}'); } catch (e) {}
  var k = apiConf.key || '';
  if (k) { S.key = k; var inp = document.getElementById('apiKeyInput'); if (inp) inp.value = k; setKeyStat(true); }
  else { setKeyStat(false); }

  loadHist(); loadTemplates(); loadQuota(); setStat('ready');
  setupTemplateDelegation();
  initDashboard();

  var pi = document.getElementById('promptInput');
  if (pi) {
    pi.addEventListener('input', function() { document.getElementById('charCount').textContent = this.value.length; });
    pi.addEventListener('keydown', function(e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generate(); } });
  }
  var f1 = document.getElementById('imgFile1'); if (f1) f1.addEventListener('change', function(e) { handleFile(e, 1); });
  var u1 = document.getElementById('imgUrl1'); if (u1) u1.addEventListener('input', function(e) { handleUrl(e, 1); });
  updateCost(); setupDragDrop();

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { closeWorksModal(); closeAdminPanel(); closeResultOverlay(); hidePaywall(); closeTemplateForm(); closeSettings(); hideAuthModal(); closePaymentModal(); closeRechargeModal(); closeOrdersModal(); }
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  // 微信 OAuth 回调 — URL 参数 token
  var urlParams = new URLSearchParams(window.location.search);
  var wxToken = urlParams.get('wx_token');
  if (wxToken) {
    AUTH.token = wxToken;
    localStorage.setItem(AUTH.tokenKey, wxToken);
    // 清理 URL 参数
    var newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
  await checkAuth();  // 静默检测登录状态，不拦截浏览
  initApp(); dramaInit();
});

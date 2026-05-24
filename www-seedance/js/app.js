// Seedance Studio Pro — 应用入口和初始化
var _appInited = false;

async function initApp() {
  if (_appInited) return;  // 防止重复初始化
  _appInited = true;

  var apiConf = {}; try { apiConf = JSON.parse(localStorage.getItem(SK.API_KEY) || '{}'); } catch (e) {}
  var k = apiConf.key || '';
  if (k) { S.key = k; document.getElementById('apiKeyInput').value = k; setKeyStat(true); }
  else { setKeyStat(false); }

  loadHist(); loadTemplates(); loadQuota(); setStat('ready');
  setupTemplateDelegation();

  var pi = document.getElementById('promptInput');
  if (pi) {
    pi.addEventListener('input', function() { document.getElementById('charCount').textContent = this.value.length; });
    pi.addEventListener('keydown', function(e) { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); generate(); } });
  }
  var f1 = document.getElementById('imgFile1'); if (f1) f1.addEventListener('change', function(e) { handleFile(e, 1); });
  var u1 = document.getElementById('imgUrl1'); if (u1) u1.addEventListener('input', function(e) { handleUrl(e, 1); });
  updateCost(); setupDragDrop();

  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeWorksModal(); closeAdminPanel(); closeResultOverlay(); hidePaywall(); } });
}

document.addEventListener('DOMContentLoaded', async function() {
  var authed = await checkAuth();
  if (!authed) { document.getElementById('authOverlay').classList.remove('hidden'); document.getElementById('headerRight').style.display = 'none'; }
  initApp(); dramaInit();
});

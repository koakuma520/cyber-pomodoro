// Seedance Studio Pro — UI 辅助
function toast(msg, type) {
  var c = document.getElementById('toastContainer'); if (!c) return;
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'info'); el.textContent = msg;
  c.appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}
function showErr(msg) {
  var box = document.getElementById('errorBox'); if (!box) return;
  box.innerHTML = friendlyErr(msg); box.classList.add('show');
  setTimeout(function() { box.classList.remove('show'); }, 30000);
}
function updateBalanceUI() {
  var el = document.getElementById('creditBalance'); if (el) el.textContent = AUTH.balance;
  var planEl = document.getElementById('planBadge'); if (planEl && AUTH.user) {
    var names = { free: '免费版', personal: '个人版', pro: '专业版', enterprise: '企业版' };
    planEl.textContent = names[AUTH.user.plan] || '免费版';
  }
  var uel = document.getElementById('quotaUsed');
  if (uel && quotaData) {
    uel.textContent = quotaData.used + '/' + quotaData.limit;
    var bar = document.getElementById('quotaBarFill');
    if (bar) { var pct = quotaData.limit > 0 ? (quotaData.used / quotaData.limit * 100) : 0; bar.style.width = Math.min(pct, 100) + '%'; bar.className = 'quota-bar-fill' + (pct >= 100 ? ' full' : pct >= 80 ? ' warn' : ''); }
    var upCard = document.getElementById('upgradeCard');
    if (upCard) upCard.style.display = quotaData.remaining <= 2 ? '' : 'none';
  }
}
async function loadQuota() {
  if (!AUTH.token) return;
  try { quotaData = await apiGet('/api/user/quota'); updateBalanceUI(); } catch (e) {}
}
function setStat(s) {
  var d = document.getElementById('statusDot'), t = document.getElementById('statusText');
  if (!d || !t) return;
  var m = { ready: ['online', '就绪'], generating: ['online', '生成中...'], 'no-key': ['offline', '未配置Key'] };
  var x = m[s] || ['offline', '就绪']; d.className = 'status-dot ' + x[0]; t.textContent = x[1];
}
function setKeyStat(on) {
  var e = document.getElementById('apiStatus'); if (!e) return;
  if (on) { e.className = 'api-status configured'; e.innerHTML = '<span>●</span> 已配置'; setStat('ready'); }
  else { e.className = 'api-status not-configured'; e.innerHTML = '<span>●</span> 未配置'; setStat('no-key'); }
}
function showPaywall() { var el = document.getElementById('paywallOverlay'); if (el) el.classList.remove('hidden'); }
function hidePaywall() { var el = document.getElementById('paywallOverlay'); if (el) el.classList.add('hidden'); }
function toggleKey() { var inp = document.getElementById('apiKeyInput'); if (inp) inp.type = inp.type === 'password' ? 'text' : 'password'; }
function toggleAdvanced() { var p = document.getElementById('advancedPanel'); if (p) { p.classList.toggle('open'); var a = document.getElementById('advArrow'); if (a) a.textContent = p.classList.contains('open') ? '▲' : '▼'; } }
function isAdmin() { return AUTH.user && AUTH.user.isAdmin === true; }

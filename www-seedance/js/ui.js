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
  box.innerHTML = '<span>' + friendlyErr(msg) + '</span> '
    + '<button onclick="generate()" style="background:var(--accent-soft);border:1px solid var(--accent);color:var(--accent);padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap;">🔄 重试</button>'
    + '<button onclick="this.parentElement.classList.remove(\'show\')" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;padding:0 4px;line-height:1;">✕</button>';
  box.classList.add('show');
}

function updateBalanceUI() {
  var el = document.getElementById('creditBalance'); if (el) el.textContent = AUTH.balance;
  if (quotaData) {
    var txt = document.getElementById('quotaMiniText');
    if (txt) txt.textContent = quotaData.used + '/' + quotaData.limit;
    var bar = document.getElementById('quotaMiniFill');
    if (bar) { var pct = quotaData.limit > 0 ? (quotaData.used / quotaData.limit * 100) : 0; bar.style.width = Math.min(pct, 100) + '%'; bar.className = 'quota-mini-fill' + (pct >= 100 ? ' full' : pct >= 80 ? ' warn' : ''); }
  }
}

async function loadQuota() {
  if (!AUTH.token) return;
  try { quotaData = await apiGet('/api/user/quota'); updateBalanceUI(); } catch (e) { /* 静默失败，额度显示保持上次值 */ }
}

function setStat(s) {
  var d = document.getElementById('statusDot'), t = document.getElementById('statusText');
  if (!d || !t) return;
  var m = { ready: ['online', '就绪'], generating: ['online', '生成中...'], 'no-key': ['offline', '未配置Key'] };
  var x = m[s] || ['offline', '就绪']; d.className = 'status-indicator ' + x[0]; t.textContent = x[1];
}

function setKeyStat(on) {
  var dot = document.getElementById('apiKeyStatusDot');
  var txt = document.getElementById('apiKeyStatusText');
  if (on) {
    if (dot) { dot.className = 'api-key-status-dot set'; }
    if (txt) { txt.className = 'status-text set'; txt.textContent = '已配置'; }
    setStat('ready');
  } else {
    if (dot) { dot.className = 'api-key-status-dot unset'; }
    if (txt) { txt.className = 'status-text unset'; txt.textContent = '未配置'; }
    setStat('no-key');
  }
}

function updateProviderBadge(provider) {
  var badge = document.getElementById('sidebarProviderBadge');
  if (!badge) return;
  var names = { atlas: 'Atlas', kling: '可灵', wanxiang: '万相', auto: '自动' };
  badge.textContent = names[provider] || 'Atlas';
  badge.style.background = provider === 'auto' ? 'var(--warning-soft)' : 'var(--accent-soft)';
  badge.style.color = provider === 'auto' ? '#fbbf24' : 'var(--accent)';
}

function showPaywall() { var el = document.getElementById('paywallOverlay'); if (el) el.classList.remove('hidden'); }
function hidePaywall() { var el = document.getElementById('paywallOverlay'); if (el) el.classList.add('hidden'); }
function toggleKey() { var inp = document.getElementById('apiKeyInput'); if (inp) inp.type = inp.type === 'password' ? 'text' : 'password'; }
function toggleAdvanced() { var p = document.getElementById('advancedPanel'); if (p) { p.classList.toggle('open'); var a = document.getElementById('advArrow'); if (a) a.style.transform = p.classList.contains('open') ? 'rotate(90deg)' : ''; } }
function isAdmin() { return AUTH.user && AUTH.user.isAdmin === true; }

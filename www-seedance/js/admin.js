// Seedance Studio Pro — 管理员面板
function toggleAdminPanel() {
  if (!isAdmin()) { toast('需要管理员权限', 'error'); return; }
  var p = document.getElementById('adminPanel');
  if (!p) return;
  if (p.classList.contains('open')) closeAdminPanel();
  else { renderAdminPanel(); p.classList.add('open'); }
}

function closeAdminPanel() { var p = document.getElementById('adminPanel'); if (p) p.classList.remove('open'); }

async function renderAdminPanel() {
  try {
    var apiConf = {}; try { apiConf = JSON.parse(localStorage.getItem(SK.API_KEY) || '{}'); } catch (e) {}
    document.getElementById('adminApiKey').value = apiConf.key || '';
    var data = await apiGet('/api/admin/users');
    var users = data.users || [];
    var userHtml = '';
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      userHtml += '<div class="admin-user-row">'
        + '<span class="admin-user-name">' + escHtml(u.username) + (u.isAdmin ? ' 🛡️' : '') + '</span>'
        + '<span class="admin-user-bal">⭐ ' + (u.balance || 0) + ' 分</span>'
        + '<span class="admin-user-bal">📦 ' + (u.plan || 'free') + '</span>'
        + '<div class="admin-user-actions"><button class="btn btn-xs" onclick="adjustBalance(\'' + u.id + '\',\'' + escHtml(u.username) + '\')">调整余额</button></div></div>';
    }
    document.getElementById('adminUserList').innerHTML = userHtml || '<p style="color:var(--text-secondary);">暂无用户</p>';
    try {
      var orders = await apiGet('/api/admin/orders');
      var orderHtml = '<div style="margin-bottom:8px;"><input type="text" placeholder="搜索订单号/用户名/交易号..." oninput="filterAdminOrders(this.value)" style="font-size:12px;padding:7px 10px;"></div>';
      var sn = { pending: '待支付', pending_approval: '待审批', approved: '已完成', rejected: '已拒绝', cancelled: '已取消', expired: '已过期' };
      for (var j = 0; j < orders.length; j++) {
        var o = orders[j];
        var isRecharge = o.type === 'recharge';
        var icon = isRecharge ? '💎' : '⬆️';
        var desc = isRecharge ? ('充值 ¥' + o.amount + ' → ' + o.credits + '分') : (o.plan || '套餐');
        var badge = o.amount ? '¥' + o.amount : '';
        orderHtml += '<div class="admin-user-row" data-admin-order="' + o.id + ' ' + (o.username || '') + ' ' + (o.wechatTxnId || '') + '">'
          + '<span style="font-size:10.5px;color:var(--text-muted);">' + o.id + '</span>'
          + '<span style="font-size:11px;font-weight:600;">' + escHtml(o.username || '?') + '</span>'
          + '<span style="font-size:11px;">' + icon + ' ' + desc + ' <span style="color:var(--accent);">' + badge + '</span></span>'
          + '<span style="font-size:10.5px;">' + (sn[o.status] || o.status) + (o.wechatTxnId ? ' · ' + o.wechatTxnId : '') + '</span>'
          + (o.status === 'pending_approval' ? '<div class="admin-user-actions"><button class="btn btn-xs btn-primary" onclick="approveOrder(\'' + o.id + '\')">批准</button><button class="btn btn-xs" onclick="rejectOrder(\'' + o.id + '\')">拒绝</button></div>' : '')
          + (o.status === 'pending' ? '<button class="btn btn-xs" style="margin-left:4px;" onclick="approveOrder(\'' + o.id + '\')" title="强制批准">⚡</button>' : '')
          + '</div>';
      }
      document.getElementById('adminOrderList').innerHTML = orderHtml || '<p style="color:var(--text-secondary);">暂无订单</p>';
    } catch (e) { document.getElementById('adminOrderList').innerHTML = '<p style="color:var(--error);">加载失败</p>'; }
    loadApiKeys();
  } catch (e) { toast('加载管理面板失败', 'error'); }
}

async function saveAdminApiKey() {
  var k = document.getElementById('adminApiKey')?.value?.trim();
  if (!k) { toast('API Key 不能为空', 'error'); return; }
  localStorage.setItem(SK.API_KEY, JSON.stringify({ key: k, updatedAt: Date.now() }));
  S.key = k; setKeyStat(true);
  document.getElementById('apiKeyInput').value = k;
  toast('API Key 已保存', 'success'); closeAdminPanel();
}

async function adjustBalance(uid, username) {
  var d = parseInt(prompt('调整 ' + username + ' 余额 (正=增加, 负=扣减)', '0'));
  if (!d || d === 0) return;
  var desc = prompt('原因:', '');
  try { var r = await apiPost('/api/admin/adjust-balance', { targetUserId: uid, delta: d, desc: desc }); toast(r.message + ', 余额: ' + r.balance, 'success'); renderAdminPanel(); }
  catch (e) { toast('失败: ' + e.message, 'error'); }
}

async function approveOrder(oid) {
  try {
    var r = await apiPost('/api/admin/orders/' + oid + '/approve', {});
    toast(r.message || '已批准', 'success');
    renderAdminPanel();
    if (AUTH.token) { try { var u = await apiGet('/api/user/profile'); AUTH.user = u; AUTH.balance = u.balance; updateBalanceUI(); } catch (e) {} }
  } catch (e) { toast('失败: ' + e.message, 'error'); }
}

async function rejectOrder(oid) {
  var reason = prompt('拒绝原因（可选）:', '');
  try { await apiPost('/api/admin/orders/' + oid + '/reject', { reason: reason || '' }); toast('已拒绝', 'success'); renderAdminPanel(); }
  catch (e) { toast('失败: ' + e.message, 'error'); }
}

function filterAdminOrders(q) {
  var rows = document.querySelectorAll('[data-admin-order]');
  var kw = (q || '').toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    rows[i].style.display = !kw || rows[i].getAttribute('data-admin-order').toLowerCase().includes(kw) ? '' : 'none';
  }
}

async function loadApiKeys() {
  try {
    var apiKeys = await apiGet('/api/admin/api-keys');
    var html = '<div style="margin-bottom:8px;display:flex;gap:8px;"><input type="text" id="newApiKeyName" placeholder="Key 名称" style="flex:1;font-size:12px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-xs);color:var(--text-primary);padding:6px 10px;"><button class="btn btn-primary btn-xs" onclick="createApiKey()">+ 创建</button></div>';
    for (var i = 0; i < apiKeys.length; i++) {
      var ak = apiKeys[i];
      var masked = ak.key.slice(0, 8) + '...' + ak.key.slice(-4);
      html += '<div class="admin-user-row">'
        + '<span style="font-size:11px;">' + escHtml(ak.name || 'Key') + '</span>'
        + '<code style="font-size:10px;color:var(--accent);">' + masked + '</code>'
        + '<span style="font-size:10px;">' + escHtml(ak.username || '') + '</span>'
        + (ak.isActive ? '<span style="font-size:10px;color:var(--success);">活跃</span>' : '<span style="font-size:10px;color:var(--error);">已吊销</span>')
        + (ak.isActive ? '<button class="btn btn-xs" onclick="revokeApiKey(\'' + ak.key + '\')" style="color:var(--error);">吊销</button>' : '')
        + '</div>';
    }
    document.getElementById('adminApiKeyList').innerHTML = html || '<p style="color:var(--text-secondary);">暂无 API Key</p>';
  } catch (e) { document.getElementById('adminApiKeyList').innerHTML = '<p style="color:var(--text-secondary);">加载失败</p>'; }
}

async function createApiKey() {
  var name = document.getElementById('newApiKeyName')?.value?.trim() || 'Default';
  try {
    var res = await apiPost('/api/admin/api-keys', { name: name });
    toast('API Key 已创建！请复制保存: ' + res.key, 'success');
    loadApiKeys();
  } catch (e) { toast('创建失败: ' + e.message, 'error'); }
}

async function revokeApiKey(key) {
  if (!confirm('确定吊销该 API Key？吊销后立即失效。')) return;
  try {
    await apiPost('/api/admin/api-keys/' + key + '/revoke', {});
    toast('API Key 已吊销', 'success');
    loadApiKeys();
  } catch (e) { toast('吊销失败: ' + e.message, 'error'); }
}

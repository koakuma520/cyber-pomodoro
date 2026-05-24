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
      var orderHtml = '';
      for (var j = 0; j < orders.length; j++) {
        var o = orders[j];
        var sn = { pending: '待支付', pending_approval: '待审批', approved: '已批准', rejected: '已拒绝' };
        orderHtml += '<div class="admin-user-row"><span style="font-size:12px;">' + o.id + '</span><span style="font-size:12px;">' + (o.plan || '') + ' ¥' + (o.amount || 0) + '</span><span style="font-size:11px;">' + (sn[o.status] || o.status) + '</span>'
          + (o.status === 'pending_approval' ? '<div class="admin-user-actions"><button class="btn btn-xs btn-primary" onclick="approveOrder(\'' + o.id + '\')">批准</button><button class="btn btn-xs" onclick="rejectOrder(\'' + o.id + '\')">拒绝</button></div>' : '') + '</div>';
      }
      document.getElementById('adminOrderList').innerHTML = orderHtml || '<p style="color:var(--text-secondary);">暂无订单</p>';
    } catch (e) { document.getElementById('adminOrderList').innerHTML = '<p style="color:var(--error);">加载失败</p>'; }
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
  try { await apiPost('/api/admin/orders/' + oid + '/approve', {}); toast('已批准并激活套餐', 'success'); renderAdminPanel();
    if (AUTH.token) { try { var u = await apiGet('/api/user/profile'); AUTH.user = u; AUTH.balance = u.balance; updateBalanceUI(); } catch (e) {} }
  } catch (e) { toast('失败: ' + e.message, 'error'); }
}

async function rejectOrder(oid) {
  try { await apiPost('/api/admin/orders/' + oid + '/reject', {}); toast('已拒绝', 'success'); renderAdminPanel(); }
  catch (e) { toast('失败: ' + e.message, 'error'); }
}

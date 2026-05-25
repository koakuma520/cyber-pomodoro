// Seedance Studio Pro — 认证模块（免登录浏览，生成时校验）
function switchAuthTab(tab) {
  var isLogin = tab === 'login';
  document.getElementById('showLoginTab').classList.toggle('active', isLogin);
  document.getElementById('showRegTab').classList.toggle('active', !isLogin);
  if (isLogin) {
    document.getElementById('authFormContent').innerHTML =
      '<input type="text" id="loginUsername" placeholder="用户名" class="auth-input">'
      + '<input type="password" id="loginPassword" placeholder="密码" class="auth-input" style="margin-top:10px;">'
      + '<button class="btn btn-primary w-full" onclick="doLogin()" style="margin-top:10px;">登录</button>'
      + '<p class="auth-hint">新用户注册即送 10 积分</p>';
  } else {
    document.getElementById('authFormContent').innerHTML =
      '<input type="text" id="regUsername" placeholder="用户名 (2-20字符)" class="auth-input">'
      + '<input type="password" id="regPassword" placeholder="密码 (至少4位)" class="auth-input" style="margin-top:10px;">'
      + '<input type="password" id="regConfirm" placeholder="确认密码" class="auth-input" style="margin-top:10px;">'
      + '<button class="btn btn-primary w-full" onclick="doRegister()" style="margin-top:10px;">注册并登录</button>'
      + '<p class="auth-hint">注册即送 10 积分</p>';
  }
}

// 外部调用：弹出登录/注册遮罩
function showAuthModal(tab) {
  document.getElementById('authOverlay').classList.remove('hidden');
  switchAuthTab(tab || 'login');
}

function hideAuthModal() {
  document.getElementById('authOverlay').classList.add('hidden');
}

async function doLogin() {
  var u = document.getElementById('loginUsername')?.value?.trim();
  var p = document.getElementById('loginPassword')?.value?.trim();
  if (!u || !p) { toast('请输入用户名和密码', 'error'); return; }
  try {
    var res = await apiPost('/api/auth/login', { username: u, password: p });
    AUTH.token = res.token; AUTH.user = res.user; AUTH.balance = res.user.balance;
    localStorage.setItem(AUTH.tokenKey, res.token);
    onAuthSuccess();
    hideAuthModal();
    toast('登录成功，欢迎回来！', 'success');
  } catch (e) { toast('登录失败: ' + e.message, 'error'); }
}

async function doRegister() {
  var u = document.getElementById('regUsername')?.value?.trim();
  var p = document.getElementById('regPassword')?.value?.trim();
  var c = document.getElementById('regConfirm')?.value?.trim();
  if (!u || !p) { toast('请填写完整信息', 'error'); return; }
  if (u.length < 2 || u.length > 20) { toast('用户名需2-20个字符', 'error'); return; }
  if (p.length < 4) { toast('密码至少4个字符', 'error'); return; }
  if (p !== c) { toast('两次密码不一致', 'error'); return; }
  try {
    var res = await apiPost('/api/auth/register', { username: u, password: p });
    AUTH.token = res.token; AUTH.user = res.user; AUTH.balance = res.user.balance;
    localStorage.setItem(AUTH.tokenKey, res.token);
    onAuthSuccess();
    hideAuthModal();
    toast('注册成功！已赠送 10 积分', 'success');
  } catch (e) { toast('注册失败: ' + e.message, 'error'); }
}

function onAuthSuccess() {
  document.getElementById('authOverlay').classList.add('hidden');
  setAuthUI(true);
  updateBalanceUI();
  updateAdminBtn();
  loadQuota();
  loadHist();
  loadTemplates();
  setupTemplateDelegation();
}

function doLogout() {
  if (!confirm('确定退出登录吗？')) return;
  localStorage.removeItem(AUTH.tokenKey);
  AUTH.token = null; AUTH.user = null; AUTH.balance = 0;
  S.polling = false; clearTimeout(S.pollTimer);  // 取消正在进行中的轮询
  setAuthUI(false);
  document.getElementById('progSection').classList.remove('active');
  updateGenBtn('ready');
  setStat('ready');
  toast('已退出登录', 'info');
}

// 切换头部按钮：未登录 vs 已登录
function setAuthUI(authed) {
  var guest = document.getElementById('headerGuest');
  var user = document.getElementById('headerUser');
  if (authed) {
    if (guest) guest.style.display = 'none';
    if (user) user.style.display = '';
  } else {
    if (guest) guest.style.display = '';
    if (user) user.style.display = 'none';
  }
}

async function checkAuth() {
  var token = localStorage.getItem(AUTH.tokenKey);
  if (!token) { setAuthUI(false); return false; }
  AUTH.token = token;
  try {
    var user = await apiGet('/api/user/profile');
    AUTH.user = user; AUTH.balance = user.balance;
    setAuthUI(true);
    updateBalanceUI(); updateAdminBtn();
    return true;
  } catch (e) {
    localStorage.removeItem(AUTH.tokenKey);
    AUTH.token = null;
    setAuthUI(false);
    return false;
  }
}

function updateAdminBtn() {
  var btn = document.getElementById('adminBtn');
  if (btn) btn.style.display = isAdmin() ? '' : 'none';
}

// ==================== 支付 Modal 系统 ====================
function requireAuth() {
  if (!AUTH.token) {
    toast('请先登录后再操作', 'error');
    showAuthModal('login');
    return false;
  }
  return true;
}

async function claimFree() {
  if (!requireAuth()) return;
  try {
    var res = await apiPost('/api/user/claim-free', {});
    AUTH.balance = res.balance; updateBalanceUI();
    toast(res.message, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

var _pendingOrder = null;

// --- 充值 Modal ---
var _rechargeSelected = null;
async function rechargeModal() {
  if (!requireAuth()) return;
  try {
    var products = await apiGet('/api/recharge-products');
    var grid = document.getElementById('rechargeGrid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var v720p = Math.floor(p.credits / 30); // 720p/5s = 30积分
      var v1080p = Math.floor(p.credits / 60); // 1080p/5s = 60积分
      html += '<div class="recharge-card' + (i === 1 ? ' featured' : '') + '" data-id="' + p.id + '" data-amount="' + p.amount + '" data-credits="' + p.credits + '" onclick="selectRechargeCard(this)">'
        + '<span class="rc-badge">' + (p.badge || '') + '</span>'
        + '<span class="rc-icon">' + (p.icon || '⭐') + '</span>'
        + '<div class="rc-name">¥' + p.amount + '</div>'
        + '<div class="rc-credits">' + p.credits.toLocaleString() + ' 积分</div>'
        + '<div class="rc-bonus">含赠送 ' + (p.bonus || 0) + ' 积分</div>'
        + '<div class="rc-divider"></div>'
        + '<div class="rc-meta">🎬 可生成 <strong>' + v720p + '</strong> 条 720p/5s 视频</div>'
        + '<div class="rc-meta">🎬 或 <strong>' + v1080p + '</strong> 条 1080p/5s 视频</div>'
        + '</div>';
    }
    grid.innerHTML = html;
    // 汇率说明
    var rateEl = document.getElementById('rechargeRate');
    if (rateEl) rateEl.innerHTML = '720p = <strong>6积分/秒</strong>(¥0.6/秒) · 1080p = <strong>12积分/秒</strong>(¥1.2/秒) · 1积分=¥0.1';
    document.getElementById('rechargeModal').classList.add('open');
    // 默认选中第二档
    _rechargeSelected = null;
    var cards = grid.querySelectorAll('.recharge-card');
    if (cards.length >= 2) selectRechargeCard(cards[1]);
  } catch (e) { toast('加载充值产品失败', 'error'); }
}

function selectRechargeCard(el) {
  document.querySelectorAll('.recharge-card').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
  _rechargeSelected = { id: el.getAttribute('data-id'), amount: parseInt(el.getAttribute('data-amount')), credits: parseInt(el.getAttribute('data-credits')) };
  var amtEl = document.getElementById('verifyAmount');
  if (amtEl) amtEl.value = _rechargeSelected.amount;
}

async function submitRechargeOrder() {
  if (!_rechargeSelected) { toast('请先选择充值档位', 'error'); return; }
  var txnId = document.getElementById('verifyTxnId')?.value?.trim();
  if (!txnId || txnId.length < 4) { toast('请输入有效的微信交易单号（至少4位）', 'error'); return; }
  try {
    var res = await apiPost('/api/recharge-orders', { productId: _rechargeSelected.id });
    var order = res.order || res;
    // 提交支付凭证
    var vRes = await apiPost('/api/orders/' + order.id + '/verify', { txn_id: txnId });
    toast('订单已提交！预计15分钟内到账 ' + _rechargeSelected.credits + ' 积分', 'info');
    closeRechargeModal();
    // 刷新余额
    try { var u = await apiGet('/api/user/profile'); AUTH.balance = u.balance; updateBalanceUI(); } catch(e){}
  } catch(e) { toast('提交失败: ' + (e.message || '请重试'), 'error'); }
}

function closeRechargeModal() { document.getElementById('rechargeModal').classList.remove('open'); }

async function createRechargeOrder(productId, amount, credits, name) {
  try {
    var res = await apiPost('/api/recharge-orders', { productId: productId });
    closeRechargeModal();
    _pendingOrder = { id: res.order.id, type: 'recharge', amount: amount, credits: credits, name: name };
    showPaymentModal();
  } catch (e) { toast(e.message, 'error'); }
}

// --- 套餐升级 Modal ---
async function showUpgradeModal() {
  if (!requireAuth()) return;
  try {
    var plans = await apiGet('/api/plans');
    var grid = document.getElementById('planGrid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      var isCurrent = AUTH.user && AUTH.user.plan === p.id;
      html += '<div class="plan-card' + (i === 2 ? ' featured' : '') + '" onclick="selectPlan(\'' + p.id + '\', ' + p.price + ', \'' + p.name + '\')">'
        + (isCurrent ? '<div style="font-size:10px;color:var(--success);margin-bottom:4px;">✅ 当前套餐</div>' : '')
        + '<div class="plan-name">' + p.name + '</div>'
        + '<div class="plan-price">' + (p.price === 0 ? '免费' : '¥' + p.price) + '<span class="unit">/月</span></div>'
        + '<div class="plan-feature">' + (p.creditsPerMonth || p.videosPerMonth) + ' 积分/月</div>'
        + '<div class="plan-feature">' + (p.watermark ? '带水印' : '无水印') + '</div>'
        + (p.desc ? '<div class="plan-feature">' + p.desc + '</div>' : '')
        + '</div>';
    }
    grid.innerHTML = html;
    showPaywall();
  } catch (e) { toast('加载套餐失败', 'error'); }
}

async function selectPlan(planId, price, planName) {
  if (!requireAuth()) return;
  if (price === 0) { toast('免费版无需购买', 'info'); hidePaywall(); return; }
  try {
    var res = await apiPost('/api/orders', { plan: planId });
    hidePaywall();
    _pendingOrder = { id: res.order.id, type: 'plan', amount: price, name: planName };
    showPaymentModal();
  } catch (e) { toast(e.message, 'error'); }
}

// --- 支付确认 Modal ---
function showPaymentModal() {
  if (!_pendingOrder) return;
  var info = document.getElementById('paymentOrderInfo');
  var amount = document.getElementById('paymentAmount');
  var title = document.getElementById('paymentModalTitle');
  var txn = document.getElementById('paymentTxnId');

  if (title) title.textContent = _pendingOrder.type === 'recharge' ? '💎 确认充值' : '💳 确认支付';
  if (amount) amount.textContent = '¥' + _pendingOrder.amount.toFixed(2);
  if (txn) txn.value = '';
  if (info) {
    info.innerHTML = '<div class="poi-row"><span class="poi-label">项目</span><span class="poi-value">' + escHtml(_pendingOrder.name) + '</span></div>'
      + (_pendingOrder.credits ? '<div class="poi-row"><span class="poi-label">到账积分</span><span class="poi-value" style="color:var(--success);">+' + _pendingOrder.credits + ' 分</span></div>' : '')
      + '<div class="poi-row"><span class="poi-label">金额</span><span class="poi-value" style="color:var(--accent);">¥' + _pendingOrder.amount.toFixed(2) + '</span></div>'
      + '<div class="poi-row"><span class="poi-label">订单号</span><span class="poi-id">' + _pendingOrder.id + '</span></div>';
  }
  var btn = document.getElementById('paymentSubmitBtn');
  if (btn) { btn.disabled = false; btn.textContent = '📤 提交验证'; }

  document.getElementById('paymentModal').classList.add('open');
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('open');
  _pendingOrder = null;
}

async function submitPayment() {
  if (!_pendingOrder) return;
  var txnId = document.getElementById('paymentTxnId')?.value?.trim();
  if (!txnId || txnId.length < 4) { toast('请输入至少4位的微信交易单号', 'error'); return; }
  var btn = document.getElementById('paymentSubmitBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 提交中...'; }
  try {
    var res = await apiPost('/api/orders/' + _pendingOrder.id + '/verify', { txn_id: txnId });
    closePaymentModal();
    toast(res.message, 'success');
    _pendingOrder = null;
  } catch (e) {
    toast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = '📤 提交验证'; }
  }
}

// --- 订单历史 Modal ---
var _allOrders = [];
var _orderFilter = 'all';

async function showOrdersModal() {
  if (!requireAuth()) return;
  try {
    _allOrders = await apiGet('/api/orders');
    renderOrdersList();
    document.getElementById('ordersModal').classList.add('open');
  } catch (e) { toast('加载订单失败', 'error'); }
}

function closeOrdersModal() { document.getElementById('ordersModal').classList.remove('open'); }

function filterOrdersTab(filter, el) {
  _orderFilter = filter;
  document.querySelectorAll('.orders-tab').forEach(function(t) { t.classList.remove('active'); });
  if (el) el.classList.add('active');
  renderOrdersList();
}

function renderOrdersList() {
  var list = document.getElementById('ordersList');
  if (!list) return;
  var filtered = _allOrders;
  if (_orderFilter !== 'all') filtered = _allOrders.filter(function(o) { return o.status === _orderFilter; });

  if (filtered.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:32px 16px;color:var(--text-muted);"><div style="font-size:36px;margin-bottom:8px;">📭</div><p>暂无订单</p></div>';
    return;
  }
  var statusNames = { pending: '待支付', pending_approval: '待审批', approved: '已完成', rejected: '已拒绝', cancelled: '已取消', expired: '已过期' };
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var o = filtered[i];
    var isRecharge = o.type === 'recharge';
    var icon = isRecharge ? '💎' : '⬆️';
    var name = isRecharge ? ('充值 ¥' + o.amount + ' → ' + o.credits + ' 积分') : ('升级套餐：' + (o.plan || ''));
    html += '<div class="order-item">'
      + '<div class="oi-icon">' + icon + '</div>'
      + '<div class="oi-info">'
      + '<div class="oi-id">' + o.id + '</div>'
      + '<div class="oi-desc">' + escHtml(name) + '</div>'
      + '<div class="oi-meta">' + new Date(o.createdAt).toLocaleString('zh-CN')
      + (o.wechatTxnId ? ' · 交易号: ' + o.wechatTxnId : '') + '</div></div>'
      + '<span class="oi-status ' + o.status + '">' + (statusNames[o.status] || o.status) + '</span>'
      + (((o.status === 'pending' || o.status === 'pending_approval'))
        ? '<div class="oi-actions"><button class="btn btn-xs" onclick="cancelOrder(\'' + o.id + '\')">取消</button></div>'
        : '')
      + '</div>';
  }
  list.innerHTML = html;
}

async function cancelOrder(oid) {
  if (!confirm('确定取消该订单？')) return;
  try {
    await apiPost('/api/orders/' + oid + '/cancel', {});
    toast('订单已取消', 'success');
    _allOrders = await apiGet('/api/orders');
    renderOrdersList();
  } catch (e) { toast(e.message, 'error'); }
}

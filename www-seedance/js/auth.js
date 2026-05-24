// Seedance Studio Pro — 认证模块（连接真实后端）
function switchAuthTab(tab) {
  var isLogin = tab === 'login';
  document.getElementById('showLoginTab').classList.toggle('active', isLogin);
  document.getElementById('showRegTab').classList.toggle('active', !isLogin);
  if (isLogin) {
    document.getElementById('authFormContent').innerHTML =
      '<input type="text" id="loginUsername" placeholder="用户名" class="auth-input">'
      + '<input type="password" id="loginPassword" placeholder="密码" class="auth-input" style="margin-top:10px;">'
      + '<button class="btn btn-primary w-full" onclick="doLogin()" style="margin-top:10px;">登录</button>'
      + '<p class="auth-hint">test / 123456 | admin / admin123 | 或注册新账号</p>';
  } else {
    document.getElementById('authFormContent').innerHTML =
      '<input type="text" id="regUsername" placeholder="用户名 (2-20字符)" class="auth-input">'
      + '<input type="password" id="regPassword" placeholder="密码 (至少4位)" class="auth-input" style="margin-top:10px;">'
      + '<input type="password" id="regConfirm" placeholder="确认密码" class="auth-input" style="margin-top:10px;">'
      + '<button class="btn btn-primary w-full" onclick="doRegister()" style="margin-top:10px;">注册并登录</button>'
      + '<p class="auth-hint">注册即送 10 积分</p>';
  }
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
  } catch (e) { toast('注册失败: ' + e.message, 'error'); }
}

function onAuthSuccess() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('headerRight').style.display = '';
  updateBalanceUI();
  updateAdminBtn();
  loadQuota();
  loadHist();
  loadTemplates();
  setupTemplateDelegation();
}

function doLogout() {
  localStorage.removeItem(AUTH.tokenKey);
  AUTH.token = null; AUTH.user = null; AUTH.balance = 0;
  document.getElementById('headerRight').style.display = 'none';
  document.getElementById('authOverlay').classList.remove('hidden');
  toast('已退出登录', 'info');
}

async function checkAuth() {
  var token = localStorage.getItem(AUTH.tokenKey);
  if (!token) { showAuthOverlayHidden(false); return false; }
  AUTH.token = token;
  try {
    var user = await apiGet('/api/user/profile');
    AUTH.user = user; AUTH.balance = user.balance;
    showAuthOverlayHidden(true);
    updateBalanceUI(); updateAdminBtn();
    return true;
  } catch (e) {
    localStorage.removeItem(AUTH.tokenKey);
    AUTH.token = null;
    showAuthOverlayHidden(false);
    return false;
  }
}

function showAuthOverlayHidden(authed) {
  var ov = document.getElementById('authOverlay');
  var hr = document.getElementById('headerRight');
  if (authed) { ov.classList.add('hidden'); hr.style.display = ''; }
  else { ov.classList.remove('hidden'); hr.style.display = 'none'; }
}

function updateAdminBtn() {
  var btn = document.getElementById('adminBtn');
  if (btn) btn.style.display = isAdmin() ? '' : 'none';
}

// ==================== 充值和领取（调用真实后端）====================
async function rechargeModal() {
  var yuan = prompt('请输入充值金额（元）\n1元 = 10积分', '10');
  if (!yuan) return;
  var val = parseInt(yuan);
  if (isNaN(val) || val <= 0 || val > 10000) { toast('请输入有效金额 (1-10000)', 'error'); return; }
  try {
    var res = await apiPost('/api/user/recharge', { amount: val });
    AUTH.balance = res.balance; updateBalanceUI();
    toast(res.message, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function claimFree() {
  try {
    var res = await apiPost('/api/user/claim-free', {});
    AUTH.balance = res.balance; updateBalanceUI();
    toast(res.message, 'success');
  } catch (e) { toast(e.message, 'error'); }
}

async function showUpgradeModal() {
  try {
    var plans = await apiGet('/api/plans');
    var grid = document.getElementById('planGrid');
    if (!grid) return;
    var html = '';
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      var isCurrent = AUTH.user && AUTH.user.plan === p.id;
      html += '<div class="plan-card' + (i === 2 ? ' featured' : '') + '" onclick="selectPlan(\'' + p.id + '\', ' + p.price + ')">'
        + (isCurrent ? '<div style="font-size:10px;color:var(--success);margin-bottom:4px;">当前套餐</div>' : '')
        + '<div class="plan-name">' + p.name + '</div>'
        + '<div class="plan-price">' + (p.price === 0 ? '免费' : '¥' + p.price) + '<span class="unit">/月</span></div>'
        + '<div class="plan-feature">' + p.videosPerMonth + ' 条视频/月</div>'
        + '<div class="plan-feature">' + (p.watermark ? '带水印' : '无水印') + '</div>'
        + (p.desc ? '<div class="plan-feature">' + p.desc + '</div>' : '')
        + '</div>';
    }
    grid.innerHTML = html;
    showPaywall();
  } catch (e) { toast('加载套餐失败', 'error'); }
}

async function selectPlan(planId, price) {
  if (price === 0) { toast('免费版无需购买', 'info'); hidePaywall(); return; }
  try {
    var res = await apiPost('/api/orders', { plan: planId });
    hidePaywall();
    var txnId = prompt('订单已创建（' + res.order.id + '）\n请微信扫码支付 ' + price + ' 元后\n输入微信交易单号确认支付', '');
    if (!txnId) return;
    await apiPost('/api/orders/' + res.order.id + '/verify', { txn_id: txnId });
    toast('已提交，请等待管理员验证', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

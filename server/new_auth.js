// ======================== Mock API Backend ========================
// 结构化 Mock 后端 — 封装所有数据操作，模拟真实API模式
var SK = {
  USERS: 'seedance_users',
  SESSIONS: 'seedance_sessions',
  API_KEY: 'seedance_api_key',
  HISTORY: 'seedance_history',
  TXNS: 'seedance_transactions'
};

// 延迟模拟网络请求
function delay(ms) { return new Promise(function(r) { setTimeout(r, ms || 200); }); }

// 数据访问层
function dbGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } }
function dbSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function getUsers() { return dbGet(SK.USERS) || []; }
function saveUsers(u) { dbSet(SK.USERS, u); }
function getSessions() { return dbGet(SK.SESSIONS) || {}; }
function saveSessions(s) { dbSet(SK.SESSIONS, s); }
function getApiKeyConf() { return dbGet(SK.API_KEY) || {}; }
function saveApiKeyConf(c) { dbSet(SK.API_KEY, c); }
function getHistory() { return dbGet(SK.HISTORY) || []; }
function saveHistory(h) { dbSet(SK.HISTORY, h); }
function getTxns() { return dbGet(SK.TXNS) || []; }
function saveTxns(t) { dbSet(SK.TXNS, t); }

// 初始化种子数据
function initMockDB() {
  if (!dbGet(SK.USERS)) {
    saveUsers([
      { id: 'admin-1', username: 'admin', password: 'admin123', balance: 200, isAdmin: true, createdAt: Date.now() },
      { id: 'test-1', username: 'test', password: '123456', balance: 50, isAdmin: false, createdAt: Date.now() }
    ]);
  }
  if (!dbGet(SK.SESSIONS)) saveSessions({});
  if (!dbGet(SK.API_KEY)) saveApiKeyConf({ key: 'sk-atlas-demo-key-please-replace', updatedAt: Date.now() });
  if (!dbGet(SK.HISTORY)) saveHistory([]);
  if (!dbGet(SK.TXNS)) saveTxns([]);
}
initMockDB();

// ======================== Mock API 函数 ========================

// 根据 token 获取用户
async function mockGetUser(token) {
  await delay(50);
  var sessions = getSessions();
  var uid = sessions[token];
  if (!uid) throw new Error('无效的会话令牌');
  var users = getUsers();
  var u = users.find(function(x) { return x.id === uid; });
  if (!u) throw new Error('用户不存在');
  return { id: u.id, username: u.username, balance: u.balance, isAdmin: !!u.isAdmin };
}

// 登录
async function mockLogin(username, password) {
  await delay(300);
  var users = getUsers();
  var u = users.find(function(x) { return x.username === username && x.password === password; });
  if (!u) throw new Error('用户名或密码错误');
  var token = 'tok_' + u.id + '_' + Date.now();
  var sessions = getSessions();
  sessions[token] = u.id;
  saveSessions(sessions);
  return { token: token, user: { id: u.id, username: u.username, balance: u.balance, isAdmin: !!u.isAdmin } };
}

// 注册
async function mockRegister(username, password) {
  await delay(300);
  var users = getUsers();
  if (users.find(function(x) { return x.username === username; })) throw new Error('用户名已存在');
  if (username === 'admin') throw new Error('该用户名受保护');
  var u = {
    id: 'u_' + Date.now(),
    username: username,
    password: password,
    balance: 20,
    isAdmin: false,
    createdAt: Date.now()
  };
  users.push(u);
  saveUsers(users);
  var token = 'tok_' + u.id + '_' + Date.now();
  var sessions = getSessions();
  sessions[token] = u.id;
  saveSessions(sessions);
  var txns = getTxns();
  txns.push({ id: 'tx_' + Date.now(), userId: u.id, type: 'claim', amount: 20, desc: '新用户注册赠送', balance: 20, time: Date.now() });
  saveTxns(txns);
  return { token: token, user: { id: u.id, username: u.username, balance: u.balance, isAdmin: false } };
}

// 充值 (1元=10积分)
async function mockRecharge(token, amountYuan) {
  await delay(300);
  var mku = await mockGetUser(token);
  var users = getUsers();
  var idx = users.findIndex(function(x) { return x.id === mku.id; });
  var credits = amountYuan * 10;
  users[idx].balance += credits;
  saveUsers(users);
  var txns = getTxns();
  txns.push({ id: 'tx_' + Date.now(), userId: mku.id, type: 'recharge', amount: credits, desc: '充值 ' + amountYuan + ' 元', balance: users[idx].balance, time: Date.now() });
  saveTxns(txns);
  return { newBalance: users[idx].balance, added: credits };
}

// 免费领取 (一次性)
async function mockClaimFree(token) {
  await delay(200);
  var mku = await mockGetUser(token);
  var users = getUsers();
  var idx = users.findIndex(function(x) { return x.id === mku.id; });
  if (users[idx].hasClaimedFree) throw new Error('您已经领取过免费额度了');
  users[idx].balance += 10;
  users[idx].hasClaimedFree = true;
  saveUsers(users);
  var txns = getTxns();
  txns.push({ id: 'tx_' + Date.now(), userId: mku.id, type: 'claim', amount: 10, desc: '一次性免费领取 $1 额度', balance: users[idx].balance, time: Date.now() });
  saveTxns(txns);
  return { newBalance: users[idx].balance };
}

// 扣除积分
async function mockConsume(token, cost) {
  var mku = await mockGetUser(token);
  var users = getUsers();
  var idx = users.findIndex(function(x) { return x.id === mku.id; });
  if (users[idx].balance < cost) throw new Error('积分不足（需要 ' + cost + ' 积分，当前 ' + users[idx].balance + ' 积分）');
  users[idx].balance -= cost;
  saveUsers(users);
  var txns = getTxns();
  txns.push({ id: 'tx_' + Date.now(), userId: mku.id, type: 'consume', amount: -cost, desc: '生成视频消耗', balance: users[idx].balance, time: Date.now() });
  saveTxns(txns);
  return { newBalance: users[idx].balance };
}

// 保存生成记录
async function addHistoryRecord(userId, record) {
  var h = getHistory();
  h.unshift({ id: 'h_' + Date.now(), userId: userId, mode: record.mode, prompt: record.prompt, videoUrl: record.videoUrl, time: Date.now() });
  if (h.length > 50) h = h.slice(0, 50);
  saveHistory(h);
}

async function getUserHistory(userId) {
  return getHistory().filter(function(r) { return r.userId === userId; });
}

// 获取/更新 API Key (管理员)
async function mockGetApiKey(token) {
  var mku = await mockGetUser(token);
  if (!mku.isAdmin) throw new Error('需要管理员权限');
  return getApiKeyConf();
}

async function mockUpdateApiKey(token, newKey) {
  var mku = await mockGetUser(token);
  if (!mku.isAdmin) throw new Error('需要管理员权限');
  saveApiKeyConf({ key: newKey, updatedAt: Date.now() });
  return { key: newKey };
}

// ======================== UI 状态管理与认证流程 ========================
var AUTH = {
  tokenKey: 'sd_access_token',
  token: null,
  user: null,
  balance: 0
};

function switchAuthTab(tab) {
  var isLogin = tab === 'login';
  document.getElementById('showLoginTab').classList.toggle('active', isLogin);
  document.getElementById('showRegTab').classList.toggle('active', !isLogin);
  if (isLogin) {
    document.getElementById('authFormContent').innerHTML =
      '<input type="text" id="loginUsername" placeholder="用户名" class="auth-input">'
      + '<input type="password" id="loginPassword" placeholder="密码" class="auth-input" style="margin-top:10px;">'
      + '<button class="btn btn-primary w-full" onclick="doLogin()" style="margin-top:10px;">登录</button>'
      + '<p class="auth-hint">体验账号: test / 123456 | 管理员: admin / admin123</p>';
  } else {
    document.getElementById('authFormContent').innerHTML =
      '<input type="text" id="regUsername" placeholder="用户名" class="auth-input">'
      + '<input type="password" id="regPassword" placeholder="密码" class="auth-input" style="margin-top:10px;">'
      + '<input type="password" id="regConfirm" placeholder="确认密码" class="auth-input" style="margin-top:10px;">'
      + '<button class="btn btn-primary w-full" onclick="doRegister()" style="margin-top:10px;">注册并登录</button>';
  }
}

async function doLogin() {
  var u = document.getElementById('loginUsername')?.value?.trim();
  var p = document.getElementById('loginPassword')?.value?.trim();
  if (!u || !p) { toast('请输入用户名和密码', 'error'); return; }
  try {
    var res = await mockLogin(u, p);
    AUTH.token = res.token;
    AUTH.user = res.user;
    AUTH.balance = res.user.balance;
    localStorage.setItem(AUTH.tokenKey, res.token);
    onAuthSuccess();
  } catch(e) { toast(e.message, 'error'); }
}

async function doRegister() {
  var u = document.getElementById('regUsername')?.value?.trim();
  var p = document.getElementById('regPassword')?.value?.trim();
  var c = document.getElementById('regConfirm')?.value?.trim();
  if (!u || !p) { toast('请填写完整信息', 'error'); return; }
  if (p !== c) { toast('两次密码不一致', 'error'); return; }
  try {
    var res = await mockRegister(u, p);
    AUTH.token = res.token;
    AUTH.user = res.user;
    AUTH.balance = res.user.balance;
    localStorage.setItem(AUTH.tokenKey, res.token);
    onAuthSuccess();
  } catch(e) { toast(e.message, 'error'); }
}

function onAuthSuccess() {
  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('headerRight').style.display = '';
  updateBalanceUI();
  updateAdminBtn();
  init();
}

function doLogout() {
  localStorage.removeItem(AUTH.tokenKey);
  AUTH.token = null;
  AUTH.user = null;
  AUTH.balance = 0;
  document.getElementById('headerRight').style.display = 'none';
  document.getElementById('authOverlay').classList.remove('hidden');
  toast('已退出登录', 'info');
}

function updateBalanceUI() {
  document.getElementById('creditBalance').textContent = AUTH.balance;
}

async function checkAuth() {
  var token = localStorage.getItem(AUTH.tokenKey);
  if (!token) {
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('headerRight').style.display = 'none';
    return false;
  }
  try {
    var u = await mockGetUser(token);
    AUTH.token = token;
    AUTH.user = u;
    AUTH.balance = u.balance;
    document.getElementById('authOverlay').classList.add('hidden');
    document.getElementById('headerRight').style.display = '';
    updateBalanceUI();
    updateAdminBtn();
    return true;
  } catch(e) {
    localStorage.removeItem(AUTH.tokenKey);
    document.getElementById('authOverlay').classList.remove('hidden');
    document.getElementById('headerRight').style.display = 'none';
    return false;
  }
}

function updateAdminBtn() {
  var btn = document.getElementById('adminBtn');
  if (btn) btn.style.display = isAdmin() ? '' : 'none';
}

function isAdmin() { return AUTH.user && AUTH.user.isAdmin === true; }

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ======================== 充值 / 领取 ========================
async function rechargeModal() {
  var yuan = prompt('请输入充值金额（元）\n1元 = 10积分', '10');
  if (!yuan) return;
  var val = parseInt(yuan);
  if (isNaN(val) || val <= 0) { toast('请输入有效金额', 'error'); return; }
  try {
    var res = await mockRecharge(AUTH.token, val);
    AUTH.balance = res.newBalance;
    updateBalanceUI();
    toast('充值成功！+ ' + res.added + ' 积分', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

async function claimFree() {
  try {
    var res = await mockClaimFree(AUTH.token);
    AUTH.balance = res.newBalance;
    updateBalanceUI();
    toast('领取成功！+10 积分，仅限一次', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

// ======================== 交易记录 ========================
function renderTransactions(filter) {
  var list = document.getElementById('txnList');
  if (!list) return;
  var txns = getTxns().filter(function(t) { return t.userId === AUTH.user.id; });
  if (filter) txns = txns.filter(function(t) { return t.type === filter; });
  txns = txns.slice(0, 30);
  if (txns.length === 0) { list.innerHTML = '<div class="txn-empty">暂无交易记录</div>'; return; }
  var typeNames = { recharge: '充值', claim: '领取', consume: '消费', admin_bonus: '管理员赠送', admin_deduct: '管理员扣减' };
  var html = '';
  for (var i = 0; i < txns.length; i++) {
    var t = txns[i];
    var sign = t.amount >= 0 ? '+' : '';
    var cls = t.amount >= 0 ? 'txn-plus' : 'txn-minus';
    html += '<div class="txn-item">' +
      '<span class="txn-amount ' + cls + '">' + sign + t.amount + '分</span>' +
      '<span class="txn-desc">' + escHtml(t.desc || (typeNames[t.type] || t.type)) + '</span>' +
      '<span class="txn-time">' + new Date(t.time).toLocaleString('zh-CN') + '</span>' +
      '<span class="txn-bal">余额:' + t.balance + '分</span>' +
    '</div>';
  }
  list.innerHTML = html;
}

// ======================== 管理员面板 — API密钥管理 ========================
async function renderAdminPanel() {
  if (!isAdmin()) { toast('需要管理员权限', 'error'); return; }
  var conf = getApiKeyConf();
  var html = '<div style="padding:8px 0;">' +
    '<p style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">Atlas Cloud API Key（仅管理员可见和修改）</p>' +
    '<div style="display:flex;gap:8px;">' +
    '<input type="text" id="adminApiKey" class="auth-input" value="' + escHtml(conf.key || '') + '" style="flex:1;" placeholder="输入 Atlas Cloud API Key">' +
    '<button class="btn btn-primary" onclick="saveAdminApiKey()" style="white-space:nowrap;">💾 保存</button>' +
    '</div>' +
    '<p style="font-size:11px;color:var(--text-secondary);margin-top:6px;">上次更新: ' + (conf.updatedAt ? new Date(conf.updatedAt).toLocaleString('zh-CN') : '从未') + '</p>' +
    '<p style="font-size:11px;color:var(--text-secondary);margin-top:8px;">💡 此 API Key 用于调用 Atlas Cloud 视频生成服务。保存后所有用户共享此 Key。</p>' +
    '</div>';
  document.getElementById('adminUserList').innerHTML = html;
  document.getElementById('adminPanel').style.display = 'flex';
  var tp = document.getElementById('txnPanel');
  if (tp) tp.style.display = 'none';
}

async function saveAdminApiKey() {
  var k = document.getElementById('adminApiKey')?.value?.trim();
  if (!k) { toast('API Key 不能为空', 'error'); return; }
  try {
    await mockUpdateApiKey(AUTH.token, k);
    toast('API Key 已更新', 'success');
    document.getElementById('adminPanel').style.display = 'none';
  } catch(e) { toast(e.message, 'error'); }
}

function toggleAdminPanel() {
  if (!isAdmin()) { toast('需要管理员权限', 'error'); return; }
  var p = document.getElementById('adminPanel');
  if (p.style.display === 'flex') { p.style.display = 'none'; }
  else { renderAdminPanel(); }
}

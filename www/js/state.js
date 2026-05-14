// localStorage 存储键
const SK = {
  TOKEN:    'candy_token',
  USER:     'candy_user',
  CART:     'candy_cart',       // 访客购物车（未登录时使用）
  DRAFT:    'candy_draft_addr'   // 草稿地址
};

// 认证状态
const AUTH = {
  token: null,
  user: null
};

// 全局页面状态
const P = {
  cartCount: 0,         // 购物车数量角标
  currentPage: null     // 当前页面标识
};

// --- localStorage 工具函数 ---

function dbGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function dbSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('localStorage 写入失败:', key);
  }
}

function dbDel(key) {
  localStorage.removeItem(key);
}

// 初始化 —— 检查登录状态
function initAuth() {
  const token = dbGet(SK.TOKEN);
  const user  = dbGet(SK.USER);
  if (token && user) {
    AUTH.token = token;
    AUTH.user  = user;
    return true;
  }
  return false;
}

// 保存登录状态
function saveAuth(token, user) {
  AUTH.token = token;
  AUTH.user  = user;
  dbSet(SK.TOKEN, token);
  dbSet(SK.USER, user);
}

// 清除登录状态
function clearAuth() {
  AUTH.token = null;
  AUTH.user  = null;
  dbDel(SK.TOKEN);
  dbDel(SK.USER);
}

// 是否已登录
function isLoggedIn() {
  return !!(AUTH.token && AUTH.user);
}

// 是否管理员
function isAdmin() {
  return isLoggedIn() && AUTH.user.isAdmin;
}

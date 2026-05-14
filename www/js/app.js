// 应用入口 — 路由与初始化

// --- 路由表 ---
var routes = {
  'home':    { render: function () { homePage.render(); } },
  'gallery': { render: function () { galleryPage.render(); } },
  'consult': { render: function () { consultPage.render(); } },
  'cart':    { render: function () { cartPage.render(); } },
  'orders':  { render: function () { ordersPage.render(); } },
  'checkout':{ render: function () { checkoutPage.render(); } },
  'profile': { render: function () { renderProfilePage(); } },
  'admin':   { render: function () { adminPage.render(); } }
};

// --- 路由解析 ---
function parseHash() {
  var hash = window.location.hash.replace('#/', '') || 'home';

  // 检查 /product/:id 路由
  if (hash.startsWith('product/')) {
    var productId = hash.replace('product/', '');
    return { page: 'product', id: productId };
  }

  return { page: hash.split('/')[0], id: null };
}

// --- 页面导航 ---
async function navigateTo(hash) {
  var route = parseHash();
  var page = route.page;

  // 需要登录的页面
  var authPages = ['cart', 'orders', 'checkout', 'profile', 'admin'];
  if (authPages.includes(page) && !isLoggedIn()) {
    showAuthOverlay();
    // 记录目标页面，登录后跳转
    window._redirectAfterAuth = hash;
    // 先渲染首页作为背景
    if (page !== 'home') {
      homePage.render();
    }
    return;
  }

  if (page === 'product' && route.id) {
    productDetailPage.render(route.id);
    return;
  }

  var handler = routes[page];
  if (handler) {
    await handler.render();
  } else {
    // 404 回退到首页
    window.location.hash = '#/home';
  }
}

// --- 更新顶部栏 ---
function updateHeader() {
  var headerActions = document.getElementById('headerActions');
  if (!headerActions) return;

  if (isLoggedIn()) {
    var user = AUTH.user;
    var adminLink = '';
    if (user.isAdmin) {
      adminLink = '<a href="#/admin" style="font-size:0.8rem;color:var(--gold);margin-right:8px;text-decoration:none;">⚙</a>';
    }
    headerActions.innerHTML = adminLink +
      '<a href="#/cart" style="position:relative;text-decoration:none;font-size:1.2rem;margin-right:4px;" title="购物车">🛒<span class="nav-badge" id="cartBadge" style="position:absolute;top:-4px;right:-8px;"></span></a>' +
      '<a href="#/orders" style="text-decoration:none;font-size:1.1rem;margin-right:8px;" title="订单">📋</a>' +
      '<span class="header-user" id="btnUserMenu" style="cursor:pointer;" onclick="window.location.hash=\'#/profile\'">👤 ' + escHtml(user.username) + '</span>' +
      '<button class="btn btn-xs btn-secondary" id="btnLogout">退出</button>';

    document.getElementById('btnLogout').addEventListener('click', function () {
      clearAuth();
      P.cartCount = 0;
      updateCartBadge();
      toast('已退出登录');
      window.location.hash = '#/home';
    });
  } else {
    headerActions.innerHTML =
      '<a href="#/cart" style="position:relative;text-decoration:none;font-size:1.2rem;margin-right:8px;" title="购物车">🛒<span class="nav-badge" id="cartBadge" style="position:absolute;top:-4px;right:-8px;"></span></a>' +
      '<button class="btn btn-xs btn-primary" id="btnLogin">登录</button>';
    document.getElementById('btnLogin').addEventListener('click', function () {
      wxManualLogin();
    });
  }
  updateCartBadge();
}

// --- 更新购物车数量 ---
async function updateCartCount() {
  // 本地购物车
  var localCart = dbGet(SK.CART) || [];
  var localCount = localCart.reduce(function (s, i) { return s + i.quantity; }, 0);

  if (isLoggedIn()) {
    try {
      var cart = await apiGet('/api/cart');
      P.cartCount = cart.items.reduce(function (s, i) { return s + i.quantity; }, 0);
    } catch (e) {
      P.cartCount = localCount;
    }
  } else {
    P.cartCount = localCount;
  }

  updateCartBadge();
}

// --- 个人中心页 ---
function renderProfilePage() {
  P.currentPage = 'profile';
  updateHeader();
  renderBottomNav();

  if (!isLoggedIn()) {
    showAuthOverlay();
    return;
  }

  var user = AUTH.user;
  var html = '';

  // 用户信息卡片
  html += '<div class="card"><div class="card-body" style="text-align:center;">';
  html += '<div style="font-size:3rem;margin-bottom:8px;">👤</div>';
  html += '<div style="font-size:1.1rem;font-weight:600;">' + escHtml(user.username) + '</div>';
  html += '<div style="font-size:0.85rem;color:var(--text-muted);">注册于 ' + fmtDate(user.createdAt) + '</div>';
  if (user.isAdmin) {
    html += '<div style="margin-top:8px;"><span class="status-badge" style="background:var(--gold-light);color:var(--gold);">管理员</span></div>';
  }
  html += '</div></div>';

  // 收货地址
  var addr = user.address;
  html += '<div class="card"><div class="card-header"><span class="card-title">收货地址</span></div><div class="card-body">';
  if (addr && addr.name && addr.detail) {
    html += '<div style="font-size:0.9rem;"><strong>' + escHtml(addr.name) + '</strong> ' + escHtml(addr.phone) + '</div>';
    html += '<div style="font-size:0.85rem;color:var(--text-secondary);">' + escHtml(addr.province || '') + ' ' + escHtml(addr.detail || '') + '</div>';
    html += '<button class="btn btn-xs btn-outline" id="btnEditProfileAddr" style="margin-top:8px;">修改地址</button>';
  } else {
    html += '<div style="color:var(--text-muted);font-size:0.85rem;">未设置收货地址</div>';
    html += '<button class="btn btn-xs btn-outline" id="btnEditProfileAddr" style="margin-top:8px;">添加地址</button>';
  }
  html += '</div>';

  // 地址编辑表单
  html += '<div id="profileAddrForm" class="hidden" style="padding:0 16px 16px;">';
  html += '<div class="form-group"><label class="form-label">收货人</label><input class="form-input" id="paName" value="' + escHtml(addr ? addr.name || '' : '') + '"></div>';
  html += '<div class="form-group"><label class="form-label">联系电话</label><input class="form-input" id="paPhone" value="' + escHtml(addr ? addr.phone || '' : '') + '"></div>';
  html += '<div class="form-group"><label class="form-label">省市区</label><input class="form-input" id="paRegion" value="' + escHtml(addr ? addr.province || '' : '') + '"></div>';
  html += '<div class="form-group"><label class="form-label">详细地址</label><input class="form-input" id="paDetail" value="' + escHtml(addr ? addr.detail || '' : '') + '"></div>';
  html += '<button class="btn btn-primary btn-sm btn-block" id="btnSaveProfileAddr">保存</button>';
  html += '</div>';

  html += '</div>';

  // 快捷入口
  html += '<div class="card"><div class="card-body">';
  html += '<a href="#/orders" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light);color:var(--text-primary);text-decoration:none;"><span>📋 我的订单</span><span style="color:var(--text-muted);">›</span></a>';
  html += '<a href="#/cart" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-light);color:var(--text-primary);text-decoration:none;"><span>🛒 购物车</span><span style="color:var(--text-muted);">›</span></a>';
  if (user.isAdmin) {
    html += '<a href="#/admin" style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;color:var(--text-primary);text-decoration:none;"><span>⚙ 管理后台</span><span style="color:var(--text-muted);">›</span></a>';
  }
  html += '</div></div>';

  document.getElementById('content').innerHTML = html;

  // 编辑地址
  var btnEdit = document.getElementById('btnEditProfileAddr');
  var addrForm = document.getElementById('profileAddrForm');
  if (btnEdit) {
    btnEdit.addEventListener('click', function () {
      addrForm.classList.toggle('hidden');
    });
  }

  var btnSave = document.getElementById('btnSaveProfileAddr');
  if (btnSave) {
    btnSave.addEventListener('click', async function () {
      var newAddr = {
        name: document.getElementById('paName').value.trim(),
        phone: document.getElementById('paPhone').value.trim(),
        province: document.getElementById('paRegion').value.trim(),
        city: '',
        district: '',
        detail: document.getElementById('paDetail').value.trim()
      };

      if (!newAddr.name || !newAddr.phone || !newAddr.detail) {
        toast('请填写完整信息', 'warn');
        return;
      }

      try {
        var updated = await apiPut('/api/user/profile', { address: newAddr });
        saveAuth(AUTH.token, updated);
        toast('地址已保存', 'success');
        renderProfilePage();
      } catch (e) {}
    });
  }
}

// --- 初始化 ---
async function init() {
  // 处理微信 OAuth 回调 token
  var wxToken = WX_SDK.extractToken();
  if (wxToken) {
    // 微信自动登录
    try {
      var res = await fetch(C.BASE + '/api/user/profile', {
        headers: { 'Authorization': 'Bearer ' + wxToken }
      });
      if (res.ok) {
        var user = await res.json();
        saveAuth(wxToken, user);
        toast('微信自动登录成功', 'success');
        // 合并本地购物车
        await mergeLocalCart();
      } else {
        throw new Error('Profile fetch failed');
      }
    } catch (e) {
      console.warn('[WX] 自动登录失败，清除无效 token');
    }
  }

  // 恢复认证状态（如果上一步没设置的话）
  if (!AUTH.token) {
    initAuth();
  }

  // 微信环境自动 OAuth
  if (WX_SDK.isWeChat() && !isLoggedIn()) {
    // 延迟 OAuth，先渲染页面
    setTimeout(function () {
      WX_SDK.oauthLogin('snsapi_base');
    }, 3000);
  }

  // 微信 JS-SDK 初始化
  WX_SDK.init();

  // 更新 UI
  updateHeader();
  renderBottomNav();

  // 加载购物车数量
  await updateCartCount();

  // 首次访问欢迎页（仅非微信环境或已登录显示）
  if (!WX_SDK.isWeChat() || isLoggedIn()) {
    setupWelcomeOverlay();
  }

  // 监听 hash 变化
  window.addEventListener('hashchange', function () {
    navigateTo(window.location.hash);
  });

  // 初始导航
  navigateTo(window.location.hash);

  // 认证覆盖层关闭按钮
  var overlay = document.getElementById('authOverlay');
  if (overlay) {
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        hideAuthOverlay();
      }
    });
  }

  // 关闭模态框的 Escape 键
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });
}

// --- 手动触发微信登录 ---
function wxManualLogin() {
  if (!WX_SDK.isWeChat()) {
    showAuthOverlay();
    return;
  }
  WX_SDK.oauthLogin('snsapi_userinfo'); // 弹窗授权获取昵称头像
}

// --- 首次访问欢迎页 ---
function setupWelcomeOverlay() {
  var welcomeOverlay = document.getElementById('welcomeOverlay');
  if (!welcomeOverlay) return;

  // 检查是否首次访问（24小时内不再弹出）
  var lastShown = dbGet('welcome_shown');
  if (lastShown && (Date.now() - lastShown < 24 * 3600 * 1000)) {
    return;
  }

  // 延迟显示，让页面先渲染
  setTimeout(function () {
    welcomeOverlay.classList.add('show');
    dbSet('welcome_shown', Date.now());
  }, 500);

  // 关闭按钮
  var closeBtn = document.getElementById('welcomeClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      welcomeOverlay.classList.remove('show');
    });
  }

  // 点击遮罩关闭
  welcomeOverlay.addEventListener('click', function (e) {
    if (e.target === welcomeOverlay) {
      welcomeOverlay.classList.remove('show');
    }
  });
}

// 启动
document.addEventListener('DOMContentLoaded', init);

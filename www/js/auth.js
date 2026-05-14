// 登录/注册覆盖层

function showAuthOverlay() {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  overlay.classList.add('show');
  renderAuthPanel('login');
}

function hideAuthOverlay() {
  var overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('show');
}

function renderAuthPanel(tab) {
  var panel = document.getElementById('authPanel');
  if (!panel) return;

  var isLogin = tab === 'login';

  var html = '<div class="auth-tabs">' +
    '<div class="auth-tab' + (isLogin ? ' active' : '') + '" data-tab="login">登录</div>' +
    '<div class="auth-tab' + (!isLogin ? ' active' : '') + '" data-tab="register">注册</div>' +
    '</div>';

  html += '<form id="authForm" onsubmit="return false;">';

  if (!isLogin) {
    html += '<div class="form-group">' +
      '<label class="form-label">用户名</label>' +
      '<input class="form-input" type="text" id="authUser" placeholder="2-20个字符" maxlength="20" autocomplete="username">' +
      '</div>';
  } else {
    html += '<div class="form-group">' +
      '<label class="form-label">用户名</label>' +
      '<input class="form-input" type="text" id="authUser" placeholder="请输入用户名" autocomplete="username">' +
      '</div>';
  }

  html += '<div class="form-group">' +
    '<label class="form-label">密码</label>' +
    '<input class="form-input" type="password" id="authPass" placeholder="至少4位密码" autocomplete="' + (isLogin ? 'current-password' : 'new-password') + '">' +
    '</div>';

  if (!isLogin) {
    html += '<div class="form-group">' +
      '<label class="form-label">确认密码</label>' +
      '<input class="form-input" type="password" id="authPass2" placeholder="再次输入密码" autocomplete="new-password">' +
      '</div>';
  }

  html += '<div id="authError" class="form-error" style="margin-bottom:12px;display:none;"></div>';

  html += '<button class="btn btn-primary btn-block" type="submit" id="authSubmit">' +
    (isLogin ? '登录' : '注册') +
    '</button>';

  html += '<p style="text-align:center;margin-top:12px;font-size:0.8rem;color:var(--text-muted);">' +
    (isLogin ? '还没有账号？<a href="#" id="authSwitchReg">立即注册</a>' : '已有账号？<a href="#" id="authSwitchLogin">立即登录</a>') +
    '</p>';

  html += '</form>';

  panel.innerHTML = html;

  // 事件绑定
  panel.querySelectorAll('.auth-tab').forEach(function (el) {
    el.addEventListener('click', function () {
      renderAuthPanel(el.getAttribute('data-tab'));
    });
  });

  var switchReg = panel.querySelector('#authSwitchReg');
  if (switchReg) switchReg.addEventListener('click', function (e) { e.preventDefault(); renderAuthPanel('register'); });

  var switchLogin = panel.querySelector('#authSwitchLogin');
  if (switchLogin) switchLogin.addEventListener('click', function (e) { e.preventDefault(); renderAuthPanel('login'); });

  var form = panel.querySelector('#authForm');
  form.addEventListener('submit', function () {
    handleAuthSubmit(isLogin);
  });

  var submitBtn = panel.querySelector('#authSubmit');
  submitBtn.addEventListener('click', function () {
    handleAuthSubmit(isLogin);
  });
}

async function handleAuthSubmit(isLogin) {
  var username = document.getElementById('authUser').value.trim();
  var password = document.getElementById('authPass').value;
  var errEl    = document.getElementById('authError');
  var btn      = document.getElementById('authSubmit');

  errEl.style.display = 'none';
  errEl.textContent = '';

  // 验证
  if (!username) {
    errEl.textContent = '请输入用户名';
    errEl.style.display = 'block';
    return;
  }
  if (!password) {
    errEl.textContent = '请输入密码';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 4) {
    errEl.textContent = '密码长度不能少于4个字符';
    errEl.style.display = 'block';
    return;
  }

  if (!isLogin) {
    var password2 = document.getElementById('authPass2').value;
    if (password !== password2) {
      errEl.textContent = '两次密码输入不一致';
      errEl.style.display = 'block';
      return;
    }
    if (username.length < 2 || username.length > 20) {
      errEl.textContent = '用户名长度需在2-20个字符之间';
      errEl.style.display = 'block';
      return;
    }
  }

  btn.disabled = true;
  btn.classList.add('btn-loading');
  btn.textContent = isLogin ? '登录中...' : '注册中...';

  try {
    var path = isLogin ? '/api/auth/login' : '/api/auth/register';
    var res = await fetch(C.BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    });

    var data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || '操作失败';
      errEl.style.display = 'block';
      return;
    }

    saveAuth(data.token, data.user);
    hideAuthOverlay();

    // 合并本地购物车
    await mergeLocalCart();

    toast((isLogin ? '登录成功' : '注册成功') + '，欢迎 ' + data.user.username, 'success');

    // 刷新页面
    navigateTo(window.location.hash || '#/home');
  } catch (e) {
    if (e.message !== 'Unauthorized') {
      errEl.textContent = '网络连接失败，请重试';
      errEl.style.display = 'block';
    }
  } finally {
    btn.disabled = false;
    btn.classList.remove('btn-loading');
    btn.textContent = isLogin ? '登录' : '注册';
  }
}

async function mergeLocalCart() {
  var localCart = dbGet(SK.CART);
  if (!localCart || localCart.length === 0) return;

  try {
    await apiPost('/api/cart/merge', { items: localCart });
    dbDel(SK.CART);
  } catch (e) {
    // 静默失败
  }
}

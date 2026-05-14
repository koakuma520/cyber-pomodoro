// UI 工具函数

// --- Toast ---

let _toastTimer = null;

function toast(msg, type) {
  type = type || 'info';
  var container = document.getElementById('toastContainer');
  if (!container) return;

  var el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  container.appendChild(el);

  // 强制回流后添加动画
  void el.offsetWidth;
  el.classList.add('toast-show');

  var timer = setTimeout(function () {
    el.classList.remove('toast-show');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  }, 2500);

  el.addEventListener('click', function () {
    clearTimeout(timer);
    el.classList.remove('toast-show');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 300);
  });
}

// --- Modal ---

function showModal(opts) {
  var overlay = document.getElementById('modalOverlay');
  if (!overlay) return;

  var title   = opts.title   || '';
  var body    = opts.body    || '';
  var confirm = opts.confirm || '确定';
  var cancel  = opts.cancel  || '取消';
  var onConfirm = opts.onConfirm || null;
  var onCancel  = opts.onCancel  || null;
  var showCancel = opts.showCancel !== false;

  var html = '<div class="modal-content">';
  if (title) html += '<div class="modal-header">' + escHtml(title) + '</div>';
  html += '<div class="modal-body">' + body + '</div>';
  html += '<div class="modal-footer">';
  if (showCancel) {
    html += '<button class="btn btn-secondary modal-cancel-btn">' + escHtml(cancel) + '</button>';
  }
  html += '<button class="btn btn-primary modal-confirm-btn">' + escHtml(confirm) + '</button>';
  html += '</div></div>';

  overlay.innerHTML = html;
  overlay.classList.add('modal-show');

  // 事件绑定
  var confirmBtn = overlay.querySelector('.modal-confirm-btn');
  var cancelBtn  = overlay.querySelector('.modal-cancel-btn');

  function close() {
    overlay.classList.remove('modal-show');
    overlay.innerHTML = '';
  }

  confirmBtn.onclick = function () {
    close();
    if (onConfirm) onConfirm();
  };

  if (cancelBtn) {
    cancelBtn.onclick = function () {
      close();
      if (onCancel) onCancel();
    };
  }

  // 点击遮罩关闭
  overlay.onclick = function (e) {
    if (e.target === overlay) {
      close();
      if (onCancel) onCancel();
    }
  };
}

function closeModal() {
  var overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.classList.remove('modal-show');
    overlay.innerHTML = '';
  }
}

// --- Loading ---

function showLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'flex';
}

function hideLoading() {
  var el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

// --- 空状态 ---

function showEmpty(containerId, msg, icon) {
  var el = document.getElementById(containerId);
  if (!el) return;
  icon = icon || '📭';
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">' + icon + '</div><p>' + escHtml(msg) + '</p></div>';
}

// --- HTML 转义 ---

function escHtml(str) {
  if (!str) return '';
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// --- 格式化 ---

function fmtPrice(n) {
  return '¥' + Number(n).toFixed(2);
}

function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  var h = String(d.getHours()).padStart(2, '0');
  var min = String(d.getMinutes()).padStart(2, '0');
  return y + '-' + m + '-' + day + ' ' + h + ':' + min;
}

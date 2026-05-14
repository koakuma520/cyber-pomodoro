// 可复用渲染组件

// --- 底部导航栏（三菜单结构） ---
function renderBottomNav() {
  var nav = document.getElementById('bottomNav');
  if (!nav) return;

  var items = [
    { id: 'gallery', icon: '📸', label: '灵感库',   hash: '#/gallery' },
    { id: 'home',    icon: '🍬', label: '糖铺子',   hash: '#/home' },
    { id: 'consult', icon: '💒', label: '档期咨询', hash: '#/consult' }
  ];

  nav.innerHTML = items.map(function (item) {
    var activeClass = P.currentPage === item.id ? ' active' : '';
    return '<div class="nav-item' + activeClass + '" data-page="' + item.id + '" data-hash="' + item.hash + '">' +
      '<span class="nav-icon">' + item.icon + '</span>' +
      '<span class="nav-label">' + item.label + '</span>' +
      (item.id === 'cart' ? '<span class="nav-badge" id="cartBadge"></span>' : '') +
      '</div>';
  }).join('');

  // 点击事件
  nav.querySelectorAll('.nav-item').forEach(function (el) {
    el.addEventListener('click', function () {
      var hash = el.getAttribute('data-hash');
      window.location.hash = hash;
    });
  });
}

function updateCartBadge() {
  var badge = document.getElementById('cartBadge');
  if (!badge) return;
  if (P.cartCount > 0) {
    badge.textContent = P.cartCount > 99 ? '99+' : P.cartCount;
    badge.classList.add('show');
  } else {
    badge.classList.remove('show');
  }
}

// --- 分类标签 ---
function renderCategoryTabs(selected) {
  selected = selected || 'all';
  var tabs = [
    { id: 'all',     name: '全部',  icon: '🎊' },
    { id: 'candy',   name: '糖果',  icon: '🍬' },
    { id: 'wedding', name: '婚庆',  icon: '💒' },
    { id: 'gift',    name: '伴手礼', icon: '🎁' }
  ];

  var html = '<div class="category-tabs">';
  tabs.forEach(function (t) {
    var activeClass = selected === t.id ? ' active' : '';
    html += '<div class="cat-tab' + activeClass + '" data-cat="' + t.id + '">' + t.icon + ' ' + t.name + '</div>';
  });
  html += '</div>';
  return html;
}

// --- 搜索栏 ---
function renderSearchBar(value) {
  value = value || '';
  return '<div class="search-bar">' +
    '<span class="search-icon">🔍</span>' +
    '<input type="text" id="searchInput" placeholder="搜索糖果、婚庆用品..." value="' + escHtml(value) + '">' +
    '<button class="search-clear' + (value ? ' show' : '') + '" id="searchClear">✕</button>' +
    '</div>';
}

// --- 商品卡片 ---
function renderProductCard(p) {
  var imgSrc = (p.images && p.images.length > 0) ? p.images[0] : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#fef0ed" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="#d4786e" font-size="40">🍬</text></svg>');

  var badgeHtml = '';
  if (p.isFeatured) {
    badgeHtml = '<div class="product-card-badge">热门</div>';
  }

  var originalPriceHtml = '';
  if (p.originalPrice && p.originalPrice > p.price) {
    originalPriceHtml = '<span class="price-original">' + fmtPrice(p.originalPrice) + '</span>';
  }

  return '<div class="product-card" data-id="' + p.id + '">' +
    badgeHtml +
    '<img class="product-card-img" src="' + imgSrc + '" alt="' + escHtml(p.name) + '" loading="lazy">' +
    '<div class="product-card-body">' +
      '<div class="product-card-name">' + escHtml(p.name) + '</div>' +
      '<div class="product-card-price">' +
        '<span class="price">' + fmtPrice(p.price) + '</span>' +
        originalPriceHtml +
        '<span class="product-card-sold" style="margin-left:auto;">已售' + (p.sales || 0) + '</span>' +
      '</div>' +
    '</div>' +
    '</div>';
}

// --- 规格选择器 ---
function renderSpecSelector(specs, selected) {
  selected = selected || {};
  if (!specs || specs.length === 0) return '';

  var html = '';
  specs.forEach(function (spec) {
    html += '<div class="spec-section">';
    html += '<div class="spec-label">' + escHtml(spec.name) + '</div>';
    html += '<div class="spec-options">';
    spec.options.forEach(function (opt) {
      var sel = selected[spec.name] === opt ? ' selected' : '';
      html += '<div class="spec-option' + sel + '" data-spec="' + escHtml(spec.name) + '" data-value="' + escHtml(opt) + '">' + escHtml(opt) + '</div>';
    });
    html += '</div></div>';
  });
  return html;
}

// --- 状态徽章 ---
function renderStatusBadge(status) {
  var info = C.ORDER_STATUS[status] || { name: status, color: '#999' };
  return '<span class="status-badge ' + status + '">' + info.name + '</span>';
}

// --- 订单步骤进度条 ---
function renderSteps(current) {
  var html = '<div class="steps">';
  C.ORDER_STEPS.forEach(function (s) {
    var cls = 'step';
    var idx = C.ORDER_STEPS.indexOf(s);
    var curIdx = C.ORDER_STEPS.indexOf(current);
    if (idx < curIdx) cls += ' done';
    if (idx === curIdx) cls += ' active';
    html += '<div class="' + cls + '">';
    html += '<div class="step-dot"></div>';
    html += '<div class="step-label">' + (C.ORDER_STATUS[s] ? C.ORDER_STATUS[s].name : s) + '</div>';
    html += '</div>';
  });
  html += '</div>';
  return html;
}

// --- 购物车条目 ---
function renderCartItem(item, idx) {
  var imgSrc = item.image || 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72"><rect fill="#fef0ed" width="72" height="72"/><text x="36" y="42" text-anchor="middle" fill="#d4786e" font-size="18">🍬</text></svg>');

  var specsStr = '';
  if (item.selectedSpecs) {
    var parts = [];
    for (var k in item.selectedSpecs) {
      parts.push(k + ': ' + item.selectedSpecs[k]);
    }
    specsStr = parts.join('，');
  }

  return '<div class="cart-item" data-idx="' + idx + '">' +
    '<img class="cart-item-img" src="' + imgSrc + '" alt="' + escHtml(item.name) + '">' +
    '<div class="cart-item-info">' +
      '<div class="cart-item-name">' + escHtml(item.name) + '</div>' +
      (specsStr ? '<div class="cart-item-specs">' + escHtml(specsStr) + '</div>' : '') +
      '<div class="cart-item-price">' + fmtPrice(item.price) + '</div>' +
    '</div>' +
    '<div class="cart-item-qty">' +
      '<button class="qty-btn" data-action="minus">−</button>' +
      '<input class="qty-input" type="number" value="' + item.quantity + '" min="1" max="999" data-action="qty">' +
      '<button class="qty-btn" data-action="plus">+</button>' +
    '</div>' +
    '</div>';
}

// 商品详情页
var productDetailPage = {
  product: null,
  selectedSpecs: {},
  quantity: 1,

  async render(productId) {
    P.currentPage = 'detail';
    updateHeader();
    renderBottomNav();

    var content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">加载中...</div>';

    try {
      this.product = await apiGet('/api/products/' + productId);
      this.selectedSpecs = {};
      this.quantity = 1;
      this.renderDetail();
      this.bindEvents();
    } catch (e) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div><p>商品不存在或已下架</p><button class="btn btn-secondary btn-sm" onclick="window.location.hash=\'#/home\'">返回首页</button></div>';
    }
  },

  renderDetail() {
    var p = this.product;
    var content = document.getElementById('content');

    var imgSrc = (p.images && p.images.length > 0) ? p.images[0] : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect fill="#fef0ed" width="400" height="400"/><text x="200" y="220" text-anchor="middle" fill="#d4786e" font-size="80">🍬</text></svg>');

    var originalPriceHtml = '';
    if (p.originalPrice && p.originalPrice > p.price) {
      originalPriceHtml = '<span class="detail-price-original">' + fmtPrice(p.originalPrice) + '</span>';
    }

    var html = '';

    // 图片
    html += '<div class="card" style="margin-bottom:0;border-radius:var(--radius) var(--radius) 0 0;">';
    html += '<div class="detail-gallery">';
    html += '<img src="' + imgSrc + '" alt="' + escHtml(p.name) + '">';
    html += '</div>';
    html += '</div>';

    // 基本信息
    html += '<div class="card" style="margin-top:0;border-radius:0 0 var(--radius) var(--radius);margin-bottom:12px;">';
    html += '<div class="detail-info">';
    html += '<h1 class="detail-name">' + escHtml(p.name) + '</h1>';
    html += '<div class="detail-price-row">';
    html += '<span class="detail-price">' + fmtPrice(p.price) + '</span>';
    html += originalPriceHtml;
    html += '<span class="detail-sales">已售 ' + (p.sales || 0) + ' 件</span>';
    html += '</div>';

    // 库存提示
    if (p.stock <= 0) {
      html += '<div style="color:var(--error);font-size:0.85rem;margin-bottom:8px;">暂时缺货</div>';
    } else if (p.stock < 20) {
      html += '<div style="color:var(--warning);font-size:0.85rem;margin-bottom:8px;">仅剩 ' + p.stock + ' 件</div>';
    }

    html += '</div></div>';

    // 规格选择
    if (p.specs && p.specs.length > 0) {
      html += '<div class="card"><div class="card-body">';
      html += '<div id="specSelector">' + renderSpecSelector(p.specs, this.selectedSpecs) + '</div>';

      // 数量
      html += '<div class="spec-section">';
      html += '<div class="spec-label">数量</div>';
      html += '<div class="cart-item-qty">';
      html += '<button class="qty-btn" id="qtyMinus">−</button>';
      html += '<input class="qty-input" type="number" id="qtyInput" value="' + this.quantity + '" min="1" max="' + Math.min(p.stock, 999) + '">';
      html += '<button class="qty-btn" id="qtyPlus">+</button>';
      html += '</div></div>';

      html += '</div></div>';
    }

    // 商品描述
    html += '<div class="card"><div class="detail-desc">';
    html += '<h3 style="margin-bottom:8px;font-size:0.95rem;">商品详情</h3>';
    html += '<p>' + escHtml(p.description) + '</p>';
    if (p.subCategory) {
      html += '<p style="margin-top:8px;color:var(--text-muted);font-size:0.8rem;">分类：' + escHtml(C.CATEGORIES[p.category] ? C.CATEGORIES[p.category].name : p.category) + ' > ' + escHtml(p.subCategory) + '</p>';
    }
    html += '</div></div>';

    // 底部操作栏
    var showActionBar = p.stock > 0;
    html += '<div class="action-bar" id="actionBar" style="' + (showActionBar ? '' : 'display:none;') + '">';
    html += '<button class="btn btn-outline" id="btnAddCart">加入购物车</button>';
    html += '<button class="btn btn-primary" id="btnBuyNow">立即购买</button>';
    html += '</div>';

    // 缺货提示栏
    if (!showActionBar) {
      html += '<div class="action-bar" style="justify-content:center;">';
      html += '<span style="color:var(--text-muted);">该商品暂时缺货</span>';
      html += '</div>';
    }

    content.innerHTML = html;

    // 选中默认规格
    if (p.specs && p.specs.length > 0) {
      var self = this;
      p.specs.forEach(function (spec) {
        if (!self.selectedSpecs[spec.name] && spec.options.length > 0) {
          self.selectedSpecs[spec.name] = spec.options[0];
          var firstOpt = document.querySelector('.spec-option[data-spec="' + spec.name + '"][data-value="' + spec.options[0] + '"]');
          if (firstOpt) firstOpt.classList.add('selected');
        }
      });
    }

    this.updateActionBarState();
  },

  bindEvents() {
    var self = this;

    // 规格选择
    document.querySelectorAll('.spec-option').forEach(function (el) {
      el.addEventListener('click', function () {
        var specName = el.getAttribute('data-spec');
        var specVal  = el.getAttribute('data-value');

        // 取消同规格其他选项
        document.querySelectorAll('.spec-option[data-spec="' + specName + '"]').forEach(function (s) {
          s.classList.remove('selected');
        });
        el.classList.add('selected');
        self.selectedSpecs[specName] = specVal;
        self.updateActionBarState();
      });
    });

    // 数量
    var qtyInput  = document.getElementById('qtyInput');
    var qtyMinus  = document.getElementById('qtyMinus');
    var qtyPlus   = document.getElementById('qtyPlus');

    if (qtyMinus) qtyMinus.addEventListener('click', function () {
      if (self.quantity > 1) {
        self.quantity--;
        qtyInput.value = self.quantity;
      }
    });

    if (qtyPlus) qtyPlus.addEventListener('click', function () {
      var max = self.product.stock || 999;
      if (self.quantity < max) {
        self.quantity++;
        qtyInput.value = self.quantity;
      }
    });

    if (qtyInput) qtyInput.addEventListener('change', function () {
      var v = parseInt(qtyInput.value);
      var max = self.product.stock || 999;
      if (isNaN(v) || v < 1) v = 1;
      if (v > max) v = max;
      self.quantity = v;
      qtyInput.value = v;
    });

    // 加入购物车
    var btnAddCart = document.getElementById('btnAddCart');
    if (btnAddCart) btnAddCart.addEventListener('click', function () {
      self.addToCart();
    });

    // 立即购买
    var btnBuyNow = document.getElementById('btnBuyNow');
    if (btnBuyNow) btnBuyNow.addEventListener('click', function () {
      self.buyNow();
    });
  },

  updateActionBarState() {
    var p = this.product;
    var allSelected = true;
    if (p.specs && p.specs.length > 0) {
      p.specs.forEach(function (spec) {
        if (!self.selectedSpecs[spec.name]) allSelected = false;
      });
    }

    var btnAddCart = document.getElementById('btnAddCart');
    var btnBuyNow  = document.getElementById('btnBuyNow');

    if (btnAddCart) btnAddCart.disabled = !allSelected;
    if (btnBuyNow)  btnBuyNow.disabled  = !allSelected;
  },

  async addToCart() {
    if (!isLoggedIn()) {
      // 保存到本地购物车
      this.addToLocalCart();
      return;
    }

    try {
      await apiPost('/api/cart/items', {
        productId: this.product.id,
        name: this.product.name,
        price: this.product.price,
        image: (this.product.images && this.product.images.length > 0) ? this.product.images[0] : '',
        quantity: this.quantity,
        selectedSpecs: this.selectedSpecs
      });
      toast('已加入购物车', 'success');
      await updateCartCount();
    } catch (e) {
      // 错误已在 apiPost 中处理
    }
  },

  addToLocalCart() {
    var cart = dbGet(SK.CART) || [];
    var specs = JSON.stringify(this.selectedSpecs);
    var existIdx = cart.findIndex(function (i) {
      return i.productId === self.product.id && JSON.stringify(i.selectedSpecs) === specs;
    });

    if (existIdx >= 0) {
      cart[existIdx].quantity += self.quantity;
    } else {
      cart.push({
        productId: self.product.id,
        name: self.product.name,
        price: self.product.price,
        image: (self.product.images && self.product.images.length > 0) ? self.product.images[0] : '',
        quantity: self.quantity,
        selectedSpecs: self.selectedSpecs
      });
    }

    dbSet(SK.CART, cart);
    toast('已加入购物车（未登录，数据仅保存在本地）', 'warn');
    updateCartCount();
  },

  async buyNow() {
    await this.addToCart();
    window.location.hash = '#/cart';
  }
};

var self = productDetailPage;

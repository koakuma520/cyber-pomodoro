// 购物车页面
var cartPage = {
  cart: null,
  loading: false,

  async render() {
    if (!isLoggedIn()) {
      showAuthOverlay();
      // 显示本地购物车
      this.renderLocalCart();
      return;
    }

    P.currentPage = 'cart';
    updateHeader();
    renderBottomNav();

    await this.loadCart();
  },

  renderLocalCart() {
    P.currentPage = 'cart';
    updateHeader();
    renderBottomNav();

    var items = dbGet(SK.CART) || [];
    this.renderCartView({ items: items });
  },

  async loadCart() {
    var content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">加载中...</div>';

    try {
      this.cart = await apiGet('/api/cart');
      this.renderCartView(this.cart);
    } catch (e) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div><p>加载失败</p></div>';
    }
  },

  renderCartView(cart) {
    var content = document.getElementById('content');
    var items = cart.items || [];

    if (items.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><p>购物车是空的</p><a href="#/home" class="btn btn-primary btn-sm">去逛逛</a></div>';
      document.getElementById('cartBadge') && document.getElementById('cartBadge').classList.remove('show');
      return;
    }

    var totalAmount = items.reduce(function (sum, item) {
      return sum + item.price * item.quantity;
    }, 0);

    var html = '';

    // 购物车列表
    html += '<div class="card">';
    html += '<div class="card-header"><span class="card-title">购物车</span><span style="font-size:0.8rem;color:var(--text-muted);">' + items.length + ' 件商品</span></div>';

    items.forEach(function (item, idx) {
      html += renderCartItem(item, idx);
    });

    html += '</div>';

    // 合计与结算
    html += '<div style="height:80px;"></div>'; // 为底部操作栏留空
    html += '<div class="action-bar" style="bottom:0;">';
    html += '<div style="flex:1;">';
    html += '<span style="font-size:0.85rem;color:var(--text-secondary);">合计：</span>';
    html += '<span style="font-size:1.3rem;font-weight:700;color:var(--accent);">' + fmtPrice(totalAmount) + '</span>';
    html += '</div>';
    html += '<button class="btn btn-primary" id="btnCheckout" style="flex:1;">去结算</button>';
    html += '</div>';

    content.innerHTML = html;

    this.bindEvents(items);
  },

  bindEvents(items) {
    var self = this;

    // 数量调整
    document.querySelectorAll('.cart-item').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-idx'));
      var item = items[idx];

      el.querySelectorAll('.qty-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var action = btn.getAttribute('data-action');
          var qtyInput = el.querySelector('.qty-input');
          var qty = parseInt(qtyInput.value);

          if (action === 'minus') qty = Math.max(1, qty - 1);
          if (action === 'plus')  qty = Math.min(999, qty + 1);

          qtyInput.value = qty;
          self.updateItemQty(item, qty);
        });
      });

      var qtyInput = el.querySelector('.qty-input');
      if (qtyInput) {
        var changeTimer;
        qtyInput.addEventListener('input', function () {
          clearTimeout(changeTimer);
          changeTimer = setTimeout(function () {
            var qty = parseInt(qtyInput.value);
            if (isNaN(qty) || qty < 1) qty = 1;
            qtyInput.value = qty;
            self.updateItemQty(item, qty);
          }, 500);
        });
      }
    });

    // 结算
    var btnCheckout = document.getElementById('btnCheckout');
    if (btnCheckout) {
      btnCheckout.addEventListener('click', function () {
        window.location.hash = '#/checkout';
      });
    }
  },

  async updateItemQty(item, qty) {
    if (!isLoggedIn()) {
      var cart = dbGet(SK.CART) || [];
      var found = cart.find(function (i) {
        return i.productId === item.productId && JSON.stringify(i.selectedSpecs) === JSON.stringify(item.selectedSpecs);
      });
      if (found) found.quantity = qty;
      dbSet(SK.CART, cart);
      updateCartCount();
      this.renderLocalCart();
      return;
    }

    try {
      await apiPut('/api/cart/items/' + item.productId, {
        quantity: qty,
        selectedSpecs: item.selectedSpecs
      });
      await updateCartCount();
    } catch (e) {
      // 错误已在 apiPut 中处理
    }
  }
};

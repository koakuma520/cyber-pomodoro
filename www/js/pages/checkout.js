// 结算页面
var checkoutPage = {
  cart: null,
  address: null,

  async render() {
    if (!isLoggedIn()) {
      showAuthOverlay();
      return;
    }

    P.currentPage = 'checkout';
    updateHeader();
    renderBottomNav();

    var content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">加载中...</div>';

    try {
      this.cart = await apiGet('/api/cart');
      if (!this.cart.items || this.cart.items.length === 0) {
        content.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><p>购物车是空的，请先添加商品</p><a href="#/home" class="btn btn-primary btn-sm">去逛逛</a></div>';
        return;
      }

      this.loadAddress();
      this.renderCheckout();
      this.bindEvents();
    } catch (e) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div><p>加载失败</p></div>';
    }
  },

  loadAddress() {
    if (AUTH.user && AUTH.user.address) {
      this.address = AUTH.user.address;
    } else {
      // 尝试从草稿加载
      var draft = dbGet(SK.DRAFT);
      if (draft) this.address = draft;
    }
  },

  renderCheckout() {
    var content = document.getElementById('content');
    var items = this.cart.items;
    var totalAmount = items.reduce(function (sum, item) {
      return sum + item.price * item.quantity;
    }, 0);

    var addr = this.address;
    var hasAddr = !!(addr && addr.name && addr.phone && addr.detail);

    var html = '';

    // 收货地址
    html += '<div class="card"><div class="card-body">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">';
    html += '<h3 style="font-size:0.95rem;font-weight:600;">收货地址</h3>';
    html += '<button class="btn btn-xs btn-outline" id="btnEditAddr">' + (hasAddr ? '修改' : '填写') + '</button>';
    html += '</div>';

    if (hasAddr) {
      html += '<div id="addrDisplay" style="font-size:0.9rem;">';
      html += '<div style="font-weight:500;">' + escHtml(addr.name) + ' ' + escHtml(addr.phone) + '</div>';
      html += '<div style="color:var(--text-secondary);">' + escHtml(addr.province || '') + escHtml(addr.city || '') + escHtml(addr.district || '') + ' ' + escHtml(addr.detail || '') + '</div>';
      html += '</div>';
    } else {
      html += '<div id="addrDisplay" style="color:var(--text-muted);font-size:0.85rem;">请填写收货地址</div>';
    }

    // 地址表单（默认隐藏）
    html += '<div id="addrForm" class="hidden">';
    html += '<div class="form-group"><label class="form-label">收货人</label><input class="form-input" id="addrName" placeholder="请输入收货人姓名" value="' + escHtml(addr ? addr.name || '' : '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">联系电话</label><input class="form-input" id="addrPhone" placeholder="请输入手机号" value="' + escHtml(addr ? addr.phone || '' : '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">省/市/区</label><input class="form-input" id="addrRegion" placeholder="如：广东省深圳市南山区" value="' + escHtml(addr ? (addr.province||'') + (addr.city||'') + (addr.district||'') : '') + '"></div>';
    html += '<div class="form-group"><label class="form-label">详细地址</label><input class="form-input" id="addrDetail" placeholder="街道、门牌号等" value="' + escHtml(addr ? addr.detail || '' : '') + '"></div>';
    html += '<button class="btn btn-primary btn-sm btn-block" id="btnSaveAddr">保存地址</button>';
    html += '</div>';

    html += '</div></div>';

    // 订单商品
    html += '<div class="card"><div class="card-header"><span class="card-title">商品信息</span><span style="font-size:0.8rem;color:var(--text-muted);">共 ' + items.length + ' 件</span></div>';

    items.forEach(function (item) {
      var specsStr = '';
      if (item.selectedSpecs) {
        var parts = [];
        for (var k in item.selectedSpecs) { parts.push(k + ': ' + item.selectedSpecs[k]); }
        specsStr = parts.join('，');
      }

      html += '<div class="cart-item" style="border-bottom:1px solid var(--border-light);">';
      html += '<div style="flex:1;">';
      html += '<div style="font-size:0.9rem;font-weight:500;">' + escHtml(item.name) + '</div>';
      if (specsStr) html += '<div style="font-size:0.75rem;color:var(--text-muted);">' + escHtml(specsStr) + '</div>';
      html += '<div style="font-size:0.85rem;color:var(--accent);">' + fmtPrice(item.price) + ' × ' + item.quantity + '</div>';
      html += '</div>';
      html += '<div style="font-weight:600;">' + fmtPrice(item.price * item.quantity) + '</div>';
      html += '</div>';
    });

    html += '</div>';

    // 备注
    html += '<div class="card"><div class="card-body">';
    html += '<div class="form-group" style="margin-bottom:0;">';
    html += '<label class="form-label">订单备注（选填）</label>';
    html += '<textarea class="form-textarea" id="orderNote" placeholder="如有特殊要求请在此备注..."></textarea>';
    html += '</div>';
    html += '</div></div>';

    // 支付方式
    html += '<div class="card"><div class="card-body">';
    html += '<h3 style="font-size:0.95rem;font-weight:600;margin-bottom:10px;">支付方式</h3>';

    if (WX_SDK.isWeChat()) {
      // 微信环境：微信支付
      html += '<div class="pay-method-card selected" data-method="wxpay">';
      html += '<span class="pay-icon">💚</span>';
      html += '<span class="pay-name">微信支付</span>';
      html += '</div>';
    } else {
      // 非微信环境：模拟支付
      html += '<div class="pay-method-card selected" data-method="mock">';
      html += '<span class="pay-icon">💳</span>';
      html += '<span class="pay-name">模拟支付（测试用）</span>';
      html += '</div>';
    }
    html += '</div></div>';

    // 底部提交
    html += '<div style="height:80px;"></div>';
    html += '<div class="action-bar" style="bottom:0;">';
    html += '<div style="flex:1;">';
    html += '<span style="font-size:0.85rem;color:var(--text-secondary);">应付：</span>';
    html += '<span style="font-size:1.3rem;font-weight:700;color:var(--accent);">' + fmtPrice(totalAmount) + '</span>';
    html += '</div>';
    html += '<button class="btn btn-primary" id="btnSubmitOrder" style="flex:1;">提交订单</button>';
    html += '</div>';

    content.innerHTML = html;
  },

  bindEvents() {
    var self = this;

    // 编辑地址
    var btnEditAddr = document.getElementById('btnEditAddr');
    var addrForm = document.getElementById('addrForm');
    var addrDisplay = document.getElementById('addrDisplay');

    if (btnEditAddr) {
      btnEditAddr.addEventListener('click', function () {
        addrForm.classList.toggle('hidden');
        btnEditAddr.textContent = addrForm.classList.contains('hidden') ? '修改' : '收起';
      });
    }

    // 保存地址
    var btnSaveAddr = document.getElementById('btnSaveAddr');
    if (btnSaveAddr) {
      btnSaveAddr.addEventListener('click', function () {
        var addr = {
          name: document.getElementById('addrName').value.trim(),
          phone: document.getElementById('addrPhone').value.trim(),
          province: '',
          city: '',
          district: '',
          detail: document.getElementById('addrDetail').value.trim()
        };

        var region = document.getElementById('addrRegion').value.trim();
        addr.province = region; // 简化处理

        if (!addr.name || !addr.phone || !addr.detail) {
          toast('请填写完整的收货信息', 'warn');
          return;
        }

        if (!/^1\d{10}$/.test(addr.phone)) {
          toast('手机号格式不正确', 'warn');
          return;
        }

        self.address = addr;
        dbSet(SK.DRAFT, addr);

        // 更新显示
        addrDisplay.innerHTML = '<div style="font-weight:500;">' + escHtml(addr.name) + ' ' + escHtml(addr.phone) + '</div>' +
          '<div style="color:var(--text-secondary);">' + escHtml(addr.province) + ' ' + escHtml(addr.detail) + '</div>';

        addrForm.classList.add('hidden');
        btnEditAddr.textContent = '修改';
        toast('地址已保存', 'success');
      });
    }

    // 支付方式选择
    document.querySelectorAll('.pay-method-card').forEach(function (card) {
      card.addEventListener('click', function () {
        document.querySelectorAll('.pay-method-card').forEach(function (c) { c.classList.remove('selected'); });
        card.classList.add('selected');
      });
    });

    // 提交订单
    var btnSubmit = document.getElementById('btnSubmitOrder');
    if (btnSubmit) {
      btnSubmit.addEventListener('click', function () {
        self.submitOrder();
      });
    }
  },

  async submitOrder() {
    if (!this.address || !this.address.name || !this.address.phone || !this.address.detail) {
      toast('请先填写收货地址', 'warn');
      return;
    }

    var paymentMethod = 'mock';
    var selectedPay = document.querySelector('.pay-method-card.selected');
    if (selectedPay) paymentMethod = selectedPay.getAttribute('data-method');

    var note = document.getElementById('orderNote') ? document.getElementById('orderNote').value.trim() : '';

    var btn = document.getElementById('btnSubmitOrder');
    btn.disabled = true;
    btn.classList.add('btn-loading');
    btn.textContent = '提交中...';

    try {
      // 1. 创建订单
      var order = await apiPost('/api/orders', {
        shippingAddress: this.address,
        note: note,
        paymentMethod: paymentMethod
      });

      // 2. 支付
      if (paymentMethod === 'wxpay' && WX_SDK.isWeChat()) {
        // 微信支付
        btn.textContent = '正在拉起微信支付...';
        try {
          await WX_SDK.requestPayment(order.id, order.totalAmount);
          // 支付成功后更新订单状态
          await apiPost('/api/orders/' + order.id + '/pay');
          toast('支付成功！订单号：' + order.id, 'success');
        } catch (payErr) {
          toast(payErr.message || '支付未完成，可在订单中重新支付', 'warn');
        }
      } else {
        // 模拟支付
        await apiPost('/api/orders/' + order.id + '/pay');
        toast('下单成功！订单号：' + order.id, 'success');
      }

      await updateCartCount();
      window.location.hash = '#/orders';
    } catch (e) {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.textContent = '提交订单';
    }
  }
};

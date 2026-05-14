// 我的订单页面
var ordersPage = {
  orders: [],
  statusFilter: 'all',
  page: 1,

  async render() {
    if (!isLoggedIn()) {
      showAuthOverlay();
      return;
    }

    P.currentPage = 'orders';
    updateHeader();
    renderBottomNav();

    await this.loadOrders();
  },

  async loadOrders() {
    var content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">加载中...</div>';

    try {
      var data = await apiGet('/api/orders', { status: this.statusFilter, page: this.page, limit: 50 });
      this.orders = data.items;
      this.renderOrders();
    } catch (e) {
      content.innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div><p>加载失败</p></div>';
    }
  },

  renderOrders() {
    var content = document.getElementById('content');
    var self = this;

    var html = '';

    // 状态标签
    var tabs = [
      { id: 'all',  name: '全部' },
      { id: 'pending', name: '待付款' },
      { id: 'paid', name: '已付款' },
      { id: 'shipped', name: '已发货' },
      { id: 'completed', name: '已完成' }
    ];

    html += '<div class="tabs">';
    tabs.forEach(function (t) {
      var activeClass = self.statusFilter === t.id ? ' active' : '';
      html += '<div class="tab' + activeClass + '" data-status="' + t.id + '">' + t.name + '</div>';
    });
    html += '</div>';

    // 订单列表
    if (this.orders.length === 0) {
      html += '<div class="empty-state"><div class="empty-icon">📋</div><p>暂无订单</p><a href="#/home" class="btn btn-primary btn-sm">去逛逛</a></div>';
    } else {
      html += '<div id="orderList">';
      this.orders.forEach(function (order) {
        html += self.renderOrderCard(order);
      });
      html += '</div>';
    }

    content.innerHTML = html;
    this.bindEvents();
  },

  renderOrderCard(order) {
    var statusInfo = C.ORDER_STATUS[order.status] || { name: order.status, color: '#999' };
    var itemsPreview = order.items.slice(0, 4).map(function (item) {
      var imgSrc = item.image || '';
      if (!imgSrc) {
        imgSrc = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect fill="#fef0ed" width="56" height="56"/><text x="28" y="32" text-anchor="middle" fill="#d4786e" font-size="14">🍬</text></svg>');
      }
      return '<img class="order-item-thumb" src="' + imgSrc + '" alt="' + escHtml(item.name) + '">';
    }).join('');

    var actionsHtml = '';
    if (order.status === 'pending') {
      actionsHtml = '<button class="btn btn-primary btn-xs order-pay" data-id="' + order.id + '">去支付</button>' +
        '<button class="btn btn-secondary btn-xs order-cancel" data-id="' + order.id + '" style="margin-left:6px;">取消</button>';
    } else if (order.status === 'shipped') {
      actionsHtml = '<button class="btn btn-primary btn-xs order-confirm" data-id="' + order.id + '">确认收货</button>';
    }

    var html = '<div class="order-card">';
    html += '<div class="order-card-header">';
    html += '<div><span style="color:var(--text-muted);">订单号：</span>' + order.id + '</div>';
    html += renderStatusBadge(order.status);
    html += '</div>';

    html += '<div class="order-card-body">';
    html += '<div class="order-items-preview">' + itemsPreview + '</div>';
    if (order.items.length > 4) {
      html += '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">还有 ' + (order.items.length - 4) + ' 件商品...</div>';
    }
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">';
    html += '<span style="font-size:0.8rem;color:var(--text-muted);">' + fmtDate(order.createdAt) + '</span>';
    html += '<span style="font-size:0.85rem;">共 ' + order.items.reduce(function(s,i){return s+i.quantity;},0) + ' 件，合计 <strong style="color:var(--accent);">' + fmtPrice(order.totalAmount) + '</strong></span>';
    html += '</div>';
    html += '</div>';

    if (actionsHtml) {
      html += '<div class="order-card-footer" style="justify-content:flex-end;">' + actionsHtml + '</div>';
    }

    html += '</div>';
    return html;
  },

  bindEvents() {
    var self = this;

    // 状态标签切换
    document.querySelectorAll('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        self.statusFilter = tab.getAttribute('data-status');
        self.page = 1;
        self.loadOrders();
      });
    });

    // 支付
    document.querySelectorAll('.order-pay').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        btn.textContent = '支付中...';
        try {
          await apiPost('/api/orders/' + btn.getAttribute('data-id') + '/pay');
          toast('支付成功', 'success');
          self.loadOrders();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = '去支付';
        }
      });
    });

    // 取消
    document.querySelectorAll('.order-cancel').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var orderId = btn.getAttribute('data-id');
        showModal({
          title: '取消订单',
          body: '确定要取消该订单吗？',
          confirm: '确定取消',
          cancel: '再想想',
          onConfirm: async function () {
            try {
              await apiPost('/api/orders/' + orderId + '/cancel');
              toast('订单已取消', 'success');
              self.loadOrders();
            } catch (e) {}
          }
        });
      });
    });

    // 确认收货
    document.querySelectorAll('.order-confirm').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        btn.textContent = '确认中...';
        try {
          await apiPut('/api/admin/orders/' + btn.getAttribute('data-id'), { status: 'completed' });
          toast('已确认收货', 'success');
          self.loadOrders();
        } catch (e) {
          btn.disabled = false;
          btn.textContent = '确认收货';
        }
      });
    });
  }
};

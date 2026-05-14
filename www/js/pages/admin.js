// 管理后台面板
var adminPage = {
  currentView: 'stats',
  stats: null,

  async render() {
    if (!isAdmin()) {
      document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><p>需要管理员权限</p></div>';
      return;
    }

    P.currentPage = 'admin';
    updateHeader();
    renderBottomNav();

    var content = document.getElementById('content');
    content.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-muted);">加载中...</div>';

    await this.loadView('stats');
  },

  async loadView(view) {
    this.currentView = view;

    try {
      switch (view) {
        case 'stats':   await this.renderStats(); break;
        case 'products':await this.renderProducts(); break;
        case 'orders':  await this.renderOrders(); break;
      }
    } catch (e) {
      document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div><p>加载失败</p></div>';
    }
  },

  renderViewNav() {
    var views = [
      { id: 'stats',    name: '仪表板', icon: '📊' },
      { id: 'products', name: '商品管理', icon: '📦' },
      { id: 'orders',   name: '订单管理', icon: '📋' }
    ];

    var html = '<div class="tabs" style="margin-bottom:16px;">';
    views.forEach(function (v) {
      var activeClass = adminPage.currentView === v.id ? ' active' : '';
      html += '<div class="tab' + activeClass + '" data-view="' + v.id + '">' + v.icon + ' ' + v.name + '</div>';
    });
    html += '</div>';
    return html;
  },

  async renderStats() {
    this.stats = await apiGet('/api/admin/stats');
    var s = this.stats;

    var html = this.renderViewNav();

    html += '<div class="admin-stats">';
    html += '<div class="stat-card"><div class="stat-value">' + s.totalOrders + '</div><div class="stat-label">总订单数</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + fmtPrice(s.totalRevenue) + '</div><div class="stat-label">总收入</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + s.totalProducts + '</div><div class="stat-label">商品数</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + s.totalUsers + '</div><div class="stat-label">用户数</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + s.pendingOrders + '</div><div class="stat-label">待处理订单</div></div>';
    html += '<div class="stat-card"><div class="stat-value">' + s.paidOrders + '</div><div class="stat-label">待发货订单</div></div>';
    html += '</div>';

    // 分类统计
    if (s.byCategory) {
      html += '<div class="card"><div class="card-header"><span class="card-title">商品分类统计</span></div><div class="card-body">';
      for (var cat in s.byCategory) {
        var catInfo = C.CATEGORIES[cat] || { name: cat };
        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light);">';
        html += '<span>' + (catInfo.icon || '') + ' ' + catInfo.name + '</span>';
        html += '<span style="font-weight:500;">' + s.byCategory[cat] + ' 件</span>';
        html += '</div>';
      }
      html += '</div></div>';
    }

    document.getElementById('content').innerHTML = html;
    this.bindViewNav();
  },

  async renderProducts() {
    var data = await apiGet('/api/products', { limit: 100 });
    var products = data.items;
    var html = this.renderViewNav();

    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<span style="font-size:0.9rem;color:var(--text-secondary);">共 ' + data.total + ' 件商品</span>';
    html += '<button class="btn btn-primary btn-sm" id="btnAddProduct">+ 新增商品</button>';
    html += '</div>';

    html += '<div class="card" style="overflow-x:auto;">';
    html += '<table class="data-table">';
    html += '<thead><tr><th>商品名称</th><th>分类</th><th>价格</th><th>库存</th><th>销量</th><th>状态</th><th>操作</th></tr></thead>';
    html += '<tbody>';

    products.forEach(function (p) {
      var catInfo = C.CATEGORIES[p.category] || { name: p.category };
      html += '<tr>';
      html += '<td>' + escHtml(p.name) + '</td>';
      html += '<td>' + (catInfo.icon || '') + ' ' + catInfo.name + '</td>';
      html += '<td>' + fmtPrice(p.price) + '</td>';
      html += '<td>' + p.stock + '</td>';
      html += '<td>' + (p.sales || 0) + '</td>';
      html += '<td>' + (p.isOnSale ? '✅ 上架' : '⬇️ 下架') + '</td>';
      html += '<td>';
      html += '<button class="btn btn-xs btn-outline btn-edit-product" data-id="' + p.id + '" style="margin-right:4px;">编辑</button>';
      html += '<button class="btn btn-xs btn-secondary btn-del-product" data-id="' + p.id + '">删除</button>';
      html += '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';

    // 新增/编辑商品模态框
    html += '<div id="productFormModal" class="modal-overlay" style="display:none;">';
    html += '<div class="modal-content" style="max-width:500px;"><div class="modal-header" id="productFormTitle">新增商品</div>';
    html += '<div class="modal-body">';
    html += '<div class="form-group"><label class="form-label">商品名称</label><input class="form-input" id="pfName"></div>';
    html += '<div class="form-group"><label class="form-label">分类</label><select class="form-select" id="pfCategory"><option value="candy">糖果</option><option value="wedding">婚庆</option><option value="gift">伴手礼</option></select></div>';
    html += '<div class="form-group"><label class="form-label">子分类</label><input class="form-input" id="pfSubCat" placeholder="如：喜糖盒"></div>';
    html += '<div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="pfDesc" rows="3"></textarea></div>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<div class="form-group" style="flex:1;"><label class="form-label">售价</label><input class="form-input" type="number" id="pfPrice" step="0.01" min="0"></div>';
    html += '<div class="form-group" style="flex:1;"><label class="form-label">原价</label><input class="form-input" type="number" id="pfOrigPrice" step="0.01" min="0"></div>';
    html += '</div>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<div class="form-group" style="flex:1;"><label class="form-label">库存</label><input class="form-input" type="number" id="pfStock" min="0" value="0"></div>';
    html += '<div class="form-group" style="flex:1;display:flex;align-items:center;gap:10px;padding-top:24px;">';
    html += '<label style="font-size:0.85rem;"><input type="checkbox" id="pfFeatured"> 首页精选</label>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="modal-footer">';
    html += '<button class="btn btn-secondary" id="btnPfCancel">取消</button>';
    html += '<button class="btn btn-primary" id="btnPfSave">保存</button>';
    html += '</div></div></div>';

    document.getElementById('content').innerHTML = html;
    this.bindViewNav();
    this.bindProductEvents(products);
  },

  bindProductEvents(products) {
    var self = this;

    document.getElementById('btnAddProduct').addEventListener('click', function () {
      self.showProductForm(null);
    });

    document.querySelectorAll('.btn-edit-product').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var p = products.find(function (p) { return p.id === id; });
        self.showProductForm(p);
      });
    });

    document.querySelectorAll('.btn-del-product').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var p = products.find(function (p) { return p.id === id; });
        showModal({
          title: '删除商品',
          body: '确定要删除「' + p.name + '」吗？此操作不可撤销。',
          confirm: '删除',
          onConfirm: async function () {
            await apiDelete('/api/admin/products/' + id);
            toast('已删除', 'success');
            self.loadView('products');
          }
        });
      });
    });

    // 表单按钮
    document.getElementById('btnPfCancel').addEventListener('click', function () {
      document.getElementById('productFormModal').style.display = 'none';
    });

    document.getElementById('btnPfSave').addEventListener('click', async function () {
      var isEdit = !!document.getElementById('productFormModal').getAttribute('data-edit-id');
      var editId = document.getElementById('productFormModal').getAttribute('data-edit-id');

      var data = {
        name: document.getElementById('pfName').value.trim(),
        category: document.getElementById('pfCategory').value,
        subCategory: document.getElementById('pfSubCat').value.trim(),
        description: document.getElementById('pfDesc').value.trim(),
        price: parseFloat(document.getElementById('pfPrice').value),
        originalPrice: parseFloat(document.getElementById('pfOrigPrice').value) || undefined,
        stock: parseInt(document.getElementById('pfStock').value) || 0,
        isFeatured: document.getElementById('pfFeatured').checked
      };

      if (!data.name || isNaN(data.price)) {
        toast('请填写商品名称和价格', 'warn');
        return;
      }

      try {
        if (isEdit) {
          await apiPut('/api/admin/products/' + editId, data);
          toast('商品已更新', 'success');
        } else {
          await apiPost('/api/admin/products', data);
          toast('商品已创建', 'success');
        }
        document.getElementById('productFormModal').style.display = 'none';
        self.loadView('products');
      } catch (e) {}
    });
  },

  showProductForm(p) {
    var modal = document.getElementById('productFormModal');
    var title = document.getElementById('productFormTitle');

    if (p) {
      title.textContent = '编辑商品';
      modal.setAttribute('data-edit-id', p.id);
      document.getElementById('pfName').value = p.name;
      document.getElementById('pfCategory').value = p.category;
      document.getElementById('pfSubCat').value = p.subCategory || '';
      document.getElementById('pfDesc').value = p.description || '';
      document.getElementById('pfPrice').value = p.price;
      document.getElementById('pfOrigPrice').value = p.originalPrice || '';
      document.getElementById('pfStock').value = p.stock || 0;
      document.getElementById('pfFeatured').checked = !!p.isFeatured;
    } else {
      title.textContent = '新增商品';
      modal.removeAttribute('data-edit-id');
      document.getElementById('pfName').value = '';
      document.getElementById('pfCategory').value = 'candy';
      document.getElementById('pfSubCat').value = '';
      document.getElementById('pfDesc').value = '';
      document.getElementById('pfPrice').value = '';
      document.getElementById('pfOrigPrice').value = '';
      document.getElementById('pfStock').value = '0';
      document.getElementById('pfFeatured').checked = false;
    }

    modal.style.display = 'flex';
  },

  async renderOrders() {
    var data = await apiGet('/api/admin/orders', { limit: 100 });
    var orders = data.items;
    var html = this.renderViewNav();

    html += '<div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">共 ' + data.total + ' 个订单</div>';

    orders.forEach(function (order) {
      html += '<div class="order-card">';
      html += '<div class="order-card-header">';
      html += '<div><span style="color:var(--text-muted);">' + order.id + '</span> <span style="font-size:0.8rem;">by ' + escHtml(order.username) + '</span></div>';
      html += renderStatusBadge(order.status);
      html += '</div>';
      html += '<div class="order-card-body">';
      html += '<div style="font-size:0.85rem;margin-bottom:6px;">';
      html += '收货人：' + escHtml(order.shippingAddress.name) + ' ' + escHtml(order.shippingAddress.phone) + '<br>';
      html += '地址：' + escHtml(order.shippingAddress.province || '') + ' ' + escHtml(order.shippingAddress.detail || '');
      html += '</div>';
      html += '<div style="display:flex;justify-content:space-between;">';
      html += '<span style="font-size:0.8rem;color:var(--text-muted);">' + fmtDate(order.createdAt) + '</span>';
      html += '<span style="font-weight:500;">' + fmtPrice(order.totalAmount) + '</span>';
      html += '</div>';
      html += '</div>';
      html += '<div class="order-card-footer" style="justify-content:flex-end;">';
      if (order.status === 'paid') {
        html += '<button class="btn btn-primary btn-xs order-ship" data-id="' + order.id + '">发货</button>';
      }
      if (order.status === 'pending') {
        html += '<button class="btn btn-secondary btn-xs order-admin-cancel" data-id="' + order.id + '" style="margin-left:6px;">取消</button>';
      }
      html += '</div>';
      html += '</div>';
    });

    document.getElementById('content').innerHTML = html;
    this.bindViewNav();
    this.bindOrderEvents();
  },

  bindOrderEvents() {
    var self = this;

    document.querySelectorAll('.order-ship').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        try {
          await apiPut('/api/admin/orders/' + btn.getAttribute('data-id'), { status: 'shipped' });
          toast('已标记为发货', 'success');
          self.loadView('orders');
        } catch (e) { btn.disabled = false; }
      });
    });

    document.querySelectorAll('.order-admin-cancel').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        try {
          await apiPut('/api/admin/orders/' + btn.getAttribute('data-id'), { status: 'cancelled' });
          toast('订单已取消', 'success');
          self.loadView('orders');
        } catch (e) {}
      });
    });
  },

  bindViewNav() {
    var self = this;
    document.querySelectorAll('.tab[data-view]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        self.loadView(tab.getAttribute('data-view'));
      });
    });
  }
};

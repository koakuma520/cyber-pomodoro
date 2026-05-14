// 管理后台独立应用逻辑
var currentView = 'stats';
var allProducts = [];
var allOrders = [];

// 初始化
async function adminInit() {
  // 恢复认证
  initAuth();

  if (!isLoggedIn()) {
    document.getElementById('adminMain').innerHTML =
      '<div class="empty-state"><div class="empty-icon">🔒</div><p>请先在商城首页登录管理员账号</p><a href="/" class="btn btn-primary btn-sm">返回商城</a></div>';
    return;
  }

  if (!isAdmin()) {
    document.getElementById('adminMain').innerHTML =
      '<div class="empty-state"><div class="empty-icon">🔒</div><p>需要管理员权限</p><a href="/" class="btn btn-primary btn-sm">返回商城</a></div>';
    return;
  }

  // 侧边栏导航
  document.querySelectorAll('.admin-nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.admin-nav-item').forEach(function (i) { i.classList.remove('active'); });
      item.classList.add('active');
      loadView(item.getAttribute('data-view'));
    });
  });

  loadView('stats');
}

async function loadView(view) {
  currentView = view;
  var main = document.getElementById('adminMain');

  try {
    switch (view) {
      case 'stats':    await renderStatsView(main); break;
      case 'products': await renderProductsView(main); break;
      case 'orders':   await renderOrdersView(main); break;
      case 'users':    await renderUsersView(main); break;
    }
  } catch (e) {
    main.innerHTML = '<div class="empty-state"><div class="empty-icon">😢</div><p>加载失败</p></div>';
  }
}

async function renderStatsView(main) {
  var stats = await apiGet('/api/admin/stats');
  var html = '<h2 style="margin-bottom:20px;">📊 运营仪表板</h2>';

  html += '<div class="admin-stats">';
  html += '<div class="stat-card"><div class="stat-value">' + stats.totalOrders + '</div><div class="stat-label">总订单数</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + fmtPrice(stats.totalRevenue) + '</div><div class="stat-label">总收入</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + stats.paidOrders + '</div><div class="stat-label">待发货订单</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + stats.pendingOrders + '</div><div class="stat-label">待付款订单</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + stats.totalProducts + '</div><div class="stat-label">商品总数</div></div>';
  html += '<div class="stat-card"><div class="stat-value">' + stats.totalUsers + '</div><div class="stat-label">注册用户</div></div>';
  html += '</div>';

  if (stats.byCategory) {
    html += '<div class="card"><div class="card-header"><span class="card-title">商品分类统计</span></div><div class="card-body">';
    for (var cat in stats.byCategory) {
      var catInfo = C.CATEGORIES[cat] || { name: cat, icon: '📦' };
      html += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);">';
      html += '<span>' + (catInfo.icon || '') + ' ' + catInfo.name + '</span>';
      html += '<span style="font-weight:600;">' + stats.byCategory[cat] + ' 件</span>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  main.innerHTML = html;
}

async function renderProductsView(main) {
  var data = await apiGet('/api/products', { limit: 200 });
  allProducts = data.items;

  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h2>📦 商品管理</h2>';
  html += '<button class="btn btn-primary btn-sm" id="btnAddProduct">+ 新增商品</button>';
  html += '</div>';

  html += '<div class="card" style="overflow-x:auto;">';
  html += '<table class="data-table">';
  html += '<thead><tr><th>名称</th><th>分类</th><th>售价</th><th>库存</th><th>销量</th><th>精选</th><th>状态</th><th>操作</th></tr></thead>';
  html += '<tbody>';

  allProducts.forEach(function (p) {
    var catInfo = C.CATEGORIES[p.category] || { name: p.category, icon: '' };
    html += '<tr>';
    html += '<td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(p.name) + '</td>';
    html += '<td>' + (catInfo.icon || '') + ' ' + catInfo.name + '</td>';
    html += '<td>' + fmtPrice(p.price) + '</td>';
    html += '<td>' + p.stock + '</td>';
    html += '<td>' + (p.sales || 0) + '</td>';
    html += '<td>' + (p.isFeatured ? '⭐' : '-') + '</td>';
    html += '<td>' + (p.isOnSale ? '✅' : '⬇️') + '</td>';
    html += '<td>';
    html += '<button class="btn btn-xs btn-outline btn-edit" data-id="' + p.id + '" style="margin-right:4px;">编辑</button>';
    html += '<button class="btn btn-xs btn-secondary btn-delete" data-id="' + p.id + '">删除</button>';
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  // 商品表单模态框
  html += buildProductFormModal();

  main.innerHTML = html;
  bindProductEvents();
}

function buildProductFormModal() {
  return '<div id="productFormModal" class="modal-overlay" style="display:none;">' +
    '<div class="modal-content" style="max-width:500px;">' +
    '<div class="modal-header" id="productFormTitle">新增商品</div>' +
    '<div class="modal-body">' +
    '<div class="form-group"><label class="form-label">商品名称 *</label><input class="form-input" id="pfName"></div>' +
    '<div class="form-group"><label class="form-label">分类 *</label><select class="form-select" id="pfCategory"><option value="candy">🍬 糖果</option><option value="wedding">💒 婚庆</option><option value="gift">🎁 伴手礼</option></select></div>' +
    '<div class="form-group"><label class="form-label">子分类</label><input class="form-input" id="pfSubCat" placeholder="如：喜糖盒"></div>' +
    '<div class="form-group"><label class="form-label">描述</label><textarea class="form-textarea" id="pfDesc" rows="3"></textarea></div>' +
    '<div style="display:flex;gap:10px;">' +
    '<div class="form-group" style="flex:1;"><label class="form-label">售价 *</label><input class="form-input" type="number" id="pfPrice" step="0.01" min="0"></div>' +
    '<div class="form-group" style="flex:1;"><label class="form-label">原价</label><input class="form-input" type="number" id="pfOrigPrice" step="0.01" min="0"></div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;">' +
    '<div class="form-group" style="flex:1;"><label class="form-label">库存</label><input class="form-input" type="number" id="pfStock" min="0" value="0"></div>' +
    '<div class="form-group" style="flex:1;display:flex;align-items:center;gap:16px;padding-top:24px;">' +
    '<label style="font-size:0.85rem;"><input type="checkbox" id="pfFeatured"> 首页精选</label>' +
    '<label style="font-size:0.85rem;"><input type="checkbox" id="pfOnSale" checked> 上架</label>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button class="btn btn-secondary" id="btnPfCancel">取消</button>' +
    '<button class="btn btn-primary" id="btnPfSave">保存</button>' +
    '</div></div></div>';
}

function bindProductEvents() {
  document.getElementById('btnAddProduct').addEventListener('click', function () {
    showProductForm(null);
  });

  document.querySelectorAll('.btn-edit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var p = allProducts.find(function (p) { return p.id === btn.getAttribute('data-id'); });
      showProductForm(p);
    });
  });

  document.querySelectorAll('.btn-delete').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-id');
      var p = allProducts.find(function (p) { return p.id === id; });
      showModal({
        title: '删除商品',
        body: '确定要删除「' + p.name + '」吗？',
        confirm: '删除',
        onConfirm: async function () {
          await apiDelete('/api/admin/products/' + id);
          toast('已删除', 'success');
          loadView('products');
        }
      });
    });
  });

  document.getElementById('btnPfCancel').addEventListener('click', function () {
    document.getElementById('productFormModal').style.display = 'none';
  });

  document.getElementById('btnPfSave').addEventListener('click', async function () {
    var modal = document.getElementById('productFormModal');
    var editId = modal.getAttribute('data-edit-id');
    var isEdit = !!editId;

    var data = {
      name: document.getElementById('pfName').value.trim(),
      category: document.getElementById('pfCategory').value,
      subCategory: document.getElementById('pfSubCat').value.trim(),
      description: document.getElementById('pfDesc').value.trim(),
      price: parseFloat(document.getElementById('pfPrice').value),
      originalPrice: parseFloat(document.getElementById('pfOrigPrice').value) || undefined,
      stock: parseInt(document.getElementById('pfStock').value) || 0,
      isFeatured: document.getElementById('pfFeatured').checked,
      isOnSale: document.getElementById('pfOnSale').checked
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
      loadView('products');
    } catch (e) {}
  });
}

function showProductForm(p) {
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
    document.getElementById('pfOnSale').checked = p.isOnSale !== false;
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
    document.getElementById('pfOnSale').checked = true;
  }

  modal.style.display = 'flex';
}

async function renderOrdersView(main) {
  var data = await apiGet('/api/admin/orders', { limit: 200 });
  allOrders = data.items;

  var html = '<h2 style="margin-bottom:16px;">📋 订单管理</h2>';
  html += '<div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap;">';
  html += '<button class="btn btn-xs btn-outline order-filter active" data-status="all">全部</button>';
  html += '<button class="btn btn-xs btn-outline order-filter" data-status="paid">待发货</button>';
  html += '<button class="btn btn-xs btn-outline order-filter" data-status="pending">待付款</button>';
  html += '<button class="btn btn-xs btn-outline order-filter" data-status="shipped">已发货</button>';
  html += '<button class="btn btn-xs btn-outline order-filter" data-status="completed">已完成</button>';
  html += '</div>';

  html += '<div id="orderTableContainer">';
  html += renderOrderTable(allOrders);
  html += '</div>';

  main.innerHTML = html;

  // 筛选按钮
  document.querySelectorAll('.order-filter').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.order-filter').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var status = btn.getAttribute('data-status');
      var filtered = status === 'all' ? allOrders : allOrders.filter(function (o) { return o.status === status; });
      document.getElementById('orderTableContainer').innerHTML = renderOrderTable(filtered);
      bindOrderActionEvents();
    });
  });

  bindOrderActionEvents();
}

function renderOrderTable(orders) {
  if (orders.length === 0) {
    return '<div class="empty-state"><div class="empty-icon">📋</div><p>暂无订单</p></div>';
  }

  var html = '<div class="card" style="overflow-x:auto;"><table class="data-table">';
  html += '<thead><tr><th>订单号</th><th>用户</th><th>商品</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>';
  html += '<tbody>';

  orders.forEach(function (o) {
    var itemNames = o.items.map(function (i) { return i.name; }).join(', ');
    html += '<tr>';
    html += '<td style="font-family:monospace;font-size:0.8rem;">' + o.id + '</td>';
    html += '<td>' + escHtml(o.username) + '</td>';
    html += '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(itemNames) + '</td>';
    html += '<td>' + fmtPrice(o.totalAmount) + '</td>';
    html += '<td>' + renderStatusBadge(o.status) + '</td>';
    html += '<td style="font-size:0.8rem;">' + fmtDate(o.createdAt) + '</td>';
    html += '<td>';
    if (o.status === 'paid') {
      html += '<button class="btn btn-xs btn-primary btn-ship" data-id="' + o.id + '">发货</button>';
    }
    if (o.status === 'pending') {
      html += '<button class="btn btn-xs btn-secondary btn-cancel" data-id="' + o.id + '">取消</button>';
    }
    html += '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function bindOrderActionEvents() {
  document.querySelectorAll('.btn-ship').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      btn.disabled = true;
      try {
        await apiPut('/api/admin/orders/' + btn.getAttribute('data-id'), { status: 'shipped' });
        toast('已标记为发货', 'success');
        loadView('orders');
      } catch (e) { btn.disabled = false; }
    });
  });

  document.querySelectorAll('.btn-cancel').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      try {
        await apiPut('/api/admin/orders/' + btn.getAttribute('data-id'), { status: 'cancelled' });
        toast('订单已取消', 'success');
        loadView('orders');
      } catch (e) {}
    });
  });
}

async function renderUsersView(main) {
  var users = await apiGet('/api/admin/users');

  var html = '<h2 style="margin-bottom:16px;">👥 用户管理</h2>';

  html += '<div class="card" style="overflow-x:auto;"><table class="data-table">';
  html += '<thead><tr><th>用户名</th><th>角色</th><th>手机</th><th>订单数</th><th>注册时间</th></tr></thead>';
  html += '<tbody>';

  users.forEach(function (u) {
    html += '<tr>';
    html += '<td>' + escHtml(u.username) + '</td>';
    html += '<td>' + (u.isAdmin ? '<span class="status-badge" style="background:var(--gold-light);color:var(--gold);">管理员</span>' : '用户') + '</td>';
    html += '<td>' + (u.phone || '-') + '</td>';
    html += '<td>' + (u.orderCount || 0) + '</td>';
    html += '<td style="font-size:0.8rem;">' + fmtDate(u.createdAt) + '</td>';
    html += '</tr>';
  });

  html += '</tbody></table></div>';

  main.innerHTML = html;
}

// 启动
document.addEventListener('DOMContentLoaded', adminInit);

const express = require('express');

module.exports = function (deps) {
  const { loadDB, saveDB, crypto } = deps;
  const router = express.Router();

  // --- 仪表板统计 ---
  router.get('/stats', (req, res) => {
    const orders   = loadDB('orders.json');
    const products = loadDB('products.json');
    const users    = loadDB('users.json');

    const totalOrders  = orders.length;
    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const paidOrders    = orders.filter(o => o.status === 'paid').length;
    const totalProducts = products.length;
    const totalUsers    = users.length;

    // 按分类统计商品
    const byCategory = {};
    for (const p of products) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    }

    res.json({
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingOrders,
      paidOrders,
      totalProducts,
      totalUsers,
      byCategory
    });
  });

  // --- 所有订单列表 ---
  router.get('/orders', (req, res) => {
    let orders = loadDB('orders.json');
    const status = req.query.status;
    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    // 关联用户名
    const users = loadDB('users.json');
    orders = orders.map(o => {
      const u = users.find(u => u.id === o.userId);
      return { ...o, username: u ? u.username : '未知用户' };
    });

    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const total = orders.length;
    const start = (page - 1) * limit;
    const items = orders.slice(start, start + limit);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  });

  // --- 更新订单状态 ---
  router.put('/orders/:id', (req, res) => {
    const { status } = req.body || {};
    const validStatuses = ['paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的订单状态' });
    }

    const orders = loadDB('orders.json');
    const idx = orders.findIndex(o => o.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '订单不存在' });

    orders[idx].status = status;
    orders[idx].updatedAt = new Date().toISOString();

    if (status === 'shipped') orders[idx].shippedAt = new Date().toISOString();
    if (status === 'completed') orders[idx].completedAt = new Date().toISOString();
    if (status === 'cancelled') orders[idx].cancelledAt = new Date().toISOString();

    saveDB('orders.json', orders);
    res.json(orders[idx]);
  });

  // --- 创建商品 ---
  router.post('/products', (req, res) => {
    const { name, category, subCategory, description, price, originalPrice, images, specs, stock, isOnSale, isFeatured } = req.body || {};

    if (!name || !category || price == null) {
      return res.status(400).json({ error: '商品名称、分类、价格为必填项' });
    }

    const now = new Date().toISOString();
    const product = {
      id: crypto.randomUUID(),
      name,
      category,
      subCategory: subCategory || '',
      description: description || '',
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : Number(price),
      images: images || [],
      specs: specs || [],
      stock: stock != null ? Number(stock) : 0,
      sales: 0,
      isOnSale: isOnSale !== false,
      isFeatured: !!isFeatured,
      createdAt: now,
      updatedAt: now
    };

    const products = loadDB('products.json');
    products.push(product);
    saveDB('products.json', products);

    res.status(201).json(product);
  });

  // --- 更新商品 ---
  router.put('/products/:id', (req, res) => {
    const products = loadDB('products.json');
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: '商品不存在' });

    const fields = ['name', 'category', 'subCategory', 'description', 'price', 'originalPrice', 'images', 'specs', 'stock', 'isOnSale', 'isFeatured'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        products[idx][f] = req.body[f];
      }
    }
    products[idx].updatedAt = new Date().toISOString();
    saveDB('products.json', products);

    res.json(products[idx]);
  });

  // --- 删除商品 ---
  router.delete('/products/:id', (req, res) => {
    const products = loadDB('products.json');
    const filtered = products.filter(p => p.id !== req.params.id);
    if (filtered.length === products.length) {
      return res.status(404).json({ error: '商品不存在' });
    }
    saveDB('products.json', filtered);
    res.json({ success: true });
  });

  // --- 用户列表 ---
  router.get('/users', (req, res) => {
    const users = loadDB('users.json');
    const safe = users.map(u => {
      const { passwordHash, ...rest } = u;
      const orders = loadDB('orders.json');
      const orderCount = orders.filter(o => o.userId === u.id).length;
      return { ...rest, orderCount };
    });
    res.json(safe);
  });

  return router;
};

const express = require('express');

module.exports = function (deps) {
  const { loadDB, saveDB, crypto } = deps;
  const router = express.Router();

  // 生成订单号
  function genOrderId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${y}${m}${d}-${rand}`;
  }

  // --- 创建订单 ---
  router.post('/', (req, res) => {
    const { shippingAddress, note, paymentMethod } = req.body || {};

    // 验证地址
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.detail) {
      return res.status(400).json({ error: '请填写完整的收货信息' });
    }

    // 获取购物车
    const carts = loadDB('carts.json');
    const cart = carts.find(c => c.userId === req.user.id);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: '购物车为空' });
    }

    // 计算总金额
    const items = cart.items.map(item => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      selectedSpecs: item.selectedSpecs || {}
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const now = new Date().toISOString();
    const order = {
      id: genOrderId(),
      userId: req.user.id,
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'pending',
      shippingAddress,
      note: note || '',
      paymentMethod: paymentMethod || 'mock',
      paidAt: null,
      shippedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now
    };

    const orders = loadDB('orders.json');
    orders.push(order);
    saveDB('orders.json', orders);

    // 清空购物车
    cart.items = [];
    cart.updatedAt = now;
    saveDB('carts.json', carts);

    // 更新商品销量
    const products = loadDB('products.json');
    for (const item of items) {
      const p = products.find(p => p.id === item.productId);
      if (p) {
        p.sales = (p.sales || 0) + item.quantity;
        p.stock = Math.max(0, (p.stock || 0) - item.quantity);
        p.updatedAt = now;
      }
    }
    saveDB('products.json', products);

    // 记录交易
    const txns = loadDB('transactions.json');
    txns.push({
      id: crypto.randomUUID(),
      userId: req.user.id,
      type: 'order',
      orderId: order.id,
      amount: -order.totalAmount,
      desc: `下单消费 ${order.totalAmount.toFixed(2)} 元`,
      createdAt: now
    });
    saveDB('transactions.json', txns);

    res.status(201).json(order);
  });

  // --- 用户订单列表 ---
  router.get('/', (req, res) => {
    let orders = loadDB('orders.json').filter(o => o.userId === req.user.id);

    // 状态筛选
    const status = req.query.status;
    if (status && status !== 'all') {
      orders = orders.filter(o => o.status === status);
    }

    // 按创建时间倒序
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const total = orders.length;
    const start = (page - 1) * limit;
    const items = orders.slice(start, start + limit);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  });

  // --- 订单详情 ---
  router.get('/:id', (req, res) => {
    const orders = loadDB('orders.json');
    const order = orders.find(o => o.id === req.params.id && o.userId === req.user.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });

    res.json(order);
  });

  // --- 模拟支付 ---
  router.post('/:id/pay', (req, res) => {
    const orders = loadDB('orders.json');
    const idx = orders.findIndex(o => o.id === req.params.id && o.userId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: '订单不存在' });
    if (orders[idx].status !== 'pending') {
      return res.status(400).json({ error: '订单状态不允许支付' });
    }

    orders[idx].status = 'paid';
    orders[idx].paidAt = new Date().toISOString();
    orders[idx].updatedAt = new Date().toISOString();
    saveDB('orders.json', orders);

    res.json(orders[idx]);
  });

  // --- 取消订单 ---
  router.post('/:id/cancel', (req, res) => {
    const orders = loadDB('orders.json');
    const idx = orders.findIndex(o => o.id === req.params.id && o.userId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: '订单不存在' });
    if (orders[idx].status !== 'pending') {
      return res.status(400).json({ error: '只能取消待付款订单' });
    }

    orders[idx].status = 'cancelled';
    orders[idx].cancelledAt = new Date().toISOString();
    orders[idx].updatedAt = new Date().toISOString();
    saveDB('orders.json', orders);

    res.json(orders[idx]);
  });

  return router;
};

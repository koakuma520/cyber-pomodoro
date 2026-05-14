const express = require('express');

module.exports = function (deps) {
  const { loadDB, saveDB } = deps;
  const router = express.Router();

  // --- 获取用户购物车 ---
  router.get('/', (req, res) => {
    const carts = loadDB('carts.json');
    let cart = carts.find(c => c.userId === req.user.id);
    if (!cart) {
      cart = { userId: req.user.id, items: [], updatedAt: new Date().toISOString() };
      carts.push(cart);
      saveDB('carts.json', carts);
    }
    res.json(cart);
  });

  // --- 合并购物车（登录时将本地购物车合并到服务端） ---
  router.post('/merge', (req, res) => {
    const localItems = req.body.items || [];
    if (localItems.length === 0) {
      return res.json(loadOrCreateCart(req.user.id));
    }

    const carts = loadDB('carts.json');
    let cart = carts.find(c => c.userId === req.user.id);
    if (!cart) {
      cart = { userId: req.user.id, items: [], updatedAt: new Date().toISOString() };
      carts.push(cart);
    }

    for (const localItem of localItems) {
      const existIdx = cart.items.findIndex(i =>
        i.productId === localItem.productId &&
        JSON.stringify(i.selectedSpecs) === JSON.stringify(localItem.selectedSpecs)
      );
      if (existIdx >= 0) {
        // 取较大数量
        cart.items[existIdx].quantity = Math.max(cart.items[existIdx].quantity, localItem.quantity || 1);
      } else {
        cart.items.push({
          productId: localItem.productId,
          name: localItem.name,
          price: localItem.price,
          image: localItem.image || '',
          quantity: localItem.quantity || 1,
          selectedSpecs: localItem.selectedSpecs || {}
        });
      }
    }

    cart.updatedAt = new Date().toISOString();
    saveDB('carts.json', carts);
    res.json(cart);
  });

  // --- 添加商品到购物车 ---
  router.post('/items', (req, res) => {
    const { productId, name, price, image, quantity, selectedSpecs } = req.body || {};
    if (!productId || !name || price == null) {
      return res.status(400).json({ error: '商品信息不完整' });
    }

    const carts = loadDB('carts.json');
    let cart = carts.find(c => c.userId === req.user.id);
    if (!cart) {
      cart = { userId: req.user.id, items: [], updatedAt: new Date().toISOString() };
      carts.push(cart);
    }

    const specs = selectedSpecs || {};
    const existIdx = cart.items.findIndex(i =>
      i.productId === productId &&
      JSON.stringify(i.selectedSpecs) === JSON.stringify(specs)
    );

    if (existIdx >= 0) {
      cart.items[existIdx].quantity += (quantity || 1);
    } else {
      cart.items.push({
        productId,
        name,
        price: Number(price),
        image: image || '',
        quantity: quantity || 1,
        selectedSpecs: specs
      });
    }

    cart.updatedAt = new Date().toISOString();
    saveDB('carts.json', carts);
    res.json(cart);
  });

  // --- 更新商品数量 ---
  router.put('/items/:productId', (req, res) => {
    const { quantity, selectedSpecs } = req.body || {};
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: '数量无效' });
    }

    const carts = loadDB('carts.json');
    const cart = carts.find(c => c.userId === req.user.id);
    if (!cart) return res.status(404).json({ error: '购物车为空' });

    const specs = selectedSpecs || {};
    const idx = cart.items.findIndex(i =>
      i.productId === req.params.productId &&
      JSON.stringify(i.selectedSpecs) === JSON.stringify(specs)
    );

    if (idx === -1) return res.status(404).json({ error: '商品不在购物车中' });

    if (qty === 0) {
      cart.items.splice(idx, 1);
    } else {
      cart.items[idx].quantity = qty;
    }

    cart.updatedAt = new Date().toISOString();
    saveDB('carts.json', carts);
    res.json(cart);
  });

  // --- 移除商品 ---
  router.delete('/items/:productId', (req, res) => {
    const selectedSpecs = req.body?.selectedSpecs || {};
    const carts = loadDB('carts.json');
    const cart = carts.find(c => c.userId === req.user.id);
    if (!cart) return res.status(404).json({ error: '购物车为空' });

    cart.items = cart.items.filter(i =>
      !(i.productId === req.params.productId &&
        JSON.stringify(i.selectedSpecs) === JSON.stringify(selectedSpecs))
    );

    cart.updatedAt = new Date().toISOString();
    saveDB('carts.json', carts);
    res.json(cart);
  });

  // --- 清空购物车 ---
  router.delete('/', (req, res) => {
    const carts = loadDB('carts.json');
    const idx = carts.findIndex(c => c.userId === req.user.id);
    if (idx >= 0) {
      carts[idx].items = [];
      carts[idx].updatedAt = new Date().toISOString();
      saveDB('carts.json', carts);
      res.json(carts[idx]);
    } else {
      res.json({ userId: req.user.id, items: [], updatedAt: new Date().toISOString() });
    }
  });

  return router;
};

function loadOrCreateCart(userId) {
  const { loadDB, saveDB } = require('./cart')._deps || {};
  // fallback inline
  const fs = require('fs');
  const path = require('path');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  function load(filename) {
    try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')); }
    catch (e) { return []; }
  }
  function save(filename, data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
  }

  const carts = load('carts.json');
  let cart = carts.find(c => c.userId === userId);
  if (!cart) {
    cart = { userId, items: [], updatedAt: new Date().toISOString() };
    carts.push(cart);
    save('carts.json', carts);
  }
  return cart;
}

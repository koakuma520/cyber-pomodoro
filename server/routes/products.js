const express = require('express');

module.exports = function (deps) {
  const { loadDB, saveDB, crypto } = deps;
  const router = express.Router();

  // --- 商品列表（分页、分类、搜索） ---
  router.get('/', (req, res) => {
    let products = loadDB('products.json');

    // 分类筛选
    const category = req.query.category;
    if (category && category !== 'all') {
      products = products.filter(p => p.category === category);
    }

    // 搜索
    const search = req.query.search;
    if (search) {
      const kw = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(kw) ||
        p.description.toLowerCase().includes(kw)
      );
    }

    // 只返回上架商品
    products = products.filter(p => p.isOnSale !== false);

    // 排序
    const sort = req.query.sort || 'default';
    if (sort === 'price-asc') {
      products.sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      products.sort((a, b) => b.price - a.price);
    } else if (sort === 'sales') {
      products.sort((a, b) => b.sales - a.sales);
    }

    // 分页
    const page  = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const total = products.length;
    const start = (page - 1) * limit;
    const items = products.slice(start, start + limit);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  });

  // --- 精选商品（首页展示） ---
  router.get('/featured', (req, res) => {
    let products = loadDB('products.json');
    products = products.filter(p => p.isFeatured && p.isOnSale !== false);
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);
    res.json(products.slice(0, limit));
  });

  // --- 商品详情 ---
  router.get('/:id', (req, res) => {
    const products = loadDB('products.json');
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: '商品不存在' });
    res.json(product);
  });

  return router;
};

/**
 * Seedance Studio Pro — 统一后端服务
 * 合并原 auth-server.js + proxy-server.js
 * 新增：套餐系统、支付、模板管理、多模型代理
 *
 * 启动: node seedance-server.js
 * 端口: 3456 (默认)
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3456;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const BCRYPT_ROUNDS = 10;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const ATLAS_API_BASE = 'api.atlascloud.ai';
const FRONTEND_DIR = path.join(__dirname, 'www-seedance');
const DATA_DIR = path.join(__dirname, 'server', 'data');

// ==================== 数据层 ====================
function loadDB(filename) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8')); }
  catch (e) { return []; }
}
function saveDB(filename, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// ==================== 种子数据 ====================
function seedAll() {
  let users = loadDB('users.json');
  if (users.length === 0) {
    const adminHash = bcrypt.hashSync(ADMIN_PASS, BCRYPT_ROUNDS);
    const testHash = bcrypt.hashSync('123456', BCRYPT_ROUNDS);
    users = [
      { id: 'seed-admin-001', username: ADMIN_USER, passwordHash: adminHash, balance: 200, plan: 'pro', isAdmin: true, createdAt: new Date().toISOString() },
      { id: 'seed-test-001', username: 'test', passwordHash: testHash, balance: 100, plan: 'personal', isAdmin: false, createdAt: new Date().toISOString() }
    ];
    saveDB('users.json', users);
    saveDB('transactions.json', [
      { id: 'txn-seed-1', userId: 'seed-admin-001', type: 'claim', amount: 200, desc: '管理员初始积分', balance: 200, createdAt: new Date().toISOString() },
      { id: 'txn-seed-2', userId: 'seed-test-001', type: 'claim', amount: 100, desc: '测试账号初始积分', balance: 100, createdAt: new Date().toISOString() }
    ]);
    console.log('  [Seed] 初始账号: admin/' + ADMIN_PASS + '  test/123456');
  }
  let plans = loadDB('plans.json');
  if (plans.length === 0) {
    plans = [
      { id: 'free', name: '免费版', price: 0, videosPerMonth: 5, watermark: true, desc: '体验 AI 视频生成' },
      { id: 'personal', name: '个人版', price: 99, videosPerMonth: 50, watermark: false, desc: '适合个体卖家' },
      { id: 'pro', name: '专业版', price: 499, videosPerMonth: 300, watermark: false, desc: '适合中小卖家' },
      { id: 'enterprise', name: '企业版', price: 1999, videosPerMonth: 1500, watermark: false, desc: '大卖家/MCN/API' }
    ];
    saveDB('plans.json', plans);
  }
  let templates = loadDB('templates.json');
  if (templates.length === 0) {
    templates = [
      { id:'tpl-product-show', name:'商品展示', category:'product_show', industry:'通用', icon:'📦', promptTemplate:'专业商品展示视频，{{product_name}}在纯色背景下优雅展示，柔和摄影棚灯光，产品细节清晰可见，微距镜头缓慢推进，4K画质。{{selling_points}}', defaultParams:{ratio:'9:16',duration:6,motion:'medium'}, slots:['product_name','selling_points','product_image'], tips:'适合：服装、配饰、3C数码、化妆品', usageCount:0 },
      { id:'tpl-unboxing', name:'开箱测评', category:'unboxing', industry:'通用', icon:'📦', promptTemplate:'第一人称视角开箱视频，{{product_name}}从包装盒中取出，展示包装细节和产品外观，自然室内光线，真实开箱体验感。{{selling_points}}', defaultParams:{ratio:'9:16',duration:8,motion:'medium'}, slots:['product_name','selling_points','product_image'], tips:'适合：3C数码、化妆品、潮玩', usageCount:0 },
      { id:'tpl-comparison', name:'对比测评', category:'comparison', industry:'通用', icon:'⚖️', promptTemplate:'左右分屏对比视频，左边是{{product_name}}，右边是对比产品，展示关键差异，清晰标注，专业测评风格。{{selling_points}}', defaultParams:{ratio:'16:9',duration:10,motion:'low'}, slots:['product_name','selling_points','product_image'], tips:'适合：家电、数码、日用品', usageCount:0 },
      { id:'tpl-tutorial', name:'使用教程', category:'tutorial', industry:'通用', icon:'📖', promptTemplate:'教学演示视频，逐步展示{{product_name}}的使用方法，每个步骤配有文字说明，简洁明了，白色背景，顶光照明。{{selling_points}}', defaultParams:{ratio:'9:16',duration:15,motion:'low'}, slots:['product_name','selling_points','product_image'], tips:'适合：工具、厨具、美妆工具', usageCount:0 },
      { id:'tpl-flash-sale', name:'限时抢购', category:'flash_sale', industry:'通用', icon:'⚡', promptTemplate:'快节奏促销视频，{{product_name}}在聚光灯下展示，倒计时元素，价格标签动画效果，红色和金色点缀，紧迫感氛围。限时特价{{selling_points}}', defaultParams:{ratio:'9:16',duration:5,motion:'high'}, slots:['product_name','selling_points','product_image'], tips:'适合：促销活动、直播预告', usageCount:0 },
      { id:'tpl-before-after', name:'使用前后对比', category:'before_after', industry:'美妆/清洁', icon:'✨', promptTemplate:'使用前后对比展示，左边为使用前效果，右边为使用{{product_name}}后效果，慢动作过渡，真实对比效果，自然光线。{{selling_points}}', defaultParams:{ratio:'9:16',duration:8,motion:'low'}, slots:['product_name','selling_points','product_image'], tips:'适合：护肤品、清洁剂', usageCount:0 },
      { id:'tpl-lifestyle', name:'场景种草', category:'lifestyle', industry:'服装/家居', icon:'🌿', promptTemplate:'生活方式场景视频，{{product_name}}融入日常使用场景中，温暖的色调，自然光线透过窗户，舒适放松的氛围，电影感画面。{{selling_points}}', defaultParams:{ratio:'9:16',duration:10,motion:'medium'}, slots:['product_name','selling_points','product_image'], tips:'适合：服装、家居、香薰', usageCount:0 },
      { id:'tpl-ingredient', name:'成分解析', category:'ingredient', industry:'食品/护肤品', icon:'🔬', promptTemplate:'产品成分特写视频，{{product_name}}的核心成分逐一展示，微观镜头效果，成分名称标注动画，科技感的蓝白色调。{{selling_points}}', defaultParams:{ratio:'9:16',duration:8,motion:'medium'}, slots:['product_name','selling_points','product_image'], tips:'适合：食品、保健品、护肤品', usageCount:0 },
      { id:'tpl-factory', name:'工厂溯源', category:'factory', industry:'食品/制造', icon:'🏭', promptTemplate:'工厂生产过程展示，{{product_name}}从原料到成品的制作过程，干净的现代化工厂环境，自动化生产线，专业品质感。{{selling_points}}', defaultParams:{ratio:'16:9',duration:12,motion:'medium'}, slots:['product_name','selling_points','product_image'], tips:'适合：食品、手工艺品、家具', usageCount:0 },
      { id:'tpl-social-proof', name:'买家秀合集', category:'social_proof', industry:'通用', icon:'💬', promptTemplate:'用户好评和实拍合集视频，多张{{product_name}}的真实使用照片轮播展示，五星好评动画，真实用户场景，温暖亲切的氛围。{{selling_points}}', defaultParams:{ratio:'9:16',duration:10,motion:'low'}, slots:['product_name','selling_points','product_image'], tips:'适合：服装、美妆、日用百货', usageCount:0 }
    ];
    saveDB('templates.json', templates);
    console.log('  [Seed] ' + templates.length + ' 个电商视频模板');
  }
}

// ==================== Middleware ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.static(FRONTEND_DIR));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});
const rateLimit = {};
app.use((req, res, next) => {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = { count: 0, reset: now + 60000 };
  if (now > rateLimit[ip].reset) rateLimit[ip] = { count: 0, reset: now + 60000 };
  if (++rateLimit[ip].count > 120) return res.status(429).json({ error: '请求过于频繁' });
  next();
});

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: '未提供认证令牌' });
  try {
    const d = jwt.verify(h.split(' ')[1], JWT_SECRET);
    const u = loadDB('users.json').find(u => u.id === d.userId);
    if (!u) throw new Error();
    req.user = u;
    next();
  } catch (e) { res.status(401).json({ error: '认证失效' }); }
}
function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) return res.status(403).json({ error: '需要管理员权限' });
  next();
}

// ==================== Auth API ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
    if (username.length < 2 || username.length > 20) return res.status(400).json({ error: '用户名需2-20个字符' });
    if (password.length < 4) return res.status(400).json({ error: '密码至少4个字符' });
    const users = loadDB('users.json');
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ error: '用户名已存在' });
    const user = { id: crypto.randomUUID(), username, passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS), balance: 10, plan: 'free', isAdmin: false, createdAt: new Date().toISOString() };
    users.push(user);
    saveDB('users.json', users);
    const txns = loadDB('transactions.json');
    txns.push({ id: crypto.randomUUID(), userId: user.id, type: 'claim', amount: 10, desc: '新用户注册赠送', balance: 10, createdAt: new Date().toISOString() });
    saveDB('transactions.json', txns);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safe } = user;
    res.status(201).json({ token, user: safe });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = loadDB('users.json').find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user || !await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: '用户名或密码错误' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safe } = user;
    res.json({ token, user: safe });
  } catch (e) { res.status(500).json({ error: '服务器错误' }); }
});

// ==================== User API ====================
app.get('/api/user/profile', authMiddleware, (req, res) => {
  const u = loadDB('users.json').find(u => u.id === req.user.id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  const { passwordHash: _, ...safe } = u;
  res.json(safe);
});

app.post('/api/user/recharge', authMiddleware, (req, res) => {
  const yuan = parseInt(req.body.amount);
  if (!yuan || yuan <= 0 || yuan > 10000) return res.status(400).json({ error: '充值金额无效 (1-10000元)' });
  const users = loadDB('users.json');
  const idx = users.findIndex(u => u.id === req.user.id);
  const credits = yuan * 10;
  users[idx].balance += credits;
  saveDB('users.json', users);
  const txns = loadDB('transactions.json');
  txns.push({ id: crypto.randomUUID(), userId: req.user.id, type: 'recharge', amount: credits, desc: '充值 ' + yuan + ' 元', balance: users[idx].balance, createdAt: new Date().toISOString() });
  saveDB('transactions.json', txns);
  res.json({ balance: users[idx].balance, message: '充值成功 +' + credits + '积分' });
});

app.post('/api/user/claim-free', authMiddleware, (req, res) => {
  const txns = loadDB('transactions.json');
  const today = new Date().toISOString().slice(0, 10);
  if (txns.some(t => t.userId === req.user.id && t.type === 'claim' && t.createdAt.slice(0, 10) === today))
    return res.status(400).json({ error: '今天已领取过' });
  const users = loadDB('users.json');
  const idx = users.findIndex(u => u.id === req.user.id);
  users[idx].balance += 10;
  saveDB('users.json', users);
  txns.push({ id: crypto.randomUUID(), userId: req.user.id, type: 'claim', amount: 10, desc: '每日免费领取', balance: users[idx].balance, createdAt: new Date().toISOString() });
  saveDB('transactions.json', txns);
  res.json({ balance: users[idx].balance, message: '领取成功 +10积分' });
});

app.get('/api/user/transactions', authMiddleware, (req, res) => {
  const type = req.query.type;
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  let txns = loadDB('transactions.json').filter(t => t.userId === req.user.id);
  if (type) txns = txns.filter(t => t.type === type);
  txns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = txns.length;
  res.json({ items: txns.slice((page - 1) * limit, page * limit), total, page, totalPages: Math.ceil(total / limit) });
});

// ==================== 套餐/配额 API ====================
app.get('/api/plans', (req, res) => res.json(loadDB('plans.json')));

app.get('/api/user/quota', authMiddleware, (req, res) => {
  const plans = loadDB('plans.json');
  const plan = plans.find(p => p.id === (req.user.plan || 'free')) || plans[0];
  const monthKey = new Date().toISOString().slice(0, 7);
  const used = loadDB('video_usage.json').filter(u => u.userId === req.user.id && u.month === monthKey).length;
  res.json({ used, limit: plan.videosPerMonth, remaining: Math.max(0, plan.videosPerMonth - used), plan });
});

function checkQuota(user) {
  const plans = loadDB('plans.json');
  const plan = plans.find(p => p.id === (user.plan || 'free')) || plans[0];
  const monthKey = new Date().toISOString().slice(0, 7);
  const used = loadDB('video_usage.json').filter(u => u.userId === user.id && u.month === monthKey).length;
  return { allowed: used < plan.videosPerMonth, used, limit: plan.videosPerMonth, remaining: Math.max(0, plan.videosPerMonth - used), plan };
}

function recordUsage(userId) {
  const usage = loadDB('video_usage.json');
  usage.push({ id: crypto.randomUUID(), userId, month: new Date().toISOString().slice(0, 7), createdAt: new Date().toISOString() });
  saveDB('video_usage.json', usage);
}

// ==================== 支付 API ====================
app.post('/api/orders', authMiddleware, (req, res) => {
  const plans = loadDB('plans.json');
  const planDef = plans.find(p => p.id === req.body.plan);
  if (!planDef || planDef.price <= 0) return res.status(400).json({ error: '无效套餐' });
  const order = { id: new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + crypto.randomUUID().slice(0, 4).toUpperCase(), userId: req.user.id, plan: req.body.plan, amount: planDef.price, status: 'pending', createdAt: new Date().toISOString() };
  let orders = loadDB('orders.json');
  orders.push(order);
  saveDB('orders.json', orders);
  res.json({ order, message: '请支付 ' + planDef.price + ' 元后输入交易号确认' });
});

app.post('/api/orders/:id/verify', authMiddleware, (req, res) => {
  let orders = loadDB('orders.json');
  const idx = orders.findIndex(o => o.id === req.params.id && o.userId === req.user.id);
  if (idx < 0) return res.status(404).json({ error: '订单不存在' });
  orders[idx].wechatTxnId = req.body.txn_id || '';
  orders[idx].status = 'pending_approval';
  orders[idx].submittedAt = new Date().toISOString();
  saveDB('orders.json', orders);
  res.json({ status: 'pending_approval', message: '已提交，等待管理员验证' });
});

app.get('/api/orders', authMiddleware, (req, res) => {
  const orders = loadDB('orders.json').filter(o => o.userId === req.user.id);
  res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// ==================== Admin API ====================
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  const txns = loadDB('transactions.json');
  const users = loadDB('users.json').map(u => { const { passwordHash: _, ...s } = u; s.txnCount = txns.filter(t => t.userId === u.id).length; return s; });
  res.json({ users });
});

app.post('/api/admin/adjust-balance', authMiddleware, adminMiddleware, (req, res) => {
  const { targetUserId, delta, desc } = req.body;
  if (!targetUserId || typeof delta !== 'number' || delta === 0) return res.status(400).json({ error: '参数无效' });
  const users = loadDB('users.json');
  const idx = users.findIndex(u => u.id === targetUserId);
  if (idx < 0) return res.status(404).json({ error: '用户不存在' });
  users[idx].balance = Math.max(0, users[idx].balance + delta);
  saveDB('users.json', users);
  const txns = loadDB('transactions.json');
  txns.push({ id: crypto.randomUUID(), userId: targetUserId, type: delta >= 0 ? 'admin_bonus' : 'admin_deduct', amount: delta, desc: desc || '管理员调整', balance: users[idx].balance, createdAt: new Date().toISOString() });
  saveDB('transactions.json', txns);
  res.json({ balance: users[idx].balance, message: '余额已调整' });
});

app.get('/api/admin/orders', authMiddleware, adminMiddleware, (req, res) => {
  res.json(loadDB('orders.json').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/admin/orders/:id/approve', authMiddleware, adminMiddleware, (req, res) => {
  let orders = loadDB('orders.json');
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '订单不存在' });
  orders[idx].status = 'approved';
  orders[idx].approvedAt = new Date().toISOString();
  saveDB('orders.json', orders);
  const users = loadDB('users.json');
  const uidx = users.findIndex(u => u.id === orders[idx].userId);
  if (uidx >= 0) { users[uidx].plan = orders[idx].plan; saveDB('users.json', users); }
  res.json({ message: '已批准并激活套餐', plan: orders[idx].plan });
});

app.post('/api/admin/orders/:id/reject', authMiddleware, adminMiddleware, (req, res) => {
  let orders = loadDB('orders.json');
  const idx = orders.findIndex(o => o.id === req.params.id);
  if (idx < 0) return res.status(404);
  orders[idx].status = 'rejected';
  saveDB('orders.json', orders);
  res.json({ message: '已拒绝' });
});

// ==================== 模板 API ====================
app.get('/api/templates', (req, res) => {
  let tpls = loadDB('templates.json');
  if (req.query.industry) tpls = tpls.filter(t => t.industry === req.query.industry);
  res.json(tpls);
});
app.get('/api/templates/:id', (req, res) => {
  const tpl = loadDB('templates.json').find(t => t.id === req.params.id);
  if (!tpl) return res.status(404).json({ error: '模板不存在' });
  res.json(tpl);
});

// ==================== 历史记录 API ====================
app.get('/api/history', authMiddleware, (req, res) => {
  const hist = loadDB('history.json').filter(h => h.userId === req.user.id);
  res.json(hist.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 50));
});
app.post('/api/history', authMiddleware, (req, res) => {
  let hist = loadDB('history.json');
  const entry = { id: crypto.randomUUID(), userId: req.user.id, mode: req.body.mode || 'text', prompt: req.body.prompt || '', videoUrl: req.body.videoUrl || '', status: req.body.status || 'done', cost: req.body.cost || 36, createdAt: new Date().toISOString() };
  hist.unshift(entry);
  if (hist.length > 500) hist = hist.slice(0, 500);
  saveDB('history.json', hist);
  res.status(201).json(entry);
});

// ==================== 多模型 AI 路由器 ====================
const uploadedImages = new Map();

// 通用 HTTP 请求辅助
function httpPost(hostname, port, path, headers, body, cb) {
  const opts = { hostname, port, path, method: 'POST', headers };
  if (body) { opts.headers['Content-Length'] = Buffer.byteLength(body); }
  const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => cb(res.statusCode, d)); });
  r.on('error', e => cb(500, JSON.stringify({ error: { message: e.message } })));
  if (body) r.write(body); r.end();
}

function httpGet(hostname, port, path, headers, cb) {
  const opts = { hostname, port, path, method: 'GET', headers };
  const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => cb(res.statusCode, d)); });
  r.on('error', e => cb(500, JSON.stringify({ error: { message: e.message } })));
  r.end();
}

function proxyToAtlas(method, apiPath, qs, body, auth, cb) {
  const fullPath = '/api/v1' + apiPath + (qs || '');
  const opts = { hostname: ATLAS_API_BASE, port: 443, path: fullPath, method, headers: { 'Authorization': auth || '', 'Content-Type': 'application/json' } };
  if (body) opts.headers['Content-Length'] = Buffer.byteLength(body);
  const r = https.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => cb(res.statusCode, d)); });
  r.on('error', e => cb(500, JSON.stringify({ error: { message: e.message } })));
  if (body) r.write(body); r.end();
}

// ── 可灵 (Kling) API ──────────────────────────────────────
const KLING_ACCESS_KEY = process.env.KLING_ACCESS_KEY || '';
const KLING_SECRET_KEY = process.env.KLING_SECRET_KEY || '';

function getKlingToken() {
  // 生成可灵 JWT token (简化版)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ iss: KLING_ACCESS_KEY, exp: now + 1800, nbf: now - 5 })).toString('base64url');
  const crypto = require('crypto');
  const sig = crypto.createHmac('sha256', KLING_SECRET_KEY).update(header + '.' + payload).digest('base64url');
  return header + '.' + payload + '.' + sig;
}

function generateKling(params, cb) {
  if (!KLING_ACCESS_KEY) return cb(503, JSON.stringify({ error: { message: '可灵 API 未配置，请设置 KLING_ACCESS_KEY 和 KLING_SECRET_KEY 环境变量' } }));
  const token = getKlingToken();
  const body = JSON.stringify({
    model_name: 'kling-v1',
    prompt: params.prompt,
    negative_prompt: params.negative_prompt || '',
    cfg_scale: 0.5,
    mode: params.mode === 'image' ? 'std' : 'std',
    duration: params.duration || '5',
    aspect_ratio: params.ratio || '9:16'
  });
  const path = params.mode === 'image' && params.image
    ? '/v1/videos/image2video'
    : '/v1/videos/text2video';
  if (params.image && params.mode === 'image') {
    // 简化：在 text2video body 中包含 image
  }
  httpPost('api.klingai.com', 443, path,
    { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body,
    (code, data) => {
      if (code === 200) {
        try { const j = JSON.parse(data); const taskId = j.data?.task_id; cb(200, JSON.stringify({ data: { id: taskId, provider: 'kling' } })); }
        catch (e) { cb(500, JSON.stringify({ error: { message: '可灵返回格式异常' } })); }
      } else { cb(code, data); }
    });
}

function pollKling(taskId, cb) {
  const token = getKlingToken();
  httpGet('api.klingai.com', 443, '/v1/videos/text2video/' + taskId,
    { 'Authorization': 'Bearer ' + token },
    (code, data) => {
      if (code === 200) {
        try {
          const j = JSON.parse(data);
          const taskData = j.data?.task_result || j.data;
          const statusMap = { 'submitted': 'queued', 'processing': 'processing', 'succeed': 'completed', 'failed': 'failed' };
          const status = statusMap[taskData?.task_status || ''] || taskData?.task_status || 'unknown';
          const videoUrl = taskData?.videos?.[0]?.url || '';
          cb(200, JSON.stringify({ data: { status, outputs: videoUrl ? [videoUrl] : [], provider: 'kling' } }));
        } catch (e) { cb(500, JSON.stringify({ error: { message: '可灵轮询解析异常' } })); }
      } else { cb(code, data); }
    });
}

// ── 通义万相 (Wanxiang / DashScope) ────────────────────────
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';

function generateWanxiang(params, cb) {
  if (!DASHSCOPE_API_KEY) return cb(503, JSON.stringify({ error: { message: '通义万相 API 未配置，请设置 DASHSCOPE_API_KEY 环境变量' } }));
  const body = JSON.stringify({
    model: 'cogvideox-v1',
    input: { prompt: params.prompt, negative_prompt: params.negative_prompt || '' },
    parameters: { size: params.ratio === '16:9' ? '1280*720' : '720*1280', duration: parseInt(params.duration) || 5 }
  });
  httpPost('dashscope.aliyuncs.com', 443, '/api/v1/services/aigc/video-generation/video-synthesis',
    { 'Authorization': 'Bearer ' + DASHSCOPE_API_KEY, 'Content-Type': 'application/json', 'X-DashScope-Async': 'enable' },
    body, (code, data) => {
      if (code === 200) {
        try { const j = JSON.parse(data); const taskId = j.output?.task_id; cb(200, JSON.stringify({ data: { id: taskId, provider: 'wanxiang' } })); }
        catch (e) { cb(500, JSON.stringify({ error: { message: '万相返回格式异常' } })); }
      } else { cb(code, data); }
    });
}

function pollWanxiang(taskId, cb) {
  httpGet('dashscope.aliyuncs.com', 443, '/api/v1/tasks/' + taskId,
    { 'Authorization': 'Bearer ' + DASHSCOPE_API_KEY },
    (code, data) => {
      if (code === 200) {
        try {
          const j = JSON.parse(data);
          const statusMap = { 'PENDING': 'queued', 'RUNNING': 'processing', 'SUCCEEDED': 'completed', 'FAILED': 'failed' };
          const status = statusMap[j.output?.task_status] || 'unknown';
          const videoUrl = j.output?.video_url || '';
          cb(200, JSON.stringify({ data: { status, outputs: videoUrl ? [videoUrl] : [], provider: 'wanxiang' } }));
        } catch (e) { cb(500, JSON.stringify({ error: { message: '万相轮询解析异常' } })); }
      } else { cb(code, data); }
    });
}

// ── 模型路由器 ──────────────────────────────────────────────
const PROVIDER_ORDER = ['kling', 'wanxiang', 'atlas'];

function generateWithProvider(provider, params, cb) {
  switch (provider) {
    case 'kling': generateKling(params, cb); break;
    case 'wanxiang': generateWanxiang(params, cb); break;
    case 'atlas':
    default:
      proxyToAtlas('POST', '/model/generateVideo', '', JSON.stringify(params), params.authHeader || '', cb); break;
  }
}

function pollWithProvider(provider, taskId, cb) {
  switch (provider) {
    case 'kling': pollKling(taskId, cb); break;
    case 'wanxiang': pollWanxiang(taskId, cb); break;
    case 'atlas':
    default: proxyToAtlas('GET', '/model/prediction/' + taskId, '', null, paramsPollAuth || '', cb); break;
  }
}

// 保存轮询所需的 auth header
var paramsPollAuth = '';

function generateAuto(params, cb) {
  const preferred = params.provider || 'auto';
  if (preferred !== 'auto') {
    paramsPollAuth = params.authHeader || '';
    generateWithProvider(preferred, params, (code, data) => {
      if (code === 200) { cb(code, data); return; }
      // 首选失败，逐个尝试其他
      const fallbacks = PROVIDER_ORDER.filter(p => p !== preferred);
      tryFallback(fallbacks, 0, params, cb);
    });
  } else {
    tryFallback(PROVIDER_ORDER, 0, params, cb);
  }
}

function tryFallback(providers, idx, params, cb) {
  if (idx >= providers.length) { cb(503, JSON.stringify({ error: { message: '所有 AI 模型提供商当前不可用，请稍后重试' } })); return; }
  const provider = providers[idx];
  generateWithProvider(provider, params, (code, data) => {
    if (code === 200) { cb(code, data); }
    else { console.log('[Router] ' + provider + ' 不可用，尝试下一个...'); tryFallback(providers, idx + 1, params, cb); }
  });
}

app.get('/api/image/:id', (req, res) => {
  const img = uploadedImages.get(req.params.id);
  if (!img) return res.status(404).json({ error: '图片过期' });
  res.setHeader('Content-Type', img.mime);
  res.send(img.data);
});

app.post('/api/upload-image', (req, res) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('json') && req.body) {
    if (req.body.image) {
      const buf = Buffer.from(req.body.image, 'base64');
      const id = crypto.randomBytes(16).toString('hex');
      let mime = 'image/png';
      if (buf[0] === 0xFF && buf[1] === 0xD8) mime = 'image/jpeg';
      uploadedImages.set(id, { data: buf, mime });
      setTimeout(() => uploadedImages.delete(id), 300000);
      return res.json({ url: `http://localhost:${PORT}/api/image/${id}` });
    }
    if (req.body.url) return res.json({ url: req.body.url });
  }
  const chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const buf = Buffer.concat(chunks);
    if (buf.length === 0) return res.status(400).json({ error: '无图片' });
    const id = crypto.randomBytes(16).toString('hex');
    let mime = 'image/png';
    uploadedImages.set(id, { data: buf, mime });
    setTimeout(() => uploadedImages.delete(id), 300000);
    res.json({ url: `http://localhost:${PORT}/api/image/${id}` });
  });
});

app.all('/api/v1/*', (req, res) => {
  const body = req.method !== 'GET' ? JSON.stringify(req.body) : null;
  proxyToAtlas(req.method, req.path.replace('/api/v1', ''), '', body, req.headers['authorization'] || '', (code, data) => {
    res.status(code).set('Content-Type', 'application/json').send(data);
  });
});

// 视频生成（带配额和积分检查 + 多模型路由）
app.post('/api/generate', authMiddleware, (req, res) => {
  const quota = checkQuota(req.user);
  if (!quota.allowed) return res.status(402).json({ error: '本月额度已用完，请升级套餐', quota });
  const cost = req.body.compare ? 72 : 36;
  if (req.user.balance < cost) return res.status(402).json({ error: '积分不足', balance: req.user.balance, cost });
  const users = loadDB('users.json');
  const uidx = users.findIndex(u => u.id === req.user.id);
  users[uidx].balance -= cost;
  saveDB('users.json', users);
  recordUsage(req.user.id);
  const txns = loadDB('transactions.json');
  txns.push({ id: crypto.randomUUID(), userId: req.user.id, type: 'consume', amount: -cost, desc: req.body.compare ? '对比模式-双视频' : '视频生成 (' + (req.body.provider || 'atlas') + ')', balance: users[uidx].balance, createdAt: new Date().toISOString() });
  saveDB('transactions.json', txns);
  req.body.authHeader = req.headers['authorization'] || '';
  generateAuto(req.body, (code, data) => {
    if (code >= 400) { users[uidx].balance += cost; saveDB('users.json', users); } // 退款
    try {
      const d = JSON.parse(data);
      // 注入 provider 信息到响应中
      if (d.data) d.data._provider = req.body._provider || 'auto';
      res.status(code).set('Content-Type', 'application/json').send(JSON.stringify(d));
    } catch (e) { res.status(code).set('Content-Type', 'application/json').send(data); }
  });
});

// 轮询（支持多模型）- 不需要认证
app.get('/api/poll/:provider/:taskId', (req, res) => {
  const { provider, taskId } = req.params;
  if (provider === 'atlas') {
    proxyToAtlas('GET', '/model/prediction/' + taskId, '', null, req.headers['authorization'] || '', (code, data) => {
      res.status(code).set('Content-Type', 'application/json').send(data);
    });
  } else {
    pollWithProvider(provider, taskId, (code, data) => {
      res.status(code).set('Content-Type', 'application/json').send(data);
    });
  }
});

// ==================== 商品链接抓取 ====================
app.post('/api/scrape-product', authMiddleware, (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: '请提供商品链接' });
  // 简化版抓取：提取域名，返回模拟数据引导用户手动填写
  let domain = 'unknown';
  try { domain = new URL(url).hostname.replace('www.', ''); } catch (e) { return res.status(400).json({ error: '无效的 URL' }); }
  const hints = Object.entries({
    'taobao.com': { title: '（需要手动输入）淘宝商品标题将显示在此', platform: '淘宝' },
    'tmall.com': { title: '（需要手动输入）天猫商品标题将显示在此', platform: '天猫' },
    '1688.com': { title: '（需要手动输入）1688商品标题将显示在此', platform: '1688' },
    'jd.com': { title: '（需要手动输入）京东商品标题将显示在此', platform: '京东' },
    'shopify.com': { title: '（需要手动输入）Shopify商品标题将显示在此', platform: 'Shopify' },
  });
  let info = { title: '（需要手动输入）商品标题将显示在此', platform: domain, tip: '请手动复制商品标题和描述' };
  for (const [key, val] of hints) { if (domain.includes(key)) { info = { ...val, tip: '请手动复制商品标题和描述' }; break; } }
  // 尝试抓取 meta 标签
  https.get(url, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SeedanceBot/1.0)' } }, (extRes) => {
    let html = '';
    extRes.on('data', c => { html += c.toString(); if (html.length > 50000) extRes.destroy(); });
    extRes.on('end', () => {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
        || html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i);
      const imgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)
        || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i);
      const priceMatch = html.match(/price[":\s]+([\d.]+)/i);
      res.json({
        url, domain,
        title: titleMatch ? titleMatch[1].trim() : info.title,
        description: descMatch ? descMatch[1].trim() : (info.tip || ''),
        image: imgMatch ? imgMatch[1] : '',
        price: priceMatch ? priceMatch[1] : '',
        platform: info.platform,
        tip: info.tip,
        autoFilled: !!titleMatch
      });
    });
    extRes.on('error', () => { res.json({ url, domain, title: info.title, description: info.tip, platform: info.platform, autoFilled: false }); });
  }).on('error', () => { res.json({ url, domain, title: info.title, description: info.tip, platform: info.platform, autoFilled: false }); });
});

// ==================== 健康检查 ====================
app.get('/api/health', (req, res) => {
  const users = loadDB('users.json');
  res.json({ status: 'ok', name: 'Seedance Studio Pro', users: users.length, templates: loadDB('templates.json').length, uptime: process.uptime().toFixed(0) + 's', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

// ==================== 启动 ====================
seedAll();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     Seedance Studio Pro — 统一后端服务                    ║
╠══════════════════════════════════════════════════════════╣
║  地址: http://localhost:${PORT}                              ║
║                                                          ║
║  API 路由:                                                ║
║  POST /api/auth/register|login   — 认证                  ║
║  GET  /api/user/profile|quota|transactions               ║
║  GET  /api/plans                 — 套餐                  ║
║  POST /api/orders                — 支付                  ║
║  GET  /api/templates             — 模板                  ║
║  POST /api/generate              — 生成（含配额检查）      ║
║  ALL  /api/v1/*                  — Atlas API 代理        ║
║  GET  /api/admin/users|orders    — 管理员                ║
║                                                          ║
║  账号: admin/admin123 | test/123456                      ║
╚══════════════════════════════════════════════════════════╝
  `);
});

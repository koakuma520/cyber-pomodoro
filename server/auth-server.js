/**
 * Seedance Studio - 用户认证与积分后端服务
 *
 * Express + JWT + bcrypt 全栈用户系统
 * 数据存储: JSON 文件 (零数据库依赖)
 *
 * 使用方法:
 *   cd server && npm install && npm start
 *   服务运行在 http://localhost:3457
 *
 * 环境变量:
 *   PORT          - 端口号 (默认 3457)
 *   JWT_SECRET    - JWT 密钥 (生产环境必须设置)
 *   ADMIN_USER    - 初始管理员用户名 (默认 admin)
 *   ADMIN_PASS    - 初始管理员密码 (默认 admin123)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3457;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const BCRYPT_ROUNDS = 10;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// ==================== Middleware ====================
app.use(express.json({ limit: '1mb' }));

// 提供前端静态文件 (seedance-studio.html)
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// 简单速率限制
const rateLimit = {};
function simpleRateLimit(req, res, next) {
  const ip = req.ip || '127.0.0.1';
  const now = Date.now();
  if (!rateLimit[ip]) rateLimit[ip] = { count: 0, reset: now + 60000 };
  if (now > rateLimit[ip].reset) rateLimit[ip] = { count: 0, reset: now + 60000 };
  rateLimit[ip].count++;
  if (rateLimit[ip].count > 60) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  }
  next();
}
app.use(simpleRateLimit);

// ==================== 数据层 ====================
const DB_USERS = path.join(__dirname, 'data', 'users.json');
const DB_TXNS = path.join(__dirname, 'data', 'transactions.json');

function loadDB(filepath) {
  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveDB(filepath, data) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// 种子数据：首次启动创建管理员和测试账号
function seedData() {
  let users = loadDB(DB_USERS);
  if (users.length > 0) return; // 已有数据，跳过

  console.log('🌱 首次启动，创建初始账号...');

  const adminHash = bcrypt.hashSync(ADMIN_PASS, BCRYPT_ROUNDS);
  const testHash = bcrypt.hashSync('123456', BCRYPT_ROUNDS);

  users = [
    {
      id: 'seed-admin-001',
      username: ADMIN_USER,
      passwordHash: adminHash,
      balance: 200,
      isAdmin: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 'seed-test-001',
      username: 'test',
      passwordHash: testHash,
      balance: 100,
      isAdmin: false,
      createdAt: new Date().toISOString()
    }
  ];
  saveDB(DB_USERS, users);

  const txns = [
    { id: 'seed-txn-1', userId: 'seed-admin-001', type: 'claim', amount: 200, desc: '管理员初始积分', balance: 200, createdAt: new Date().toISOString() },
    { id: 'seed-txn-2', userId: 'seed-test-001', type: 'claim', amount: 100, desc: '测试账号初始积分', balance: 100, createdAt: new Date().toISOString() }
  ];
  saveDB(DB_TXNS, txns);

  console.log('✅ 管理员账号: ' + ADMIN_USER + ' / ' + ADMIN_PASS);
  console.log('✅ 测试账号: test / 123456');
}

// ==================== JWT 中间件 ====================
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const users = loadDB(DB_USERS);
    const user = users.find(u => u.id === decoded.userId);
    if (!user) throw new Error('用户不存在');
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: '认证失效，请重新登录' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// ==================== Auth API ====================

// 注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: '用户名需2-20个字符' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: '密码至少4个字符' });
    }
    if (/[<>'"\\]/.test(username)) {
      return res.status(400).json({ error: '用户名包含非法字符' });
    }

    const users = loadDB(DB_USERS);
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = {
      id: crypto.randomUUID(),
      username,
      passwordHash: hash,
      balance: 10,
      isAdmin: false,
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveDB(DB_USERS, users);

    // 赠送注册积分
    const txns = loadDB(DB_TXNS);
    txns.push({
      id: crypto.randomUUID(), userId: user.id, type: 'claim',
      amount: 10, desc: '新用户注册赠送', balance: 10,
      createdAt: new Date().toISOString()
    });
    saveDB(DB_TXNS, txns);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: '服务器错误: ' + err.message });
  }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const users = loadDB(DB_USERS);
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: '服务器错误: ' + err.message });
  }
});

// ==================== User API ====================

// 获取个人信息和余额
app.get('/api/user/profile', authMiddleware, (req, res) => {
  // 重新从数据库读取最新余额
  const users = loadDB(DB_USERS);
  const fresh = users.find(u => u.id === req.user.id);
  if (!fresh) return res.status(404).json({ error: '用户不存在' });
  const { passwordHash: _, ...safeUser } = fresh;
  res.json(safeUser);
});

// 充值
app.post('/api/user/recharge', authMiddleware, (req, res) => {
  try {
    const { amount } = req.body;
    const yuan = parseInt(amount);
    if (!yuan || yuan <= 0 || yuan > 10000) {
      return res.status(400).json({ error: '充值金额无效 (1-10000元)' });
    }

    const users = loadDB(DB_USERS);
    const idx = users.findIndex(u => u.id === req.user.id);
    const credits = yuan * 10;
    users[idx].balance += credits;
    saveDB(DB_USERS, users);

    const txns = loadDB(DB_TXNS);
    txns.push({
      id: crypto.randomUUID(), userId: req.user.id, type: 'recharge',
      amount: credits, desc: '充值 ' + yuan + ' 元',
      balance: users[idx].balance,
      createdAt: new Date().toISOString()
    });
    saveDB(DB_TXNS, txns);

    res.json({ balance: users[idx].balance, message: '充值成功 +' + credits + '积分' });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 免费领取 (每日一次)
app.post('/api/user/claim-free', authMiddleware, (req, res) => {
  try {
    const txns = loadDB(DB_TXNS);
    const today = new Date().toISOString().slice(0, 10);
    const alreadyClaimed = txns.some(t =>
      t.userId === req.user.id && t.type === 'claim' && t.createdAt.slice(0, 10) === today
    );
    if (alreadyClaimed) {
      return res.status(400).json({ error: '今天已领取过，明天再来' });
    }

    const users = loadDB(DB_USERS);
    const idx = users.findIndex(u => u.id === req.user.id);
    users[idx].balance += 10;
    saveDB(DB_USERS, users);

    txns.push({
      id: crypto.randomUUID(), userId: req.user.id, type: 'claim',
      amount: 10, desc: '每日免费领取 $1 额度',
      balance: users[idx].balance,
      createdAt: new Date().toISOString()
    });
    saveDB(DB_TXNS, txns);

    res.json({ balance: users[idx].balance, message: '领取成功 +10积分' });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 交易记录
app.get('/api/user/transactions', authMiddleware, (req, res) => {
  try {
    const type = req.query.type;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const txns = loadDB(DB_TXNS);
    let userTxns = txns.filter(t => t.userId === req.user.id);
    if (type) userTxns = userTxns.filter(t => t.type === type);

    const total = userTxns.length;
    const start = (page - 1) * limit;
    const items = userTxns.slice(start, start + limit);

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// ==================== Admin API ====================

// 查看所有用户
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = loadDB(DB_USERS);
    // 同时返回每个用户的交易记录数
    const txns = loadDB(DB_TXNS);
    const safeUsers = users.map(u => {
      const { passwordHash: _, ...safe } = u;
      const txnCount = txns.filter(t => t.userId === u.id).length;
      safe.txnCount = txnCount;
      return safe;
    });
    res.json({ users: safeUsers });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 调整用户余额
app.post('/api/admin/adjust-balance', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { targetUserId, delta, desc } = req.body;
    if (!targetUserId || typeof delta !== 'number' || delta === 0) {
      return res.status(400).json({ error: '参数无效' });
    }

    const users = loadDB(DB_USERS);
    const idx = users.findIndex(u => u.id === targetUserId);
    if (idx < 0) return res.status(404).json({ error: '用户不存在' });

    users[idx].balance = Math.max(0, users[idx].balance + delta);
    saveDB(DB_USERS, users);

    const txns = loadDB(DB_TXNS);
    txns.push({
      id: crypto.randomUUID(), userId: targetUserId,
      type: delta >= 0 ? 'admin_bonus' : 'admin_deduct',
      amount: delta,
      desc: desc || '管理员调整',
      balance: users[idx].balance,
      createdAt: new Date().toISOString()
    });
    saveDB(DB_TXNS, txns);

    res.json({ balance: users[idx].balance, message: '余额已调整' });
  } catch (err) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  const users = loadDB(DB_USERS);
  const txns = loadDB(DB_TXNS);
  res.json({
    status: 'ok',
    mode: 'auth-server',
    users: users.length,
    transactions: txns.length,
    uptime: process.uptime().toFixed(0) + 's',
    timestamp: new Date().toISOString()
  });
});

// 首页重定向到 seedance-studio.html
app.get('/', (req, res) => {
  res.redirect('/seedance-studio.html');
});

// ==================== 启动 ====================
seedData();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║        Seedance Studio 用户认证服务                       ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  服务地址: http://localhost:${PORT}                         ║
║  前端页面: http://localhost:${PORT}/seedance-studio.html     ║
║                                                          ║
║  API 路由:                                                ║
║  POST /api/auth/register     - 用户注册                   ║
║  POST /api/auth/login        - 用户登录                   ║
║  GET  /api/user/profile      - 个人信息                   ║
║  POST /api/user/recharge     - 充值                      ║
║  POST /api/user/claim-free   - 免费领取                   ║
║  GET  /api/user/transactions - 交易记录                   ║
║  GET  /api/admin/users       - 管理员：用户列表            ║
║  POST /api/admin/adjust-balance - 管理员：调整余额        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

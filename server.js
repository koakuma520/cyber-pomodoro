const express    = require('express');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const fs         = require('fs');
const path       = require('path');

const app = express();
const PORT = process.env.PORT || 3457;

// --- 配置 ---
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const BCRYPT_ROUNDS = 10;
const FRONTEND_DIR = path.join(__dirname, 'www');
const DATA_DIR = path.join(__dirname, 'server', 'data');

// --- JSON 数据库工具 ---
function loadDB(filename) {
  try {
    const data = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return filename.endsWith('.json') && filename.includes('users') ? [] :
           filename.includes('products') ? [] :
           filename.includes('carts') ? [] :
           filename.includes('orders') ? [] :
           filename.includes('transactions') ? [] : [];
  }
}

function saveDB(filename, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// --- 中间件 ---
app.use(express.json({ limit: '1mb' }));
app.use(express.static(FRONTEND_DIR));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// 简单限流（基于 IP）
const rateMap = new Map();
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000;
  const maxReq = 120;

  if (!rateMap.has(ip)) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    const entry = rateMap.get(ip);
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + windowMs;
    } else {
      entry.count++;
      if (entry.count > maxReq) {
        return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
      }
    }
  }
  next();
});

// 定期清理限流记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(ip);
  }
}, 120000);

// --- JWT 中间件 ---
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET);
    const users = loadDB('users.json');
    const user = users.find(u => u.id === decoded.userId);
    if (!user) return res.status(401).json({ error: '用户不存在' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

// --- 种子数据 ---
function seedData() {
  seedUsers();
  seedProducts();
}

function seedUsers() {
  const users = loadDB('users.json');
  if (users.length > 0) return;

  const now = new Date().toISOString();

  // 管理员
  const adminPwd = bcrypt.hashSync('admin123', BCRYPT_ROUNDS);
  const admin = {
    id: 'admin-001',
    username: 'admin',
    passwordHash: adminPwd,
    phone: '',
    address: null,
    isAdmin: true,
    createdAt: now
  };

  // 测试用户
  const testPwd = bcrypt.hashSync('123456', BCRYPT_ROUNDS);
  const testUser = {
    id: crypto.randomUUID(),
    username: 'test',
    passwordHash: testPwd,
    phone: '13800138000',
    address: { name: '张三', phone: '13800138000', province: '广东省', city: '深圳市', district: '南山区', detail: '科技园路1号' },
    isAdmin: false,
    createdAt: now
  };

  saveDB('users.json', [admin, testUser]);
  console.log('用户种子数据已初始化');
}

function seedProducts() {
  const existingProducts = loadDB('products.json');
  if (existingProducts.length > 0) return;

  const now = new Date().toISOString();

  // 种子商品
  const products = [
    {
      id: 'trial001', name: '喜糖试吃包（包邮）', category: 'candy', subCategory: '试吃体验',
      description: '9.9元包邮试吃包，内含3-5款自选喜糖+风格盒样。降低决策门槛，先试吃再下单！确认喜欢后再定制大单，无忧体验。',
      price: 9.9, originalPrice: 29.9,
      images: [], specs: [
        { name: '风格偏好', options: ['中式典雅', '森系清新', '星空梦幻', '粉色浪漫'] }
      ], stock: 999, sales: 520, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p001', name: '法式玫瑰喜糖礼盒', category: 'candy', subCategory: '喜糖盒',
      description: '精美法式玫瑰主题喜糖礼盒，内含6颗进口巧克力与法式牛轧糖，粉色浪漫包装，适合婚礼回礼。',
      price: 29.9, originalPrice: 39.9,
      images: [], specs: [
        { name: '规格', options: ['20份装', '50份装', '100份装'] },
        { name: '颜色', options: ['粉色', '香槟金', '蒂芙尼蓝'] }
      ], stock: 999, sales: 86, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p002', name: '中式喜糖铁盒（龙凤呈祥）', category: 'candy', subCategory: '喜糖盒',
      description: '传统中式龙凤呈祥图案铁盒，内含8颗手工酥糖和奶糖，红色喜庆大气，长辈最爱。',
      price: 35.0, originalPrice: 45.0,
      images: [], specs: [
        { name: '规格', options: ['30份装', '60份装', '100份装'] }
      ], stock: 500, sales: 120, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p003', name: '定制婚礼喜糖袋', category: 'candy', subCategory: '喜糖袋',
      description: '丝绒质感喜糖袋，可定制新人名字和婚礼日期烫金印刷，内含6颗混合糖果。',
      price: 18.8, originalPrice: 25.8,
      images: [], specs: [
        { name: '颜色', options: ['酒红', '墨绿', '藏蓝', '香槟金'] },
        { name: '规格', options: ['10份装', '50份装', '100份装'] }
      ], stock: 800, sales: 210, isOnSale: true, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p004', name: '日系森系喜糖伴手礼套装', category: 'candy', subCategory: '伴手礼',
      description: '清新森系风格伴手礼套装，含定制糖果+小罐蜂蜜+干花香包，文艺婚礼首选。',
      price: 68.0, originalPrice: 88.0,
      images: [], specs: [
        { name: '风格', options: ['森系绿', '暖阳橘', '海洋蓝'] }
      ], stock: 300, sales: 65, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p005', name: '手工巧克力礼盒', category: 'candy', subCategory: '巧克力',
      description: '比利时进口原料手工制作，12颗装，6种口味，精美礼盒包装，适合婚礼甜品台。',
      price: 128.0, originalPrice: 168.0,
      images: [], specs: [
        { name: '规格', options: ['12颗装', '24颗装', '36颗装'] }
      ], stock: 200, sales: 42, isOnSale: true, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p006', name: '星空棒棒糖礼盒', category: 'candy', subCategory: '创意糖果',
      description: '梦幻星空图案棒棒糖，12支装，每支都是独一无二的星空图案，婚礼甜品台亮点。',
      price: 49.9, originalPrice: 65.0,
      images: [], specs: [
        { name: '规格', options: ['6支装', '12支装', '24支装'] }
      ], stock: 400, sales: 150, isOnSale: false, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p101', name: '婚礼迎宾牌（定制）', category: 'wedding', subCategory: '迎宾区',
      description: '高品质亚克力/木质迎宾牌，可定制新人名字、婚礼日期和欢迎语，多种尺寸可选。',
      price: 168.0, originalPrice: 228.0,
      images: [], specs: [
        { name: '材质', options: ['亚克力', '木质', '金属框'] },
        { name: '尺寸', options: ['60x80cm', '80x100cm', '100x120cm'] }
      ], stock: 100, sales: 35, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p102', name: '婚礼签到册（定制皮质）', category: 'wedding', subCategory: '签到区',
      description: '高级皮质封面婚礼签到册，内页高档艺术纸，可烫金新人名字，留作永久纪念。',
      price: 198.0, originalPrice: 268.0,
      images: [], specs: [
        { name: '颜色', options: ['红色', '白色', '香槟金', '粉色'] }
      ], stock: 80, sales: 28, isOnSale: true, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p103', name: '婚礼桌花装饰套装', category: 'wedding', subCategory: '桌面装饰',
      description: '精美婚礼桌花套装，含主花+辅花+绿叶搭配，仿真花材质可长期保存，10桌起订。',
      price: 88.0, originalPrice: 118.0,
      images: [], specs: [
        { name: '色系', options: ['粉色系', '白色系', '香槟色系', '红色系'] },
        { name: '规格', options: ['小型（直径20cm）', '中型（直径30cm）', '大型（直径40cm）'] }
      ], stock: 150, sales: 55, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p104', name: '婚礼背景纱幔装饰', category: 'wedding', subCategory: '背景装饰',
      description: '浪漫唯美婚礼背景纱幔，含LED灯串，多种颜色可选，打造梦幻婚礼场景。',
      price: 258.0, originalPrice: 358.0,
      images: [], specs: [
        { name: '颜色', options: ['白色', '粉色', '香槟金', '星空紫'] },
        { name: '尺寸', options: ['3m宽', '5m宽', '8m宽'] }
      ], stock: 60, sales: 22, isOnSale: false, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p105', name: '婚礼伴手礼盒套装', category: 'wedding', subCategory: '伴手礼',
      description: '精致伴手礼盒，含定制糖果+香薰蜡烛+感谢卡，可定制包装风格，让宾客感受满满心意。',
      price: 45.0, originalPrice: 58.0,
      images: [], specs: [
        { name: '风格', options: ['中式典雅', '西式浪漫', '极简现代'] },
        { name: '规格', options: ['30份装', '50份装', '100份装'] }
      ], stock: 250, sales: 98, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p106', name: '婚礼气球拱门套装', category: 'wedding', subCategory: '场地布置',
      description: 'DIY婚礼气球拱门套装，含气球+支架+安装工具，颜色可定制，轻松打造浪漫拱门。',
      price: 128.0, originalPrice: 168.0,
      images: [], specs: [
        { name: '颜色方案', options: ['红金', '粉白', '金白', '渐变彩虹'] },
        { name: '规格', options: ['标准（高2m）', '大型（高2.5m）', '豪华（高3m）'] }
      ], stock: 90, sales: 40, isOnSale: true, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p201', name: '精致喜糖伴手礼（纸盒装）', category: 'gift', subCategory: '伴手礼',
      description: '简约精致纸盒装伴手礼，内含4颗喜糖+小罐蜂蜜+感谢卡，性价比之选。',
      price: 15.8, originalPrice: 22.8,
      images: [], specs: [
        { name: '颜色', options: ['粉色', '白色', '金色'] }
      ], stock: 600, sales: 320, isOnSale: true, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p202', name: '高级婚礼伴手礼（皮质礼盒）', category: 'gift', subCategory: '伴手礼',
      description: '高档皮质礼盒装伴手礼，含6颗进口巧克力+定制香薰蜡烛+真皮钥匙扣，奢华体验。',
      price: 168.0, originalPrice: 228.0,
      images: [], specs: [
        { name: '颜色', options: ['棕色皮质', '粉色皮质', '白色皮质'] }
      ], stock: 120, sales: 56, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p203', name: '婚礼甜品台摆件套装', category: 'gift', subCategory: '甜品台',
      description: '婚礼甜品台装饰套装，含三层甜品架+装饰摆件+标签牌，打造高颜值甜品展示区。',
      price: 299.0, originalPrice: 399.0,
      images: [], specs: [
        { name: '风格', options: ['复古宫廷', '田园森系', '现代极简'] }
      ], stock: 40, sales: 18, isOnSale: true, isFeatured: false,
      createdAt: now, updatedAt: now
    },
    {
      id: 'p204', name: '个性化定制糖果', category: 'gift', subCategory: '定制糖果',
      description: '可定制图案和文字的个性化糖果，适用于婚礼logo糖、照片糖、文字糖，50份起订。',
      price: 25.0, originalPrice: 35.0,
      images: [], specs: [
        { name: '类型', options: ['Logo定制糖', '照片糖', '文字糖'] },
        { name: '规格', options: ['50份装', '100份装', '200份装'] }
      ], stock: 500, sales: 75, isOnSale: true, isFeatured: true,
      createdAt: now, updatedAt: now
    }
  ];

  saveDB('products.json', products);
  saveDB('carts.json', []);
  saveDB('orders.json', []);
  saveDB('transactions.json', []);
  console.log('商品种子数据已初始化（' + products.length + ' 件商品）');
}

// --- 路由 ---
const authRoutes     = require('./server/routes/auth');
const productsRoutes = require('./server/routes/products');
const cartRoutes     = require('./server/routes/cart');
const ordersRoutes   = require('./server/routes/orders');
const adminRoutes    = require('./server/routes/admin');
const wechatRoutes   = require('./server/routes/wechat');

// 公共 API
app.use('/api/auth', authRoutes({ jwt, bcrypt, JWT_SECRET, BCRYPT_ROUNDS, loadDB, saveDB, crypto }));
app.use('/api/products', productsRoutes({ loadDB, saveDB, crypto }));

// 微信 API（部分公开、部分需登录）
// 支付下单需要登录
app.post('/api/wechat/pay/order', authMiddleware);
app.use('/api/wechat', wechatRoutes({ loadDB, saveDB, crypto, jwt, JWT_SECRET }));

// 需登录 API
app.use('/api/cart',   authMiddleware, cartRoutes({ loadDB, saveDB }));
app.use('/api/orders', authMiddleware, ordersRoutes({ loadDB, saveDB, crypto }));

// 用户 API（部分公开部分需登录）
app.use('/api/user', authRoutes({ jwt, bcrypt, JWT_SECRET, BCRYPT_ROUNDS, loadDB, saveDB, crypto }));

// 管理后台 API
app.use('/api/admin', authMiddleware, adminMiddleware, adminRoutes({ loadDB, saveDB, crypto }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 前端页面回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: '接口不存在' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// --- 启动 ---
seedData();
app.listen(PORT, () => {
  console.log('🈴 金鼎囍铺已启动: http://localhost:' + PORT);
  console.log('管理员账号: admin / admin123');
  // 微信配置状态
  const wx = require('./server/wechat');
  if (wx.APPID && wx.SECRET) {
    console.log('[WX] 微信已配置 AppID:', wx.APPID);
  } else {
    console.log('[WX] ⚠ 微信未配置 — 请设置环境变量 WX_APPID / WX_SECRET');
  }
  if (wx.MCHID && wx.MCH_KEY) {
    console.log('[WX] 微信支付已配置 MchID:', wx.MCHID);
  } else {
    console.log('[WX] ⚠ 微信支付未配置 — 请设置 WX_MCHID / WX_MCH_KEY');
  }
});

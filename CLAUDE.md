# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

本仓库包含三个独立项目：

- **金鼎囍铺** (根目录) — 糖果婚庆微信公众号 H5 商城，含完整电商+微信集成
- **Seedance Studio** (`seedance-studio.html`) — AI 视频生成网页应用，调用 Atlas Cloud API
- **Pomodoro** (`pomodoro/`) — Electron 番茄钟应用（详见 `pomodoro/CLAUDE.md`）

## 常用命令

```bash
# 启动金鼎囍铺主服务器（端口 3457，包含所有功能）
node server.js

# 设置微信配置（可选，未设置时回退为模拟模式）
set WX_APPID=wx你的AppID
set WX_SECRET=你的AppSecret
set WX_MCHID=你的商户号          # 微信支付需要
set WX_MCH_KEY=你的商户密钥       # 微信支付需要
set JWT_SECRET=随机字符串         # 生产环境必设

# 访问页面
# http://localhost:3457           （金鼎囍铺商城）
# http://localhost:3457/admin.html（管理后台）
```

## 金鼎囍铺 架构（微信公众号 H5 商城）

### 文件结构

```
server.js                 # Express 主入口（端口 3457），挂载所有路由
package.json              # 根目录依赖（express, jsonwebtoken, bcryptjs）
.env.example              # 环境变量模板
www/                      # 前端静态文件
  index.html              # SPA 壳体（微信 meta 标签、3 菜单底栏、欢迎覆盖层）
  admin.html              # 独立管理后台页面
  css/app.css             # 完整主题（玫瑰粉+香槟金+蒂芙尼蓝）
  js/
    wechat-sdk.js         # 微信 JS-SDK / OAuth / 支付 前端封装 (WX_SDK)
    config.js             # C 配置常量（分类、订单状态、支付方式）
    state.js              # SK 存储键、AUTH 全局状态、dbGet/dbSet
    api.js                # REST 封装（apiGet/apiPost/apiPut/apiDelete，自动注入 JWT）
    ui.js                 # Toast、Modal、Loading、空状态
    components.js         # 可复用渲染函数（导航栏、商品卡片、规格选择器等）
    auth.js               # 登录/注册覆盖层
    app.js                # 入口：哈希路由、OAuth 回调、SDK 初始化
    pages/
      home.js             # 糖铺子首页（双列商品网格、分类、搜索、试吃包推荐）
      product-detail.js   # 商品详情（规格选择、加购、立即购买）
      gallery.js          # 灵感库（6 套婚礼案例、分类筛选、同款推荐）
      consult.js          # 档期咨询（服务报价、咨询表单、关于我们）
      cart.js             # 购物车
      checkout.js         # 结算（微信支付/模拟支付自动切换）
      orders.js           # 我的订单
      admin.js            # 管理后台内嵌版
    admin-app.js          # 管理后台独立应用逻辑
server/
  wechat.js               # 微信核心服务（AccessToken/JSAPI/OAuth/签名/支付）
  routes/
    auth.js               # 注册/登录/用户资料（JWT + bcrypt）
    products.js           # 商品 CRUD + 分类 + 搜索 + 分页
    cart.js               # 购物车 CRUD + 合并
    orders.js             # 订单生命周期（创建→支付→发货→完成→取消）
    admin.js              # 管理后台（统计、商品管理、订单管理、用户列表）
    wechat.js             # 微信 API（OAuth入口/回调、JS-SDK签名、统一下单、支付通知）
  data/                   # JSON 数据库（自动创建）
    users.json / products.json / carts.json / orders.json / transactions.json
```

### 数据模型

- **用户** — `{ id, username, passwordHash, wxOpenid?, phone, address, isAdmin, createdAt }`。微信 OAuth 用户无密码
- **商品** — `{ id, name, category, subCategory, description, price, originalPrice, images[], specs[], stock, sales, isOnSale, isFeatured }`
- **订单** — `{ id (如 20260514-XXXX), userId, items[], totalAmount, status, shippingAddress, paymentMethod, wxTransactionId?, *At }`
- **购物车** — `{ userId, items: [{ productId, name, price, image, quantity, selectedSpecs }] }`
- **分类** — `candy`(糖果) | `wedding`(婚庆) | `gift`(伴手礼)
- **订单状态** — `pending → paid → shipped → completed`，`cancelled` 仅可从 `pending` 进入

### 前端路由（哈希 SPA）

| Hash | 页面 | 需登录 |
|------|------|--------|
| `#/home` | 糖铺子（商品目录） | 否 |
| `#/product/:id` | 商品详情 | 否 |
| `#/gallery` | 灵感库（婚礼案例） | 否 |
| `#/consult` | 档期咨询 | 否 |
| `#/cart` | 购物车 | 是 |
| `#/checkout` | 结算 | 是 |
| `#/orders` | 我的订单 | 是 |
| `#/profile` | 个人中心 | 是 |
| `#/admin` | 管理后台（需管理员） | 是 |

### 微信集成

三种模式自动适配：

| 能力 | 微信环境 | 非微信环境 |
|------|----------|-----------|
| 登录 | 静默 OAuth 自动登录（snsapi_base） | 手动账号密码登录 |
| 支付 | 微信支付 JSAPI（需商户号） | 模拟支付 |
| 分享 | JS-SDK 自定义分享文案 | 浏览器原生 |

OAuth 流程：`用户访问 → 后端检测无 token → 跳转微信授权 → code 换 openid → 自动创建/绑定用户 → 签发 JWT → 回传前端`

### 关键模式

- **JSON 文件存储** — `loadDB(filename)` / `saveDB(filename, data)` 同步读写，整个文件重写。`data/` 目录自动创建
- **JWT 认证** — `authMiddleware` 从 `Authorization: Bearer <token>` 提取并验证，`req.user` 获取当前用户
- **种子数据** — `seedUsers()` 和 `seedProducts()` 独立执行，幂等（检查已存在则跳过）
- **全局状态** — 前端使用 `AUTH`(用户/token)、`P`(页面状态)、`C`(配置常量)、`SK`(存储键) 全局对象
- **前端 JS 加载顺序** — config.js → state.js → api.js → ui.js → components.js → auth.js → 各页面 → app.js，顺序不能乱
- **购物车同步** — 未登录存 localStorage，登录后 `POST /api/cart/merge` 合并到服务端

## Seedance Studio 架构

### 文件结构

```
seedance-studio.html     # 完整 SPA (~2900 行，单文件 vanilla HTML/CSS/JS)
proxy-server.js          # 本地反向代理 (端口 3456)
server/
  auth-server.js         # Express JWT 认证后端 (端口 3457)
  package.json           # 依赖: express, jsonwebtoken, bcryptjs
```

### 数据流

```
浏览器 (seedance-studio.html)
  │
  ├─ localStorage (Mock API 模式)
  │   ├─ seedance_users          # 用户数据
  │   ├─ seedance_sessions       # 会话 token → userId
  │   ├─ seedance_api_key        # Atlas Cloud API Key（管理员管理，全局共享）
  │   ├─ seedance_history        # 生成历史
  │   ├─ seedance_transactions   # 积分交易记录
  │   └─ sd_auth_token           # 当前登录 token
  │
  ├─ proxy-server.js (端口 3456)
  │   ├─ GET  /                  → 提供 seedance-studio.html
  │   ├─ /api/v1/*               → 转发至 api.atlascloud.ai（解决 CORS）
  │   └─ /api/image/:id          → 托管上传的图片
  │
  └─ Atlas Cloud API (外部)
      ├─ POST /api/v1/model/generateVideo
      └─ GET  /api/v1/model/prediction/{id}
```

### 页面模块

`seedance-studio.html` 内的功能模块：

| 区域 | 说明 |
|------|------|
| Auth Overlay | 登录/注册覆盖层，未认证时占据全屏 |
| Header | Logo、积分余额（金色渐变）、充值/领取/管理员/退出按钮 |
| API Key 卡片 | 管理员集中管理，保存在 `seedance_api_key`，全局共享 |
| 生成器卡片 | 文本/图片转视频、分辨率/比例/时长、seed 控制 |
| 对比模式 | 双参数并发生成 + 双 poll 轮询 |
| 进度区域 | 进度条 + 状态文字 + 预估时间 |
| 结果展示 | 视频播放器、复制/下载/分享按钮 |
| Drama Workbench | 多场景批量生成（场景 CRUD、角色库、模板库） |
| 灵感画廊 | 预设 prompt 一键填入 |
| 历史记录 | 最近 50 条生成记录 |
| 积分系统 | 1元=10积分，生成视频一次消耗 36 积分 |
| 管理员面板 | API Key 管理（仅 isAdmin 用户可见） |
| Toast | 右下角通知弹窗 |

### 认证系统

两种模式通过代码共存：

1. **Mock API（localStorage）** — `SK` 存储键 + `mock*` 函数 + `AUTH` 对象。`initMockDB()` 初始化种子数据 (admin/admin123=管理员200积分, test/123456=普通50积分)。新注册用户送 20 积分。
2. **全栈后端（Express）** — `server/auth-server.js`，JWT + bcrypt，JSON 文件持久化。

当前使用 Mock API 模式。切换方式：将 `doLogin()` 等函数中的 `mockLogin` 替换为 `fetch('http://localhost:3457/api/auth/login', ...)`。

### 关键 JS 对象

- `SK` — localStorage 存储键常量
- `AUTH` — 当前认证状态 (`token`, `user`, `balance`, `tokenKey`)
- `S` — 生成器状态 (`key`, `model`, `mode`, `prompt`, `videoUrl`, `polling`, `tasks[]`)
- `C` — 配置常量 (`GEN`, `POLL`, `PRICE`, `MAX_POLL`, `POLL_INTERVAL`, `UPLOAD`)
- `DR` — Drama Workbench 状态 (`scenes[]`, `chars[]`, `tpls[]`, `results[]`, `generating`)
- `dbGet(key)` / `dbSet(key, val)` — localStorage 数据访问层

### init 流程

```
DOMContentLoaded → init() [wrapped]
  → await checkAuth()          # 检查 localStorage 中的 sd_auth_token
  → 设置 API Key                # 从 seedance_api_key 读取
  → loadHist() / setStat()     # 加载历史、设置状态
  → 绑定事件监听器              # prompt 输入、文件拖放等
  → dramaInit() + dramaRenderAll()
```

### 重要注意事项

- 这是一个**单文件 HTML**（非模块化），所有 JS 通过 `<script>` 标签内联，函数间通过全局作用域通信
- `await` **必须**在 `async function` 内使用，否则会导致整个脚本解析失败，所有函数都不可用
- 代理服务器 `proxy-server.js` 必须在浏览器访问前启动——它解决 CORS 并提供图片上传托管
- 积分扣除发生在视频生成**成功后**（在 poll 回调中调用 `mockConsume`），而非提交时
- 硬刷新 (`Ctrl+Shift+R`) 对于清除浏览器缓存的旧 JS 有时是必要的

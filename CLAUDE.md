# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

本仓库包含四个独立项目：

- **Seedance Studio Pro** (`seedance-server.js` + `www-seedance/`) — AI 视频营销 SaaS 平台，含多模型路由、电商模板、套餐支付、商品抓取
- **金鼎囍铺** (根目录 `server.js` + `www/`) — 糖果婚庆微信公众号 H5 商城，含完整电商+微信集成
- **Seedance Studio** (`seedance-studio.html`) — AI 视频生成网页应用（原始单文件版，已被 Pro 取代，保留归档）
- **Pomodoro** (`pomodoro/`) — Electron 番茄钟应用（详见 `pomodoro/CLAUDE.md`）

## 常用命令

```bash
# ========== Seedance Studio Pro（AI 视频营销 SaaS）==========
npm run seedance          # 启动 Pro 服务器（端口 3456）
npm run seedance-dev      # 开发模式（自动重启）
# 访问 http://localhost:3456

# 可选环境变量
set KLING_ACCESS_KEY=xxx      # 可灵 AI（视频生成）
set KLING_SECRET_KEY=xxx
set DASHSCOPE_API_KEY=xxx     # 通义万相（视频生成）
set JWT_SECRET=随机字符串      # 生产环境必设

# ========== 金鼎囍铺（婚庆商城）==========
node server.js           # 启动商城服务器（端口 3457）
# 访问 http://localhost:3457（商城） http://localhost:3457/admin.html（后台）

# 微信配置（可选）
set WX_APPID=wx你的AppID
set WX_SECRET=你的AppSecret
set WX_MCHID=你的商户号
set WX_MCH_KEY=你的商户密钥
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

## Seedance Studio Pro 架构（主项目）

Seedance Studio Pro 是本仓库的核心项目，由原始单文件 `seedance-studio.html` 重构而来，采用前后端分离架构。

### 文件结构

```
seedance-server.js            # 统一后端 (端口 3456) — Express 单体服务
www-seedance/                 # 前端 SPA（模块化 vanilla JS）
  index.html                  # SPA 入口，加载所有 JS 和 CSS
  css/app.css                 # 深色主题（774行，CSS 自定义属性）
  js/
    config.js                 # 全局状态: SK, AUTH, C, S, DR, ERR_MSGS, quotaData
    api.js                    # 前端 API 封装: apiPost, apiGet, callApi, escHtml, friendlyErr
    ui.js                     # UI 辅助: toast, showErr, updateBalanceUI, loadQuota, setStat,
                              #   showPaywall/hidePaywall, toggleKey/Advanced, isAdmin
    auth.js                   # 认证: switchAuthTab, doLogin, doRegister, onAuthSuccess,
                              #   doLogout, checkAuth, rechargeModal, claimFree, showUpgradeModal
    generator.js              # 视频生成引擎: generate, startPoll, startDualPoll,
                              #   showResult/DualResult/Overlay, loadHist, pickProvider,
                              #   scrapeProduct, useScrapedData, fillPrompt, switchMode/pickModel,
                              #   toggleCompare, randSeed, updateCost, updateGenBtn, saveKey
    drama.js                  # 短剧工作台: dramaInit, dramaAddScene/RemoveScene/MoveScene,
                              #   dramaUpdateScene/ToggleChar/ApplyTpl, dramaBatchGen
    ecommerce-templates.js    # 电商模板: ECOM_TPL[10], loadTemplates, renderTemplateQuickBar,
                              #   setupTemplateDelegation (事件委托), useTemplate
    admin.js                  # 管理员面板: toggleAdminPanel, renderAdminPanel,
                              #   saveAdminApiKey, adjustBalance, approveOrder/rejectOrder
    app.js                    # 入口: initApp (防重复 _appInited), DOMContentLoaded 监听
seedance-studio.html          # 原始单文件版（归档参考，不再使用）
proxy-server.js               # 旧代理（归档参考，功能已合并到 seedance-server.js）
server/auth-server.js         # 旧认证后端（归档参考，功能已合并到 seedance-server.js）
```

### 前端 JS 加载顺序（不能乱）

```
config.js → api.js → ui.js → auth.js → generator.js → drama.js → ecommerce-templates.js → admin.js → app.js
```

所有函数通过全局作用域通信（vanilla JS，无模块打包工具）。

### 后端 API 全览

| 模块 | 端点 | 认证 |
|------|------|------|
| 认证 | `POST /api/auth/register`, `POST /api/auth/login` | 无 |
| 用户 | `GET /api/user/profile`, `GET /api/user/quota`, `GET /api/user/transactions` | JWT |
| 用户操作 | `POST /api/user/recharge`, `POST /api/user/claim-free` | JWT |
| 套餐 | `GET /api/plans` | 无 |
| 支付 | `POST /api/orders`, `POST /api/orders/:id/verify`, `GET /api/orders` | JWT |
| 模板 | `GET /api/templates`, `GET /api/templates/:id` | 无 |
| 生成 | `POST /api/generate` (含配额+积分检查+多模型路由) | JWT |
| 轮询 | `GET /api/poll/:provider/:taskId` | 无 |
| 抓取 | `POST /api/scrape-product` | JWT |
| 历史 | `GET /api/history`, `POST /api/history` | JWT |
| 图片 | `POST /api/upload-image`, `GET /api/image/:id` | 无 |
| 代理 | `ALL /api/v1/*` → Atlas Cloud API | 无 |
| 管理 | `GET /api/admin/users`, `POST /api/admin/adjust-balance`, `GET /api/admin/orders`, `POST /api/admin/orders/:id/approve|reject` | JWT+Admin |
| 健康 | `GET /api/health` | 无 |

### 多模型路由

后端支持三种 AI 视频生成提供商，可通过环境变量配置：

- **Atlas Cloud** (默认) — 需要用户在前端配置 API Key，通过 `ALL /api/v1/*` 代理
- **可灵 Kling** — 需设置 `KLING_ACCESS_KEY` + `KLING_SECRET_KEY`，JWT 签名认证
- **通义万相 Wanxiang** — 需设置 `DASHSCOPE_API_KEY`，阿里云 DashScope API

路由策略：`POST /api/generate` 接受 `provider` 参数 (`atlas`|`kling`|`wanxiang`|`auto`)。`auto` 模式按 Kling → Wanxiang → Atlas 顺序尝试，任一成功即返回，全部失败返回 503。

### 套餐体系

四档订阅：`free`(5条/月,水印) / `personal`(99元/月,50条) / `pro`(499元/月,300条) / `enterprise`(1999元/月,1500条)

支付流程MVP版：用户选择套餐 → 创建订单 → 微信扫码支付 → 输入交易号 → 管理员在面板审批 → 套餐激活。配额用 `video_usage.json` 按月跟踪。

### 数据库

JSON 文件存储（`server/data/`）：`users.json`, `transactions.json`, `plans.json`, `templates.json`, `orders.json`, `video_usage.json`, `history.json`。服务器首次启动自动创建种子数据（管理员 admin/admin123 + 测试 test/123456 + 10个电商模板 + 4级套餐）。

### 全局 JS 对象速查

- `SK` — localStorage 键名（`USERS, SESSIONS, API_KEY, HISTORY, TXNS`）
- `AUTH` — `{ tokenKey, token, user, balance }`
- `C` — `{ API, UPLOAD, GEN, POLL, MODELS, PRICE, POLL_INTERVAL, MAX_POLL }`
- `S` — `{ key, model, mode, provider, taskId, polling, pollTimer, videoUrl, prompt, img1, img2, compare, tasks[], resultVideoUrls }`
- `DR` — `{ chars[], tpls[], scenes[], results[], generating, charIdCounter }`
- `ERR_MSGS` — 错误信息映射（`insufficient→余额不足` 等）
- `quotaData` — `{ used, limit, remaining, plan }`
- `ECOM_TPL` — 10个电商模板数组 `[{ id, name, icon, promptTemplate, tips }]`
- `ALL_HISTORY` — 生成历史缓存数组

### 关键设计模式

- **认证** — 前端存 JWT 到 `localStorage[AUTH.tokenKey]`，`apiPost/apiGet` 自动注入 `Authorization: Bearer` 头
- **防重复初始化** — `initApp()` 用 `_appInited` 标记防止 `onAuthSuccess` 重复调用导致事件监听器重复绑定
- **事件委托** — 模板卡片使用 `templateQuickGrid` 上的委托监听 + `data-tpl-id` 属性，而非内联 `onclick`
- **积分扣除** — 在 `POST /api/generate` 后端统一扣积分，API 调用失败自动退款
- **`onAuthSuccess`** — 只刷新认证依赖数据（`loadQuota/loadHist/loadTemplates/setupTemplateDelegation`），不调用 `initApp`
- **模板系统** — 前端 `ECOM_TPL` 内置 10 个默认模板，后端 `/api/templates` 返回服务器模板（可覆盖），`renderTemplateQuickBar` 在页面加载和登录后都会调用

## Seedance Studio 原始版（归档）

`seedance-studio.html`（2869行单文件）是 Pro 版的前身，使用 localStorage Mock API（`mockLogin/mockRegister/mockConsume` 等）而非真实后端。已被 Pro 版完全取代，保留作为历史参考。`proxy-server.js` 和 `server/auth-server.js` 同样已归档，功能合并到 `seedance-server.js`。

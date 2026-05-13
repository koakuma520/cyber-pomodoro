# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

本仓库包含两个独立项目：

- **Seedance Studio** (根目录) — AI 视频生成网页应用，调用 Atlas Cloud API (Seedance 2.0 模型)
- **Pomodoro** (`pomodoro/`) — Electron 番茄钟应用（详见 `pomodoro/CLAUDE.md`）

## 常用命令

```bash
# 启动 Seedance Studio 代理服务器（必需，端口 3456）
node proxy-server.js

# 启动全栈认证服务器（可选，端口 3457）
cd server && npm start

# 访问页面
# http://localhost:3456  （代理模式）
# http://localhost:3457  （全栈模式，含 Express 后端）
```

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

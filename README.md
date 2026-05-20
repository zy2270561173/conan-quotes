# 🍡 Conan Quotes - 名侦探柯南名言 API

> 真相只有一个 —— 致每一个热爱柯南的你

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/express-5.x-blue)](https://expressjs.com/)

一个简洁优雅的**名侦探柯南**经典名言 RESTful API，支持多语言查询、数据统计与管理后台。

[🌐 在线体验](http://api.muysky.cn/api/quotes/random) | [📺 管理后台](http://api.muysky.cn/admin)

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| 🌐 **RESTful API** | JSON / Text / HTML / JS 多格式返回 |
| 🔍 **智能搜索** | 角色名、中日文名言模糊搜索 |
| 📊 **数据统计** | 查询次数、热门角色、每日趋势 |
| 🔐 **管理后台** | Web + Electron 桌面应用 |
| 📦 **跨平台** | Windows / macOS / Linux |
| ⚡ **轻量快速** | SQLite 数据库，零配置启动 |

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装部署

```bash
# 克隆项目
git clone https://github.com/zy2270561173/conan-quotes.git
cd conan-quotes

# 安装依赖
npm install

# 启动服务
npm start
```

服务运行在 http://localhost:3000

## 📖 API 文档

### 基础接口

| 接口 | 说明 |
|------|------|
| `GET /api/quotes` | 获取所有名言 |
| `GET /api/quotes/random` | 随机获取一条名言 |
| `GET /api/quotes/:id` | 通过 ID 获取名言 |
| `GET /api/stats` | 查询统计数据 |

### 查询参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `qu` | 角色名搜索 | `?qu=柯南` |
| `s` | 名言内容搜索 | `?s=真相` |
| `n` | 返回数量 | `?n=10` |
| `la` | 语言：`c`(中文) / `j`(日文) | `?la=j` |
| `type` | 返回格式：`json` / `text` / `html` / `js` | `?type=html` |

### 使用示例

```bash
# 随机获取一条名言
curl http://localhost:3000/api/quotes/random

# 获取柯南的名言
curl "http://localhost:3000/api/quotes?qu=柯南"

# 获取日文名言（Text 格式）
curl "http://localhost:3000/api/quotes/random?qu=柯南&la=j&type=text"

# 批量获取5条名言
curl http://localhost:3000/api/quotes/random?n=5

# 获取 HTML 页面展示
curl "http://localhost:3000/api/quotes/random?type=html"
```

### 响应示例

```json
{
  "id": 1,
  "quote": "真相只有一个！",
  "character": "江户川柯南",
  "japanese": "真実はいつもひとつ！",
  "characterJP": "江戸川コナン"
}
```

## 🖥️ 管理后台

### 1. 启动后端服务

```bash
# 在项目根目录
npm install
npm start
```

服务运行在 http://localhost:3000

### 2. 启动前端开发服务器

```bash
cd client
npm install
npm run dev
```

前端运行在 http://localhost:5173，自动代理 API 请求到后端。

### 3. 访问后台

- 前端地址：http://localhost:5173/admin
- 后端 API：http://localhost:3000/api

### 4. 管理员登录

**默认账号：** `A8101123` / `A8101123`

### 5. 生产环境部署

前端构建后，可直接通过后端服务访问：
```
/admin -> Web 管理后台
```

### Electron 桌面应用

```bash
cd client

# 安装依赖
npm install

# 开发模式
npm run electron:dev

# 构建 Windows 安装包
npm run electron:dist
```

### 后台功能

- ✅ 名言增删改查
- ✅ 批量导入（支持格式：`名言|角色|日文|日文角色`）
- ✅ 角色名自动补全
- ✅ 数据统计图表
- ✅ 多管理员管理

## 📁 项目结构

```
conan-quotes/
├── index.js              # Express 服务入口
├── db.js                 # SQLite 数据库操作
├── quotes.js             # 名言数据初始化
├── package.json
├── public/               # 静态资源
└── client/               # Electron 管理后台
    ├── src/              # Vue 3 源码
    ├── electron/         # Electron 主进程
    └── dist/             # 构建输出
```

## 🛠️ 技术栈

**后端**
- Node.js + Express
- SQLite3
- CORS / Session 认证

**前端**
- Vue 3 + Composition API
- Vite
- Element Plus
- ECharts
- Axios

**桌面应用**
- Electron
- electron-builder

## ⚙️ 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `SESSION_SECRET` | Session 密钥 | `conan-quotes-secret` |

### 修改管理员密码

```bash
sqlite3 conan_quotes.db
sqlite> UPDATE admins SET password='your_new_password' WHERE username='A8101123';
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

*「推理不存在于真空之中」* 🔍

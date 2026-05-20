# 名侦探柯南名言 API

🍡 名侦探柯南经典名言 RESTful API，支持多语言查询、数据统计与管理后台。

[English](README_en.md) | 简体中文

## 功能特性

- 🌐 **RESTful API** - 提供 JSON/Text/HTML/JS 多格式返回
- 🔍 **智能搜索** - 支持角色名、中日文名言模糊搜索
- 📊 **数据统计** - 查询次数、热门角色、每日趋势
- 🔐 **管理后台** - Electron 桌面应用，批量导入/导出
- 📦 **跨平台** - 支持 Windows/macOS/Linux

## 快速开始

### 环境要求

- Node.js >= 18
- npm

### 安装部署

```bash
# 克隆项目
git clone https://github.com/yourname/conan-quotes.git
cd conan-quotes

# 安装后端依赖
npm install

# 启动后端服务
npm start

# 安装前端依赖（可选，如需管理后台）
cd client
npm install
```

### 访问服务

- API 文档: http://localhost:3000/api
- 管理后台: http://localhost:3000/admin
- 默认管理员: `A8101123` / `A8101123`

## API 文档

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
| `la` | 语言: `c`(中文) / `j`(日文) | `?la=j` |
| `type` | 返回格式: `json`/`text`/`html`/`js` | `?type=html` |

### 使用示例

```bash
# 随机获取一条名言
curl http://localhost:3000/api/quotes/random

# 获取柯南的名言（JSON）
curl http://localhost:3000/api/quotes?qu=柯南

# 获取日文名言（Text 格式）
curl "http://localhost:3000/api/quotes/random?qu=柯南&la=j&type=text"

# 批量获取5条名言
curl http://localhost:3000/api/quotes/random?n=5
```

## 管理后台

### 桌面应用

```bash
cd client

# 开发模式
npm run electron:dev

# 构建 Windows 安装包
npm run electron:dist
```

### Web 后台

直接访问 `/admin`，使用管理员账号登录。

#### 功能

- 名言增删改查
- 批量导入（格式：`名言|角色|日文|日文角色`）
- 角色名自动补全（柯南→江户川柯南）
- 数据统计图表

## 项目结构

```
conan-quotes/
├── index.js          # Express 服务入口
├── db.js             # SQLite 数据库操作
├── quotes.js         # 名言数据初始化
├── package.json
├── conan_quotes.db   # SQLite 数据库文件
└── client/           # Electron 管理后台
    ├── src/           # Vue 源码
    ├── electron/      # Electron 主进程
    └── dist/          # 构建输出
```

## 技术栈

**后端**
- Node.js + Express
- SQLite3
- CORS、Session 认证

**前端**
- Vue 3 + Composition API
- Vite
- Element Plus
- ECharts
- Axios

**桌面应用**
- Electron
- electron-builder

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `SESSION_SECRET` | Session 密钥 | `conan-quotes-secret` |

### 修改管理员密码

首次启动会自动创建默认管理员，建议及时修改密码：

```bash
# 通过 Web 后台修改
# 或直接编辑数据库
sqlite3 conan_quotes.db
UPDATE admins SET password='your_new_password' WHERE username='A8101123';
```

## License

MIT License - 详见 [LICENSE](LICENSE) 文件

---

*「真相只有一个」* 🍡

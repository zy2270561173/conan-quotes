const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const { db, initDB, recordQuery, getStats, getQueryLogs } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: (origin, callback) => {
    callback(null, origin || '*')
  },
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'conan-quotes-secret',
  resave: false,
  saveUninitialized: false
}));

// 路由
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin');

app.use('/api', apiRouter);
app.use('/admin', adminRouter);

// 根路径重定向到随机名言
app.get('/', (req, res) => {
  res.redirect('/api/quotes/random');
});

// 启动服务
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`柯南名言 API 服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});

module.exports = app;

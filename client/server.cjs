const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 启用 CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// 托管静态文件
app.use(express.static(path.join(__dirname, 'dist')));

// 所有路由返回 index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`柯南名言管理后台运行在 http://localhost:${PORT}`);
});

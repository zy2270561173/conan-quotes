const express = require('express');
const router = express.Router();
const { db, recordQuery, getStats } = require('../db');

// API 信息
router.get('/', (req, res) => {
  res.json({
    message: '名侦探柯南名言 API',
    version: '1.0',
    endpoints: {
      all: '/api/quotes - 获取所有名言',
      random: '/api/quotes/random - 随机获取一条名言（默认）',
      byId: '/api/quotes/:id - 通过ID获取名言',
      stats: '/api/stats - 查询统计'
    },
    queryParams: {
      la: '语言: c(中文) / j(日文) / al(全部)',
      qu: '角色名: 支持中日文模糊搜索',
      s: '搜索关键词: 名言内容模糊搜索',
      n: '返回数量: 默认全部(all)/1(random)，最大50（all）/20（random）',
      type: '返回类型: json(默认) / text / html / js'
    }
  });
});

// 格式化名言数据
function formatQuotes(quotesList, la) {
  return quotesList.map(q => {
    if (la === 'ch') {
      return { id: q.id, quote: q.quote, character: q.character };
    } else if (la === 'jp') {
      return { id: q.id, quote: q.japanese || q.quote, character: q.character };
    }
    return q;
  });
}

// 获取所有名言
router.get('/quotes', (req, res) => {
  let sql = 'SELECT * FROM quotes WHERE 1=1';
  const params = [];

  if (req.query.qu) {
    sql += ' AND (character LIKE ? OR characterJP LIKE ?)';
    params.push(`%${req.query.qu}%`, `%${req.query.qu}%`);
  }

  if (req.query.s) {
    sql += ' AND (quote LIKE ? OR japanese LIKE ?)';
    params.push(`%${req.query.s}%`, `%${req.query.s}%`);
  }

  let n = parseInt(req.query.n);
  if (n) {
    n = Math.max(1, Math.min(50, n));
    sql += ` LIMIT ${n}`;
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    recordQuery('all', req.query.qu, rows.length);
    let formatted = formatQuotes(rows, req.query.la);
    const responseData = { count: formatted.length, quotes: formatted };
    sendResponse(res, responseData, req.query.type, req);
  });
});

// 随机获取名言
router.get('/quotes/random', (req, res) => {
  let sql = 'SELECT * FROM quotes WHERE 1=1';
  const params = [];

  if (req.query.qu) {
    sql += ' AND (character LIKE ? OR characterJP LIKE ?)';
    params.push(`%${req.query.qu}%`, `%${req.query.qu}%`);
  }

  if (req.query.s) {
    sql += ' AND (quote LIKE ? OR japanese LIKE ?)';
    params.push(`%${req.query.s}%`, `%${req.query.s}%`);
  }

  let n = parseInt(req.query.n) || 1;
  n = Math.max(1, Math.min(20, n));

  sql += ` ORDER BY RANDOM() LIMIT ${n}`;

  if (n === 1) {
    db.get(sql, params, (err, row) => {
      if (err) { res.status(500).json({ error: err.message }); return; }
      if (!row) { res.status(404).json({ error: '未找到符合条件的名言' }); return; }
      recordQuery('random', req.query.qu, 1);
      let formatted = formatQuotes([row], req.query.la);
      sendResponse(res, formatted[0], req.query.type, req);
    });
  } else {
    db.all(sql, params, (err, rows) => {
      if (err) { res.status(500).json({ error: err.message }); return; }
      if (!rows || rows.length === 0) { res.status(404).json({ error: '未找到符合条件的名言' }); return; }
      recordQuery('random', req.query.qu, rows.length);
      let formatted = formatQuotes(rows, req.query.la);
      sendResponse(res, { count: formatted.length, quotes: formatted }, req.query.type, req);
    });
  }
});

// 通过ID获取名言
router.get('/quotes/:id', (req, res) => {
  db.get('SELECT * FROM quotes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: '未找到该ID对应的名言' });
      return;
    }
    recordQuery('byId', row.character, 1);
    let formatted = formatQuotes([row], req.query.la);
    sendResponse(res, formatted[0], req.query.type, req);
  });
});

// 统计接口
router.get('/stats', (req, res) => {
  getStats((data) => {
    res.json(data);
  });
});

// 响应处理函数
function sendResponse(res, data, type, req) {
  const signature = { api: 'MuYunApi', project: '名柯南名言集', version: '1.0' };
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const currentPath = req.originalUrl.split('?')[0];
  const jsonUrl = `${baseUrl}${currentPath}${currentPath.includes('?') ? '&' : '?'}type=json`;

  switch (type) {
    case 'text':
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.send(formatToText(data, signature));
      break;

    case 'html':
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(buildHtmlPage(data, signature, jsonUrl));
      break;

    case 'js':
      res.set('Content-Type', 'application/javascript; charset=utf-8');
      res.send(formatToJs(data, signature));
      break;

    case 'json':
    default:
      // 默认返回 JSON
      res.json({ ...data, _signature: signature });
  }
}

// 格式化为纯文本
function formatToText(data, signature) {
  let text = '';
  if (Array.isArray(data.quotes)) {
    data.quotes.forEach(q => {
      text += `【${q.character}】\n${q.quote}\n`;
      if (q.japanese) text += `${q.japanese}\n`;
      text += '\n';
    });
  } else {
    text = `【${data.character}】\n${data.quote}`;
    if (data.japanese) text += `\n${data.japanese}`;
  }
  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Powered by ${signature.api} · ${signature.project} v${signature.version}`;
  return text;
}

// 格式化为 JS
function formatToJs(data, signature) {
  let js = `// Powered by ${signature.api} · ${signature.project} v${signature.version}\n`;
  js += `const conanQuotes = ${JSON.stringify(data, null, 2)};\n`;
  js += '\n// 使用示例\n';
  js += 'console.log(conanQuotes);';
  return js;
}

// 构建 HTML 页面
function buildHtmlPage(data, signature, jsonUrl) {
  const buildQuoteCard = (q) => `
    <div class="quote-card">
      <div class="quote-header">
        <span class="quote-avatar">${(q.character || '?').charAt(0)}</span>
        <span class="quote-char">${q.character}</span>
      </div>
      <div class="quote-body">
        <p class="quote-text">${q.quote}</p>
        ${q.japanese ? `<p class="quote-jp">${q.japanese}</p>` : ''}
      </div>
      <div class="quote-footer">
        <span class="tag">名侦探柯南</span>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>名侦探柯南名言 · MuYunApi</title>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<style>
:root{--accent:#e99312;--accent-dark:#c77a0a;--bg:#0f1117;--bg-card:#181b23;--border:#252a35;--text:#e0e0e0;--text-muted:#8892a0;--jp-color:#a0aec0;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100vh;background:var(--bg);color:var(--text);font-family:'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;-webkit-font-smoothing:antialiased}
body{background:radial-gradient(ellipse at top,rgba(233,147,18,0.08) 0%,transparent 60%),var(--bg)}
.container{max-width:720px;margin:0 auto;padding:40px 20px}
.page-header{text-align:center;margin-bottom:36px;position:relative}
.page-header::before{content:'';position:absolute;top:-20px;left:50%;transform:translateX(-50%);width:60px;height:3px;background:linear-gradient(90deg,transparent,var(--accent),transparent);border-radius:2px}
.page-header i{font-size:2.4rem;color:var(--accent);margin-bottom:12px;display:block}
.page-header h1{font-size:1.6rem;font-weight:700;color:#fff;letter-spacing:2px}
.page-header p{color:var(--text-muted);font-size:0.85rem;margin-top:8px}
.page-header .badge{display:inline-block;margin-top:12px;padding:4px 14px;background:rgba(233,147,18,0.12);color:var(--accent);border-radius:20px;font-size:0.78rem;font-weight:500;border:1px solid rgba(233,147,18,0.2)}
.page-header .signature{margin-top:14px;display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(233,147,18,0.08);border:1px solid rgba(233,147,18,0.2);border-radius:20px;font-size:0.75rem;color:var(--accent)}
.page-header .signature i{font-size:0.75rem;display:inline;margin:0}
.page-header .json-link{margin-top:10px;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;font-size:0.72rem;color:#888;transition:all .2s;text-decoration:none}
.page-header .json-link:hover{background:rgba(255,255,255,0.1);color:#fff}
.page-header .json-link i{font-size:0.65rem}
.quote-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;margin-bottom:20px;overflow:hidden;transition:transform .2s,box-shadow .2s;position:relative}
.quote-card:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,0,0,0.3);border-color:rgba(233,147,18,0.2)}
.quote-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:linear-gradient(180deg,var(--accent),var(--accent-dark));border-radius:16px 0 0 16px}
.quote-header{display:flex;align-items:center;gap:12px;padding:18px 20px 0 24px}
.quote-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-dark));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1rem;flex-shrink:0}
.quote-char{font-size:1.1rem;font-weight:600;color:#fff}
.quote-body{padding:14px 20px 16px 24px}
.quote-text{font-size:1.15rem;line-height:1.8;color:var(--text);position:relative;padding-left:16px}
.quote-text::before{content:'"';position:absolute;left:0;top:-4px;color:var(--accent);font-size:1.4rem;font-family:Georgia,serif;opacity:.6}
.quote-jp{margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:0.92rem;color:var(--jp-color);font-style:italic;line-height:1.6;padding-left:16px;position:relative}
.quote-jp::before{content:'日';position:absolute;left:0;font-size:0.7rem;color:var(--accent);opacity:.5;font-style:normal}
.quote-footer{padding:0 20px 14px 24px;display:flex;gap:8px}
.tag{padding:3px 10px;background:rgba(233,147,18,0.1);color:var(--accent);border-radius:6px;font-size:0.72rem;border:1px solid rgba(233,147,18,0.15)}
.empty-state{text-align:center;padding:60px 20px;color:var(--text-muted)}
.empty-state i{font-size:3rem;margin-bottom:16px;display:block;opacity:.4}
.page-footer{text-align:center;padding:30px 0;color:var(--text-muted);font-size:0.75rem;border-top:1px solid var(--border);margin-top:20px}
.page-footer .brand{color:var(--accent);font-weight:600}
@media(max-width:480px){.quote-text{font-size:1.05rem}.quote-char{font-size:1rem}}
</style>
</head>
<body>
<div class="container">
  <div class="page-header">
    <i class="fas fa-user-secret"></i>
    <h1>名侦探柯南名言</h1>
    <p>真相只有一个</p>
    ${Array.isArray(data.quotes) && data.count > 1 ? `<span class="badge">共 ${data.count} 条名言</span>` : ''}
    <a class="json-link" href="${jsonUrl}" target="_blank"><i class="fas fa-code"></i> 查看 JSON 格式</a>
    <div class="signature"><i class="fas fa-medal"></i>MuYunApi · 名柯南名言集 v${signature.version}</div>
  </div>
  ${Array.isArray(data.quotes)
    ? (data.quotes.length === 0
      ? '<div class="empty-state"><i class="fas fa-inbox"></i><p>暂无名言</p></div>'
      : data.quotes.map(q => buildQuoteCard(q)).join(''))
    : buildQuoteCard(data)}
  <div class="page-footer">Powered by <span class="brand">MuYunApi</span> · 名柯南名言集</div>
</div>
</body>
</html>`;
}

module.exports = router;

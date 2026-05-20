const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const { db, initDB, recordQuery, getStats, getQueryLogs } = require('./db');

// CORS 支持（开发环境 Vite proxy 需要）
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors({
  origin: (origin, callback) => {
    // 允许所有来源（包括 file:// 的 null origin）
    callback(null, origin || '*')
  },
  credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'conan-quotes-secret',
  resave: false,
  saveUninitialized: false
}));

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

function sendResponse(res, data, type) {
  const signature = { api: 'MuYunApi', project: '名柯南名言集', version: '1.0' };
  switch (type) {
    case 'text':
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
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.send(text);
      break;

    case 'html':
      const buildQuote = (q) => `
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

      let html = `<!DOCTYPE html>
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
    <div class="signature"><i class="fas fa-medal"></i>MuYunApi · 名柯南名言集 v${signature.version}</div>
  </div>
  ${Array.isArray(data.quotes)
    ? (data.quotes.length === 0
      ? '<div class="empty-state"><i class="fas fa-inbox"></i><p>暂无名言</p></div>'
      : data.quotes.map(q => buildQuote(q)).join(''))
    : buildQuote(data)}
  <div class="page-footer">Powered by <span class="brand">MuYunApi</span> · 名柯南名言集</div>
</div>
</body>
</html>`;
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      break;

    case 'js':
      let js = `// Powered by MuYunApi · 名柯南名言集 v${signature.version}\n`;
      js += `const conanQuotes = ${JSON.stringify(data, null, 2)};\n`;
      js += '\n// 使用示例\n';
      js += 'console.log(conanQuotes);';
      res.set('Content-Type', 'application/javascript; charset=utf-8');
      res.send(js);
      break;

    default:
      res.json({ ...data, _signature: signature });
  }
}

app.get('/', (req, res) => {
  res.redirect('/api/quotes/random');
});

app.get('/api', (req, res) => {
  res.json({
    message: '名侦探柯南名言 API',
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
    },
    admin: '/admin - 后台管理（Vue SPA）'
  });
});

app.get('/api/quotes', (req, res) => {
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
    sendResponse(res, { count: formatted.length, quotes: formatted }, req.query.type);
  });
});

app.get('/api/quotes/random', (req, res) => {
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
      sendResponse(res, formatted[0], req.query.type);
    });
  } else {
    db.all(sql, params, (err, rows) => {
      if (err) { res.status(500).json({ error: err.message }); return; }
      if (!rows || rows.length === 0) { res.status(404).json({ error: '未找到符合条件的名言' }); return; }
      recordQuery('random', req.query.qu, rows.length);
      let formatted = formatQuotes(rows, req.query.la);
      sendResponse(res, { count: formatted.length, quotes: formatted }, req.query.type);
    });
  }
});

app.get('/api/quotes/:id', (req, res) => {
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
    sendResponse(res, formatted[0], req.query.type);
  });
});

app.get('/api/stats', (req, res) => {
  getStats((data) => {
    res.json(data);
  });
});

app.get('/api/stats/logs', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, parseInt(req.query.pageSize) || 20);
  getQueryLogs(page, pageSize, (data) => {
    res.json(data);
  });
});

function requireAuth(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(401).json({ error: '未登录' });
  }
}

// ============ 管理后台路由 ============

// 重定向到 Vue SPA
app.get('/admin', (req, res) => {
  if (!req.session.admin) {
    res.redirect('/login');
  } else {
    res.redirect('/');
  }
});

app.get('/login', (req, res) => {
  res.redirect('/login.html');
});

// JSON API 登录
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM admins WHERE username = ?', [username], (err, row) => {
    if (err) {
      res.status(500).json({ error: '登录失败' });
      return;
    }
    if (row && row.password === password) {
      req.session.admin = row;
      res.json({ success: true, admin: { id: row.id, username: row.username } });
    } else {
      res.status(401).json({ error: '用户名或密码错误' });
    }
  });
});

app.get('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ============ 名言管理 API ============

app.get('/api/admin/quotes', requireAuth, (req, res) => {
  const PAGE_SIZE = 6;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  db.get('SELECT COUNT(*) as total FROM quotes', (err, row) => {
    if (err) { return res.json({ error: err.message, quotes: [], total: 0, page: 1, totalPages: 1 }); }
    const total = row.total;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    db.all('SELECT * FROM quotes ORDER BY id DESC LIMIT ? OFFSET ?', [PAGE_SIZE, offset], (err2, quotes) => {
      if (err2) { return res.json({ error: err2.message, quotes: [], total: 0, page: 1, totalPages: 1 }); }
      res.json({ quotes, total, page, totalPages });
    });
  });
});

app.post('/api/admin/quotes', requireAuth, (req, res) => {
  const { quote, character, characterJP, japanese } = req.body;
  if (!quote || !character) {
    return res.status(400).json({ error: '名言内容和角色名不能为空' });
  }
  db.run('INSERT INTO quotes (quote, character, characterJP, japanese) VALUES (?, ?, ?, ?)',
    [quote, character, characterJP || '', japanese || ''], function(err) {
      if (err) { return res.status(500).json({ error: err.message }); }
      res.json({ success: true, id: this.lastID });
    });
});

app.put('/api/admin/quotes/:id', requireAuth, (req, res) => {
  const { quote, character, characterJP, japanese } = req.body;
  if (!quote || !character) {
    return res.status(400).json({ error: '名言内容和角色名不能为空' });
  }
  db.run('UPDATE quotes SET quote = ?, character = ?, characterJP = ?, japanese = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [quote, character, characterJP || '', japanese || '', req.params.id], function(err) {
      if (err) { return res.status(500).json({ error: err.message }); }
      res.json({ success: true });
    });
});

app.delete('/api/admin/quotes/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM quotes WHERE id = ?', [req.params.id], function(err) {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ success: true });
  });
});

app.post('/api/admin/quotes/batch', requireAuth, (req, res) => {
  const { batchQuotes } = req.body;
  const lines = batchQuotes ? batchQuotes.trim().split('\n').filter(line => line.trim()) : [];

  if (lines.length === 0) {
    return res.status(400).json({ error: '批量添加失败：内容不能为空' });
  }

  db.all('SELECT quote FROM quotes', (err, existingRows) => {
    if (err) { return res.status(500).json({ error: err.message }); }
    const existingSet = new Set(existingRows.map(r => r.quote.trim()));
    let successCount = 0, dupCount = 0;

    function insertQuote(index) {
      if (index >= lines.length) {
        return res.json({ success: true, successCount, dupCount });
      }
      const parts = lines[index].split('|');
      const quote = (parts[0] || '').trim();
      const character = (parts[1] || '').trim();
      const japanese = (parts[2] || '').trim();
      const characterJP = (parts[3] || '').trim();
      if (!quote) { insertQuote(index + 1); return; }
      if (existingSet.has(quote.trim())) { dupCount++; insertQuote(index + 1); return; }

      db.run('INSERT INTO quotes (quote, character, characterJP, japanese) VALUES (?, ?, ?, ?)',
        [quote, character, characterJP, japanese], function(err) {
          if (err) { dupCount++; } else { successCount++; existingSet.add(quote.trim()); }
          insertQuote(index + 1);
        });
    }
    insertQuote(0);
  });
});

app.post('/api/admin/quotes/clear-all', requireAuth, (req, res) => {
  if (req.body.confirm !== '清空全部') {
    return res.status(403).json({ error: '口令错误，清空已取消' });
  }
  db.run('DELETE FROM quotes', function(err) {
    if (err) { return res.status(500).json({ error: err.message }); }
    db.run('DELETE FROM sqlite_sequence WHERE name = ?', ['quotes'], () => {
      res.json({ success: true });
    });
  });
});

app.post('/api/admin/quotes/replace-names', requireAuth, (req, res) => {
  db.all('SELECT * FROM quotes', (err, rows) => {
    if (err) { return res.status(500).json({ error: err.message }); }
    let updatedCount = 0, unchangedCount = 0;

    function processQuote(index) {
      if (index >= rows.length) {
        return res.json({ success: true, updatedCount, unchangedCount });
      }
      const q = rows[index];
      const newQuote = replaceNamesInText(q.quote);
      const newCharacter = replaceNamesInText(q.character);
      const newJapanese = replaceNamesInText(q.japanese);
      const newCharacterJP = replaceNamesInText(q.characterJP);
      const changed = newQuote !== q.quote || newCharacter !== q.character ||
        newJapanese !== q.japanese || newCharacterJP !== q.characterJP;

      if (changed) {
        updatedCount++;
        db.run('UPDATE quotes SET quote=?, character=?, japanese=?, characterJP=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
          [newQuote, newCharacter, newJapanese, newCharacterJP, q.id], () => processQuote(index + 1));
      } else {
        unchangedCount++;
        processQuote(index + 1);
      }
    }
    if (rows.length === 0) { return res.json({ success: true, updatedCount: 0, unchangedCount: 0 }); }
    processQuote(0);
  });
});

// ============ 管理员管理 API ============

app.get('/api/admin/admins', requireAuth, (req, res) => {
  db.all('SELECT * FROM admins ORDER BY id', (err, admins) => {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ admins });
  });
});

app.post('/api/admin/admins', requireAuth, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  db.run('INSERT INTO admins (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ success: true, id: this.lastID });
  });
});

app.post('/api/admin/admins/:id', requireAuth, (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  const sql = password ? 'UPDATE admins SET username = ?, password = ? WHERE id = ?' : 'UPDATE admins SET username = ? WHERE id = ?';
  const params = password ? [username, password, req.params.id] : [username, req.params.id];
  db.run(sql, params, function(err) {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ success: true });
  });
});

app.post('/api/admin/admins/:id/delete', requireAuth, (req, res) => {
  if (parseInt(req.params.id) === req.session.admin.id) {
    return res.status(400).json({ error: '不能删除当前登录的管理员' });
  }
  db.get('SELECT COUNT(*) as count FROM admins', (err, row) => {
    if (err || row.count <= 1) {
      return res.status(400).json({ error: '至少需要保留一个管理员账户' });
    }
    db.run('DELETE FROM admins WHERE id = ?', [req.params.id], function(err) {
      if (err) { return res.status(500).json({ error: err.message }); }
      res.json({ success: true });
    });
  });
});

// ============ 别名替换工具 ============

const namePairs = [
  ['小兰', '毛利兰'], ['兰', '毛利兰'], ['步美', '吉田步美'], ['元太', '小岛元太'],
  ['光彦', '圆谷光彦'], ['博士', '阿笠博士'], ['新一', '工藤新一'], ['平次', '服部平次'],
  ['和叶', '远山和叶'], ['基德', '怪盗基德'], ['哀', '灰原哀'], ['小五郎', '毛利小五郎'], ['柯南', '江户川柯南'],
  ['コナン', '江戸川コナン'], ['歩美', '吉田歩美'], ['和葉', '遠山和葉'], ['基徳', '怪盗基徳'],
  ['基德', '怪盗基徳'], ['江戸川', '江戸川コナン'], ['毛利', '毛利蘭'], ['蘭', '毛利蘭']
];

const guardMap = {
  '毛利兰': '毛利兰', '毛利小五郎': '毛利小五郎', '工藤新一': '工藤新一', '灰原哀': '灰原哀',
  '阿笠博士': '阿笠博士', '吉田步美': '吉田步美', '小岛元太': '小岛元太', '圆谷光彦': '圆谷光彦',
  '远山和叶': '远山和叶', '怪盗基德': '怪盗基德', '江户川柯南': '江户川柯南',
  '江戸川コナン': '江戸川コナン', '毛利蘭': '毛利蘭', '服部平次': '服部平次',
  '遠山和葉': '遠山和葉', '怪盗基徳': '怪盗基徳'
};

function replaceNamesInText(text) {
  if (!text) return text;
  let result = text;
  for (const [short, full] of namePairs) {
    if (result.indexOf(short) === -1) continue;
    if (short === '毛利') {
      if (result.includes('毛利小五郎')) continue;
    } else {
      const fullAlreadyThere = Object.entries(guardMap).some(([gk, gv]) => result.includes(gk) && full === gv);
      if (fullAlreadyThere) continue;
    }
    const re = new RegExp(
      '(?<=[^\\u4e00-\\u9fa5a-zA-Z0-9])' + short + '(?=[^\\u4e00-\\u9fa5a-zA-Z0-9])' +
      '|^' + short + '(?=[^\\u4e00-\\u9fa5a-zA-Z0-9])' +
      '|(?<=[^\\u4e00-\\u9fa5a-zA-Z0-9])' + short + '$|^' + short + '$', 'g');
    result = result.replace(re, full);
  }
  return result;
}

// ============ 启动服务器 ============

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`柯南名言 API 服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});

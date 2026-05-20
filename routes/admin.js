const express = require('express');
const path = require('path');
const router = express.Router();
const { db, recordQuery, getStats, getQueryLogs } = require('../db');

// 管理员认证中间件
function requireAuth(req, res, next) {
  if (req.session.admin) {
    next();
  } else {
    res.status(401).json({ error: '未登录' });
  }
}

// 重定向到登录页
router.get('/', (req, res) => {
  if (!req.session.admin) {
    res.redirect('/login');
  } else {
    res.redirect('/login');
  }
});

// 登录页
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// JSON API 登录
router.post('/api/login', (req, res) => {
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

// 登出
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

router.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ============ 名言管理 API ============

// 获取名言列表（分页）
router.get('/api/quotes', requireAuth, (req, res) => {
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

// 添加名言
router.post('/api/quotes', requireAuth, (req, res) => {
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

// 更新名言
router.put('/api/quotes/:id', requireAuth, (req, res) => {
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

// 删除名言
router.delete('/api/quotes/:id', requireAuth, (req, res) => {
  db.run('DELETE FROM quotes WHERE id = ?', [req.params.id], function(err) {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ success: true });
  });
});

// 批量导入
router.post('/api/quotes/batch', requireAuth, (req, res) => {
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

// 清空全部
router.post('/api/quotes/clear-all', requireAuth, (req, res) => {
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

// 替换角色名
router.post('/api/quotes/replace-names', requireAuth, (req, res) => {
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

// 获取管理员列表
router.get('/api/admins', requireAuth, (req, res) => {
  db.all('SELECT * FROM admins ORDER BY id', (err, admins) => {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ admins });
  });
});

// 添加管理员
router.post('/api/admins', requireAuth, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  db.run('INSERT INTO admins (username, password) VALUES (?, ?)', [username, password], function(err) {
    if (err) { return res.status(500).json({ error: err.message }); }
    res.json({ success: true, id: this.lastID });
  });
});

// 更新管理员
router.post('/api/admins/:id', requireAuth, (req, res) => {
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

// 删除管理员
router.post('/api/admins/:id/delete', requireAuth, (req, res) => {
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

// ============ 辅助函数 ============

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
      '(?<![\\u4e00-\\u9fa5a-zA-Z0-9])' + short + '(?![\\u4e00-\\u9fa5a-zA-Z0-9])',
      'g');
    result = result.replace(re, full);
  }
  return result;
}

module.exports = router;

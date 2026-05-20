const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'conan_quotes.db');
const db = new sqlite3.Database(dbPath);

const initialAdmin = {
  username: 'A8101123',
  password: 'A8101123'
};

function initDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS quotes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote TEXT NOT NULL,
        character TEXT NOT NULL,
        characterJP TEXT,
        japanese TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS query_stats (
        id INTEGER PRIMARY KEY,
        total_queries INTEGER DEFAULT 0,
        today_queries INTEGER DEFAULT 0,
        last_query_date TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS character_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character TEXT UNIQUE NOT NULL,
        query_count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_type TEXT,
        character_filter TEXT,
        result_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.get('SELECT COUNT(*) as count FROM admins', (err, row) => {
        if (err) { reject(err); return; }
        if (row.count === 0) {
          db.run('INSERT INTO admins (username, password) VALUES (?, ?)',
            [initialAdmin.username, initialAdmin.password], (err) => {
              if (err) { reject(err); return; }
              console.log('初始化管理员账户完成');
              initStats(resolve, reject);
            });
        } else {
          initStats(resolve, reject);
        }
      });
    });
  });
}

function initStats(resolve, reject) {
  db.get('SELECT COUNT(*) as count FROM query_stats', (err, row) => {
    if (err) { reject(err); return; }
    if (row.count === 0) {
      db.run('INSERT INTO query_stats (id, total_queries, today_queries) VALUES (1, 0, 0)', (err) => {
        if (err) reject(err); else resolve(db);
      });
    } else {
      resolve(db);
    }
  });
}

function recordQuery(queryType, characterFilter, resultCount) {
  const today = new Date().toISOString().split('T')[0];

  db.serialize(() => {
    db.run('INSERT INTO query_logs (query_type, character_filter, result_count) VALUES (?, ?, ?)',
      [queryType, characterFilter || '', resultCount || 0]);

    db.get('SELECT * FROM query_stats WHERE id = 1', (err, row) => {
      if (err || !row) return;
      const newTotal = row.total_queries + 1;
      const isNewDay = row.last_query_date !== today;
      const newToday = isNewDay ? 1 : row.today_queries + 1;
      db.run('UPDATE query_stats SET total_queries = ?, today_queries = ?, last_query_date = ? WHERE id = 1',
        [newTotal, newToday, today]);
    });

    if (characterFilter) {
      db.run('INSERT INTO character_stats (character, query_count) VALUES (?, 1) ON CONFLICT(character) DO UPDATE SET query_count = query_count + 1',
        [characterFilter]);
    }
  });
}

function getStats(callback) {
  db.get('SELECT total_queries, today_queries, last_query_date FROM query_stats WHERE id = 1', (err, stats) => {
    if (err || !stats) {
      callback({ totalQueries: 0, todayQueries: 0, topCharacters: [], dailyStats: [], queryTypes: [] });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let todayQueries = stats.today_queries;
    if (stats.last_query_date !== today) todayQueries = 0;

    db.all('SELECT character as name, query_count as count FROM character_stats ORDER BY query_count DESC LIMIT 10', (err, topChars) => {
      if (err) topChars = [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

      db.all('SELECT DATE(created_at) as date, COUNT(*) as count FROM query_logs WHERE DATE(created_at) >= ? GROUP BY DATE(created_at) ORDER BY date',
        [sevenDaysStr], (err, dailyStats) => {
          if (err) dailyStats = [];

          db.all('SELECT query_type as type, COUNT(*) as count FROM query_logs GROUP BY query_type', (err, queryTypes) => {
            if (err) queryTypes = [];
            callback({
              totalQueries: stats.total_queries,
              todayQueries: todayQueries,
              topCharacters: topChars,
              dailyStats: dailyStats,
              queryTypes: queryTypes
            });
          });
        });
    });
  });
}

function getQueryLogs(page, pageSize, callback) {
  const offset = (page - 1) * pageSize;
  db.get('SELECT COUNT(*) as total FROM query_logs', (err, row) => {
    if (err) { callback({ total: 0, logs: [] }); return; }
    db.all('SELECT * FROM query_logs ORDER BY id DESC LIMIT ? OFFSET ?',
      [pageSize, offset], (err, logs) => {
        if (err) { callback({ total: row.total, logs: [] }); return; }
        callback({ total: row.total, logs: logs });
      });
  });
}

module.exports = { db, initDB, recordQuery, getStats, getQueryLogs };

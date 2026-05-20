const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const http = require('http')
const https = require('https')
const fs = require('fs')
const { URL } = require('url')

let mainWindow
let cookieJar = ''

// 简单静态文件服务器
function createStaticServer(distPath, port) {
  const mimeTypes = {
    '.html': 'text/html;charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.map': 'application/json'
  }

  const server = http.createServer((req, res) => {
    // API 代理
    if (req.url.startsWith('/api/')) {
      proxyRequest(req, res)
      return
    }

    // 静态文件
    let filePath = path.join(distPath, req.url === '/' ? '/index.html' : req.url)
    // SPA fallback: 所有路由都返回 index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distPath, 'index.html')
    }
    const ext = path.extname(filePath)
    const contentType = mimeTypes[ext] || 'application/octet-stream'
    try {
      const content = fs.readFileSync(filePath)
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content)
    } catch {
      res.writeHead(404)
      res.end('Not found')
    }
  })

  server.listen(port, () => {
    console.log('[Static Server] http://localhost:' + port)
  })
}

// 代理 API 请求到云端
function proxyRequest(req, res) {
  const targetUrl = 'https://cqs.muysky.cn' + req.url
  const urlObj = new URL(req.url, 'https://cqs.muysky.cn')

  const options = {
    hostname: 'cqs.muysky.cn',
    path: req.url,
    method: req.method,
    headers: {
      'Host': 'cqs.muysky.cn',
      'Content-Type': req.headers['content-type'] || 'application/json',
      'Accept': req.headers['accept'] || '*/*',
      'User-Agent': req.headers['user-agent'] || 'ConanAdmin/1.0'
    }
  }

  // 加上已保存的 Cookie
  if (cookieJar) {
    options.headers['Cookie'] = cookieJar
  }

  const proxyReq = https.request(options, (proxyRes) => {
    // 保存 Set-Cookie
    const setCookie = proxyRes.headers['set-cookie']
    if (setCookie) {
      cookieJar = setCookie.map(c => c.split(';')[0]).join('; ')
      console.log('[Cookie Jar] Updated:', cookieJar.substring(0, 60))
    }

    res.writeHead(proxyRes.statusCode, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    console.error('[Proxy Error]', err.message)
    res.writeHead(502)
    res.end(JSON.stringify({ error: err.message }))
  })

  // 转发 body
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      if (body) proxyReq.write(body)
      proxyReq.end()
    })
  } else {
    proxyReq.end()
  }
}

function createWindow() {
  const distPath = app.isPackaged
    ? path.join(__dirname, '../dist')
    : path.join(__dirname, '../dist')

  if (app.isPackaged) {
    // 打包模式：起本地静态服务器
    createStaticServer(distPath, 3456)
    // 等服务器启动后再加载
    setTimeout(() => {
      loadMainWindow('http://localhost:3456')
    }, 500)
  } else {
    // 开发模式：Vite dev server
    loadMainWindow('http://localhost:5173')
  }
}

function loadMainWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '柯南名言管理后台',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.loadURL(url)
  console.log('[Window] Loading:', url)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

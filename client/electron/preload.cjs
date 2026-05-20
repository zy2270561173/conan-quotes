const { contextBridge, ipcRenderer } = require('electron')

// 通过 IPC 调用主进程的 net.fetch（绕过 CORS，自动管理 cookie）
contextBridge.exposeInMainWorld('electronAPI', {
  // 通用请求方法
  request: (method, path, body) =>
    ipcRenderer.invoke('electron-request', { method, path, body }),

  // 清除会话
  clearSession: () => ipcRenderer.invoke('clear-session')
})

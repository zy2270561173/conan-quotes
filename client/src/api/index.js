import axios from 'axios'

// 走相对路径，由 Vite dev proxy 或 Electron 本地服务器代理
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'

console.log('[API] baseURL:', baseURL)
console.log('[API] origin:', window.location.origin)

const api = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true  // 发送 cookie
})

api.interceptors.request.use(config => {
  console.log('[API Request]', config.method?.toUpperCase(), config.url)
  return config
})

api.interceptors.response.use(
  response => {
    console.log('[API Response OK]', response.config.url, response.status)
    return response.data
  },
  error => {
    const status = error.response?.status
    const data = error.response?.data
    console.error('[API Error]', error.config?.url, status, data)
    if (status === 401) {
      localStorage.removeItem('isLoggedIn')
      window.location.hash = '#/login'
    }
    return Promise.reject(error)
  }
)

// 登录
export const login = (data) => api.post('/admin/login', data)

// 获取名言列表
export const getQuotes = (page = 1) => api.get(`/admin/quotes?page=${page}`)

// 添加名言
export const addQuote = (data) => api.post('/admin/quotes', data)

// 更新名言
export const updateQuote = (id, data) => api.put(`/admin/quotes/${id}`, data)

// 删除名言
export const deleteQuote = (id) => api.delete(`/admin/quotes/${id}`)

// 批量添加名言
export const batchAddQuotes = (batchQuotes) => api.post('/admin/quotes/batch', { batchQuotes })

// 清空全部
export const clearAllQuotes = () => api.post('/admin/quotes/clear-all', { confirm: '清空全部' })

// 别名替换
export const replaceNames = () => api.post('/admin/quotes/replace-names', {})

// 获取统计
export const getStats = () => api.get('/stats')

// 获取查询日志
export const getQueryLogs = (page = 1, pageSize = 20) => api.get(`/stats/logs?page=${page}&pageSize=${pageSize}`)

// 获取管理员列表
export const getAdmins = () => api.get('/admin/admins?format=json')

// 添加管理员
export const addAdmin = (data) => api.post('/admin/admins', data)

// 更新管理员
export const updateAdmin = (id, data) => api.post(`/admin/admins/${id}`, data)

// 删除管理员
export const deleteAdmin = (id) => api.post(`/admin/admins/${id}/delete`)

// 退出登录
export const logout = () => api.get('/admin/logout')

export default api

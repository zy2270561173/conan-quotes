import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://cqs.muysky.cn',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost'
      },
      '/admin': {
        target: 'https://cqs.muysky.cn',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost'
      }
    }
  }
})

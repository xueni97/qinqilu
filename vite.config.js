import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// 亲戚记忆APP 的 Vite 配置
// PWA 用 autoUpdate 模式：新版本部署后下次打开自动更新
// base 用相对路径，兼容 GitHub Pages 子路径部署
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '亲戚录',
        short_name: '亲戚录',
        description: '记忆一年一见的亲戚——姓名/长相/家庭/交往',
        theme_color: '#ee0a24',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: './pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: './pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // 预缓存所有静态资源，离线可用
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  server: {
    host: '0.0.0.0',  // 让局域网手机可访问调试
    port: 5173
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true
  }
})

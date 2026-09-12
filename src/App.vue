<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { safeBack } from './router/index.js'

const router = useRouter()

// 硬件返回键 / 侧滑返回手势拦截（仅原生 APP 生效，浏览器忽略）
// 规则：首页(含地图/列表)直接退出 APP，其他页面返回上一层
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('backButton', () => {
    if (router.currentRoute.value.path === '/') {
      CapacitorApp.exitApp()
    } else {
      safeBack(router)
    }
  })
}
</script>

<style>
:root {
  /*
   * 安全区顶部高度，三级回退：
   * 1. Capacitor 8 SystemBars 注入的 --safe-area-inset-top（Android 14+ WebView 生效）
   * 2. 标准 env(safe-area-inset-top)（iOS / PWA 浏览器生效）
   * 3. 0
   */
  --app-safe-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
}

* {
  box-sizing: border-box;
}
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.app {
  min-height: 100vh;
  background: #f7f8fa;
  /* 安全区域：顶部状态栏不重叠 */
  padding-top: var(--app-safe-top);
}

/* 全局：固定导航栏适配安全区域，!important 确保覆盖 Vant 默认 top:0 */
.van-nav-bar--fixed {
  top: var(--app-safe-top) !important;
}
</style>

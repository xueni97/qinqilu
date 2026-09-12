<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 硬件返回键拦截：在 Capacitor 里拦截 Android 物理返回键
onMounted(() => {
  import('@capacitor/app')
    .then(({ App: CapacitorApp }) => {
      CapacitorApp.addListener('backButton', () => {
        const path = router.currentRoute.value.path
        if (path === '/') {
          // 已在首页，退出 APP
          CapacitorApp.exitApp()
        } else {
          // 其他页面：有历史则后退，否则回首页
          if (window.history.length > 1) {
            router.back()
          } else {
            router.replace('/')
          }
        }
      })
    })
    .catch(() => {
      // 非 Capacitor 环境（浏览器），忽略
    })
})
</script>

<style>
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
  /* 安全区域：顶部状态栏不重叠（PWA 浏览器模式生效） */
  padding-top: env(safe-area-inset-top);
}

/* 全局：固定导航栏适配安全区域，加 !important 确保覆盖 Vant 默认 top:0 */
.van-nav-bar--fixed {
  top: env(safe-area-inset-top) !important;
}
</style>

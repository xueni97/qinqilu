<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 硬件返回键拦截：在 Capacitor 里拦截 Android 物理返回键，避免直接退出 APP
onMounted(() => {
  // 动态导入，浏览器环境不会报错（没有 @capacitor/app 时静默跳过）
  import('@capacitor/app')
    .then(({ App: CapacitorApp }) => {
      CapacitorApp.addListener('backButton', () => {
        // 有历史记录则后退，否则回到首页
        if (router.currentRoute.value.path === '/') {
          // 已在首页，不处理（让默认行为发生或退出）
        } else {
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
  /* 安全区域：顶部状态栏不重叠 */
  padding-top: env(safe-area-inset-top);
}

/* 全局：固定导航栏适配安全区域 */
.van-nav-bar--fixed {
  top: env(safe-area-inset-top);
}
</style>

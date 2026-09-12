<template>
  <div class="app">
    <router-view />
  </div>
</template>

<script setup>
// 阶段0占位：阶段1开始填充实际内容
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
}
</style>

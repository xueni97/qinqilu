import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 引入 Vant 全局组件（阶段1会改按需引入）
import Vant from 'vant'
import 'vant/lib/index.css'

const app = createApp(App)
app.use(router)
app.use(Vant)
app.mount('#app')

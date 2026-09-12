import { createRouter, createWebHashHistory } from 'vue-router'

// 用 hash 模式：兼容 PWA 在 file:// 或本地部署
const routes = [
  {
    path: '/',
    name: 'list',
    component: () => import('../views/ListPage.vue'),
    meta: { title: '亲戚录' }
  },
  {
    path: '/relative/new',
    name: 'new',
    component: () => import('../views/EditPage.vue')
  },
  {
    path: '/relative/:id',
    name: 'detail',
    component: () => import('../views/DetailPage.vue')
  },
  {
    path: '/relative/:id/edit',
    name: 'edit',
    component: () => import('../views/EditPage.vue')
  },
  {
    path: '/tree',
    name: 'tree',
    component: () => import('../views/TreePage.vue'),
    meta: { title: '家族树' }
  },
  {
    path: '/backup',
    name: 'backup',
    component: () => import('../views/BackupPage.vue'),
    meta: { title: '备份' }
  },
  {
    path: '/gifts',
    name: 'gifts',
    component: () => import('../views/GiftsPage.vue'),
    meta: { title: '礼金' }
  },
  {
    path: '/reminders',
    name: 'reminders',
    component: () => import('../views/RemindersPage.vue'),
    meta: { title: '提醒' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

<template>
  <div class="page">
    <van-nav-bar title="亲戚录" fixed>
      <template #right>
        <van-icon name="bars" size="18" @click="showMenu = true" />
      </template>
    </van-nav-bar>

    <!-- 视图切换 Tab -->
    <van-tabs v-model:active="viewMode" class="view-tabs">
      <van-tab title="地图" name="map" />
      <van-tab title="列表" name="list" />
    </van-tabs>

    <!-- 地图视图 -->
    <div v-show="viewMode === 'map'" class="map-view">
      <div id="home-map" class="home-map"></div>

      <!-- 定位条 -->
      <div class="locate-bar">
        <template v-if="locating">
          <van-icon name="loading" /> 定位中...
        </template>
        <template v-else-if="myLat != null">
          <van-icon name="location-o" style="color:#07c160" />
          <span class="locate-text">已定位 · 共 {{ locatedCount }} 位亲戚在附近</span>
          <van-icon name="replay" size="16" @click="refreshLocation" />
        </template>
        <template v-else>
          <van-icon name="location-o" style="color:#969799" />
          <span class="locate-text">{{ geoError || '开启定位看附近亲戚' }}</span>
          <van-button size="mini" type="primary" @click="enableLocation">开启</van-button>
          <van-button size="mini" type="default" @click="startManualPick">手选</van-button>
        </template>
      </div>

      <!-- 待办提醒条（未来礼金/宴请） -->
      <div v-if="upcomingGifts.length > 0" class="todo-bar" @click="router.push('/reminders')">
        <van-icon name="bell" style="color:#ff976a" />
        <div class="todo-scroll">
          <span
            v-for="g in upcomingGifts"
            :key="g.id"
            class="todo-chip"
          >
            {{ relativeName(g.relativeId) }} · {{ g.occasion }} · {{ daysText(g.date) }}
          </span>
        </div>
        <van-icon name="arrow" size="14" />
      </div>

      <!-- 点击 marker 弹出的信息卡 -->
      <div v-if="selectedRelative" class="info-card" @click.stop>
        <div class="info-card-header" @click="goDetail(selectedRelative.id)">
          <span class="info-animal">{{ getAnimalEmoji(selectedRelative) }}</span>
          <div class="info-name-row">
            <span class="info-name">{{ selectedRelative.name }}</span>
            <van-tag v-if="selectedRelative._distance != null" type="success" size="mini">{{ formatDistance(selectedRelative._distance) }}</van-tag>
          </div>
          <van-icon name="arrow" />
        </div>
        <div class="info-card-body">
          <div>{{ selectedRelative.relationship || '—' }} · {{ selectedRelative.features || '无特征' }}</div>
          <div class="info-met">上次见面：{{ selectedRelative.lastMetAt || '从未' }}</div>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-show="viewMode === 'list'" class="list-view">
      <div class="search-bar">
        <van-search
          v-model="keyword"
          placeholder="搜索姓名/关系/特征/分支"
          shape="round"
          @update:model-value="onSearch"
        />
        <van-tabs v-model:active="activeGen" @change="onGenChange">
          <van-tab title="全部" :name="0" />
          <van-tab title="祖辈" :name="1" />
          <van-tab title="父辈" :name="2" />
          <van-tab title="同辈" :name="3" />
          <van-tab title="晚辈" :name="4" />
          <van-tab title="孙辈" :name="5" />
        </van-tabs>
      </div>

      <div class="list-body">
        <van-empty
          v-if="!loading && list.length === 0"
          :description="keyword ? `未找到「${keyword}」` : '还没有亲戚'"
        >
          <van-button type="primary" round block @click="goNew()">添加亲戚</van-button>
        </van-empty>

        <van-cell
          v-for="r in list"
          :key="r.id"
          :title="r.name"
          :label="buildLabel(r)"
          is-link
          @click="goDetail(r.id)"
        >
          <template #icon>
            <span class="list-animal">{{ getAnimalEmoji(r) }}</span>
          </template>
          <template #value>
            <span v-if="r._distance != null" class="distance">{{ formatDistance(r._distance) }}</span>
            <van-tag v-if="isLongUnseen(r)" type="warning" size="mini">久未见</van-tag>
          </template>
        </van-cell>
      </div>
    </div>

    <van-floating-bubble icon="plus" @click="goNew()" />

    <van-action-sheet v-model:show="showMenu" :actions="menuActions" @select="onMenuSelect" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { listRelatives } from '../db/relatives-dao.js'
import { listUpcomingGifts } from '../db/gifts-dao.js'
import { useGeolocation } from '../composables/useGeolocation.js'
import { loadBaiduMap } from '../utils/baiduMapLoader.js'
import { formatDistance } from '../utils/geo.js'
import { getAnimalEmoji } from '../utils/animals.js'
import { pushBackHandler } from '../utils/nativeBack.js'

const router = useRouter()
const { myLat, myLng, locating, error: geoError, locateMe, setMyLocation, clearLocation } = useGeolocation()

const viewMode = ref('map')
const list = ref([])
const loading = ref(true)
const keyword = ref('')
const activeGen = ref(0)
const showMenu = ref(false)
const selectedRelative = ref(null)
const manualPicking = ref(false)
const upcomingGifts = ref([])

// 地图相关
let mapInstance = null
let mapClickListener = null
const markers = []  // 百度地图 Label 数组

const menuActions = [
  { name: '家族树', icon: 'cluster' },
  { name: '礼金往来', icon: 'gold-coin-o' },
  { name: '提醒中心', icon: 'bell' },
  { name: '备份', icon: 'description' }
]

function isLongUnseen(r) {
  if (!r.lastMetAt) return true
  const days = (Date.now() - new Date(r.lastMetAt).getTime()) / (1000 * 60 * 60 * 24)
  return days > 180
}

function buildLabel(r) {
  const parts = []
  if (r.relationship) parts.push(r.relationship)
  if (r.features) parts.push(r.features)
  if (r.lastMetAt) parts.push(`上次 ${r.lastMetAt}`)
  else parts.push('从未见')
  return parts.join(' · ')
}

// 有坐标的亲戚数量
const locatedCount = computed(() => list.value.filter((r) => r.lat && r.lng).length)

async function load() {
  loading.value = true
  const gen = activeGen.value === 0 ? null : activeGen.value
  list.value = await listRelatives({
    keyword: keyword.value,
    generation: gen,
    myLat: myLat.value,
    myLng: myLng.value
  })
  loading.value = false

  // 加载待办礼金提醒
  upcomingGifts.value = await listUpcomingGifts(30)

  // 地图模式下刷新 markers
  if (viewMode.value === 'map') {
    nextTick(() => renderMarkers())
  }
}

function relativeName(id) {
  const r = list.value.find((x) => x.id === id)
  return r ? r.name : `ID ${id}`
}

function daysText(date) {
  const days = Math.ceil((new Date(date) - new Date(new Date().toDateString())) / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days}天后`
}

// 初始化百度地图
async function initMap() {
  if (mapInstance) return
  try {
    await loadBaiduMap()
    const BMap = window.BMap
    if (!BMap) return

    // 中心点：用户位置或默认北京
    const centerLat = myLat.value || 39.9
    const centerLng = myLng.value || 116.4
    mapInstance = new BMap.Map('home-map')
    mapInstance.centerAndZoom(new BMap.Point(centerLng, centerLat), 12)
    mapInstance.enableScrollWheelZoom(true)

    renderMarkers()
  } catch (err) {
    console.warn('首页地图加载失败：', err.message)
  }
}

// 渲染亲戚点位
function renderMarkers() {
  if (!mapInstance) return
  const BMap = window.BMap
  if (!BMap) return

  // 清除旧 markers
  markers.forEach((m) => mapInstance.removeOverlay(m))
  markers.length = 0

  // 添加自身位置标记（蓝色圆点）
  if (myLat.value && myLng.value) {
    const mePoint = new BMap.Point(myLng.value, myLat.value)
    const meLabel = new BMap.Label('', { position: mePoint, offset: new BMap.Size(-12, -12) })
    meLabel.setStyle({
      width: '24px', height: '24px',
      background: '#07c160', border: '3px solid #fff',
      borderRadius: '50%', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      padding: '0'
    })
    mapInstance.addOverlay(meLabel)
    markers.push(meLabel)
  }

  // 添加亲戚点位
  list.value.forEach((r) => {
    if (!r.lat || !r.lng) return
    const point = new BMap.Point(r.lng, r.lat)
    const distText = r._distance != null ? formatDistance(r._distance) : ''
    const html = buildAnimalMarkerHtml(r, distText)

    const label = new BMap.Label(html, {
      position: point,
      offset: new BMap.Size(-25, -25)
    })
    label.setStyle({
      background: 'transparent',
      border: 'none',
      padding: '0',
      cursor: 'pointer'
    })

    label.addEventListener('click', () => {
      selectedRelative.value = r
    })

    mapInstance.addOverlay(label)
    markers.push(label)
  })
}

function buildAnimalMarkerHtml(relative, distanceText) {
  const animal = getAnimalEmoji(relative)
  const dist = distanceText ? `<div class="marker-dist">${distanceText}</div>` : ''
  return `
    <div class="animal-marker">
      <div class="animal-emoji">${animal}</div>
      ${dist}
    </div>
  `
}

async function enableLocation() {
  await locateMe()
  if (myLat.value && mapInstance) {
    const BMap = window.BMap
    mapInstance.centerAndZoom(new BMap.Point(myLng.value, myLat.value), 14)
  }
  await load()
}

async function refreshLocation() {
  clearLocation()
  await locateMe()
  await load()
}

// 手动选位置：进入选点模式，用户在地图上点击即设为我的位置
function startManualPick() {
  if (!mapInstance) return
  manualPicking.value = true
  // 提示用户
  alert('请在地图上点击你的位置')
  mapClickListener = (e) => {
    setMyLocation(e.point.lat, e.point.lng)
    cancelManualPick()
    load()
  }
  mapInstance.addEventListener('click', mapClickListener)
}

// 退出手动选点模式并移除地图点击监听
function cancelManualPick() {
  manualPicking.value = false
  if (mapClickListener && mapInstance) {
    mapInstance.removeEventListener('click', mapClickListener)
  }
  mapClickListener = null
}

// 原生返回：先关菜单/取消选点模式；都没有则交回 App.vue（首页退出 APP）
let unregisterBack = null
onMounted(() => {
  unregisterBack = pushBackHandler(() => {
    if (showMenu.value) {
      showMenu.value = false
      return true
    }
    if (manualPicking.value) {
      cancelManualPick()
      return true
    }
    return false
  })
  load()
})
onUnmounted(() => unregisterBack?.())

function onSearch() { load() }
function onGenChange() { load() }

function goDetail(id) { router.push(`/relative/${id}`) }
function goNew(name = '') {
  router.push({ path: '/relative/new', query: name ? { name } : {} })
}

function onMenuSelect(action) {
  showMenu.value = false
  if (action.name === '家族树') router.push('/tree')
  else if (action.name === '礼金往来') router.push('/gifts')
  else if (action.name === '提醒中心') router.push('/reminders')
  else if (action.name === '备份') router.push('/backup')
}

// 切到地图视图时初始化地图
watch(viewMode, (v) => {
  if (v === 'map') {
    nextTick(() => initMap())
  }
})
</script>

<style>
/* 地图 marker 样式（全局，因为百度 Label 注入到 body） */
.animal-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: auto;
}
.animal-emoji {
  font-size: 28px;
  background: #fff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  border: 2px solid #fff;
}
.marker-dist {
  font-size: 11px;
  color: #07c160;
  background: #fff;
  padding: 1px 6px;
  border-radius: 8px;
  margin-top: 2px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  white-space: nowrap;
}
</style>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
  /* 本页顶栏全部 fixed（内部 calc 已含安全区），抵消 .app 的全局安全区
     padding，避免安全区被加两次导致地图与 Tab 间出现状态栏高度的空隙 */
  margin-top: calc(-1 * var(--app-safe-top));
}

.view-tabs {
  position: fixed;
  top: calc(46px + var(--app-safe-top));
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
}

/* 地图视图：.page 已用负 margin 回到视口顶，本元素铺满整屏，
   仅用 padding-top 给 fixed 的导航栏(46)+Tabs(44)+安全区让位 */
.map-view {
  position: relative;
  padding-top: calc(92px + var(--app-safe-top));
  height: 100vh;
}
.home-map {
  width: 100%;
  height: 100%;
}

.locate-bar {
  position: absolute;
  top: calc(100px + var(--app-safe-top));
  left: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(255,255,255,0.95);
  border-radius: 20px;
  padding: 8px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.locate-text { flex: 1; color: #323233; }

.todo-bar {
  position: absolute;
  top: calc(152px + var(--app-safe-top));
  left: 12px;
  right: 12px;
  z-index: 9;
  background: rgba(255,255,255,0.95);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
}
.todo-scroll {
  flex: 1;
  overflow-x: auto;
  white-space: nowrap;
  display: flex;
  gap: 8px;
  scrollbar-width: none;
}
.todo-scroll::-webkit-scrollbar { display: none; }
.todo-chip {
  background: #fff7e6;
  color: #ed6a20;
  padding: 4px 10px;
  border-radius: 10px;
  flex-shrink: 0;
}

.info-card {
  position: absolute;
  bottom: calc(20px + var(--app-safe-bottom));
  left: 12px;
  right: 12px;
  z-index: 10;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  overflow: hidden;
}
.info-card-header {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
}
.info-animal { font-size: 32px; margin-right: 12px; }
.info-name-row {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.info-name { font-size: 16px; font-weight: 600; }
.info-card-body {
  padding: 0 12px 12px;
  font-size: 13px;
  color: #646566;
  line-height: 1.6;
}
.info-met { color: #969799; margin-top: 4px; }

/* 列表视图 */
.list-view { padding-top: calc(92px + var(--app-safe-top)); }
.search-bar {
  position: fixed;
  top: calc(92px + var(--app-safe-top));
  left: 0;
  right: 0;
  z-index: 100;
  background: #fff;
}
/* .list-view 已有 92+safe 的 padding 把内容推到 Tabs 下，
   这里只需再让开 fixed 搜索栏自身高度（搜索框54+辈分Tabs44）*/
.list-body { padding: 98px 0 80px; }

.list-animal {
  font-size: 24px;
  margin-right: 10px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 50%;
}

.distance { color: #07c160; font-size: 12px; margin-right: 6px; }

/* 悬浮按钮避让手势导航条（Vant 内联 bottom，需 !important 覆盖） */
:deep(.van-floating-bubble) {
  bottom: calc(16px + var(--app-safe-bottom)) !important;
}
</style>

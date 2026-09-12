<template>
  <div class="map-picker">
    <!-- 顶部栏 -->
    <div class="top-bar">
      <van-icon name="arrow-left" size="20" @click="$emit('cancel')" />
      <span class="top-title">选择位置</span>
      <div class="top-actions">
        <van-icon
          v-if="!fallbackMode"
          name="location-o"
          size="22"
          :class="{ 'locating': locating }"
          @click="onLocateMe"
        />
        <van-button v-if="!fallbackMode" size="small" type="default" @click="fallbackMode = true">手填</van-button>
        <van-button v-else size="small" type="primary" @click="retryMap">地图</van-button>
      </div>
    </div>

    <!-- 地图模式 -->
    <template v-if="!fallbackMode">
      <!-- 搜索框 -->
      <div class="search-box">
        <van-search
          v-model="searchKeyword"
          placeholder="搜索地址/小区/地标"
          shape="round"
          @search="onSearch"
        />
      </div>

      <!-- 地图容器 -->
      <div id="baidu-map-container" class="map-container"></div>

      <!-- 加载中 -->
      <div v-if="loading" class="loading-overlay">
        <van-loading type="spinner" size="32px">加载地图中...</van-loading>
      </div>

      <!-- 加载失败 -->
      <div v-if="loadError && !loading" class="error-overlay">
        <van-empty :description="loadError">
          <van-button type="primary" size="small" @click="retryMap">重试地图</van-button>
          <van-button type="default" size="small" @click="fallbackMode = true" style="margin-left:8px">手填地址</van-button>
        </van-empty>
      </div>

      <!-- 搜索结果列表 -->
      <div v-if="searchResults.length > 0" class="result-list">
        <van-cell
          v-for="(item, i) in searchResults"
          :key="i"
          :title="item.title"
          :label="item.address"
          is-link
          @click="onSelectResult(item)"
        />
      </div>

      <!-- 底部确认条 -->
      <div class="confirm-bar" v-if="currentPoint && !loading && !loadError">
        <div class="address-info">
          <div class="addr-title">{{ currentAddress || '未命名地点' }}</div>
          <div class="addr-coord">{{ currentPoint.lat.toFixed(6) }}, {{ currentPoint.lng.toFixed(6) }}</div>
        </div>
        <van-button type="primary" size="small" @click="onConfirm">确定</van-button>
      </div>

      <!-- 提示 -->
      <div class="tip" v-if="!currentPoint && !loading && !loadError">拖动地图或搜索地址来标记位置</div>
    </template>

    <!-- 手填模式（降级方案） -->
    <template v-else>
      <div class="fallback-body">
        <van-cell-group inset>
          <van-field
            v-model="manualAddress"
            label="地址"
            type="textarea"
            rows="2"
            placeholder="如：山东省济南市历下区xx路xx号"
          />
          <van-field
            v-model="manualLat"
            label="纬度"
            placeholder="如：36.6512"
            type="digit"
          />
          <van-field
            v-model="manualLng"
            label="经度"
            placeholder="如：117.1201"
            type="digit"
          />
        </van-cell-group>

        <div class="fallback-tip">
          <p>· 经纬度可在百度地图APP长按地点复制</p>
          <p>· 也可只填地址，不填经纬度（距离排序时会排到最后）</p>
        </div>

        <div class="fallback-actions">
          <van-button block type="primary" :disabled="!canManualConfirm" @click="onManualConfirm">
            确定
          </van-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import { loadBaiduMap } from '../utils/baiduMapLoader.js'
import { useGeolocation } from '../composables/useGeolocation.js'

export default {
  name: 'BaiduMapPicker',
  props: {
    initialLat: { type: Number, default: null },
    initialLng: { type: Number, default: null },
    initialAddress: { type: String, default: '' }
  },
  emits: ['confirm', 'cancel'],
  setup() {
    return useGeolocation()
  },
  data() {
    return {
      fallbackMode: false,  // 是否降级到手填模式
      // 地图模式状态
      map: null,
      marker: null,
      geo: null,
      localSearch: null,
      searchKeyword: '',
      searchResults: [],
      currentPoint: null,
      currentAddress: '',
      loading: true,
      loadError: null,
      // 手填模式状态
      manualAddress: this.initialAddress || '',
      manualLat: this.initialLat ? String(this.initialLat) : '',
      manualLng: this.initialLng ? String(this.initialLng) : ''
    }
  },
  computed: {
    canManualConfirm() {
      // 地址或经纬度至少填一个
      const hasAddr = this.manualAddress.trim().length > 0
      const hasLat = this.manualLat.trim().length > 0
      const hasLng = this.manualLng.trim().length > 0
      return hasAddr || (hasLat && hasLng)
    }
  },
  mounted() {
    this.initMap()
  },
  methods: {
    async initMap() {
      this.loading = true
      this.loadError = null

      try {
        await loadBaiduMap()
        this.setupMap()
      } catch (err) {
        this.loadError = err.message || '地图加载失败'
      } finally {
        this.loading = false
      }
    },

    retryMap() {
      this.fallbackMode = false
      this.loadError = null
      this.initMap()
    },

    setupMap() {
      const BMap = window.BMap
      if (!BMap) {
        this.loadError = '百度地图 SDK 未加载，请检查 AK 配置'
        return
      }

      const centerLat = this.initialLat || 39.9
      const centerLng = this.initialLng || 116.4
      const center = new BMap.Point(centerLng, centerLat)

      this.map = new BMap.Map('baidu-map-container')
      this.map.centerAndZoom(center, 12)
      this.map.enableScrollWheelZoom(true)
      this.map.enableDragging()

      this.geo = new BMap.Geocoder()

      this.localSearch = new BMap.LocalSearch(this.map, {
        renderOptions: { map: this.map, autoViewport: true },
        onSearchComplete: (results) => {
          this.searchResults = []
          if (!results) return
          for (let i = 0; i < results.getCurrentNumPois() && i < 10; i++) {
            const poi = results.getPoi(i)
            if (poi) {
              this.searchResults.push({
                title: poi.title,
                address: poi.address,
                point: poi.point
              })
            }
          }
        }
      })

      if (this.initialLat && this.initialLng) {
        this.placeMarker(center)
        this.currentPoint = { lat: this.initialLat, lng: this.initialLng }
        this.currentAddress = this.initialAddress
      }

      this.map.addEventListener('click', (e) => {
        this.placeMarker(e.point)
        this.reverseGeocode(e.point)
      })

      this.loading = false
    },

    placeMarker(point) {
      const BMap = window.BMap
      if (this.marker) {
        this.marker.setPosition(point)
      } else {
        this.marker = new BMap.Marker(point)
        this.marker.enableDragging()
        this.marker.addEventListener('dragend', (e) => {
          this.reverseGeocode(e.point)
        })
        this.map.addOverlay(this.marker)
      }
      this.currentPoint = { lat: point.lat, lng: point.lng }
    },

    reverseGeocode(point) {
      if (!this.geo) return
      this.geo.getLocation(point, (result) => {
        if (result) {
          this.currentAddress = result.address
          this.placeMarker(point)
        }
      })
    },

    onSearch() {
      if (!this.searchKeyword || !this.localSearch) return
      this.localSearch.search(this.searchKeyword)
    },

    onSelectResult(item) {
      this.map.centerAndZoom(item.point, 15)
      this.currentAddress = item.title + ' - ' + item.address
      this.reverseGeocode(item.point)
      this.searchResults = []
    },

    onConfirm() {
      if (!this.currentPoint) return
      this.$emit('confirm', {
        lat: this.currentPoint.lat,
        lng: this.currentPoint.lng,
        address: this.currentAddress
      })
    },

    onManualConfirm() {
      const lat = this.manualLat.trim() ? parseFloat(this.manualLat) : null
      const lng = this.manualLng.trim() ? parseFloat(this.manualLng) : null
      this.$emit('confirm', {
        lat,
        lng,
        address: this.manualAddress.trim()
      })
    },

    // 一键获取当前位置
    async onLocateMe() {
      // useGeolocation 的 locateMe 返回 { lat, lng }
      const { lat, lng } = await this.locateMe()
      if (lat == null || lng == null) {
        return
      }
      if (!this.map || !window.BMap) {
        this.loadError = '地图未就绪，无法定位'
        return
      }
      const point = new window.BMap.Point(lng, lat)
      this.map.centerAndZoom(point, 16)
      this.placeMarker(point)
      this.reverseGeocode(point)
    }
  }
}
</script>

<style scoped>
.map-picker {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #fff;
  display: flex;
  flex-direction: column;
  /* 安全区域：顶部状态栏不重叠 */
  padding-top: var(--app-safe-top);
}

.top-bar {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f5f5f5;
  gap: 12px;
}
.top-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}
.top-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.top-actions .van-icon {
  cursor: pointer;
  color: #07c160;
}
.top-actions .van-icon.locating {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.search-box {
  position: relative;
  z-index: 10;
}

.map-container {
  flex: 1;
  width: 100%;
  min-height: 300px;
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 100px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.result-list {
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  border-top: 1px solid #f5f5f5;
}

.confirm-bar {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f5f5f5;
  display: flex;
  align-items: center;
  gap: 12px;
}

.address-info { flex: 1; }
.addr-title { font-size: 14px; color: #323233; font-weight: 600; }
.addr-coord { font-size: 12px; color: #969799; margin-top: 2px; }

.tip {
  position: absolute;
  top: 110px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 6px 16px;
  border-radius: 16px;
  font-size: 13px;
}

/* 手填模式 */
.fallback-body {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}
.fallback-tip {
  padding: 16px;
  font-size: 12px;
  color: #969799;
  line-height: 1.8;
}
.fallback-actions {
  padding: 16px;
}
</style>

// 定位逻辑 composable
// 策略（适配 PC 开发 + 手机使用）：
// 1. 先尝试浏览器原生 Geolocation（PC 用网络定位，手机用 GPS）
// 2. 超时/失败后用百度地图 IP 定位兜底
// 3. 都失败时提示用户手动在地图选位置
import { ref, readonly } from 'vue'
import { loadBaiduMap } from '../utils/baiduMapLoader.js'

const myLat = ref(null)
const myLng = ref(null)
const locating = ref(false)
const error = ref(null)

// 浏览器原生定位
function browserLocate() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),  // 失败不报错，走兜底
      {
        // PC 上不用高精度（没有 GPS 会超时），手机也能接受网络定位
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000  // 5分钟内缓存
      }
    )
  })
}

// 百度地图 IP 定位兜底（PC 上最可靠的方案）
async function baiduIpLocate() {
  try {
    await loadBaiduMap()
    const BMap = window.BMap
    if (!BMap) return null
    return new Promise((resolve) => {
      const geo = new BMap.Geolocation()
      geo.getCurrentPosition(
        (result) => {
          if (result && result.point) {
            resolve({ lat: result.point.lat, lng: result.point.lng })
          } else {
            resolve(null)
          }
        },
        () => resolve(null),
        { enableHighAccuracy: false, timeout: 10000 }
      )
    })
  } catch (e) {
    return null
  }
}

// 申请定位权限并获取坐标
export async function locateMe() {
  if (locating.value) return { lat: myLat.value, lng: myLng.value }
  if (myLat.value != null && myLng.value != null) {
    return { lat: myLat.value, lng: myLng.value }
  }

  locating.value = true
  error.value = null

  // 1. 浏览器定位
  let pos = await browserLocate()

  // 2. 百度 IP 定位兜底
  if (!pos) {
    pos = await baiduIpLocate()
  }

  if (pos) {
    myLat.value = pos.lat
    myLng.value = pos.lng
  } else {
    error.value = '定位失败，可手动在地图上选位置'
  }

  locating.value = false
  return { lat: myLat.value, lng: myLng.value }
}

// 手动设置位置（用户在地图选点时调）
export function setMyLocation(lat, lng) {
  myLat.value = lat
  myLng.value = lng
  error.value = null
}

// 清除缓存
export function clearLocation() {
  myLat.value = null
  myLng.value = null
  error.value = null
}

export function useGeolocation() {
  return {
    myLat: readonly(myLat),
    myLng: readonly(myLng),
    locating: readonly(locating),
    error: readonly(error),
    locateMe,
    setMyLocation,
    clearLocation
  }
}

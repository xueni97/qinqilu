// 百度地图 JS API 加载器
// 用动态 script + callback 方式加载，避免 document.write 在 SPA 中不生效
// 同时捕获百度地图的 alert 弹窗（如"APP服务被禁用"）

const BAIDU_AK = 'bAH2vaiEFI3MSza6mHchVb6YahSS6O6J'
let loadPromise = null

// 加载百度地图 SDK，返回 Promise<BMap>
export function loadBaiduMap() {
  if (typeof window.BMap !== 'undefined' && window.BMap.Map) {
    return Promise.resolve(window.BMap)
  }

  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    // 捕获 alert：百度地图在 AK 有问题时会 alert "APP服务被禁用"
    const originalAlert = window.alert
    window.alert = (msg) => {
      if (typeof msg === 'string' && msg.includes('APP服务被禁用')) {
        reject(new Error('百度地图 APP服务被禁用，请检查：1)AK类型是否为浏览器端 2)是否开通JavaScript API服务 3)Referer白名单是否包含当前域名'))
        return
      }
      // 其他 alert 正常弹
      originalAlert.call(window, msg)
    }

    window.__baiduMapCallback = () => {
      // 恢复 alert
      window.alert = originalAlert
      if (typeof window.BMap !== 'undefined' && window.BMap.Map) {
        resolve(window.BMap)
      } else {
        reject(new Error('百度地图 SDK 加载失败，BMap 对象未就绪'))
      }
    }

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = `https://api.map.baidu.com/api?v=3.0&ak=${BAIDU_AK}&callback=__baiduMapCallback`
    script.onerror = () => {
      window.alert = originalAlert
      loadPromise = null
      reject(new Error('网络错误：无法加载百度地图 SDK'))
    }

    // 超时检测（15秒）
    const timer = setTimeout(() => {
      if (typeof window.BMap === 'undefined' || !window.BMap.Map) {
        window.alert = originalAlert
        loadPromise = null
        reject(new Error('百度地图加载超时（15秒），请检查网络或AK配置'))
      }
    }, 15000)

    const origCallback = window.__baiduMapCallback
    window.__baiduMapCallback = function () {
      clearTimeout(timer)
      origCallback()
    }

    document.head.appendChild(script)
  })

  return loadPromise
}

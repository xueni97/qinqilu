// 地理距离计算工具
// 用 Haversine 公式算两点间球面距离
// 设计文档新增：首页按距离排序亲戚

const EARTH_RADIUS_M = 6371000  // 地球半径（米）

// 角度转弧度
function toRad(deg) {
  return (deg * Math.PI) / 180
}

// Haversine 距离（单位：米）
// 输入两个 [lat, lng] 坐标
export function haversineMeters(lat1, lng1, lat2, lng2) {
  // 参数校验：任一缺失返回 null（调用方处理"无坐标"场景）
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  if (Number.isNaN(+lat1) || Number.isNaN(+lng1) || Number.isNaN(+lat2) || Number.isNaN(+lng2)) return null

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_M * c
}

// 距离格式化（用于列表显示）
// <1000m 显示米，>=1000m 显示公里
export function formatDistance(meters) {
  if (meters == null) return '距离未知'
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// 按距离排序亲戚列表
// 有坐标的按距离升序，无坐标的统一排到最后
// 输入：relatives 数组 + 用户坐标 [myLat, myLng]
export function sortByDistance(relatives, myLat, myLng) {
  if (myLat == null || myLng == null) {
    // 用户无定位——原序返回（让调用方决定是否 fallback 到时间排序）
    return relatives
  }
  const withDist = relatives.map((r) => ({
    ...r,
    _distance: haversineMeters(myLat, myLng, r.lat, r.lng)
  }))
  withDist.sort((a, b) => {
    // 有距离的按距离升序
    if (a._distance != null && b._distance != null) return a._distance - b._distance
    // 有距离的排前
    if (a._distance != null) return -1
    if (b._distance != null) return 1
    return 0
  })
  return withDist
}

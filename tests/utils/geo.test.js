import { describe, it, expect } from 'vitest'
import { haversineMeters, formatDistance, sortByDistance } from '../../src/utils/geo.js'

describe('haversineMeters', () => {
  it('同一坐标距离为0', () => {
    expect(haversineMeters(30, 120, 30, 120)).toBeCloseTo(0, 5)
  })

  it('北京到上海约 1067km', () => {
    // 北京 39.9, 116.4；上海 31.2, 121.5
    const d = haversineMeters(39.9, 116.4, 31.2, 121.5)
    expect(d / 1000).toBeCloseTo(1067, -2)  // 允许±200km误差
  })

  it('参数缺失返回 null', () => {
    expect(haversineMeters(null, 120, 30, 120)).toBeNull()
    expect(haversineMeters(30, 120, null, 120)).toBeNull()
    expect(haversineMeters(30, undefined, 30, 120)).toBeNull()
  })

  it('非数字返回 null', () => {
    expect(haversineMeters('abc', 120, 30, 120)).toBeNull()
  })
})

describe('formatDistance', () => {
  it('小于1000m显示米', () => {
    expect(formatDistance(500)).toBe('500m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('大于等于1000m显示公里', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(5200)).toBe('5.2km')
  })

  it('null 显示未知', () => {
    expect(formatDistance(null)).toBe('距离未知')
  })
})

describe('sortByDistance', () => {
  const list = [
    { id: 1, lat: 31.2, lng: 121.5 },   // 上海（用户在上海）
    { id: 2, lat: 39.9, lng: 116.4 },   // 北京
    { id: 3, lat: null, lng: null },    // 无坐标
    { id: 4, lat: 30.3, lng: 120.2 },   // 杭州（近）
    { id: 5 }                            // 完全没字段
  ]

  it('用户在上海(31.2, 121.5)，杭州应排第一', () => {
    const sorted = sortByDistance(list, 31.2, 121.5)
    expect(sorted[0].id).toBe(1)  // 上海（0m，最近）
    expect(sorted[1].id).toBe(4)  // 杭州（近）
    expect(sorted[2].id).toBe(2)  // 北京（远）
    // 3 和 5 无坐标，排最后
    expect([sorted[3].id, sorted[4].id].sort()).toEqual([3, 5])
  })

  it('用户无定位时不排序，原序返回', () => {
    const sorted = sortByDistance(list, null, null)
    expect(sorted.map((r) => r.id)).toEqual([1, 2, 3, 4, 5])
  })

  it('排序后每项有 _distance 字段', () => {
    const sorted = sortByDistance(list, 31.2, 121.5)
    expect(sorted[0]._distance).toBeGreaterThanOrEqual(0)  // 杭州>0，上海=0
    // 北京(远) > 杭州(近)
    const hangzhou = sorted.find((r) => r.id === 4)
    const beijing = sorted.find((r) => r.id === 2)
    expect(beijing._distance).toBeGreaterThan(hangzhou._distance)
  })
})

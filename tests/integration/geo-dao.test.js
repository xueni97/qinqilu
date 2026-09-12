import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import { listRelatives, createRelative } from '../../src/db/relatives-dao.js'

describe('集成: 距离排序 + 无坐标回退', () => {
  beforeEach(async () => {
    await db.relatives.clear()
  })

  it('有定位时按距离排序：近的在前，无坐标排后', async () => {
    // 用户坐标：上海 31.2, 121.5
    await createRelative({
      name: '上海亲戚', generation: 2, branch: 'X',
      lat: 31.2, lng: 121.5  // 0米
    })
    await createRelative({
      name: '杭州亲戚', generation: 2, branch: 'Y',
      lat: 30.3, lng: 120.2  // 约 170km
    })
    await createRelative({
      name: '北京亲戚', generation: 2, branch: 'Z',
      lat: 39.9, lng: 116.4  // 约 1067km
    })
    await createRelative({
      name: '无坐标亲戚', generation: 2, branch: 'W'
    })

    const list = await listRelatives({ myLat: 31.2, myLng: 121.5 })

    expect(list[0].name).toBe('上海亲戚')
    expect(list[1].name).toBe('杭州亲戚')
    expect(list[2].name).toBe('北京亲戚')
    expect(list[3].name).toBe('无坐标亲戚')  // 无坐标排最后

    // 每项有 _distance 字段
    expect(list[0]._distance).toBeGreaterThanOrEqual(0)
    expect(list[1]._distance).toBeGreaterThan(list[0]._distance)
    expect(list[2]._distance).toBeGreaterThan(list[1]._distance)
    expect(list[3]._distance).toBeNull()  // 无坐标 → null（haversineMeters 返回 null）
  })

  it('无定位时回退到 lastMetAt 排序', async () => {
    await createRelative({ name: 'A', generation: 2, branch: 'X', lastMetAt: '2026-02-10' })
    await createRelative({ name: 'B', generation: 2, branch: 'X', lastMetAt: '2024-01-01' })
    await createRelative({ name: 'C', generation: 2, branch: 'X' })  // 从未见

    const list = await listRelatives({})  // 不传 myLat/myLng

    expect(list.map((r) => r.name)).toEqual(['C', 'B', 'A'])  // null 最前，然后远到近
    // 没有 _distance 字段
    expect(list[0]._distance).toBeUndefined()
  })

  it('v2 schema 升级后原数据能正常读写（lat/lng 为 undefined）', async () => {
    // 模拟升级前数据：无 lat/lng
    const id = await db.relatives.add({
      name: '老数据', generation: 2, branch: 'X', deleted: false
    })
    const r = await db.relatives.get(id)
    expect(r.name).toBe('老数据')
    expect(r.lat).toBeUndefined()
    expect(r.lng).toBeUndefined()

    // 能正常查询排序（无坐标归到最后）
    await createRelative({
      name: '新数据', generation: 2, branch: 'X',
      lat: 30, lng: 120
    })
    const list = await listRelatives({ myLat: 31, myLng: 121 })
    // 有坐标的排前
    expect(list[0].name).toBe('新数据')
  })
})

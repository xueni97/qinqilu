import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import {
  listRelatives, getRelative, createRelative, updateRelative,
  softDeleteRelative, restoreRelative, confirmDeleteByName
} from '../../src/db/relatives-dao.js'

describe('集成1: CRUD 闭环 + 软删除过滤', () => {
  beforeEach(async () => {
    await db.relatives.clear()
  })

  it('新建 → 查询 → 更新 → 软删 → 列表过滤', async () => {
    // 1. 新建
    const id = await createRelative({
      name: '张大爷', gender: '男', generation: 2, branch: '姑家',
      lastMetAt: '2025-10-01'
    })
    expect(id).toBeGreaterThan(0)

    // 2. 查询
    const r = await getRelative(id)
    expect(r.name).toBe('张大爷')
    expect(r.deleted).toBe(false)

    // 3. 列表包含
    let list = await listRelatives()
    expect(list.length).toBe(1)

    // 4. 更新
    await updateRelative(id, { name: '张大爷改名', features: '白发' })
    const updated = await getRelative(id)
    expect(updated.name).toBe('张大爷改名')
    expect(updated.features).toBe('白发')

    // 5. 软删
    await softDeleteRelative(id)
    list = await listRelatives()
    expect(list.length).toBe(0)  // 软删后列表过滤掉
    const deleted = await getRelative(id)
    expect(deleted.deleted).toBe(true)

    // 6. 恢复
    await restoreRelative(id)
    list = await listRelatives()
    expect(list.length).toBe(1)
  })

  it('搜索姓名/关系/特征/分支', async () => {
    await createRelative({ name: '张大爷', relationship: '姑父', features: '白发', branch: '姑家', generation: 2 })
    await createRelative({ name: '王阿姨', relationship: '表姐', features: '卷发', branch: '外婆家', generation: 3 })
    await createRelative({ name: '李伯伯', relationship: '舅舅', features: '光头', branch: '外婆家', generation: 2 })

    // 搜姓名
    expect((await listRelatives({ keyword: '张' })).length).toBe(1)
    // 搜关系
    expect((await listRelatives({ keyword: '姑' })).length).toBe(1)  // 姑父
    // 搜特征
    expect((await listRelatives({ keyword: '光' })).length).toBe(1)  // 光头
    // 搜分支
    expect((await listRelatives({ keyword: '外婆' })).length).toBe(2)
  })

  it('辈分筛选', async () => {
    await createRelative({ name: 'A', generation: 1, branch: 'X' })
    await createRelative({ name: 'B', generation: 2, branch: 'X' })
    await createRelative({ name: 'C', generation: 2, branch: 'X' })

    const gen2 = await listRelatives({ generation: 2 })
    expect(gen2.length).toBe(2)
  })

  it('confirmDeleteByName 姓名不匹配拒绝删除', async () => {
    const id = await createRelative({ name: '张大爷', generation: 2, branch: '姑家' })
    await expect(confirmDeleteByName(id, '错误的姓名')).rejects.toThrow('不匹配')
    // 没删成
    expect((await listRelatives()).length).toBe(1)
    // 正确姓名才删
    await confirmDeleteByName(id, '张大爷')
    expect((await listRelatives()).length).toBe(0)
  })
})

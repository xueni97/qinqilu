import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import { syncSpouse } from '../../src/db/relatives.js'

describe('syncSpouse', () => {
  beforeEach(async () => {
    await db.relatives.clear()
  })

  it('单向设置后双向同步：A.spouseId=B 后 B.spouseId=A', async () => {
    const aId = await db.relatives.add({ name: 'A', spouseId: null, deleted: false })
    const bId = await db.relatives.add({ name: 'B', spouseId: null, deleted: false })

    await syncSpouse(aId, bId, db)

    const a = await db.relatives.get(aId)
    const b = await db.relatives.get(bId)
    expect(a.spouseId).toBe(bId)
    expect(b.spouseId).toBe(aId)
  })

  it('解除时双向清空：传 bId=null 双方都置空', async () => {
    const aId = await db.relatives.add({ name: 'A', spouseId: null, deleted: false })
    const bId = await db.relatives.add({ name: 'B', spouseId: null, deleted: false })

    await syncSpouse(aId, bId, db)
    await syncSpouse(aId, null, db)  // 解除

    const a = await db.relatives.get(aId)
    const b = await db.relatives.get(bId)
    expect(a.spouseId).toBeNull()
    expect(b.spouseId).toBeNull()
  })

  it('A 原有配偶 C，改设为 B 时——C 对 A 的回指自动清空', async () => {
    const aId = await db.relatives.add({ name: 'A', spouseId: null, deleted: false })
    const bId = await db.relatives.add({ name: 'B', spouseId: null, deleted: false })
    const cId = await db.relatives.add({ name: 'C', spouseId: null, deleted: false })

    // A ↔ C
    await syncSpouse(aId, cId, db)
    // 改为 A ↔ B
    await syncSpouse(aId, bId, db)

    const a = await db.relatives.get(aId)
    const b = await db.relatives.get(bId)
    const c = await db.relatives.get(cId)
    expect(a.spouseId).toBe(bId)
    expect(b.spouseId).toBe(aId)
    expect(c.spouseId).toBeNull()  // C 已被解除回指
  })
})

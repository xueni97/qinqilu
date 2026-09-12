import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import { isTreeValid } from '../../src/utils/tree.js'

describe('isTreeValid', () => {
  beforeEach(async () => {
    await db.relatives.clear()
  })

  it('parentId=null 合法（孤立节点）', async () => {
    const id = await db.relatives.add({ name: '远房', parentId: null, deleted: false })
    expect(await isTreeValid(null, id, db)).toBe(true)
  })

  it('parentId=自己 非法（自引用）', async () => {
    const id = await db.relatives.add({ name: 'X', parentId: null, deleted: false })
    expect(await isTreeValid(id, id, db)).toBe(false)
  })

  it('parentId=父亲 合法（正常父子）', async () => {
    const fatherId = await db.relatives.add({ name: '父', parentId: null, deleted: false })
    const sonId = await db.relatives.add({ name: '子', parentId: fatherId, deleted: false })
    expect(await isTreeValid(fatherId, sonId, db)).toBe(true)
  })

  it('parentId=自己的子孙 非法（成环）', async () => {
    // 爷 → 父 → 我
    const grandpa = await db.relatives.add({ name: '爷', parentId: null, deleted: false })
    const father = await db.relatives.add({ name: '父', parentId: grandpa, deleted: false })
    const me = await db.relatives.add({ name: '我', parentId: father, deleted: false })
    // 想把"爷"的 parentId 设为"我"——会成环
    expect(await isTreeValid(me, grandpa, db)).toBe(false)
  })
})

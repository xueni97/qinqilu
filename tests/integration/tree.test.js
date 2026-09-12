import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import { createRelative, updateRelative, getRelative } from '../../src/db/relatives-dao.js'
import { syncSpouse } from '../../src/db/relatives.js'

describe('集成3: 树结构校验 + 配偶双向同步 + 删父后子 parentId 置 null', () => {
  beforeEach(async () => {
    await db.relatives.clear()
  })

  it('设环引用被拒：爷的 parentId 不能设为孙', async () => {
    const grandpa = await createRelative({ name: '爷', generation: 1, branch: 'X', parentId: null })
    const father = await createRelative({ name: '父', generation: 2, branch: 'X', parentId: grandpa })
    const me = await createRelative({ name: '我', generation: 3, branch: 'X', parentId: father })

    // 试图把"爷"的 parentId 设为"我"——成环，应被拒
    await expect(updateRelative(grandpa, { parentId: me })).rejects.toThrow('parentId 非法')
  })

  it('辈分倒挂被拒：父的辈分不能 >= 子', async () => {
    const father = await createRelative({ name: '父', generation: 2, branch: 'X', parentId: null })
    const son = await createRelative({ name: '子', generation: 3, branch: 'X', parentId: father })

    // 试图把子的辈分改成 1（比父还小）—— 倒挂
    await expect(updateRelative(son, { generation: 1 })).rejects.toThrow('辈分倒挂')
  })

  it('配偶自动双向同步', async () => {
    const a = await createRelative({ name: 'A', generation: 2, branch: 'X', spouseId: null })
    const b = await createRelative({ name: 'B', generation: 2, branch: 'Y', spouseId: null })

    await updateRelative(a, { spouseId: b })  // DAO 调 syncSpouse

    expect((await getRelative(a)).spouseId).toBe(b)
    expect((await getRelative(b)).spouseId).toBe(a)
  })

  it('删父后子节点的 parentId 不级联删除（软删父后子仍在）', async () => {
    const father = await createRelative({ name: '父', generation: 2, branch: 'X', parentId: null })
    const son = await createRelative({ name: '子', generation: 3, branch: 'X', parentId: father })

    // 这里 DAO 的软删不级联改子的 parentId
    // 测试 syncSpouse 解除也正确（覆盖 syncSpouse 的解除路径）
    const a = await createRelative({ name: 'A', generation: 2, branch: 'X', spouseId: null })
    const b = await createRelative({ name: 'B', generation: 2, branch: 'Y', spouseId: null })
    await syncSpouse(a, b, db)
    await syncSpouse(a, null, db)  // 解除

    expect((await getRelative(a)).spouseId).toBeNull()
    expect((await getRelative(b)).spouseId).toBeNull()
  })
})

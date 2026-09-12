import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import {
  createRelative, updateRelative, softDeleteRelative, findDuplicateByName
} from '../../src/db/relatives-dao.js'

describe('集成8: 重名校验（同名亲戚不允许重复添加）', () => {
  beforeEach(async () => {
    await db.relatives.clear()
  })

  it('新建重名 → 报错并提示已有亲戚', async () => {
    await createRelative({ name: '张三', generation: 2, branch: '姑家' })
    await expect(createRelative({ name: '张三', generation: 3, branch: '姑家' }))
      .rejects.toThrow(/已存在同名亲戚「张三」/)
  })

  it('姓名首尾空格也算重名（trim 后比较）', async () => {
    await createRelative({ name: '张三', generation: 2, branch: '姑家' })
    expect(await findDuplicateByName(' 张三 ')).not.toBeNull()
    await expect(createRelative({ name: '  张三  ', generation: 3, branch: '姑家' }))
      .rejects.toThrow(/已存在同名亲戚/)
  })

  it('编辑改成别人名字 → 报错；自己原名保存 → 通过', async () => {
    const id1 = await createRelative({ name: '张三', generation: 2, branch: '姑家' })
    const id2 = await createRelative({ name: '李四', generation: 2, branch: '姑家' })

    // 李四改成张三 → 拒绝
    await expect(updateRelative(id2, { name: '张三' }))
      .rejects.toThrow(/已存在同名亲戚「张三」/)

    // 张三原名保存（patch 带自己名字）→ 通过
    await expect(updateRelative(id1, { name: '张三', height: '175cm' })).resolves.toBeUndefined()
  })

  it('软删的同名亲戚不占用名字（可重新添加）', async () => {
    const id = await createRelative({ name: '张三', generation: 2, branch: '姑家' })
    await softDeleteRelative(id)
    // 软删后重名允许
    await expect(createRelative({ name: '张三', generation: 3, branch: '姑家' })).resolves.toBeGreaterThan(0)
  })

  it('不同名字正常添加不受影响', async () => {
    await createRelative({ name: '张三', generation: 2, branch: '姑家' })
    await expect(createRelative({ name: '张三丰', generation: 1, branch: '姑家' })).resolves.toBeGreaterThan(0)
  })
})

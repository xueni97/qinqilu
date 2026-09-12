import { describe, it, expect } from 'vitest'
import { db } from '../src/db/index.js'

describe('阶段0 sanity 测试', () => {
  it('Dexie 实例化正常', () => {
    expect(db).toBeTruthy()
    expect(db.name).toBe('relatives-memory')
  })

  it('数据库表都存在', () => {
    expect(db.relatives).toBeTruthy()
    expect(db.photos).toBeTruthy()
    expect(db.gifts).toBeTruthy()
    expect(db.visits).toBeTruthy()
  })

  it('基本读写闭环', async () => {
    await db.relatives.clear()
    const id = await db.relatives.add({
      name: '测试姑父',
      gender: '男',
      generation: 2,
      branch: '姑家',
      deleted: false
    })
    const got = await db.relatives.get(id)
    expect(got.name).toBe('测试姑父')
    expect(got.branch).toBe('姑家')
  })
})

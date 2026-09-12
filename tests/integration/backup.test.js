import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '../../src/db/index.js'
import { createRelative } from '../../src/db/relatives-dao.js'
import { addPhoto } from '../../src/db/photos-dao.js'
import { exportAll, importAll, checkExportHealth } from '../../src/db/backup.js'

// mock document.createElement（jsdom 里触发下载用）
// 也要 mock URL.createObjectURL 和 document.body
function mockDownload() {
  vi.spyOn(document, 'createElement').mockImplementation(() => ({
    click: vi.fn(),
    set href(v) {},
    set download(v) {}
  }))
  vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
  vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
  // URL.createObjectURL 在 jsdom 已实现，revokeObjectURL 同理
}

describe('集成4: 导出导入往返', () => {
  beforeEach(async () => {
    await db.relatives.clear()
    await db.photos.clear()
    await db.gifts.clear()
    await db.visits.clear()
    vi.restoreAllMocks()
  })

  it('3条主档 + 2张图 → 导出 JSON → 清库 → 导入 → 数据完整还原', async () => {
    mockDownload()

    // 准备数据
    const r1 = await createRelative({ name: 'A', generation: 2, branch: 'X', photoId: null })
    const r2 = await createRelative({ name: 'B', generation: 3, branch: 'X' })
    const r3 = await createRelative({ name: 'C', generation: 1, branch: 'Y' })

    await addPhoto({
      relativeId: r1, blob: new Blob(['img1'], { type: 'image/jpeg' }),
      thumbnail: new Blob(['t1'], { type: 'image/jpeg' }), source: 'album', isPrimary: true
    })
    await addPhoto({
      relativeId: r2, blob: new Blob(['img2'], { type: 'image/jpeg' }),
      thumbnail: new Blob(['t2'], { type: 'image/jpeg' }), source: 'camera'
    })

    // 导出
    const { json, sizeBytes } = await exportAll()
    expect(sizeBytes).toBeGreaterThan(0)
    expect(JSON.parse(json).relatives.length).toBe(3)
    expect(JSON.parse(json).photos.length).toBe(2)

    // 清库
    await db.relatives.clear()
    await db.photos.clear()
    expect((await db.relatives.toArray()).length).toBe(0)

    // 导入（会触发下载当前备份——已 mock）
    const result = await importAll(json)
    expect(result.relatives).toBe(3)
    expect(result.photos).toBe(2)

    // 校验数据还原
    const restored = await db.relatives.toArray()
    expect(restored.length).toBe(3)
    const names = restored.map((r) => r.name).sort()
    expect(names).toEqual(['A', 'B', 'C'])

    // 照片记录还原（fake-indexeddb 对 Blob 存储是环境限制，靠 E2E 验收）
    const photos = await db.photos.toArray()
    expect(photos.length).toBe(2)
    expect(photos.every((p) => p.relativeId && p.source)).toBe(true)
  })

  it('导出健康检查：小文件警告', () => {
    const small = checkExportHealth(100)  // 100 字节
    expect(small.ok).toBe(false)
    expect(small.warning).toContain('可能未完整')

    const ok = checkExportHealth(20 * 1024)  // 20KB
    expect(ok.ok).toBe(true)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/index.js'
import { createRelative, getRelative } from '../../src/db/relatives-dao.js'
import { addPhoto, listPhotosByRelative, setPrimary, deletePhoto, getPrimaryThumbnail } from '../../src/db/photos-dao.js'

// 构造测试用 Blob
function makeBlob(content = 'test-image', type = 'image/jpeg') {
  return new Blob([content], { type })
}

describe('集成2: 照片压缩存取 + 主图删除后 photoId 清空', () => {
  beforeEach(async () => {
    await db.relatives.clear()
    await db.photos.clear()
  })

  it('添加主图 → 主档 photoId 同步；删除主图 → photoId 置空或转下一张', async () => {
    const rid = await createRelative({ name: 'X', generation: 2, branch: 'Y' })

    // 添加一张主图
    const pid1 = await addPhoto({
      relativeId: rid, blob: makeBlob('big1'), thumbnail: makeBlob('small1'),
      source: 'album', isPrimary: true
    })

    let rel = await getRelative(rid)
    expect(rel.photoId).toBe(pid1)

    // 再加一张，非主图
    const pid2 = await addPhoto({
      relativeId: rid, blob: makeBlob('big2'), thumbnail: makeBlob('small2'),
      source: 'camera', isPrimary: false
    })

    // 设第二张为主图
    await setPrimary(rid, pid2)
    rel = await getRelative(rid)
    expect(rel.photoId).toBe(pid2)

    // 删除当前主图（pid2）→ 应自动让 pid1 成为主图
    await deletePhoto(pid2)
    rel = await getRelative(rid)
    expect(rel.photoId).toBe(pid1)  // 自动转给剩下的一张

    // 删除最后一张 → photoId 置空
    await deletePhoto(pid1)
    rel = await getRelative(rid)
    expect(rel.photoId).toBeNull()
  })

  it('getPrimaryThumbnail 取主图缩略图', async () => {
    const rid = await createRelative({ name: 'Y', generation: 2, branch: 'Z' })
    await addPhoto({
      relativeId: rid, blob: makeBlob('B'), thumbnail: makeBlob('T'),
      source: 'album', isPrimary: true
    })
    const t = await getPrimaryThumbnail(rid)
    // fake-indexeddb 对 Blob 的存储是环境限制（设计6.6节：不测环境依赖）
    // 验证"查得到主图缩略图字段"，实际 Blob 内容靠 E2E 验收
    expect(t).toBeTruthy()
  })
})

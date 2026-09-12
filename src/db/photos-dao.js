// 照片 DAO
// 设计文档 3.2 节：照片独立存表，主档只存 photoId
// 设计文档 5.1 节：删除主图后主档 photoId 同步置空

import { db } from './index.js'

// 添加照片（含 blob + thumbnail + 可选大头贴 sticker）
// isPrimary=true 时自动更新主档 photoId（不用嵌套 transaction，简单直接）
export async function addPhoto({ relativeId, blob, thumbnail, sticker = null, source, textDesc, isPrimary = false, takenAt }) {
  const id = await db.photos.add({
    relativeId,
    blob,
    thumbnail,
    sticker,
    source: source || 'album',
    textDesc: textDesc || '',
    isPrimary,
    takenAt: takenAt || new Date().toISOString().slice(0, 10)
  })

  // 若设为主图：取消其他主图 + 更新主档 photoId
  if (isPrimary) {
    // 先取消其他主图
    const others = await db.photos.where('relativeId').equals(relativeId).toArray()
    for (const p of others) {
      if (p.id !== id && p.isPrimary) {
        await db.photos.update(p.id, { isPrimary: false })
      }
    }
    // 同步主档
    await db.relatives.update(relativeId, { photoId: id })
  }

  return id
}

// 列出某亲戚所有照片（列表用 thumbnail，详情页才取 blob）
export async function listPhotosByRelative(relativeId) {
  return db.photos.where('relativeId').equals(relativeId).toArray()
}

// 取主图（缩略图）
// 用 toArray + filter，避免 fake-indexeddb 的 .and() 兼容问题
export async function getPrimaryThumbnail(relativeId) {
  const all = await db.photos.where('relativeId').equals(relativeId).toArray()
  const primary = all.find((p) => p.isPrimary)
  return primary ? primary.thumbnail : null
}

// 取主图大头贴（有则返回 sticker blob，否则 null）
export async function getPrimarySticker(relativeId) {
  const all = await db.photos.where('relativeId').equals(relativeId).toArray()
  const primary = all.find((p) => p.isPrimary)
  return primary ? (primary.sticker || null) : null
}

// 取主图原图（详情页大图）
export async function getPrimaryBlob(relativeId) {
  const all = await db.photos.where('relativeId').equals(relativeId).toArray()
  const primary = all.find((p) => p.isPrimary)
  return primary ? primary.blob : null
}

// 设主图：取消其他主图，更新主档 photoId
export async function setPrimary(relativeId, photoId) {
  // 取消其他主图
  const others = await db.photos.where('relativeId').equals(relativeId).toArray()
  for (const p of others) {
    if (p.id !== photoId && p.isPrimary) {
      await db.photos.update(p.id, { isPrimary: false })
    }
  }
  // 设当前为主图
  await db.photos.update(photoId, { isPrimary: true })
  // 同步主档
  await db.relatives.update(relativeId, { photoId })
}

// 删除照片：若删的是主图，主档 photoId 同步置空
export async function deletePhoto(photoId) {
  const photo = await db.photos.get(photoId)
  if (!photo) return

  await db.photos.delete(photoId)
  if (photo.isPrimary) {
    // 主档 photoId 置空，并自动选下一张为主图（如有）
    const remaining = await db.photos.where('relativeId').equals(photo.relativeId).toArray()
    if (remaining.length > 0) {
      const next = remaining[0]
      await db.photos.update(next.id, { isPrimary: true })
      await db.relatives.update(photo.relativeId, { photoId: next.id })
    } else {
      await db.relatives.update(photo.relativeId, { photoId: null })
    }
  }
}

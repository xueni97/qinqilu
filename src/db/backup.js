// 备份/恢复 DAO
// 设计文档 3.6 节 + 5.1 节：
// - 导出 JSON（Blob → base64）
// - 导入前自动备份当前数据
// - 导出校验四表完整 + 文件大小警告

import { db } from './index.js'
import { blobToBase64, base64ToBlob } from '../utils/photo.js'

const BACKUP_VERSION = 1

// 导出全部数据为 JSON
// 返回 { json, sizeBytes }——调用方决定下载还是显示
export async function exportAll() {
  const relatives = await db.relatives.toArray()
  const photosRaw = await db.photos.toArray()
  const gifts = await db.gifts.toArray()
  const visits = await db.visits.toArray()

  // photos 的 Blob 字段转 base64
  const photos = await Promise.all(
    photosRaw.map(async (p) => ({
      ...p,
      blob: p.blob ? await blobToBase64(p.blob) : null,
      thumbnail: p.thumbnail ? await blobToBase64(p.thumbnail) : null
    }))
  )

  const payload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    relatives,
    photos,
    gifts,
    visits
  }

  const json = JSON.stringify(payload)
  return { json, sizeBytes: new Blob([json]).size }
}

// 把当前数据备份成 JSON 下载
// 导入新数据前调用，保护当前数据
export async function downloadCurrentBackup() {
  const { json } = await exportAll()
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const filename = `backup-${date}.json`
  triggerDownload(json, filename)
}

// 导入 JSON 恢复数据
// 步骤：先备份当前 → 清库 → 写入新数据
export async function importAll(jsonStr) {
  // 先备份当前
  await downloadCurrentBackup()

  const payload = JSON.parse(jsonStr)
  if (!payload.version || !payload.relatives) {
    throw new Error('备份文件格式错误：缺少 version 或 relatives 字段')
  }

  await db.transaction('rw', db.relatives, db.photos, db.gifts, db.visits, async () => {
    await db.relatives.clear()
    await db.photos.clear()
    await db.gifts.clear()
    await db.visits.clear()

    await db.relatives.bulkAdd(payload.relatives)

    // photos 的 base64 字段转回 Blob
    const photos = await Promise.all(
      (payload.photos || []).map(async (p) => ({
        ...p,
        blob: p.blob ? base64ToBlob(p.blob) : null,
        thumbnail: p.thumbnail ? base64ToBlob(p.thumbnail) : null
      }))
    )
    if (photos.length) await db.photos.bulkAdd(photos)

    if (payload.gifts?.length) await db.gifts.bulkAdd(payload.gifts)
    if (payload.visits?.length) await db.visits.bulkAdd(payload.visits)
  })

  return {
    relatives: payload.relatives.length,
    photos: payload.photos?.length || 0,
    gifts: payload.gifts?.length || 0,
    visits: payload.visits?.length || 0
  }
}

// 触发浏览器下载
function triggerDownload(content, filename) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 校验导出文件大小
// 设计5.1：导出后校验文件大小，<10KB 警告
export function checkExportHealth(sizeBytes) {
  if (sizeBytes < 10 * 1024) {
    return { ok: false, warning: '导出文件较小，可能未完整导出——请检查是否包含全部亲戚' }
  }
  return { ok: true }
}

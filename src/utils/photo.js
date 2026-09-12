// 照片压缩工具：输入图片 Blob，输出 { blob, thumbnail }
// - blob：压缩到 1024px 宽 + JPEG 0.7 质量（原图约 100-300KB）
// - thumbnail：缩略图，约 80px 宽 + JPEG 0.6（列表用，约 5KB）
// 设计文档 5.1 节：避免 IndexedDB 配额超限

const MAX_WIDTH = 1024
const THUMBNAIL_WIDTH = 80
const QUALITY = 0.7
const THUMBNAIL_QUALITY = 0.6

// 从 Blob 生成 Image 对象
function loadImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

// 用 Canvas 把 Image 压缩到指定宽度
async function compressToWidth(img, targetWidth, quality) {
  const scale = Math.min(1, targetWidth / img.width)
  const canvas = document.createElement('canvas')
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
}

// 主函数：压缩照片 + 生成缩略图
export async function compressPhoto(blob) {
  const img = await loadImage(blob)

  const compressedBlob = await compressToWidth(img, MAX_WIDTH, QUALITY)
  const thumbnailBlob = await compressToWidth(img, THUMBNAIL_WIDTH, THUMBNAIL_QUALITY)

  return {
    blob: compressedBlob,
    thumbnail: thumbnailBlob
  }
}

// 工具：Blob → base64 字符串（导出备份用）
// 用 arrayBuffer 方式，不依赖 FileReader（兼容 Node/jsdom/fake-indexeddb）
// fake-indexeddb 取出的 blob 可能丢原型（变 {}），加 instanceof 检查
export async function blobToBase64(blob) {
  if (!blob || !(blob instanceof Blob) || typeof blob.arrayBuffer !== 'function') {
    return null
  }
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  // 分块处理避免大文件 callstack 溢出
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// 工具：base64 字符串 → Blob（导入备份用）
export function base64ToBlob(base64, mime = 'image/jpeg') {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mime })
}

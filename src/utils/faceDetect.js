// 人脸检测 + 大头贴裁剪工具
// 基于 face-api.js 的 TinyFaceDetector（轻量，移动端友好）
// 模型文件在 public/models/ 下
import * as faceapi from 'face-api.js'

// 用 Vite BASE_URL 拼接，兼容 GitHub Pages 子路径部署
const MODEL_URI = `${import.meta.env.BASE_URL}models`
let modelLoaded = false
let loadPromise = null

// 加载 TinyFaceDetector 模型（单例，只加载一次）
export async function loadFaceModel() {
  if (modelLoaded) return true
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI)
      modelLoaded = true
      return true
    } catch (err) {
      modelLoaded = false
      loadPromise = null
      console.warn('人脸检测模型加载失败：', err.message)
      return false
    }
  })()
  return loadPromise
}

// 从 Image/Blob 加载 HTMLImageElement
function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLImageElement) {
      resolve(source)
      return
    }
    // Blob 或 File
    const url = URL.createObjectURL(source)
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

// 把 Blob 转成 data URL（face-api 需要 HTMLImageElement 或 canvas）
async function blobToImage(blob) {
  return loadImageElement(blob)
}

// 检测单张人脸，返回 box {x, y, width, height, score}
export async function detectFace(blob) {
  const ok = await loadFaceModel()
  if (!ok) return null
  const img = await blobToImage(blob)
  const detection = await faceapi.detectSingleFace(
    img,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
  )
  if (!detection) return null
  const box = detection.box
  return {
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    score: detection.score
  }
}

// 裁剪人脸为大头贴
// 策略：取人脸 box，向四周扩展 40%（含头发/下巴），裁成正方形，缩放到 256x256
export async function cropFaceToSticker(blob) {
  const ok = await loadFaceModel()
  if (!ok) return null

  const img = await blobToImage(blob)
  const detection = await faceapi.detectSingleFace(
    img,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
  )

  if (!detection) return null

  const box = detection.box
  const imgW = img.width
  const imgH = img.height

  // 扩展 40% 边距，裁剪正方形
  const padRatio = 0.4
  const padX = box.width * padRatio
  const padY = box.height * padRatio
  let cx = box.x - padX
  let cy = box.y - padY
  let cw = box.width + padX * 2
  let ch = box.height + padY * 2

  // 调整为正方形（取较大边）
  let size = Math.max(cw, ch)
  cx = cx + cw / 2 - size / 2
  cy = cy + ch / 2 - size / 2

  // 边界裁剪
  cx = Math.max(0, cx)
  cy = Math.max(0, cy)
  if (cx + size > imgW) size = imgW - cx
  if (cy + size > imgH) size = imgH - cy

  // 用 canvas 裁剪并缩放到 256x256
  const STICKER_SIZE = 256
  const canvas = document.createElement('canvas')
  canvas.width = STICKER_SIZE
  canvas.height = STICKER_SIZE
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, cx, cy, size, size, 0, 0, STICKER_SIZE, STICKER_SIZE)

  const stickerBlob = await new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.85)
  })

  return {
    blob: stickerBlob,
    faceBox: { x: cx, y: cy, size },
    score: detection.score
  }
}

// 综合：上传照片时自动检测人脸，生成 { blob, thumbnail, sticker }
// - blob：原图压缩
// - thumbnail：缩略图
// - sticker：大头贴（检测到人脸时才有，否则 null）
export async function processPhotoWithFaceDetect(blob, compressFn) {
  const result = await compressFn(blob)  // { blob, thumbnail }
  // 异步检测人脸（不阻塞主流程）
  let sticker = null
  try {
    const faceResult = await cropFaceToSticker(blob)
    if (faceResult) {
      sticker = faceResult.blob
    }
  } catch (err) {
    console.warn('人脸检测失败：', err.message)
  }
  return { ...result, sticker }
}

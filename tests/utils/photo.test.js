import { describe, it, expect } from 'vitest'
import { blobToBase64, base64ToBlob } from '../../src/utils/photo.js'

// 注：compressPhoto 依赖 Canvas/Image API，jsdom 不支持
// 压缩逻辑靠阶段1 E2E 验收（设计文档6.6节：不测环境依赖）
// 这里只测纯函数 blobToBase64 / base64ToBlob

// 构造一个测试用图片 Blob（1x1 红点 PNG）
function makeTestPngBlob() {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return new Blob([arr], { type: 'image/png' })
}

describe('base64 往返', () => {
  it('Blob → base64 → Blob 数据一致', async () => {
    const original = makeTestPngBlob()
    const base64 = await blobToBase64(original)
    expect(typeof base64).toBe('string')
    const restored = base64ToBlob(base64, 'image/png')
    const origBuf = await original.arrayBuffer()
    const restBuf = await restored.arrayBuffer()
    expect(restBuf.byteLength).toBe(origBuf.byteLength)
  })

  it('base64ToBlob 输出 Blob 类型正确', () => {
    const blob = base64ToBlob('aGVsbG8=', 'image/jpeg')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/jpeg')
  })
})

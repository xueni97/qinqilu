<template>
  <div class="page">
    <van-nav-bar title="备份" left-arrow @click-left="$router.back()" />

    <div class="backup-body">
      <van-cell-group inset>
        <van-cell title="导出" label="下载全部数据为 JSON">
          <van-button type="primary" size="small" :loading="exporting" @click="onExport">导出</van-button>
        </van-cell>
      </van-cell-group>

      <van-cell-group inset>
        <van-cell title="导入" label="导入前会自动备份当前数据">
          <van-button type="warning" size="small" :loading="importing" @click="onPickFile">导入</van-button>
          <input
            ref="fileInput"
            type="file"
            accept="application/json"
            style="display:none"
            @change="onFilePicked"
          />
        </van-cell>
      </van-cell-group>

      <van-cell-group inset>
        <van-cell title="亲戚数" :value="stats.relatives" />
        <van-cell title="照片数" :value="stats.photos" />
        <van-cell title="礼金数" :value="stats.gifts" />
        <van-cell title="见面数" :value="stats.visits" />
      </van-cell-group>

      <div class="tips">
        <p>· 数据完全存在你手机本地，可断网使用</p>
        <p>· 换设备走"导出 → 网盘传文件 → 导入"</p>
        <p>· 导入前会自动生成 backup-YYYYMMDD.json 备份当前数据</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showSuccessToast, showFailToast, showNotify } from 'vant'
import { db } from '../db/index.js'
import { exportAll, importAll, checkExportHealth } from '../db/backup.js'

const stats = ref({ relatives: 0, photos: 0, gifts: 0, visits: 0 })
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref(null)

async function loadStats() {
  stats.value = {
    relatives: await db.relatives.where('deleted').notEqual(1).count()
      .catch(() => db.relatives.count()),
    photos: await db.photos.count(),
    gifts: await db.gifts.count(),
    visits: await db.visits.count()
  }
}

async function onExport() {
  exporting.value = true
  try {
    const { json, sizeBytes } = await exportAll()
    // 触发下载
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatives-${date}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    // 健康检查
    const health = checkExportHealth(sizeBytes)
    if (!health.ok) {
      showNotify({ type: 'warning', message: health.warning })
    } else {
      showSuccessToast(`导出成功（${(sizeBytes / 1024).toFixed(1)}KB）`)
    }
  } catch (err) {
    showFailToast('导出失败')
    console.error(err)
  } finally {
    exporting.value = false
  }
}

function onPickFile() {
  fileInput.value?.click()
}

async function onFilePicked(e) {
  const file = e.target.files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const result = await importAll(text)
    showSuccessToast(`导入成功：${result.relatives}人 ${result.photos}张图`)
    await loadStats()
  } catch (err) {
    showFailToast(err.message || '导入失败')
    console.error(err)
  } finally {
    importing.value = false
    e.target.value = ''
  }
}

onMounted(loadStats)
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; }
.backup-body { padding: 16px 0; }
.backup-body .van-cell-group { margin-bottom: 16px; }
.tips { padding: 16px; font-size: 12px; color: #969799; line-height: 1.8; }
</style>

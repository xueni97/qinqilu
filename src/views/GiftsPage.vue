<template>
  <div class="page">
    <van-nav-bar title="礼金往来" left-arrow @click-left="$router.back()" fixed>
      <template #right>
        <van-icon name="plus" size="18" @click="showAdd = true" />
      </template>
    </van-nav-bar>

    <div class="content">
      <!-- 统计卡片 -->
      <van-cell-group inset class="stat-card">
        <div class="stat-row">
          <div class="stat-item">
            <div class="stat-num out">¥{{ stats.out }}</div>
            <div class="stat-label">累计给出</div>
          </div>
          <div class="stat-item">
            <div class="stat-num in">¥{{ stats.in }}</div>
            <div class="stat-label">累计收入</div>
          </div>
          <div class="stat-item">
            <div class="stat-num" :class="stats.net >= 0 ? 'in' : 'out'">¥{{ stats.net }}</div>
            <div class="stat-label">净额</div>
          </div>
        </div>
      </van-cell-group>

      <!-- 按亲戚分组 -->
      <van-empty v-if="!loading && grouped.length === 0" description="还没有礼金记录" />

      <van-cell-group
        v-for="g in grouped"
        :key="g.relativeId"
        inset
        class="gift-group"
      >
        <van-cell
          :title="relativeName(g.relativeId)"
          is-link
          @click="$router.push(`/relative/${g.relativeId}`)"
        >
          <template #value>
            <span class="net-tag" :class="(g.in - g.out) >= 0 ? 'in' : 'out'">
              {{ (g.in - g.out) >= 0 ? '+' : '' }}¥{{ g.in - g.out }}
            </span>
          </template>
        </van-cell>
        <van-cell
          v-for="gift in giftsByRelative(g.relativeId)"
          :key="gift.id"
          class="gift-item"
          :class="{ 'is-pending': gift.status === 'pending' }"
        >
          <template #title>
            <div class="gift-title">
              <span :class="gift.direction">{{ gift.direction === 'out' ? '→ 出' : '← 入' }}</span>
              <span class="gift-amount">¥{{ gift.amount }}</span>
              <span class="gift-occasion">{{ gift.occasion }}</span>
              <van-tag v-if="gift.status === 'pending'" type="warning" size="mini" round>待办</van-tag>
            </div>
          </template>
          <template #label>
            <div class="gift-meta">
              {{ gift.date }}
              <span v-if="gift.note" class="gift-note">· {{ gift.note }}</span>
            </div>
          </template>
          <template #right-icon>
            <div class="gift-actions">
              <van-icon
                v-if="gift.status === 'pending'"
                name="success"
                size="16"
                class="done-icon"
                title="标记为已完成"
                @click="onMarkDone(gift.id)"
              />
              <van-icon name="cross" @click="onDelete(gift.id)" />
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 录入弹窗 -->
    <van-popup v-model:show="showAdd" position="bottom" round>
      <div class="add-form">
        <div class="add-title">记一笔礼金</div>
        <van-cell-group inset>
          <van-field
            :model-value="selectedRelName"
            label="亲戚"
            placeholder="选择亲戚"
            is-link
            readonly
            @click="showRelPicker = true"
          />
          <van-field name="direction" label="方向">
            <template #input>
              <van-radio-group v-model="form.direction" direction="horizontal">
                <van-radio name="out">给出</van-radio>
                <van-radio name="in">收入</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field name="status" label="状态">
            <template #input>
              <van-radio-group v-model="form.status" direction="horizontal">
                <van-radio name="done">已发生</van-radio>
                <van-radio name="pending">待发生</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-field
            v-model="form.amount"
            type="digit"
            label="金额"
            placeholder="如：500"
          />
          <van-field
            v-model="form.occasion"
            label="事由"
            placeholder="如：春节/婚礼/满月"
          />
          <van-field
            v-model="form.date"
            type="date"
            label="日期"
          />
          <van-field
            v-model="form.note"
            label="备注"
            placeholder="可选"
          />
        </van-cell-group>
        <div class="add-actions">
          <van-button block type="primary" :disabled="!canSave" @click="onSave">保存</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 亲戚选择 -->
    <van-popup v-model:show="showRelPicker" position="bottom" round>
      <van-picker
        :columns="relColumns"
        @confirm="onRelConfirm"
        @cancel="showRelPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showSuccessToast, showFailToast } from 'vant'
import {
  addGift, listAllGifts, getGiftStats, getGiftsByRelative, deleteGift, updateGift
} from '../db/gifts-dao.js'
import { listRelatives, getRelative } from '../db/relatives-dao.js'

const stats = ref({ out: 0, in: 0, net: 0, count: 0 })
const grouped = ref([])
const allGifts = ref([])
const relatives = ref([])
const loading = ref(true)
const showAdd = ref(false)
const showRelPicker = ref(false)
const selectedRelName = ref('')

const form = ref({
  relativeId: null,
  direction: 'out',
  status: 'done',
  amount: '',
  occasion: '',
  date: new Date().toISOString().slice(0, 10),
  note: ''
})

const relColumns = computed(() =>
  relatives.value.map((r) => ({ text: r.name, value: r.id }))
)

const canSave = computed(() =>
  form.value.relativeId && form.value.amount > 0
)

async function load() {
  loading.value = true
  stats.value = await getGiftStats()
  grouped.value = await getGiftsByRelative()
  allGifts.value = await listAllGifts()
  relatives.value = await listRelatives()
  loading.value = false
}

function giftsByRelative(relativeId) {
  return allGifts.value.filter((g) => g.relativeId === relativeId)
}

function relativeName(id) {
  const r = relatives.value.find((x) => x.id === id)
  return r ? r.name : `ID ${id}`
}

function onRelConfirm({ selectedValues }) {
  form.value.relativeId = selectedValues[0]
  const r = relatives.value.find((x) => x.id === selectedValues[0])
  selectedRelName.value = r ? r.name : ''
  showRelPicker.value = false
}

async function onSave() {
  try {
    await addGift({
      relativeId: form.value.relativeId,
      direction: form.value.direction,
      status: form.value.status,
      amount: form.value.amount,
      occasion: form.value.occasion,
      date: form.value.date,
      note: form.value.note
    })
    showSuccessToast('已记录')
    showAdd.value = false
    selectedRelName.value = ''
    form.value = {
      relativeId: null, direction: 'out', status: 'done', amount: '', occasion: '',
      date: new Date().toISOString().slice(0, 10), note: ''
    }
    await load()
  } catch (err) {
    showFailToast(err.message || '保存失败')
  }
}

async function onMarkDone(id) {
  await updateGift(id, { status: 'done' })
  showSuccessToast('已标记完成')
  await load()
}

async function onDelete(id) {
  try {
    await showConfirmDialog({ title: '删除', message: '确定删除这笔礼金记录？' })
    await deleteGift(id)
    showSuccessToast('已删除')
    await load()
  } catch (e) {
    // 取消
  }
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; padding-top: 46px; }
.content { padding: 12px 0 80px; }

.stat-card { padding: 16px; }
.stat-row { display: flex; justify-content: space-around; }
.stat-item { text-align: center; }
.stat-num { font-size: 20px; font-weight: 700; }
.stat-num.out { color: #ee0a24; }
.stat-num.in { color: #07c160; }
.stat-label { font-size: 12px; color: #969799; margin-top: 4px; }

.gift-group { margin-bottom: 12px; }
.net-tag { font-size: 13px; font-weight: 600; }
.net-tag.in { color: #07c160; }
.net-tag.out { color: #ee0a24; }

.gift-item { padding: 10px 16px; }
.gift-title { display: flex; align-items: center; gap: 8px; }
.gift-title .out { color: #ee0a24; font-size: 12px; }
.gift-title .in { color: #07c160; font-size: 12px; }
.gift-amount { font-weight: 600; }
.gift-occasion { color: #646566; font-size: 13px; }
.gift-meta { font-size: 12px; color: #969799; margin-top: 2px; }
.gift-note { color: #646566; }
.gift-item.is-pending { background: #fffbe8; }
.gift-actions { display: flex; align-items: center; gap: 12px; }
.done-icon { color: #07c160; }

.add-form { padding: 16px 0; }
.add-title { font-size: 16px; font-weight: 600; padding: 0 16px 12px; }
.add-actions { padding: 16px; }
</style>

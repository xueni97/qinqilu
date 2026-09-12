<template>
  <div class="page">
    <van-nav-bar title="提醒中心" left-arrow @click-left="$router.back()" fixed />

    <div class="content">
      <!-- 拜年倒数大卡片 -->
      <div class="spring-card">
        <div class="spring-label">距春节还有</div>
        <div class="spring-days">{{ springDays }}</div>
        <div class="spring-unit">天</div>
        <div class="spring-date">{{ springDate }}</div>
      </div>

      <!-- 待办提醒（未来礼金/宴请） -->
      <van-cell-group inset title="待办提醒" class="todo-section">
        <van-empty
          v-if="!loading && upcomingGifts.length === 0"
          description="近期没有待办事项"
          :image-height="80"
        />
        <van-cell
          v-for="g in upcomingGifts"
          :key="g.id"
          is-link
          @click="$router.push(`/relative/${g.relativeId}`)"
        >
          <template #title>
            <div class="todo-name">{{ relativeName(g.relativeId) }} · {{ g.occasion || '宴请' }}</div>
            <div class="todo-sub">{{ g.direction === 'out' ? '需给出' : '将收入' }} ¥{{ g.amount || '待定' }}</div>
          </template>
          <template #value>
            <div class="todo-days">
              <span v-if="daysText(g.date) === '今天'" class="today">今天</span>
              <span v-else class="upcoming">{{ daysText(g.date) }}</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 生日提醒 -->
      <van-cell-group inset title="生日提醒（近30天）">
        <van-empty
          v-if="!loading && birthdays.length === 0"
          description="近期没有亲戚过生日"
          :image-height="80"
        />
        <van-cell
          v-for="b in birthdays"
          :key="b.id"
          is-link
          @click="$router.push(`/relative/${b.id}`)"
        >
          <template #icon>
            <span class="bday-animal">{{ b.animal }}</span>
          </template>
          <template #title>
            <div class="bday-name">{{ b.name }}</div>
            <div class="bday-sub">{{ b.relationship }} · {{ b.birthDateText }}</div>
          </template>
          <template #value>
            <div class="bday-days">
              <span v-if="b.daysLeft === 0" class="today">今天</span>
              <span v-else-if="b.daysLeft < 0" class="passed">已过{{ -b.daysLeft }}天</span>
              <span v-else class="upcoming">{{ b.daysLeft }}天后</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 全部生日列表 -->
      <van-cell-group inset title="全部生日" class="all-birthdays">
        <van-cell
          v-for="b in allBirthdays"
          :key="b.id"
          is-link
          @click="$router.push(`/relative/${b.id}`)"
        >
          <template #title>{{ b.name }}</template>
          <template #value>
            <span class="all-bday-date">{{ b.birthDateText }}</span>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listRelatives } from '../db/relatives-dao.js'
import { listUpcomingGifts } from '../db/gifts-dao.js'
import { springFestivalThisYear, lunarBirthdayThisYear } from '../utils/lunar.js'
import { getAnimalEmoji } from '../utils/animals.js'

const loading = ref(true)
const relatives = ref([])
const upcomingGifts = ref([])

const now = new Date()
const thisYear = now.getFullYear()

// 春节倒数
const springDate = computed(() => {
  let sf = springFestivalThisYear(thisYear)
  // 如果今年春节已过，显示明年
  if (new Date(sf) < now) {
    sf = springFestivalThisYear(thisYear + 1)
  }
  return sf
})

const springDays = computed(() => {
  const diff = Math.ceil((new Date(springDate.value) - now) / (1000 * 60 * 60 * 24))
  return diff
})

// 计算每个亲戚今年的生日（公历）
function getBirthdayInfo(r) {
  if (!r.birthDate) return null
  let solarStr
  if (r.isLunar) {
    try {
      solarStr = lunarBirthdayThisYear(r.birthDate, thisYear)
    } catch (e) {
      solarStr = r.birthDate
    }
  } else {
    // 公历：取月日，替换为今年
    const [_, month, day] = r.birthDate.split('-')
    solarStr = `${thisYear}-${month}-${day}`
  }
  const bday = new Date(solarStr)
  const daysLeft = Math.ceil((bday - now) / (1000 * 60 * 60 * 24))
  return {
    id: r.id,
    name: r.name,
    relationship: r.relationship || '—',
    birthDate: r.birthDate,
    birthDateText: solarStr.slice(5),  // MM-DD
    daysLeft,
    animal: getAnimalEmoji(r)
  }
}

// 近30天生日（包括已过30天内的）
const birthdays = computed(() => {
  return relatives.value
    .map(getBirthdayInfo)
    .filter((b) => b && b.daysLeft >= -30 && b.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)
})

// 全部生日（按日期排序）
const allBirthdays = computed(() => {
  return relatives.value
    .map(getBirthdayInfo)
    .filter(Boolean)
    .sort((a, b) => {
      const [am, ad] = a.birthDateText.split('-').map(Number)
      const [bm, bd] = b.birthDateText.split('-').map(Number)
      return am !== bm ? am - bm : ad - bd
    })
})

async function load() {
  loading.value = true
  relatives.value = await listRelatives()
  upcomingGifts.value = await listUpcomingGifts(30)
  loading.value = false
}

function relativeName(id) {
  const r = relatives.value.find((x) => x.id === id)
  return r ? r.name : `ID ${id}`
}

function daysText(date) {
  const days = Math.ceil((new Date(date) - new Date(new Date().toDateString())) / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  return `${days}天后`
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; padding-top: 46px; }
.content { padding: 12px 0 80px; }

.spring-card {
  margin: 12px;
  padding: 24px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff6b6b, #ee0a24);
  color: #fff;
  text-align: center;
  box-shadow: 0 4px 12px rgba(238,10,36,0.3);
}
.spring-label { font-size: 14px; opacity: 0.9; }
.spring-days { font-size: 48px; font-weight: 800; line-height: 1.2; margin: 8px 0; }
.spring-unit { font-size: 16px; }
.spring-date { font-size: 13px; opacity: 0.8; margin-top: 8px; }

.todo-section { margin-top: 12px; }
.todo-name { font-weight: 600; }
.todo-sub { font-size: 12px; color: #969799; margin-top: 2px; }
.todo-days { font-size: 13px; font-weight: 600; }
.todo-days .today { color: #ee0a24; }
.todo-days .upcoming { color: #07c160; }

.bday-animal { font-size: 24px; margin-right: 10px; }
.bday-name { font-weight: 600; }
.bday-sub { font-size: 12px; color: #969799; margin-top: 2px; }
.bday-days { font-size: 13px; font-weight: 600; }
.bday-days .today { color: #ee0a24; }
.bday-days .upcoming { color: #07c160; }
.bday-days .passed { color: #969799; }

.all-birthdays { margin-top: 12px; }
.all-bday-date { color: #646566; font-size: 13px; }
</style>

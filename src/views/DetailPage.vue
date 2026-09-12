<template>
  <div class="page" v-if="relative">
    <van-nav-bar left-arrow @click-left="goBack">
      <template #title>
        <span>{{ relative.name }}</span>
      </template>
      <template #right>
        <van-icon name="ellipsis" size="18" @click="showMenu = true" />
      </template>
    </van-nav-bar>

    <!-- 顶部：大头像 + 姓名/关系/年龄 -->
    <div class="hero">
      <div class="hero-avatar" :class="avatarClass" v-if="!primaryThumb">{{ (relative.name || '?').charAt(0) }}</div>
      <img v-else :src="primaryThumb" class="hero-img" @error="imgError = true" />
      <div class="hero-info">
        <div class="hero-name">{{ relative.name }}</div>
        <div class="hero-sub">
          {{ relative.relationship || '—' }} · {{ genName }} · {{ ageText }}
        </div>
      </div>
    </div>

    <!-- 联系信息 -->
    <van-cell-group inset v-if="relative.phone || relative.wechat">
      <van-cell v-if="relative.phone" title="电话" :value="relative.phone" is-link @click="onPhone" />
      <van-cell v-if="relative.wechat" title="微信" :value="relative.wechat" is-link @click="onWechat" />
    </van-cell-group>
    <van-cell-group inset v-else>
      <van-cell title="联系方式" value="未填写" />
    </van-cell-group>

    <!-- 4区块折叠 -->
    <van-collapse v-model="activeSections">
      <van-collapse-item title="基本身份" name="identity">
        <van-cell title="性别" :value="relative.gender || '未填写'" />
        <van-cell title="生日" :value="birthText" />
        <van-cell title="分支" :value="relative.branch || '未填写'" />
        <van-cell title="身高" :value="relative.height || '未填写'" />
      </van-collapse-item>

      <van-collapse-item title="外貌特征" name="appearance">
        <div class="features-text">{{ relative.features || '未填写特征' }}</div>
        <div class="photo-album">
          <div v-if="photos.length === 0" class="no-photos">暂无照片</div>
          <template v-else>
            <img
              v-for="(p, i) in photos.slice(0, 3)"
              :key="p.id"
              :src="toThumbUrl(p)"
              class="album-thumb"
              @click="onPhotoClick(i)"
              @error="onThumbError(p)"
            />
            <div v-if="photos.length > 3" class="more-photos" @click="onPhotoClick(0)">
              <van-icon name="photo-o" size="20" />
              <span>共{{ photos.length }}张</span>
              <span class="more-hint">点击查看全部</span>
            </div>
          </template>
        </div>
      </van-collapse-item>

      <van-collapse-item title="家庭详情" name="family">
        <!-- 父项：带左侧色条，与子项区分 -->
        <div class="section-label">配偶信息</div>
        <van-cell v-if="spouse" title="配偶" :value="spouse.name" is-link @click="goRelative(spouse.id)" />
        <van-cell v-else title="配偶" value="未填写" />

        <div class="section-label">职业住址</div>
        <van-cell title="职业" :value="relative.occupation || '未填写'" />
        <van-cell title="单位" :value="relative.workplace || '未填写'" />
        <van-cell
          title="住址"
          :value="relative.address || '未填写'"
          :is-link="!!relative.address"
          @click="onNavigate"
        />

        <!-- 子女列表：子项缩进，背景区分 -->
        <div v-if="children.length > 0">
          <div class="section-label">子女（{{ children.length }}）</div>
          <div class="child-list">
            <van-cell
              v-for="c in children"
              :key="c.id"
              :title="c.name"
              is-link
              @click="goRelative(c.id)"
            >
              <template #icon>
                <van-icon name="user-o" class="child-icon" />
              </template>
            </van-cell>
          </div>
        </div>
        <div class="family-note" v-if="relative.familyNote">备注：{{ relative.familyNote }}</div>
      </van-collapse-item>

      <van-collapse-item title="交往记录" name="contact">
        <van-cell title="上次见面" :value="relative.lastMetAt || '从未'" />
        <van-cell title="场合" :value="relative.lastMetEvent || '—'" />
        <div class="last-note" v-if="relative.lastMetNote">关键事：{{ relative.lastMetNote }}</div>
        <div class="actions">
          <van-button size="small" type="primary" @click="showVisit = true">记一笔见面</van-button>
        </div>
      </van-collapse-item>

      <van-collapse-item title="礼金往来" name="gifts">
        <div v-if="gifts.length === 0" class="no-gifts">暂无礼金记录</div>
        <div v-else>
          <div class="gift-summary">
            <span class="out">给出 ¥{{ giftStats.out }}</span>
            <span class="in">收入 ¥{{ giftStats.in }}</span>
            <span :class="giftStats.net >= 0 ? 'in' : 'out'">净额 ¥{{ giftStats.net }}</span>
          </div>
          <van-cell
            v-for="g in gifts"
            :key="g.id"
            :class="{ 'is-pending': g.status === 'pending' }"
          >
            <template #title>
              <div class="d-gift-title">
                <span :class="g.direction">{{ g.direction === 'out' ? '→出' : '←入' }}</span>
                ¥{{ g.amount }} · {{ g.occasion || '—' }}
                <van-tag v-if="g.status === 'pending'" type="warning" size="mini" round>待办</van-tag>
              </div>
            </template>
            <template #label>{{ g.date }}{{ g.note ? ' · ' + g.note : '' }}</template>
          </van-cell>
        </div>
        <div class="actions">
          <van-button size="small" type="primary" @click="goGifts">记礼金</van-button>
        </div>
      </van-collapse-item>
    </van-collapse>

    <!-- 全屏照片预览 -->
    <van-image-preview
      v-model:show="showPhotoPreview"
      :images="previewImages"
      :start-position="previewStart"
    />

    <!-- 记一笔见面弹窗 -->
    <van-dialog
      v-model:show="showVisit"
      title="记一笔见面"
      show-cancel-button
      @confirm="saveVisit"
    >
      <van-field v-model="newVisit.date" label="日期" type="date" />
      <van-field v-model="newVisit.event" label="场合" placeholder="如：国庆" />
      <van-field v-model="newVisit.note" label="关键事" type="textarea" placeholder="聊到什么/嘱托" />
    </van-dialog>

    <van-action-sheet v-model:show="showMenu" :actions="menuActions" @select="onMenuSelect" cancel-text="取消" />
  </div>

  <van-empty v-else-if="!loading" description="亲戚不存在或已删除" />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import { getRelative, getChildren, getSpouse, updateRelative } from '../db/relatives-dao.js'
import { listPhotosByRelative, getPrimaryThumbnail, getPrimarySticker } from '../db/photos-dao.js'
import { listGiftsByRelative } from '../db/gifts-dao.js'
import { db } from '../db/index.js'
import { safeBack } from '../router/index.js'
import { pushBackHandler } from '../utils/nativeBack.js'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const relative = ref(null)
const spouse = ref(null)
const children = ref([])
const photos = ref([])
const gifts = ref([])
const giftStats = ref({ out: 0, in: 0, net: 0 })
const primaryThumb = ref(null)
const isSticker = ref(false)
const loading = ref(true)
const showMenu = ref(false)
const showVisit = ref(false)
const imgError = ref(false)
const activeSections = ref(['identity', 'family', 'contact'])

// 照片预览
const showPhotoPreview = ref(false)
const previewImages = ref([])
const previewStart = ref(0)

const newVisit = ref({ date: new Date().toISOString().slice(0, 10), event: '', note: '' })

const goBack = () => safeBack(router)

const menuActions = [
  { name: '编辑', action: 'edit' },
  { name: '记礼金', action: 'gift' },
  { name: '删除', action: 'delete' }
]

const GEN_NAMES = { 1: '祖辈', 2: '父辈', 3: '同辈', 4: '晚辈', 5: '孙辈' }
const genName = computed(() => GEN_NAMES[relative.value?.generation] || '—')

const avatarClass = computed(() => {
  const g = relative.value?.gender
  if (g === '男') return 'avatar-male'
  if (g === '女') return 'avatar-female'
  return 'avatar-unknown'
})

const ageText = computed(() => {
  const r = relative.value
  if (!r?.birthDate) return '年龄未知'
  const year = Number(r.birthDate.slice(0, 4))
  if (!year) return '年龄未知'
  return `${new Date().getFullYear() - year}岁`
})

const birthText = computed(() => {
  const r = relative.value
  if (!r?.birthDate) return '未填写'
  return r.isLunar ? `${r.birthDate}（农历）` : r.birthDate
})

async function load() {
  loading.value = true
  relative.value = await getRelative(id)
  if (relative.value) {
    spouse.value = await getSpouse(id)
    children.value = await getChildren(id)
    photos.value = await listPhotosByRelative(id)
    // 优先用大头贴（脸部裁剪），没有则用主图缩略图
    const sticker = await getPrimarySticker(id)
    if (sticker && sticker instanceof Blob) {
      primaryThumb.value = URL.createObjectURL(sticker)
      isSticker.value = true
    } else {
      const t = await getPrimaryThumbnail(id)
      if (t && t instanceof Blob) {
        primaryThumb.value = URL.createObjectURL(t)
      }
    }
    // 加载礼金
    gifts.value = await listGiftsByRelative(id)
    const out = gifts.value.filter((g) => g.direction === 'out' && g.status === 'done').reduce((s, g) => s + g.amount, 0)
    const inn = gifts.value.filter((g) => g.direction === 'in' && g.status === 'done').reduce((s, g) => s + g.amount, 0)
    giftStats.value = { out, in: inn, net: inn - out }
  }
  loading.value = false
}

function goRelative(targetId) {
  router.push(`/relative/${targetId}`)
}

function goGifts() {
  router.push('/gifts')
}

// 点击住址 → 打开百度地图导航
// 有坐标走 driving 路线，无坐标走地址搜索
function onNavigate() {
  const r = relative.value
  if (!r || !r.address) return

  if (r.lat && r.lng) {
    // 有坐标 → 百度地图导航（destination=lat,lng）
    const url = `https://api.map.baidu.com/direction?origin=latlng:0,0|name:我的位置&destination=latlng:${r.lat},${r.lng}|name:${encodeURIComponent(r.name)}&mode=driving&coord_type=bd09ll&output=html`
    window.open(url, '_blank')
  } else {
    // 无坐标 → 百度地图搜索地址
    const url = `https://api.map.baidu.com/geocoder?address=${encodeURIComponent(r.address)}&output=html`
    window.open(url, '_blank')
  }
}

async function onPhone() {
  const phone = relative.value?.phone
  if (!phone) return
  // 手机端 tel: 有效，PC无效回退复制
  try {
    location.href = `tel:${phone}`
  } catch {
    await navigator.clipboard.writeText(phone)
    showSuccessToast('已复制电话')
  }
}

async function onWechat() {
  const wx = relative.value?.wechat
  if (!wx) return
  try {
    await navigator.clipboard.writeText(wx)
    showSuccessToast('已复制，去微信粘贴')
  } catch {
    showFailToast('复制失败，请手动抄')
  }
}

function toThumbUrl(p) {
  if (p.thumbnail instanceof Blob) return URL.createObjectURL(p.thumbnail)
  return ''
}

function onThumbError(p) {
  console.warn('缩略图加载失败', p.id)
}

// 点击照片：打开全屏预览，展示高清原图
async function onPhotoClick(startIndex) {
  // 生成高清原图 URL 列表
  const urls = []
  for (const p of photos.value) {
    if (p.blob instanceof Blob) {
      urls.push(URL.createObjectURL(p.blob))
    } else if (p.thumbnail instanceof Blob) {
      urls.push(URL.createObjectURL(p.thumbnail))
    }
  }
  previewImages.value = urls
  previewStart.value = startIndex
  showPhotoPreview.value = true
}

async function saveVisit() {
  // 把弹窗录入合并到主档 lastMet* 三字段
  await updateRelative(id, {
    lastMetAt: newVisit.value.date,
    lastMetEvent: newVisit.value.event,
    lastMetNote: newVisit.value.note
  })
  // 同时写一笔 visits 表（阶段3会用到）
  await db.visits.add({
    relativeId: id,
    type: 'meeting',
    date: newVisit.value.date,
    location: '',
    done: false,
    sequence: 0,
    note: newVisit.value.note
  })
  showSuccessToast('已记录')
  await load()
}

function onMenuSelect(action) {
  showMenu.value = false
  if (action.action === 'edit') router.push(`/relative/${id}/edit`)
  else if (action.action === 'gift') router.push('/gifts')
  else if (action.action === 'delete') {
    // 跳到编辑页用确认删除（设计5.1：输入姓名确认）
    router.push(`/relative/${id}/edit?confirmDelete=1`)
  }
}

watch(() => route.params.id, load)

// 原生返回：照片预览/记一笔弹窗/菜单优先关闭，之后才返回列表
let unregisterBack = null
onMounted(() => {
  unregisterBack = pushBackHandler(() => {
    if (showPhotoPreview.value) { showPhotoPreview.value = false; return true }
    if (showVisit.value) { showVisit.value = false; return true }
    if (showMenu.value) { showMenu.value = false; return true }
    return false
  })
  load()
})
onUnmounted(() => unregisterBack?.())
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; padding-bottom: 20px; }

.hero {
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background: #fff;
}
.hero-avatar {
  width: 64px; height: 64px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 28px; flex-shrink: 0;
}
.avatar-male { background: #7ab6f9; }
.avatar-female { background: #ffb6c1; }
.avatar-unknown { background: #ccc; }
.hero-img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }
.hero-info { margin-left: 16px; }
.hero-name { font-size: 20px; font-weight: 600; color: #323233; }
.hero-sub { font-size: 14px; color: #969799; margin-top: 4px; }

.features-text { padding: 8px 0; color: #323233; }
.photo-album { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; align-items: center; }
.album-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; cursor: pointer; }
.no-photos { color: #c8c9cc; font-size: 13px; }
.more-photos {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 80px; height: 80px; background: #f2f3f5; border-radius: 6px; cursor: pointer;
  font-size: 11px; color: #646566; gap: 2px;
}
.more-photos .more-hint { font-size: 10px; color: #969799; }

/* 家庭详情：父项分组标签 */
.section-label {
  font-size: 13px; font-weight: 600; color: #1989fa;
  padding: 8px 16px 4px; margin-top: 4px;
  border-left: 3px solid #1989fa;
  background: #f0f9ff;
}
/* 子女列表项：缩进 + 背景区分 */
.child-list { margin-left: 12px; }
.child-list :deep(.van-cell) { background: #fafbfc; }
.child-icon { margin-right: 8px; color: #969799; font-size: 16px; }

.family-note { margin-top: 8px; padding: 8px; background: #f7f8fa; border-radius: 4px; font-size: 13px; color: #646566; }
.last-note { padding: 8px; background: #fff7e6; border-radius: 4px; font-size: 13px; margin: 8px 0; color: #ed6a20; }

.no-gifts { padding: 12px; color: #c8c9cc; font-size: 13px; text-align: center; }
.gift-summary { display: flex; justify-content: space-around; padding: 12px; background: #f7f8fa; margin: 8px 0; border-radius: 4px; font-size: 13px; }
.gift-summary .out { color: #ee0a24; }
.gift-summary .in { color: #07c160; }
.d-gift-title { display: flex; align-items: center; gap: 6px; }
.d-gift-title .out { color: #ee0a24; }
.d-gift-title .in { color: #07c160; }
.van-cell.is-pending { background: #fffbe8; }
.actions { margin-top: 8px; }
</style>

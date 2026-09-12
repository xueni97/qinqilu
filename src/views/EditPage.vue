<template>
  <div class="page">
    <van-nav-bar :title="isNew ? '新建亲戚' : '编辑亲戚'" left-arrow @click-left="$router.back()">
      <template #right>
        <van-button v-if="!isNew" type="danger" size="mini" @click="onDelete">删除</van-button>
      </template>
    </van-nav-bar>

    <van-form @submit="onSave">
      <!-- 1. 基本身份段 -->
      <van-collapse v-model="activeSections">
        <van-collapse-item title="基本身份" name="identity">
          <van-cell-group inset>
            <van-field v-model="form.name" label="姓名" placeholder="必填" required :rules="[{ required: true, message: '请输入姓名' }]" />
            <van-field label="性别">
              <template #input>
                <van-radio-group v-model="form.gender" direction="horizontal">
                  <van-radio name="男">男</van-radio>
                  <van-radio name="女">女</van-radio>
                </van-radio-group>
              </template>
            </van-field>
            <van-field v-model="form.birthDate" label="生日" type="date" placeholder="YYYY-MM-DD" />
            <van-cell title="只知年份" center>
              <template #right-icon>
                <van-switch v-model="form.birthYearOnly" size="20px" />
              </template>
            </van-cell>
            <van-cell title="农历生日" center>
              <template #right-icon>
                <van-switch v-model="form.isLunar" size="20px" />
              </template>
            </van-cell>
            <van-field label="辈分" is-link readonly :model-value="genLabel" @click="showGenPicker = true" />
            <van-popup v-model:show="showGenPicker" position="bottom">
              <van-picker
                :columns="genColumns"
                @confirm="onGenConfirm"
                @cancel="showGenPicker = false"
              />
            </van-popup>
            <van-field label="关系" is-link readonly :model-value="form.relationship || '请选择'" :placeholder="form.generation ? '请选择' : '先选辈分'" @click="onRelationshipClick" />
            <van-popup v-model:show="showRelPicker" position="bottom">
              <van-picker
                :columns="relColumns"
                @confirm="onRelConfirm"
                @cancel="showRelPicker = false"
              />
            </van-popup>
            <van-field label="分支" is-link readonly :model-value="form.branch || '请选择'" required :rules="[{ required: true, message: '分支必填' }]" @click="showBranchPicker = true" />
            <van-popup v-model:show="showBranchPicker" position="bottom">
              <van-picker
                :columns="branchColumns"
                @confirm="onBranchConfirm"
                @cancel="showBranchPicker = false"
              />
            </van-popup>
            <van-field
              v-if="showBranchNew"
              v-model="form.branch"
              label="新分支名"
              placeholder="输入新分支名"
              @blur="showBranchNew = false"
            />
            <van-field label="父亲" is-link readonly :model-value="parentLabel" @click="showParentPicker = true" />
            <van-popup v-model:show="showParentPicker" position="bottom">
              <van-picker
                :columns="parentColumns"
                @confirm="onParentConfirm"
                @cancel="showParentPicker = false"
              />
            </van-popup>
            <van-field label="配偶" is-link readonly :model-value="spouseLabel" @click="showSpousePicker = true" />
            <van-popup v-model:show="showSpousePicker" position="bottom">
              <van-picker
                :columns="spouseColumns"
                @confirm="onSpouseConfirm"
                @cancel="showSpousePicker = false"
              />
            </van-popup>
          </van-cell-group>
        </van-collapse-item>

        <!-- 2. 外貌段 -->
        <van-collapse-item title="外貌特征" name="appearance">
          <van-cell-group inset>
            <van-field v-model="form.height" label="身高" placeholder="如 175cm" />
          </van-cell-group>
          <div class="features-section">
            <div class="features-label">显著特征（点选，可多选）</div>
            <div v-for="(tags, cat) in FEATURE_PRESETS" :key="cat" class="feature-cat">
              <div class="cat-title">{{ cat }}</div>
              <div class="tag-row">
                <van-tag
                  v-for="tag in tags"
                  :key="tag"
                  :type="selectedFeatures.includes(tag) ? 'primary' : 'default'"
                  size="medium"
                  class="feature-tag"
                  @click="toggleFeature(tag)"
                >{{ tag }}</van-tag>
              </div>
            </div>
            <van-field
              v-model="customFeature"
              label="补充特征"
              placeholder="如：左手疤/说话带口音"
              @keyup.enter="addCustomFeature"
            >
              <template #button>
                <van-button size="small" type="primary" @click="addCustomFeature">添加</van-button>
              </template>
            </van-field>
            <div v-if="selectedFeatures.length > 0" class="selected-summary">
              <van-tag v-for="(f, i) in selectedFeatures" :key="i" closeable size="medium" type="primary" @close="removeFeature(i)">{{ f }}</van-tag>
            </div>
          </div>
          <div class="photo-section">
            <div class="photo-label">照片（点"主图"选大头贴）</div>
            <van-button size="small" @click="onAddPhoto('album')">从相册选</van-button>
            <van-button size="small" @click="onAddPhoto('camera')">现场拍</van-button>
            <van-button size="small" @click="onAddPhoto('text')">文字描述</van-button>

            <div v-if="pendingPhotos.length > 0" class="pending-photos">
              <div v-for="(p, i) in pendingPhotos" :key="i" class="pending-item" :class="{ 'is-primary': p.isPrimary }">
                <div class="thumb-wrap">
                  <img v-if="p.thumbUrl" :src="p.thumbUrl" class="pending-thumb" />
                  <span v-else class="pending-text">📝</span>
                  <!-- 大头贴角标 -->
                  <span v-if="p.detecting" class="sticker-badge detecting">
                    <van-loading size="12" />
                  </span>
                  <span v-else-if="p.stickerUrl" class="sticker-badge" title="已识别脸部，点此查看大头贴" @click="previewSticker(p)">
                    😊
                  </span>
                </div>
                <div class="photo-actions">
                  <van-button
                    size="mini"
                    :type="p.isPrimary ? 'warning' : 'default'"
                    @click="setPrimaryPhoto(i)"
                  >{{ p.isPrimary ? '主图' : '设主图' }}</van-button>
                  <van-button size="mini" type="danger" @click="pendingPhotos.splice(i, 1)">×</van-button>
                </div>
              </div>
            </div>

            <!-- 大头贴预览弹窗 -->
            <van-image-preview
              v-model:show="showStickerPreview"
              :images="stickerPreviewImages"
              :show-index="false"
            />
          </div>
          <input
            ref="albumInput"
            type="file"
            accept="image/*"
            style="display:none"
            @change="onAlbumPicked"
          />
          <input
            ref="cameraInput"
            type="file"
            accept="image/*"
            capture="user"
            style="display:none"
            @change="onAlbumPicked"
          />
        </van-collapse-item>

        <!-- 3. 家庭段 -->
        <van-collapse-item title="家庭详情" name="family">
          <van-cell-group inset>
            <van-field v-model="form.occupation" label="职业" placeholder="如：退休教师" />
            <van-field v-model="form.workplace" label="单位" placeholder="工作单位" />
            <van-field v-model="form.address" label="住址" placeholder="如：济南xx路xx号" />
            <van-cell label="地图位置">
              <template #value>
                <van-tag v-if="form.lat && form.lng" type="success" size="medium">已标记</van-tag>
                <van-tag v-else type="default" size="medium">未选</van-tag>
                <van-button size="mini" type="primary" @click="showMapPicker = true" style="margin-left:8px">
                  {{ form.lat ? '改选' : '选位置' }}
                </van-button>
              </template>
            </van-cell>
            <van-field v-model="form.phone" label="电话" placeholder="可选" />
            <van-field v-model="form.wechat" label="微信" placeholder="可选" />
            <van-field v-model="form.familyNote" label="家庭备注" type="textarea" placeholder="子女情况/家中变故等" />
          </van-cell-group>
        </van-collapse-item>

        <!-- 4. 交往段 -->
        <van-collapse-item title="交往记录" name="contact">
          <van-cell-group inset>
            <van-field v-model="form.lastMetAt" label="上次见面" type="date" />
            <van-field v-model="form.lastMetEvent" label="场合" placeholder="如：春节聚餐" />
            <van-field v-model="form.lastMetNote" label="关键事" type="textarea" placeholder="聊到的事/嘱托" />
          </van-cell-group>
        </van-collapse-item>
      </van-collapse>

      <div class="save-bar">
        <van-button round block type="primary" native-type="submit">保存</van-button>
      </div>
    </van-form>

    <!-- 删除确认弹窗：输入姓名 -->
    <van-dialog
      v-model:show="showDelete"
      title="删除亲戚"
      show-cancel-button
      @confirm="confirmDelete"
    >
      <van-field v-model="deleteInput" :placeholder="`请输入「${form.name}」确认`" />
    </van-dialog>

    <!-- 百度地图选点 -->
    <BaiduMapPicker
      v-if="showMapPicker"
      :initial-lat="form.lat"
      :initial-lng="form.lng"
      :initial-address="form.address"
      @confirm="onMapConfirm"
      @cancel="showMapPicker = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccessToast, showFailToast } from 'vant'
import {
  getRelative, createRelative, updateRelative,
  confirmDeleteByName, listRelatives
} from '../db/relatives-dao.js'
import { addPhoto } from '../db/photos-dao.js'
import { compressPhoto } from '../utils/photo.js'
import { cropFaceToSticker } from '../utils/faceDetect.js'
import { RELATIONSHIP_PRESETS, BRANCH_PRESETS, FEATURE_PRESETS } from '../utils/presets.js'
import BaiduMapPicker from '../components/BaiduMapPicker.vue'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id) || null
const isNew = computed(() => !id || Number.isNaN(id))

const GEN_NAMES = { 1: '祖辈', 2: '父辈', 3: '同辈', 4: '晚辈', 5: '孙辈' }
const genColumns = Object.entries(GEN_NAMES).map(([v, t]) => ({ text: t, value: Number(v) }))

const form = ref({
  name: '', gender: '男', birthDate: '', birthYearOnly: false, isLunar: false,
  generation: null, relationship: '', branch: '', parentId: null, spouseId: null,
  height: '', features: '',
  occupation: '', workplace: '', address: '', phone: '', wechat: '', familyNote: '',
  lat: null, lng: null,
  lastMetAt: '', lastMetEvent: '', lastMetNote: ''
})

const activeSections = ref(['identity', 'appearance', 'family', 'contact'])
const showGenPicker = ref(false)
const showRelPicker = ref(false)
const showBranchPicker = ref(false)
const showBranchNew = ref(false)
const showParentPicker = ref(false)
const showSpousePicker = ref(false)
const showDelete = ref(false)
const deleteInput = ref('')
const showMapPicker = ref(false)
const pendingPhotos = ref([])
const showStickerPreview = ref(false)
const stickerPreviewImages = ref([])
const albumInput = ref(null)
const cameraInput = ref(null)

// 显著特征：数组形式（勾选 + 自定义）
const selectedFeatures = ref([])
const customFeature = ref('')

// 关系选项：根据辈分动态显示
const relColumns = computed(() => {
  if (!form.value.generation) return []
  return RELATIONSHIP_PRESETS[form.value.generation] || []
})

// 分支选项：预设 + 已有分支去重（用 ref + 异步加载，不能用 computed 返回 Promise）
const branchColumns = ref([...BRANCH_PRESETS])

// 父亲候选列表
const parentColumns = ref([])

// 配偶候选列表
const spouseColumns = ref([])

// 异步加载下拉选项数据
async function loadPickerColumns() {
  const all = await listRelatives()
  // 分支：已有分支去重后追加
  const existing = new Set(all.map((r) => r.branch).filter(Boolean))
  const extras = [...existing]
    .filter((b) => !BRANCH_PRESETS.find((p) => p.value === b))
    .map((b) => ({ text: b, value: b }))
  branchColumns.value = [...BRANCH_PRESETS, ...extras]

  // 父亲候选
  parentColumns.value = all
    .filter((r) => r.id !== id)
    .map((r) => ({ text: `${r.name}（${GEN_NAMES[r.generation] || '—'}）`, value: r.id }))

  // 配偶候选
  spouseColumns.value = all
    .filter((r) => r.id !== id)
    .map((r) => ({ text: `${r.name}（${r.gender || '—'}）`, value: r.id }))
}

const genLabel = computed(() => GEN_NAMES[form.value.generation] || '未选')
const parentLabel = computed(() => form.value.parentId ? `ID ${form.value.parentId}` : '未选')
const spouseLabel = computed(() => form.value.spouseId ? `ID ${form.value.spouseId}` : '未选')

function onGenConfirm({ selectedValues }) {
  form.value.generation = selectedValues[0]
  // 辈分变了，清空关系（不同辈分关系列表不同）
  form.value.relationship = ''
  showGenPicker.value = false
}

function onRelationshipClick() {
  if (!form.value.generation) {
    showFailToast('请先选辈分')
    return
  }
  showRelPicker.value = true
}

function onRelConfirm({ selectedValues }) {
  form.value.relationship = selectedValues[0]
  showRelPicker.value = false
}

function onBranchConfirm({ selectedValues }) {
  const v = selectedValues[0]
  if (v === '__new__') {
    showBranchNew.value = true
    form.value.branch = ''
  } else {
    form.value.branch = v
  }
  showBranchPicker.value = false
}

// 特征勾选
function toggleFeature(tag) {
  const idx = selectedFeatures.value.indexOf(tag)
  if (idx >= 0) selectedFeatures.value.splice(idx, 1)
  else selectedFeatures.value.push(tag)
}

function addCustomFeature() {
  const t = customFeature.value.trim()
  if (!t) return
  if (!selectedFeatures.value.includes(t)) {
    selectedFeatures.value.push(t)
  }
  customFeature.value = ''
}

function removeFeature(i) {
  selectedFeatures.value.splice(i, 1)
}

async function onParentConfirm({ selectedValues }) {
  form.value.parentId = selectedValues[0]
  showParentPicker.value = false
}

async function onSpouseConfirm({ selectedValues }) {
  form.value.spouseId = selectedValues[0]
  showSpousePicker.value = false
}

// 地图选点回调
function onMapConfirm({ lat, lng, address }) {
  form.value.lat = lat
  form.value.lng = lng
  if (address) form.value.address = address
  showMapPicker.value = false
  showSuccessToast('位置已标记')
}

function onAddPhoto(type) {
  if (type === 'album') albumInput.value?.click()
  else if (type === 'camera') cameraInput.value?.click()
  else {
    // 文字描述
    const text = prompt('请输入外貌描述')
    if (text) {
      pendingPhotos.value.push({ source: 'text', textDesc: text, thumbUrl: null, isPrimary: pendingPhotos.value.length === 0 })
    }
  }
}

// 设主图（大头贴）
function setPrimaryPhoto(index) {
  pendingPhotos.value.forEach((p, i) => {
    p.isPrimary = i === index
  })
}

// 预览大头贴
function previewSticker(p) {
  if (p.stickerUrl) {
    stickerPreviewImages.value = [{ src: p.stickerUrl }]
    showStickerPreview.value = true
  }
}

async function onAlbumPicked(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const { blob, thumbnail } = await compressPhoto(file)
    const photo = {
      source: 'album',
      blob, thumbnail,
      thumbUrl: URL.createObjectURL(thumbnail),
      sticker: null,
      stickerUrl: null,
      detecting: true,
      isPrimary: pendingPhotos.value.length === 0
    }
    pendingPhotos.value.push(photo)

    // 异步人脸检测，不阻塞 UI
    cropFaceToSticker(file).then((result) => {
      if (result) {
        photo.sticker = result.blob
        photo.stickerUrl = URL.createObjectURL(result.blob)
      }
      photo.detecting = false
    }).catch((err) => {
      console.warn('人脸检测失败：', err.message)
      photo.detecting = false
    })
  } catch (err) {
    showFailToast('照片处理失败')
    console.error(err)
  }
  e.target.value = ''  // 清空以便重复选同一文件
}

async function onSave() {
  try {
    // 特征数组拼成字符串存储
    const payload = { ...form.value, features: selectedFeatures.value.join('/') }
    if (payload.generation === null) delete payload.generation

    let savedId
    if (isNew.value) {
      savedId = await createRelative(payload)
    } else {
      await updateRelative(id, payload)
      savedId = id
    }

    // 保存 pendingPhotos，主图按用户选择
    const { listPhotosByRelative, setPrimary } = await import('../db/photos-dao.js')
    for (const p of pendingPhotos.value) {
      await addPhoto({
        relativeId: savedId,
        blob: p.blob,
        thumbnail: p.thumbnail,
        sticker: p.sticker || null,
        source: p.source,
        textDesc: p.textDesc || '',
        isPrimary: false
      })
    }
    // 按用户选择的主图设置
    const primaryIdx = pendingPhotos.value.findIndex((p) => p.isPrimary)
    if (primaryIdx >= 0) {
      const photos = await listPhotosByRelative(savedId)
      if (photos[primaryIdx]) {
        await setPrimary(savedId, photos[primaryIdx].id)
      }
    }

    showSuccessToast('已保存')
    router.replace(`/relative/${savedId}`)
  } catch (err) {
    showFailToast(err.message || '保存失败')
    console.error(err)
  }
}

function onDelete() {
  showDelete.value = true
}

async function confirmDelete() {
  try {
    await confirmDeleteByName(id, deleteInput.value)
    showSuccessToast('已删除')
    router.replace('/')
  } catch (err) {
    showFailToast(err.message || '删除失败')
  }
}

async function load() {
  // 新建模式 + URL 带姓名预填
  if (route.query.name) {
    form.value.name = String(route.query.name)
  }
  if (route.query.confirmDelete) {
    showDelete.value = true
  }
  if (!isNew.value) {
    const r = await getRelative(id)
    if (r) {
      form.value = { ...form.value, ...r }
      // features 字符串拆成数组（编辑时回填勾选状态）
      selectedFeatures.value = r.features ? r.features.split('/').filter(Boolean) : []
    }
    // 加载已有照片到 pendingPhotos
    const { listPhotosByRelative } = await import('../db/photos-dao.js')
    const existingPhotos = await listPhotosByRelative(id)
    pendingPhotos.value = existingPhotos.map((p) => ({
      source: p.source,
      textDesc: p.textDesc,
      blob: p.blob || null,
      thumbnail: p.thumbnail || null,
      thumbUrl: p.thumbnail ? URL.createObjectURL(p.thumbnail) : null,
      sticker: p.sticker || null,
      stickerUrl: p.sticker ? URL.createObjectURL(p.sticker) : null,
      detecting: false,
      isPrimary: p.isPrimary,
      photoId: p.id
    }))
  }
  // 异步加载下拉选项（父/配偶/分支）
  await loadPickerColumns()
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #f7f8fa; padding-bottom: 80px; }

.photo-section { padding: 8px 16px; }
.photo-label { font-size: 14px; color: #646566; margin-bottom: 8px; }
.photo-section .van-button { margin-right: 8px; margin-bottom: 8px; }
.pending-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.pending-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: #f7f8fa; padding: 4px; border-radius: 4px;
}
.pending-item.is-primary .pending-thumb {
  border: 3px solid #ff976a;
  box-shadow: 0 0 8px rgba(255,151,106,0.5);
}
.pending-thumb { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; }
.pending-text { font-size: 12px; color: #646566; padding: 4px 8px; }
.thumb-wrap { position: relative; display: inline-block; }
.sticker-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  cursor: pointer;
}
.sticker-badge.detecting {
  background: #f2f3f5;
}
.photo-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.save-bar { padding: 16px; position: sticky; bottom: 0; background: #fff; }

/* 特征勾选区 */
.features-section { padding: 8px 16px; }
.features-label { font-size: 14px; color: #646566; margin-bottom: 8px; }
.feature-cat { margin-bottom: 12px; }
.cat-title { font-size: 12px; color: #969799; margin-bottom: 6px; }
.tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
.feature-tag { cursor: pointer; user-select: none; }
.selected-summary { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding: 8px; background: #f7f8fa; border-radius: 4px; }

</style>

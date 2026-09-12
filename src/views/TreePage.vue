<template>
  <div class="page">
    <van-nav-bar title="家族树" left-arrow @click-left="goBack" />

    <!-- 孤立节点提示：没有父亲/配偶/子女的亲戚无法在树上形成关系 -->
    <div v-if="orphans.length > 0" class="orphan-tip">
      {{ orphans.length }} 位亲戚还没关联关系（{{ orphans.map(o => o.name).join('、') }}），
      进入编辑页设置「父亲/配偶」后即可在树上显示父子关系
    </div>

    <div v-if="grouped.length === 0">
      <van-empty description="还没有亲戚，去添加" >
        <van-button type="primary" round block to="/relative/new">添加亲戚</van-button>
      </van-empty>
    </div>

    <div v-else class="tree-body">
      <div v-for="group in grouped" :key="group.branch" class="branch-group">
        <van-divider>{{ group.branch }}</van-divider>

        <!-- 按辈分层 -->
        <div v-for="gen in group.generations" :key="gen.generation" class="gen-section">
          <div class="gen-title">{{ gen.title }}</div>
          <div v-for="root in gen.roots" :key="root.id">
            <!-- 关键：传全量亲戚（all），TreeNode 递归找孩子时不受分支限制，跨分支父子也能正确挂树 -->
            <tree-node :node="root" :all-relatives="all" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { listRelatives } from '../db/relatives-dao.js'
import { safeBack } from '../router/index.js'
import TreeNode from '../components/TreeNode.vue'

const router = useRouter()
const goBack = () => safeBack(router)

const GEN_NAMES = { 0: '未设辈分', 1: '祖辈', 2: '父辈', 3: '同辈', 4: '晚辈', 5: '孙辈' }

const all = ref([])

// 孤立节点：无父亲、无配偶、无子女——树上表现为一个孤立名字
const orphans = computed(() =>
  all.value.filter((r) => !r.parentId && !r.spouseId && !all.value.some((x) => x.parentId === r.id))
)

// 按 branch 分组，组内按 generation 分层
const grouped = computed(() => {
  const branches = {}
  all.value.forEach((r) => {
    // 注意：不改动源数据 r.branch（避免副作用），用局部变量
    const b = r.branch || '其他亲戚'
    if (!branches[b]) branches[b] = []
    branches[b].push(r)
  })

  // 父节点是否在未软删数据中存在（父被软删/不存在 → 该节点提升为根）
  const parentExists = (m) => m.parentId && all.value.some((x) => x.id === m.parentId)

  return Object.entries(branches).map(([branch, members]) => {
    // 按辈分聚合；未填辈分(generation null/undefined)归入 0 = "未设辈分"，避免 NaN 排序错乱
    const gens = {}
    members.forEach((m) => {
      const g = m.generation ?? 0
      if (!gens[g]) gens[g] = []
      gens[g].push(m)
    })

    const generations = Object.keys(gens)
      .map(Number)
      .sort((a, b) => a - b)
      .map((g) => ({
        generation: g,
        title: GEN_NAMES[g] || `${g}辈`,
        // 根节点：没有父亲，或父亲已不在数据中
        // 有父亲（哪怕父亲在其他分支）→ 不做根，跟随父亲递归显示，保证父子关系不断裂
        roots: gens[g].filter((m) => !parentExists(m))
      }))

    return { branch, members, generations }
  })
})

async function load() {
  all.value = await listRelatives()
}

onMounted(load)
</script>

<style scoped>
.page { min-height: 100vh; background: #fff; }
.orphan-tip {
  margin: 10px 16px 0;
  padding: 8px 12px;
  font-size: 13px;
  color: #ff976a;
  background: #fff7f0;
  border-radius: 6px;
  line-height: 1.6;
}
.tree-body { padding: 16px; }
.branch-group { margin-bottom: 16px; }
.gen-section { margin-left: 8px; margin-bottom: 12px; }
.gen-title { font-size: 13px; color: #969799; font-weight: 600; margin-bottom: 6px; }
</style>

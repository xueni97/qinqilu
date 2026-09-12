<template>
  <div class="page">
    <van-nav-bar title="家族树" left-arrow @click-left="goBack" />

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
            <tree-node :node="root" :all-relatives="group.members" />
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

const GEN_NAMES = { 1: '祖辈', 2: '父辈', 3: '同辈', 4: '晚辈', 5: '孙辈' }

const all = ref([])

// 按 branch 分组，组内按 generation 分层
const grouped = computed(() => {
  const branches = {}
  all.value.forEach((r) => {
    if (!r.branch) r.branch = '其他亲戚'
    if (!branches[r.branch]) branches[r.branch] = []
    branches[r.branch].push(r)
  })

  return Object.entries(branches).map(([branch, members]) => {
    // 按辈分聚合
    const gens = {}
    members.forEach((m) => {
      if (!gens[m.generation]) gens[m.generation] = []
      gens[m.generation].push(m)
    })

    const generations = Object.keys(gens)
      .map(Number)
      .sort((a, b) => a - b)
      .map((g) => ({
        generation: g,
        title: GEN_NAMES[g] || `${g}辈`,
        // 每辈的根节点：parentId=null 或父不在该辈分组内
        roots: gens[g].filter((m) => !m.parentId || !members.find((x) => x.id === m.parentId))
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
.tree-body { padding: 16px; }
.branch-group { margin-bottom: 16px; }
.gen-section { margin-left: 8px; margin-bottom: 12px; }
.gen-title { font-size: 13px; color: #969799; font-weight: 600; margin-bottom: 6px; }
</style>

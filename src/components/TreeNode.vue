<template>
  <div class="tree-node">
    <div class="node-row" :style="{ marginLeft: depth * 20 + 'px' }">
      <span class="prefix">{{ prefix }}</span>
      <span class="node-name" @click="goDetail(node.id)">{{ node.name }}</span>
      <van-tag v-if="isSpouseFromOtherBranch" type="primary" size="mini" plain>嫁入</van-tag>
      <van-tag v-else-if="node.relationship" type="default" size="mini" plain>{{ node.relationship }}</van-tag>
    </div>
    <component
      :is="$options.name"
      v-for="child in children"
      :key="child.id"
      :node="child"
      :depth="depth + 1"
      :all-relatives="allRelatives"
    />
  </div>
</template>

<script>
// 递归组件：通过 name 自引用
export default {
  name: 'TreeNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, default: 0 },
    allRelatives: { type: Array, default: () => [] }
  },
  computed: {
    children() {
      return this.allRelatives.filter((r) => r.parentId === this.node.id)
    },
    prefix() {
      return this.depth === 0 ? '' : '├─ '
    },
    isSpouseFromOtherBranch() {
      if (!this.node.spouseId) return false
      const spouse = this.allRelatives.find((r) => r.id === this.node.spouseId)
      return !!spouse && spouse.branch !== this.node.branch
    }
  },
  methods: {
    goDetail(id) {
      this.$router.push(`/relative/${id}`)
    }
  }
}
</script>

<style scoped>
.tree-node { font-size: 14px; line-height: 1.8; }
.node-row { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.prefix { color: #c8c9cc; }
.node-name { color: #1989fa; cursor: pointer; }
.node-name:hover { text-decoration: underline; }
</style>

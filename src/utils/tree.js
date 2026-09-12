// 树结构校验工具
// 设计文档 5.3 节：
// - 编辑 parentId 时校验：不能设为自己、不能设为自己的子孙
// - 沿 parentId 向上递归，遇到当前 id 即拒绝

// isTreeValid(parentId, id, db) — 校验把 id 的 parentId 设为 parentId 是否合法
// 规则：
//   1. parentId === null —— 合法（孤立节点）
//   2. parentId === id —— 非法（自引用）
//   3. 从 parentId 沿 parentId 向上递归，如果遇到 id —— 非法（成环）
//   4. 其他情况 —— 合法
export async function isTreeValid(parentId, id, db) {
  if (parentId === null || parentId === undefined) return true
  if (parentId === id) return false

  // 沿 parentId 向上找祖先
  let current = parentId
  const visited = new Set()  // 防御性：防止数据库里已存在的环
  while (current !== null && current !== undefined && !visited.has(current)) {
    if (current === id) return false
    visited.add(current)
    const node = await db.relatives.get(current)
    if (!node) break  // 父节点不存在——视为合法（让调用方处理）
    current = node.parentId
  }
  return true
}

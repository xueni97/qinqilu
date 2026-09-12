// 亲戚列表排序工具
// 设计文档 4.3 节：
// - 默认排序：lastMetAt ASC NULLS FIRST——最久没见的排最前
// - 相同日期稳定排序（保留原数组顺序）

export function sortRelativesByLastMet(list) {
  // 复制一份，避免修改原数组
  const copy = [...list]
  // stable：Array.prototype.sort 在现代JS引擎中已是稳定的
  copy.sort((a, b) => {
    // null/undefined 排最前——"从未见过"最需要查
    const aTime = a.lastMetAt
    const bTime = b.lastMetAt

    if (!aTime && !bTime) return 0
    if (!aTime) return -1
    if (!bTime) return 1

    // 字符串日期 YYYY-MM-DD 可直接字符串比较
    if (aTime < bTime) return -1
    if (aTime > bTime) return 1
    return 0
  })
  return copy
}

// 配偶双向同步工具
// 设计文档 5.3 节：
// - A.spouseId = B 后，自动设置 B.spouseId = A
// - 解除时双向同时清空

// syncSpouse(aId, bId, db) — 把 aId 的配偶设为 bId，并自动把 bId 的配偶设为 aId
// 传 bId = null 表示解除 aId 的配偶关系，双向同时清空
export async function syncSpouse(aId, bId, db) {
  if (aId === null || aId === undefined) {
    throw new Error('syncSpouse: aId 不能为空')
  }

  // 先读 a 当前的配偶，待会儿要解除那一侧的回指
  const a = await db.relatives.get(aId)
  if (!a) throw new Error(`syncSpouse: 找不到亲戚 id=${aId}`)

  const oldSpouseId = a.spouseId

  // 解除场景：bId 为 null——双向清空
  if (bId === null || bId === undefined) {
    if (oldSpouseId !== null && oldSpouseId !== undefined) {
      // 双向清空：a 的旧配偶也要清掉对 a 的回指
      await db.relatives.update(oldSpouseId, { spouseId: null })
    }
    await db.relatives.update(aId, { spouseId: null })
    return
  }

  // 设置场景：aId ↔ bId
  // 1. 解除 a 旧配偶对 a 的回指
  if (oldSpouseId !== null && oldSpouseId !== undefined && oldSpouseId !== bId) {
    await db.relatives.update(oldSpouseId, { spouseId: null })
  }

  // 2. 解除 b 旧配偶对 b 的回指（避免遗留回指到别人）
  const b = await db.relatives.get(bId)
  if (!b) throw new Error(`syncSpouse: 找不到亲戚 id=${bId}`)
  if (b.spouseId !== null && b.spouseId !== undefined && b.spouseId !== aId) {
    const oldPartnerOfB = await db.relatives.get(b.spouseId)
    if (oldPartnerOfB) {
      await db.relatives.update(b.spouseId, { spouseId: null })
    }
  }

  // 3. 双向设置
  await db.relatives.update(aId, { spouseId: bId })
  await db.relatives.update(bId, { spouseId: aId })
}

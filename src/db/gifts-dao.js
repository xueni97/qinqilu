// 礼金 DAO
// 设计文档 3.3 节：gifts 表
// direction: "out"=给出去 / "in"=收进来
import { db } from './index.js'

// 添加礼金记录
// status: "done"=已发生 / "pending"=待发生（未来宴请/婚礼等）
export async function addGift({ relativeId, direction, amount, occasion, date, note, status = 'done' }) {
  return db.gifts.add({
    relativeId,
    direction,
    amount: Number(amount) || 0,
    occasion: occasion || '',
    date: date || new Date().toISOString().slice(0, 10),
    note: note || '',
    status: status || 'done',
    deleted: false
  })
}

// 更新礼金（可把 pending 标记为 done）
export async function updateGift(giftId, patch) {
  return db.gifts.update(giftId, patch)
}

// 列出某亲戚的礼金记录（按日期倒序）
export async function listGiftsByRelative(relativeId) {
  const all = await db.gifts.where('relativeId').equals(relativeId).toArray()
  return all
    .filter((g) => !g.deleted)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

// 列出所有礼金（按日期倒序），可选方向筛选
export async function listAllGifts(direction = null) {
  let all = await db.gifts.toArray()
  all = all.filter((g) => !g.deleted)
  if (direction) {
    all = all.filter((g) => g.direction === direction)
  }
  return all.sort((a, b) => (a.date < b.date ? 1 : -1))
}

// 统计：给出去总额 / 收进来总额 / 净额
export async function getGiftStats() {
  const all = await db.gifts.toArray()
  const valid = all.filter((g) => !g.deleted)
  const out = valid.filter((g) => g.direction === 'out').reduce((s, g) => s + g.amount, 0)
  const inn = valid.filter((g) => g.direction === 'in').reduce((s, g) => s + g.amount, 0)
  return { out, in: inn, net: inn - out, count: valid.length }
}

// 查询未来N天内的待办礼金（status=pending 且 date 在未来N天内）
// 用于首页大事提醒
export async function listUpcomingGifts(days = 30) {
  const today = new Date().toISOString().slice(0, 10)
  const limit = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
  const all = await db.gifts.toArray()
  return all
    .filter((g) => !g.deleted && g.status === 'pending' && g.date >= today && g.date <= limit)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
}

// 删除礼金（软删）
export async function deleteGift(giftId) {
  return db.gifts.update(giftId, { deleted: true })
}

// 按亲戚统计礼金（用于礼金页按人分组）
export async function getGiftsByRelative() {
  const all = await db.gifts.toArray()
  const valid = all.filter((g) => !g.deleted)
  const map = {}
  for (const g of valid) {
    if (!map[g.relativeId]) {
      map[g.relativeId] = { relativeId: g.relativeId, out: 0, in: 0, count: 0, lastDate: '' }
    }
    const m = map[g.relativeId]
    if (g.direction === 'out') m.out += g.amount
    else m.in += g.amount
    m.count += 1
    if (g.date > m.lastDate) m.lastDate = g.date
  }
  return Object.values(map).sort((a, b) => (a.lastDate < b.lastDate ? 1 : -1))
}

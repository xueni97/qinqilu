// 亲戚主档 DAO
// 封装 Dexie 操作，视图层只调本文件，不直接操作 db
// 设计文档 5.1 节：软删除机制；5.3 节：树校验；4.3 节：列表查询/筛选/排序

import { db } from './index.js'
import { isTreeValid } from '../utils/tree.js'
import { syncSpouse } from './relatives.js'
import { sortRelativesByLastMet } from '../utils/sort.js'
import { sortByDistance } from '../utils/geo.js'

// 软删除时长：30天后真清理
const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

// 列表查询：默认排除软删，按 lastMetAt 排序，支持搜索/辈分筛选
// myLat/myLng 传入时：改为按距离排序（首页附近亲戚）
export async function listRelatives({ keyword = '', generation = null, myLat = null, myLng = null } = {}) {
  let arr = await db.relatives.toArray()
  arr = arr.filter((r) => !r.deleted)

  if (generation) {
    arr = arr.filter((r) => r.generation === generation)
  }

  if (keyword) {
    const k = keyword.toLowerCase()
    arr = arr.filter((r) =>
      (r.name && r.name.toLowerCase().includes(k)) ||
      (r.relationship && r.relationship.toLowerCase().includes(k)) ||
      (r.features && r.features.toLowerCase().includes(k)) ||
      (r.branch && r.branch.toLowerCase().includes(k))
    )
  }

  // 有定位坐标 → 按距离排序；否则按上次见面时间排序
  if (myLat != null && myLng != null) {
    return sortByDistance(arr, myLat, myLng)
  }
  return sortRelativesByLastMet(arr)
}

// 查单个
export async function getRelative(id) {
  return db.relatives.get(id)
}

// 重名校验：同一份亲戚名单里不允许同名（trim 后全等比较）
// excludeId：编辑时排除自己；返回重复的亲戚记录，无重复返回 null
export async function findDuplicateByName(name, excludeId = null) {
  const n = (name || '').trim()
  if (!n) return null
  const all = await db.relatives.toArray()
  return all.find((r) => !r.deleted && r.id !== excludeId && (r.name || '').trim() === n) || null
}

// 创建（含重名校验）
export async function createRelative(data) {
  const dup = await findDuplicateByName(data.name)
  if (dup) throw new Error(`已存在同名亲戚「${dup.name}」，不能重复添加`)
  const now = Date.now()
  const id = await db.relatives.add({
    ...data,
    deleted: false,
    createdAt: now,
    updatedAt: now
  })
  return id
}

// 更新（含重名校验 + 树校验 + 辈分校验 + 配偶双向同步）
export async function updateRelative(id, patch) {
  const current = await db.relatives.get(id)
  if (!current) throw new Error(`亲戚不存在: id=${id}`)

  // 重名校验：改名时不能和别的亲戚重名
  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    const dup = await findDuplicateByName(patch.name, id)
    if (dup) throw new Error(`已存在同名亲戚「${dup.name}」，不能重复添加`)
  }

  // 树校验：parentId 改了要校验
  const effectiveParentId = Object.prototype.hasOwnProperty.call(patch, 'parentId')
    ? patch.parentId
    : current.parentId
  if (effectiveParentId !== null && effectiveParentId !== undefined) {
    const ok = await isTreeValid(effectiveParentId, id, db)
    if (!ok) throw new Error('parentId 非法：会成环或自引用')
  }

  // 辈分倒挂校验：只要 effectiveParentId 有值就校验
  if (effectiveParentId !== null && effectiveParentId !== undefined) {
    const parent = await db.relatives.get(effectiveParentId)
    const myGen = Object.prototype.hasOwnProperty.call(patch, 'generation')
      ? patch.generation
      : current.generation
    if (parent && myGen !== undefined && parent.generation >= myGen) {
      throw new Error(`辈分倒挂：父辈分(${parent.generation}) 必须 < 子辈分(${myGen})`)
    }
  }

  await db.relatives.update(id, { ...patch, updatedAt: Date.now() })

  // 配偶同步
  if (Object.prototype.hasOwnProperty.call(patch, 'spouseId')) {
    await syncSpouse(id, patch.spouseId, db)
  }
}

// 软删除（含关联照片/礼金/visit）
export async function softDeleteRelative(id) {
  const now = Date.now()
  await db.relatives.update(id, { deleted: true, deletedAt: now, updatedAt: now })
  await db.photos.where('relativeId').equals(id).modify({ deleted: true })
  await db.gifts.where('relativeId').equals(id).modify({ deleted: true })
  // visits 不软删——历史见面记录保留
}

// 恢复软删
export async function restoreRelative(id) {
  await db.relatives.update(id, { deleted: false, deletedAt: null, updatedAt: Date.now() })
}

// 真清理：30天前的软删记录
export async function purgeOldDeleted() {
  const threshold = Date.now() - SOFT_DELETE_RETENTION_MS
  const old = await db.relatives.where('deleted').equals(1).toArray()
  const toDelete = old.filter((r) => r.deletedAt && r.deletedAt < threshold)
  await db.relatives.bulkDelete(toDelete.map((r) => r.id))
  return toDelete.length
}

// 按姓名确认删除（设计5.1节：必须输入姓名确认）
export async function confirmDeleteByName(id, inputName) {
  const r = await db.relatives.get(id)
  if (!r) throw new Error('亲戚不存在')
  if (r.name !== inputName) {
    throw new Error('输入的姓名与亲戚姓名不匹配')
  }
  await softDeleteRelative(id)
}

// 关联查询：子女（parentId = id）
export async function getChildren(id) {
  const all = await db.relatives.toArray()
  return all.filter((r) => r.parentId === id && !r.deleted)
}

// 关联查询：配偶
export async function getSpouse(id) {
  const r = await db.relatives.get(id)
  if (!r || !r.spouseId) return null
  return db.relatives.get(r.spouseId)
}

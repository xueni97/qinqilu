import Dexie from 'dexie'

// 亲戚记忆APP 数据层
// schema 对应设计文档 3.5 节
// 索引字段：用于查询/筛选/排序的字段
class RelativesDB extends Dexie {
  constructor() {
    super('relatives-memory')

    this.version(1).stores({
      // 亲戚主档：name/branch/generation 用于筛选，parentId/spouseId 用于树结构
      // lastMetAt 用于"最久没见"排序，deleted 用于软删除过滤
      relatives: '++id, name, branch, generation, parentId, spouseId, lastMetAt, deleted',

      // 照片独立存表：避免主档随照片变化膨胀
      // relativeId 用于按亲戚查询照片，isPrimary 用于查主图
      photos: '++id, relativeId, isPrimary',

      // 礼金流水：relativeId 关联亲戚，date 用于按日期排序，direction 用于出/入筛选
      gifts: '++id, relativeId, date, direction, deleted',

      // 见面/拜年记录：relativeId 关联亲戚，type 区分拜年/普通见面
      // done 用于阶段3拜年路线规划，sequence 用于路线顺序
      visits: '++id, relativeId, type, date, done'
    })

    // v2: 给 relatives 表加 lat/lng 字段（地理定位功能）
    // 原数据无这俩字段，升级时不动（查出来 lat/lng 为 undefined，视为无坐标）
    this.version(2).stores({
      relatives: '++id, name, branch, generation, parentId, spouseId, lastMetAt, deleted',
      photos: '++id, relativeId, isPrimary',
      gifts: '++id, relativeId, date, direction, deleted',
      visits: '++id, relativeId, type, date, done'
      // 注：Dexie 加字段不需要在 schema 声明，只索引需要的字段
      // lat/lng 不参与索引（筛选场景用不到），随记录存即可
    })
  }
}

// 单例：全应用共享一个 db 实例
export const db = new RelativesDB()
export default db

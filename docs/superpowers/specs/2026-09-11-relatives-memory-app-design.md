# 亲戚记忆APP 设计文档

- 日期：2026-09-11
- 状态：已确认设计，待写入实现计划
- 项目根目录：`c:\SVN\Seq\relatives-memory-app\`

## 1. 背景与目标

### 1.1 问题陈述

很多亲戚一年只见一次面（如春节聚会），过完年就忘记对方姓名、长相、家庭情况。需要一个能在聚会现场快速查询、平时安静整理、记录交往历史与礼金的工具。

### 1.2 用户与场景

- 唯一使用者：作者本人
- 核心场景：**现场快速查询**（打开APP即可查到某亲戚的姓名/关系/外貌/家庭）
- 次要场景：平时录入整理、破冰找话题、礼金记录、拜年规划

### 1.3 约束

- 无服务器、无云账号：仅有本地电脑+网络
- 仅本人使用：不需要多用户/同步/账号机制
- 数据隐私敏感：亲戚资料不上云
- 个人项目：避免过度工程，注重可用性

## 2. 整体架构

### 2.1 形态与技术路线

**形态**：PWA（渐进式Web应用）+ 本地存储

- 浏览器"添加到主屏幕"后像原生APP一样运行
- 支持离线使用、可调相机
- 无需上架/审核/分发，写完直接用
- 后续若需更强原生能力可平滑升级到 Capacitor

**技术栈**

- Vue 3 + Vite（构建工具）
- Vant 4（移动端UI组件库）
- Vue Router（hash 模式，PWA 友好）
- Dexie.js（IndexedDB 封装）
- vue-plugin-pwa（service-worker 自动生成）
- Vitest + Vue Test Utils + fake-indexeddb（测试）

### 2.2 分阶段交付

考虑到选了"全部"功能但属于个人项目，分3阶段交付，每阶段独立可用。

**阶段1（MVP，核心记忆档案）**
- 亲戚列表（主入口，搜索/筛选）
- 亲戚详情页（4区块折叠展示：身份/外貌/家庭/交往）
- 层级树状视图
- 录入/编辑表单（含照片多源录入）
- 导出/导入 JSON 备份

**阶段2（礼金与提醒）**
- 礼金往来记录
- 生日/祭日提醒
- 拜年倒数

**阶段3（拜年规划）**
- 拜年路线规划
- 聚会现场速记

### 2.3 架构图

```
┌──────────────────────────────────────────────┐
│  PWA Shell (Vite + vue-plugin-pwa)            │
│  ├─ manifest.json（添加到主屏幕图标）         │
│  └─ service-worker（离线缓存+资源预缓存）    │
├──────────────────────────────────────────────┤
│  Vue 3 应用层                                 │
│  ├─ 页面：列表 / 详情 / 树状 / 编辑 / 提醒    │
│  └─ 路由：Vue Router（hash 模式，PWA友好）    │
├──────────────────────────────────────────────┤
│  数据层：Dexie.js (IndexedDB)                │
│  ├─ relatives 表（亲戚主档）                 │
│  ├─ photos 表（照片 Blob 独立存，主表引用ID）│
│  ├─ gifts 表（礼金流水）                     │
│  └─ visits 表（见面/拜年记录）                │
└──────────────────────────────────────────────┘
```

### 2.4 关键设计决策

1. **照片单独存表**：主档只存 photoId，避免主档记录随照片变化膨胀
2. **路由 hash 模式**：`#/relative/123`，兼容 PWA 在 file:// 或本地部署
3. **数据完全本地**：符合"无服务器"约束，换机走导出/导入
4. **分阶段交付**：避免一次性铺太大做不完

## 3. 数据模型

### 3.1 表 relatives（亲戚主档）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | auto | 主键 |
| name | string | 姓名 |
| gender | string | 男/女 |
| birthDate | string | 生日（公历，YYYY-MM-DD） |
| birthYearOnly | bool | 只知年份不知月日时为 true |
| isLunar | bool | 生日是否农历（农历需提醒时按当年转公历） |
| generation | number | 辈分代号（1=祖辈，2=父辈，3=同辈，4=晚辈，5=孙辈） |
| relationship | string | 与我的关系（如"姑父""表姐""舅舅"） |
| branch | string | 家族分支（如"外婆家""大爷家""姑家"），用于树状分组 |
| parentId | number\|null | 父节点ID（树状结构用） |
| spouseId | number\|null | 配偶ID（双向引用） |
| height | string | 身高（如"175cm"，可选） |
| features | string | 显著特征（如"白发/瘦高/戴眼镜/左手疤"），现场认人关键 |
| occupation | string | 职业 |
| workplace | string | 工作单位 |
| address | string | 住址 |
| phone | string | 电话（可选） |
| wechat | string | 微信号（可选） |
| familyNote | string | 家庭情况备注 |
| photoId | number\|null | 主照片ID（指向 photos 表） |
| lastMetAt | string | 上次见面日期 |
| lastMetEvent | string | 上次见面场合 |
| lastMetNote | string | 上次见面聊到的关键事/嘱托 |
| deleted | bool | 软删除标记，默认 false |
| deletedAt | number\|null | 软删除时间戳，30天后真清理 |
| createdAt | number | 创建时间戳 |
| updatedAt | number | 更新时间戳 |

### 3.2 表 photos（照片独立存储）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | auto | 主键 |
| relativeId | number | 所属亲戚ID |
| blob | Blob | 实际图片二进制 |
| thumbnail | Blob | 缩略图（列表用，避免大图卡顿） |
| source | string | "album"/"camera"/"text"（文字描述时无 blob） |
| textDesc | string | 文字描述（source=text 时填） |
| isPrimary | bool | 是否主照片 |
| takenAt | string | 拍摄/录入日期 |

### 3.3 表 gifts（礼金流水）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | auto | 主键 |
| relativeId | number | 关联亲戚 |
| direction | string | "out"（给出去）/ "in"（收进来） |
| amount | number | 金额 |
| occasion | string | 事由（如"春节""婚礼""满月""丧事"） |
| date | string | 日期 |
| note | string | 备注 |
| deleted | bool | 软删除标记 |

### 3.4 表 visits（拜年/见面记录）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | auto | 主键 |
| relativeId | number | 关联亲戚 |
| type | string | "bainian"（拜年）/"meeting"（其他见面） |
| date | string | 日期 |
| location | string | 地点 |
| done | bool | 拜年是否已完成（阶段3路线规划用） |
| sequence | number | 路线顺序（阶段3用） |
| note | string | 速记内容（现场补记的临场信息） |

### 3.5 Dexie.js Schema

```js
import Dexie from 'dexie'

class RelativesDB extends Dexie {
  constructor() {
    super('relatives-memory')
    this.version(1).stores({
      relatives: '++id, name, branch, generation, parentId, spouseId, lastMetAt, deleted',
      photos: '++id, relativeId, isPrimary',
      gifts: '++id, relativeId, date, direction, deleted',
      visits: '++id, relativeId, type, date, done'
    })
  }
}
```

### 3.6 备份导出格式

```json
{
  "version": 1,
  "exportedAt": "2026-09-11T15:42:00Z",
  "relatives": [
    {"id":1, "name":"张大爷", "gender":"男", "generation":2, "branch":"姑家", "photoId":1}
  ],
  "photos": [
    {"id":1, "relativeId":1, "source":"album", "blob":"<base64>", "thumbnail":"<base64>"}
  ],
  "gifts": [
    {"id":1, "relativeId":1, "direction":"out", "amount":500, "occasion":"春节", "date":"2026-02-10"}
  ],
  "visits": [
    {"id":1, "relativeId":1, "type":"bainian", "date":"2026-02-10", "done":true}
  ]
}
```

Blob 导出为 base64 字符串，导入时反向解码。走文件下载/上传，无需服务器。

## 4. 页面与交互流程

### 4.1 页面清单

**阶段1（MVP）5个页面**
1. 列表页（主入口 `/`）
2. 详情页 `/relative/:id`
3. 编辑表单 `/relative/:id/edit`（含新建 `/relative/new`）
4. 树状视图 `/tree`
5. 备份页 `/backup`（导出/导入，导入前自动生成 `backup-YYYYMMDD.json` 保护当前数据）

**阶段2 加2页面**
6. 礼金记录 `/gifts`（流水列表 + 录入）
7. 提醒中心 `/reminders`（生日/拜年倒数）

**阶段3 加1页面**
8. 拜年路线 `/bainian-plan`

### 4.2 主流程（现场查询场景）

```
打开APP
  ↓
列表页（默认按"上次见面时间倒序"——最久没见的排最前）
  ↓ 输入搜索词 / 选辈分筛选
  ↓
点击某人 → 详情页
  ↓
看到4大区块（折叠式）：
  · 顶部照片大图 + 姓名/关系/辈分
  · 基本身份（性别/生日/电话/微信）
  · 外貌特征（features + 副照片相册）
  · 家庭详情（配偶/子女/职业/住址/familyNote）
  · 交往记录（lastMet* 三字段 + 历史visits）
  ↓
要拨电话 → 点 phone 一键拨号
要加新见面 → 详情页内"记一笔见面"按钮
```

### 4.3 列表页布局

```
┌─────────────────────────────┐
│ 亲戚录              [☰菜单] │  顶部
├─────────────────────────────┤
│ [🔍 搜索姓名/关系/特征]      │  搜索框
│ [全部][祖辈][父辈][同辈][晚辈]│  辈分筛选Tab
├─────────────────────────────┤
│ ◯ 张大爷 · 姑父 · 父辈      │  列表项
│   白发/瘦高/眼镜｜上次2026.2 │
├─────────────────────────────┤
│ ◯ 李伯伯 · 舅舅 · 父辈      │  最久没见的高亮提示
│   光头/微胖｜上次2025.10    │
├─────────────────────────────┤
│      [+] 添加亲戚            │  浮动按钮
└─────────────────────────────┘
```

**关键设计**
- 默认排序：`lastMetAt ASC NULLS FIRST`——最久没见的排最前
- 列表项缩略图用 thumbnail
- 筛选用 Vant Tabs，搜索用 Vant Search
- 浮动按钮用 Vant Fab，位置在右下

### 4.4 详情页布局

```
┌─────────────────────────────┐
│ ← [⋮]                       │  返回 + 菜单(编辑/删除)
├─────────────────────────────┤
│   ┌─────┐                   │
│   │照片 │  张大爷            │  大头像 + 姓名
│   └─────┘  姑父 · 父辈 · 68岁│
├─────────────────────────────┤
│ 📞 138-xxxx-1234  [复制/拨号]│
│ 💬 wechat_xxx     [复制]    │
├─────────────────────────────┤
│ ▼ 基本身份                   │  折叠区块
│   生日：1958-03-15          │
│   分支：姑家                │
├─────────────────────────────┤
│ ▼ 外貌特征                   │
│   白发/瘦高/戴眼镜/左手疤   │
│   [相册 3张]                │
├─────────────────────────────┤
│ ▼ 家庭详情                   │
│   配偶：李婶（点击跳转）     │  spouseId 可跳转
│   子女：张小明（点击跳转）   │
│   职业：退休教师            │
│   住址：济南xx              │
│   家庭备注：去年儿子结婚     │
├─────────────────────────────┤
│ ▼ 交往记录                   │
│   上次见面：2026-02-10       │
│   场合：春节聚餐            │
│   关键事：聊起他儿子工作     │
│   [记一笔见面] [看历史]      │
└─────────────────────────────┘
```

### 4.5 树状视图

```
祖辈
├─ 爷爷（父之父）
└─ 奶奶（父之母）
父辈
├─ 父
│  └─ 我
├─ 大爷（父之兄）
│  ├─ 大堂兄
│  └─ 二堂姐
├─ 姑妈（父之妹）
│  └─ 张大爷（姑父，嫁入）   ← 跨branch标注
│     ├─ 表哥
│     └─ 表妹
└─ 舅舅（母之兄）
   └─ 表姐
```

**实现方式**：根据 `branch` 分组、`generation` 分层、`parentId` 连父子、`spouseId` 标配偶。点击节点跳详情页。

**关键决策**
- 配偶在树里"嫁入"显示——张大爷（姑家分支）显示在姑妈节点下，标注"姑父(嫁入)"
- 用 Vant Collapse + 递归组件渲染，避免引入第三方树组件
- 没有 parentId 的孤立节点（如远房亲戚）单列"其他亲戚"组

### 4.6 编辑表单

分4段折叠录入：基础身份 / 外貌 / 家庭 / 交往，与详情页4区块一一对应。照片录入用 Vant Uploader 三选一弹窗：
- 从相册选（input[type=file]）
- 现场拍（input capture="user"）
- 文字描述（弹输入框）

## 5. 错误处理与边界情况

### 5.1 数据安全（最高优先级）

**IndexedDB 空间超限**
- 照片压缩到 1024px 宽 + JPEG 0.7 质量；thumbnail 约 5KB，原图约 100-300KB
- 假设300人×3张≈270MB——临界值
- catch QuotaExceededError 时弹窗提示导出，不静默失败

**误删亲戚**
- 详情页删除按钮 → 弹确认框 + 必须输入姓名确认
- 软删除机制：`deleted = true`，列表过滤掉，30天后真正清理
- 删除亲戚时关联照片/礼金/visit记录一并软删

**导出备份的完整性**
- 导出JSON时校验：必须包含 relatives/photos/gifts/visits 四表全部数据
- 导出后自动校验文件大小（<10KB 警告"可能未完整导出"）
- 导入前先备份当前数据为 `backup-YYYYMMDD.json`，再导入新数据

### 5.2 PWA 离线场景

**首次加载后离线**
- service-worker 预缓存所有静态资源
- 数据走 IndexedDB，本身离线可用

**service-worker 更新**
- 用 `vue-plugin-pwa` 的 autoUpdate 模式
- 新版本部署后，下次打开自动更新，提示"已更新到新版本"

### 5.3 数据模型边界

**树状结构的环引用**
- 编辑 parentId 时校验：不能设为自己、不能设为自己的子孙
- 校验逻辑：沿 parentId 向上递归，遇到当前 id 即拒绝

**配偶双向引用**
- A.spouseId = B 后，自动设置 B.spouseId = A
- 解除时双向同时清空

**辈分倒挂**
- 保存时校验：父节点的 generation 必须 < 子节点

**跨辈数据**
- branch 字段必填，避免树状图乱套
- 没有 parentId 的孤立节点单列"其他亲戚"分组

### 5.4 交互边界

**搜索空结果**
- Vant Search 输入无匹配时显示"未找到，点这里新建[姓名]"按钮

**照片加载失败**
- blob 损坏或文字描述无图时，显示占位头像（姓首字 + 默认底色）
- 占位底色按性别：男浅蓝、女浅粉、未知浅灰

**电话/微信空字段**
- 详情页 phone/wechat 为空时显示"未填写"灰色文字
- 电话点 `tel:` 失败（如PC端）回退到"复制到剪贴板"
- 微信号复制后用 Vant Toast 提示"已复制，去微信粘贴"

**生日提醒农历/公历**
- birthDate 存公历 YYYY-MM-DD
- 录入时勾选"农历"，存储时转为公历 + 标记 `isLunar=true`
- 提醒时若 isLunar，按农历转公历算当年生日

### 5.5 浏览器兼容

- IndexedDB：所有现代浏览器支持
- `<input capture="user">`：移动浏览器支持拍照，PC回退选文件
- `tel:` 链接：手机有效，PC无效（已处理回退）

### 5.6 不处理的边界（YAGNI）

- 不做账号系统、不做多用户、不做云端同步
- 不做微信原生集成（无法在 PWA 里调起微信添加好友）
- 不做照片自动人脸识别
- 不做多版本备份管理（单文件覆盖）

## 6. 测试策略

### 6.1 测试分层

```
┌────────────────────────────────┐
│ E2E（手动验收，靠肉眼）         │  阶段交付时跑一遍
├────────────────────────────────┤
│ 集成测试（核心流程，写代码跑） │  重点投入
├────────────────────────────────┤
│ 单元测试（纯函数，少量）        │  仅测有逻辑的工具函数
└────────────────────────────────┘
```

### 6.2 单元测试（约5个）

只测有"算法"的纯函数，UI 组件不测。

| 函数 | 测试内容 |
|---|---|
| `compressPhoto(blob)` | 输出 width≤1024、size 缩小、JPEG 格式正确 |
| `lunarToSolar(date)` | 农历转公历，3个已知日期验证正确性 |
| `isTreeValid(parentId, id, db)` | 自引用拒绝、孙辈反向拒绝、正常父子通过 |
| `syncSpouse(aId, bId, db)` | 单向设置后双向同步、解除时双向清空 |
| `sortRelativesByLastMet(list)` | null 排最前、日期倒序、相同日期稳定排序 |

### 6.3 集成测试（约8个）

用 `fake-indexeddb` 模拟 IndexedDB。

**数据层流程**
1. CRUD 闭环：新建→查询→更新→软删→列表过滤验证
2. 照片压缩存取：上传 mock blob→取出 thumbnail 校验尺寸→删除主图后主档 photoId 同步置空
3. 树结构校验闭环：建父子→试图设环引用被拒→设配偶自动双向同步→删除父后子节点 parentId 置 null 而非级联删除
4. 导出导入往返：3条主档+2张图→导出JSON→清库→导入→数据完整还原

**业务流程**
5. 新建亲戚完整流程：表单4段提交→写入 relatives + photos→详情页能读到全部字段
6. 现场查询流程：列表页加载→搜索"张"→辈分筛选"父辈"→进详情→点电话调 tel:
7. 礼金记录闭环：新建礼金→关联亲戚→列表筛选→删除亲戚后礼金软删
8. 农历生日提醒：录入农历生日→提醒中心正确转公历显示当年生日→距今天数正确

### 6.4 E2E 验收清单（手动）

**阶段1清单**
- [ ] 加到主屏幕后图标正确、启动闪屏正常
- [ ] 飞行模式下能查、能录、能拍照
- [ ] 列表页滚动不卡顿（30条数据）
- [ ] 树状视图层级清晰、配偶标注正确
- [ ] 导出 JSON→换浏览器导入→数据完整

**阶段2清单**
- [ ] 生日提醒按"近30天"筛选正确
- [ ] 拜年倒数显示距春节正确天数
- [ ] 礼金流水按日期倒序、合计正确

**阶段3清单**
- [ ] 拜年路线按地址排序后顺序合理
- [ ] 现场速记保存后能在对应亲戚详情页看到

### 6.5 测试数据 fixture

准备30人假数据 JSON（含3个家庭分支、跨4辈分、含配偶/父子关系），所有集成测试共用。

```json
{
  "relatives": [
    { "id":1, "name":"爷爷", "generation":1, "branch":"本家", "parentId":null },
    { "id":2, "name":"爸爸", "generation":2, "branch":"本家", "parentId":1 },
    { "id":3, "name":"我", "generation":3, "branch":"本家", "parentId":2 }
  ]
}
```

### 6.6 不测的部分（YAGNI）

- Vant 组件本身（上游已测）
- CSS 样式/视觉效果（人眼验收）
- PWA service-worker 缓存逻辑（靠 vue-plugin-pwa 默认实现）
- 路由跳转（Vue Router 内置稳定，集成测试顺带验证）
- 不同浏览器差异（交付时手动 Chrome + Safari 各跑一遍）

### 6.7 测试命令

```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

集成测试不卡 CI（个人项目无CI），主要靠本地 `npm test` 验证改动。

## 7. 实施约束

- 项目根目录：`c:\SVN\Seq\relatives-memory-app\`
- 包管理器：npm
- Node 版本：LTS（当前 v20+）
- 不接入任何云服务
- 不引入 TypeScript（个人项目，JS 即可，减少配置负担）
- 不引入 ESLint/Prettier（开发阶段不卡格式，最终交付前一次性整理）

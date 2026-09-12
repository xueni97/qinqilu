# 亲戚记忆APP 实现规划

- 日期：2026-09-11
- 对应设计文档：`docs/superpowers/specs/2026-09-11-relatives-memory-app-design.md`
- 项目根目录：`c:\SVN\Seq\relatives-memory-app\`

## 实施总览

分3阶段交付，每阶段独立可用、可验收。本规划细化每阶段的具体步骤、依赖关系与验证方式。

---

## 阶段0：项目初始化（前置）

**目标**：搭建可运行的 Vue 3 + Vite + Vant 骨架，配好 PWA 和数据层。

### 步骤

1. **初始化项目骨架**
   - 在 `c:\SVN\Seq\relatives-memory-app\` 用 Vite 创建 Vue 3 项目
   - 命令：`npm create vite@latest . -- --template vue`
   - 清理默认模板文件

2. **安装核心依赖**
   - `npm install vue-router@4 vant@4 dexie`
   - `npm install -D vite-plugin-pwa @vitejs/plugin-vue`
   - `npm install -D vitest @vue/test-utils fake-indexeddb`
   - `npm install -D jsdom`（测试环境 DOM）

3. **配置 vite.config.js**
   - 集成 vue-plugin-pwa（manifest: 名称"亲戚录"、图标、themeColor、autoUpdate 模式）
   - 集成 @vitejs/plugin-vue
   - 配置 server.host 让局域网手机可访问（调试用）

4. **配置路由（hash 模式）**
   - 创建 `src/router/index.js`
   - 注册占位路由：`/`、`/relative/:id`、`/relative/:id/edit`、`/relative/new`、`/tree`、`/backup`
   - 每个路由先指向空占位组件

5. **数据层初始化**
   - 创建 `src/db/index.js`，定义 RelativesDB 类（按设计文档 3.5 节）
   - 创建 `src/db/seed.js`（可选：开发期假数据填充）

6. **配置 Vitest**
   - 在 `vite.config.js` 加 `test` 配置：environment: jsdom、setupFiles 引入 fake-indexeddb
   - 在 `package.json` scripts 加：`test` / `test:watch` / `test:coverage`

7. **准备测试 fixture**
   - 创建 `tests/fixtures/relatives-seed.json`（30人假数据，3分支4辈分）
   - 创建 `tests/setup.js` 引入 fake-indexeddb

### 验收

- `npm run dev` 启动，浏览器访问能看到空页面（含 Vant NavBar 占位）
- `npm test` 能跑通一个空测试用例
- 项目结构清晰：

```
relatives-memory-app/
├─ src/
│  ├─ main.js
│  ├─ App.vue
│  ├─ router/index.js
│  ├─ db/index.js
│  ├─ views/            # 8个页面占位组件
│  ├─ components/        # 复用组件
│  └─ utils/             # 工具函数
├─ tests/
│  ├─ fixtures/relatives-seed.json
│  └─ setup.js
├─ vite.config.js
└─ package.json
```

---

## 阶段1：核心记忆档案（MVP）

**目标**：实现"现场快速查询"主场景，能完整录入/查询亲戚4区块信息。

### 1.1 工具函数与数据访问层（先做，可单测）

**任务**：把"有算法的纯函数"先实现并配单元测试。

- [ ] `src/utils/photo.js` — `compressPhoto(blob)`：Canvas 压缩到 1024px、JPEG 0.7、返回 {blob, thumbnail}
- [ ] `src/utils/lunar.js` — `lunarToSolar(date)`：农历转公历（用 `lunar-javascript` 库，先 `npm i lunar-javascript`）
- [ ] `src/utils/tree.js` — `isTreeValid(parentId, id, db)`：沿 parentId 递归校验环引用
- [ ] `src/db/relatives.js` — `syncSpouse(aId, bId, db)`：配偶双向同步
- [ ] `src/utils/sort.js` — `sortRelativesByLastMet(list)`：null 排最前、日期倒序

**单测**：5个函数各写1个测试文件，对照设计文档6.2节验证。

### 1.2 数据访问层（DAO）

封装 Dexie 操作，避免视图直接操作 db。

- [ ] `src/db/relatives-dao.js`：CRUD + 软删除 + 列表查询（含搜索/筛选/排序）
- [ ] `src/db/photos-dao.js`：CRUD + 主图切换 + 关联亲戚删除时 photoId 清空
- [ ] `src/db/backup.js`：导出 JSON（blob→base64）/ 导入 JSON（base64→blob）/ 导入前自动备份

**集成测试**（对照设计6.3节 1-4）：
- [ ] CRUD 闭环 + 软删除过滤
- [ ] 照片压缩存取 + 主图删除后 photoId 清空
- [ ] 树结构校验 + 配偶双向同步 + 删父后子 parentId 置 null
- [ ] 导出导入往返

### 1.3 列表页（主入口）

- [ ] `src/views/ListPage.vue`：Vant Search + Tabs(辈分筛选) + Cell 列表
- [ ] 默认排序 `sortRelativesByLastMet`
- [ ] 列表项：thumbnail + 姓名 + 关系 + 辈分 + features摘要 + lastMetAt
- [ ] 最久没见的高亮（如 lastMetAt 距今 > 6个月）
- [ ] 浮动添加按钮（Vant Fab）→ `/relative/new`
- [ ] 搜索无结果时显示"点这里新建[姓名]"

### 1.4 详情页

- [ ] `src/views/DetailPage.vue`：4区块折叠展示（Vant Collapse）
- [ ] 顶部大照片 + 姓名 + 关系 + 辈分 + 年龄（从 birthDate 算）
- [ ] 联系信息行：phone（tel:拨号，PC回退复制）、wechat（复制+Toast）
- [ ] 空字段显示"未填写"灰字
- [ ] 配偶/子女点击跳转（spouseId/查 parentId=this 的子节点）
- [ ] 照片加载失败占位头像（姓首字 + 性别底色）
- [ ] "记一笔见面"按钮 → 弹窗快速录 visit
- [ ] "看历史"按钮 → visits 列表弹窗

### 1.5 编辑表单

- [ ] `src/views/EditPage.vue`：4段折叠录入（Vant Form + Collapse）
- [ ] 基本身份段：name/gender/birthDate+birthYearOnly+isLunar/generation/relationship/branch/parentId/spouseId
- [ ] 外貌段：height/features + Vant Uploader 三选一弹窗（相册/capture/文字）
- [ ] 家庭段：occupation/workplace/address/phone/wechat/familyNote
- [ ] 交往段：lastMetAt/lastMetEvent/lastMetNote
- [ ] 保存时校验：branch 必填、辈分倒挂校验、环引用校验、配偶双向同步
- [ ] 删除按钮 → 弹确认框 + 输入姓名确认 → 软删

### 1.6 树状视图

- [ ] `src/views/TreePage.vue`：按 branch 分组、generation 分层
- [ ] 递归组件 `src/components/TreeNode.vue` 渲染父子层级
- [ ] 配偶"嫁入"显示（spouseId 跨 branch 时标注"嫁入"）
- [ ] 孤立节点单列"其他亲戚"组
- [ ] 节点点击跳详情页

### 1.7 备份页

- [ ] `src/views/BackupPage.vue`：导出按钮（下载 JSON）+ 导入按钮（file input）
- [ ] 导出前校验四表数据完整 + 文件大小警告
- [ ] 导入前自动生成 `backup-YYYYMMDD.json` 下载

### 1.8 阶段1验收（对照设计6.4）

- [ ] 集成测试全部通过：`npm test`
- [ ] E2E清单手动验收：加主屏图标、离线查录拍、30条滚动、树状图、导出导入往返

---

## 阶段2：礼金与提醒

**目标**：在阶段1基础上加礼金流水、生日/拜年提醒。

### 2.1 礼金数据层

- [ ] `src/db/gifts-dao.js`：CRUD + 软删除 + 按亲戚/日期/方向筛选 + 合计
- [ ] 集成测试：礼金闭环 + 删亲戚后礼金软删（设计6.3-7）

### 2.2 礼金记录页

- [ ] `src/views/GiftsPage.vue`：流水列表（按日期倒序）+ 顶部合计（出/入）
- [ ] 录入弹窗：relativeId（选亲戚）/direction/amount/occasion/date/note
- [ ] 详情页"交往记录"区块下加"看礼金"按钮跳此页（按 relativeId 筛选）

### 2.3 提醒中心

- [ ] `src/views/RemindersPage.vue`：
  - 生日提醒：扫描 relatives.birthDate，列出近30天生日（农历按 lunarToSolar 转当年）
  - 拜年倒数：距春节天数（用 lunar-javascript 算当年春节公历日期）
- [ ] 集成测试：农历生日转公历 + 距今天数（设计6.3-8）

### 2.4 阶段2验收

- [ ] 集成测试通过
- [ ] E2E清单：30天生日筛选、距春节倒数、礼金合计

---

## 阶段3：拜年规划

**目标**：拜年路线规划 + 现场速记。

### 3.1 拜年数据层

- [ ] `src/db/visits-dao.js`（若阶段1未建）：扩展 done/sequence 字段操作
- [ ] 路线规划：按 address 排序、勾选 done、保存 sequence

### 3.2 拜年路线页

- [ ] `src/views/BainianPlanPage.vue`：
  - 列出所有亲戚（或选分支筛选）
  - 按地址排序（同城市聚簇）
  - 勾选 done 实时保存
  - 拖拽改 sequence（Vant 有 sortable 或简单上移下移按钮）

### 3.3 现场速记

- [ ] 详情页"交往记录"区块加"现场速记"按钮 → 弹窗快速录入 visit（type=meeting, note）
- [ ] 速记内容保存后在详情页"看历史"中显示

### 3.4 阶段3验收

- [ ] E2E清单：路线排序合理、速记保存后详情页可见

---

## 工程收尾

- [ ] 一次性 ESLint+Prettier 整理（`npm i -D eslint prettier eslint-plugin-vue`，跑 `npx prettier --write src/`）
- [ ] PWA 图标制作（用 SDXL 生成一张"亲戚录"主题图标，导出 192/512 两尺寸）
- [ ] README 写使用步骤：`npm install` → `npm run dev` → 局域网手机访问 → 加到主屏
- [ ] 最终全量测试：`npm test` 全绿 + 三阶段E2E清单全过

---

## 依赖关系

```
阶段0 → 阶段1（1.1→1.2→1.3/1.4/1.5/1.6/1.7 并行）→ 1.8验收
       → 阶段2（2.1→2.2/2.3 并行）→ 2.4验收
       → 阶段3（3.1→3.2/3.3 并行）→ 3.4验收
       → 工程收尾
```

## 关键风险与对策

| 风险 | 对策 |
|---|---|
| IndexedDB 配额超限 | 照片压缩到 1024px + 阶段1就实现导出备份 |
| Vant 树状视图没现成组件 | 用 Collapse + 递归组件，不引第三方树库 |
| 农历转公历复杂 | 用成熟的 `lunar-javascript` 库，不自造 |
| service-worker 更新卡版本 | 用 autoUpdate 模式，下次打开自动更新 |
| 个人项目拖久做不完 | 严格分3阶段，每阶段都能用、可验收 |

## 建议的实施顺序（给执行者）

1. 先做阶段0（项目骨架），验证 `npm run dev` + `npm test` 能跑
2. 阶段1从 1.1 工具函数 + 单测开始（TDD风格），再做 1.2 DAO + 集成测试
3. 阶段1的 1.3-1.7 视图层可按依赖顺序：列表→详情→编辑→树状→备份
4. 阶段1验收通过后再开阶段2，避免一次性铺太大

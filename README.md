# 亲戚录 · Relatives Memory App

> 一年一见的亲戚，过完年就忘了名字、长相和家里情况？
> 这是一个**纯本地、无需服务器**的 PWA 应用，帮你记住每位亲戚：
> 姓名关系、外貌特征、家庭情况、礼金往来、生日提醒，以及地图上"谁在附近"。

## 功能一览

### 🗺️ 地图首页
- 自动定位（浏览器定位 → 百度 IP 定位 → 手动选点，三级兜底）
- 亲戚以 Q 版小动物头像标记在地图上，显示距离（🐢祖辈 / 🦁父辈 / 🐰同辈 / 🐱晚辈）
- 点击头像查看速记卡片，一键拨号、跳详情
- 列表/地图双视图，支持按姓名、关系、特征、分支搜索

### 👤 亲戚档案
- 勾选式录入：辈分 → 关系自动联动，显著特征多选标签，不用打字
- 四大区块：基本身份 / 外貌特征 / 家庭详情 / 交往记录
- 家族树视图：按分支 + 辈分分层，配偶双向标注
- 电话一键拨号、微信一键复制、住址一键导航

### 📸 照片与人脸大头贴
- 每位亲戚可存多张照片（相册 / 拍照 / 文字描述）
- 内置 face-api.js 人脸检测，自动裁出 **256×256 大头贴**
- 检测不到人脸自动回退原图，全程离线运行

### 🧧 礼金往来
- 记录每笔礼金：给出 / 收入、金额、事由（春节/婚礼/满月…）
- **已发生 / 待发生** 两种状态：收到请帖先记"待办"，首页自动提醒，赴宴后一键标记完成
- 按亲戚分组 + 累计净额统计；详情页直接看该亲戚的人情账

### 🔔 提醒中心
- 距春节倒数（自动支持农历）
- 近 30 天生日提醒（公历 / 农历生日自动转换）
- 待办宴请提醒，首页顶部滚动提示

### 💾 数据与隐私
- 所有数据存在**手机本地** IndexedDB，不上云、不注册、无广告
- 一键导出 / 导入 JSON 备份（照片以 base64 内嵌）
- 软删除机制（删除需输入姓名确认），防止误删珍贵记忆

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vue 3 + Vite |
| UI | Vant 4（移动端组件库） |
| 本地数据库 | Dexie.js (IndexedDB) |
| 地图 | 百度地图 JS API（需自备浏览器端 AK） |
| 人脸检测 | face-api.js（TinyFaceDetector，模型本地化） |
| 农历 | lunar-javascript |
| 离线 | vite-plugin-pwa（Service Worker 预缓存） |
| Android 打包 | Capacitor 8（网页资源内置 APK）+ GitHub Actions |
| 测试 | Vitest + @vue/test-utils + fake-indexeddb |

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173 （手机同局域网可访问）
npm test           # 运行 47 个测试
npm run build      # 产出 dist/
npm run lint       # ESLint
npm run format     # Prettier
```

### 百度地图 AK 配置

地图功能需要一个[百度地图开放平台](https://lbsyun.baidu.com/apiconsole/key)的**浏览器端 AK**：

1. 创建应用 → 应用类型选"浏览器端"
2. Referer 白名单按部署域名填写，例如：
   - 本地开发：`localhost:5173`
   - 线上使用：`你的用户名.github.io`
3. 把 AK 填入 [`src/utils/baiduMapLoader.js`](src/utils/baiduMapLoader.js) 顶部的常量

> 不配置 AK 也能用：地图选点降级为手动输入地址 + 经纬度，其余功能全部正常。

## 📱 在手机上使用（重点）

本项目推送 `main` 分支后，GitHub Actions 会自动构建并部署到 **GitHub Pages**（免费 HTTPS 托管），手机浏览器打开网址即可，然后"添加到主屏幕"变成类原生 APP。

### 第一次部署（一次性）

1. 推送代码后，打开 GitHub 仓库页
2. **Settings → Pages → Build and deployment → Source 选 "GitHub Actions"**
3. 等待 Actions 页面的部署任务变绿（约 1~2 分钟）
4. 得到网址：`https://<你的用户名>.github.io/<仓库名>/`

### Android（Chrome / Edge）

1. 用 Chrome 打开上面的网址
2. 菜单（右上 ⋮）→ **添加到主屏幕** / 安装应用
3. 桌面出现"亲戚录"图标，点开即全屏运行，无浏览器地址栏

### iPhone（Safari）

1. 必须用 **Safari** 打开网址（Chrome 加不了主屏幕）
2. 底部分享按钮 → **添加到主屏幕** → 添加
3. 桌面图标点开即为独立 APP

### 离线与数据

- 第一次打开后，页面资源被自动缓存，**之后没网也能打开和使用**
- 数据只存在当前手机浏览器里。**换手机 / 清浏览器数据前**，先到"备份"页导出 JSON，再在新机导入
- iPhone 注意：不要长期不打开，iOS 可能清理网站数据；建议每月打开一次或定期导出备份

### 备选：局域网临时调试

不想部署时，电脑运行 `npm run dev`，手机连同一 WiFi 打开
`http://<电脑局域网IP>:5173`（控制台会打印地址）。

## 📦 安装 Android APK（像普通 APP 一样安装）

除了浏览器"添加到主屏幕"，项目还通过 [Capacitor](https://capacitorjs.com/) 把网页资源打包进原生 Android 安装包（包名 `com.xueni97.qinqilu`，应用名"亲戚录"），**完全离线运行**。无需在本机安装 Android Studio：推送到 `main` 后 GitHub Actions 自动构建 APK。

### 第 1 步：下载 APK

1. 电脑浏览器打开仓库 Actions 页：<https://github.com/xueni97/qinqilu/actions>
2. 登录 GitHub 账号，点击最新一条绿色 ✅ 的 **Build Android APK** 记录
3. 页面最下方 **Artifacts** 区域，下载 `qinqilu-apk-v<数字>`（数字越大版本越新）
4. 下载到的是 zip 压缩包，**解压后得到 `qinqilu-v<数字>.apk`**

### 第 2 步：安装到安卓手机

1. 把 apk 发到手机（微信"文件传输助手"、QQ、数据线均可），也可直接在手机上下载解压
2. 点击 apk 进行安装；若系统拦截，按提示允许当前 App（文件管理器/浏览器/微信）**"安装未知来源应用"**
3. 安装完成后桌面出现"亲戚录"图标，点开即用

> - **以后怎么更新**：每次向 `main` 推送代码，Actions 会自动构建新 APK，回到 Actions 页面下载最新版覆盖安装即可（数据不会丢）
> - 该包为 debug 自签名安装包，适合自用侧载，不能上架应用商店
> - APK 版的数据与浏览器/PWA 版相互独立、不互通；换手机请用应用内"备份"功能导出 / 导入 JSON

## 目录结构

```
src/
├─ views/          # 页面：首页(地图)/详情/编辑/家族树/礼金/提醒/备份
├─ components/     # BaiduMapPicker 等组件
├─ db/             # Dexie schema + 各表 DAO + 备份
├─ utils/          # 距离/农历/人脸/照片压缩/动物头像/百度加载器
├─ composables/    # useGeolocation 定位
└─ router/         # hash 路由（PWA 友好）
public/
├─ models/         # 人脸检测模型（本地，离线可用）
├─ pwa-192.png     # 应用图标
└─ pwa-512.png
android/            # Capacitor 生成的原生 Android 工程
.github/workflows/
├─ deploy.yml         # 推送到 main 自动部署 GitHub Pages
└─ android-apk.yml    # 推送到 main 自动构建 Android APK
```

## 数据模型

- **relatives**：姓名/辈分/关系/分支/特征/生日/电话微信/住址坐标/上次见面
- **photos**：原图 + 缩略图 + 人脸大头贴
- **gifts**：礼金流水（direction 出入 / status 已发生待办）
- **visits**：见面与拜年记录

## License

MIT（个人项目）

# PROJECT REPORT — Personal World, Phase 01

> 正式网站骨架 + Home World v0.2.3 接入。**未部署、未推送、未修改 v0.2.3 原始稳定版。**

| 项目 | 结果 |
|---|---|
| 技术栈 | React 19.3.1 · Vite 7.1.9 · TypeScript 5.9.2 · GSAP 3.15.1 · React Router 7.9.1 |
| TypeScript | **0 errors**（`tsc --noEmit`，strict + noUnusedLocals） |
| 单元/集成测试 | **26 / 26 passed**（vitest + jsdom + testing-library） |
| 浏览器路由验收 | **14 / 14 passed**（真 Chromium，9 张截图） |
| Home World 冻结模块 CI | **170 / 170**（原样运行，未改一行） |
| Runtime 单测 | **10 / 10** |
| 生产构建 | `dist` 397.31 kB JS（gzip 127.92 kB）+ 24.17 kB CSS（gzip 5.95 kB），2.0 s |

---

## 1. 完整项目目录

```
personal-world-site/
├── index.html                     Vite 入口（含 theme-color #E9E5DE）
├── package.json                   React 19 / Router 7 / GSAP / Vite / TS / vitest
├── tsconfig.json                  strict, allowJs（为读取 world 模块的 JS）
├── vite.config.ts                 react 插件 + vitest(jsdom) + build 目标
├── vitest.setup.ts                jsdom 补齐 matchMedia / ResizeObserver / PointerEvent
│
├── src/
│   ├── main.tsx                   BrowserRouter + 全局样式装载
│   ├── vite-env.d.ts              *.svg?raw 声明
│   ├── app/
│   │   ├── App.tsx                路由表（6 条 + 404）
│   │   ├── SiteLayout.tsx         固定导航 / skip link / 页脚
│   │   └── App.test.tsx           路由 + 内容契约测试（17 条）
│   ├── pages/
│   │   ├── HomePage.tsx           首页：世界 + portal 路由分发 + Instagram 弹窗
│   │   ├── AboutPage.tsx          /about
│   │   ├── WorkPage.tsx           /architecture /travel /research /fashion
│   │   ├── NotFoundPage.tsx       404
│   │   ├── page.css               页面布局 + CONTENT_PENDING 样式
│   │   └── home.css               首页浮层
│   ├── components/ui.tsx          ContentPending / Field / Modal / Gallery / StatusChip
│   ├── content/
│   │   ├── types.ts               ContentStatus / ContentField / WorldEntry / ...
│   │   ├── site.ts                站点信息、导航、社交（GitHub READY，Instagram PENDING）
│   │   └── worlds.ts              四个作品世界的配置（0 个项目）
│   ├── styles/
│   │   ├── tokens.css             设计系统 token（颜色/字号/间距/圆角/动效/z-index）
│   │   ├── base.css               reset + 页面骨架
│   │   ├── components.css         header / 按钮 / 标签 / Modal / Gallery / 页脚
│   │   └── tokens.test.ts         token ↔ world palette 一致性测试
│   └── world-home/
│       ├── HomeWorldView.tsx      站点与冻结模块之间的唯一接缝
│       ├── types.ts               冻结模块的 TS 类型面
│       ├── home-world-view.css    世界层定位
│       └── HomeWorldView.test.tsx 集成测试（7 条）
│
├── world/                         ★ v0.2.3 原样拷贝，未修改
│   ├── HOME_WORLD.svg             冻结几何真相（inline 导入，绝不用 img）
│   ├── src/world/{iso,world-runtime,gsap-motion}
│   ├── src/content/{geometry,routes}
│   ├── src/styles/{palette,world-runtime.css}
│   ├── src/react/HomeWorld.jsx
│   ├── build/home-world.css
│   ├── tools/{validate-home-world,build-home-world}
│   ├── tests/world-runtime.test.mjs
│   └── MODULE.md                  来源与不可修改说明
│
├── tools/{lib/cdp.mjs, shots.mjs}  真浏览器驱动 + 截图脚本
├── shots/                          9 张验收截图 + report.json + server.log
└── dist/                           生产构建产物
```

## 2. package.json

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",
    "shots": "node tools/shots.mjs",
    "verify": "npm run typecheck && npm run test && npm run build"
  },
  "dependencies": {
    "gsap": "3.15.1",
    "react": "19.3.1",
    "react-dom": "19.3.1",
    "react-router-dom": "7.9.1"
  },
  "devDependencies": {
    "@testing-library/dom": "10.4.1",
    "@testing-library/react": "16.3.0",
    "@types/node": "24.x",
    "@types/react": "19.1.13",
    "@types/react-dom": "19.1.9",
    "@vitejs/plugin-react": "5.0.3",
    "jsdom": "27.0.0",
    "typescript": "5.9.2",
    "vite": "7.1.9",
    "vitest": "3.2.4"
  }
}
```

> `build` 里的 `tsc -b` 会读取单一 `tsconfig.json`（无 project references）；若你的 npm 版本对 `-b` 有异议，用 `npm run verify` 即可。

## 3. 本地运行

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # 26 条测试
pnpm build        # 生产构建
pnpm shots        # 真浏览器截图 + 14 条路由验收（需要本机 Chrome/Edge）
```

`world/` 模块可独立验证：

```bash
node world/tools/validate-home-world.mjs   # 170 / 170
node --test world/tests/world-runtime.test.mjs   # 10 / 10
```

## 4. 页面与路由

| 路由 | 组件 | 布局 | 状态 |
|---|---|---|---|
| `/` | HomePage | 全屏沉浸式世界 | 7 个 portal 全部可交互 |
| `/about` | AboutPage | 编辑式单栏 + 分块网格 | 文案 `CONTENT_PENDING` |
| `/architecture` | WorkPage | **editorial**：大标题 + 双栏引言 | 0 个项目 |
| `/travel` | WorkPage | **strip**：细体标题 + 左侧强调线 | 0 个项目 |
| `/research` | WorkPage | **index**：等宽字体 + 编号栏 | 0 个项目 |
| `/fashion` | WorkPage | **runway**：居中 + 字距放大的全大写标题 | 0 个项目 |
| `*` | NotFoundPage | — | — |

四种作品布局**结构不同**（不是换皮）：`editorial` 用 grid 两列 + 多栏引言，`strip` 用左侧边框标记，`index` 切换等宽字体与计数器，`runway` 整体居中并放大字距。

## 5. 内容接口

```ts
type ContentStatus = 'READY' | 'CONTENT_PENDING';
interface ContentField<T> { status: ContentStatus; value: T | null; source?: string }
```

- 所有人工文案都走 `ContentField`；`CONTENT_PENDING` 一律 `value: null`
- 页面用 `<Field>` / `<ContentPending>` 渲染，**永不显示占位假文案**
- **唯一 READY 的内容**是用户提供的 GitHub：`https://github.com/jhon-wickyyy`
- Instagram、About 文案、四个世界的介绍与作品：全部 `CONTENT_PENDING`

## 6. 首页与 Home World 集成

- 世界以 **inline SVG** 注入（`HOME_WORLD.svg?raw` → `DOMParser` → `importNode`），全程没有 `<img>`
- `HomeWorldView` 是唯一接缝：传 `svgMarkup`、转发 `portalactivate`、把 runtime 生命周期绑到路由
- portal 分发：`about → /about`、`github → 新标签打开已验证账号`、`instagram → CONTENT_PENDING 弹窗`、四个世界 → 对应路由
- **状态处理**：离开 `/` 时 runtime.destroy()（GSAP 时间线一并销毁），返回时 runtime 从 `localStorage` 恢复机关状态；角色回到中心节点
- 移动端：390×844 使用模块自带的 760 单位相机裁切 + 7 项 dock，触控目标 ≥44 CSS px

## 7. 设计系统

`src/styles/tokens.css` 是唯一来源：

```css
--color-red: #B98587;   --color-blue: #879EAD;  --color-green: #899B88;
--color-bg: #E9E5DE;    --color-text: #625D59;  --color-lilac: #B5A9B5;
```

另有：字号 8 级（12→clamp 5rem）、间距 4 基数 10 级、圆角 4 级、阴影 3 级、动效 3 档、z-index 6 层、断点 `sm 480 / md 768 / lg 1024 / xl 1280`。

`tokens.test.ts` 断言六个锚点与 `world/src/styles/palette.mjs` **完全一致**，防止设计系统与世界色彩漂移。

## 8. 测试结果

### 8.1 单元与集成（vitest，26 条）

```text
src/app/App.test.tsx                 17 passed
  - 每条路由渲染各自的 h1；每页恰好一个 <main>
  - 404、导航 aria-current、skip link 目标
  - portal 激活触发路由跳转
  - CONTENT_PENDING 可见、不编造 Instagram、GitHub 链接正确、每个世界 0 projects
src/world-home/HomeWorldView.test.tsx  7 passed
  - inline SVG 命名空间正确、无 <img>
  - 7 portal / 4 mechanism / 节点数与 routes 模块推导值一致
  - 初始 3 个门锁定、4 座桥隐藏
  - 解谜后 is-open，卸载再挂载仍保持（= 离开首页再回来）
  - runtime handle 暴露；portal 事件被转发且组件自身不导航
src/styles/tokens.test.ts              4 passed
```

### 8.2 真浏览器路由验收（14 条）

```text
H1 inline SVG + 命名空间 + 无 img          PASS
H2 首页世界铺满视口                          PASS
H3 冻结资产完整（7 portal / 4 mechanism）    PASS
H4 真实点击机关后桥打开（等动画收敛后断言）   PASS
H5 抵达 portal 后 React Router 跳转          PASS
H6 返回首页后已解机关恢复                    PASS
R1-R5 五个路由：单 main / 有 h1 / 导航 6 项   PASS
M1 移动端为相机裁切而非整图缩放              PASS
M2 移动端 dock 存在且目标 ≥44px              PASS
E1 全路由零 console 错误                     PASS
```

截图：`shots/01-home-desktop.png` … `09-about-mobile.png`。

### 8.3 冻结模块自检

```text
geometry CI: 170/170      runtime unit: 10/10
```

## 9. 本轮修掉的问题

| # | 现象 | 真因 | 处理 |
|---|---|---|---|
| 1 | 作品页标题钻到固定 header 下面 | `page.css` 的 `.page__main` padding 被后加载的 `base.css` 覆盖（CSS 顺序） | padding 收归 `base.css` 单处定义 |
| 2 | 390px 下品牌名换行并与导航重叠 | 字标太长 | ≤767px 改为 “PW” 字标 + 可横向滚动导航 |
| 3 | 移动端 “Return to centre” 压住导航/世界 | 定位在 header 下方 | 移到 dock 上方右侧 |
| 4 | 分隔符 `·` 在中文环境渲染成异常字形 | CJK 字体回退 | 文案改用句号/连字符，全站源码强制 ASCII |
| 5 | 源码被 PowerShell 的 ANSI 往返写成乱码并混入 BOM | 用 PS 做文本替换 | 用 Python 按 UTF-8 精确修复并清除 BOM；此后源文件只用工具写入 |

## 10. 未做 / 待输入

- **场景转场**：抵达 portal 目前直接路由跳转，没有「门 → 世界旋转 → 新场景」的空间过渡（模块侧的 portal bloom 已在）
- **真实内容**：About 文案、Instagram、四个世界的介绍/作品/图片全部 `CONTENT_PENDING`
- **部署**：按约束未部署、未推送
- **数据库/后端/CMS**：本轮明确不引入

## 11. 交付 ZIP

`personal-world-phase01.zip` — 含源码、`world/` 冻结模块、测试、`shots/` 截图与生产构建 `dist/`；**不含 `node_modules`**（`pnpm install` 后可运行）。

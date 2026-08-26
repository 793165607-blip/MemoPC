# 念念 Memo · PC 官网与产品健康看板（niannian-web）

这个仓库同时承载念念（情绪日记 + AI 分身）的 PC 端品牌官网与只读产品健康看板。品牌官网保持单页沉浸式长滚动；`/dashboard` 通过服务端访问念念后端的汇总数据接口，不在浏览器暴露后端访问密钥。

> 设计原则：全程用念念自己的视觉元素（漂浮玻璃球 / 蓝绿·暖色分身球 / 涟漪 / 六情绪色 / 衬线大字）体现功能，**不放任何 App 截图或手机原型图**。

## 快速开始

```bash
npm install
npm run dev        # 开发服务器 → http://localhost:3400
npm run build      # 生产构建
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint
npm test           # Vitest
```

## 技术栈

Next.js 16（App Router）· React 19 · TypeScript · Tailwind CSS 3 · framer-motion 13 · Vitest + Testing Library · Noto Serif SC（next/font）。

## 目录结构

```
app/
  globals.css     # 设计系统：颜色/玻璃/球/涟漪/动画 token（镜像自 App 的 theme.css）
  dashboard/      # 念念的健康报告；仅服务端读取汇总快照
  layout.tsx      # 字体 + SEO metadata
  page.tsx        # 拼装 9 个版块（叙事顺序的唯一来源）
components/
  dashboard/      # 看板版块、指标卡与趋势图
  primitives/     # Section/TwoCol · Reveal（滚动渐显）· Orb（玻璃/分身/暖球+涟漪）· Button
  sections/       # 9 个版块：Hero/Philosophy/Record/Companion/MeetYourself/Cloud/Echo/Privacy/Closing
  Nav.tsx Footer.tsx EmailForm.tsx
lib/content.ts    # 全站文案/数据（唯一来源，改文案只动这里）
lib/dashboard-*   # 看板数据获取、查询解析、v4 契约校验与类型
scripts/          # 产品看板生产汇总 SQL 与快照工具
public/           # favicon.svg · og.svg（品牌渐变，非截图）
```

## 改动指南

- **改文案** → 只动 `lib/content.ts`。
- **改观感（颜色/玻璃/球/间距）** → `app/globals.css` 的 token 与类；颜色沿用 App `代码/src/styles/theme.css`（蓝 `#60a5fa` / 暖金 `#C8AD78` / 六情绪色）。
- **加/调版块** → `components/sections/` 加组件，在 `app/page.tsx` 按叙事顺序插入。
- 视觉对照基准：`../../docs/superpowers/specs/2026-05-20-niannian-pc-website-design.md`（设计稿在父工作区 `念念Memo/`，不在本仓库内）。

## 产品健康看板

复制 `.env.dashboard.example` 并配置以下服务端变量：

- `DASHBOARD_BASIC_USER` / `DASHBOARD_BASIC_PASSWORD`：浏览器访问 `/dashboard` 的基础认证；生产环境缺失时该路由返回 404。
- `MEMO_API_BASE_URL`：念念 Java 后端地址。
- `MEMO_DASHBOARD_KEY`：与后端 `APP_DASHBOARD_ACCESS_KEY` 一致的内部访问密钥。

`DASHBOARD_USE_MOCK`、`DASHBOARD_USE_SNAPSHOT` 和 `DASHBOARD_SNAPSHOT_PATH` 只用于本地验收；生产构建会拒绝使用本地 Mock 或快照。生产数据口径的唯一 SQL 来源是 `scripts/dashboard-production-snapshot.sql`，须与后端资源文件保持逐字一致。

## 部署

部署前必须通过 `npm test`、`npm run lint`、`npm run typecheck`、`npm run build` 和 `npm audit`。生产运行环境使用 Node.js 20.9 或更新版本，并配置上述看板变量；同时确认 Web 服务能访问 Java 后端。部署品牌正式域名前，还需要把 `app/layout.tsx` 的 `metadataBase` 占位地址改成正式域名。

## 待定项（占位、不影响构建）

- 结尾 CTA / 上线状态：暂「预约内测」；上线后可改「下载 App」。
- 邮箱收集后端：`EmailForm` 读 `NEXT_PUBLIC_SIGNUP_ENDPOINT`（未配置则仅本地成功提示）；后端方案待定。
- 正式域名（见上 `metadataBase`）。
- 各版块最终文案精修。

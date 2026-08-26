# CLAUDE.md — niannian-web

念念 PC 端品牌官网（单页沉浸式长滚动）。Next.js 14 App Router + Tailwind 3 + framer-motion。

## 命令

```bash
npm run dev        # :3400
npm run build      # 必须无警告通过
npm run typecheck  # tsc --noEmit
npm test           # vitest（content / EmailForm / 整页烟雾，共 8 例）
```

## 硬规则（红线）

- **绝不放 App 截图、手机原型图、旧营销素材（旧"云朵 mascot"、`Frame 2085663158`）。** 所有功能用念念原生视觉元素（玻璃球 / 蓝绿·暖色分身球 / 涟漪 / 六情绪色 / 衬线）合成。这是产品负责人的明确要求。
- **文案唯一来源是 `lib/content.ts`** — 组件里不要硬编码用户可见文案。
- **设计 token 唯一来源是 `app/globals.css` + `tailwind.config.ts`**，颜色镜像自 App `代码/src/styles/theme.css`（蓝 `#60a5fa` / 暖金 `#C8AD78` / 六情绪色 `--m-*`）。无紫调主色。
- **`muted` 文字色是 `#6b6b70`**（tailwind token 与 CSS 变量都是它），满足 WCAG AA；不要回退到 `#8E8E93`（对比度不达标）。
- **`"use client"` 只用在 primitives（`Reveal` / `Orb` / `Parallax` / `Typewriter` / `EchoRibbon`）与 `EmailForm`**；版块（sections）与 Nav/Footer 是 server component。新增动效时建一个 client primitive，别把版块改成 client。
- 动效走 framer-motion 且必须尊重 `prefers-reduced-motion`（所有动效 primitive 都用 `useReducedMotion`／`useInView` 守卫，globals.css 有 reduce 媒体查询）。

## 结构与约定

- `app/page.tsx` 是 9 版块叙事顺序的唯一拼装点：Hero → Philosophy → Record → Companion → MeetYourself → Cloud → Echo → Privacy → Closing（+ Nav/Footer/分隔线）。
- 版块组件在 `components/sections/`，复用 `components/primitives/`（Section/TwoCol、Reveal、Orb、Button），不要在版块里重造这些积木。
- `EmailForm` 提交读 `NEXT_PUBLIC_SIGNUP_ENDPOINT`（未配置=本地成功提示）；后端未定。
- `app/layout.tsx` 的 `metadataBase` 是占位域名，部署时改。

## 设计真相来源

- 设计稿：`../../docs/superpowers/specs/2026-05-20-niannian-pc-website-design.md`
- 实施计划：`../../docs/superpowers/plans/2026-05-20-niannian-pc-website.md`
（均在父工作区 `念念Memo/`，不在本仓库内。）

## 完成前

跑 `npm run typecheck && npm test && npm run build`，全绿且 build 无警告才算完成。改视觉后在浏览器对照设计稿，别只信构建通过。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

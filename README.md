# 书影账本 · 个人书影管理平台

> 一本会生长的「书影账本」——记录与统计并重，数据 100% 归自己，无噪音，按自己的使用习惯生长。

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS 3 |
| 数据库 | Supabase (PostgreSQL) |
| 元数据源 | Google Books API (书籍) / TMDB API (影视) |
| 部署 | Vercel 或 Cloudflare Pages |

## 项目结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（侧边栏 + 主区）
│   ├── page.tsx                # 仪表盘 Dashboard
│   ├── globals.css             # 全局样式 + 设计令牌
│   ├── books/page.tsx          # 书籍库
│   ├── movies/page.tsx         # 影视库
│   ├── stats/page.tsx          # 统计页
│   ├── settings/page.tsx       # 设置页
│   ├── detail/[type]/[id]/     # 条目详情页
│   └── api/
│       └── search/
│           ├── books/route.ts  # Google Books 搜索代理
│           └── movies/route.ts # TMDB 搜索代理
├── components/
│   ├── Sidebar.tsx             # 侧边栏导航
│   └── TopBar.tsx              # 顶部栏
├── lib/
│   └── supabase.ts             # Supabase 客户端
└── types/
    └── index.ts                # 全局类型定义

supabase/
└── schema.sql                  # 数据库建表脚本
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

已在 `.env.local` 中预填（请勿提交此文件）：

```
NEXT_PUBLIC_SUPABASE_URL=https://jxpetflkciuldbpuayne.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
TMDB_API_KEY=your_key
GOOGLE_BOOKS_API_KEY=           # 可选
```

### 3. 初始化数据库

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择项目 `jxpetflkciuldbpuayne`
3. 进入 **SQL Editor**
4. 粘贴 `supabase/schema.sql` 全部内容并执行

### 4. 启动开发服务器

```bash
npm run dev
```

打开 http://localhost:3000

### 5. 部署

**Vercel**：
```bash
npm run build
# 或通过 Vercel Dashboard 导入 GitHub 仓库自动部署
```

**Cloudflare Pages**：
```bash
npx @cloudflare/next-on-pages
```

## 里程碑

| 阶段 | 内容 | 状态 |
|---|---|---|
| M1 · MVP | 自动补全录入、双库 CRUD、四态流转、类型筛选、搜索排序、评分评价 | 🔨 骨架已搭建 |
| M2 · 统计 | 仪表盘、图表页、年度目标 | 📋 待开发 |
| M3 · 完善 | 笔记、导出、响应式打磨、封面占位优化、部署上线 | 📋 待开发 |

## 设计系统

从可交互原型移植的完整设计令牌，详见 `src/app/globals.css` 和 `tailwind.config.ts`：

- 主色：墨绿 `#2E5E4E` + 琥珀 `#C07A2E`
- 状态色：完成(绿) / 进行中(橙) / 想要(蓝灰) / 放弃(灰)
- 字体：Georgia 衬线（标题）+ 系统无衬线（正文）

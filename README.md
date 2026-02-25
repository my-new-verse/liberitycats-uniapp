# Liberty Cats — UniApp 前端

Liberty Cats 移动端多平台应用，基于 UniApp + Vue 3 构建，面向加密/NFT 用户，提供 NFT 质押、OKX 钱包集成、电商商城、社区互动、加密行情与休闲小游戏。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | UniApp 3 + Vue 3 + TypeScript |
| 样式 | UnoCSS |
| UI 组件 | wot-design-uni + z-paging |
| 状态管理 | Pinia + pinia-plugin-persistedstate |
| 多语言 | vue-i18n（en / zh-Hans / zh-Hant） |
| 路由 | @uni-helper/vite-plugin-uni-pages（约定式） |
| 构建 | Vite 5 |
| 包管理 | pnpm（强制，preinstall 钩子限制） |

## 目标平台

- iOS / Android App（主要）
- H5
- 微信小程序

## 环境要求

- Node.js >= 18
- pnpm >= 7.30

## 快速开始

```bash
pnpm install
```

## 开发

```bash
pnpm dev:h5          # H5，访问 http://localhost:9000/
pnpm dev:mp-weixin   # 微信小程序 → dist/dev/mp-weixin（用微信开发者工具导入）
pnpm dev:app         # App → dist/dev/app（用 HBuilderX 导入并运行到基座）
```

## 构建

```bash
pnpm build:h5        # H5 → dist/build/h5
pnpm build:app       # App 生产包（执行 build-app.sh，再用 HBuilderX 云打包）
```

## 目录结构

```
src/
├── pages/                  # 主包页面
│   ├── tabbar/             # 底部导航五大页面（home / mall / game / discover / my）
│   └── cats/               # 业务功能页面
│       ├── login/          # 邮箱 / Discord / Apple 登录
│       ├── goods/          # 商品详情
│       ├── order/          # 订单管理
│       ├── pledge/         # NFT 质押
│       ├── social/         # 社区帖子
│       ├── news/           # 新闻资讯
│       ├── settings/       # 用户设置
│       ├── address/        # 收货地址
│       ├── pay/            # 支付
│       ├── notification/   # 通知
│       └── ...
├── pages-sub/              # 分包页面
├── components/             # 跨页面通用组件
├── layouts/                # 页面布局（default / default2 / demo）
├── store/                  # Pinia 状态（user.ts）
├── hooks/                  # useRequest / useUpload
├── interceptors/           # 请求拦截 / 路由守卫 / 设备兼容补丁
├── service/
│   └── api/                # 后端接口（按模块分文件：login / user / goods / order / pledge / community / ...）
├── utils/                  # http.ts / httpOut.ts / platform.ts / i18n.ts / index.ts
├── locale/                 # 多语言资源（en / zh-Hans / zh-Hant）
└── types/                  # 全局类型声明

pages.config.ts             # 路由与 tabbar 配置
manifest.config.ts          # App 清单（图标 / 权限 / 支付 SDK / 深度链接）
```

## 核心功能

- **NFT 质押** — 质押 LibertyCats NFT 获取活动积分，支持排行榜与赎回
- **OKX 钱包** — App 深度链接连接 / 断开钱包，链上数据创建
- **电商** — 商品浏览 / 购物车 / 订单 / 物流，支持 Stripe、OKX、Apple IAP 三种支付
- **社区** — 图文发帖、评论、点赞、自定义 emoji、举报 / 拉黑
- **发现** — 加密新闻（外部 API）、实时行情（USDT 计价）、法币换算
- **小游戏** — Matchin' CAT（消消乐）、Jumpin' CAT（跳一跳），进入前通过 token 验证
- **每日签到** — 连续签到计数与日历
- **多语言** — 英文 / 简中 / 繁中，运行时切换

## 开发规范

- API 接口统一写在 `src/service/api/`，一个文件对应一个业务模块
- 路由通过文件约定自动生成，页面鉴权在 `<route-block>` 中声明 `needLogin: true`
- 异步请求优先使用 `useRequest` hook 管理 loading / error / data 三态
- 提交信息遵循 commitlint 规范（feat / fix / docs / refactor ...）

## 文档

- [`docs/index.md`](docs/index.md) — 项目概览
- [`docs/architect.md`](docs/architect.md) — 技术架构
- [`docs/business.md`](docs/business.md) — 业务逻辑

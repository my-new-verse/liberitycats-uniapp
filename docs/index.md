## 项目概览（前端 / App / UniApp 项目）

- **项目名称**: EasyUniapp2 (`liberitycats-uniapp`)
- **技术栈**: UniApp / UniBest + Vue 3 + TypeScript + UnoCSS + wot-design-uni + Pinia
- **目标平台**: iOS / Android 移动 App（兼容 H5、微信小程序等多端）

## 目录结构（关键目录）

- `src/`：业务源码根目录
- `src/pages/`：页面级视图（`about`、`callback`、`cats`、`demo`、`game`、`tabbar`、`test`）
- `src/pages-sub/`：分包页面（`demo`）
- `src/components/`：通用业务组件
- `src/layouts/`：页面布局（`default.vue`、`default2.vue`、`demo.vue`）
- `src/store/`：状态管理（Pinia，`index.ts`、`user.ts`）
- `src/service/`：网络请求封装（`index.ts`、`request.ts`、`route.ts`、`prototype.ts`）
- `src/service/api/`：后端接口封装（按业务模块分文件，如 `user.ts`、`login.ts`、`game.ts` 等）
- `src/hooks/`：组合式函数（`useRequest.ts`、`useUpload.ts`）
- `src/interceptors/`：请求与路由拦截器
- `src/locale/`：i18n 多语言文件（`zh-Hans`、`zh-Hant`、`en`、`ja`）
- `src/utils/`：工具方法（`http.ts`、`httpOut.ts`、`i18n.ts`、`platform.ts`）
- `src/types/`：全局类型声明
- `manifest.config.ts`：UniApp 清单与运行配置
- `pages.config.ts`：约定式路由页面配置
- `uno.config.ts`：UnoCSS 原子化样式配置
- `vite.config.ts`：Vite 构建与开发配置

## 构建与运行

- H5 开发：`pnpm dev:h5`（或 `pnpm dev`），访问 `http://localhost:9000/`
- 微信小程序开发：`pnpm dev:mp-weixin`，产物在 `dist/dev/mp-weixin`
- App 开发：`pnpm dev:app`，产物在 `dist/dev/app`，需用 HBuilderX 导入
- App 生产打包：`pnpm build:app`（执行 `build-app.sh`）
- H5 生产构建：`pnpm build:h5`，产物在 `dist/build/h5`

## 约定与规范

- 使用 TypeScript 编写业务代码
- API 接口统一封装在 `src/service/api/`，通过 `src/service/` 的请求层调用
- 路由使用约定式路由（`@uni-helper/vite-plugin-uni-pages`），配置在 `pages.config.ts`
- 状态管理使用 Pinia，持久化插件为 `pinia-plugin-persistedstate`
- 多语言通过 `vue-i18n` + `src/locale/` 管理

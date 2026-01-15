## 项目概览（前端 / App / UniApp 项目）

- **项目名称**: EasyUniapp2
- **技术栈**: UniApp / UniBest + Vue 3 + TypeScript
- **目标平台**: iOS / Android 移动 App

## 目录结构（关键目录）

- `src/`：业务源码根目录
- `src/pages/`：页面级视图
- `src/components/`：通用业务组件
- `src/store/`：状态管理（如有）
- `src/api/`：接口封装
- `src/utils/`：工具方法
- `manifest.config.ts`：UniApp / UniBest 清单与运行配置
- `pages.config.ts`：页面与路由相关配置
- `uno.config.ts`：UnoCSS / 原子化样式配置
- `vite.config.ts`：Vite 构建与开发配置

## 构建与运行

- 本地开发：`pnpm dev`（具体以 `package.json` 为准）
- 生产构建：`pnpm build`
- 打包 App：使用 HBuilderX / CLI 结合 `manifest.config.ts` 进行打包

## 约定与规范

- 使用 TypeScript 编写业务代码，类型尽量完整。
- 组件命名、目录划分尽量语义化，方便检索。
- 与后端接口（EasyAdmin8-Laravel）交互的统一封装放在 `src/api/`。

## 后续文档索引（按需补充）

可在本目录新增更多文档，并在此处维护索引，例如：

- `architecture.md`：整体架构设计与模块划分
- `api-guidelines.md`：接口调用封装规范，以及与后端约定
- `state-management.md`：状态管理方案说明（如 Pinia / Vuex 等）
- `routing.md`：路由结构与页面跳转约定
- `build-and-release.md`：打包、发布流水线说明

> Cursor：当需要理解前端 / App / UniApp 项目的整体结构、技术栈或目录约定时，请优先从此文档开始阅读，并沿着这里维护的索引继续深入。



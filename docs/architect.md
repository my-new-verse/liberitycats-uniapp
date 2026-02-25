# 技术架构

## 整体分层

```
页面 / 组件层 (src/pages/, src/components/)
         ↓
Pinia 状态层 (src/store/)
         ↓
组合式函数层 (src/hooks/)
         ↓
API 服务层 (src/service/api/)
         ↓
HTTP 客户端层 (src/utils/http.ts, httpOut.ts)
         ↓
请求拦截层 (src/interceptors/request.ts)
         ↓
uni.request() → 后端服务
         ↓
响应处理 (401 自动登出，错误 Toast)
```

## 目录职责

| 目录 | 职责 |
|------|------|
| `src/pages/` | 主包页面，按功能子目录分组 |
| `src/pages-sub/` | 分包页面（减小主包体积） |
| `src/components/` | 跨页面通用业务组件 |
| `src/layouts/` | 页面布局容器 |
| `src/store/` | Pinia 全局状态 |
| `src/hooks/` | 封装异步请求/上传逻辑的组合函数 |
| `src/service/api/` | 后端接口定义，一个文件对应一个业务模块 |
| `src/interceptors/` | 请求拦截、路由守卫、设备兼容补丁 |
| `src/utils/` | 纯工具函数（HTTP 客户端、平台检测、工具方法） |
| `src/locale/` | 多语言资源文件 |
| `src/types/` | 全局 TypeScript 类型声明 |

## HTTP 客户端

### `src/utils/http.ts`（内部 API）
- 封装 `uni.request()`，返回 `Promise<IResData<T>>`
- HTTP 2xx 视为成功，其余抛出错误并弹 Toast
- 401 时自动清空 token 并跳转登录页
- 默认超时 30 秒
- 方法：`http.get(url, data)` / `http.post(url, data)` / `http(options)`

### `src/utils/httpOut.ts`（外部 API，如新闻）
- 用于第三方接口，不走内部拦截器
- 通过 `custom.isOutRequest: true` 标记跳过请求拦截
- 基础 URL 来自环境变量 `VITE_NEWS_HOST_URL`
- 超时 10 秒

## 拦截器

### `src/interceptors/request.ts`（HTTP 拦截）
- 将 `query` 对象序列化为 URL query string
- 非 `http://` 开头的路径自动拼接 `getEnvBaseUrl()` 前缀
- 注入 `platform` 请求头（区分端类型）
- 从 Pinia store 读取 token，注入 `Authorization: Bearer {token}`
- 超时统一设为 10 秒
- `custom.isOutRequest === true` 的请求跳过以上所有处理

### `src/interceptors/route.ts`（路由守卫）
- 黑名单模式：页面在 route-block 中声明 `needLogin: true` 才受保护
- 未登录访问受保护页面时，redirect 跳转至 `/pages/cats/login/login`
- 依赖 `useUserStore().isLogined` 判断登录状态

### `src/interceptors/prototype.ts`（设备兼容）
- 为不支持 `Array.prototype.at()` 的旧版 Android 设备注入 polyfill

## 状态管理（Pinia）

### `src/store/user.ts`
持久化存储（`pinia-plugin-persistedstate`，底层用 `uni.getStorageSync()`）。

**State 字段：**
```typescript
nickname, avatar, member_id, level
token                           // 认证 token
wallet_address                  // 已连接的加密钱包地址
Currency_unit                   // 货币偏好
login_account                   // 邮箱或社交账号
login_account_is_real_mail      // 0=虚拟邮箱, 1=真实邮箱
show_switch_virtual_account     // 是否显示切换虚拟账号入口
show_add_virtual_account        // 是否显示新增虚拟账号入口
bind_ar                         // AR 游戏绑定信息
```

**核心 Actions：**
- `loginByEmailCode(email, code)` — 邮箱验证码登录
- `loginByVirtualEmailCode(email, code)` — 虚拟邮箱登录
- `loginByDiscord(code)` — Discord OAuth 登录
- `loginByApple(info)` — Apple Sign-in
- `getUserInfo()` — 拉取并刷新用户信息
- `logout()` — 清空 token 与用户数据
- `logoffAccount()` — 永久注销账号
- `disconnectWallet()` — 解绑加密钱包
- `navigateToAfterLogin(url)` — 登录后跳转到目标页

## 组合式函数（Hooks）

### `useRequest<T>(asyncFunc, options?)`
统一管理异步请求的 loading / error / data 三态：
```typescript
const { loading, error, data, run } = useRequest(() => getUserInfoApi())
// options.immediate=true 可立即执行
```

### `useUpload<T>(formData?)`
图片选择 + 上传，封装平台差异（微信用 `chooseMedia`，其他用 `chooseImage`）：
```typescript
const { loading, error, data, run } = useUpload({ extra: 'value' })
// run() 弹选图框，上传至 VITE_UPLOAD_BASEURL
```

## 路由与布局

### 路由约定
- 使用 `@uni-helper/vite-plugin-uni-pages`，文件路径即路由
- 路由元信息（如 `needLogin: true`）写在 `.vue` 文件的 `<route-block>` 中
- 全局路由及 tabbar 配置在 `pages.config.ts`

### Tabbar（底部导航，共 5 项）
| 路径 | 页面 |
|------|------|
| `pages/tabbar/home` | 首页 |
| `pages/tabbar/mall` | 商城 |
| `pages/tabbar/game` | 游戏 |
| `pages/tabbar/discover` | 发现 |
| `pages/tabbar/my` | 我的 |

### 布局
- `default.vue` — 普通页面布局（配置 wot-design 主题）
- `default2.vue` — tabbar 页面专用布局
- `demo.vue` — 演示/调试布局

## 工具函数（`src/utils/index.ts`）

**导航：** `toUrl(url, needLogin?, redirect?)` / `navigateBack()` / `toAdUrl()`

**图片：** `getImageUrl(path, useCache?)` — OSS 图片处理 + 本地缓存（md5 索引）

**格式化：**
- `formatTime(time, format)` — Unix 时间戳格式化
- `formatRelativeTime(time, timeZone)` — 相对时间（"5 分钟前"、"昨天 14:30"）
- `formatNumber(num, digits)` — 去除尾零的数字格式化
- `formatWalletAddress(address, prefixLen, suffixLen)` — 钱包地址脱敏（`0x123...abcd`）
- `formatNickname(nickname, length)` — 昵称截断（兼容以太坊地址和邮箱格式）

**平台：** `src/utils/platform.ts` — `isH5` / `isApp` / `isMp` 布尔值

**Feature Flag：** `getServerOnOff(key, platformKey?, getValue?)` — 从系统配置接口读取功能开关

**OKX 钱包：** `openOkx(dappUrl)` — 深度链接唤起 OKX 钱包

## 国际化（i18n）

- 框架：`vue-i18n@9.1.9`
- 语言：`en`（英文）/ `zh-Hans`（简中）/ `zh-Hant`（繁中）/ `ja`（日文，配置中已注释）
- 模板中用 `{{ t('key') }}`，非模板中 `import { t } from '@/locale'`
- 支持参数插值：`t('time.minAgo', { n: 5 })` → `"5 min ago"`

## 构建配置

- **打包工具：** Vite 5 + `@dcloudio/vite-plugin-uni`
- **路由插件：** `@uni-helper/vite-plugin-uni-pages`
- **布局插件：** `@uni-helper/vite-plugin-uni-layouts`
- **CSS：** UnoCSS 原子类，配置在 `uno.config.ts`
- **easycom 自动导入：**
  - wot-design：`wd-*` → `wot-design-uni`
  - z-paging：`z-paging*` → `z-paging`
- **环境变量：** `VITE_BASE_URL`（API 基础地址）/ `VITE_UPLOAD_BASEURL` / `VITE_NEWS_HOST_URL`
- **代码规范：** ESLint + Prettier + Stylelint + commitlint，Git hooks 由 husky + lint-staged 驱动

## 主要依赖版本

| 包 | 版本 |
|----|------|
| `@dcloudio/uni-app` | 3.0.0 |
| `vue` | 3.4.21 |
| `typescript` | 5.7.2 |
| `pinia` | 2.0.36 |
| `vue-i18n` | 9.1.9 |
| `wot-design-uni` | 1.9.0 |
| `z-paging` | 2.8.4 |
| `unocss` | 0.58.9 |
| `dayjs` | 1.11.10 |
| `vite` | 5.2.8 |

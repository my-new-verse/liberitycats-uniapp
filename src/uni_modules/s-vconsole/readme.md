# s-vconsole App真机调试面板

`vConsole` 是 Tencent 开源的移动端调试面板。本插件面向 uni-app App-Plus 做了一层封装：默认创建一个独立的全局 Debug WebView，只运行一个 vConsole 实例，并把 App service 层的 `console`、`uni.request` 和 `uni` storage 同步到该面板。页面切换不会重复创建实例或更新隐藏页面。

## 命名说明

- 插件目录和插件 id 使用小写：`uni_modules/s-vconsole`、`id: "s-vconsole"`。
- 展示名和文档使用官方写法：`vConsole`，即 `v` 小写、`C` 大写。

## 特性

- 仅建议在 `APP-PLUS` 测试包/开发包启用。
- 内置 vConsole 文件，无需安装 npm 依赖。
- 默认使用独立的全局 Debug WebView，整个 App 只运行一个 vConsole 实例。
- 支持 `console.log/info/warn/error/debug`。
- 支持 `uni.request` 请求采集，包含请求头、请求体、响应、耗时、状态码。
- 支持 Log、Network、Storage 跨页面连续查看。
- 共享模式使用原生全局浮标作为入口，调试 WebView 平时隐藏，点击后才全屏显示。
- 支持将 `uni.setStorageSync/removeStorageSync/clearStorageSync` 的变更镜像到 Storage 面板的 LocalStorage。
- 支持按需关闭历史回放和位置记忆，减少调试包运行开销。
- 默认脱敏 `authorization`、`token`、`cookie` 请求/响应头。

## 推荐用法：Vue 3

在 `main.js` 或 `main.ts` 中安装插件：

```ts
import { createSSRApp } from 'vue'
import App from './App.vue'

// #ifdef APP-PLUS
import vConsole from '@/uni_modules/s-vconsole/js_sdk/s-vconsole'
// #endif

export function createApp() {
  const app = createSSRApp(App)

  // #ifdef APP-PLUS
  app.use(vConsole, {
    enabled: process.env.NODE_ENV !== 'production',
  })
  // #endif

  return {
    app,
  }
}
```

生产包建议关闭，避免把调试面板带到正式用户环境。`process.env.NODE_ENV` 在 uni-app Vue2/Vue3 项目中都可用；生产构建时为 `production`。

## 手动用法

如果你不想使用 `app.use`，可以手动安装：

```ts
// #ifdef APP-PLUS
import { installVConsole } from '@/uni_modules/s-vconsole/js_sdk/s-vconsole'

installVConsole({
  enabled: process.env.NODE_ENV !== 'production',
})
// #endif
```

默认 `shared` 模式不需要页面重复注入。如果关闭了 `lifecycle`，可以在 `App.vue` 的 `onShow` 里手动确保调试层存在：

```ts
// #ifdef APP-PLUS
import { injectVConsole } from '@/uni_modules/s-vconsole/js_sdk/s-vconsole'
// #endif

export default {
  onShow() {
    // #ifdef APP-PLUS
    injectVConsole()
    // #endif
  },
}
```

## 配置项

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| enabled | `boolean \| () => boolean` | `true` | 是否启用插件 |
| captureConsole | `boolean` | `true` | 是否采集 console 日志 |
| captureRequest | `boolean` | `true` | 是否采集 `uni.request` |
| captureStorage | `boolean` | `true` | 是否把拦截到的 `uni` storage 变更镜像到 Storage 面板的 LocalStorage |
| autoInject | `boolean` | `true` | 安装时是否立即注入 vConsole |
| lifecycle | `boolean` | `true` | 使用 `app.use` 时是否自动维护全局调试层或页面注入 |
| injectDelay | `number` | `300` | 延迟二次注入时间，单位 ms |
| injectThrottle | `number` | `1000` | 自动补注入失败后的重试节流时间，单位 ms |
| webviewScope | `'shared' \| 'active' \| 'all'` | `'shared'` | `shared` 使用唯一全局实例；`active` 注入当前页；`all` 保留旧版全量广播行为 |
| sharedWebview | `object` | 见下文 | 全局 Debug WebView 路径、原生浮标尺寸/边距/配色以及全屏样式 |
| scriptPath | `string` | - | 自定义单个 `vconsole.min.js` 路径 |
| scriptPaths | `string[]` | 内置路径列表 | 自定义多个候选加载路径 |
| theme | `string` | `light` | vConsole 主题 |
| persistLogs | `boolean` | `true` | 是否跨页面回放 Log 历史 |
| persistNetwork | `boolean` | `true` | 是否跨页面回放 Network 历史 |
| persistStorage | `boolean` | `true` | 是否跨页面回放镜像的 Storage 记录 |
| persistSwitchPosition | `boolean` | `true` | 是否记住共享原生浮标或页面内浮标的位置 |
| log | `object` | `{ maxLogNumber: 200 }` | vConsole log 配置 |
| network | `object` | `{ maxNetworkNumber: 100 }` | vConsole network 配置 |
| vConsoleOptions | `object` | `{}` | 透传给 `new VConsole()` 的其它配置 |
| maskHeaderKeys | `Array<string \| RegExp>` | `['authorization', 'token', 'cookie']` | 需要脱敏的 header key |

共享浮标默认位于右下角，可以按业务页面的安全区域调整：

```ts
app.use(vConsole, {
  webviewScope: 'shared',
  sharedWebview: {
    width: 82,
    height: 36,
    right: 10,
    bottom: 10,
    draggable: true,
    longPressToHide: true,
    longPressDuration: 700,
    showLauncher: true,
  },
})
```

不需要显示浮标时，可以在配置中默认关闭：

```ts
app.use(vConsole, {
  sharedWebview: {
    showLauncher: false,
  },
})
```

也可以在运行时隐藏或恢复，状态会被记住：

```ts
import {
  hideVConsoleLauncher,
  showVConsoleLauncher,
} from '@/uni_modules/s-vconsole/js_sdk/s-vconsole'

hideVConsoleLauncher()
showVConsoleLauncher()
```

用户长按浮标约 `700ms` 会弹出隐藏确认框。确认后仅隐藏本次 App 运行，重新启动应用会自动恢复；业务代码也可以调用 `showVConsoleLauncher()` 立即恢复。拖动浮标时会自动取消长按识别。可通过 `longPressToHide: false` 关闭此交互。

## 静态资源路径

插件默认会尝试加载：

```text
uni_modules/s-vconsole/static/vendor/vconsole.min.js
_www/uni_modules/s-vconsole/static/vendor/vconsole.min.js
_www/uni_modules/s-vconsole/static/s-vconsole.html
static/vendor/vconsole.min.js
_www/static/vendor/vconsole.min.js
```

如果你的 App 构建后资源路径特殊，可以手动指定：

```ts
app.use(vConsole, {
  scriptPath: '_www/uni_modules/s-vconsole/static/vendor/vconsole.min.js',
})
```

## 注意事项

- 默认的 `shared` 模式创建一个独立 WebView 作为全局调试层，并使用 `plus.nativeObj.View` 绘制入口。调试 WebView 平时完全隐藏，不会形成透明蒙层或拦截业务页面点击。
- 原生浮标沿用 vConsole 的绿色 `vConsole` 样式、正常字重和圆角，支持拖动、屏幕边界限制、位置记忆以及长按隐藏。点击后显示全屏调试 WebView并暂时隐藏浮标；关闭 vConsole 后调试 WebView 隐藏并恢复浮标。
- `active` 模式用于不希望创建独立 WebView 的项目；`all` 模式会持续更新所有存活页面，页面栈较深时开销较大。
- Network 面板采集的是 `uni.request`。如果你使用 axios，需要确保 axios adapter 最终走的是 `uni.request`。
- vConsole 原生 Storage 面板查看的是 WebView 的 cookie/localStorage/sessionStorage；`uni.setStorageSync` 写入的是 uni-app storage，插件会把拦截到的变更镜像为 LocalStorage 中的 `uni-storage:*` key。
- 请不要在正式生产包默认开启，避免暴露接口信息。

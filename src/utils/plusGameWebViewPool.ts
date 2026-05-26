// utils/plusGameWebViewPool.ts
// 扩展 Plus 对象类型，避免 TS 报错
declare const plus: any

// 定义游戏类型字面量类型
export type GameType = 'MATCH_THREE' | 'JUMP'

// 扩展 GameConfig 接口以支持 gameVersion
export interface GameConfig {
  gameType: GameType
  url: string
  tempToken?: string
}

// 全局常量配置
const WEBVIEW_ID_MAP: Record<GameType, string> = {
  MATCH_THREE: 'game-webview-match-three',
  JUMP: 'game-webview-jump',
}
const PRELOAD_DELAY_MS = 2000 // App启动后延迟2秒预加载，不影响主流程
const MAX_RETRY_COUNT = 3 // 单游戏最大重试次数
const RETRY_INTERVAL_BASE = 2000 // 重试基础间隔（指数递增）

// 全局状态管理
interface WebViewState {
  instance: any | null // PlusWebviewObject类型在非App环境下无法定义
  config: GameConfig | null
  isPreloading: boolean
  isLoaded: boolean
  retryCount: number
  gameVersion: string | null // 新增：存储游戏版本号
}

const webViewPool: Record<GameType, WebViewState> = {
  MATCH_THREE: {
    instance: null,
    config: null,
    isPreloading: false,
    isLoaded: false,
    retryCount: 0,
    gameVersion: null,
  },
  JUMP: {
    instance: null,
    config: null,
    isPreloading: false,
    isLoaded: false,
    retryCount: 0,
    gameVersion: null,
  },
}

/**
 * 获取内容区（安全区以内）的布局样式，单位 px
 * 使用 top + height 而非 top + bottom，避免首次布局时底部留白
 */
const getContentStyle = () => {
  const sysInfo = uni.getSystemInfoSync()
  const safeAreaTop = sysInfo.safeAreaInsets?.top || 0
  const safeAreaBottom = sysInfo.safeAreaInsets?.bottom || 0
  // 用负偷移延伸覆盖全屏（含状态栏 + home indicator）
  // 注意：有注入返回按鈕后，popGesture 不再是唯一退出方式，全屏优先
  return {
    top: `${-safeAreaTop}px`,
    bottom: `${-safeAreaBottom}px`,
    width: '100%',
    popGesture: 'none', // 已有注入按鈕，禁用侧滑退出防误触
    hardwareAccelerated: true,
    bounce: 'none',
    scrollIndicator: 'none',
  }
}

/**
 * 向 WebView 页面底部注入返回按鈕
 * 点击后调用 plus.webview.currentWebview().close() 触发 close 事件 → uni.navigateBack()
 */
const injectBackButton = (webView: any) => {
  const sysInfo = uni.getSystemInfoSync()
  const safeAreaBottom = sysInfo.safeAreaInsets?.bottom || 0
  const safeAreaTop = sysInfo.safeAreaInsets?.top || 0
  // 按鈕在 home indicator 上方留型足够间距
  const btnBottom = safeAreaBottom + 24

  const script = `
(function() {
  if (document.getElementById('__uni_back_btn')) return;
  var btn = document.createElement('div');
  btn.id = '__uni_back_btn';
  btn.style.cssText = [
    'position:fixed',
    'top:${safeAreaTop}px',
    'left:16px',
    'z-index:2147483647',
    'width:44px',
    'height:44px',
    'background:rgba(0,0,0,0.45)',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'cursor:pointer',
    '-webkit-tap-highlight-color:transparent',
    'box-shadow:0 2px 8px rgba(0,0,0,0.25)'
  ].join(';');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
  btn.addEventListener('click', function() {
    if (window.plus) {
      window.plus.webview.currentWebview().close();
    }
  });
  document.body.appendChild(btn);
})();
  `
  webView.evalJS(script)
}

const createGameWebView = (gameType: GameType, config: GameConfig) => {
  const wvStyle = getContentStyle()
  console.log('wvStyle', wvStyle)
  return plus.webview.create(config.url, WEBVIEW_ID_MAP[gameType], wvStyle)
}

/**
 * 绑定WebView生命周期事件
 */
const bindWebViewEvents = (gameType: GameType, webView: any) => {
  const state = webViewPool[gameType]

  // 加载成功
  webView.addEventListener('loaded', () => {
    state.isPreloading = false
    state.isLoaded = true
    state.retryCount = 0
    console.log(`[GamePool] ${gameType} 预加载完成`)
    // 注入返回按鈕
    injectBackButton(webView)
  })

  // 加载失败
  webView.addEventListener('error', (err: any) => {
    state.isPreloading = false
    console.error(`[GamePool] ${gameType} 加载失败:`, err)

    // 自动重试（指数间隔）
    if (state.retryCount < MAX_RETRY_COUNT) {
      state.retryCount++
      const delay = RETRY_INTERVAL_BASE * state.retryCount
      console.log(
        `[GamePool] ${gameType} ${delay}ms后重试 (${state.retryCount}/${MAX_RETRY_COUNT})`,
      )

      setTimeout(() => {
        if (state.config && state.instance) {
          state.isPreloading = true
          state.instance.loadURL(state.config.url)
        }
      }, delay)
    }
  })
  webView.addEventListener('close', () => {
    console.log(`[GamePool] ${gameType} WebView已关闭，返回上一页面`)
    // 重置池状态，以便下次重新创建实例
    state.instance = null
    state.isPreloading = false
    state.isLoaded = false
    state.retryCount = 0
    uni.navigateBack() // 页面栈回退
  })
  let startX = 0
  webView.addEventListener('touchstart', function (e: TouchEvent) {
    if (e.touches && e.touches.length > 0) {
      startX = e.touches[0].clientX
    }
  })
  webView.addEventListener('touchend', function (e: TouchEvent) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      const endX = e.changedTouches[0].clientX
      if (endX - startX > 50 && startX < 30) {
        console.log('左边缘右滑超过50px')
        // 左边缘右滑超过50px
        // 询问 Webview 内部能否后退
        // wv.evalJS('window.history.length > 1', function (res) {
        //   if (res) {
        //     wv.evalJS('history.back()')
        //   } else {
        //     wv.hide('auto') // 无历史则隐藏窗口
        //   }
        // })
      }
    }
  })
}

/**
 * 检查并更新游戏版本（新增功能）
 */
export const checkAndUpdateGameVersion = async (
  gameType: GameType,
  newConfig: GameConfig,
  newVersion: string,
) => {
  // 仅在App端运行
  if (typeof plus === 'undefined') return

  const state = webViewPool[gameType]
  const currentVersion = state.gameVersion

  // 如果版本相同，无需更新
  if (currentVersion === newVersion) {
    console.log(`[GamePool] ${gameType} 版本未变化，跳过更新: ${newVersion}`)
    return
  }

  console.log(`[GamePool] ${gameType} 检测到版本更新: ${currentVersion} -> ${newVersion}`)

  // 更新配置和版本号
  state.config = newConfig
  state.gameVersion = newVersion

  // 如果已有实例，重新加载
  if (state.instance) {
    console.log(`[GamePool] ${gameType} 重新加载WebView`)
    state.isPreloading = true
    state.isLoaded = false
    state.retryCount = 0
    state.instance.loadURL(newConfig.url)
  } else {
    // 如果没有实例，创建新的预加载实例
    console.log(`[GamePool] ${gameType} 创建新的预加载实例`)
    state.isPreloading = true
    state.retryCount = 0
    const webView = createGameWebView(gameType, newConfig)
    bindWebViewEvents(gameType, webView)
    state.instance = webView
    webView.loadURL(newConfig.url)
  }
}

/**
 * 初始化双WebView预加载（App启动时调用）
 */
export const initDualGamePreload = async (gameConfigs: [GameConfig, GameConfig]) => {
  // 仅在App端运行
  if (typeof plus === 'undefined') return

  for (const config of gameConfigs) {
    const gameType = config.gameType
    const state = webViewPool[gameType]

    // 防止重复初始化
    if (state.instance || state.isPreloading) continue

    state.config = config
    state.isPreloading = true
    state.retryCount = 0
    // 注意：这里暂时无法获取 gameVersion，需要通过其他方式传入

    // 创建WebView并绑定事件
    const webView = createGameWebView(gameType, config)
    console.log('webView', webView)
    bindWebViewEvents(gameType, webView)
    state.instance = webView

    // 开始加载
    webView.loadURL(config.url)
  }
}

/**
 * 显示指定游戏的WebView（入口页面调用）
 */
export const showGameWebView = (gameType: GameType): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof plus === 'undefined') {
      resolve(false)
      return
    }

    // 统一用 getContentStyle() 计算内容区样式（top + height，避免 bottom 首次布局留白）
    const fullScreenStyle = getContentStyle()

    const state = webViewPool[gameType]

    // 兜底1：未初始化，先创建加载，等加载完再显示（避免白屏/留白）
    if (!state.instance) {
      if (!state.config) {
        resolve(false)
        return
      }
      state.isPreloading = true
      console.log(`[GamePool] ${gameType} 未初始化，创建并等待加载后显示`)
      const webView = createGameWebView(gameType, state.config)
      bindWebViewEvents(gameType, webView)
      state.instance = webView
      webView.loadURL(state.config.url)
      // 不立即 show，等 isLoaded 后再显示，与兜底2共用同一段逻辑
    }

    // 兜底1 / 兜底2：加载中，等待加载完成后再显示（无论是新建还是预加载中）
    if (state.isPreloading) {
      const checkLoaded = setInterval(() => {
        if (state.isLoaded) {
          clearInterval(checkLoaded)
          // 确保显示时WebView铺满全屏（含安全区）
          state.instance.setStyle(fullScreenStyle)
          state.instance?.show('slide-in-right')
          resolve(true)
        }
      }, 100)
      // 10秒超时
      setTimeout(() => {
        clearInterval(checkLoaded)
        resolve(false)
      }, 10000)
      return
    }
    console.log(`[GamePool] ${gameType} 已加载，直接显示.`, fullScreenStyle)
    // 正常流程：直接显示已加载的WebView
    // 确保WebView铺满全屏（含安全区），popGesture保持一致
    state.instance.setStyle(fullScreenStyle)
    state.instance.show('slide-in-right')
    resolve(true)
  })
}

/**
 * 隐藏所有游戏WebView（返回时调用）
 */
export const hideAllGameWebViews = () => {
  if (typeof plus === 'undefined') return

  Object.values(WEBVIEW_ID_MAP).forEach((webviewId) => {
    const webView = plus.webview.getWebviewById(webviewId)
    if (webView) {
      webView.hide()
      // 不要重置样式，避免影响popGesture等设置
      // webView.setStyle({ top: '100%' })
    }
  })
}

/**
 * 销毁所有WebView（App退出时调用）
 */
export const destroyAllGameWebViews = () => {
  if (typeof plus === 'undefined') return

  Object.values(WEBVIEW_ID_MAP).forEach((webviewId) => {
    plus.webview.close(webviewId)
  })

  // 重置状态
  Object.keys(webViewPool).forEach((key) => {
    const gameType = key as GameType
    webViewPool[gameType] = {
      instance: null,
      config: null,
      isPreloading: false,
      isLoaded: false,
      retryCount: 0,
      gameVersion: null,
    }
  })
}

/**
 * 检查游戏预加载状态
 */
export const getGamePreloadStatus = (gameType: GameType) => {
  const state = webViewPool[gameType]
  return {
    isPreloading: state.isPreloading,
    isLoaded: state.isLoaded,
    hasError: state.retryCount >= MAX_RETRY_COUNT,
    gameVersion: state.gameVersion,
  }
}

/**
 * 调度预加载（处理网络延迟和启动优先级）
 */
export const scheduleDualGamePreload = (gameConfigs: [GameConfig, GameConfig]) => {
  // 先检查网络状态
  uni.getNetworkType({
    success: (res) => {
      if (res.networkType === 'none') {
        // 无网络时，监听网络恢复自动预加载
        const networkListener = uni.onNetworkStatusChange((status) => {
          if (status.isConnected) {
            setTimeout(() => initDualGamePreload(gameConfigs), 1000)
            // networkListener.off() // uni.onNetworkStatusChange 返回的是 void，没有 off 方法
          }
        })
        return
      }

      // 网络正常，延迟预加载
      setTimeout(() => initDualGamePreload(gameConfigs), PRELOAD_DELAY_MS)
    },
  })
}

// utils/plusGameWebViewPool.ts
import type { GameType, GameConfig } from '@/service/api/game'

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
  instance: PlusWebviewObject | null
  config: GameConfig | null
  isPreloading: boolean
  isLoaded: boolean
  retryCount: number
}

const webViewPool: Record<GameType, WebViewState> = {
  MATCH_THREE: {
    instance: null,
    config: null,
    isPreloading: false,
    isLoaded: false,
    retryCount: 0,
  },
  JUMP: {
    instance: null,
    config: null,
    isPreloading: false,
    isLoaded: false,
    retryCount: 0,
  },
}

/**
 * 创建并配置单个游戏WebView
 */
const createGameWebView = (gameType: GameType, config: GameConfig): PlusWebviewObject => {
  return plus.webview.create(config.url, WEBVIEW_ID_MAP[gameType], {
    top: '0px',
    left: '0px',
    width: '100%',
    height: '100%',
    visible: false, // 初始不可见
    popGesture: 'none', // 禁用侧滑返回
    bounce: 'none', // 禁用页面回弹
    scrollIndicator: 'none', // 隐藏滚动条
    hardwareAccelerated: true, // 强制开启硬件加速（游戏必备）
    allowInlineMediaPlayback: true, // 允许内联媒体自动播放
    mediaPlaybackRequiresUserAction: false, // 无需用户交互即可播放音频
    allowFileAccess: true,
    allowUniversalAccessFromFileURLs: true,
    cacheMode: 'default', // 开启默认缓存策略
  })
}

/**
 * 绑定WebView生命周期事件
 */
const bindWebViewEvents = (gameType: GameType, webView: PlusWebviewObject) => {
  const state = webViewPool[gameType]

  // 加载成功
  webView.addEventListener('loaded', () => {
    state.isPreloading = false
    state.isLoaded = true
    state.retryCount = 0
    console.log(`[GamePool] ${gameType} 预加载完成`)
  })

  // 加载失败
  webView.addEventListener('error', (err) => {
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

    // 创建WebView并绑定事件
    const webView = createGameWebView(gameType, config)
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

    const state = webViewPool[gameType]

    // 兜底1：未初始化，立即创建并显示
    if (!state.instance) {
      if (!state.config) {
        resolve(false)
        return
      }
      state.isPreloading = true
      const webView = createGameWebView(gameType, state.config)
      bindWebViewEvents(gameType, webView)
      state.instance = webView
      webView.loadURL(state.config.url)
      webView.show()
      resolve(true)
      return
    }

    // 兜底2：加载中，等待加载完成后显示
    if (state.isPreloading) {
      const checkLoaded = setInterval(() => {
        if (state.isLoaded) {
          clearInterval(checkLoaded)
          state.instance?.show()
          plus.webview.bringToFront(WEBVIEW_ID_MAP[gameType])
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

    // 正常流程：直接显示已加载的WebView
    state.instance.show()
    plus.webview.bringToFront(WEBVIEW_ID_MAP[gameType])
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
      plus.webview.sendToBack(webviewId)
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
            networkListener.off()
          }
        })
        return
      }

      // 网络正常，延迟预加载
      setTimeout(() => initDualGamePreload(gameConfigs), PRELOAD_DELAY_MS)
    },
  })
}

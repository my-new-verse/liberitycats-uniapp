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
/** Unity WebGL 在隐藏 WebView 中会丢失 GL 上下文，禁止在不可见时 loadURL */
const UNITY_WEBGL_SAFE_PRELOAD = true
// 全局状态管理
interface WebViewState {
  instance: any | null // PlusWebviewObject类型在非App环境下无法定义
  config: GameConfig | null
  isPreloading: boolean
  isLoaded: boolean
  retryCount: number
  gameVersion: string | null // 新增：存储游戏版本号
  isDestroying: boolean // 程序主动销
}

const webViewPool: Record<GameType, WebViewState> = {
  MATCH_THREE: {
    instance: null,
    config: null,
    isPreloading: false,
    isLoaded: false,
    retryCount: 0,
    gameVersion: null,
    isDestroying: false,
  },
  JUMP: {
    instance: null,
    config: null,
    isPreloading: false,
    isLoaded: false,
    retryCount: 0,
    gameVersion: null,
    isDestroying: false,
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
    popGesture: 'close', // 已有注入按鈕，禁用侧滑退出防误触
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
    'top:${safeAreaTop + 20}px',
    'left:16px',
    'z-index:2147483647',
    'width:44px',
    'height:44px',
    'border-radius:50%',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'cursor:pointer',
    '-webkit-tap-highlight-color:transparent',
  ].join(';');
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 49 49" fill="none"><path d="M16.0141 4.08103C16.3616 4.00265 16.7061 3.9833 17.0389 4.01363H17.3951C19.2839 4.01369 20.8927 5.20945 21.5082 6.88477H29.9665C31.7814 6.88477 33.2527 8.35605 33.2527 10.171V20.2745H35.114V15.756C35.114 14.6934 36.4749 14.253 37.0972 15.1142L44.4377 25.2755C44.7139 25.6582 44.7139 26.1753 44.4377 26.5581L37.0972 36.7194C36.475 37.5807 35.1141 37.14 35.114 36.0775V31.559H33.2527V40.8956C33.2527 42.7105 31.7814 44.1818 29.9665 44.1818H21.5734C21.3749 44.4606 21.0497 44.6428 20.6813 44.6428H5C4.44771 44.6428 4 44.1951 4 43.6428V7.59222C4 7.12477 4.32384 6.71968 4.77982 6.61676L16.0141 4.08103Z" fill="black"/><path d="M15.5742 2.12988C16.0915 2.01324 16.6064 1.97909 17.1055 2.01367H17.3955C19.6251 2.01386 21.5826 3.15733 22.7227 4.88477H29.9668C32.8861 4.88494 35.2529 7.25155 35.2529 10.1709V12.8115C36.4347 12.4276 37.8374 12.7246 38.7178 13.9424L38.7188 13.9434L46.0586 24.1045L46.0596 24.1055C46.8398 25.1869 46.8401 26.647 46.0596 27.7285L46.0586 27.7295L38.7188 37.8906C37.8378 39.1101 36.4348 39.4051 35.2529 39.0205V40.8955C35.2529 43.8149 32.8861 46.1815 29.9668 46.1816H22.3057C21.8347 46.4728 21.2786 46.6425 20.6816 46.6426H5C3.34314 46.6426 2 45.2994 2 43.6426V7.5918C2.0002 6.18962 2.97203 4.97475 4.33984 4.66602L15.5732 2.12988H15.5742Z" stroke="white" stroke-opacity="0.9" stroke-width="4"/><path d="M30.2531 7.88428C31.3576 7.88431 32.2531 8.77973 32.2531 9.88428V41.1821C32.2528 42.2865 31.3575 43.1821 30.2531 43.1821H5.26282V7.88428H30.2531Z" fill="url(#paint0_linear_2132_438)" stroke="#FFC851" stroke-width="2"/><path d="M17.7768 4.01367H16.6348V44.6428H18.4933H20.7768C21.3291 44.6428 21.7768 44.1951 21.7768 43.6428V8.01367C21.7768 5.80453 19.9859 4.01367 17.7768 4.01367Z" fill="#FFBB55"/><path d="M16.363 4.00199L4.00061 6.79229V44.6429H19.0235C19.5758 44.6429 20.0235 44.1952 20.0235 43.6429V6.92838C20.0235 5.00505 18.2391 3.57853 16.363 4.00199Z" fill="#FADF73"/><circle cx="16.6347" cy="24.7644" r="1.64791" fill="#FE6923"/><circle cx="16.4681" cy="24.5423" r="1.37433" fill="#FFA57B"/><path d="M35.1139 15.4606C35.1139 14.4905 36.3564 14.0883 36.9244 14.8747L44.4781 25.3308C44.7304 25.6802 44.7303 26.1522 44.4781 26.5017L36.9244 36.9577C36.3564 37.744 35.1143 37.3425 35.1139 36.3728V31.5583H26.7311C25.6265 31.5583 24.7311 30.6629 24.7311 29.5583V22.2741C24.7311 21.1696 25.6265 20.2741 26.7311 20.2741H35.1139V15.4606Z" fill="#FE6923"/><defs><linearGradient id="paint0_linear_2132_438" x1="18.7579" y1="6.88428" x2="18.7579" y2="44.1817" gradientUnits="userSpaceOnUse"><stop stop-color="#D3B18B"/><stop offset="1" stop-color="#AD7C43"/></linearGradient></defs></svg>';
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

const createGameWebView = (gameType: GameType) => {
  const wvStyle = getContentStyle()
  // 仅创建空壳，不在隐藏态加载 Unity URL（避免 WebGL shader 初始化失败）
  return plus.webview.create('', WEBVIEW_ID_MAP[gameType], wvStyle)
}
/**
 * 轻量预取：只缓存静态资源，不创建 WebView、不执行页面脚本（含 Unity WebGL）
 */
const prefetchGameUrl = (url: string) => {
  if (!url || typeof plus?.webview?.prefetchURL !== 'function') return
  try {
    plus.webview.prefetchURL(url)
    console.log('[GamePool] prefetchURL:', url)
  } catch (error) {
    console.warn('[GamePool] prefetchURL failed:', error)
  }
}
/**
 * 更新游戏配置（打开前刷新 token / URL）
 */
export const setGameWebViewConfig = (gameType: GameType, config: GameConfig) => {
  const state = webViewPool[gameType]
  state.config = config
  if (UNITY_WEBGL_SAFE_PRELOAD) {
    prefetchGameUrl(config.url)
  }
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
    console.log(`[GamePool] ${gameType} 加载完成`)
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
    console.log(`[GamePool] ${gameType} WebView已关闭`)
    const wasDestroying = state.isDestroying
    // 重置池状态，以便下次重新创建实例
    state.instance = null
    state.isPreloading = false
    state.isLoaded = false
    state.retryCount = 0
    state.isDestroying = false
    if (!wasDestroying) {
      uni.navigateBack()
    }
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
  state.isPreloading = false
  state.isLoaded = false
  state.retryCount = 0

  if (state.instance) {
    try {
      state.isDestroying = true
      state.instance.close()
    } catch (error) {
      state.isDestroying = false
      console.warn(`[GamePool] ${gameType} 关闭旧实例失败:`, error)
    }
    state.instance = null
  }

  if (UNITY_WEBGL_SAFE_PRELOAD) {
    prefetchGameUrl(newConfig.url)
    console.log(`[GamePool] ${gameType} 版本更新，已 prefetch，下次打开时加载`)
  }
}

/**
 * 初始化双游戏预加载（App 启动 / 登录后）
 * 仅 prefetchURL + 保存配置，不在隐藏 WebView 中运行 Unity
 */
export const initDualGamePreload = async (gameConfigs: GameConfig[]) => {
  // 仅在App端运行
  if (typeof plus === 'undefined') return

  for (const config of gameConfigs) {
    const gameType = config.gameType
    const state = webViewPool[gameType]
    if (state.isPreloading) continue

    state.config = config
    state.retryCount = 0
    state.isPreloading = false
    state.isLoaded = false
    if (UNITY_WEBGL_SAFE_PRELOAD) {
      prefetchGameUrl(config.url)
      console.log(`[GamePool] ${gameType} 已 prefetch（不执行 Unity）`)
      continue
    }
    if (state.instance) continue
    state.isPreloading = true
    const webView = createGameWebView(gameType)
    bindWebViewEvents(gameType, webView)
    state.instance = webView

    webView.loadURL(config.url)
  }
}

/**
 * 在可见 WebView 中开始加载（须在 show 之后调用，供 Unity WebGL 使用）
 */
const startGameWebViewLoad = (gameType: GameType) => {
  const state = webViewPool[gameType]
  if (!state.config?.url) return false
  if (state.isLoaded && state.instance) {
    return true
  }
  if (!state.instance) {
    const webView = createGameWebView(gameType)
    bindWebViewEvents(gameType, webView)
    state.instance = webView
  }
  if (!state.isPreloading && !state.isLoaded) {
    state.isPreloading = true
    state.instance.loadURL(state.config.url)
  }
  return true
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
    if (!state.config?.url) {
      resolve(false)
      return
    }
    const presentWebView = () => {
      state.instance.setStyle(fullScreenStyle)
      state.instance.show('slide-in-right')
    }
    // 已加载完成：直接展示
    if (state.isLoaded && state.instance) {
      console.log(`[GamePool] ${gameType} 已加载，直接显示`)
      presentWebView()
      resolve(true)
      return
    }
    if (!state.instance) {
      const webView = createGameWebView(gameType)
      bindWebViewEvents(gameType, webView)
      state.instance = webView
    }

    console.log(`[GamePool] ${gameType} 可见态加载 Unity`)
    presentWebView()
    startGameWebViewLoad(gameType)
    if (state.isLoaded) {
      resolve(true)
      return
    }
    const checkLoaded = setInterval(() => {
      if (state.isLoaded) {
        clearInterval(checkLoaded)
        resolve(true)
      }
    }, 100)
    setTimeout(() => {
      clearInterval(checkLoaded)
      if (!state.isLoaded) {
        console.error(`[GamePool] ${gameType} 加载超时`)
        resolve(false)
      }
    }, 30000)
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
    isDestroying: false,
  }
}

/**
 * 调度预加载（处理网络延迟和启动优先级）
 */
export const scheduleDualGamePreload = (gameConfigs: GameConfig[]) => {
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

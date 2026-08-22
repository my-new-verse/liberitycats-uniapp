import { getGameParamsApi } from '@/service/api/game'
import { buildGameUrlWithAudioSetting } from '@/utils/gameUrl'
import {
  clearIosGamePreloadCompleted,
  hasCompletedIosGamePreload,
  iosGameResourceLoadState,
  markIosGamePreloadCompleted,
} from '@/utils/webviewResourceCache'

declare const plus: any

export type IosGameType = 'MATCH_THREE' | 'JUMP'

interface GameWebViewMessage {
  type?: string
}

interface ActivePreload {
  webviewId: string
  originId: string
  gameType: IosGameType
  gameVersion: string
}

let activePreload: ActivePreload | null = null
let listenerRegistered = false
let preloadRequestSequence = 0

const parseMessage = (event: any): GameWebViewMessage | undefined => {
  const bridgeData = event?.data?.args?.data
  const candidates = [bridgeData?.arg?.data, bridgeData?.arg, bridgeData, event?.data, event]
  for (const candidate of candidates) {
    try {
      const message = typeof candidate === 'string' ? JSON.parse(candidate) : candidate
      if (message?.type) return message
    } catch {
      // 继续尝试其他 uni.postMessage 包装层级。
    }
  }
}

const completeActivePreload = (originId?: string) => {
  if (!activePreload) return
  if (originId && originId !== activePreload.originId) return
  markIosGamePreloadCompleted(activePreload.gameVersion)
  destroyIosPreloadedGameWebviews()
}

const failActivePreload = (originId?: string) => {
  if (originId && activePreload && originId !== activePreload.originId) return
  clearIosGamePreloadCompleted()
  iosGameResourceLoadState.value = 'failed'
  destroyIosPreloadedGameWebviews()
}

const registerMessageListener = () => {
  if (listenerRegistered) return
  listenerRegistered = true
  plus.globalEvent.addEventListener('plusMessage', (event: any) => {
    if (!activePreload) return
    if (!event.originId || event.originId !== activePreload.originId) return
    const message = parseMessage(event)
    if (message?.type === 'GameLoadCompleted') completeActivePreload(event.originId)
    else if (message?.type === 'GameLoadFailed') failActivePreload(event.originId)
  })
}

const hideAndCloseWebview = (webview: any) => {
  if (!webview) return
  try {
    webview.setVisible?.(false)
    webview.hide?.('none', 0)
    webview.close?.('none', 0)
  } catch (error) {
    console.warn('[Preload] 关闭 iOS 预加载 WebView 失败', error)
  }
}

/** 只销毁资源预加载 WebView，不处理正式游戏页的子 WebView。 */
export const destroyIosPreloadedGameWebviews = () => {
  // #ifdef APP-PLUS
  const ids = new Set<string>(['preload-webview-MATCH_THREE', 'preload-webview-JUMP'])
  if (activePreload) ids.add(activePreload.webviewId)
  console.log('销毁资源预加载 WebView')
  ids.forEach((id) => hideAndCloseWebview(plus.webview.getWebviewById(id)))
  activePreload = null
  // #endif
}

/** 获取最新版本；版本变更时重建隐藏 WebView，直到收到 GameLoadCompleted。 */
export const preloadIosGameWebView = async (
  gameType: IosGameType = 'MATCH_THREE',
): Promise<void> => {
  // #ifdef APP-PLUS
  const requestSequence = ++preloadRequestSequence
  try {
    registerMessageListener()
    const res = await getGameParamsApi(gameType)
    // 并发检查时只允许最后一次请求更改 WebView，避免旧响应覆盖新版本。
    if (requestSequence !== preloadRequestSequence) return

    const gameVersion = res.data?.gameVersion || ''
    const jumpUrl = buildGameUrlWithAudioSetting(res.data?.jumpUrl || '')
    if (!gameVersion || !jumpUrl) throw new Error(`iOS 游戏参数不完整: ${gameType}`)

    if (hasCompletedIosGamePreload(gameVersion)) {
      if (activePreload && activePreload.gameVersion !== gameVersion) {
        destroyIosPreloadedGameWebviews()
      }
      iosGameResourceLoadState.value = 'ready'
      return
    }

    const activeWebview = activePreload
      ? plus.webview.getWebviewById(activePreload.webviewId)
      : null
    if (activeWebview && activePreload?.gameVersion === gameVersion) {
      iosGameResourceLoadState.value = 'loading'
      return
    }

    clearIosGamePreloadCompleted()
    if (activePreload) {
      console.log(
        `[Preload] 检测到版本更新 ${activePreload.gameVersion} -> ${gameVersion}，立即销毁旧 WebView`,
      )
    }
    destroyIosPreloadedGameWebviews()
    iosGameResourceLoadState.value = 'loading'

    const safeVersion = gameVersion.replace(/[^a-zA-Z0-9_-]/g, '_')
    const webviewId = `preload-webview-${gameType}-${safeVersion}`
    const webview = plus.webview.create('', webviewId, {
      top: '-9999px',
      left: '-9999px',
      width: '1px',
      height: '1px',
      opacity: 0.01,
      plusrequire: 'ahead',
    })
    const originId = webview.__uuid__ || webview.id
    activePreload = { webviewId, originId, gameType, gameVersion }

    webview.addEventListener('titleUpdate', (event: { title?: string }) => {
      const title = event.title || webview.getTitle?.() || ''
      if (title.startsWith('__LIBERTYCATS_GAME_LOAD_COMPLETED__')) {
        completeActivePreload(originId)
      } else if (title.startsWith('__LIBERTYCATS_GAME_LOAD_FAILED__')) {
        failActivePreload(originId)
      }
    })
    webview.setJsFile('_www/static/game-message-bridge.js')
    webview.show('none', 0)
    console.log(`[Preload] ${gameType} ${gameVersion}:`, jumpUrl)
    webview.loadURL(jumpUrl)
  } catch (error) {
    if (requestSequence !== preloadRequestSequence) return
    console.error(`[Preload] ${gameType} 预加载失败:`, error)
    clearIosGamePreloadCompleted()
    iosGameResourceLoadState.value = 'failed'
    destroyIosPreloadedGameWebviews()
  }
  // #endif

  // #ifndef APP-PLUS

  // #endif
}

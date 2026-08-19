import { getGameParamsApi } from '@/service/api/game'
import { buildGameUrlWithAudioSetting } from '@/utils/gameUrl'
import {
  clearIosGamePreloadCompleted,
  hasCompletedIosGamePreload,
  iosGameResourceLoadState,
  markIosGamePreloadCompleted,
} from '@/utils/webviewResourceCache'

declare const plus: any

interface GameWebViewMessage {
  type?: string
}

const preloadOriginIds = new Set<string>()
const completedOriginIds = new Set<string>()
let listenerRegistered = false
let preloadPromise: Promise<void> | null = null

const notifyCompleted = (originId?: string) => {
  if (originId && completedOriginIds.has(originId)) return
  if (originId) completedOriginIds.add(originId)
  if (iosGameResourceLoadState.value !== 'failed') markIosGamePreloadCompleted()
}

const notifyFailed = () => {
  clearIosGamePreloadCompleted()
  iosGameResourceLoadState.value = 'failed'
}

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

const registerMessageListener = () => {
  if (listenerRegistered) return
  listenerRegistered = true
  plus.globalEvent.addEventListener('plusMessage', (event: any) => {
    if (event.originId && !preloadOriginIds.has(event.originId)) return
    const message = parseMessage(event)
    if (message?.type === 'GameLoadCompleted') notifyCompleted(event.originId)
    else if (message?.type === 'GameLoadFailed') notifyFailed()
  })
}

/** iOS 只用第一个有效游戏 URL 预热公共资源。 */
export const preloadIosGameWebView = (): Promise<void> => {
  // #ifdef APP-PLUS
  if (hasCompletedIosGamePreload()) {
    iosGameResourceLoadState.value = 'ready'
    return Promise.resolve()
  }
  if (preloadPromise) return preloadPromise

  preloadPromise = (async () => {
    registerMessageListener()
    const gameTypes = ['MATCH_THREE', 'JUMP'] as const
    for (const gameType of gameTypes) {
      try {
        const res = await getGameParamsApi(gameType)
        const jumpUrl = buildGameUrlWithAudioSetting(res.data.jumpUrl || '')
        if (!jumpUrl) continue

        const webviewId = `preload-webview-${gameType}`
        if (plus.webview.getWebviewById(webviewId)) return

        iosGameResourceLoadState.value = 'loading'
        const webView = plus.webview.create('', webviewId, {
          top: '0px',
          left: '0px',
          width: '1px',
          height: '1px',
          opacity: 0.01,
          plusrequire: 'ahead',
        })
        const originId = webView.__uuid__ || webView.id
        preloadOriginIds.add(originId)
        webView.addEventListener('titleUpdate', (event: { title?: string }) => {
          const title = event.title || webView.getTitle?.() || ''
          if (title.startsWith('__LIBERTYCATS_GAME_LOAD_COMPLETED__')) notifyCompleted(originId)
          else if (title.startsWith('__LIBERTYCATS_GAME_LOAD_FAILED__')) notifyFailed()
        })
        webView.setJsFile('_www/static/game-message-bridge.js')
        webView.show('none', 0)
        webView.loadURL(jumpUrl)
        return
      } catch (error) {
        console.error(`[Preload] ${gameType} 预加载失败:`, error)
        notifyFailed()
      }
    }
  })().finally(() => {
    preloadPromise = null
  })
  return preloadPromise
  // #endif

  // #ifndef APP-PLUS
  return Promise.resolve()
  // #endif
}

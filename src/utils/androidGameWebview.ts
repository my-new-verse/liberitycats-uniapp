declare const plus: any

const GAME_WEBVIEW_ID_PREFIX = 'game-native-webview-'

const getWebviewId = (webview: any): string => String(webview?.id || webview?.__uuid__ || '')

/** 关闭失去页面引用、但仍残留在全局列表中的 Android 游戏 WebView。 */
export const closeResidualAndroidGameWebviews = (): number => {
  if (typeof plus === 'undefined' || typeof plus.webview?.all !== 'function') return 0

  const webviews = (plus.webview.all() || []).filter((webview: any) =>
    getWebviewId(webview).startsWith(GAME_WEBVIEW_ID_PREFIX),
  )

  webviews.forEach((webview: any) => {
    const id = getWebviewId(webview)
    console.log('未关闭的webviewid', id)
    try {
      // 先移出触摸分发链路，再关闭原生实例。
      webview.setVisible?.(false)
      webview.hide?.('none', 0)
      webview.close?.('none', 0)
      console.warn('[GameWebview] 已清理残留 WebView:', id)
    } catch (error) {
      console.warn('[GameWebview] 清理残留 WebView 失败:', id, error)
    }
  })

  return webviews.length
}

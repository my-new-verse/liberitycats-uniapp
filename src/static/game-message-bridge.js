;(function () {
  if (window.__gameLoadMessageBridgeInstalled) return
  window.__gameLoadMessageBridgeInstalled = true

  const COMPLETED_TITLE = '__LIBERTYCATS_GAME_LOAD_COMPLETED__'
  const FAILED_TITLE = '__LIBERTYCATS_GAME_LOAD_FAILED__'

  function notifyApp(type) {
    document.title = (type === 'GameLoadFailed' ? FAILED_TITLE : COMPLETED_TITLE) + Date.now()
  }

  function handleMessage(rawMessage) {
    try {
      const message = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage
      if (
        message &&
        (message.type === 'GameLoadCompleted' || message.type === 'GameLoadFailed')
      ) {
        notifyApp(message.type)
      }
    } catch (error) {
      console.warn('[Preload] 游戏消息解析失败:', error)
    }
  }

  window.addEventListener('message', function (event) {
    handleMessage(event.data)
  })

  if (!window.AndroidGameBridge) {
    window.AndroidGameBridge = { postMessage: handleMessage }
  }

  try {
    window.webkit = window.webkit || {}
    window.webkit.messageHandlers = window.webkit.messageHandlers || {}
    if (!window.webkit.messageHandlers.gameBridge) {
      window.webkit.messageHandlers.gameBridge = { postMessage: handleMessage }
    }
  } catch (error) {
    // WKWebView 的原生 messageHandlers 可能不可写，函数包装仍可捕获完成事件
  }

  const wrapTimer = setInterval(function () {
    const original = window._NotifyGameLoadCompletedToApp
    if (typeof original !== 'function' || original.__libertyCatsWrapped) return

    const wrapped = function () {
      notifyApp('GameLoadCompleted')
      return original.apply(this, arguments)
    }
    wrapped.__libertyCatsWrapped = true
    window._NotifyGameLoadCompletedToApp = wrapped
    clearInterval(wrapTimer)
  }, 10)

  const failedWrapTimer = setInterval(function () {
    const original = window._NotifyGameLoadFailedToApp
    if (typeof original !== 'function' || original.__libertyCatsWrapped) return

    const wrapped = function () {
      notifyApp('GameLoadFailed')
      return original.apply(this, arguments)
    }
    wrapped.__libertyCatsWrapped = true
    window._NotifyGameLoadFailedToApp = wrapped
    clearInterval(failedWrapTimer)
  }, 10)
})()

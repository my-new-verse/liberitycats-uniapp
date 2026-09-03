;(function () {
  if (window.__gameLoadMessageBridgeInstalled) return
  window.__gameLoadMessageBridgeInstalled = true

  const COMPLETED_TITLE = '__LIBERTYCATS_GAME_LOAD_COMPLETED__'
  const FAILED_TITLE = '__LIBERTYCATS_GAME_LOAD_FAILED__'
  const CLOSE_TITLE = '__LIBERTYCATS_CLOSE_GAME__'

  function notifyApp(type) {
    const titlePrefix =
      type === 'GameLoadFailed'
        ? FAILED_TITLE
        : type === 'CloseGame'
          ? CLOSE_TITLE
          : COMPLETED_TITLE
    document.title = titlePrefix + Date.now()

    try {
      if (window.uni && typeof window.uni.postMessage === 'function') {
        window.uni.postMessage({ data: { type: type } })
      }
    } catch (error) {
      console.warn('[GameBridge] uni.postMessage 发送失败:', error)
    }
  }

  function handleMessage(rawMessage) {
    try {
      const message = typeof rawMessage === 'string' ? JSON.parse(rawMessage) : rawMessage
      if (
        message &&
        (message.type === 'GameLoadCompleted' ||
          message.type === 'GameLoadFailed' ||
          message.type === 'CloseGame')
      ) {
        notifyApp(message.type)
      }
    } catch (error) {
      console.warn('[Preload] 游戏消息解析失败:', error)
    }
  }

  function handleWindowMessage(event) {
    handleMessage(event.data)
  }

  window.addEventListener('message', handleWindowMessage)

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

  const pendingHooks = [
    ['_NotifyGameLoadCompletedToApp', 'GameLoadCompleted'],
    ['_NotifyGameLoadFailedToApp', 'GameLoadFailed'],
    ['_NotifyCloseGameToApp', 'CloseGame'],
  ]
  const HOOK_RETRY_INTERVAL = 250
  const HOOK_RETRY_TIMEOUT = 5 * 60 * 1000
  const hookRetryStartedAt = Date.now()
  let hookRetryTimer = null

  function wrapGameHook(hook) {
    const hookName = hook[0]
    const messageType = hook[1]
    const original = window[hookName]
    if (typeof original !== 'function') return false
    if (original.__libertyCatsWrapped) return true

    const wrapped = function () {
      notifyApp(messageType)
      return original.apply(this, arguments)
    }
    wrapped.__libertyCatsWrapped = true
    window[hookName] = wrapped
    return true
  }

  function clearHookRetryTimer() {
    if (hookRetryTimer === null) return
    clearInterval(hookRetryTimer)
    hookRetryTimer = null
  }

  function tryWrapGameHooks() {
    for (let index = pendingHooks.length - 1; index >= 0; index -= 1) {
      if (wrapGameHook(pendingHooks[index])) pendingHooks.splice(index, 1)
    }

    if (pendingHooks.length === 0 || Date.now() - hookRetryStartedAt >= HOOK_RETRY_TIMEOUT) {
      clearHookRetryTimer()
    }
  }

  function cleanupBridge() {
    clearHookRetryTimer()
    window.removeEventListener('message', handleWindowMessage)
    window.removeEventListener('pagehide', cleanupBridge)
    window.removeEventListener('beforeunload', cleanupBridge)
  }

  tryWrapGameHooks()
  if (pendingHooks.length > 0) {
    hookRetryTimer = setInterval(tryWrapGameHooks, HOOK_RETRY_INTERVAL)
  }

  window.addEventListener('pagehide', cleanupBridge)
  window.addEventListener('beforeunload', cleanupBridge)
})()

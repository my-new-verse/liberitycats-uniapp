<route lang="json5">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '游戏中心',
    'app-plus': {
      titleNView: {
        titleText: '游戏中心',
        buttons: [
          {
            text: '关闭',
            fontSize: '14px',
            width: '80rpx',
            onclick: 'closeGame',
          },
        ],
      },
      webView: {
        hardwareAccelerated: true,
        domStorage: true,
        database: true,
        mixedContent: 'compatibility',
        allowFileAccess: true,
        allowContentAccess: true,
        allowFileAccessFromFileURLs: true,
        allowUniversalAccessFromFileURLs: true,
        useWideViewPort: true,
        loadWithOverviewMode: true,
        cacheMode: 'LOAD_DEFAULT',
      },
    },
  },
}
</route>
<template>
  <view class="game-container">
    <!-- 游戏容器 -->
    <web-view
      v-if="gameUrl"
      :src="gameUrl"
      @message="handleMessage"
      @onPostMessage="handlePostMessage"
      @error="handleError"
      :webview-styles="webviewStyles"
    ></web-view>

    <!-- 调试信息 -->
    <!-- <view v-if="debugInfo" class="debug-info">
      <text>{{ debugInfo }}</text>
    </view> -->
  </view>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { onLoad, onReady, onUnload } from '@dcloudio/uni-app'

const gameUrl = ref('')
const debugInfo = ref('')
let nativeGameWebview = null
const plusMessageRegistered = false
const bridgeReloaded = false
const closingGame = false

const findGameMessage = (payload) => {
  const queue = [payload]
  const visited = new Set()
  while (queue.length) {
    const value = queue.shift()
    if (value == null || visited.has(value)) continue
    if (typeof value === 'object') visited.add(value)
    if (typeof value === 'string') {
      try {
        queue.push(JSON.parse(value))
      } catch {}
      continue
    }
    if (Array.isArray(value)) {
      queue.push(...value)
      continue
    }
    if (typeof value !== 'object') continue
    if (
      value.type === 'GameLoadCompleted' ||
      value.type === 'GameLoadFailed' ||
      value.type === 'CloseGame'
    ) {
      return value.type
    }
    queue.push(value.data, value.detail, value.args, value.arg)
  }
  return false
}

const destroyNativeGameWebview = () => {
  // #ifdef APP-PLUS
  if (plusMessageRegistered) {
    // plus.globalEvent.removeEventListener('plusMessage', handlePlusMessage)
    plusMessageRegistered = false
  }
  if (!nativeGameWebview) return
  // nativeGameWebview.removeEventListener?.('titleUpdate', handleTitleUpdate)
  try {
    nativeGameWebview.setVisible?.(false)
    nativeGameWebview.hide?.('none', 0)
    nativeGameWebview.close?.('none', 0)
  } catch (error) {
    console.warn('[GameIndex] 关闭 iOS 游戏 WebView 失败', error)
  }
  nativeGameWebview = null
  // #endif
}

const closeGame = async () => {
  console.log('关闭游戏', closingGame)
  // if (closingGame) return
  // closingGame = true
  // gameUrl.value = ''
  // await nextTick()
  // destroyNativeGameWebview()
  // uni.navigateBack({
  //   delta: 1,
  //   fail: () => uni.switchTab({ url: '/pages/tabbar/game' }),
  // })
  uni.navigateBack({ delta: 1 })
}

const dispatchGameMessage = (payload) => {
  const type = findGameMessage(payload)
  if (type === 'GameLoadCompleted') {
    console.log('GameLoadCompleted')
  } else if (type === 'GameLoadFailed') console.log('GameLoadFailed')
  else if (type === 'CloseGame') closeGame()
}

const handlePlusMessage = (event) => {
  const originId = event?.originId
  const webviewOriginId = nativeGameWebview?.__uuid__ || nativeGameWebview?.id
  if (originId && webviewOriginId && originId !== webviewOriginId) return
  dispatchGameMessage(event)
}

const handleTitleUpdate = (event) => {
  const title = event?.title || nativeGameWebview?.getTitle?.() || ''
  if (title.startsWith('__LIBERTYCATS_GAME_LOAD_COMPLETED__')) {
    console.log('GameLoadCompleted11111111')
  } else if (title.startsWith('__LIBERTYCATS_GAME_LOAD_FAILED__')) console.log('GameLoadFailed')
  else if (title.startsWith('__LIBERTYCATS_CLOSE_GAME__')) closeGame()
}

const webviewStyles = {
  progress: {
    color: '#ff6b03',
  },
  // 设置黑色背景，减少原生 WebView 白屏感
  background: '#000000',
  backgroundColor: '#000000',
}

// 构建游戏URL
const buildGameUrl = () => {
  const query = {
    token: uni.getStorageSync('token') || 'test_token',
    userId: uni.getStorageSync('userId') || 'test_user',
    timestamp: Date.now(),
    platform: 'app',
    lang: uni.getLocale() || 'zh',
    debug: 1,
    disableWebGL: 0,
    disableAudio: 0,
  }

  const queryString = Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')

  return `https://game.libertycats.app/minigame/index.html?${queryString}`
}

// 处理游戏发送的消息
const handleMessage = (e) => {
  console.log('收到游戏消息:', e.detail.data)
  debugInfo.value = `收到消息: ${JSON.stringify(e.detail.data)}`
  // dispatchGameMessage(e)
}

// 处理postMessage事件
const handlePostMessage = (e) => {
  console.log('PostMessage事件:', e)
  debugInfo.value = `PostMessage: ${JSON.stringify(e)}`
  // dispatchGameMessage(e)
}

// 处理错误
const handleError = (e) => {
  console.error('游戏加载错误:', e)
  debugInfo.value = `加载错误: ${JSON.stringify(e)}`
  uni.showToast({
    title: '游戏加载失败，请重试',
    icon: 'none',
  })
}

onLoad((options) => {
  gameUrl.value = decodeURIComponent(options?.url || '')
  console.log('gameUrl.value', gameUrl.value)
  debugInfo.value = '页面加载完成，开始加载游戏...'
})

onReady(() => {
  // #ifdef APP-PLUS
  let attempts = 0
  const bindNativeGameWebview = () => {
    const pages = getCurrentPages()
    const pageWebview = pages[pages.length - 1]?.$getAppWebview?.()
    const children = pageWebview?.children?.() || []
    nativeGameWebview = children[0] || null
    if (!nativeGameWebview && attempts < 10) {
      attempts += 1
      setTimeout(bindNativeGameWebview, 50)
      return
    }
    if (!nativeGameWebview) return

    nativeGameWebview.addEventListener?.('titleUpdate', handleTitleUpdate)
    nativeGameWebview.setJsFile?.('_www/static/game-message-bridge.js')
    if (!plusMessageRegistered) {
      plus.globalEvent.addEventListener('plusMessage', handlePlusMessage)
      plusMessageRegistered = true
    }

    // setJsFile 在下一次页面加载时注入，首次绑定后只重载一次。
    if (!bridgeReloaded) {
      bridgeReloaded = true
      nativeGameWebview.reload?.()
    }
  }
  bindNativeGameWebview()
  // #endif
})

onUnload(() => {
  closingGame = true
  destroyNativeGameWebview()
})

// 添加全局错误监听
onMounted(() => {
  debugInfo.value = '页面加载完成，开始加载游戏...'

  // 使用uni.onError替代window.onerror
  uni.onError((err) => {
    debugInfo.value += `\n捕获到错误: ${JSON.stringify(err)}`
  })

  // 使用uni.onUnhandledRejection替代window.unhandledrejection
  uni.onUnhandledRejection((err) => {
    debugInfo.value += `\n未处理的Promise错误: ${JSON.stringify(err)}`
  })
})
</script>

<style lang="scss" scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #000;
}

.debug-info {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  font-size: 12px;
  line-height: 1.4;
  color: #0f0;
  white-space: pre-wrap;
}
</style>

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
    <!-- 资源下载中提示层 -->
    <view v-if="resourceDownloading" class="download-loading">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-title">资源下载中</text>
        <text class="loading-progress" v-if="resourceProgress > 0">{{ resourceProgress }}%</text>
        <text class="loading-subtext">下载完成后即可开始游戏</text>
      </view>
    </view>

    <!-- 游戏 WebView 加载完成前的居中提示 -->
    <view v-if="showEnteringGame && !resourceDownloading" class="entering-game">
      <view class="entering-game-content">
        <!-- <text>{{ t('game.entering') }}</text> -->
      </view>
    </view>

    <!-- 调试信息 -->
    <!-- <view v-if="debugInfo" class="debug-info">
      <text>{{ debugInfo }}</text>
    </view> -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { onLoad, onNavigationBarButtonTap, onUnload } from '@dcloudio/uni-app'
import {
  applyResourceOverride,
  backgroundDownloadState,
  gameResourceLoadState,
} from '@/utils/webviewResourceCache'
import { t } from '@/locale/index'

declare const plus: any

const gameUrl = ref('')
const showEnteringGame = ref(true)
const debugInfo = ref('')

// 资源下载状态
// 仅在实际下载时展示 loading，避免 API 检查阶段闪烁
const resourceDownloading = computed(() => gameResourceLoadState.value !== 'ready')
const resourceProgress = ref(0)

// 监听后台下载进度
watch(
  () => backgroundDownloadState.value,
  (state) => {
    resourceProgress.value = state.progress
  },
  { deep: true },
)

// 原生 WebView 实例
let nativeWebview: any = null
let gameLoadStarted = false
let nativeWebviewId = ''
let closingPage = false
let gestureStartX = 0
let gestureStartY = 0
let plusMessageRegistered = false

type GameMessageType = 'GameLoadCompleted' | 'GameLoadFailed' | 'CloseGame'

const findGameMessage = (payload: any): GameMessageType | undefined => {
  const queue = [payload]
  const visited = new Set<any>()
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
}

const handleGameMessage = (type?: GameMessageType) => {
  if (!type || closingPage) return
  console.log('[GameIndex] 收到游戏消息:', type)
  if (type === 'GameLoadCompleted') {
    showEnteringGame.value = false
    gameResourceLoadState.value = 'ready'
  } else if (type === 'GameLoadFailed') {
    handleError({ type })
  } else if (type === 'CloseGame') {
    closeGamePage()
  }
}

const handlePlusMessage = (event: any) => {
  console.log('handlePlusMessage', findGameMessage(event))
  const originId = event?.originId
  if (
    originId &&
    nativeWebviewId &&
    originId !== nativeWebviewId &&
    originId !== nativeWebview?.__uuid__
  )
    return
  handleGameMessage(findGameMessage(event))
}

const handleTitleUpdate = (event: { title?: string }) => {
  const title = event?.title || nativeWebview?.getTitle?.() || ''
  if (title.startsWith('__LIBERTYCATS_GAME_LOAD_COMPLETED__'))
    handleGameMessage('GameLoadCompleted')
  else if (title.startsWith('__LIBERTYCATS_GAME_LOAD_FAILED__')) handleGameMessage('GameLoadFailed')
  else if (title.startsWith('__LIBERTYCATS_CLOSE_GAME__')) handleGameMessage('CloseGame')
}

/** 获取当前页面 WebView */
const getCurrentPageWebview = () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$getAppWebview?.() || null
}

/** 加载成功回调 */
const handleLoaded = () => {
  if (!gameLoadStarted) return
  debugInfo.value = ''
  // #ifdef APP-PLUS
  try {
    nativeWebview?.setVisible(true)
    showEnteringGame.value = false
  } catch (_) {}
  // #endif
}

/** 加载失败回调 */
const handleError = (err?: any) => {
  console.warn('[GameIndex] webview load error', err)
  debugInfo.value = `${JSON.stringify(err)}`
  showEnteringGame.value = false
  uni.showModal({
    title: t('game.toast.load_failed'),
    content: debugInfo.value,
  })
}

function closeGamePage() {
  if (closingPage) return
  closingPage = true
  destroyNativeWebview()
  uni.navigateBack({ delta: 1 })
}

const handleTouchStart = (event: any) => {
  const touch = event?.touches?.[0]
  gestureStartX = Number(touch?.clientX ?? touch?.screenX ?? 0)
  gestureStartY = Number(touch?.clientY ?? touch?.screenY ?? 0)
}

const handleTouchEnd = (event: any) => {
  const touch = event?.changedTouches?.[0]
  const endX = Number(touch?.clientX ?? touch?.screenX ?? 0)
  const endY = Number(touch?.clientY ?? touch?.screenY ?? 0)
  const deltaX = endX - gestureStartX
  const deltaY = endY - gestureStartY
  const screenWidth = uni.getSystemInfoSync().windowWidth || 375
  const fromLeftEdge = gestureStartX <= 32 && deltaX >= 60
  const fromRightEdge = gestureStartX >= screenWidth - 32 && deltaX <= -60

  if ((fromLeftEdge || fromRightEdge) && Math.abs(deltaX) > Math.abs(deltaY)) {
    closeGamePage()
  }
}

const handleNativeWebviewClose = () => {
  nativeWebview = null
  nativeWebviewId = ''
  gameLoadStarted = false
  if (!closingPage) {
    closingPage = true
    uni.navigateBack({ delta: 1 })
  }
}
/** 创建原生 WebView，在 loadURL 前注入 overrideResourceRequest */
async function createNativeWebview(url: string) {
  if (typeof plus === 'undefined' || closingPage) return

  const currentWebview = getCurrentPageWebview()
  if (!currentWebview) {
    console.warn('[GameIndex] 无法获取当前页面 webview')
    return
  }

  nativeWebviewId = `game-native-webview-${Date.now()}`

  // 创建时不传 url，初始隐藏，等注入拦截规则后再 loadURL
  nativeWebview = plus.webview.create('', nativeWebviewId, {
    top: '0px',
    bottom: '0px',
    width: '100%',
    // background: '#fff8f2',
    // background: ' #ff6b03',
    background: 'transparent',
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
    progress: { color: '#FF6B03', height: '2px' },
    // 初始隐藏，加载完成后再展示，避免遗挡 Vue 层 loading
    visible: false,
  })

  // 绑定事件
  nativeWebview.onerror = handleError
  nativeWebview.onloaded = handleLoaded
  nativeWebview.addEventListener?.('loaded', handleLoaded)
  nativeWebview.addEventListener?.('error', handleError)
  nativeWebview.addEventListener?.('loaderror', handleError)
  nativeWebview.addEventListener?.('receivedError', handleError)
  nativeWebview.addEventListener?.('touchstart', handleTouchStart)
  nativeWebview.addEventListener?.('touchend', handleTouchEnd)
  nativeWebview.addEventListener?.('close', handleNativeWebviewClose)
  nativeWebview.addEventListener?.('titleUpdate', handleTitleUpdate)

  if (!plusMessageRegistered) {
    plus.globalEvent.addEventListener('plusMessage', handlePlusMessage)
    plusMessageRegistered = true
  }

  // 在 loadURL 前注入资源拦截规则（先验证文件存在）
  currentWebview.append(nativeWebview)
  await applyResourceOverride(nativeWebview)
  nativeWebview.setJsFile?.('_www/static/game-message-bridge.js')
  console.log('[GameIndex] 已注入资源拦截，开始加载 URL:', url)

  // 拦截规则注入后再加载 URL
  gameLoadStarted = true
  nativeWebview.loadURL(url)
}

/** 销毁原生 WebView */
function destroyNativeWebview() {
  // if (plusMessageRegistered) {
  //   plus.globalEvent.removeEventListener('plusMessage', handlePlusMessage)
  //   plusMessageRegistered = false
  // }
  if (!nativeWebview) return
  nativeWebview.onerror = null
  nativeWebview.onloaded = null
  nativeWebview.removeEventListener?.('loaded', handleLoaded)
  nativeWebview.removeEventListener?.('error', handleError)
  nativeWebview.removeEventListener?.('loaderror', handleError)
  nativeWebview.removeEventListener?.('receivedError', handleError)
  nativeWebview.removeEventListener?.('touchstart', handleTouchStart)
  nativeWebview.removeEventListener?.('touchend', handleTouchEnd)
  nativeWebview.removeEventListener?.('close', handleNativeWebviewClose)
  // nativeWebview.removeEventListener?.('titleUpdate', handleTitleUpdate)
  try {
    nativeWebview.close?.('none')
  } catch (_) {}
  nativeWebview = null
  nativeWebviewId = ''
  gameLoadStarted = false
}

onLoad(async (options: any) => {
  gameUrl.value = decodeURIComponent(options?.url || '')
  const gameType = options?.gameType || ''
  console.log('[GameIndex] gameUrl:', gameUrl.value, 'gameType:', gameType)

  // #ifdef APP-PLUS
  if (gameUrl.value) {
    // 入口页已完成资源检查，这里不再重复请求 token。
    // 资源就绪后创建 WebView。
    //    如果 applyResourceOverride 发现文件缺失会触发下载，
    //    resourceDownloading（computed）会自动响应 backgroundDownloadState.running 显示 loading
    nextTick(() => {
      createNativeWebview(gameUrl.value)
    })
  }
  // #endif
})

onUnload(() => {
  closingPage = true
  destroyNativeWebview()
})

onNavigationBarButtonTap(() => {
  closeGamePage()
})
</script>

<style lang="scss" scoped>
.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  // background-color: #fff8f2;
  background: linear-gradient(329deg, #ff6b03 0%, #ee941a 100%);
}

/* 资源下载中 */
.download-loading {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.9);

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16rpx;
  }

  .loading-spinner {
    width: 64rpx;
    height: 64rpx;
    margin-bottom: 16rpx;
    border: 6rpx solid rgba(255, 255, 255, 0.2);
    border-top-color: #ff6b03;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-title {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }

  .loading-progress {
    font-size: 36rpx;
    font-weight: 700;
    color: #ff6b03;
  }

  .loading-subtext {
    font-size: 24rpx;
    color: rgba(255, 255, 255, 0.6);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.entering-game {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.85);

  .entering-game-content {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
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

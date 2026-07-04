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
    <!-- 资源下载中提示层 -->
    <view v-if="resourceDownloading" class="download-loading">
      <view class="loading-content">
        <view class="loading-spinner"></view>
        <text class="loading-title">资源下载中</text>
        <text class="loading-progress" v-if="resourceProgress > 0">{{ resourceProgress }}%</text>
        <text class="loading-subtext">下载完成后即可开始游戏</text>
      </view>
    </view>

    <!-- 交互提示层：用户点击后才展示 WebView -->
    <view
      v-if="showInteractionHint && !resourceDownloading"
      class="interaction-hint"
      @click="handleUserInteraction"
    >
      <view class="hint-content">
        <text>{{ t('game.opening') }}</text>
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
import { onLoad, onUnload } from '@dcloudio/uni-app'
import {
  applyResourceOverride,
  ensureGameResourcesReady,
  backgroundDownloadState,
} from '@/utils/webviewResourceCache'
import { t } from '@/locale/index'

declare const plus: any

const gameUrl = ref('')
const showInteractionHint = ref(true)
const debugInfo = ref('')

// 资源下载状态
// 仅在实际下载时展示 loading，避免 API 检查阶段闪烁
const resourceDownloading = computed(() => backgroundDownloadState.value.running)
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

/** 获取当前页面 WebView */
const getCurrentPageWebview = () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$getAppWebview?.() || null
}

/** 加载成功回调 */
const handleLoaded = () => {
  debugInfo.value = ''
  // WebView 已加载完毕，若用户已点击交互层则立即显示，否则等待用户点击
  if (!showInteractionHint.value) {
    // #ifdef APP-PLUS
    try {
      nativeWebview?.setVisible(true)
    } catch (_) {}
    // #endif
  }
}

/** 加载失败回调 */
const handleError = (err?: any) => {
  console.warn('[GameIndex] webview load error', err)
  debugInfo.value = `加载失败: ${JSON.stringify(err)}`
  uni.showToast({ title: '游戏加载失败，请重试', icon: 'none' })
}
const currentWebview = getCurrentPageWebview()

/** 创建原生 WebView，在 loadURL 前注入 overrideResourceRequest */
async function createNativeWebview(url: string) {
  if (typeof plus === 'undefined') return

  if (!currentWebview) {
    console.warn('[GameIndex] 无法获取当前页面 webview')
    return
  }

  // 创建时不传 url，初始隐藏，等注入拦截规则后再 loadURL
  nativeWebview = plus.webview.create('', 'game-native-webview', {
    top: '0px',
    bottom: '0px',
    width: '100%',
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

  // 在 loadURL 前注入资源拦截规则（先验证文件存在）
  currentWebview.append(nativeWebview)
  await applyResourceOverride(nativeWebview)
  console.log('[GameIndex] 已注入资源拦截，开始加载 URL:', url)

  // 拦截规则注入后再加载 URL
  nativeWebview.loadURL(url)
}

/** 销毁原生 WebView */
function destroyNativeWebview() {
  if (!nativeWebview) return
  nativeWebview.onerror = null
  nativeWebview.onloaded = null
  nativeWebview.removeEventListener?.('loaded', handleLoaded)
  nativeWebview.removeEventListener?.('error', handleError)
  nativeWebview.removeEventListener?.('loaderror', handleError)
  nativeWebview.removeEventListener?.('receivedError', handleError)
  try {
    nativeWebview.close?.()
  } catch (_) {}
  nativeWebview = null
}

/** 用户点击交互层，展示已预加载的 WebView */
const handleUserInteraction = () => {
  showInteractionHint.value = false
  // #ifdef APP-PLUS
  try {
    nativeWebview?.setVisible(true)
  } catch (_) {}
  // #endif
}

onLoad(async (options: any) => {
  gameUrl.value = decodeURIComponent(options?.url || '')
  const gameType = options?.gameType || ''
  console.log('[GameIndex] gameUrl:', gameUrl.value, 'gameType:', gameType)

  // #ifdef APP-PLUS
  if (gameUrl.value) {
    // 1. 确保资源已准备就绪（比对 preloadResources、继续未完成的下载）
    if (gameType) {
      try {
        await ensureGameResourcesReady(gameType)
      } catch (e) {
        console.warn('[GameIndex] 资源准备失败，降级直接加载', e)
      }
    }

    // 2. 资源就绪后创建 WebView
    //    如果 applyResourceOverride 发现文件缺失会触发下载，
    //    resourceDownloading（computed）会自动响应 backgroundDownloadState.running 显示 loading
    nextTick(() => {
      createNativeWebview(gameUrl.value)
    })
  }
  // #endif
})

onUnload(() => {
  destroyNativeWebview()
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

.interaction-hint {
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

  .hint-content {
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

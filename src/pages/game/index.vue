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
    <!-- 交互提示层：用户点击后才展示 WebView -->
    <view v-if="showInteractionHint" class="interaction-hint" @click="handleUserInteraction">
      <view class="hint-content">
        <text>点击屏幕开始游戏</text>
      </view>
    </view>

    <!-- 调试信息 -->
    <view v-if="debugInfo" class="debug-info">
      <text>{{ debugInfo }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onLoad, onShow, onUnload, onHide } from '@dcloudio/uni-app'
import { applyResourceOverride } from '@/utils/webviewResourceCache'

declare const plus: any

const gameUrl = ref('')
const showInteractionHint = ref(true)
const debugInfo = ref('')

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

onLoad((options: any) => {
  gameUrl.value = decodeURIComponent(options?.url || '')
  console.log('[GameIndex] gameUrl:', gameUrl.value)
  debugInfo.value = '预加载游戏中，点击屏幕开始...'

  // #ifdef APP-PLUS
  // 进入页面即 create + loadURL（后台预加载），但不显示，等用户点击交互层
  if (gameUrl.value) {
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

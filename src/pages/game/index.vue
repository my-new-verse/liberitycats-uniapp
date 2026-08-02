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
import { ref, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

const gameUrl = ref('')
const debugInfo = ref('')

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
}

// 处理postMessage事件
const handlePostMessage = (e) => {
  console.log('PostMessage事件:', e)
  debugInfo.value = `PostMessage: ${JSON.stringify(e)}`
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
  gameUrl.value = decodeURIComponent(options.url) || ''
  console.log('gameUrl.value', gameUrl.value)
  debugInfo.value = '页面加载完成，开始加载游戏...'
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

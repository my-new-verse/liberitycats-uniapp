<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#000000',
  },
}
</route>
<template>
  <page-meta></page-meta>
  <!-- #ifdef H5 -->
  <view class="bg-white overflow-hidden page3" :class="[locale]">
    <view class="game-container">
      <!-- 游戏容器 -->
      <web-view
        v-if="gameUrl"
        v-show="webViewVisible"
        :src="gameUrl"
        @message="handleMessage"
        @onPostMessage="handlePostMessage"
        @error="handleError"
        :webview-styles="webviewStyles"
      ></web-view>
      <!-- 交互提示层 -->
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
  </view>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view v-if="showInteractionHint" class="interaction-hint" @click="handleUserInteraction">
    <view class="hint-content">
      <text>点击屏幕开始游戏</text>
    </view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad, onShow, onHide } from '@dcloudio/uni-app'
import { showGameWebView } from '@/utils/plusGameWebViewPool'

const gameUrl = ref('')
const webViewVisible = ref(false)
const showInteractionHint = ref(true)
const debugInfo = ref('')
const currentGameType = ref('')
const isPreloadedInstance = ref(false)

const webviewStyles = {
  progress: {
    color: '#FF0000',
  },
  // 设置黑色背景，减少原生 WebView 白屏感
  background: '#000000',
  backgroundColor: '#000000',
}

// 处理用户交互
const handleUserInteraction = async () => {
  if (showInteractionHint.value) {
    // 保持已预加载的 web-view，仅控制显示，避免因创建时机导致的白屏
    showInteractionHint.value = false
    console.log('currentGameType', currentGameType.value)
    // 尝试使用预加载的WebView
    if (currentGameType.value) {
      const success = await showGameWebView(currentGameType.value)
      console.log('success', success)
      if (success) {
        isPreloadedInstance.value = true
        debugInfo.value = `开始游戏，使用预加载的${currentGameType.value}实例`
        console.log(debugInfo.value)
        return
      }
    }

    // 回退到普通WebView显示
    webViewVisible.value = true
    debugInfo.value = '开始游戏，展示动态加载内容'
  }
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
  // 页面加载时即开始预加载游戏 URL，但不显示，用户点击后再展示
  gameUrl.value = decodeURIComponent(options.url) || ''
  currentGameType.value = options.gameType
  console.log('gameUrl.value', gameUrl.value)
  debugInfo.value = '页面加载完成，等待用户交互...'
})

onShow(() => {
  // 页面显示时，如果是预加载实例，确保正确状态
  if (isPreloadedInstance.value) {
    // 预加载实例已经在后台加载，只需等待用户交互
    debugInfo.value += '\n页面显示，预加载实例已就绪'
  }
})

onHide(() => {
  // 页面隐藏时，如果是预加载实例，保持隐藏状态以便复用
  if (isPreloadedInstance.value) {
    debugInfo.value += '\n页面隐藏，保持预加载实例状态'
  }
})

// 添加全局错误监听
onMounted(() => {
  // 这里保留文案，onLoad 已设置一次
  debugInfo.value = '页面加载完成，已开始预加载游戏，等待用户交互...'

  // 使用uni.onError替代window.onerror
  uni.onError((err) => {
    debugInfo.value += `\n捕获到错误: ${JSON.stringify(err)}`
  })

  // 使用uni.onUnhandledRejection替代window.unhandledrejection
  uni.onUnhandledRejection((err) => {
    debugInfo.value += `\n未处理的Promise错误: ${JSON.stringify(err)}`
  })
})

// 页面销毁时清理资源
onUnmounted(() => {
  if (!isPreloadedInstance.value && typeof plus !== 'undefined') {
    // 非预加载实例，可以安全销毁
    const currentWebview = plus.webview.currentWebview()
    if (currentWebview) {
      currentWebview.close()
    }
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
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
  background-color: rgba(0, 0, 0, 0.8);

  .hint-content {
    font-size: 16px;
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
html,
body {
  height: 100%;
  margin: 0;
  overflow: auto;
}
</style>

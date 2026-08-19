<template>
  <view style="padding: 32rpx; background-color: #ffffff; border-radius: 32rpx" v-show="active">
    <view
      :class="['web', 'web-' + type]"
      :style="{ height: heightPx ? heightPx + 'px' : undefined }"
    >
      <!-- #ifdef APP-PLUS -->
      <!-- Native WebView 占位区域，由 plus.webview.create 在 create() 中填充 -->
      <view
        v-show="hasError"
        style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 32rpx;
          background-color: #ffffff;
          z-index: 999;
        "
      >
        <NetworkError @refresh="handleReload" />
      </view>
      <view></view>
      <!-- #endif -->

      <!-- #ifdef H5 -->
      <iframe
        v-if="shouldRender && !hasError"
        v-show="active"
        :src="url"
        class="quote-iframe"
        @load="handleLoaded"
        @error="handleError"
      />
      <view
        v-show="hasError"
        style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 32rpx;
          background-color: #ffffff;
          z-index: 999;
        "
      >
        <NetworkError @refresh="handleReload" />
      </view>
      <!-- #endif -->
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onUnmounted, nextTick, getCurrentInstance } from 'vue'
import NetworkError from '@/components/NetworkError.vue'

const props = defineProps<{
  type: string
  url: string
  heightPx: number
  active: boolean
}>()

const emit = defineEmits<{
  loaded: []
  error: []
}>()

// ========== 内部状态 ==========
const instance = getCurrentInstance()
const webviewInstance = ref<any>(null)
const hasError = ref(false)
// 首次由父组件显式 create；创建后切换 active 仅隐藏，保留页面缓存。
const shouldRender = ref(false)
let isUnmounted = false
let _lastPosition = { top: 0, left: 0 }

// ========== 工具方法 ==========
const getCurrentPageWebview = () => {
  // #ifdef APP-PLUS
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$getAppWebview?.() || null
  // #endif
  return null
}

const removeWebviewListeners = () => {
  const wv = webviewInstance.value
  if (!wv) return
  wv.onerror = null
  wv.onloaded = null
  wv.removeEventListener?.('loaded', handleLoaded)
  wv.removeEventListener?.('error', handleError)
  wv.removeEventListener?.('loaderror', handleError)
  wv.removeEventListener?.('receivedError', handleError)
  wv.removeEventListener?.('sslerror', handleError)
  wv.removeEventListener?.('httpError', handleError)
}

// ========== 事件处理 ==========
const handleLoaded = () => {
  if (hasError.value) return
  hasError.value = false
  emit('loaded')
}

const handleError = (err?: any) => {
  console.log(`[QuoteWebview:${props.type}] webview load error`, err)
  if (hasError.value) return
  hasError.value = true
  // 隐藏 native WebView，露出错误覆盖层（双重保障：setVisible + setStyle）
  // #ifdef APP-PLUS
  hide()
  // #endif
  emit('error')
}

const handleReload = async () => {
  console.log(`[QuoteWebview:${props.type}] 用户点击刷新按钮`)
  destroy()
  hasError.value = false
  await nextTick()
  await create()
  show()
}

// ========== 对外暴露的 WebView 生命周期方法 ==========

/** 创建 native WebView（APP-PLUS）或触发 H5 渲染。幂等：已有实例则仅 show()。 */
const create = async (): Promise<void> => {
  shouldRender.value = true
  // #ifdef APP-PLUS
  if (isUnmounted) return

  try {
    await nextTick()

    // 如果已存在实例
    if (webviewInstance.value) {
      if (hasError.value) {
        // 上次加载出错：保持 WebView 隐藏，由 NetworkError 覆盖层展示，等待用户点击刷新
        return
      }
      show()
      return
    }

    // 创建全新实例前重置错误状态
    hasError.value = false

    // 测量自身 DOM 位置（使用 .in(instance) 确保在组件上下文中查询）
    const rect = await new Promise<any>((resolve) => {
      uni
        .createSelectorQuery()
        .in(instance)
        .select(`.web-${props.type}`)
        .boundingClientRect((r) => resolve(r || null))
        .exec()
    })

    if (isUnmounted) return

    if (!rect || !rect.width || !rect.height) {
      console.log(`[QuoteWebview:${props.type}] 无法获取 DOM rect，标记错误`)
      hasError.value = true
      return
    }

    _lastPosition = { top: rect.top || 0, left: rect.left || 0 }

    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    const sys = uni.getSystemInfoSync()
    const rpx2px = 750 / sys.windowWidth
    const radiusPx = 32 / rpx2px

    const wvStyle = {
      top: rect.top || 0,
      left: rect.left || 0,
      width: rect.width || 0,
      height: rect.height || 0,
      borderRadius: radiusPx,
      scalable: true,
      progress: { color: '#ff6b03', height: '2px' },
    }

    console.log(`[QuoteWebview:${props.type}] 创建 native webview, url:`, props.url)
    webviewInstance.value = plus.webview.create(props.url, '', wvStyle)

    // 绑定事件监听
    webviewInstance.value.onerror = handleError
    webviewInstance.value.addEventListener?.('error', handleError)
    webviewInstance.value.addEventListener?.('loaderror', handleError)
    webviewInstance.value.addEventListener?.('receivedError', handleError)
    webviewInstance.value.addEventListener?.('sslerror', handleError)
    webviewInstance.value.addEventListener?.('httpError', handleError)
    webviewInstance.value.addEventListener?.('loaded', handleLoaded)

    webviewInstance.value.onloaded = () => {
      console.log(`[QuoteWebview:${props.type}] webview loaded successfully`)
      handleLoaded()
    }

    // 追加到当前页面
    const currentWebview = page.$getAppWebview()
    if (currentWebview) {
      currentWebview.append(webviewInstance.value)
    } else {
      console.log(`[QuoteWebview:${props.type}] 无法获取当前页面 webview`)
      hasError.value = true
    }
  } catch (e) {
    console.log(`[QuoteWebview:${props.type}] 创建 webview 失败`, e)
    hasError.value = true
  }
  // #endif
}

/** 显示当前 WebView */
const show = (): void => {
  // #ifdef APP-PLUS
  if (hasError.value) return // 有错误时禁止显示，避免原生错误页露出
  if (webviewInstance.value) {
    try {
      // 先恢复位置（hide 时可能已移出屏幕）
      webviewInstance.value.setStyle({
        top: _lastPosition.top,
        left: _lastPosition.left,
      })
    } catch (e) {}
    try {
      webviewInstance.value.setVisible(true)
    } catch (e) {}
  }
  // #endif
}

/** 隐藏当前 WebView */
const hide = (): void => {
  // #ifdef APP-PLUS
  if (webviewInstance.value) {
    try {
      webviewInstance.value.setVisible(false)
    } catch (e) {}
    try {
      // 将 WebView 移出屏幕，作为 setVisible(false) 的双重保障
      webviewInstance.value.setStyle({ top: -99999 })
    } catch (e) {}
  }
  // #endif
}

/** 完全销毁当前 WebView（清理监听 + close 实例） */
const destroy = (): void => {
  shouldRender.value = false
  // #ifdef APP-PLUS
  if (webviewInstance.value) {
    removeWebviewListeners()
    try {
      webviewInstance.value.close?.()
    } catch (e) {}
    webviewInstance.value = null
  }
  // #endif
  hasError.value = false
  _lastPosition = { top: 0, left: 0 }
}

/** 重新加载：先 destroy 再 create */
const reload = async (): Promise<void> => {
  destroy()
  hasError.value = false
  await nextTick()
  await create()
  show()
}

// ========== 响应 active prop 变化 ==========
// active 变为 false 时自动 hide（防止影响其他页面/子 tab）
// active 变为 true 时不自动 create/show，由父组件显式调用，避免竞态
watch(
  () => props.active,
  (isActive) => {
    if (!isActive) {
      hide()
    }
  },
  { immediate: true },
)

// ========== 生命周期 ==========
onUnmounted(() => {
  isUnmounted = true
  destroy()
})

// ========== 对外暴露 ==========
defineExpose({
  create,
  show,
  hide,
  destroy,
  reload,
})
</script>

<style lang="scss" scoped>
.web {
  position: relative;
  padding: 0;
  border-radius: 32rpx;
  overflow: hidden;

  web-view {
    width: 100%;
    height: 100%;
    border-radius: 24rpx;
    overflow: hidden;
  }

  .quote-iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 24rpx;
    overflow: hidden;
  }
}
</style>

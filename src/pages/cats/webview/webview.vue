<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <view class="cnt">
      <!-- #ifdef H5 -->
      <web-view
        v-if="!isLoading && webUrl"
        :src="webUrl"
        :scroll-top="scrollTop"
        :webview-styles="webviewStyles"
        @load="onWebViewLoad"
        @error="onWebViewError"
      ></web-view>
      <!-- #endif -->

      <!-- #ifdef APP-PLUS -->
      <!-- App 端：plus.webview.create 原生 WebView 占位区域 -->
      <view class="webview-slot"></view>
      <!-- 错误覆盖层 -->
      <view v-show="isNetworkError" class="error-overlay">
        <NetworkError @refresh="handleReload" />
      </view>
      <!-- #endif -->
    </view>

    <!-- 页面级 loading -->
    <view v-if="isLoading" class="loading-overlay">
      <wd-loading size="120rpx" color="#ff6b03" />
    </view>

    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import NetworkError from '@/components/NetworkError'

declare const plus: any

// 语言
const locale = uni.getLocale()
// webview URL
const webUrl = ref<string>('')
const isNetworkError = ref(false)
const isLoading = ref(true)
const isNeedBack = ref(false)

// App 端原生 WebView 实例
let nativeWebview: any = null

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const webviewStyles = {
  progress: {
    color: '#FF6B03',
  },
}

// ========== H5 端事件 ==========
// #ifdef H5
const onWebViewLoad = () => {
  isNetworkError.value = false
  isLoading.value = false
}
const onWebViewError = () => {
  isNetworkError.value = true
  isLoading.value = false
}
// #endif

// ========== App 端：原生 WebView 生命周期 ==========

/** 获取当前页面的 WebView */
const getCurrentPageWebview = () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$getAppWebview?.() || null
}

/** 移除 WebView 事件监听 */
const removeListeners = () => {
  if (!nativeWebview) return
  nativeWebview.onerror = null
  nativeWebview.onloaded = null
  nativeWebview.removeEventListener?.('loaded', handleLoaded)
  nativeWebview.removeEventListener?.('error', handleError)
  nativeWebview.removeEventListener?.('loaderror', handleError)
  nativeWebview.removeEventListener?.('receivedError', handleError)
  nativeWebview.removeEventListener?.('sslerror', handleError)
  nativeWebview.removeEventListener?.('httpError', handleError)
}

/** 加载成功回调 */
const handleLoaded = () => {
  if (isNetworkError.value) return
  isNetworkError.value = false
  isLoading.value = false
  // #ifdef APP-PLUS
  // 加载完成后显示原生 WebView
  show()
  // #endif
}

/** 加载失败回调 */
const handleError = (err?: any) => {
  console.warn('[WebViewPage] webview load error', err)
  if (isNetworkError.value) return
  isNetworkError.value = true
  isLoading.value = false
  // 隐藏原生 WebView，露出错误覆盖层
  hide()
}

/** 创建原生 WebView */
function createNativeWebview(url: string) {
  if (typeof plus === 'undefined') return

  const currentWebview = getCurrentPageWebview()
  if (!currentWebview) {
    console.warn('[WebViewPage] 无法获取当前页面 webview')
    isNetworkError.value = true
    return
  }

  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  const navHeight = 44
  const topOffset = statusBarHeight + navHeight

  nativeWebview = plus.webview.create(url, 'native-webview', {
    top: `${topOffset}px`,
    bottom: '0px',
    width: '100%',
    popGesture: 'close',
    hardwareAccelerated: true,
    // 原生进度条
    progress: {
      color: '#FF6B03',
      height: '2px',
    },
    // 初始隐藏，等 loaded 后再显示，避免遮挡 Vue 层 loading
    visible: false,
  })

  // 绑定事件监听（onXxx 属性 + addEventListener 双重保障）
  nativeWebview.onerror = handleError
  nativeWebview.addEventListener?.('error', handleError)
  nativeWebview.addEventListener?.('loaderror', handleError)
  nativeWebview.addEventListener?.('receivedError', handleError)
  nativeWebview.addEventListener?.('sslerror', handleError)
  nativeWebview.addEventListener?.('httpError', handleError)
  nativeWebview.addEventListener?.('loaded', handleLoaded)

  nativeWebview.onloaded = () => {
    handleLoaded()
  }

  // 追加到当前页面
  currentWebview.append(nativeWebview)
}

/** 显示原生 WebView */
const show = () => {
  if (isNetworkError.value) return
  if (!nativeWebview) return
  try {
    nativeWebview.setVisible(true)
  } catch (e) {}
}

/** 隐藏原生 WebView */
const hide = () => {
  if (!nativeWebview) return
  try {
    nativeWebview.setVisible(false)
  } catch (e) {}
  try {
    nativeWebview.setStyle({ top: -99999 })
  } catch (e) {}
}

/** 销毁原生 WebView */
const destroy = () => {
  if (!nativeWebview) return
  removeListeners()
  try {
    nativeWebview.close?.()
  } catch (e) {}
  nativeWebview = null
}

/** 刷新：销毁后重建 */
const handleReload = async () => {
  isNetworkError.value = false
  isLoading.value = true

  // #ifdef APP-PLUS
  destroy()
  await nextTick()
  if (webUrl.value) {
    createNativeWebview(webUrl.value)
  }
  // #endif

  // #ifdef H5
  const url = webUrl.value
  webUrl.value = ''
  nextTick(() => {
    webUrl.value = url
  })
  // #endif
}

// 页面加载时处理URL
onLoad((options) => {
  if (options?.url) {
    webUrl.value = decodeURIComponent(options.url)
  }
  // 接收 isNeedBack 参数
  if (options?.isNeedBack === 'true' || options?.isNeedBack === '1') {
    isNeedBack.value = true
  }

  // #ifdef APP-PLUS
  if (webUrl.value) {
    nextTick(() => {
      createNativeWebview(webUrl.value)
    })
  }
  // #endif
})

// isNeedBack 为 true 时，从其他 App 返回当前页面自动回退到上一页
onShow(() => {
  if (isNeedBack.value && hasBeenHidden.value) {
    uni.navigateBack({ delta: 1 })
  }
})

// 记录页面是否曾经离开过（用于区分首次 onShow 和从其他 App 返回）
const hasBeenHidden = ref(false)
onHide(() => {
  hasBeenHidden.value = true
})

// 页面卸载时销毁原生 WebView
onUnload(() => {
  destroy()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.page {
  .cnt {
    position: relative;
    background-color: #f7f6f4;
  }
  .pbl,
  .pbr {
    .fbg {
      background-color: #f7f6f4;
    }
  }
}

.error-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 999;
  background-color: #fff;
}

.loading-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 998;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
}
</style>

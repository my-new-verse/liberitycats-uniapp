<template>
  <view>
    <view class="socialOpBox" :style="{ height: cntPaddingTop + 20 + 'rpx' }">
      <view
        class="opItem"
        :class="{ active: tabType === 'liberty' }"
        @click="changeTab('liberty')"
        v-if="getServerOnOff('enable_quote')"
      >
        {{ t('discover.quotes.tag.liberty_cats') }}
      </view>
      <view class="opItem" :class="{ active: tabType === 'hot' }" @click="changeTab('hot')">
        {{ t('discover.quotes.tag.hot') }}
      </view>
    </view>
    <view v-if="tabType === 'hot'" :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
      <template v-if="getServerOnOff('about_exchange_link')">
        <view class="cell" @click="openUrl(getServerOnOff('quote_okx_url', 'common', true))">
          <view class="adCellBox">
            <view class="adLeft">
              <view class="titleBox">
                <view class="title">{{ t('discover.tabs.quotes.okx.ad.title') }}</view>
                <view class="gift"></view>
              </view>
              <view class="desc">
                {{ t('discover.tabs.quotes.okx.ad.desc') }}
              </view>
            </view>
            <view class="adRight">
              <view class="arrow"></view>
            </view>
          </view>
        </view>
        <view class="cell" @click="openUrl(getServerOnOff('quote_binance_url', 'common', true))">
          <view class="adCellBox">
            <view class="adLeft">
              <view class="titleBox">
                <view class="title">{{ t('discover.tabs.quotes.bian.ad.title') }}</view>
                <view class="gift"></view>
              </view>
              <view class="desc">
                {{ t('discover.tabs.quotes.bian.ad.desc') }}
              </view>
            </view>
            <view class="adRight">
              <view class="arrow"></view>
            </view>
          </view>
        </view>
        <view class="cell" style="padding: 12rpx 32rpx" v-if="collectionDetail?.stats?.floorPrice">
          <view class="quoteItem" style="margin-bottom: 0">
            <view class="coinBox" style="width: 50%">
              <view class="coinImg" style="overflow: hidden; border-radius: 50%">
                <image :src="getImageUrl(collectionDetail.image)" mode="widthFix" />
              </view>
              <view class="coinInfo">
                <view class="coinName">{{ collectionDetail.name }}</view>
                <view class="chain">floor price</view>
              </view>
            </view>
            <view
              class="coinPrice"
              style="justify-content: end; margin: 0; font-size: 36rpx; color: #ff6b03"
            >
              <view class="coinPricePrefix">$</view>
              <view class="coinPriceTxt">
                {{ formatNumber(collectionDetail?.stats.floorPrice, 4) }}
              </view>
            </view>
          </view>
        </view>
      </template>
      <view class="cell">
        <view class="quoteOpBar">
          <view>{{ t('discover.quotes.op.title') }}</view>
          <view>{{ t('discover.quotes.op.currency_usdt') }}</view>
        </view>
        <view class="quoteItem" v-for="item in quotesList.data" :key="item.id">
          <view class="coinBox">
            <view class="coinImg">
              <image :src="getImageUrl(item.icon)" mode="widthFix" />
            </view>
            <view class="coinInfo">
              <view class="coinName">{{ item.short_name }}</view>
              <view class="chain">{{ item.name }}</view>
            </view>
          </view>
          <view class="coinPrice">
            <view class="coinPricePrefix">$</view>
            <view class="coinPriceTxt">{{ item.price }}</view>
          </view>
          <view class="upDown" :class="{ down: item.up_down_rate > 0 }">
            {{ (item.up_down_rate > 0 ? '+' : '') + item.up_down_rate }}%
          </view>
        </view>
      </view>
    </view>
    <!-- #ifdef APP-PLUS -->
    <view :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
      <view
        style="padding: 32rpx; background-color: #ffffff; border-radius: 32rpx"
        v-show="tabType === 'liberty' && getServerOnOff('enable_quote')"
      >
        <view class="web" :style="{ height: webHeightPx ? webHeightPx + 'px' : undefined }">
          <view
            v-show="hasWebviewError"
            style="height: 60%; margin-top: 128rpx; border-radius: 32rpx"
          >
            <NetworkError @refresh="handleWebviewReload" />
          </view>
          <view></view>
        </view>
      </view>
    </view>
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <view v-if="tabType === 'liberty' && getServerOnOff('enable_quote')">
      <view style="padding: 32rpx; background-color: #ffffff; border-radius: 32rpx">
        <view class="web" :style="{ height: webHeightPx ? webHeightPx + 'px' : undefined }">
          <web-view
            :key="webviewKey"
            v-show="tabType === 'liberty' && !hasWebviewError"
            id="myWebView"
            src="https://lcat8.com"
            @load="handleWebviewLoaded"
            @error="handleWebviewError"
          ></web-view>
          <view
            v-show="hasWebviewError"
            style="height: 60%; margin-top: 128rpx; border-radius: 32rpx"
          >
            <NetworkError @refresh="handleWebviewReload" />
          </view>
        </view>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getQuotesListApi,
  getQuotesListApiResponse,
  getCollectionDetailApi,
  getCollectionDetailApiResponse,
} from '@/service/api/quotes'
import { formatNumber, getImageUrl, getServerOnOff, openUrl } from '@/utils'
import { t } from '@/locale'
import NetworkError from '@/components/NetworkError.vue'

type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const cntPaddingTop = ref<number>(0)

const props = defineProps<{
  state: LoadMoreState
  cntPaddingTop: number
}>()

const emit = defineEmits<{
  'update:state': [state: LoadMoreState]
  'refresh-complete': []
  'refresh-error': []
}>()

const quotesList = ref<getQuotesListApiResponse>({
  data: [],
  last_page: 1,
  current_page: 0,
})

const collectionDetail = ref<getCollectionDetailApiResponse>({
  name: '',
  stats: {
    floorPrice: '',
  },
})
let webviewembed: any = null

const webRectOption = ref({})
type QuotesTabType = 'liberty' | 'hot'
const tabType = ref<QuotesTabType>(getServerOnOff('enable_quote') ? 'liberty' : 'hot')
watch(
  tabType,
  (newValue) => {
    uni.$emit('switchToChildTab', newValue)
  },
  {
    immediate: true,
    flush: 'pre',
  },
)
const webHeightPx = ref<number>(0)
const webviewKey = ref(0)
let isQuotesTabUnmounted = false
const isQuotesParentTabActive = ref(false)

let isRefreshing = false
const hasLoadedCollection = ref(false)
type QuotesCache = {
  list: getQuotesListApiResponse
  state: LoadMoreState
  scrollTop: number
  hasInitialized: boolean
  isLoading: boolean
}

const createQuotesList = (): getQuotesListApiResponse => ({
  data: [],
  last_page: 1,
  current_page: 0,
})

const createQuotesCache = (): QuotesCache => ({
  list: createQuotesList(),
  state: 'loading',
  scrollTop: 0,
  hasInitialized: false,
  isLoading: false,
})

const quotesCacheMap = ref<Record<QuotesTabType, QuotesCache>>({
  hot: createQuotesCache(),
  liberty: {
    ...createQuotesCache(),
    state: 'finished',
    hasInitialized: true,
  },
})

// 更新加载状态
const updateState = (state: LoadMoreState, type = tabType.value) => {
  quotesCacheMap.value[type].state = state
  emit('update:state', state)
}

const getPageScrollTop = () => {
  return new Promise<number>((resolve) => {
    uni
      .createSelectorQuery()
      .selectViewport()
      .scrollOffset((res: any) => {
        resolve(res?.scrollTop || 0)
      })
      .exec()
  })
}

const saveCurrentScrollTop = async () => {
  quotesCacheMap.value[tabType.value].scrollTop = await getPageScrollTop()
}

const restoreScrollTop = (type: QuotesTabType) => {
  const cache = quotesCacheMap.value[type]
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: cache.hasInitialized ? cache.scrollTop || 0 : 0,
      duration: 0,
    })
  })
}

const syncActiveCache = () => {
  const cache = quotesCacheMap.value[tabType.value]
  quotesList.value = cache.list
  emit('update:state', cache.state)
}

const measureRects = async () => {
  return new Promise<{ webRect: any | null; tabbarRect: any | null }>((resolve) => {
    const query = uni.createSelectorQuery()
    let webRect: any | null = null
    let tabbarRect: any | null = null
    let called = 0

    const done = () => {
      called++
      if (called >= 2) resolve({ webRect, tabbarRect })
    }

    query.select('.custom-tabbar').boundingClientRect((rect) => {
      tabbarRect = rect || null
      done()
    })

    query.select('.web').boundingClientRect((rect) => {
      webRect = rect || null
      done()
    })

    query.exec()
  })
}

const updateWebHeight = async () => {
  await nextTick()
  const sys = uni.getSystemInfoSync()
  const { windowHeight, windowWidth } = sys
  const { webRect, tabbarRect } = await measureRects()
  if (!webRect) return
  const pxPerRpx = windowWidth / 750
  const yellowPaddingBottomPx = 32 * pxPerRpx
  const extraGapPx = 20 * pxPerRpx
  const tabbarTopPx = tabbarRect?.top ?? windowHeight - (tabbarRect?.height || 0)
  const webTopPx = webRect.top || 0
  const nextHeight = tabbarTopPx - extraGapPx - yellowPaddingBottomPx - webTopPx
  webHeightPx.value = Math.max(0, nextHeight)
  await nextTick()
}

const getCurrentPageWebview = () => {
  // #ifdef APP-PLUS
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  return page?.$getAppWebview?.() || null
  // #endif
  return null
}

const removeWebviewListeners = (target?: any) => {
  if (!target) return
  target.onerror = null
  target.onloaded = null
  target.removeEventListener?.('loaded', handleWebviewLoaded)
  target.removeEventListener?.('error', handleWebviewError)
  target.removeEventListener?.('loaderror', handleWebviewError)
  target.removeEventListener?.('receivedError', handleWebviewError)
  target.removeEventListener?.('sslerror', handleWebviewError)
  target.removeEventListener?.('httpError', handleWebviewError)
}

const getPageChildWebviews = () => {
  // #ifdef APP-PLUS
  const currentWebview = getCurrentPageWebview()
  if (!currentWebview) return []
  return currentWebview.children?.() || []
  // #endif
  return []
}

const hideAllPageWebviews = () => {
  // #ifdef APP-PLUS
  getPageChildWebviews().forEach((child: any) => {
    try {
      child.hide?.()
    } catch (error) {
      console.log('hide child webview failed', error)
    }
  })
  // #endif
}

const destroyAllPageWebviews = () => {
  // #ifdef APP-PLUS
  const childWebviews = getPageChildWebviews()
  childWebviews.forEach((child: any) => {
    try {
      removeWebviewListeners(child)
      child.close?.()
    } catch (error) {
      console.log('close child webview failed', error)
    }
  })
  if (webviewembed) {
    removeWebviewListeners(webviewembed)
    webviewembed = null
  }
  // #endif
}

const ensureLibertyWebviewReady = async () => {
  // #ifdef APP-PLUS
  if (!getServerOnOff('enable_quote')) return
  if (!isQuotesParentTabActive.value || tabType.value !== 'liberty') return
  if (webviewembed) {
    setWebviewVisible(true)
    return
  }
  await nextTick()
  await updateWebHeight()
  fixWebViewForApp()
  // #endif
}

const setWebviewVisible = (visible: boolean) => {
  // #ifdef APP-PLUS
  if (visible && !hasWebviewError.value) {
    webviewembed?.show?.()
    return
  }
  hideAllPageWebviews()
  // #endif
}

// 加载行情数据
const loadQuotes = async (page = 1, type: QuotesTabType = 'hot') => {
  const cache = quotesCacheMap.value[type]
  if (type !== 'hot' || cache.isLoading) return

  try {
    cache.isLoading = true
    const res = await getQuotesListApi(page)
    if (page === 1) {
      cache.list = res.data
    } else {
      cache.list.data = cache.list.data.concat(res.data.data)
      cache.list.current_page = res.data.current_page
      cache.list.last_page = res.data.last_page
    }

    // 更新状态为非加载状态
    cache.state = 'success'
    cache.hasInitialized = true
    if (tabType.value === type) {
      quotesList.value = cache.list
      updateState('success', type)
    }
    // 如果是刷新操作，发出刷新完成事件
    if (isRefreshing && page === 1) {
      emit('refresh-complete')
      isRefreshing = false
    }
  } catch (error) {
    cache.state = 'error'
    if (tabType.value === type) {
      updateState('error', type)
    }
    // 如果是刷新操作，发出刷新错误事件
    if (isRefreshing) {
      emit('refresh-error')
      isRefreshing = false
    }
    console.error('Failed to load quotes:', error)
  } finally {
    cache.isLoading = false
  }
}

// 加载行情数据
const loadCollectionDetail = async () => {
  try {
    const res = await getCollectionDetailApi()
    collectionDetail.value = res.data
    hasLoadedCollection.value = true
  } catch (error) {
    console.error('Failed to load collection detail:', error)
  }
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      if (tabType.value !== 'hot') {
        updateState('finished')
        return
      }
      // 检查是否还有更多数据可以加载
      if (quotesList.value.current_page < quotesList.value.last_page) {
        loadQuotes(quotesList.value.current_page + 1, tabType.value)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    }
  },
)

const hasWebviewError = ref(false)
const handleWebviewLoaded = () => {
  if (hasWebviewError.value) return
  hasWebviewError.value = false
}

const handleWebviewError = (event?: any) => {
  console.log('Webview load error, showing error component', event)
  hasWebviewError.value = true
}

// 监听错误状态，自动切换 Webview 显隐
watch(hasWebviewError, (isError) => {
  // #ifdef APP-PLUS
  if (isError) {
    // 出现错误时隐藏 Webview
    hideAllPageWebviews()
  } else {
    // 错误解除且当前处于 liberty 标签页时显示 Webview
    if (tabType.value === 'liberty' && webviewembed) {
      webviewembed.show()
    }
  }
  // #endif
})

// 处理组件刷新按钮点击
const handleWebviewReload = () => {
  console.log('用户点击了网络错误页的刷新按钮')
  // #ifdef APP-PLUS
  destroyAllPageWebviews()
  // #endif

  // 重置错误状态并重新创建 WebView
  hasWebviewError.value = false
  webviewKey.value++
  fixWebViewForApp()
}

const fixWebViewForApp = async () => {
  // #ifdef APP-PLUS
  await nextTick()
  if (isQuotesTabUnmounted) return
  hasWebviewError.value = false // 开始加载前重置错误状态

  try {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]

    const sys = uni.getSystemInfoSync()
    const rpx2px = 750 / sys.windowWidth
    const radiusPx = 32 / rpx2px

    measureRects()
      .then(({ webRect }) => {
        if (isQuotesTabUnmounted) return
        if (!webRect) {
          console.log('Failed to get webRect')
          hasWebviewError.value = true
          return
        }

        destroyAllPageWebviews()

        webRectOption.value = webRect

        const wvStyle = {
          top: webRect.top || 0,
          left: webRect.left || 0,
          width: webRect.width || 0,
          height: webRect.height || 0,
          borderRadius: radiusPx,
          scalable: true,
          progress: { color: '#ff6b03', height: '2px' },
        }
        console.log('-----', wvStyle)
        const webviewUrl: string = 'https://lcat8.com'
        // const webviewUrl: string = 'https://x.com/libertycats_app?s=21&t=WgFwIbY7xp0aZtdoT0lwqw'
        // 创建新的 webview 实例
        webviewembed = plus.webview.create(webviewUrl, '', wvStyle)

        // 设置错误处理 - 失败时直接显示错误组件，不重试
        webviewembed.onerror = handleWebviewError
        webviewembed.addEventListener?.('error', handleWebviewError)
        webviewembed.addEventListener?.('loaderror', handleWebviewError)
        webviewembed.addEventListener?.('receivedError', handleWebviewError)
        webviewembed.addEventListener?.('sslerror', handleWebviewError)
        webviewembed.addEventListener?.('httpError', handleWebviewError)
        webviewembed.addEventListener?.('loaded', handleWebviewLoaded)

        // 成功加载的处理
        webviewembed.onloaded = () => {
          console.log('Webview loaded successfully')
          handleWebviewLoaded()
        }

        // 把 webview 追加到当前页面
        const currentWebview = page.$getAppWebview()
        if (currentWebview) {
          currentWebview.append(webviewembed)
        }

        setWebviewVisible(tabType.value === 'liberty')
      })
      .catch((e) => {
        console.log('webview创建失败', e)
        hasWebviewError.value = true
      })
  } catch (e) {
    console.log('webview修复最终失败', e)
    hasWebviewError.value = true
  }
  // #endif
}

const changeTab = async (type: QuotesTabType) => {
  if (tabType.value === type) return
  await saveCurrentScrollTop()
  tabType.value = type
  syncActiveCache()
  restoreScrollTop(type)
  if (type === 'liberty') {
    await updateWebHeight()
  }
  await nextTick()
  if (type === 'liberty' && getServerOnOff('enable_quote')) {
    await ensureLibertyWebviewReady()
  } else {
    hideAllPageWebviews()
  }
  if (type === 'hot' && !quotesCacheMap.value.hot.hasInitialized) {
    loadQuotes(1, 'hot')
  }
}

onMounted(async () => {
  isQuotesTabUnmounted = false
  isQuotesParentTabActive.value = true
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)
  navHeight.value = safeTopRpx.value + 80
  cntPaddingTop.value = navHeight.value + 20

  syncActiveCache()
  if (!quotesCacheMap.value.hot.hasInitialized) {
    loadQuotes(1, 'hot')
  }
  if (!hasLoadedCollection.value) {
    loadCollectionDetail()
  }
  // 监听刷新事件
  uni.$on('refreshQuotesTab', () => {
    isRefreshing = true
    if (tabType.value === 'hot') {
      loadQuotes(1, 'hot')
    } else {
      emit('refresh-complete')
      isRefreshing = false
    }
  })
  uni.$on('discoverActiveTabChange', (tabName: string) => {
    isQuotesParentTabActive.value = tabName === t('discover.tabs.quotes')
    if (!isQuotesParentTabActive.value) {
      hideAllPageWebviews()
      return
    }
    ensureLibertyWebviewReady()
  })
  uni.$on('discoverPageVisibilityChange', (visible: boolean) => {
    if (visible) {
      if (isQuotesParentTabActive.value) ensureLibertyWebviewReady()
      return
    }
    destroyAllPageWebviews()
  })
  await ensureLibertyWebviewReady()
})

// 组件卸载时移除事件监听
// 解决merge
onUnmounted(() => {
  console.log('destroyWebView ========')
  isQuotesTabUnmounted = true
  destroyAllPageWebviews()
  uni.$off('discoverActiveTabChange')
  uni.$off('discoverPageVisibilityChange')
  uni.$off('refreshQuotesTab')
})

onShow(() => {
  syncActiveCache()
  if (!isQuotesParentTabActive.value) {
    hideAllPageWebviews()
    return
  }
  ensureLibertyWebviewReady()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.socialOpBox {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 36rpx;
  padding-bottom: 12rpx;
  .opItem {
    margin-right: 16rpx;
    font-size: 28rpx;
    font-weight: 400;
    line-height: 33rpx;
    color: #999999;
  }

  .opItem.active {
    font-weight: 500;
    color: #ff6b03;
  }
}

.filterBox {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  margin-bottom: 20rpx;
  color: #999;
  background-color: #efefef;
}
// quotes start
.quoteOpBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48rpx;
  color: #999;
  //background-color: #efefef;
}
.quoteItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 120rpx;
  margin-bottom: 20rpx;
  .coinBox {
    display: flex;
    align-items: center;
    width: 240rpx;
    .coinImg {
      width: 80rpx;
      height: 80rpx;
      margin-right: 16rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }
    .coinInfo {
      .coinName {
        margin-bottom: 4rpx;
        font-size: 32rpx;
        font-weight: 500;
        line-height: 38rpx;
        color: #261000;
      }
      .chain {
        font-size: 24rpx;
        font-weight: 500;
        line-height: 28rpx;
        color: rgba(0, 0, 0, 0.4);
      }
    }
  }
  .coinPrice {
    display: flex;
    align-items: center;
    justify-content: end;
    width: calc(100% - 480rpx);
    margin: 0 40rpx;
    font-size: 32rpx;
    font-weight: 500;
    line-height: 38rpx;
    color: #261000;
  }
  .upDown {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160rpx;
    height: 64rpx;
    font-size: 28rpx;
    font-weight: 500;
    line-height: 33rpx;
    color: #ffffff;
    background-color: #1ec880;
    border-radius: 24rpx;
  }
  .down {
    background-color: #f04f45;
  }
}
// quotes end

.adCellBox {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .adLeft {
    display: flex;
    flex-direction: column;
    width: calc(100% - 40rpx - 56rpx);

    .titleBox {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      .title {
        margin-right: 10rpx;
        font-size: 32rpx;
        font-style: normal;
        font-weight: 600;
        color: #261000;
        text-align: left;
      }
    }
    .desc {
      margin-top: 10rpx;
      font-size: 24rpx;
      font-style: normal;
      font-weight: 400;
      color: #999999;
    }
  }
}
.arrow {
  width: 56rpx;
  height: 56rpx;
  background-image: url('@/static/images/view_btn.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.gift {
  width: 32rpx;
  height: 32rpx;
  background-image: url('@/static/images/gift.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.floorPrice {
  font-size: 16px;
  font-style: normal;
  font-weight: 600;
  color: #ff6b03;
}

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
}
.socialOpBox {
  position: fixed;
  width: 100vw;
  z-index: 10;
  align-items: flex-end !important;
  background-color: var(--liberty-cats-page-background-color);
  // height: 36rpx;
}
</style>

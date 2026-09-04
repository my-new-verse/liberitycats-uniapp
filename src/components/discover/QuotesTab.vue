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
      <view
        class="opItem"
        :class="{ active: tabType === 'portfolio' }"
        @click="changeTab('portfolio')"
        v-if="getServerOnOff('portfolio_chart_enable', 'common')"
      >
        {{ t('discover.quotes.tag.portfolio') }}
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
            <view class="coinBox">
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
              style="
                justify-content: end;
                margin: 0;
                font-size: calc(36rpx * var(--font-scale));
                color: #ff6b03;
              "
            >
              <view class="coinPricePrefix">$</view>
              <view class="coinPriceTxt">
                {{ formatNumber(collectionDetail?.stats.floorPrice, 4) }}
              </view>
            </view>
          </view>
        </view>
      </template>
      <CryptoQuotesList :items="quotesList.data" />
    </view>
    <view :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
      <QuoteWebview
        ref="libertyWVRef"
        type="liberty"
        :url="getWebviewUrl('liberty')"
        :heightPx="webHeightPx"
        :active="tabType === 'liberty' && isQuotesParentTabActive && getServerOnOff('enable_quote')"
      />
      <QuoteWebview
        ref="zhuangeWVRef"
        type="portfolio"
        :url="getWebviewUrl('portfolio')"
        :heightPx="webHeightPx"
        :active="
          tabType === 'portfolio' &&
          isQuotesParentTabActive &&
          getServerOnOff('portfolio_chart_enable', 'common')
        "
      />
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import {
  getQuotesListApi,
  getQuotesListApiResponse,
  getCollectionDetailApi,
  getCollectionDetailApiResponse,
  getInvestmentPortfolioEntryTokenApi,
  getInvestmentPortfolioEntryTokenApiResponse,
} from '@/service/api/quotes'
import { formatNumber, getImageUrl, getServerOnOff, openUrl } from '@/utils'
import { t } from '@/locale'
import QuoteWebview from '@/components/quote-webview/quote-webview.vue'
import CryptoQuotesList from '@/components/discover/CryptoQuotesList.vue'
import { useUserStore } from '@/store'

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
type QuotesTabType = 'liberty' | 'portfolio' | 'hot'
type WebviewTabType = 'liberty' | 'portfolio'

// ========== WebView 子组件协调 ==========
const libertyWVRef = ref<InstanceType<typeof QuoteWebview>>()
const zhuangeWVRef = ref<InstanceType<typeof QuoteWebview>>()
const userStore = useUserStore()

const LIBERTY_WEBVIEW_URL = 'https://lcat8.com'
const PORTFOLIO_WEBVIEW_URL = 'http://47.236.146.191:3000/#analysis-section'

// 存储 portfolio 的 jumpUrl
const portfolioJumpUrl = ref<string>('')
let isFetchingPortfolioToken = false
let portfolioActivationTask: Promise<void> | null = null
let portfolioTokenFetchedAt = 0
let portfolioTokenExpiresInMs = 0

const getWebviewUrl = (type: WebviewTabType): string => {
  if (type === 'portfolio') {
    return (
      portfolioJumpUrl.value ||
      (getServerOnOff('portfolio_chart_url ', 'common', true) as string) ||
      PORTFOLIO_WEBVIEW_URL
    )
  }
  return (getServerOnOff('quote_chart_url', 'common', true) as string) || LIBERTY_WEBVIEW_URL
}

/** 获取当前活跃 WebView 的组件 ref */
const getActiveWebviewRef = () => {
  if (tabType.value === 'liberty') return libertyWVRef.value
  if (tabType.value === 'portfolio') return zhuangeWVRef.value
  return null
}

/** 获取 portfolio 入口 token */
const fetchPortfolioToken =
  async (): Promise<getInvestmentPortfolioEntryTokenApiResponse | null> => {
    if (isFetchingPortfolioToken) {
      return null
    }

    try {
      isFetchingPortfolioToken = true
      const res = await getInvestmentPortfolioEntryTokenApi()
      if (res.data?.jumpUrl) {
        console.log('[QuotesTab] 获取 portfolio 入口 token 成功:', res.data.jumpUrl)
        return res.data
      }
    } catch (error) {
      console.error('[QuotesTab] 获取 portfolio 入口 token 失败:', error)
    } finally {
      isFetchingPortfolioToken = false
    }

    return null
  }

/** portfolio token 是否仍在接口声明的有效期内。 */
const isPortfolioTokenCacheValid = () => {
  if (!portfolioJumpUrl.value || !portfolioTokenFetchedAt || portfolioTokenExpiresInMs <= 0) {
    return false
  }
  return Date.now() - portfolioTokenFetchedAt < portfolioTokenExpiresInMs
}

/**
 * 进入 portfolio 时重新获取入口 URL。
 * URL 变化时重建 WebView，未变化时复用已有实例。
 * 多个页面生命周期事件可能在同一时刻触发，这里合并为一次请求和刷新。
 */
const activatePortfolioWebview = async () => {
  if (portfolioActivationTask) return portfolioActivationTask

  portfolioActivationTask = (async () => {
    const wvRef = zhuangeWVRef.value
    if (!wvRef) return

    // token 仍在有效期内，不调用接口，直接展示缓存 WebView。
    if (isPortfolioTokenCacheValid()) {
      await wvRef.create()
      wvRef.show()
      return
    }

    const previousUrl = portfolioJumpUrl.value
    const tokenData = await fetchPortfolioToken()
    const nextUrl = tokenData?.jumpUrl

    // 请求期间用户可能已离开 portfolio，不再显示原生 WebView。
    if (
      tabType.value !== 'portfolio' ||
      !isQuotesParentTabActive.value ||
      !getServerOnOff('portfolio_chart_enable', 'common')
    ) {
      return
    }

    // 请求失败时保留并展示已有缓存，不破坏当前 WebView。
    if (!nextUrl || !tokenData) {
      if (previousUrl) {
        await wvRef.create()
        wvRef.show()
      }
      return
    }

    portfolioTokenFetchedAt = Date.now()
    // const expiresInSeconds = 60
    const expiresInSeconds = Number(tokenData.tempTokenExpiresIn)
    portfolioTokenExpiresInMs =
      Number.isFinite(expiresInSeconds) && expiresInSeconds > 0 ? expiresInSeconds * 1000 : 0

    if (previousUrl && nextUrl !== previousUrl) {
      console.log('[QuotesTab] portfolio 入口 URL 已变化，销毁并重建 WebView')
      // 先销毁使用旧 URL 的实例，再更新 prop，防止 iframe 提前自动导航。
      wvRef.destroy()
      portfolioJumpUrl.value = nextUrl
      await nextTick()
      await wvRef.create()
      wvRef.show()
      return
    }

    // 首次获取 URL 时直接创建；后续 URL 相同则不会修改响应式值。
    if (!previousUrl) {
      portfolioJumpUrl.value = nextUrl
      await nextTick()
    }
    // URL 未变化时 create() 只会复用已有实例，直接展示缓存页面。
    await wvRef.create()
    wvRef.show()
  })().finally(() => {
    portfolioActivationTask = null
  })

  return portfolioActivationTask
}

/** 显示当前子 Tab 的 WebView，portfolio 每次都先刷新 token。 */
const activateCurrentWebview = async () => {
  if (tabType.value === 'portfolio') {
    await activatePortfolioWebview()
    return
  }

  const wvRef = getActiveWebviewRef()
  if (wvRef) {
    // liberty 始终复用已有 WebView，只做显示/隐藏，不主动刷新。
    await wvRef.create()
    wvRef.show()
  }
}

/** 批量操作所有 WebView 组件 */
const forEachWebviewRef = (fn: (wv: InstanceType<typeof QuoteWebview>) => void) => {
  ;[libertyWVRef.value, zhuangeWVRef.value].forEach((r) => {
    if (r) fn(r)
  })
}

// 退出登录时销毁 WebView，避免原生 WebView 继续保留上一个账号的会话。
watch(
  () => userStore.isLogin,
  (isLogin, wasLogin) => {
    if (!isLogin && wasLogin) {
      forEachWebviewRef((wv) => wv.destroy())
      portfolioJumpUrl.value = ''
      isFetchingPortfolioToken = false
      portfolioActivationTask = null
      portfolioTokenFetchedAt = 0
      portfolioTokenExpiresInMs = 0
    }
  },
)

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
  portfolio: {
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

const measureRects = async (type?: WebviewTabType) => {
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

    const selector = type ? `.web-${type}` : '.web'
    query.select(selector).boundingClientRect((rect) => {
      webRect = rect || null
      done()
    })

    query.exec()
  })
}

const updateWebHeight = async (type?: WebviewTabType) => {
  await nextTick()
  const sys = uni.getSystemInfoSync()
  const { windowHeight, windowWidth } = sys
  const { webRect, tabbarRect } = await measureRects(type)
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

const changeTab = async (type: QuotesTabType) => {
  if (tabType.value === type) return
  await saveCurrentScrollTop()

  // 隐藏所有 WebView
  forEachWebviewRef((wv) => wv.hide())

  tabType.value = type
  syncActiveCache()
  restoreScrollTop(type)

  if (type === 'liberty' || type === 'portfolio') {
    await updateWebHeight(type as WebviewTabType)
  }
  await nextTick()

  if (type === 'liberty' && getServerOnOff('enable_quote')) {
    const wvRef = getActiveWebviewRef()
    if (wvRef) {
      await wvRef.create()
      wvRef.show()
    }
  }

  // portfolio 需要先获取 token
  if (type === 'portfolio' && getServerOnOff('portfolio_chart_enable', 'common')) {
    await activatePortfolioWebview()
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
      forEachWebviewRef((wv) => wv.hide())
      return
    }
    // 先隐藏所有，确保非活跃 WebView 不会覆盖页面
    forEachWebviewRef((wv) => wv.hide())
    activateCurrentWebview()
  })
  uni.$on('discoverPageVisibilityChange', (visible: boolean) => {
    if (visible) {
      if (isQuotesParentTabActive.value) {
        // 先隐藏所有，确保非活跃 WebView 不会覆盖页面
        forEachWebviewRef((wv) => wv.hide())
        activateCurrentWebview()
      }
      return
    }
    // 切换底部 tabbar 时隐藏而非销毁，回来后 create() 检测到已有实例只会 show()
    forEachWebviewRef((wv) => wv.hide())
  })

  // 初始就绪检查：先测量高度，再创建 WebView
  if (tabType.value === 'liberty' || tabType.value === 'portfolio') {
    await updateWebHeight(tabType.value as WebviewTabType)
  }
  await activateCurrentWebview()
})

// 组件卸载时移除事件监听
// 解决merge
onUnmounted(() => {
  console.log('destroyWebView ========')
  isQuotesTabUnmounted = true
  forEachWebviewRef((wv) => wv.destroy())
  uni.$off('discoverActiveTabChange')
  uni.$off('discoverPageVisibilityChange')
  uni.$off('refreshQuotesTab')
})

onShow(() => {
  syncActiveCache()
  if (!isQuotesParentTabActive.value) {
    forEachWebviewRef((wv) => wv.hide())
    return
  }
  // 先隐藏所有，确保非活跃 WebView 不会覆盖页面
  forEachWebviewRef((wv) => wv.hide())
  activateCurrentWebview()
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
  overflow-x: auto;
  .opItem {
    margin-right: 16rpx;
    font-size: calc(28rpx * var(--font-scale));
    font-weight: 400;
    line-height: calc(33rpx * var(--font-scale));
    color: var(--text-secondary);
    white-space: nowrap; // 文字单行，不换行
    flex-shrink: 0;
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
  color: var(--text-secondary);
  background-color: #efefef;
}
// quotes start
.quoteItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 120rpx;
  margin-bottom: 20rpx;
  .coinBox {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    .coinImg {
      width: 80rpx;
      height: 80rpx;
      margin-right: 16rpx;
      flex-shrink: 0;
      image {
        width: 100%;
        height: 100%;
      }
    }
    .coinInfo {
      flex: 1;
      min-width: 0;
      overflow-x: auto;
      .coinName {
        margin-bottom: 4rpx;
        font-size: calc(32rpx * var(--font-scale));
        font-weight: 500;
        line-height: calc(38rpx * var(--font-scale));
        color: var(--text-primary);
        white-space: nowrap;
      }
      .chain {
        font-size: calc(24rpx * var(--font-scale));
        font-weight: 500;
        line-height: calc(28rpx * var(--font-scale));
        color: var(--black-40);
        white-space: nowrap;
      }
    }
  }
  .coinPrice {
    display: flex;
    align-items: center;
    justify-content: end;
    flex-shrink: 1;
    min-width: 0;
    max-width: 260rpx;
    margin: 0 40rpx;
    font-size: calc(32rpx * var(--font-scale));
    font-weight: 500;
    line-height: calc(38rpx * var(--font-scale));
    color: var(--text-primary);
    .coinPriceTxt {
      min-width: 0;
      overflow-x: auto;
      white-space: nowrap;
    }
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
        font-size: calc(32rpx * var(--font-scale));
        font-style: normal;
        font-weight: 600;
        color: var(--text-primary);
        text-align: left;
      }
    }
    .desc {
      margin-top: 10rpx;
      font-size: calc(24rpx * var(--font-scale));
      font-style: normal;
      font-weight: 400;
      color: var(--text-secondary);
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
  font-size: calc(16px * var(--font-scale));
  font-style: normal;
  font-weight: 600;
  color: #ff6b03;
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

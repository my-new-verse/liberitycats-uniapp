<template>
  <view>
    <view class="socialOpBox">
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
    <template v-if="tabType === 'hot'">
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
    </template>
    <!-- #ifdef APP-PLUS -->
    <view
      style="padding: 32rpx; background-color: #ffffff; border-radius: 32rpx"
      v-show="tabType === 'liberty' && getServerOnOff('enable_quote')"
    >
      <view class="web" :style="{ height: webHeightPx ? webHeightPx + 'px' : undefined }">
        <view>
          <web-view id="myWebView" src="https://lcat8.com"></web-view>
        </view>
      </view>
    </view>
    <!-- #endif -->
    <!-- #ifdef H5 -->
    <template v-if="tabType === 'liberty' && getServerOnOff('enable_quote')">
      <view style="padding: 32rpx; background-color: #ffffff; border-radius: 32rpx">
        <view class="web" :style="{ height: webHeightPx ? webHeightPx + 'px' : undefined }">
          <web-view
            v-show="tabType === 'liberty'"
            id="myWebView"
            src="https://lcat8.com"
          ></web-view>
        </view>
      </view>
    </template>
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

type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const cntPaddingTop = ref<number>(0)

const props = defineProps<{
  state: LoadMoreState
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

const tabType = ref<'liberty' | 'hot'>('hot')
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

let isRefreshing = false

// 更新加载状态
const updateState = (state: LoadMoreState) => {
  emit('update:state', state)
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

// 加载行情数据
const loadQuotes = async (page = 1) => {
  try {
    const res = await getQuotesListApi(page)
    if (page === 1) {
      quotesList.value = res.data
    } else {
      quotesList.value.data = quotesList.value.data.concat(res.data.data)
      quotesList.value.current_page = res.data.current_page
      quotesList.value.last_page = res.data.last_page
    }

    // 更新状态为非加载状态
    updateState('success')
    // 如果是刷新操作，发出刷新完成事件
    if (isRefreshing && page === 1) {
      emit('refresh-complete')
      isRefreshing = false
    }
  } catch (error) {
    updateState('error')
    // 如果是刷新操作，发出刷新错误事件
    if (isRefreshing) {
      emit('refresh-error')
      isRefreshing = false
    }
    console.error('Failed to load quotes:', error)
  }
}

// 加载行情数据
const loadCollectionDetail = async () => {
  try {
    const res = await getCollectionDetailApi()
    collectionDetail.value = res.data
  } catch (error) {
    console.error('Failed to load collection detail:', error)
  }
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      // 检查是否还有更多数据可以加载
      if (quotesList.value.current_page < quotesList.value.last_page) {
        loadQuotes(quotesList.value.current_page + 1)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    }
  },
)

const fixWebViewForApp = async () => {
  // #ifdef APP-PLUS
  await nextTick()
  setTimeout(async () => {
    try {
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      const currentWebview = page.$getAppWebview()
      const wv = currentWebview.children()[0]
      if (!wv) return

      const sys = uni.getSystemInfoSync()
      const rpx2px = 750 / sys.windowWidth
      const radiusPx = 32 / rpx2px

      const { webRect } = await measureRects()
      if (!webRect) return

      wv.setStyle({
        top: webRect.top || 0,
        left: webRect.left || 0,
        width: webRect.width || 0,
        height: webRect.height || 0,
        borderRadius: radiusPx,
        scalable: true,
      })

      wv.show()
    } catch (e) {
      console.log('webview修复失败', e)
    }
  }, 0)
  // #endif
}

const changeTab = async (type) => {
  tabType.value = type
  await updateWebHeight()
  await nextTick()
  if (type === 'liberty' && getServerOnOff('enable_quote')) {
    fixWebViewForApp()
  }
}
const destroyWebView = () => {
  // #ifdef APP-PLUS
  // 1. 获取当前页面的 WebView 实例
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const currentWebview = page.$getAppWebview()

  // 2. 查找子 WebView（<web-view> 是子窗口）
  const children = currentWebview.children()
  if (children.length > 0) {
    const wv = children[0]
    wv.close() // 关闭并销毁
    // 或 wv.hide() 只是隐藏，不销毁
  }
  // #endif
}

onMounted(async () => {
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

  loadQuotes()
  loadCollectionDetail()
  // 监听刷新事件
  uni.$on('refreshQuotesTab', () => {
    isRefreshing = true
    loadQuotes(1)
  })
  if (getServerOnOff('enable_quote')) {
    await nextTick()
    await updateWebHeight()
    fixWebViewForApp()
  }
})

// 组件卸载时移除事件监听
// 解决merge
onUnmounted(() => {
  console.log('destroyWebView ========')
  if (getServerOnOff('enable_quote')) {
    destroyWebView()
  }
  uni.$off('refreshQuotesTab')
})

onShow(() => {
  tabType.value = getServerOnOff('enable_quote') ? 'liberty' : 'hot'
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.socialOpBox {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 36rpx;
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
</style>

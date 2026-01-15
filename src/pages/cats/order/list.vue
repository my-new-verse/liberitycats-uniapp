<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%my_order.index.page_title%',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="searchBox">
            <wd-input
              type="text"
              :placeholder="t('my_order.index.search.placeholder')"
              :no-border="true"
              custom-class="searchInput"
              clearable
              clear-trigger="focus"
              v-model="searchOrderKey"
              inputmode="search"
              @confirm="handleSearch"
              @blur="handleSearch"
              custom-input-class="searchInput2"
              :ignoreCompositionEvent="false"
            />
          </view>
          <view class="kf" @click="handleKf"></view>
        </view>
      </view>
      <view class="navBg">
        <view class="pbl2">
          <view class="fbg"></view>
        </view>
        <view class="pbr2">
          <view class="fbg"></view>
        </view>
      </view>
    </view>

    <view class="cnt" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <template v-if="responseData.data.length > 0">
        <view class="cell" v-for="item in responseData.data" :key="item.id">
          <view class="">
            <view class="goodsList">
              <template v-if="item.sku_items.length > 0">
                <view class="item" v-for="(skuItem, index2) in item.sku_items" :key="index2">
                  <view class="goodsImg">
                    <image class="cover" :src="getImageUrl(skuItem.sku_cover)" mode="widthFix" />
                  </view>
                  <view class="goodsInfo">
                    <view class="goodsName">{{ skuItem.goods_name }}</view>
                    <view class="goodsAttr">{{ skuItem.sku_attributes }}</view>
                  </view>
                  <view class="goodsPrice">
                    <view class="goodsPriceTxt">
                      {{ skuItem.sku_price }}
                      <text class="goodsPriceUnit">{{ item.order_currency }}</text>
                    </view>
                    <view class="goodsPriceNum">x{{ skuItem.quantity }}</view>
                  </view>
                </view>
              </template>
            </view>
          </view>
          <view class="extend">
            <view class="priceBox">
              <view class="label">{{ t('my_order.index.actual_payment') }}</view>
              <view class="price">{{ item.order_total_price }}</view>
              <view class="priceUnit">{{ item.order_currency }}</view>
            </view>
            <view class="detailBtn">
              <wd-button
                plain
                v-if="item.order_status === 0"
                @click="toUrl('/pages/cats/pay/index?order_no=' + item.order_no, true, true)"
                style="margin-right: 10rpx"
              >
                {{ t('my_order.index.pay_btn_txt') }}
              </wd-button>
              <wd-button
                type="info"
                plain
                @click="toUrl('/pages/cats/order/detail?order_no=' + item.order_no)"
              >
                {{ t('my_order.index.view_details') }}
              </wd-button>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="emptyBox">
          <view class="emptyImg"></view>
          <view class="emptyText">{{ t('common.empty') }}</view>
        </view>
      </template>
    </view>

    <wd-loadmore :state="state" @reload="loadMore" />
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, toUrl } from '@/utils'
import { GetOrderListResponse, getOrderListApi } from '@/service/api/order'

import { useToast } from 'wot-design-uni'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
// 语言
const locale = uni.getLocale()
const toast = useToast()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

onReachBottom(() => {
  if (responseData.value?.current_page < responseData.value?.last_page) {
    loadMore()
  }
})

onShow(() => {
  responseData.value.data = []
  responseData.value.current_page = 0
  responseData.value.last_page = 1
  loadMore()
})

const responseData = ref<GetOrderListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
  per_page: 15,
})

const searchOrderKey = ref<string>('')
const loadMore = () => {
  state.value = 'loading'
  uni.showLoading()
  getOrderListApi(responseData.value?.current_page + 1, searchOrderKey.value)
    .then((res) => {
      if (!res.data) return
      responseData.value.data = responseData.value.data.concat(res.data.data)
      responseData.value.current_page = res.data.current_page
      responseData.value.last_page = res.data.last_page
      if (responseData.value?.current_page === responseData.value?.last_page) {
        state.value = 'finished'
      }
    })
    .finally(() => {
      uni.hideLoading()
      searchLoading.value = false
    })
}

const searchLoading = ref(false)
const handleSearch = () => {
  // if (searchOrderKey.value.trim() === '') {
  //   uni.showToast({
  //     title: t('my_order.index.search.placeholder'),
  //     icon: 'none',
  //   })
  //   return
  // }
  if (searchLoading.value) {
    return
  }

  searchLoading.value = true

  responseData.value.data = []
  responseData.value.current_page = 0
  responseData.value.last_page = 1
  state.value = 'loading'
  loadMore()
}

const handleKf = () => {
  toUrl('/pages/cats/kf/add', true)
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
//
.page {
  background-color: var(--liberty-cats-page-background-color);
  .cnt {
    padding: 40rpx;
  }
}

.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 999;
  width: 100%;
  height: calc(104rpx + var(--liberty-cats-page-common-border-radius) + env(safe-area-inset-top));
  overflow: hidden;

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    padding-top: calc(env(safe-area-inset-top));
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);

    .navCnt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 48rpx);
      height: 104rpx;
      padding: 0 24rpx;

      .left {
        width: 48rpx;
        height: 48rpx;
        margin-right: 16rpx;
        image {
          width: 100%;
          height: 100%;
        }
      }
      .searchBox {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: calc(100% - 48rpx - 16rpx - 12rpx);
        height: 56rpx;
        padding: 6rpx;
        background-color: #ffffff;
        border-radius: 34rpx;

        .searchBtn {
          width: 162rpx;
          min-width: 0;
          height: 56rpx;
          padding: 0;
          background-color: var(--liberty-cats-primary-color);
          border-radius: 34rpx;
        }
        .searchInput {
          display: flex;
          align-items: center;
          width: calc(100% - 48rpx);
          height: 100%;
          margin-left: 24rpx;
          .searchInput2 {
            width: 100%;
            height: 100%;
            padding: 0;
            font-size: 28rpx;
            color: #000000;
            background-color: transparent;
            border-radius: 34rpx;
          }
        }
      }

      .kf {
        width: 48rpx;
        height: 48rpx;
        margin-left: 32rpx;
        background-image: url('~@/static/images/kf.png');
        background-repeat: no-repeat;
        background-position: 100%;
        background-size: 100%;
      }
    }
  }

  .navBg {
    position: relative;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: transparent;

    .pbl2,
    .pbr2 {
      position: absolute;
      top: 0;
      z-index: 9;
      width: var(--liberty-cats-page-common-border-radius);
      height: var(--liberty-cats-page-common-border-radius);
      overflow: hidden;
      background-color: var(--liberty-cats-primary-color);

      .fbg {
        width: 100%;
        height: 100%;
        background-color: var(--liberty-cats-page-background-color);
      }
    }

    .pbl2 {
      left: 0;
      .fbg {
        border-radius: var(--liberty-cats-page-common-border-radius) 0 0 0;
      }
    }
    .pbr2 {
      right: 0;
      .fbg {
        border-radius: 0 var(--liberty-cats-page-common-border-radius) 0 0;
      }
    }
  }
}

.extend {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  width: 100%;
  margin-top: 24rpx;
  margin-left: auto;
  .priceBox {
    display: flex;
    align-items: baseline;
    justify-content: flex-end;
    width: 100%;
    margin-left: auto;
    color: #261000;
    .label {
      font-size: 28rpx;
      font-weight: 400;
      line-height: 33rpx;
    }
    .price {
      margin: 24rpx 8rpx;
      font-size: 28rpx;
      font-weight: 500;
      line-height: 33rpx;
    }
    .priceUnit {
      font-size: 20rpx;
      font-weight: 400;
      color: #261000;
    }
  }

  .detailBtn {
    display: flex;
    align-items: flex-end;
    margin-top: 12rpx;
    margin-left: auto;
  }
}
</style>

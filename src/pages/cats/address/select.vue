<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%address.select.page_title%',
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
          <view class="searchBox">{{ t('address.select.page_title') }}</view>
          <view class="kf" @click="toUrl('/pages/cats/address/add?bak=select', true, true)"></view>
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
          <view class="addressBox">
            <view class="infoBox">
              <view class="titleBox">
                <view class="name">{{ item.name }}</view>
                <view class="phone">
                  <template v-if="item.area_code">+{{ item.area_code }}</template>
                  {{ item.cellphone }}
                </view>
                <view class="default" v-if="item.is_default == 1">
                  {{ t('common.address.default_txt') }}
                </view>
              </view>
              <view class="address">
                {{ item.address }}
              </view>
            </view>
            <view class="checkbox" @click="selectAddress(item)">
              <view
                class="radioBox"
                :class="{
                  checked:
                    (selectedAddress == null && item.is_default == 1) ||
                    selectedAddress?.id == item.id,
                }"
              ></view>
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <view class="emptyBox">
          <view class="emptyIcon">
            <image src="/static/images/empty.png" mode="widthFix" />
          </view>
          <view class="emptyTxt">
            {{ t('address.select.empty_txt') }}
          </view>
        </view>
      </template>
    </view>

    <view class="fixedBtnBox">
      <view>
        <wd-button custom-class="mainBtn" :disabled="disabledSelect" @click="selectAddressSubmit">
          {{ t('address.select.select_btn_txt') }}
        </wd-button>
      </view>
    </view>

    <wd-loadmore :state="state" @reload="loadMore" />
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getMyAddressListResponse, getMyAddressListApi, addressItem } from '@/service/api/address'
import { toUrl } from '@/utils'
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

const responseData = ref<getMyAddressListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
})
onReachBottom(() => {
  if (responseData.value?.current_page < responseData.value?.last_page) {
    loadMore()
  }
})

onLoad(() => {
  loadMore()
})

const loadMore = () => {
  state.value = 'loading'
  getMyAddressListApi(responseData.value?.current_page + 1).then((res) => {
    if (!res.data) return
    responseData.value.data = responseData.value.data.concat(res.data.data)
    responseData.value.current_page = res.data.current_page
    responseData.value.last_page = res.data.last_page
    if (responseData.value?.current_page === responseData.value?.last_page) {
      state.value = 'finished'
    }
  })
}

const selectedAddress = ref<addressItem | null>(null)
const selectAddress = (item: addressItem) => {
  disabledSelect.value = false
  selectedAddress.value = item
}

const disabledSelect = ref<boolean>(true)

const selectAddressSubmit = () => {
  if (!selectedAddress.value.id) {
    toast.info(t('address.select.pleaseSelectAddress'))
    return
  }
  // 触发事件并传递地址ID
  uni.$emit('addressSelected', selectedAddress.value)
  uni.navigateBack({ delta: 1 })
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
        justify-content: center;
        width: calc(100% - 48rpx - 16rpx - 12rpx);
        height: 56rpx;
        padding: 6rpx;
        font-size: 32rpx;
        font-weight: 600;
        line-height: 48rpx;
        color: #ffffff;
        text-align: center;
      }

      .kf {
        width: 32rpx;
        height: 32rpx;
        margin-left: 32rpx;
        background-image: url('~@/static/images/union.png');
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

.addressBox {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .infoBox {
    width: calc(100% - 100rpx);
    .titleBox {
      display: flex;
      flex-direction: column;
      justify-content: start;
      margin-bottom: 12rpx;
      .name {
        font-size: 36rpx;
        font-style: normal;
        font-weight: 600;
        line-height: 52rpx;
        color: #261000;
      }
      .phone {
        margin: 0 24rpx;
        font-size: 32rpx;
        font-style: normal;
        font-weight: 400;
        line-height: 48rpx;
        color: #261000;
      }
      .default {
        width: fit-content;
        padding: 0 8rpx;
        font-size: 24rpx;
        font-style: normal;
        font-weight: 400;
        line-height: 40rpx;
        color: #ffffff;
        text-align: left;
        background: #ff6b03;
        border: 2rpx solid #ff6b03;
        border-radius: 8rpx;
      }
    }
    .address {
      font-size: 28rpx;
      font-style: normal;
      font-weight: 400;
      line-height: 40rpx;
      color: #999999;
    }
  }

  .checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100rpx;
  }
}
</style>

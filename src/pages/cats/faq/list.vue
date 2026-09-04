<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#ffffff',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <!-- 顶部导航 + 搜索，完全参考 /pages/cats/goods/search -->
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="searchBox">
            <wd-input
              type="text"
              v-model="keyword"
              :placeholder="t('feedback.faq.search_placeholder')"
              :no-border="true"
              custom-class="searchInput"
              confirm-type="search"
              @confirm="onSearch"
              :ignoreCompositionEvent="false"
            />
            <wd-button custom-class="searchBtn" @click="onSearch">
              {{ t('goods.search.btn_txt') }}
            </wd-button>
          </view>
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
      <template v-if="faqList.data.length > 0">
        <template v-for="(item, index) in faqList.data" :key="index">
          <view class="messageItem" @click="toUrl('/pages/cats/faq/detail?id=' + item.id)">
            <view class="messageTitle">
              {{ item?.i18n_content?.name || item.name }}
            </view>
            <view class="messageTime">{{ formatTime(item.create_time, 'YYYY-M-D H:i') }}</view>
            <view class="messageDot"></view>
          </view>
        </template>
      </template>
      <view v-else class="faq-empty">{{ t('feedback.faq.empty') }}</view>

      <view class="faq-footer">
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getFaqListApi, type FaqListResponse } from '@/service/api/feedback'

import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { formatTime, toUrl } from '@/utils'

// 语言
const locale = uni.getLocale()

// 顶部导航高度计算（参考 goods/search）
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为 rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const faqList = ref<FaqListResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

const keyword = ref<string>('')
const state = ref<LoadMoreState>('loading')

onLoad((options) => {
  if (options?.keyword) {
    keyword.value = options.keyword
  }
  loadMore()
})

onReachBottom(() => {
  if (faqList.value.current_page < faqList.value.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  state.value = 'loading'
  getFaqListApi(faqList.value?.current_page + 1, keyword.value || undefined).then((res) => {
    if (!res.data) return
    faqList.value.data = faqList.value.data.concat(res.data.data)
    faqList.value.current_page = res.data.current_page
    faqList.value.last_page = res.data.last_page
    if (faqList.value?.current_page === faqList.value?.last_page) {
      state.value = 'finished'
    }
  })
}

const onSearch = () => {
  faqList.value.current_page = 0
  faqList.value.last_page = 1
  faqList.value.data = []
  loadMore()
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.page {
  background-color: var(--bg-card);
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
        width: 44rpx;
        height: 44rpx;
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
        width: calc(100% - 44rpx - 16rpx - 12rpx);
        height: 56rpx;
        padding: 6rpx;
        background-color: var(--bg-card);
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
          width: calc(100% - 162rpx - 24rpx);
          height: 100%;
          margin-left: 24rpx;
        }
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
        background-color: var(--bg-primary);
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

.cnt {
  min-height: 100vh;
  padding: 24rpx;
  background-color: var(--bg-primary);
}

.faq-empty {
  padding: 80rpx 0;
  text-align: center;
  font-size: calc(26rpx * var(--font-scale));
  color: var(--text-secondary);
}

.faq-footer {
  margin-top: 16rpx;
}
</style>

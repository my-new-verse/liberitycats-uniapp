<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="detail?.title">
      <template #default>
        <template v-if="detail?.id > 0">
          <view class="title">
            {{ detail.title }}
          </view>
          <view class="infoBox">
            <view>{{ formatTime(detail.create_time, 'YYYY-M-D H:i') }}</view>
            <view class="dot">•</view>
            <view>
              <image src="/static/images/view@2x.png" class="view" alt="" />
            </view>
            <view>{{ detail.total_view }}</view>
          </view>
          <view class="newContent">
            <rich-text
              :nodes="processRichText(detail.content)"
              @itemclick="handleRichTextClick($event, detail.content)"
            ></rich-text>
          </view>
        </template>
      </template>
      <template #footer>
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatTime, processRichText, handleRichTextClick } from '@/utils'

import { getNewsDetailApi, getNewsDetailApiResponse } from '@/service/api/news'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const detail = ref<getNewsDetailApiResponse>({} as getNewsDetailApiResponse)
onLoad((options) => {
  if (options?.id) {
    uni.showLoading()
    getNewsDetailApi(Number(options.id))
      .then((res) => {
        detail.value = res.data
      })
      .finally(() => {
        uni.hideLoading()
      })
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.zh-Hans, .zh-Hant) {
  * {
    font-family: Alibaba PuHuiTi2 !important;
  }
  .wd-backtop__backicon {
    font-family: wd-icons !important;
  }
}

.title {
  font-size: 48rpx;
  font-style: normal;
  font-weight: 500;
  line-height: 56rpx;
  color: var(--text-primary);
}

.infoBox {
  display: flex;
  align-items: center;
  justify-content: start;
  margin: 30rpx 0;
  font-size: 24rpx;
  font-style: normal;
  font-weight: 40 0;
  line-height: 28rpx;
  color: var(--commentTextArea-color);

  .dot {
    margin: 0 16rpx;
  }

  .view {
    width: 40rpx;
    height: 40rpx;
    margin-right: 4rpx;
    // image {
    //   width: 100%;
    //   height: 100%;
    // }
  }
}

.newContent {
  font-size: 32rpx;
  font-style: normal;
  font-weight: 400;
  line-height: 48rpx;
  color: var(--text-primary);

  img,
  image {
    max-width: 100%;
  }
}
</style>

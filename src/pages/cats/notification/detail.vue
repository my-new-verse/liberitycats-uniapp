<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="detail?.i18n?.title">
      <template #default>
        <template v-if="detail?.id > 0">
          <view class="title">
            {{ detail?.i18n?.title }}
          </view>
          <view class="infoBox">
            <view>{{ formatTime(detail?.create_time, 'YYYY-M-D H:i') }}</view>
          </view>
          <view class="content">
            <rich-text :nodes="detail?.i18n?.content"></rich-text>
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
import { getNotificationDetailApi, getNotificationDetailResponse } from '@/service/api/user'
import { formatTime } from '@/utils'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const detail = ref<getNotificationDetailResponse>({} as getNotificationDetailResponse)

onLoad((options) => {
  if (options?.id) {
    getNotificationDetailApi(Number(options.id)).then((res) => {
      if (res.code === 1) {
        detail.value = res.data
      }
    })
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.page) {
  .cnt {
    min-height: 100vh;
    background-color: var(--bg-card) !important;
  }
}
:deep(.fbg) {
  background-color: var(--bg-card) !important;
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
    image {
      width: 100%;
      height: 100%;
    }
  }
}

.content {
  font-size: 32rpx;
  font-style: normal;
  font-weight: 400;
  line-height: 48rpx;
  color: var(--text-primary);
}
</style>

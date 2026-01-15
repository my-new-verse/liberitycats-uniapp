<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="detail?.i18n_content?.title">
      <template #default>
        <template v-if="detail?.id > 0">
          <view class="title">
            {{ detail?.i18n_content?.title }}
          </view>
          <view class="infoBox">
            <view>{{ formatTime(detail.create_time, 'YYYY-M-D H:i') }}</view>
            <!-- <view class="dot">•</view>
            <view>
              <image src="/static/images/view@2x.png" class="view" alt="" />
            </view>
            <view>3618</view> -->
          </view>
          <view class="content">
            <rich-text
              :nodes="processRichText(detail?.i18n_content?.content)"
              @itemclick="handleRichTextClick($event, detail?.i18n_content?.content)"
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
import { useToast } from 'wot-design-uni'
import {
  getAnnouncementDetailApi,
  getAnnouncementDetailApiResponse,
} from '@/service/api/announcement'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

import { formatTime, handleRichTextClick, processRichText } from '@/utils/index'

// 语言
const locale = uni.getLocale()
const toast = useToast()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const detail = ref<getAnnouncementDetailApiResponse>({} as getAnnouncementDetailApiResponse)
onLoad((options) => {
  if (options?.id) {
    getAnnouncementDetailApi(options.id).then((res) => {
      if (res.code === 1) {
        detail.value = res.data
        // 设置页面标题
        if (detail.value?.i18n_content?.title) {
          uni.setNavigationBarTitle({
            title: detail.value.i18n_content.title,
          })
        }
      } else {
        toast.show(res.msg)
      }
    })
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
:deep(.zh-Hans, .zh-Hant) {
  .content {
    * {
      font-family: Alibaba PuHuiTi2 !important;
    }
  }
  .wd-backtop__backicon {
    font-family: wd-icons !important;
  }
}
.page {
  .cnt {
    min-height: 100vh;
    background-color: #fff;
  }
  .pbl,
  .pbr {
    .fbg {
      background-color: #fff;
    }
  }
}

.title {
  font-size: 48rpx;
  font-style: normal;
  font-weight: 500;
  line-height: 56rpx;
  color: #261000;
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
  color: rgba(38, 16, 0, 0.3);

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
  display: block;
  max-width: 100% !important;
  height: auto !important;
  margin: 20rpx 0;
  font-size: 32rpx;
  line-height: 1.6;
  color: #261000;
}
</style>

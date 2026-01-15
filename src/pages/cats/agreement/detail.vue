<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="detail?.i18n_content?.name">
      <template #default>
        <template v-if="detail?.id > 0">
          <view class="title">
            {{ detail?.i18n_content?.name }}
          </view>
          <view class="content">
            <rich-text :nodes="processRichText(detail?.i18n_content?.content)"></rich-text>
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
import { getAgreementDetailApi, AgreementType } from '@/service/api/agreement'
import { processRichText } from '@/utils'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()
const toast = useToast()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const detail = ref<AgreementType>({} as AgreementType)
onLoad((options) => {
  if (options?.id) {
    uni.showLoading()
    getAgreementDetailApi(options.id)
      .then((res) => {
        if (res.code === 1) {
          detail.value = res.data
          // 设置页面标题
          if (detail.value?.i18n_content?.name) {
            uni.setNavigationBarTitle({
              title: detail.value.i18n_content.name,
            })
          }
        } else {
          toast.show(res.msg)
        }
      })
      .finally(() => {
        uni.hideLoading()
      })
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

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
  margin-bottom: 24rpx;
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
  font-size: 32rpx;
  font-style: normal;
  font-weight: 400;
  line-height: 48rpx;
  color: #261000;
}
</style>

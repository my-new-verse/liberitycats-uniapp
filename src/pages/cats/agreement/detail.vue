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
const agreementId = ref<number>(0)

const loadDetail = (id: number) => {
  uni.showLoading()
  getAgreementDetailApi(id)
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

onLoad((options) => {
  if (options?.id) {
    agreementId.value = Number(options.id)
    loadDetail(agreementId.value)
  }
})

// 主题切换：协议详情按新主题重新请求（后端按 X-App-Theme 返回对应颜色）
uni.$on('themeChanged', () => {
  if (agreementId.value) loadDetail(agreementId.value)
})
onUnmounted(() => {
  uni.$off('themeChanged')
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--bg-card) !important;
}

:deep(.fbg) {
  background-color: var(--bg-card) !important;
}

.page {
  .cnt {
    min-height: 100vh;
    background-color: var(--bg-card);
  }
  .pbl,
  .pbr {
    .fbg {
      background-color: var(--bg-card);
    }
  }
}

.title {
  margin-bottom: 24rpx;
  font-size: calc(48rpx * var(--font-scale));
  font-style: normal;
  font-weight: 500;
  line-height: calc(56rpx * var(--font-scale));
  color: var(--text-primary);
}

.infoBox {
  display: flex;
  align-items: center;
  justify-content: start;
  margin: 30rpx 0;
  font-size: calc(24rpx * var(--font-scale));
  font-style: normal;
  font-weight: 40 0;
  line-height: calc(28rpx * var(--font-scale));
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
  font-size: calc(32rpx * var(--font-scale));
  font-style: normal;
  font-weight: 400;
  line-height: calc(48rpx * var(--font-scale));
  color: var(--text-primary);
}
</style>

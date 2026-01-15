<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <!-- <view class="pbl">
      <view class="fbg"></view>
    </view>
    <view class="pbr">
      <view class="fbg"></view>
    </view> -->
    <view class="cnt">
      <web-view :src="webUrl" :scroll-top="scrollTop"></web-view>
    </view>
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
// 语言
const locale = uni.getLocale()
// webview URL
const webUrl = ref<string>('')

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

// 页面加载时处理URL
onLoad((options) => {
  if (options?.url) {
    webUrl.value = decodeURIComponent(options.url)
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.page {
  .cnt {
    background-color: #f7f6f4;
  }
  .pbl,
  .pbr {
    .fbg {
      background-color: #f7f6f4;
    }
  }
}
</style>

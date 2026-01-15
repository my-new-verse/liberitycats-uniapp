<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: 'Demo 内页空模板',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <view class="pbl">
      <view class="fbg"></view>
    </view>
    <view class="pbr">
      <view class="fbg"></view>
    </view>
    <view class="cnt">
      <h1>这里才是内容</h1>
      <p v-for="i in 100" :key="i">{{ i }}</p>
    </view>
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
</style>

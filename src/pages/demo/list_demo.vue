<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: 'Demo 模板',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <wd-cell-group>
      <wd-cell title="示例说明">
        <template #label>
          1、设置顶部导航栏颜色
          <br />
          2、滚动到底部加载更多
          <br />
          3、滚动到顶部
        </template>
      </wd-cell>
    </wd-cell-group>

    <view class="cnt">
      <view v-for="i in num" :key="i">{{ i }}</view>
    </view>

    <wd-loadmore :state="state" @reload="loadMore" />
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')
const num = ref<number>(45)
const max = ref<number>(120)

onReachBottom(() => {
  if (num.value === 45) {
    state.value = 'error'
  } else if (num.value < max.value) {
    loadMore()
  } else if (num.value === max.value) {
    state.value = 'finished'
  }
})

onLoad(() => {
  loadMore()
})

const loadMore = () => {
  setTimeout(() => {
    num.value = num.value + 15
    state.value = 'loading'
  }, 200)
}
</script>

<style lang="scss" scoped>
//
.page {
  background-color: var(--liberty-cats-page-background-color);
  .cnt {
    padding: 40rpx;
  }
}
</style>

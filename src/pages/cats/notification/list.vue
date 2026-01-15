<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('notication.index.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <template v-if="listData.data.length > 0">
          <template v-for="(item, index) in listData.data" :key="index">
            <view
              class="messageItem"
              @click="toUrl('/pages/cats/notification/detail?id=' + item.id)"
            >
              <view class="messageTitle">{{ item.i18n.title }}</view>
              <view class="messageTime">{{ formatTime(item.create_time, 'YYYY-M-D H:i') }}</view>
            </view>
          </template>
        </template>
      </template>
      <template #footer>
        <wd-loadmore :state="state" @loadmore="loadMore"></wd-loadmore>
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

import { getNotificationListApi, getNotificationListResponse } from '@/service/api/user'

import { formatTime, toUrl } from '@/utils'
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
  if (listData.value?.current_page < listData.value?.last_page) {
    loadMore()
  }
})

onLoad(() => {
  loadMore()
})

const listData = ref<getNotificationListResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

const loadMore = () => {
  state.value = 'loading'
  getNotificationListApi(listData.value.current_page + 1).then((res) => {
    if (!res.data) return
    listData.value.data = listData.value.data.concat(res.data.data)
    listData.value.current_page = res.data.current_page
    if (listData.value.current_page === res.data.last_page) {
      state.value = 'finished'
    }
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
</style>

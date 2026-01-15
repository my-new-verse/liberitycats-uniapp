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
    <custom-nav :title="t('bulletins.list.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <template v-if="announcementList.data.length > 0">
          <template v-for="(item, index) in announcementList.data" :key="index">
            <view class="messageItem" @click="toUrl('/pages/cats/bulletins/detail?id=' + item.id)">
              <view class="messageTitle">{{ item?.i18n_content.title }}</view>
              <view class="messageTime">{{ formatTime(item.create_time, 'YYYY-M-D H:i') }}</view>
              <view class="messageDot"></view>
            </view>
          </template>
        </template>
      </template>
      <template #footer>
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getAnnouncementListApi, AnnouncementListResponse } from '@/service/api/announcement'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { formatTime, toUrl } from '@/utils'
// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

onLoad(() => {
  loadMore()
})

const announcementList = ref<AnnouncementListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
})

onReachBottom(() => {
  if (announcementList.value.current_page < announcementList.value.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  state.value = 'loading'
  getAnnouncementListApi(announcementList.value?.current_page + 1).then((res) => {
    if (!res.data) return
    announcementList.value.data = announcementList.value.data.concat(res.data.data)
    announcementList.value.current_page = res.data.current_page
    announcementList.value.last_page = res.data.last_page
    if (announcementList.value?.current_page === announcementList.value?.last_page) {
      state.value = 'finished'
    }
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
</style>

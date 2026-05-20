<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '群公告',
    enablePullDownRefresh: true,
    backgroundTextStyle: 'dark',
    backgroundColor: '#f7f6f4',
    navigationBarTextStyle: 'black',
    onReachBottomDistance: 80,
    'app-plus': {
      pullToRefresh: {
        style: 'circle',
        color: '#ff6b03',
        offset: '140rpx',
      },
    },
  },
}
</route>

<template>
  <custom-nav title="群公告" page-background-color="#f7f6f4">
    <template #default>
      <view class="list-wrap">
        <template v-if="listData.data.length > 0">
          <view class="cell" v-for="item in listData.data" :key="item.id">
            <view class="announcement-item" @click="goToDetail(item.id)">
              <view class="announcement-main">
                <view class="announcement-tag-row">
                  <text class="announcement-tag">公告</text>
                  <text v-if="item.is_pinned" class="pin-tag">置顶</text>
                </view>
                <text class="announcement-title">{{ item.title }}</text>
                <view class="announcement-meta">
                  <text>{{ item.publisher }}</text>
                  <text>{{ formatAnnouncementTime(item) }}</text>
                </view>
              </view>
              <image class="announcement-cover" :src="getImageUrl(item.cover)" mode="aspectFill" />
            </view>
          </view>
        </template>
        <template v-else-if="hasInitialized">
          <view class="emptyBox">
            <view class="emptyImg"></view>
            <view class="emptyText">{{ t('common.empty') }}</view>
          </view>
        </template>
      </view>
    </template>

    <template #footer>
      <wd-loadmore
        v-if="listData.data.length > 0 || !hasInitialized"
        :state="loadState"
        @reload="loadMore"
      />
      <wd-backtop :scrollTop="scrollTop" />
    </template>
  </custom-nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import { formatTime, getImageUrl } from '@/utils'
import { t } from '@/locale'
import {
  getMockGroupAnnouncementListPage,
  type GroupAnnouncementItem,
  type GroupAnnouncementListResponse,
} from '@/service/mock/groupAnnouncement'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

const roomId = ref(0)
const hasInitialized = ref(false)
const loadState = ref<LoadMoreState>('loading')
const listData = ref<GroupAnnouncementListResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

let isLoading = false

const scrollTop = ref(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const loadMore = async () => {
  if (isLoading) return

  if (hasInitialized.value && listData.value.current_page >= listData.value.last_page) {
    loadState.value = 'finished'
    return
  }

  isLoading = true
  loadState.value = 'loading'

  try {
    const nextPage = listData.value.current_page + 1
    const res = await getMockGroupAnnouncementListPage(roomId.value, nextPage)

    if (nextPage === 1) {
      listData.value.data = res.data
    } else {
      listData.value.data = listData.value.data.concat(res.data)
    }
    listData.value.current_page = res.current_page
    listData.value.last_page = res.last_page
    hasInitialized.value = true
    loadState.value = res.current_page >= res.last_page ? 'finished' : 'success'
  } catch (error) {
    console.error('Failed to load group announcements:', error)
    loadState.value = 'error'
  } finally {
    isLoading = false
  }
}

const resetAndReload = async () => {
  listData.value = {
    current_page: 0,
    data: [],
    last_page: 1,
  }
  hasInitialized.value = false
  await loadMore()
}

onLoad((options: any) => {
  roomId.value = Number(options?.room_id || 0)
  resetAndReload()
})

onReachBottom(() => {
  if (listData.value.current_page < listData.value.last_page) {
    loadMore()
  }
})

onPullDownRefresh(async () => {
  await resetAndReload()
  uni.stopPullDownRefresh()
})

const formatAnnouncementTime = (item: GroupAnnouncementItem) => {
  if (item.publish_time) {
    return formatTime(item.publish_time, 'H:i')
  }
  const matched = item.publish_time_text?.match(/(\d{1,2}:\d{2})$/)
  return matched?.[1] || item.publish_time_text || ''
}

const goToDetail = (id: number) => {
  uni.navigateTo({
    url: `/pages/cats/social/group_announcement_detail?id=${id}&room_id=${roomId.value}`,
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.list-wrap {
  padding: 0 32rpx 32rpx;
}

.announcement-item {
  display: flex;
  align-items: flex-start;
  gap: 24rpx;
}

.announcement-main {
  flex: 1;
  min-width: 0;
}

.announcement-tag-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 12rpx;
}

.announcement-tag,
.pin-tag {
  display: inline-flex;
  align-items: center;
  height: 34rpx;
  padding: 0 10rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  line-height: 1;
}

.announcement-tag {
  color: #de8b2f;
  background: #fff3df;
}

.pin-tag {
  color: #ff6b03;
  background: rgba(255, 107, 3, 0.1);
}

.announcement-title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.4;
  color: #181818;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.announcement-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.2;
  color: #999;
}

.announcement-cover {
  flex: 0 0 132rpx;
  width: 132rpx;
  height: 132rpx;
  border-radius: 16rpx;
  background: #eee;
}
</style>

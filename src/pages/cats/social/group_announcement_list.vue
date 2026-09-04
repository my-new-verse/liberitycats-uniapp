<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
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
  <custom-nav :title="t('group.announcement.list.title')" page-background-color="#f7f6f4">
    <template #default>
      <view class="list-wrap">
        <template v-if="listData.list.length > 0">
          <view class="cell" v-for="item in listData.list" :key="item.id">
            <view class="announcement-item" @click="goToDetail(item.id)">
              <view class="announcement-main">
                <view class="announcement-tag-row">
                  <text class="announcement-tag">{{ t('group.announcement.tag') }}</text>
                  <text v-if="item.isPinned" class="pin-tag">
                    {{ t('group.announcement.pinned') }}
                  </text>
                </view>
                <text class="announcement-title">{{ item.title }}</text>
                <view class="announcement-meta">
                  <!-- <text v-if="item.summary">{{ item.summary }}</text> -->
                  <text>{{ formatRelativeTime(item.updateTime) }}</text>
                </view>
              </view>
              <image
                v-if="item.coverImage"
                class="announcement-cover"
                :src="item.coverImage.url"
                mode="aspectFill"
              />
            </view>
          </view>
        </template>
        <template v-else-if="hasInitialized && listData.list.length === 0">
          <view class="emptyBox">
            <view class="emptyImg"></view>
            <view class="emptyText">{{ t('common.empty') }}</view>
          </view>
        </template>
      </view>
    </template>

    <template #footer>
      <wd-loadmore
        v-if="listData.list.length > 0 || !hasInitialized"
        :state="loadState"
        @reload="loadMore"
      />
      <wd-backtop :scrollTop="scrollTop" />
    </template>
  </custom-nav>
</template>

<script setup lang="ts">
import { ref, defineExpose } from 'vue'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import { formatTime, getImageUrl, formatRelativeTime, toUrl } from '@/utils'
import { t } from '@/locale'
import {
  getGroupAnnouncementListApi,
  type AnnouncementSummary,
} from '@/service/api/groupAnnouncement'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

const roomId = ref(0)
const hasInitialized = ref(false)
const loadState = ref<LoadMoreState>('loading')

const listData = ref<{
  pageNo: number
  hasMore: boolean
  list: AnnouncementSummary[]
}>({
  pageNo: 0,
  hasMore: true,
  list: [],
})

let isLoading = false

const scrollTop = ref(0)
const currentUserRole = ref('')
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const loadMore = async () => {
  if (isLoading) return

  if (hasInitialized.value && !listData.value.hasMore) {
    loadState.value = 'finished'
    return
  }

  isLoading = true
  loadState.value = 'loading'

  try {
    const nextPage = listData.value.pageNo + 1
    const res = await getGroupAnnouncementListApi(roomId.value, nextPage)
    const { list, pagination } = res.data

    if (nextPage === 1) {
      listData.value.list = list
    } else {
      listData.value.list = listData.value.list.concat(list)
    }
    listData.value.pageNo = pagination.pageNo
    listData.value.hasMore = pagination.hasMore
    hasInitialized.value = true
    loadState.value = pagination.hasMore ? 'success' : 'finished'
  } catch (error) {
    console.error('Failed to load group announcements:', error)
    loadState.value = 'error'
  } finally {
    isLoading = false
  }
}

const resetAndReload = async () => {
  listData.value = {
    pageNo: 0,
    hasMore: true,
    list: [],
  }
  hasInitialized.value = false
  await loadMore()
}

onLoad((options: any) => {
  roomId.value = Number(options?.room_id || 0)
  currentUserRole.value = options?.currentUserRole
  resetAndReload()
})

onReachBottom(() => {
  if (listData.value.hasMore) {
    loadMore()
  }
})

onPullDownRefresh(async () => {
  await resetAndReload()
  uni.stopPullDownRefresh()
})

const formatAnnouncementTime = (item: AnnouncementSummary) => {
  if (item.publishTime) {
    return formatTime(item.publishTime, 'YYYY-M-D H:i')
  }
  return ''
}

const goToDetail = (id: number) => {
  toUrl(
    `/pages/cats/social/group_announcement_detail?id=${id}&room_id=${roomId.value}&currentUserRole=${currentUserRole.value}`,
    true,
    false,
  )
}
defineExpose({
  resetAndReload,
})
onMounted(() => {
  uni.$on('groupAnnounceStatusChange', resetAndReload)
})
onUnmounted(() => {
  uni.$off('groupAnnounceStatusChange')
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

.list-wrap {
  padding: 0;
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
  // padding: 0 10rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  font-size: calc(24rpx * var(--font-scale));
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
  font-size: calc(30rpx * var(--font-scale));
  font-weight: 700;
  line-height: 1.4;
  color: var(--announcement-title-color);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.announcement-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 16rpx;
  font-size: calc(24rpx * var(--font-scale));
  line-height: 1.2;
  color: var(--text-secondary);
}

.announcement-cover {
  flex: 0 0 132rpx;
  width: 132rpx;
  height: 132rpx;
  border-radius: 16rpx;
  background: var(--userFilterHeader-border-color);
}
</style>

<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    backgroundTextStyle: 'dark',
    backgroundColor: '#f7f6f4',
    navigationBarTextStyle: 'black',
  },
}
</route>

<template>
  <custom-nav :title="t('group.announcement.detail.title')" page-background-color="#f7f6f4">
    <template #right v-if="currentUserRole === 'moderator' || currentUserRole === 'founder'">
      <view @click="showActionSheet = true"><wd-icon name="ellipsis" size="38rpx"></wd-icon></view>
    </template>
    <template #default>
      <!-- <scroll-view scroll-y :style="{ paddingTop: navHeight + 'px' }"> -->
      <view class="detail" v-if="announcement">
        <text class="tag">{{ t('group.announcement.tag') }}</text>
        <text class="tag pin-tag" v-if="announcement.isPinned">
          {{ t('group.announcement.pinned') }}
        </text>
        <text class="title">{{ announcement.title }}</text>
        <view class="meta">
          <text v-if="announcement.author?.name">{{ announcement.author.name }}</text>
          <text>{{ formatTimestamp(announcement.publishTime) }}</text>
        </view>

        <!-- 封面图 -->
        <image
          v-if="announcement.coverImage"
          class="cover"
          :src="announcement.coverImage.url"
          mode="aspectFill"
        />

        <!-- 内容块渲染 -->
        <template v-for="(block, idx) in announcement.content?.blocks" :key="idx">
          <!-- 段落文本 -->
          <text v-if="block.type === 'paragraph'" class="body">{{ block.text }}</text>

          <!-- 内联图片 -->
          <image
            v-else-if="block.type === 'image'"
            class="cover"
            :src="block.image.url"
            :alt="block.image.alt"
            mode="widthFix"
          />

          <!-- 信息列表 -->
          <view v-else-if="block.type === 'infoList'" class="info-card">
            <view v-for="(infoItem, i) in block.items" :key="i" class="info-row">
              <!-- <text class="info-icon">{{ getBlockIcon(infoItem.icon) }}</text> -->
              <wd-icon
                v-if="infoItem.icon.type === 'iconfont'"
                :name="infoItem.icon?.value || infoItem.icon"
                size="28rpx"
                custom-style="margin-right : 8rpx"
              ></wd-icon>
              <wd-img
                v-else-if="infoItem.icon.type === 'image'"
                :src="infoItem.icon?.value"
                height="28rpx"
                width="28rpx"
              ></wd-img>
              <view v-if="infoItem.label" class="info-label">{{ infoItem.label }}：</view>
              <view class="info-value">{{ infoItem.value }}</view>
            </view>
          </view>

          <!-- 提示 -->
          <text v-else-if="block.type === 'tip'" class="tip">* {{ block.text }}</text>
        </template>
      </view>
      <!-- </scroll-view> -->

      <wd-action-sheet
        v-model="showActionSheet"
        :actions="actions"
        :cancel-text="t('group.announcement.cancel')"
        @select="handleActionSelect"
        custom-class="annount-action-sheet"
      />
    </template>
  </custom-nav>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatTime } from '@/utils'
import { t } from '@/locale'
import {
  getGroupAnnouncementDetailApi,
  pinGroupAnnouncementApi,
  unpinGroupAnnouncementApi,
  deleteGroupAnnouncementApi,
  type AnnouncementDetail,
} from '@/service/api/groupAnnouncement'
import CustomNav from '@/components/CustomNav/CustomNav.vue'

const systemInfo = uni.getSystemInfoSync()
const safeTop = ref(systemInfo.statusBarHeight || 0)
const navHeight = ref(safeTop.value + 52)
const announcement = ref<AnnouncementDetail | null>(null)
const showActionSheet = ref(false)
const roomId = ref(0)
const announcementId = ref(0)
const currentUserRole = ref('')
const actions = computed(() => {
  // 如果没有数据，返回空数组
  if (!announcement.value) return []

  const baseActions = [
    {
      name: t('group.announcement.action.delete'),
      subname: t('group.announcement.action.delete.desc'),
      value: 'delete',
    },
  ]

  // 根据 isPinned 动态添加置顶/取消置顶
  if (announcement.value.isPinned) {
    baseActions.unshift({
      name: t('group.announcement.action.unpin'),
      subname: t('group.announcement.action.unpin.desc'),
      value: 'unpin',
    })
  } else {
    baseActions.unshift({
      name: t('group.announcement.action.pin'),
      subname: t('group.announcement.action.pin.desc'),
      value: 'pin',
    })
  }

  return baseActions
})

const fetchDetail = async () => {
  try {
    const res = await getGroupAnnouncementDetailApi(roomId.value, announcementId.value)
    announcement.value = res.data
  } catch (e) {
    console.error(t('group.announcement.toast.loadFailed'), e)
  }
}

onLoad((options: any) => {
  roomId.value = Number(options?.room_id || 0)
  announcementId.value = Number(options?.id || 0)
  currentUserRole.value = options?.currentUserRole
  fetchDetail()
})
const ensureRoomDetailLoaded = async () => {
  if (roomDetail.value?.room.id) return true
  if (roomDetailPreloadPromise) return roomDetailPreloadPromise

  roomDetailLoading.value = true
  roomDetailPreloadPromise = (async () => {
    try {
      const res = await getChatRoomDetailApi(roomCode.value)
      if (res.code !== 1) {
        toast.show(res.msg || t('common.loadFailed'))
        return false
      }

      roomDetail.value = res.data
      routeRoomId.value = res.data.room.id
      await loadCurrentAnnouncement(res.data.room.id)
      await loadHistoryMessages()
      refreshViewportMetrics()
      return true
    } catch (error) {
      // console.error('loadRoomDetail error:', error)
      toast.show(t('common.loadFailed'))
      return false
    } finally {
    }
  })()

  return roomDetailPreloadPromise
}

const formatTimestamp = (ts?: number) => {
  if (!ts) return ''
  return formatTime(ts, 'YYYY-M-D H:i')
}

const handleActionSelect = async ({ item }: any) => {
  const value = item?.value
  try {
    if (value === 'pin') {
      await pinGroupAnnouncementApi(roomId.value, announcementId.value)
      // uni.showToast({ title: t('group.announcement.toast.pinSuccess'), icon: 'success' })
      fetchDetail()
      uni.$emit('groupAnnounceStatusChange')
    } else if (value === 'unpin') {
      await unpinGroupAnnouncementApi(roomId.value, announcementId.value)
      // uni.showToast({ title: t('group.announcement.toast.unpinSuccess'), icon: 'success' })
      fetchDetail()
      uni.$emit('groupAnnounceStatusChange')
    } else if (value === 'delete') {
      await deleteGroupAnnouncementApi(roomId.value, announcementId.value)
      // uni.showToast({ title: t('group.announcement.toast.deleteSuccess'), icon: 'success' })
      setTimeout(() => {
        uni.navigateBack({ delta: 1 })
        uni.$emit('groupAnnounceStatusChange')
      }, 1200)
    }
  } catch (e) {}
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fff;
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  background: #fff;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}

.nav-inner {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
}

.nav-back,
.nav-more {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111;
  font-size: 42rpx;
  font-weight: 300;
}

.nav-more {
  font-size: 34rpx;
  letter-spacing: -4rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
}

.content {
  box-sizing: border-box;
  height: 100vh;
}

.detail {
  // padding: 34rpx 36rpx 72rpx;
  padding-bottom: 72rpx;
}

.tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  height: 34rpx;
  padding: 6rpx 12rpx;
  border-radius: 8rpx;
  color: #de8b2f;
  background: #fff3df;
  font-size: 24rpx;
  margin-right: 12rpx;
}
.pin-tag {
  color: #ff6b03 !important;
  background: rgba(255, 107, 3, 0.1) !important;
}

.title {
  display: block;
  margin-top: 16rpx;
  color: #121212;
  font-size: 30rpx;
  font-weight: 800;
  line-height: 1.38;
}

.meta {
  display: flex;
  gap: 18rpx;
  margin-top: 18rpx;
  color: #8f8f8f;
  font-size: 24rpx;
}

.body {
  display: block;
  margin-top: 34rpx;
  color: #333;
  font-size: 28rpx;
  line-height: 1.8;
  white-space: pre-line;
}

.cover {
  width: 100%;
  height: 360rpx;
  margin-top: 28rpx;
  border-radius: 22rpx;
  background: #eee;
}

.info-card {
  margin-top: 34rpx;
  padding: 8rpx 0;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  color: #2b2b2b;
  font-size: 26rpx;
  line-height: 1.45;
}

.info-label {
  margin-left: 18rpx;
}
.info-icon {
  width: 42rpx;
  margin-top: 2rpx;
}

.tip {
  display: block;
  margin-top: 18rpx;
  color: #c2a37b;
  font-size: 24rpx;
}
::v-deep .annount-action-sheet {
  display: flex;
  flex-direction: column;
  padding-top: 32rpx;
  .wd-action-sheet__action {
    margin-bottom: 32rpx;
  }
  .wd-action-sheet__name {
    align-items: flex-start;
    display: flex;
    line-height: 1.5;
  }
  .wd-action-sheet__subname {
    margin-left: 0;
    align-items: flex-start;
    display: flex;
    line-height: 1.5;
  }
}
</style>

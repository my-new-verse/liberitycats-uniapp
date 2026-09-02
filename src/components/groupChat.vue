<template>
  <view class="group-container">
    <scroll-view scroll-y class="scroll-v">
      <view v-for="(item, index) in groupList" :key="item.id" class="group-item">
        <wd-img
          :src="getImageUrl(item.banner_image)"
          mode="aspectFill"
          class="group-banner"
        ></wd-img>
        <!-- <wd-image
          :src="getImageUrl(item.banner_image || item.avatar)"
          mode="aspectFill"
          class="group-banner"
        /> -->
        <view class="banner-mask"></view>

        <view class="group-avatar">
          <wd-img
            v-if="item.avatar && item.avatar.length"
            :src="getImageUrl(item.avatar)"
            mode="heightFix"
            width="48rpx"
            height="48rpx"
          ></wd-img>
          <view v-if="item.access_levels.length" class="level-icon">
            <wd-img
              v-for="(levelItem, levelIndex) in item.access_levels"
              :key="levelItem.level_id"
              :src="getImageUrl(levelItem.icon)"
              mode="heightFix"
              custom-class="responsive-img"
            ></wd-img>
          </view>
        </view>
        <view class="group-content">
          <view class="group-text">
            <text class="g-name">{{ item.name }}</text>
            <text class="g-sub-title">{{ item.sub_title || item.description }}</text>
          </view>

          <view class="join-btn-wrapper">
            <wd-button class="join-button" @click.stop="handleJoinOrEnter(item)" size="small">
              {{ t(item.is_joined === 1 ? 'group.chat.enter_chat' : 'group.chat.join_now') }}
            </wd-button>
            <view v-if="notificationBadgeMap[item.id]" class="badge">
              {{ notificationBadgeMap[item.id] > 99 ? '99+' : notificationBadgeMap[item.id] }}
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getImageUrl, toUrl } from '@/utils'
import {
  preloadChatRoomsApi,
  getCachedChatRoomsApi,
  joinChatRoomApi,
  patchCachedChatRoom,
  setCachedChatRoomsApi,
  ChatRoom,
  NotificationSummaryRoom,
} from '@/service/api/groupChat'
import { useUserStore } from '@/store/user'

const props = defineProps<{
  /** 父组件传递的通知摘要 rooms 数据 */
  notificationRooms?: NotificationSummaryRoom[]
}>()

const userStore = useUserStore()
type GroupChatItem = ChatRoom & {
  banner_image?: string
  sub_title?: string
}

const { t } = useI18n()
const GROUP_CHAT_ROOMS_REFRESH_EVENT = 'refreshGroupChatRooms'

const groupList = ref<ChatRoom[]>([])
const groupLoading = ref(false)
const enteringGroupMap = ref<Record<number, boolean>>({})
// room_id -> 未读提及+回复总数
const notificationBadgeMap = ref<Record<number, number>>({})
const hasLoginToken = () =>
  Boolean(userStore.userInfo.token || uni.getStorageSync('token') || uni.getStorageSync('hasToken'))

/** 根据父组件传递的 rooms 数据更新徽标 */
const applyNotificationsRooms = (rooms?: NotificationSummaryRoom[]) => {
  if (!Array.isArray(rooms)) return
  const map: Record<number, number> = {}
  rooms.forEach((room: NotificationSummaryRoom) => {
    const total = room.important_unread_count || 0
    if (total > 0) map[room.room_id] = total
  })
  notificationBadgeMap.value = map
}

// 监听父组件传递的通知数据（immediate: 组件挂载时已有数据也立即应用）
watch(
  () => props.notificationRooms,
  (rooms) => applyNotificationsRooms(rooms),
  { immediate: true },
)

const loadGroupList = async (forceRefresh = false) => {
  if (groupLoading.value) return
  groupLoading.value = true
  try {
    // 缓存仅用于首次快速展示，避免白屏
    if (!forceRefresh) {
      const cachedRooms = getCachedChatRoomsApi()
      if (cachedRooms?.rooms?.length) {
        groupList.value = [...cachedRooms.rooms]
      }
    }

    // 使用 preloadChatRoomsApi，与 SocialTab 共享缓存，避免重复请求
    const res = await preloadChatRoomsApi(1, forceRefresh)
    console.log('preloadChatRoomsApi', '====', res)

    if (res.code === 1 && res.data) {
      groupList.value = [...(res.data?.rooms || [])]
      // 同步更新缓存，保证后续 getCachedChatRoomsApi 返回最新数据
      setCachedChatRoomsApi(res.data)
    } else if (!groupList.value.length) {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (error) {
    console.error('loadGroupList error:', error)
    if (!groupList.value.length) {
      uni.showToast({ title: '加载失败', icon: 'none' })
    }
  } finally {
    groupLoading.value = false
  }
}

const handleJoinOrEnter = async (group: GroupChatItem) => {
  if (!group?.id || enteringGroupMap.value[group.id]) return

  if (!hasLoginToken()) {
    toUrl('/pages/cats/login/login')
    return
  }

  enteringGroupMap.value = {
    ...enteringGroupMap.value,
    [group.id]: true,
  }
  console.log(group.code)
  const groupChatUrl = `/pages/cats/social/group_chat_new?code=${group.code}&room_id=${group.id}`
  if (group.is_joined === 1) {
    toUrl(groupChatUrl)
    setTimeout(() => {
      const nextEnteringGroupMap = { ...enteringGroupMap.value }
      delete nextEnteringGroupMap[group.id]
      enteringGroupMap.value = nextEnteringGroupMap
    }, 800)
    return
  }

  try {
    // uni.showLoading({ title: '进入中...', mask: true })
    const res = await joinChatRoomApi(group.id)
    // uni.hideLoading()
    if (res.code === 1) {
      group.is_joined = 1
      patchCachedChatRoom(group.id, { is_joined: 1, is_accessible: 1 })
      toUrl(groupChatUrl)
    } else {
      uni.showToast({ title: res.msg || '进入失败', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('joinChatRoom error:', error)
    uni.showToast({ title: '进入失败，请重试', icon: 'none' })
  } finally {
    const nextEnteringGroupMap = { ...enteringGroupMap.value }
    delete nextEnteringGroupMap[group.id]
    enteringGroupMap.value = nextEnteringGroupMap
  }
}

onMounted(() => {
  void loadGroupList()
  uni.$on(GROUP_CHAT_ROOMS_REFRESH_EVENT, (forceRefresh?: boolean) => {
    void loadGroupList(!!forceRefresh)
  })
})

watch(
  () => userStore.userInfo.token,
  (nextToken, previousToken) => {
    if (nextToken && nextToken !== previousToken) {
      void loadGroupList(true)
    }
  },
)

onUnmounted(() => {
  uni.$off(GROUP_CHAT_ROOMS_REFRESH_EVENT)
})
</script>

<style lang="scss" scoped>
.group-container {
  height: 100%;
  max-height: calc(100vh - var(--tabs-height, 88rpx));
  background: var(--bg-primary);
  overflow: hidden;
}

.scroll-v {
  height: 100%;
  // padding: 20rpx 24rpx 32rpx;
  box-sizing: border-box;
}

.group-item {
  position: relative;
  height: 280rpx;
  margin-bottom: 20rpx;
  border-radius: 28rpx;
  overflow: hidden;
  background: linear-gradient(180deg, #ffe8c8 0%, #f7b96f 100%);
  box-shadow: 0 10rpx 28rpx rgba(153, 88, 20, 0.12);
}

.group-banner {
  width: 100%;
  height: 100%;
}

.banner-mask {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(99, 52, 7, 0.02) 28%,
      rgba(99, 52, 7, 0.18) 62%,
      rgba(99, 52, 7, 0.54) 100%
    ),
    linear-gradient(90deg, rgba(77, 37, 0, 0.34) 0%, rgba(77, 37, 0, 0) 42%);
}

.group-content {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 16rpx 28rpx;
  gap: 12rpx;
}

.group-avatar {
  position: absolute;
  inset: 0;
  padding: 16rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;

  .level-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    height: 48rpx;
    overflow: visible;
    gap: 8rpx;

    :deep(.wd-img) {
      min-width: 192rpx !important;
      flex-shrink: 0;
      overflow: visible;
    }

    :deep(.wd-img__image) {
      display: block;
      max-width: none;
    }
  }
}
.group-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.g-name {
  font-size: calc(28rpx * var(--font-scale));
  line-height: 1.2;
  font-weight: 600;
  color: var(--bg-card);
  text-shadow: 0 4rpx 12rpx rgba(72, 35, 0, 0.28);
}

.g-sub-title {
  margin-top: 10rpx;
  font-size: calc(24rpx * var(--font-scale));
  line-height: 1.4;
  color: var(--appUpdate-version-color);
  text-shadow: 0 4rpx 12rpx rgba(72, 35, 0, 0.22);
}

.join-btn-wrapper {
  position: relative;
  flex-shrink: 0;
  overflow: visible;
}

.badge {
  position: absolute;
  top: -10rpx;
  right: -10rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background-color: #ff4d4f; /* 醒目红色 */
  // background-color: #d4380d; /* 深橘红色 */
  background-color: var(--wot-button-primary-bg-color);
  color: var(--bg-card);
  font-size: calc(20rpx * var(--font-scale));
  line-height: calc(32rpx * var(--font-scale));
  text-align: center;
  box-sizing: border-box;
  pointer-events: none;
  border: 1px solid var(--bg-card);
  z-index: 10;
}

.join-button {
  // min-width: 180rpx;
  border-radius: 999rpx;
  font-size: calc(28rpx * var(--font-scale));
  background: var(--wot-button-primary-bg-color) !important;
  color: var(--bg-card) !important;
  border-color: rgba(255, 208, 86, 1) !important;
  height: var(--wot-button-medium-height, 18px);
  padding: var(--wot-button-medium-padding, 0 12px) !important;
}
.responsive-img {
  height: 148rpx;
  width: auto;
}
</style>

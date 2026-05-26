<template>
  <view class="group-container">
    <scroll-view scroll-y class="scroll-v">
      <view
        v-for="(item, index) in groupList"
        :key="item.id"
        class="group-item"
        @click="handleJoinOrEnter(item)"
      >
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
              :width="index === 1 ? '256rpx' : index === 2 ? '192rpx' : ''"
              height="48rpx"
            ></wd-img>
          </view>
        </view>
        <view class="group-content">
          <view class="group-text">
            <text class="g-name">{{ item.name }}</text>
            <text class="g-sub-title">{{ item.sub_title || item.description }}</text>
          </view>

          <wd-button class="join-button" @click.stop="handleJoinOrEnter(item)" size="small">
            {{ t(item.is_joined === 1 ? 'group.chat.enter_chat' : 'group.chat.join_now') }}
          </wd-button>
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
  getChatRoomsApi,
  getCachedChatRoomsApi,
  preloadChatRoomsApi,
  joinChatRoomApi,
  patchCachedChatRoom,
  ChatRoom,
} from '@/service/api/groupChat'
import { useUserStore } from '@/store/user'

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
const hasLoginToken = () =>
  Boolean(userStore.userInfo.token || uni.getStorageSync('token') || uni.getStorageSync('hasToken'))

const loadGroupList = async (forceRefresh = false) => {
  if (groupLoading.value) return
  groupLoading.value = true
  try {
    const cachedRooms = getCachedChatRoomsApi()
    if (cachedRooms?.rooms?.length) {
      groupList.value = cachedRooms.rooms
    }

    const res = await preloadChatRoomsApi(1, forceRefresh)
    console.log('getChatRoomsApi', '====', res)

    if (res.code === 1) {
      groupList.value = res.data?.rooms || []
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
    }
  } catch (error) {
    console.error('loadGroupList preload error:', error)
    const res = await getChatRoomsApi(1)
    if (res.code === 1) {
      groupList.value = res.data?.rooms || []
    } else {
      uni.showToast({ title: res.msg || '加载失败', icon: 'none' })
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

  if (group.is_joined === 1) {
    toUrl(`/pages/cats/social/group_chat?code=${group.code}&room_id=${group.id}`)
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
      toUrl(`/pages/cats/social/group_chat?code=${group.code}&room_id=${group.id}`)
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
  background: #f7f4ee;
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
  font-size: 28rpx;
  line-height: 1.2;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 0 4rpx 12rpx rgba(72, 35, 0, 0.28);
}

.g-sub-title {
  margin-top: 10rpx;
  font-size: 24rpx;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 4rpx 12rpx rgba(72, 35, 0, 0.22);
}

.join-button {
  // min-width: 180rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  background: var(--wot-button-primary-bg-color) !important;
  color: #fff !important;
  border-color: rgba(255, 208, 86, 1) !important;
  height: var(--wot-button-medium-height, 18px);
  padding: var(--wot-button-medium-padding, 0 12px) !important;
}
</style>

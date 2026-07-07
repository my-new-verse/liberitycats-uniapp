<template>
  <view class="socialBox">
    <view class="socialOpBox" :style="{ height: cntPaddingTop + 20 + 'rpx' }">
      <view
        class="opItem"
        :class="{ active: socialFilter === 'hot' }"
        @click="handleFilterChange('hot')"
      >
        {{ t('discover.social.filter.hot') }}
      </view>
      <view
        class="opItem"
        :class="{ active: socialFilter === 'latest' }"
        @click="handleFilterChange('latest')"
      >
        {{ t('discover.social.filter.latest') }}
      </view>
      <view
        class="opItem"
        :class="{ active: socialFilter === 'following' }"
        @click="handleFilterChange('following')"
      >
        {{ t('discover.social.filter.following') }}
      </view>
      <view
        class="opItem"
        :class="{ active: socialFilter === 'inFocus' }"
        @click="handleFilterChange('inFocus')"
      >
        {{ t('discover.social.filter.inFocus') }}
      </view>
      <view
        class="opItem"
        :class="{ active: socialFilter === 'groupChat' }"
        @click="handleFilterChange('groupChat')"
      >
        {{ t('discover.social.filter.groupChat') }}
        <view v-if="groupChatNotificationCount > 0" class="opItemBadge">
          {{ groupChatNotificationCount > 99 ? '99+' : groupChatNotificationCount }}
        </view>
      </view>
      <image
        src="/static/images/search1.png"
        class="searchIcon"
        mode="aspectFit"
        @click="goSearch"
      ></image>
      <!-- <view
        class="opItem"
        :class="{ active: socialFilter === 'message' }"
        @click="handleFilterChange('message')"
      >
        {{ t('discover.social.filter.message') }}
      </view> -->
    </view>
    <!-- 消息 Tab -->
    <MessageTab
      v-show="socialFilter === 'message'"
      ref="messageTabRef"
      :cntPaddingTop="cntPaddingTop"
      :active="socialFilter === 'message'"
      @update:state="emit('update:state', $event)"
      @refresh-complete="emit('refresh-complete')"
      @refresh-error="emit('refresh-error')"
    />
    <!-- In Focus Tab -->
    <InFocusTab
      v-show="socialFilter === 'inFocus'"
      ref="inFocusTabRef"
      :cntPaddingTop="cntPaddingTop"
      :active="socialFilter === 'inFocus'"
      @update:state="emit('update:state', $event)"
      @refresh-complete="emit('refresh-complete')"
      @refresh-error="emit('refresh-error')"
    />
    <!-- 社区帖子列表（非群聊、非 message、非 inFocus） -->
    <template
      v-if="
        socialFilter !== 'groupChat' && socialFilter !== 'message' && socialFilter !== 'inFocus'
      "
    >
      <view
        v-if="socialList.data.length > 0"
        :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }"
      >
        <view class="cell" v-for="item in socialList.data" :key="item.id">
          <view class="socialItem">
            <view
              class="delBox"
              v-if="item.member_id === userStore.userInfo?.member_id"
              @click="handleDelPost(item.id)"
            ></view>
            <view class="jbBox" v-else @click="reportPost(item)"></view>
            <!-- <view
              v-if="getMemberFollowInfo(item.member)"
              class="followBtn"
              :class="getMemberFollowInfo(item.member).style"
              @click.stop="handleFollowClick(item.member)"
            >
              {{ getMemberFollowInfo(item.member).text }}
              <wd-icon
                custom-style="margin-left: 12rpx"
                name="star-on"
                size="22rpx"
                color="#ff6b03"
                v-if="item.member.is_special_following === 1"
              ></wd-icon>
            </view> -->
            <view class="socialHead">
              <view class="avatarBox" @click="toUserHome(item.member_id)">
                <image
                  class="avatar"
                  :src="getImageUrl(item.member.avatar + '?x-oss-process=style/jzcq')"
                />
                <view class="levelIcon">
                  <image :src="`/static/images/level/${item.member.level}.png`" mode="widthFix" />
                </view>
              </view>

              <view class="nameWrap">
                <view class="name">{{ formatNickname(item.member.nickname, 22) }}</view>
                <!-- <view
                  v-if="getMemberFollowInfo(item.member)"
                  class="followBtn"
                  :class="getMemberFollowInfo(item.member).style"
                  @click.stop="handleFollowClick(item.member)"
                >
                  {{ getMemberFollowInfo(item.member).text }}
                  <wd-icon custom-style="margin-left: 12rpx" name="star-on" size="22rpx" color="#ff6b03" v-if="item.member.is_special_following === 1"></wd-icon>
                </view> -->
              </view>

              <view v-if="item.tag?.name" class="tag" :class="item.tag?.extend_json?.class">
                {{ item.tag?.name }}
              </view>
            </view>
            <view
              class="socialCntBox"
              @click="toUrl('/pages/cats/social/detail?id=' + item.id, false)"
            >
              <view class="socialCnt">
                <view class="socialTips" v-if="item.is_approved === 0">
                  {{ t('social.detail.content.not_audit_seed_myself') }}
                </view>
                {{ item.content }}
              </view>
              <view
                class="socialMedia"
                v-if="item.images.length > 0"
                :class="{
                  mediaImg4: item.images.length === 4,
                  singleImg: item.images.length === 1,
                }"
              >
                <view
                  v-for="(image, index) in item.images"
                  :key="index"
                  @tap.stop="doHandlePreview(item.images, index)"
                >
                  <wd-img
                    :radius="5"
                    custom-class="mediaImgItem"
                    :mode="item.images.length === 1 ? 'widthFix' : 'aspectFill'"
                    :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                    :enable-preview="false"
                  />
                </view>
              </view>
              <view class="socialTime">
                {{ formatRelativeTime(item.create_time) }}
              </view>
            </view>
            <view class="socialFoot">
              <view
                class="socialBtnBox"
                @click="toUrl('/pages/cats/social/detail?id=' + item.id, false)"
              >
                <view class="socialBtnIcon view"></view>
                <view class="socialBtn">{{ item.view_count }}</view>
              </view>
              <view
                class="socialBtnBox"
                @click="
                  toUrl('/pages/cats/social/detail?id=' + item.id + '&showComment=false', false)
                "
              >
                <view class="socialBtnIcon quote"></view>
                <view class="socialBtn">{{ item.commit_count }}</view>
              </view>
              <view class="socialBtnBox">
                <view class="zanWrapper" @click.stop="likePost(item.id)">
                  <image
                    class="Icon"
                    :src="
                      item.is_liked === 1
                        ? '/static/images/unlike.png'
                        : '/static/images/zan0.33.png'
                    "
                    mode="aspectFit"
                    :style="{ opacity: item.currentGif ? 0 : 1 }"
                  />
                  <image :src="item.currentGif" class="Icon" mode="aspectFit" />
                </view>

                <view class="socialBtn" style="margin-left: 10rpx">{{ item.like_count }}</view>
              </view>
              <view class="socialBtnBox" @click="handleOpenShare(item)">
                <view class="socialBtnIcon share"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <template v-else-if="activeSocialCache.hasInitialized">
        <view class="emptyBox">
          <view class="emptyImg"></view>
        </view>
      </template>
      <view class="pubSocial" @click="toUrl('/pages/cats/social/publish', true)">
        <view class="pubImg"></view>
      </view>
    </template>
    <!-- 消息入口浮窗（社区帖子 tab 和 inFocus tab 展示） -->
    <view
      v-if="socialFilter !== 'groupChat' && socialFilter !== 'message'"
      class="msgEntry"
      @click="toUrl('/pages/cats/message/index?category=community', true)"
    >
      <view class="msgDot" v-if="msgUnreadCount > 0">
        <view>{{ msgUnreadCount > 99 ? 99 : msgUnreadCount }}</view>
        <view v-if="msgUnreadCount > 99">+</view>
      </view>
      <view class="msgImg"></view>
    </view>
    <!-- 群聊 Tab -->
    <template v-if="socialFilter === 'groupChat'">
      <view :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
        <group-chat
          v-if="groupChatReady"
          :key="groupChatRenderKey"
          :notification-rooms="groupChatNotificationRooms"
        ></group-chat>
      </view>
    </template>
  </view>
  <wd-message-box selector="wd-message-box-slot" />
  <SharePopup ref="shareRef" />
  <wd-toast />
  <wd-action-sheet
    custom-class="reportSheet"
    v-model="reportShow"
    :actions="reportActions"
    :z-index="97"
    @close="reportSheetClose"
    @select="reportSheetSelect"
  />
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
import { t } from '@/locale/index'
import {
  formatNickname,
  formatRelativeTime,
  getImageUrl,
  openUrl,
  toUrl,
  handlePreview,
} from '@/utils'
import {
  getCommunityPostListApi,
  getCommunityPostListApiResponse,
  likePostApi,
  deletePostApi,
  reportPostApi,
  blockUserApi,
  createFollowApi,
  deleteFollowApi,
  setSpecialFollowApi,
  adminRemovalApi,
} from '@/service/api/community'
import { getNotificationsSummaryApi, preloadChatRoomsApi } from '@/service/api/groupChat'
import { getUnReadNotificationCountApi } from '@/service/api/user'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

import { useMessage, useToast } from 'wot-design-uni'

import { useUserStore } from '@/store'
import GroupChat from '@/components/GroupChat.vue'
import MessageTab from './MessageTab.vue'
import InFocusTab from './InFocusTab.vue'

const userStore = useUserStore()
const message = useMessage('wd-message-box-slot')
const toast = useToast()

const props = defineProps<{
  state: string
  cntPaddingTop: number
}>()

const emit = defineEmits<{
  'update:state': [state: string]
  'refresh-complete': []
  'refresh-error': []
  'open-share': [item: any]
}>()

const handleOpenShare = (item: any) => {
  emit('open-share', item)
}

const socialList = ref<getCommunityPostListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

let isRefreshing = false
type SocialFilter = 'hot' | 'latest' | 'following' | 'inFocus' | 'message' | 'groupChat'
type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'
type SocialCache = {
  list: getCommunityPostListApiResponse
  state: LoadMoreState
  scrollTop: number
  hasInitialized: boolean
  isLoading: boolean
}

const createSocialList = (): getCommunityPostListApiResponse => ({
  current_page: 0,
  data: [],
  last_page: 1,
})

const createSocialCache = (): SocialCache => ({
  list: createSocialList(),
  state: 'loading',
  scrollTop: 0,
  hasInitialized: false,
  isLoading: false,
})

type SocialCacheKey = 'hot' | 'latest' | 'following' | 'groupChat'

const socialCacheMap = ref<Record<SocialFilter, SocialCache>>({
  hot: createSocialCache(),
  latest: createSocialCache(),
  following: createSocialCache(),
  groupChat: createSocialCache(), // 群聊模式也需要缓存结构（虽然不使用）
})

// ========== 子组件 refs ==========
const messageTabRef = ref<InstanceType<typeof MessageTab> | null>(null)
const inFocusTabRef = ref<InstanceType<typeof InFocusTab> | null>(null)
const socialFilter = ref<SocialFilter>('latest')
const groupChatRenderKey = ref(0)
const groupChatReady = ref(false)
const msgUnreadCount = ref(0)
const groupChatNotificationCount = ref(0)
const groupChatNotificationRooms = ref<any[]>([])
let groupChatNotificationsPromise: Promise<void> | null = null
let groupChatReadyTimer: ReturnType<typeof setTimeout> | null = null
const GROUP_CHAT_ROOMS_REFRESH_EVENT = 'refreshGroupChatRooms'
const activeSocialCache = computed(() => {
  if (socialFilter.value === 'inFocus' || socialFilter.value === 'message') {
    return socialCacheMap.value.hot // 不会被用到，仅满足类型
  }
  return socialCacheMap.value[socialFilter.value as SocialCacheKey]
})
const ensureGroupChatReady = () => {
  if (groupChatReady.value || groupChatReadyTimer) return
  groupChatReadyTimer = setTimeout(() => {
    groupChatReady.value = true
    groupChatReadyTimer = null
  }, 80)
}

/** 刷新群聊数据：获取通知摘要 + 预加载房间列表 + 通知 groupChat 组件刷新 */
const refreshSocialChatData = () => {
  fetchGroupChatNotifications()
  preloadChatRoomsApi(1, true)
  uni.$emit(GROUP_CHAT_ROOMS_REFRESH_EVENT, true)
}

const refreshGroupChatRooms = (forceRefresh = false) => {
  ensureGroupChatReady()
  socialCacheMap.value.groupChat.state = 'finished'
  if (socialFilter.value === 'groupChat') {
    emit('update:state', 'finished')
  }
  uni.$emit(GROUP_CHAT_ROOMS_REFRESH_EVENT, forceRefresh)
}

// 更新加载状态
const updateState = (state: LoadMoreState, filter = socialFilter.value) => {
  if (filter === 'groupChat' || filter === 'message' || filter === 'inFocus') {
    // 群聊/消息/inFocus 不写入 socialCacheMap
  } else {
    socialCacheMap.value[filter as SocialCacheKey].state = state
  }
  emit('update:state', state)
}

const getPageScrollTop = () => {
  return new Promise<number>((resolve) => {
    uni
      .createSelectorQuery()
      .selectViewport()
      .scrollOffset((res: any) => {
        resolve(res?.scrollTop || 0)
      })
      .exec()
  })
}

const saveCurrentScrollTop = async () => {
  if (socialFilter.value === 'groupChat') return
  const scrollTop = await getPageScrollTop()
  if (socialFilter.value === 'message') {
    messageTabRef.value?.saveScrollTop(scrollTop)
  } else if (socialFilter.value === 'inFocus') {
    inFocusTabRef.value?.saveScrollTop(scrollTop)
  } else {
    socialCacheMap.value[socialFilter.value].scrollTop = scrollTop
  }
}

const restoreScrollTop = (filter: SocialFilter) => {
  let scrollTop = 0
  if (filter === 'message') {
    scrollTop = messageTabRef.value?.getScrollTop() ?? 0
  } else if (filter === 'inFocus') {
    scrollTop = inFocusTabRef.value?.getScrollTop() ?? 0
  } else if (filter !== 'groupChat') {
    const cache = socialCacheMap.value[filter]
    scrollTop = cache.hasInitialized ? cache.scrollTop || 0 : 0
  }
  nextTick(() => {
    uni.pageScrollTo({ scrollTop, duration: 0 })
  })
}

const syncActiveCache = () => {
  if (socialFilter.value === 'message' || socialFilter.value === 'inFocus') {
    // 由子组件自行管理状态，待 onActivate 回调后更新
    return
  }
  const cache = socialCacheMap.value[socialFilter.value]
  socialList.value = cache.list
  emit('update:state', cache.state)
}

const handleFilterChange = async (filter: SocialFilter) => {
  if (filter === 'following' && userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  if (filter === 'groupChat') {
    refreshSocialChatData()
    refreshGroupChatRooms(true)
    if (socialFilter.value === filter) return
  } else if (filter === 'message') {
    if (socialFilter.value === filter) return
    await saveCurrentScrollTop()
    socialFilter.value = filter
    messageTabRef.value?.onActivate()
    nextTick(() => {
      uni.pageScrollTo({ scrollTop: messageTabRef.value?.getScrollTop() ?? 0, duration: 0 })
    })
    return
  } else if (filter === 'inFocus') {
    if (socialFilter.value === filter) return
    await saveCurrentScrollTop()
    socialFilter.value = filter
    inFocusTabRef.value?.onActivate()
    nextTick(() => {
      uni.pageScrollTo({ scrollTop: inFocusTabRef.value?.getScrollTop() ?? 0, duration: 0 })
    })
    return
  } else if (socialFilter.value === filter) {
    return
  }
  await saveCurrentScrollTop()
  socialFilter.value = filter
  syncActiveCache()
  if (filter === 'groupChat') {
    ensureGroupChatReady()
    updateState('finished', filter)
  }
  restoreScrollTop(filter)
  if (
    socialFilter.value !== 'groupChat' &&
    !socialCacheMap.value[filter as SocialCacheKey].hasInitialized
  ) {
    loadSocial(1, filter)
  }
}

// 加载社交数据
const loadSocial = async (page = 1, filter = socialFilter.value) => {
  if (filter === 'message' || filter === 'inFocus' || filter === 'groupChat') return
  const cache = socialCacheMap.value[filter as SocialCacheKey]
  if (cache.isLoading) return

  try {
    cache.isLoading = true
    const params: any = {}
    if (filter === 'following') {
      params.scope = 'following'
      params.sort = 'latest'
    } else {
      params.scope = 'all'
      params.sort = filter
    }

    const res = await getCommunityPostListApi(page, params)

    if (page === 1) {
      cache.list = res.data
    } else {
      cache.list.data = cache.list.data.concat(res.data.data)
      cache.list.current_page = res.data.current_page
      cache.list.last_page = res.data.last_page
    }

    // 更新状态为非加载状态
    cache.state = 'success'
    cache.hasInitialized = true
    if (socialFilter.value === filter) {
      socialList.value = cache.list
      updateState('success', filter)
    }
    // 如果是刷新操作，发出刷新完成事件
    if (isRefreshing && page === 1) {
      emit('refresh-complete')
      isRefreshing = false
    }
  } catch (error) {
    cache.state = 'error'
    if (socialFilter.value === filter) {
      updateState('error', filter)
    }
    // 如果是刷新操作，发出刷新错误事件
    if (isRefreshing) {
      emit('refresh-error')
      isRefreshing = false
    }
    console.error('Failed to load social:', error)
  } finally {
    cache.isLoading = false
  }
}

/** 获取成员关注按钮信息 */
const getMemberFollowInfo = (member: any) => {
  if (!member || member.is_self) return null
  if (member.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'followed' }
  // return { text: t('social.index.user.special.following'), style: 'special' }
  if (member.is_mutual_following) return { text: '互相关注', style: 'followed' }
  if (member.is_following) return { text: '已关注', style: 'followed' }
  if (member.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
}

/** 点击关注按钮 */
/** 操作面板的取消关注（直接完全取关） */
const handleActionSheetUnfollow = (member: any) => {
  message
    .confirm({ msg: t('social.index.user.follow.cancel') })
    .then(() => {
      deleteFollowApi(member.id).then((res) => {
        if (res.code === 1) {
          syncMemberFollowState(member.id, res.data)
          uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
        }
      })
    })
    .catch(() => {})
}

const handleFollowClick = (member: any) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }

  const memberId = member.id
  // 特别关注 → 取消特别关注，保持关注
  if (member.is_special_following) {
    message
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => {
        setSpecialFollowApi(memberId, 0).then((res) => {
          if (res.code === 1) {
            syncMemberFollowState(memberId, {
              is_following: member.is_following,
              is_mutual_following: member.is_mutual_following,
              is_special_following: 0,
            })
            uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
          } else {
            toast.show(res.msg || t('common.error'))
          }
        })
      })
      .catch(() => {})
  } else if (member.is_following) {
    message
      .confirm({ msg: t('social.index.user.follow.cancel') })
      .then(() => {
        deleteFollowApi(memberId).then((res) => {
          if (res.code === 1) {
            syncMemberFollowState(memberId, res.data)
            uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
          } else {
            toast.show(res.msg || t('common.error'))
          }
        })
      })
      .catch(() => {})
  } else {
    createFollowApi(memberId).then((res) => {
      if (res.code === 1) {
        syncMemberFollowState(memberId, res.data)
        uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
  }
}

/** 同步列表中同一作者的关注状态 */
const syncMemberFollowState = (memberId: number, data: any) => {
  socialList.value.data.forEach((post) => {
    if (post.member_id === memberId) {
      post.member.is_following = data.is_following
      post.member.is_mutual_following = data.is_mutual_following
      post.member.is_special_following = data.is_special_following
    }
  })
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    // 群聊模式不需要加载更多
    if (socialFilter.value === 'groupChat') {
      if (newVal === 'loading') updateState('finished')
      return
    }
    // 消息 Tab / inFocus 由子组件自行处理
    if (socialFilter.value === 'message') {
      if (newVal === 'loading') messageTabRef.value?.loadMore()
      else if (newVal === 'refreshing') messageTabRef.value?.refresh()
      return
    }
    if (socialFilter.value === 'inFocus') {
      console.log('-----------')

      if (newVal === 'loading') inFocusTabRef.value?.loadMore()
      else if (newVal === 'refreshing') inFocusTabRef.value?.refresh()
      return
    }
    if (newVal === 'loading') {
      // 检查是否还有更多数据可以加载
      if (socialList.value.current_page < socialList.value.last_page) {
        loadSocial(socialList.value.current_page + 1, socialFilter.value)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    } else if (newVal === 'refreshing') {
      isRefreshing = true
      loadSocial(1)
    }
  },
  { immediate: true },
)

// 监听登录状态变化：登录后重置缓存并重新加载当前列表
watch(
  () => userStore.isLogin,
  (isLogin, wasLogin) => {
    if (isLogin && !wasLogin) {
      // 重置所有社交缓存
      const keys: SocialCacheKey[] = ['hot', 'latest', 'following']
      keys.forEach((key) => {
        const cache = socialCacheMap.value[key]
        cache.list = createSocialList()
        cache.state = 'loading'
        cache.scrollTop = 0
        cache.hasInitialized = false
        cache.isLoading = false
      })
      // 刷新群聊数据
      refreshSocialChatData()
      // 重新加载当前 tab
      if (socialFilter.value === 'groupChat') {
        refreshGroupChatRooms(true)
      } else if (socialFilter.value === 'inFocus') {
        // inFocusTabRef.value?.refresh()
      } else {
        syncActiveCache()
        loadSocial(1, socialFilter.value)
      }
    }
  },
)

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

// 点赞
const likePost = (id: number) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  // uni.showLoading()
  likePostApi(id)
    .then((res) => {
      if (res.code === 1) {
        const targetItem = socialList.value.data.find((item) => item.id === id)
        if (targetItem) {
          targetItem.like_count = res.data.like_count || 0
          targetItem.is_liked = res.data.is_liked || 0

          const timestamp = new Date().getTime()
          if (targetItem.is_liked === 1) {
            targetItem.currentGif = `${GIF_LIKE}?t=${timestamp}`
          } else {
            targetItem.currentGif = `${GIF_UNLIKE}?t=${timestamp}`
          }

          setTimeout(() => {
            targetItem.currentGif = ''
          }, 800)
        }
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
    .finally(() => {
      // uni.hideLoading()
    })
}

const handleDelPost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  //  删除并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.del_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      deletePostApi(id)
        .then((res) => {
          if (res.data?.result == 1) {
            socialList.value.data = socialList.value.data.filter((item) => item.id !== id)
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

/** 拉取未读消息数 */
function fetchUnreadCount() {
  if (!userStore.isLogin) return
  getUnReadNotificationCountApi()
    .then((res) => {
      msgUnreadCount.value = res.data ?? 0
    })
    .catch(() => {})
}

/** 拉取群聊未读通知摘要 */
function fetchGroupChatNotifications() {
  if (!userStore.isLogin) return
  if (groupChatNotificationsPromise) return groupChatNotificationsPromise
  groupChatNotificationsPromise = getNotificationsSummaryApi()
    .then((res) => {
      if (res?.code === 1 && res.data) {
        groupChatNotificationCount.value = res.data.total_important || 0
        // 存储 rooms 数据，通过 prop 传递给 groupChat 组件
        groupChatNotificationRooms.value = res.data.rooms || []
      }
    })
    .catch(() => {})
    .finally(() => {
      groupChatNotificationsPromise = null
    })
  return groupChatNotificationsPromise
}
onShow(() => {
  fetchUnreadCount()
})
// 初始加载
onMounted(() => {
  fetchUnreadCount()
  refreshSocialChatData()
  if (socialFilter.value !== 'groupChat') {
    syncActiveCache()
    if (!socialCacheMap.value[socialFilter.value as SocialCacheKey].hasInitialized) {
      loadSocial(1, socialFilter.value)
    }
  } else {
    ensureGroupChatReady()
    updateState('finished', 'groupChat')
  }

  // 监听刷新事件
  uni.$on('refreshSocialTab', () => {
    if (socialFilter.value === 'groupChat') {
      refreshGroupChatRooms(true)
      emit('refresh-complete')
      return
    }
    if (socialFilter.value === 'message') {
      messageTabRef.value?.refresh()
      return
    }
    if (socialFilter.value === 'inFocus') {
      inFocusTabRef.value?.refresh()
      return
    }
    isRefreshing = true
    loadSocial(1, socialFilter.value)
  })
  uni.$on('discoverActiveTabChange', (tabName: string) => {
    if (tabName === t('discover.tabs.social')) {
      refreshSocialChatData()
    }
  })
  uni.$on('switchToChatGroup', () => {
    uni.removeStorageSync('pendingSwitchToChatGroup')
    handleFilterChange('groupChat')
  })
  // 检查待切换标记（覆盖 SocialTab 首次挂载时事件已 emit 的场景）
  const pendingSwitch = uni.getStorageSync('pendingSwitchToChatGroup')
  if (pendingSwitch) {
    uni.removeStorageSync('pendingSwitchToChatGroup')
    handleFilterChange('groupChat')
  }
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  if (groupChatReadyTimer) {
    clearTimeout(groupChatReadyTimer)
    groupChatReadyTimer = null
  }
  uni.$off('refreshSocialTab')
  uni.$off('discoverActiveTabChange')
  uni.$off('switchToChatGroup')
})

const reportShow = ref<boolean>(false)

function reportSheetClose() {
  reportShow.value = false
}

const reportActions = ref<any[]>([])
const reportActionIndex = { follow: -1, special: -1, report: -1, block: -1, remove: -1 }

function reportSheetSelect({ item, index }) {
  if (index === reportActionIndex.follow) {
    const member = reportPostItem.value.member
    if (member.is_following) {
      handleActionSheetUnfollow(member)
    } else {
      handleFollowClick(member)
    }
    reportShow.value = false
    return
  }
  if (index === reportActionIndex.special) {
    handleSpecialFollow()
    return
  }
  if (index === reportActionIndex.report) {
    handleReportPost()
    return
  }
  if (index === reportActionIndex.block) {
    handleReportUser()
    return
  }
  if (index === reportActionIndex.remove) {
    handleRemovePost()
  }
}

const reportPostItem = ref<getCommunityPostListApiResponse['data'][number]>({})
const reportPost = (post: getCommunityPostListApiResponse['data'][number]) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }

  const member = post.member
  const isFollowing = member.is_following === 1
  const isSpecial = member.is_special_following === 1
  const actions: any[] = []

  // 关注相关操作
  if (isFollowing) {
    actions.push({ name: t('social.index.user.unfollow'), type: 'follow', color: '#333' })
    reportActionIndex.follow = actions.length - 1
    actions.push({
      name: isSpecial ? t('social.index.user.special.cancel') : t('social.index.user.special.set'),
      type: 'special',
      color: '#333',
    })
    reportActionIndex.special = actions.length - 1
  } else {
    actions.push({ name: t('social.index.user.follow'), type: 'follow', color: '#ff6b03' })
    reportActionIndex.follow = actions.length - 1
    actions.push({
      name: t('social.index.user.special.set'),
      type: 'special',
      color: '#333',
    })
    reportActionIndex.special = actions.length - 1
  }

  // 分割线
  actions.push({ name: '', type: 'divider', disabled: true })
  // 举报
  actions.push({ name: t('social.index.post.report'), type: 'report', color: '#ff6b03' })
  reportActionIndex.report = actions.length - 1
  actions.push({ name: t('social.index.user.block'), type: 'block' })
  reportActionIndex.block = actions.length - 1

  // 管理员下架权限
  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    actions.push({ name: t('report.admin.remove_post'), type: 'remove', color: '#FF3B30' })
    reportActionIndex.remove = actions.length - 1
  }
  reportActions.value = actions
  reportShow.value = true
  reportPostItem.value = post
}

/** 设为/取消特别关注 */
const handleSpecialFollow = () => {
  const member = reportPostItem.value.member
  const isSpecial = member.is_special_following === 1
  if (isSpecial) {
    message
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => doSetSpecialFollow(member, isSpecial))
      .catch(() => {})
  } else {
    doSetSpecialFollow(member, isSpecial)
  }
  reportShow.value = false
}

const doSetSpecialFollow = (member: any, isSpecial: boolean) => {
  setSpecialFollowApi(member.id, isSpecial ? 0 : 1).then((res) => {
    if (res.code === 1) {
      syncMemberFollowState(member.id, {
        is_following: member.is_following,
        is_mutual_following: member.is_mutual_following,
        is_special_following: res.data.is_special_following,
      })
      uni.showToast({
        title: isSpecial
          ? t('social.index.user.special.canceled')
          : t('social.index.user.special.success'),
        icon: 'none',
      })
    } else {
      toast.show(res.msg || t('common.error'))
    }
  })
}

const handleReportPost = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  toUrl(`/pages/cats/report/content?id=${reportPostItem.value.id}&type=post`)
}

// 管理员下架
const handleRemovePost = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }

  message
    .confirm({
      title: t('report.admin.remove_post'),
      msg: t('social.index.post.remove_content'),
    })
    .then(() => {
      uni.showLoading()
      adminRemovalApi(reportPostItem.value.id, 'post')
        .then((res) => {
          if (res.data?.status === 0) {
            socialList.value.data = socialList.value.data.filter(
              (item) => item.id !== reportPostItem.value.id,
            )
            toast.success(t('common.operation_success'))
          } else {
            toast.show(res.msg || t('common.operationFailedRetry'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

const handleReportUser = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  // 举报并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.report_user_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      blockUserApi(reportPostItem.value.id)
        .then((res) => {
          if (res.data?.result === 1) {
            socialList.value.data = socialList.value.data.filter(
              (item) => item.member_id !== reportPostItem.value.member_id,
            )
          } else {
            toast.show(res.msg || t('common.error'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

// 跳转用户主页
const toUserHome = (memberId: number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}

// 跳转社交详情页
const toSocialDetail = (id: number) => {
  toUrl('/pages/cats/social/detail?id=' + id, false)
}

const shareRef = ref<any>(null)

const goSearch = () => {
  console.log('goSearch')
  toUrl('/pages/cats/social/post_search', true)
}

const doHandlePreview = (images: string[], currentIndex: number = 0) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
:deep(.reportSheet) {
  margin-bottom: calc(env(safe-area-inset-bottom) + 120rpx) !important;

  .wd-action-sheet__action--disabled {
    height: 2rpx !important;
    min-height: 2rpx !important;
    margin: 16rpx 0;
    padding: 0 !important;
    background: #f0f0f0;
    pointer-events: none;
    border: none !important;
    overflow: hidden;

    .wd-action-sheet__name {
      display: none;
    }
  }
}

.nameWrap {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.followBtn {
  display: inline-flex;
  // align-items: center;
  align-items: self-start;
  justify-content: center;
  height: 40rpx;
  padding: 0 20rpx;
  border-radius: 22rpx;
  border: 1rpx solid transparent;
  background-color: #ff6b03;
  color: #fff;
  font-size: 22rpx;
  line-height: 42rpx;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  position: absolute;
  right: 48rpx;
  top: 0;
  &.followed {
    background-color: #ffffff;
    color: #999;
    border-color: #ddd;
  }
  &.special {
    background: linear-gradient(135deg, #fff7e5 0%, #fff0d6 100%);
    color: #ff6b03;
    border-color: #ff6b03;
    font-weight: 600;
  }

  .wd-icon-star-on {
    line-height: 38rpx;
  }
}
.socialOpBox {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  width: auto !important;
  z-index: 10;
  background-color: var(--liberty-cats-page-background-color);
  align-items: flex-end !important;
  padding-bottom: 12rpx;
}

.opItem {
  position: relative;
}

.opItemBadge {
  position: absolute;
  top: -12rpx;
  right: -24rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  color: #fff;
  font-size: 20rpx;
  line-height: 32rpx;
  text-align: center;
  box-sizing: border-box;
  pointer-events: none;
  background-color: var(--liberty-cats-primary-color);
}
.searchIcon {
  width: 40rpx;
  height: 40rpx;
  margin-left: auto;
}
:deep(.wd-sticky__container) {
  width: 100vw;
  z-index: 999;
  background-color: #fff;
}
.zanWrapper {
  width: 85rpx !important;
  height: 85rpx !important;
  position: relative !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  flex-shrink: 0 !important;
  vertical-align: middle;
  margin: 0 -22rpx !important;
  overflow: visible !important;

  .Icon {
    position: absolute !important;
    width: 100% !important;
    height: 100% !important;
    left: 0 !important;
    top: 0 !important;
    display: block !important;
    pointer-events: none !important;
  }
}
</style>

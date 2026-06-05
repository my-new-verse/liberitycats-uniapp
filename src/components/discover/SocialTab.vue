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
        :class="{ active: socialFilter === 'groupChat' }"
        @click="handleFilterChange('groupChat')"
      >
        {{ t('discover.social.filter.groupChat') }}
      </view>
    </view>
    <template v-if="socialFilter !== 'groupChat'">
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
                v-if="!item.member.is_self"
                class="followBtn"
                :class="{ followed: item.member.is_following === 1 }"
                @click="handleFollow(item)"
              >
                {{ item.member.is_following === 1 ? '取消关注' : '关注' }}
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
                :class="{ mediaImg4: item.images.length === 4 }"
              >
                <view
                  v-for="(image, index) in item.images"
                  :key="index"
                  @tap.stop="handlePreview(item.images, index)"
                >
                  <wd-img
                    custom-class="mediaImgItem"
                    mode="widthFix"
                    :src="getImageUrl(image + '?x-oss-process=style/jzcq')"
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
    <template v-else>
      <view :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
        <group-chat v-if="groupChatReady" :key="groupChatRenderKey"></group-chat>
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
  adminRemovalApi,
} from '@/service/api/community'
import { preloadChatRoomsApi } from '@/service/api/groupChat'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

import { useMessage, useToast } from 'wot-design-uni'

import { useUserStore } from '@/store'
import GroupChat from '@/components/GroupChat.vue'

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
type SocialFilter = 'hot' | 'latest' | 'following'
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

const socialCacheMap = ref<Record<SocialFilter, SocialCache>>({
  hot: createSocialCache(),
  latest: createSocialCache(),
  following: createSocialCache(),
  groupChat: createSocialCache(), // 群聊模式也需要缓存结构（虽然不使用）
})
const socialFilter = ref<SocialFilter>('latest')
const groupChatRenderKey = ref(0)
const groupChatReady = ref(false)
let groupChatReadyTimer: ReturnType<typeof setTimeout> | null = null
const GROUP_CHAT_ROOMS_REFRESH_EVENT = 'refreshGroupChatRooms'
const activeSocialCache = computed(() => socialCacheMap.value[socialFilter.value])
const ensureGroupChatReady = () => {
  if (groupChatReady.value || groupChatReadyTimer) return
  groupChatReadyTimer = setTimeout(() => {
    groupChatReady.value = true
    groupChatReadyTimer = null
  }, 80)
}

const refreshGroupChatRooms = (forceRefresh = false) => {
  ensureGroupChatReady()
  socialCacheMap.value.groupChat.state = 'finished'
  if (socialFilter.value === 'groupChat') {
    emit('update:state', 'finished')
  }
  void preloadChatRoomsApi(1, forceRefresh)
  uni.$emit(GROUP_CHAT_ROOMS_REFRESH_EVENT, forceRefresh)
}

// 更新加载状态
const updateState = (state: LoadMoreState, filter = socialFilter.value) => {
  socialCacheMap.value[filter].state = state
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
  socialCacheMap.value[socialFilter.value].scrollTop = await getPageScrollTop()
}

const restoreScrollTop = (filter: SocialFilter) => {
  const cache = socialCacheMap.value[filter]
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: cache.hasInitialized ? cache.scrollTop || 0 : 0,
      duration: 0,
    })
  })
}

const syncActiveCache = () => {
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
    refreshGroupChatRooms(true)
    if (socialFilter.value === filter) return
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
  if (socialFilter.value !== 'groupChat' && !socialCacheMap.value[filter].hasInitialized) {
    loadSocial(1, filter)
  }
}

// 加载社交数据
const loadSocial = async (page = 1, filter = socialFilter.value) => {
  const cache = socialCacheMap.value[filter]
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

// 关注/取消关注
const handleFollow = (item) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }

  if (item.member.is_following === 1) {
    deleteFollowApi(item.member_id).then((res) => {
      if (res.code === 1) {
        socialList.value.data.forEach((post) => {
          if (post.member_id === item.member_id) {
            post.member.is_following = 0
          }
        })
        uni.showToast({ title: '已取消关注', icon: 'none' })
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
  } else {
    createFollowApi(item.member_id).then((res) => {
      if (res.code === 1) {
        socialList.value.data.forEach((post) => {
          if (post.member_id === item.member_id) {
            post.member.is_following = 1
          }
        })
        uni.showToast({ title: '关注成功', icon: 'none' })
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
  }
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

// 初始加载
onMounted(() => {
  void preloadChatRoomsApi(1)
  if (socialFilter.value !== 'groupChat') {
    syncActiveCache()
    if (!socialCacheMap.value[socialFilter.value].hasInitialized) {
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
    isRefreshing = true
    loadSocial(1, socialFilter.value)
  })
  uni.$on('discoverActiveTabChange', (tabName: string) => {
    if (tabName === t('discover.tabs.social') && socialFilter.value === 'groupChat') {
      refreshGroupChatRooms(true)
    }
  })
  uni.$on('switchToChatGroup', () => {
    socialFilter.value = 'groupChat'
  })
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
const reportActions = ref<any[]>([])

function reportSheetClose() {
  reportShow.value = false
}

function reportSheetSelect({ item, index }) {
  if (index === 0) {
    handleReportPost()
  } else if (index === 1) {
    handleReportUser()
  } else if (index === 2) {
    handleRemovePost()
  }
}

const reportPostItem = ref<getCommunityPostListApiResponse['data'][number]>({})
const reportPost = (post: getCommunityPostListApiResponse['data'][number]) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }

  const actions = [
    { name: t('social.index.post.report'), color: '#ff6b03' },
    { name: t('social.index.user.block') },
  ]

  // 有权限
  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    actions.push({
      name: t('report.admin.remove_post'),
      color: '#FF3B30',
    })
  }
  reportActions.value = actions
  reportShow.value = true
  reportPostItem.value = post
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

const shareRef = ref<any>(null)
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
:deep(.reportSheet) {
  margin-bottom: calc(env(safe-area-inset-bottom) + 120rpx) !important;
}

.nameWrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.followBtn {
  padding: 6rpx 14rpx;
  border-radius: 50rpx;
  background-color: #ff6b03;
  color: #fff;
  font-size: 22rpx;
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36rpx;
  &.followed {
    background-color: #ffffff;
    color: #999;
    border: 1rpx solid #ddd;
  }
}
.socialOpBox {
  position: fixed;
  width: 100vw;
  z-index: 10;
  background-color: var(--liberty-cats-page-background-color);
  align-items: flex-end !important;
  padding-bottom: 12rpx;
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

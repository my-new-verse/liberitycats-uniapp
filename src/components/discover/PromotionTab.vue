<template>
  <view class="socialBox">
    <!-- 子 tab 栏 -->
    <view class="socialOpBox" :style="{ height: cntPaddingTop + 20 + 'rpx' }">
      <view
        class="opItem"
        :class="{ active: activeFilter === 'latest' }"
        @click="handleFilterChange('latest')"
      >
        {{ t('discover.social.filter.latest') }}
      </view>
      <view
        class="opItem"
        :class="{ active: activeFilter === 'hot' }"
        @click="handleFilterChange('hot')"
      >
        {{ t('discover.social.filter.hot') }}
      </view>
      <view
        class="opItem"
        :class="{ active: activeFilter === 'following' }"
        @click="handleFilterChange('following')"
      >
        {{ t('discover.social.filter.following') }}
      </view>
      <!-- <image src="/static/images/filter1.png" class="filterIcon" mode="aspectFit" /> -->
      <image
        src="/static/images/search1.png"
        class="searchIcon"
        mode="aspectFit"
        @click="goSearch"
      />
    </view>

    <view :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
      <!-- 类型卡片行 -->
      <view class="cardRow">
        <view
          class="cardItem"
          :class="{ active: activeCardType === item.id }"
          v-for="item in cardTypes"
          :key="item.id"
          @click="handleAdTypeChange(item.id)"
        >
          <view class="cardIcon">
            <image
              class="cardIconImg"
              :class="{ hide: activeCardType === item.id }"
              :src="item.before_click_icon_url || item.icon"
              mode="aspectFit"
            />
            <image
              class="cardIconImg cardIconImgActive"
              :class="{ show: activeCardType === item.id }"
              :src="item.after_click_icon_url || item.icon"
              mode="aspectFit"
            />
          </view>
          <text class="cardType">{{ item.name }}</text>
        </view>
      </view>

      <!-- 推广卡片列表 -->
      <template v-if="promoList.length > 0 || !cacheLoaded">
        <view class="cell" v-for="item in promoList" :key="item.id">
          <PromotionPostItem
            :item="item"
            :show-delete="item.member_id === userStore.userInfo?.member_id"
            :show-report="item.member_id !== userStore.userInfo?.member_id"
            @delete="handleDelPost"
            @refresh="handleRefreshPost"
            @report="reportPost"
            @avatar-click="(i) => toUserHome(i.member_id)"
            @click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
            @view-click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
            @comment-click="
              (i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id + '&showComment=false', false)
            "
            @like="(i) => likePost(i.id)"
            @share="handleOpenShare"
          />
        </view>
      </template>
      <template v-else>
        <view class="emptyBox">
          <view class="emptyImg"></view>
        </view>
      </template>
    </view>
    <!-- 发布浮窗 -->
    <view
      v-if="hasPermission"
      class="pubSocial"
      @click="toUrl('/pages/cats/social/publish?category=promotion', true)"
    >
      <view class="pubImg"></view>
    </view>
    <!-- 消息入口浮窗 -->
    <view class="msgEntry" @click="toUrl('/pages/cats/message/index?category=community', true)">
      <view class="msgDot" v-if="msgUnreadCount > 0">
        <view>{{ msgUnreadCount > 99 ? 99 : msgUnreadCount }}</view>
        <view v-if="msgUnreadCount > 99">+</view>
      </view>
      <view class="msgImg"></view>
    </view>
    <!-- 操作面板 -->
    <wd-action-sheet
      custom-class="reportSheet"
      v-model="reportShow"
      :actions="reportActions"
      :z-index="997"
      @select="reportSheetSelect"
    />
    <wd-message-box selector="wd-message-box-slot" />

    <!-- 禁言弹窗 -->
    <wd-message-box selector="wd-message-box-ban" :title="t('report.admin.ban_post')">
      <view class="banDialog">
        <view class="banLabel">
          {{ t('report.admin.ban_post.label', { name: banTargetMemberName }) }}
        </view>
        <view class="banDaysTitle">{{ t('report.admin.ban_post.days') }}</view>
        <view class="banDaysRow">
          <view class="banDayItem" :class="{ active: banDays === 1 }" @click="banDays = 1">
            1天
          </view>
          <view class="banDayItem" :class="{ active: banDays === 3 }" @click="banDays = 3">
            3天
          </view>
          <view class="banDayItem" :class="{ active: banDays === 7 }" @click="banDays = 7">
            7天
          </view>
        </view>
        <wd-input
          v-model="banReason"
          :placeholder="t('report.admin.ban_post.reason_placeholder')"
          custom-class="banReasonInput"
        />
      </view>
    </wd-message-box>
  </view>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { t } from '@/locale/index'
import PromotionPostItem from '@/components/PostItem/PromotionPostItem.vue'
import { formatNickname, formatRelativeTime, getImageUrl, toUrl, handlePreview } from '@/utils'
import { getUnReadNotificationCountApi } from '@/service/api/user'
import { getAdPostListApi, getAdTypeListApi, AdPostItem } from '@/service/api/promotion'
import {
  likePostApi,
  deletePostApi,
  blockUserApi,
  createFollowApi,
  deleteFollowApi,
  setSpecialFollowApi,
  adminRemovalApi,
  banPostApi,
  unbanPostApi,
  checkAdEligibilityApi,
  refreshAdPostApi,
} from '@/service/api/community'
import { useUserStore } from '@/store/user'
import { useMessage, useToast } from 'wot-design-uni'

const userStore = useUserStore()
const toast = useToast()
const message = useMessage('wd-message-box-slot')
const messageBan = useMessage('wd-message-box-ban')

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'
const msgUnreadCount = ref(0)

/** 拉取未读消息数 */
function fetchUnreadCount() {
  if (!userStore.isLogin) return
  getUnReadNotificationCountApi()
    .then((res) => {
      msgUnreadCount.value = res.data ?? 0
    })
    .catch(() => {})
}

/** 检查推广发布资格 */
const checkAdEligibility = async () => {
  try {
    const res = await checkAdEligibilityApi()
    if (res.code === 1 && res.data.checks?.is_cat_holder === false) {
      hasPermission.value = false
    } else {
      hasPermission.value = true
    }
  } catch (e) {
    console.error('checkAdEligibility failed', e)
    hasPermission.value = true
  }
}

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

const activeFilter = ref('latest')

// 推广发布权限
const hasPermission = ref(true)

// 类型卡片数据
const activeCardType = ref(0)
const cardTypes = ref<any[]>([])

// ========== 分类缓存 ==========
type AdListCache = {
  data: AdPostItem[]
  page: number
  lastPage: number
  state: string
  loaded: boolean
  loading: boolean
}

const createCache = (): AdListCache => ({
  data: [],
  page: 0,
  lastPage: 1,
  state: 'loading',
  loaded: false,
  loading: false,
})

const adListCache = ref<Record<string, AdListCache>>({})

const getCacheKey = (filter: string, adType: number) => `${filter}:${adType}`

const getCurrentCache = () => {
  const key = getCacheKey(activeFilter.value, activeCardType.value)
  if (!adListCache.value[key]) {
    adListCache.value[key] = createCache()
  }
  return adListCache.value[key]
}

const promoList = ref<AdPostItem[]>([])

const cacheLoaded = computed(() => getCurrentCache().loaded)

const syncCurrentCache = () => {
  const cache = getCurrentCache()
  promoList.value = cache.data
  if (cache.state !== 'loading') {
    emit('update:state', cache.state)
  }
}

// 预下载类型卡片图标，避免切换选中态时闪动
const preloadAdTypeIcons = (types: any[]) => {
  types.forEach((item) => {
    ;[item?.before_click_icon_url, item?.after_click_icon_url, item?.icon].forEach((url) => {
      if (!url) return
      uni.getImageInfo({ src: url, fail: () => {} })
    })
  })
}

// 加载广告类型列表
const loadAdTypes = async () => {
  try {
    const res = await getAdTypeListApi()
    if (res.code === 1 && res.data) {
      cardTypes.value = res.data as any[]
      preloadAdTypeIcons(cardTypes.value)
    }
  } catch (e) {
    console.error('loadAdTypes failed', e)
  }
}

// 加载推广帖子列表
const loadData = async (page = 1, refresh = false) => {
  const cache = getCurrentCache()
  if (cache.loading) return
  if (refresh) {
    cache.data = []
    cache.page = 0
    cache.lastPage = 1
    cache.loaded = false
  }
  if (cache.page >= cache.lastPage && !refresh) {
    cache.state = 'finished'
    syncCurrentCache()
    return
  }

  cache.loading = true

  try {
    const params: any = { page: cache.page + 1, limit: 30, sort: activeFilter.value as any }
    if (activeCardType.value !== 0) {
      params.ad_type_id = activeCardType.value
    }
    if (activeFilter.value === 'following') {
      params.scope = 'following'
      delete params.sort
    }
    const res = await getAdPostListApi(params)
    if (res.code === 1 && res.data) {
      if (res.data.current_page === 1) {
        cache.data = res.data.data
      } else {
        cache.data = cache.data.concat(res.data.data)
      }
      cache.page = res.data.current_page
      cache.lastPage = Math.ceil((res.data as any).total / ((res.data as any).per_page || 30))
      cache.loaded = true

      if (cache.page >= cache.lastPage) {
        cache.state = 'finished'
      } else {
        cache.state = 'success'
      }
    }
  } catch (e) {
    console.error('loadAdPosts failed', e)
    cache.state = 'error'
  } finally {
    cache.loading = false
    syncCurrentCache()
  }
}

const handleFilterChange = (filter: string) => {
  if (activeFilter.value === filter) return
  activeFilter.value = filter
  const cache = getCurrentCache()
  if (cache.loaded) {
    syncCurrentCache()
  } else {
    loadData(1)
  }
}

// 点赞
const likePost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  likePostApi(id).then((res) => {
    if (res.code === 1) {
      const cache = getCurrentCache()
      const targetItem = cache.data.find((item) => item.id === id)
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
}

// ========== 操作面板 ==========
const reportShow = ref(false)
const reportActions = ref<any[]>([])
const reportActionIndex: any = {
  follow: -1,
  special: -1,
  report: -1,
  block: -1,
  remove: -1,
  ban: -1,
  unban: -1,
}

// 禁言相关
const banDays = ref(1)
const banReason = ref('')
const banTargetMemberId = ref(0)
const banTargetMemberName = ref('')

const updateBanAction = (isBanned: boolean) => {
  const actions = reportActions.value
  const banIdx = reportActionIndex.ban
  const unbanIdx = reportActionIndex.unban
  if (banIdx > -1) {
    actions.splice(banIdx, 1)
    reportActionIndex.ban = -1
  }
  if (unbanIdx > -1) {
    actions.splice(unbanIdx, 1)
    reportActionIndex.unban = -1
  }
  if (isBanned) {
    actions.push({ name: t('report.admin.unban_post.action'), type: 'unban', color: '#333' })
    reportActionIndex.unban = actions.length - 1
  } else {
    actions.push({ name: t('report.admin.ban_post.action'), type: 'ban', color: '#FF3B30' })
    reportActionIndex.ban = actions.length - 1
  }
  reportActions.value = actions
}

/** 同步列表中同一用户的禁言状态 */
const syncMemberBanState = (memberId: number, isBanned: boolean) => {
  Object.values(adListCache.value).forEach((cache) => {
    cache.data.forEach((post) => {
      if (post.member_id === memberId) {
        post.member.is_banned = isBanned
      }
    })
  })
}

const handleBan = () => {
  banDays.value = 1
  banReason.value = ''
  messageBan
    .confirm({})
    .then(() => confirmBan())
    .catch(() => {})
}

const confirmBan = () => {
  banPostApi(banTargetMemberId.value, banDays.value, banReason.value || undefined)
    .then((res) => {
      if (res.code === 1) {
        uni.showToast({ title: res.msg || t('common.operation_success'), icon: 'none' })
        // 同步列表中该用户的禁言状态为已禁言
        syncMemberBanState(banTargetMemberId.value, true)
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
    .catch(() => {})
}

const handleUnban = () => {
  message
    .confirm({
      title: t('report.admin.unban_post'),
      msg: t('report.admin.unban_post.confirm', { name: banTargetMemberName.value }),
    })
    .then(() => {
      unbanPostApi(banTargetMemberId.value).then((res) => {
        if (res.code === 1) {
          uni.showToast({ title: res.msg || t('common.operation_success'), icon: 'none' })
          // 同步列表中该用户的禁言状态为未禁言
          syncMemberBanState(banTargetMemberId.value, false)
        } else {
          toast.show(res.msg || t('common.error'))
        }
      })
    })
    .catch(() => {})
}
const reportPostItem = ref<any>({})

const reportSheetSelect = ({ item, index }: any) => {
  if (index === reportActionIndex.follow) {
    const member = reportPostItem.value.member
    if (member?.is_following) handleActionSheetUnfollow(member)
    else handleFollowClick(member)
    reportShow.value = false
  } else if (index === reportActionIndex.special) {
    handleSpecialFollow()
  } else if (index === reportActionIndex.report) {
    uni.navigateTo({ url: `/pages/cats/report/content?id=${reportPostItem.value.id}&type=post` })
  } else if (index === reportActionIndex.block) {
    handleBlockUser()
  } else if (index === reportActionIndex.remove) {
    handleRemovePost()
  } else if (index === reportActionIndex.ban) {
    reportShow.value = false
    handleBan()
  } else if (index === reportActionIndex.unban) {
    handleUnban()
  }
}

const reportPost = async (post: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  const member = post.member
  const isFollowing = member?.is_following === 1
  const isSpecial = member?.is_special_following === 1
  const actions: any[] = []
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
    actions.push({ name: t('social.index.user.special.set'), type: 'special', color: '#333' })
    reportActionIndex.special = actions.length - 1
  }
  actions.push({ name: '', type: 'divider', disabled: true })
  actions.push({ name: t('social.index.post.report'), type: 'report', color: '#ff6b03' })
  reportActionIndex.report = actions.length - 1
  actions.push({ name: t('social.index.user.block'), type: 'block' })
  reportActionIndex.block = actions.length - 1
  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    actions.push({ name: t('report.admin.remove_post'), type: 'remove', color: '#FF3B30' })
    reportActionIndex.remove = actions.length - 1
  }
  reportActions.value = actions
  reportShow.value = true
  reportPostItem.value = post
  banTargetMemberId.value = member.id
  banTargetMemberName.value = member.nickname || ''

  // 管理员权限：直接使用 member.is_banned
  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    const isBanned = member.is_banned
    updateBanAction(isBanned)
  }
}

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
    }
  })
}

const handleBlockUser = () => {
  message
    .confirm({ msg: t('social.index.report_user_confirm_txt') })
    .then(() => {
      blockUserApi(reportPostItem.value.id).then((res) => {
        if (res.data?.result === 1) {
          Object.values(adListCache.value).forEach((cache) => {
            cache.data = cache.data.filter((p) => p.member_id !== reportPostItem.value.member_id)
          })
          syncCurrentCache()
        }
      })
    })
    .catch(() => {})
}

const handleRemovePost = () => {
  message
    .confirm({ title: t('report.admin.remove_post'), msg: t('social.index.post.remove_content') })
    .then(() => {
      adminRemovalApi(reportPostItem.value.id, 'post').then((res) => {
        if (res.data?.status === 0) {
          Object.values(adListCache.value).forEach((cache) => {
            cache.data = cache.data.filter((p) => p.id !== reportPostItem.value.id)
          })
          syncCurrentCache()
          toast.success(t('common.operation_success'))
        }
      })
    })
    .catch(() => {})
}

const handleActionSheetUnfollow = async (member: any) => {
  try {
    await message.confirm({ msg: t('social.index.user.follow.cancel') })
  } catch {
    return
  }
  const res = await deleteFollowApi(member.id)
  if (res.code === 1) {
    syncMemberFollowState(member.id, res.data)
    uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
  }
}

const handleFollowClick = async (member: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  const memberId = member.id
  if (member.is_special_following) {
    try {
      await message.confirm({ msg: t('social.index.user.special.cancel.confirm') })
    } catch {
      return
    }
    const res = await setSpecialFollowApi(memberId, 0)
    if (res.code === 1) {
      syncMemberFollowState(memberId, {
        is_following: member.is_following,
        is_mutual_following: member.is_mutual_following,
        is_special_following: 0,
      })
    }
  } else if (member.is_following) {
    try {
      await message.confirm({ msg: t('social.index.user.follow.cancel') })
    } catch {
      return
    }
    const res = await deleteFollowApi(memberId)
    if (res.code === 1) syncMemberFollowState(memberId, res.data)
  } else {
    const res = await createFollowApi(memberId)
    if (res.code === 1) syncMemberFollowState(memberId, res.data)
  }
}

const handleDelPost = (id: number) => {
  message
    .confirm({ msg: t('social.index.del_post_confirm_txt') })
    .then(() => {
      deletePostApi(id).then((res) => {
        if (res.data?.result == 1) {
          Object.values(adListCache.value).forEach((cache) => {
            cache.data = cache.data.filter((p) => p.id !== id)
          })
          syncCurrentCache()
        }
      })
    })
    .catch(() => {})
}

// 刷新推广帖（调用接口，成功后更新当前页列表）
const handleRefreshPost = async (item: any) => {
  try {
    uni.showLoading()
    const res = await refreshAdPostApi(item.id)
    uni.hideLoading()
    if (res.code === 1) {
      toast.show(t('social.detail.refresh.success'))
      // 重新拉取当前筛选下的列表
      loadData(1, true)
    } else {
      toast.show(res.msg || t('social.detail.refresh.failed'))
    }
  } catch (e) {
    uni.hideLoading()
    toast.show(t('social.detail.refresh.failed'))
  }
}

const goSearch = () => {
  toUrl('/pages/cats/social/promotion_search', true)
}

const doHandlePreview = (images: string[], currentIndex: number = 0) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}

/** 同步列表中同一作者的关注状态 */
const syncMemberFollowState = (memberId: number, data: any) => {
  Object.values(adListCache.value).forEach((cache) => {
    cache.data.forEach((post) => {
      if (post.member_id === memberId) {
        post.member.is_following = data.is_following
        post.member.is_mutual_following = data.is_mutual_following
        post.member.is_special_following = data.is_special_following
      }
    })
  })
}

const handleAdTypeChange = (id: number) => {
  if (activeCardType.value === id) {
    activeCardType.value = 0
  } else {
    activeCardType.value = id
  }
  const cache = getCurrentCache()
  if (cache.loaded) {
    syncCurrentCache()
  } else {
    loadData(1)
  }
}

// 跳转用户主页
const toUserHome = (memberId: number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}

watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      const cache = getCurrentCache()
      if (cache.page < cache.lastPage) {
        loadData()
      } else {
        cache.state = 'finished'
        syncCurrentCache()
      }
    }
  },
)

onShow(() => {
  // fetchUnreadCount()
})

onMounted(async () => {
  fetchUnreadCount()
  await checkAdEligibility()
  await loadAdTypes()
  loadData(1)

  // 监听刷新事件（从编辑页返回后刷新推广列表）
  uni.$on('refreshPromotionTab', () => {
    loadData(1, true)
  })
})

onUnmounted(() => {
  uni.$off('refreshPromotionTab')
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

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

.filterIcon {
  width: 40rpx;
  height: 40rpx;
  margin-left: auto;
}

.banDialog {
  padding: 16rpx 0;
  .banLabel {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 24rpx;
  }
  .banDaysTitle {
    font-size: 26rpx;
    color: #666;
    margin-bottom: 12rpx;
  }
  .banDaysRow {
    display: flex;
    gap: 16rpx;
    margin-bottom: 20rpx;
    .banDayItem {
      flex: 1;
      padding: 16rpx 0;
      text-align: center;
      font-size: 28rpx;
      color: #333;
      background: #f5f5f5;
      border-radius: 12rpx;
      &.active {
        color: #fff;
        background: #ff6b03;
      }
    }
  }
}

.searchIcon {
  width: 40rpx;
  height: 40rpx;
  margin-left: auto;
}

.cardRow {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;

  .cardItem {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24rpx 0;
    background: #fff;
    border-radius: 16rpx;

    &.active {
      background: rgba(255, 107, 3, 0.08);
    }

    .cardIcon {
      position: relative;
      width: 72rpx;
      height: 72rpx;
      border-radius: 16rpx;

      // 点击前后两张图标叠加渲染，切换时只改透明度，避免重新加载闪动
      .cardIconImg {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        transition: opacity 0.15s ease;
      }

      .cardIconImgActive {
        opacity: 0;

        &.show {
          opacity: 1;
        }
      }

      .hide {
        opacity: 0;
      }
    }

    .cardType {
      font-size: 24rpx;
      color: #333;
      margin-top: 16rpx;
    }
  }
}

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

.nameWrap {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.adTagsRow {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.adTagChip {
  font-size: 22rpx;
  color: var(--liberty-cats-primary-color);
  // background: rgba(255, 107, 3, 0.08);
  padding: 4rpx 0;
  border-radius: 8rpx;
  margin-right: 12rpx;
}
.socialCntBox {
  .titleRow {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 8rpx;
    .tag {
      padding: 4rpx 16rpx;
      // margin-left: 12rpx;
      font-size: 24rpx;
      // font-weight: 600;
      text-transform: uppercase;
      border-radius: 8rpx;
      line-height: 1.4;
    }
    .tag1 {
      color: #fff;
      background: var(--wot-color-primary);
    }
    .tag2 {
      color: #ac59ff;
      background: #ece8f6;
    }
    .tag3 {
      color: #ff0303;
      background: #ffeaea;
    }
  }
  .title {
    flex: 1;
    color: #1d1d1f !important;
  }
  .content {
    color: #666666 !important;
  }
}
</style>

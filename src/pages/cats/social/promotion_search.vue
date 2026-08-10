<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    softinputMode: 'adjustResize',
    enablePullDownRefresh: true,
    'app-plus': {
      pullToRefresh: {
        style: 'circle',
        color: '#ff6b03',
        offset: '80rpx',
      },
    },
  },
}
</route>

<template>
  <view class="page" :class="[locale]" :style="{ '--keyboard-height': keyboardHeight + 'px' }">
    <!-- ========== 自定义导航栏 + 搜索框 ========== -->
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="searchBox">
            <wd-input
              type="text"
              v-model="searchText"
              :placeholder="t('social.search.searchInput.placeholder')"
              :no-border="true"
              custom-class="searchInput"
              confirm-type="search"
              @confirm="search"
            />
            <view class="searchDivider"></view>
            <text class="searchBtn" @click="search">{{ t('common.search') }}</text>
          </view>
        </view>
      </view>
      <view class="navBg">
        <view class="pbl2"><view class="fbg"></view></view>
        <view class="pbr2"><view class="fbg"></view></view>
      </view>
    </view>

    <!-- ========== 筛选栏：用户 + 时间 + 类型 + 标签（fixed，在 scroll-view 外） ========== -->
    <view class="filterSticky" :style="{ top: cntPaddingTop + 'rpx' }">
      <view class="filterBar">
        <view class="filterItem" @click="showUserFilter = true">
          <text class="filterLabel">
            {{ selectedUserLabel || t('social.search.filter.user') }}
          </text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showTimeFilter = true">
          <text class="filterLabel">
            {{ selectedTimeLabel || t('social.search.filter.time') }}
          </text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showAdTypeFilter = true">
          <text class="filterLabel">
            {{ selectedAdTypeLabel || t('social.search.filter.type') }}
          </text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showTagFilter = true">
          <text class="filterLabel">{{ selectedTagLabel || t('social.search.filter.tag') }}</text>
          <text class="filterArrow">▼</text>
        </view>
      </view>

      <view class="selectedUsersBar" v-if="confirmedUserIds.length > 0">
        <scroll-view scroll-x class="selectedUsersScroll">
          <view class="selectedUserItem" v-for="uid in confirmedUserIds" :key="uid">
            <view class="userAvatarWrap" @click="removeSelectedUser(uid)">
              <image
                class="userAvatar"
                :src="selectedUsersCache.get(uid)?.avatar"
                mode="aspectFill"
              />
              <view class="levelIcon" v-if="getLevelValue(selectedUsersCache.get(uid))">
                <image :src="getLevelIcon(selectedUsersCache.get(uid))" mode="aspectFit" />
              </view>
              <view class="removeIcon">×</view>
            </view>
            <text class="userName">{{ selectedUsersCache.get(uid)?.nickname }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 滚动内容区 ========== -->
    <view class="cntScrollWrap" :style="{ paddingTop: scrollViewTop }">
      <view class="cntScroll">
        <!-- ========== 搜索状态：初始提示 / 结果列表（暂无数据） ========== -->
        <template v-if="!hasSearched">
          <view class="emptyBox">
            <view class="emptyText">{{ t('social.search.hint') }}</view>
          </view>
        </template>
        <template v-else-if="searchResult.posts.length > 0">
          <view class="socialBox">
            <view class="cell" v-for="item in searchResult.posts" :key="item.id">
              <PromotionPostItem
                :ref="
                  (el) => {
                    if (el) postItemRefs[item.id] = el
                  }
                "
                :item="item"
                :show-delete="item.member_id === userStore.userInfo?.member_id"
                :show-report="item.member_id !== userStore.userInfo?.member_id"
                :show-refresh="item.can_refresh !== 0"
                @delete="handleDelPost"
                @refresh="debouncedHandleRefreshPost"
                @report="reportPost"
                @avatar-click="(i) => toUserHome(i.member_id)"
                @click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
                @view-click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
                @comment-click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
                @like="likeSearchPost"
                @share="handleShare"
              />
            </view>
          </view>
        </template>
        <template v-else>
          <view class="emptyBox">
            <view class="emptyText">{{ t('common.no_data') }}</view>
          </view>
        </template>
      </view>
    </view>

    <!-- ========== 时间筛选弹窗 ========== -->
    <wd-action-sheet
      v-model="showTimeFilter"
      :title="t('social.search.filter.time')"
      :z-index="1100"
      @closed="onTimeFilterClosed"
    >
      <view class="filterContent">
        <view class="timePresetRow">
          <view
            class="timePresetItem"
            :class="{ active: selectedTimeRange === range.value }"
            v-for="range in timeRanges"
            :key="range.value"
            @click="selectTimeRange(range)"
          >
            {{ range.label }}
          </view>
        </view>
        <view class="customTimeSection">
          <view class="sectionTitle">{{ t('social.search.filter.time.custom') }}</view>
          <view class="timeRow" @click="showStartCalendar = true">
            <text class="timeRowLabel">{{ t('social.search.filter.time.start') }}</text>
            <wd-calendar
              v-model="customStartTime"
              v-model:visible="showStartCalendar"
              type="date"
              :max-date="customEndTime || Date.now()"
              @confirm="showStartCalendar = false"
            />
          </view>
          <view class="timeDivider"></view>
          <view class="timeRow" @click="showEndCalendar = true">
            <text class="timeRowLabel">{{ t('social.search.filter.time.end') }}</text>
            <wd-calendar
              v-model="customEndTime"
              v-model:visible="showEndCalendar"
              type="date"
              :min-date="customStartTime || undefined"
              :max-date="Date.now()"
              @confirm="showEndCalendar = false"
            />
          </view>
        </view>
        <view class="filterActions">
          <wd-button custom-class="cancelBtn" size="large" block @click="showTimeFilter = false">
            {{ t('common.cancel') }}
          </wd-button>
          <wd-button type="primary" size="large" block @click="confirmTimeFilter">
            {{ t('common.confirm') }}
          </wd-button>
        </view>
      </view>
    </wd-action-sheet>

    <!-- ========== 用户筛选弹窗 ========== -->
    <wd-popup
      v-model="showUserFilter"
      position="bottom"
      :custom-style="userFilterPopupStyle"
      :z-index="1100"
      @close="onUserFilterClosed"
    >
      <view class="userFilterHeader">
        <text class="userFilterTitle">{{ t('social.search.filter.user') }}</text>
        <view class="userFilterClose" @click="showUserFilter = false">
          <text class="closeIcon">✕</text>
        </view>
      </view>
      <view class="filterContent">
        <view class="searchMember">
          <wd-input
            v-model="memberKeyword"
            :placeholder="t('social.search.filter.userPlaceholder')"
            clearable
            :cursor-spacing="100"
            @confirm="searchUsers"
          />
          <wd-button
            type="primary"
            size="small"
            @click="searchUsers"
            custom-class="searchMemberBtn"
          >
            {{ t('common.search') }}
          </wd-button>
        </view>
        <view class="recentMembers" v-if="recentMembers.length > 0 && searchedUsers.length === 0">
          <view class="recentTitle">{{ t('social.search.filter.recentMembers') }}</view>
          <view class="recentMemberList">
            <view
              class="recentMemberItem"
              v-for="member in recentMembers"
              :key="member.member_id"
              @click="selectRecentMember(member)"
            >
              <view class="recentAvatarWrap">
                <image class="recentAvatar" :src="member.avatar" mode="aspectFill" />
                <view class="levelIcon" v-if="getLevelValue(member)">
                  <image :src="getLevelIcon(member)" mode="aspectFit" />
                </view>
              </view>
              <view class="recentMemberInfo">
                <text class="recentName">{{ member.nickname }}</text>
                <text class="recentId">ID: {{ member.member_id }}</text>
              </view>
              <view class="recentCheck" v-if="tempSelectedUserIds.includes(member.member_id)">
                ✓
              </view>
            </view>
          </view>
        </view>
        <scroll-view scroll-y class="memberList" v-if="searchedUsers.length > 0">
          <view
            class="memberItem"
            v-for="user in searchedUsers"
            :key="user.member_id"
            @click="selectUser(user)"
          >
            <view class="memberAvatarWrap">
              <image class="memberAvatar" :src="user.avatar" mode="aspectFill" />
              <view class="levelIcon" v-if="getLevelValue(user)">
                <image :src="getLevelIcon(user)" mode="aspectFit" />
              </view>
            </view>
            <view class="memberInfo">
              <text class="memberName">{{ user.nickname }}</text>
              <text class="memberId">ID: {{ user.member_id }}</text>
            </view>
            <view class="memberActions">
              <view
                v-if="getFollowButtonInfo(user)"
                class="followBtn"
                :class="getFollowButtonInfo(user).style"
                @click.stop="handleFollow(user)"
              >
                {{ getFollowButtonInfo(user).text }}
              </view>
              <view class="memberCheck" v-if="tempSelectedUserIds.includes(user.member_id)">✓</view>
            </view>
          </view>
        </scroll-view>
        <view class="emptyHint" v-if="searchedUsers.length === 0 && !memberKeyword">
          {{ t('social.search.filter.userHint') }}
        </view>
        <view class="emptyHint noResult" v-if="memberKeyword && searchedUsers.length === 0">
          {{ t('social.search.noResults') }}
        </view>
        <view class="filterActions">
          <wd-button custom-class="cancelBtn" size="large" block @click="showUserFilter = false">
            {{ t('common.cancel') }}
          </wd-button>
          <wd-button type="primary" size="large" block @click="confirmUserFilter">
            {{ t('common.confirm') }}
          </wd-button>
        </view>
      </view>
    </wd-popup>

    <!-- ========== 类型筛选 ========== -->
    <wd-action-sheet
      v-model="showAdTypeFilter"
      :title="t('social.search.filter.type')"
      :z-index="1100"
    >
      <view class="filterContent">
        <view class="filterItem" @click="selectAdType({ id: 0 })">
          {{ t('social.search.filter.all') }}
        </view>
        <view class="filterItem" v-for="t in adTypes" :key="t.id" @click="selectAdType(t)">
          {{ t.name }}
        </view>
      </view>
    </wd-action-sheet>

    <!-- 排序筛选 -->
    <!-- <wd-action-sheet v-model="showSortFilter" title="排序" :z-index="1100">
      <view class="filterContent">
        <view class="filterItem" @click="selectSort('latest')">最新</view>
        <view class="filterItem" @click="selectSort('hot')">热门</view>
      </view>
    </wd-action-sheet> -->

    <!-- ========== 标签筛选 ========== -->
    <wd-action-sheet v-model="showTagFilter" :title="t('social.search.filter.tag')" :z-index="1100">
      <view class="filterContent">
        <view class="searchMember">
          <wd-input
            v-model="tagKeyword"
            :placeholder="t('social.search.filter.tagPlaceholder')"
            clearable
            :cursor-spacing="100"
            @confirm="searchTags"
          />
          <wd-button type="primary" size="small" @click="searchTags" custom-class="searchMemberBtn">
            {{ t('common.search') }}
          </wd-button>
        </view>
        <view class="filterItem" @click="selectTag(0)">{{ t('social.search.filter.all') }}</view>
        <view class="filterItem" v-for="t in adTags" :key="t.id" @click="selectTag(t.id)">
          <text>{{ t.display_name }}</text>
          <text class="tagCount">{{ t.use_count }}</text>
        </view>
      </view>
    </wd-action-sheet>

    <!-- ========== 操作面板 ========== -->
    <wd-action-sheet
      custom-class="reportSheet"
      v-model="reportShow"
      :actions="reportActions"
      :z-index="1100"
      @select="reportSheetSelect"
    />

    <wd-message-box selector="wd-message-box-slot" :z-index="1200" />

    <!-- ========== 禁言弹窗 ========== -->
    <wd-message-box
      selector="wd-message-box-ban"
      :title="t('report.admin.ban_post')"
      :z-index="1200"
    >
      <view class="banDialog">
        <view class="banLabel">
          {{ t('report.admin.ban_post.label', { name: banTargetMemberName }) }}
        </view>
        <view class="banDaysTitle">{{ t('report.admin.ban_post.days') }}</view>
        <view class="banDaysRow">
          <view class="banDayItem" :class="{ active: banDays === 1 }" @click="banDays = 1">
            {{ t('report.admin.ban_post.day_1') }}
          </view>
          <view class="banDayItem" :class="{ active: banDays === 3 }" @click="banDays = 3">
            {{ t('report.admin.ban_post.day_3') }}
          </view>
          <view class="banDayItem" :class="{ active: banDays === 7 }" @click="banDays = 7">
            {{ t('report.admin.ban_post.day_7') }}
          </view>
        </view>
        <wd-input
          v-model="banReason"
          :placeholder="t('report.admin.ban_post.reason_placeholder')"
          custom-class="banReasonInput"
        />
      </view>
    </wd-message-box>

    <wd-toast :z-index="1200" />
    <SharePopup ref="shareRef" />
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { t } from '@/locale/index'
import PromotionPostItem from '@/components/PostItem/PromotionPostItem.vue'
import { formatRelativeTime, getImageUrl, toUrl, formatNickname, handlePreview } from '@/utils'
import { getAdTypeListApi, getAdTagHotApi, getAdTagSearchApi } from '@/service/api/promotion'
import {
  searchPostsApi,
  searchMembersApi,
  likePostApi,
  deletePostApi,
  blockUserApi,
  createFollowApi,
  deleteFollowApi,
  setSpecialFollowApi,
  adminRemovalApi,
  banPostApi,
  unbanPostApi,
  refreshAdPostApi,
  checkAdEligibilityApi,
} from '@/service/api/community'
import { useUserStore } from '@/store/user'
import { useMessage, useToast } from 'wot-design-uni'
import { debounce } from 'lodash-es'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

// ============================================================
// 导航栏布局
// ============================================================
const locale = uni.getLocale()
const keyboardHeight = ref(0)

const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)
  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20

  // 加载最近选择的成员
  loadRecentMembers()

  // 键盘高度监听（H5 等平台可能不支持，需做存在性检查）
  if (typeof uni.onKeyboardHeightChange === 'function') {
    uni.onKeyboardHeightChange((res) => {
      keyboardHeight.value = res.height || 0
    })
  }
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}
const toUserHome = (memberId: number) => {
  uni.navigateTo({ url: `/pages/cats/user/home?member_id=${memberId}` })
}

// ============================================================
// 搜索
// ============================================================
const messageBan = useMessage('wd-message-box-ban')
const message = useMessage('wd-message-box-slot')
const toast = useToast()
const shareRef = ref<any>(null)

const userStore = useUserStore()

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

const searchText = ref('')
/** 是否已执行过搜索，控制初始提示 / 搜索结果切换 */
const hasSearched = ref(false)
const isLoading = ref(false)
const loadMoreState = ref<LoadMoreState>('loading')

/** 搜索结果 */
const searchResult = ref<{
  posts: any[]
  total: number
  page: number
  limit: number
}>({
  posts: [],
  total: 0,
  page: 0,
  limit: 20,
})

// ========== 用户筛选 ==========
const showUserFilter = ref(false)

/** wd-popup custom-style：用 screenHeight 避免 adjustResize 下 windowHeight 被双重扣减 */
const userFilterPopupStyle = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  const navHeightPx = (navHeight.value * sysInfo.windowWidth) / 750
  if (keyboardHeight.value > 0) {
    // 键盘唤起时：可用高度 = 屏幕高度 - 键盘高度 - 导航栏高度
    const maxH = sysInfo.screenHeight - keyboardHeight.value - navHeightPx
    return `max-height: ${maxH}px;`
  }
  // 无键盘时：最大高度 = 屏幕高度 - 导航栏高度
  const maxH = sysInfo.screenHeight - navHeightPx
  return `max-height: ${maxH}px;`
})

const memberKeyword = ref('')
const searchedUsers = ref<any[]>([])
const tempSelectedUserIds = ref<number[]>([])
const tempSelectedUsers = ref<Map<number, any>>(new Map())
const confirmedUserIds = ref<number[]>([])
const confirmedUsers = ref<Map<number, any>>(new Map())
const selectedUserLabel = computed(() => {
  if (confirmedUserIds.value.length === 0) return ''
  return t('social.search.confirmed_users', { count: confirmedUserIds.value.length })
})
const selectedUsersCache = computed(() => {
  const map = new Map<number, any>()
  confirmedUserIds.value.forEach((uid) => {
    if (confirmedUsers.value.has(uid)) map.set(uid, confirmedUsers.value.get(uid))
  })
  return map
})
const RECENT_MEMBERS_KEY = 'promo_search_recent_members'
const recentMembers = ref<any[]>([])
const loadRecentMembers = () => {
  try {
    const stored = uni.getStorageSync(RECENT_MEMBERS_KEY)
    if (stored && Array.isArray(stored)) recentMembers.value = stored.slice(0, 5)
  } catch (e) {
    /* ignore */
  }
}
const addToRecentMembers = (member: any) => {
  recentMembers.value = recentMembers.value.filter((m) => m.member_id !== member.member_id)
  recentMembers.value.unshift({
    member_id: member.member_id,
    nickname: member.nickname,
    avatar: member.avatar,
    level: member.level,
  })
  if (recentMembers.value.length > 5) recentMembers.value = recentMembers.value.slice(0, 5)
  try {
    uni.setStorageSync(RECENT_MEMBERS_KEY, recentMembers.value)
  } catch (e) {
    /* ignore */
  }
}
const searchUsers = async () => {
  if (!memberKeyword.value.trim()) return
  try {
    const res = await searchMembersApi(memberKeyword.value.trim(), 'advertisement')
    if (res.code === 1 && res.data) searchedUsers.value = (res.data as any).list || []
  } catch (e) {
    /* ignore */
  }
}
const selectUser = (user: any) => {
  const idx = tempSelectedUserIds.value.indexOf(user.member_id)
  if (idx > -1) {
    tempSelectedUserIds.value.splice(idx, 1)
    tempSelectedUsers.value.delete(user.member_id)
  } else {
    tempSelectedUserIds.value.push(user.member_id)
    tempSelectedUsers.value.set(user.member_id, user)
  }
}
const selectRecentMember = (member: any) => selectUser(member)
const removeSelectedUser = (uid: number) => {
  confirmedUserIds.value = confirmedUserIds.value.filter((id) => id !== uid)
  confirmedUsers.value.delete(uid)
  tempSelectedUserIds.value = tempSelectedUserIds.value.filter((id) => id !== uid)
  tempSelectedUsers.value.delete(uid)
}
const confirmUserFilter = () => {
  if (tempSelectedUserIds.value.length > 10) {
    toast.show({ msg: '最多只能选择10个用户', zIndex: 1200 })
    return
  }
  confirmedUserIds.value = [...tempSelectedUserIds.value]
  confirmedUsers.value = new Map(tempSelectedUsers.value)
  tempSelectedUsers.value.forEach((member) => addToRecentMembers(member))
  showUserFilter.value = false
}
const onUserFilterClosed = () => {
  // tempSelectedUserIds.value = [...confirmedUserIds.value]
  // tempSelectedUsers.value = new Map(confirmedUsers.value)
  // searchedUsers.value = []
  // memberKeyword.value = ''
  showUserFilter.value = false
}
watch(
  confirmedUserIds,
  () => {
    const hasKeyword = searchText.value.trim() !== ''
    const hasUser = confirmedUserIds.value.length > 0
    const timeRange = getTimeRange()
    const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)
    const hasTypeFilter = selectedAdTypeId.value !== 0
    const hasTagFilter = selectedTagId.value !== 0

    // 所有筛选条件都为空，回到初始状态
    if (!hasKeyword && !hasUser && !hasTimeFilter && !hasTypeFilter && !hasTagFilter) {
      hasSearched.value = false
      searchResult.value = { posts: [], total: 0, page: 0, limit: 20 }
      return
    }

    search()
  },
  { deep: true },
)

const getFollowButtonInfo = (user: any) => {
  if (user.is_self) return null
  if (user.is_mutual) return { text: t('social.index.user.mutual_following'), style: 'mutual' }
  if (user.is_followed) return { text: t('social.index.user.followed'), style: 'followed' }
  if (user.is_following_me) return { text: t('social.index.user.follow_back'), style: 'follow' }
  return { text: t('social.index.user.follow'), style: 'follow' }
}
const handleFollow = async (user: any) => {
  console.log('handleFollow', user.member_id)
  try {
    // 已关注状态 - 取消关注
    if (user.is_followed) {
      try {
        await message.confirm({ msg: t('social.index.user.follow.cancel'), zIndex: 1300 })
      } catch {
        return
      }
      const res = await deleteFollowApi(user.member_id)
      if (res.code === 1) {
        user.is_followed = false
        user.is_mutual = false
        uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
      }
    } else {
      // 未关注状态 - 关注
      const res = await createFollowApi(user.member_id)
      if (res.code === 1) {
        user.is_followed = true
        if (user.is_following_me) user.is_mutual = true
        uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
      } else {
        uni.showToast({
          title: res.msg || t('common.request.error'),
          icon: 'none',
        })
      }
    }
  } catch (e) {
    console.error('handleFollow error', e)
  }
}

// 筛选
const adTypes = ref<any[]>([])
const adTags = ref<any[]>([])
const showAdTypeFilter = ref(false)
const showSortFilter = ref(false)
const showTagFilter = ref(false)
const selectedAdTypeId = ref(0)
const selectedSortName = ref('latest')

// ========== 时间筛选 ==========
const showTimeFilter = ref(false)
const selectedTimeRange = ref('')
const customStartTime = ref(0)
const customEndTime = ref(0)
const showStartCalendar = ref(false)
const showEndCalendar = ref(false)
const confirmedTimeRange = ref('')
const confirmedStartTime = ref(0)
const confirmedEndTime = ref(0)

const timeRanges = computed(() => [
  { label: t('social.search.filter.time.all'), value: '' },
  { label: t('social.search.filter.time.today'), value: 'today' },
  { label: t('social.search.filter.time.week'), value: 'week' },
  { label: t('social.search.filter.time.month'), value: 'month' },
])
const formatDateStr = (ts: number) => {
  const d = new Date(ts)
  return d.getMonth() + 1 + '/' + d.getDate()
}
const toDateStr = (ts: number) => {
  if (!ts) return ''
  const d = new Date(ts)
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  )
}
const getTodayStart = () => new Date(new Date().toDateString()).getTime()
const selectedTimeLabel = computed(() => {
  if (confirmedStartTime.value || confirmedEndTime.value) {
    const s = confirmedStartTime.value ? formatDateStr(confirmedStartTime.value) : ''
    const e = confirmedEndTime.value ? formatDateStr(confirmedEndTime.value) : ''
    if (s && e) return s + ' ~ ' + e
    if (s) return s + ' 起'
    if (e) return '至 ' + e
  }
  if (!confirmedTimeRange.value) return ''
  const range = timeRanges.value.find((r) => r.value === confirmedTimeRange.value)
  return range ? range.label : ''
})
const selectTimeRange = (range: any) => {
  selectedTimeRange.value = range.value
  const now = Date.now()
  const day = 86400000
  switch (range.value) {
    case 'today':
      customStartTime.value = getTodayStart()
      customEndTime.value = now
      break
    case 'week':
      customStartTime.value = getTodayStart() - 7 * day
      customEndTime.value = now
      break
    case 'month':
      customStartTime.value = getTodayStart() - 30 * day
      customEndTime.value = now
      break
    default:
      customStartTime.value = 0
      customEndTime.value = 0
      break
  }
}
const onTimeFilterClosed = () => {
  selectedTimeRange.value = confirmedTimeRange.value
  customStartTime.value = confirmedStartTime.value
  customEndTime.value = confirmedEndTime.value
}
const confirmTimeFilter = () => {
  confirmedTimeRange.value = selectedTimeRange.value
  confirmedStartTime.value = customStartTime.value
  confirmedEndTime.value = customEndTime.value
  showTimeFilter.value = false
}
const getTimeRange = () => {
  if (confirmedStartTime.value || confirmedEndTime.value) {
    const result: any = {}
    if (confirmedStartTime.value) result.start_time = Math.floor(confirmedStartTime.value / 1000)
    if (confirmedEndTime.value)
      result.end_time = Math.floor(confirmedEndTime.value / 1000) + 86400 - 1
    return result
  }
  if (!confirmedTimeRange.value) return {}
  const now = Math.floor(Date.now() / 1000)
  switch (confirmedTimeRange.value) {
    case 'today':
      return { start_time: now - 86400, end_time: now }
    case 'week':
      return { start_time: now - 7 * 86400, end_time: now }
    case 'month':
      return { start_time: now - 30 * 86400, end_time: now }
    default:
      return {}
  }
}
watch([confirmedTimeRange, confirmedStartTime, confirmedEndTime], () => {
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  const timeRange = getTimeRange()
  const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)
  const hasTypeFilter = selectedAdTypeId.value !== 0
  const hasTagFilter = selectedTagId.value !== 0

  // 所有筛选条件都为空，回到初始状态
  if (!hasKeyword && !hasUser && !hasTimeFilter && !hasTypeFilter && !hasTagFilter) {
    hasSearched.value = false
    searchResult.value = { posts: [], total: 0, page: 0, limit: 20 }
    return
  }

  search()
})

const selectedTagId = ref(0)

const selectedAdTypeLabel = computed(() => {
  if (selectedAdTypeId.value === 0) return ''
  const found = adTypes.value.find((t) => t.id === selectedAdTypeId.value)
  return found?.display_name || found?.name
})
const selectedSortLabel = computed(() => (selectedSortName.value === 'hot' ? '热门' : '最新'))
const selectedTagLabel = computed(() => {
  if (selectedTagId.value === 0) return ''
  const found = adTags.value.find((t) => t.id === selectedTagId.value)
  return found?.display_name
})

const tagKeyword = ref('')
const searchTags = async () => {
  const kw = tagKeyword.value.trim()
  if (!kw) {
    loadHotTags()
    return
  }
  try {
    const res = await getAdTagSearchApi(kw)
    if (res.code === 1 && res.data) {
      adTags.value = res.data as any[]
    }
  } catch (e) {
    /* ignore */
  }
}

const loadHotTags = async () => {
  try {
    const res = await getAdTagHotApi()
    if (res.code === 1 && res.data) {
      adTags.value = res.data as any[]
    }
  } catch (e) {
    /* ignore */
  }
}

const selectAdType = (t: any) => {
  selectedAdTypeId.value = t.id
  showAdTypeFilter.value = false
  // 选择类型后直接调用搜索，即使为 0（全部）也调用接口
  search()
}
const selectSort = (name: string) => {
  selectedSortName.value = name
  showSortFilter.value = false
  search()
}
const selectTag = (id: number) => {
  selectedTagId.value = id
  showTagFilter.value = false
  // 选择标签后直接调用搜索，即使为 0（全部）也调用接口
  search()
}

/** 构建搜索参数 */
const buildSearchParams = (page: number) => {
  const params: any = {
    page,
    limit: 20,
    post_category: 'advertisement',
    sort: selectedSortName.value,
  }

  const keyword = searchText.value.trim()
  if (keyword) params.keyword = keyword

  if (confirmedUserIds.value.length > 0) params.member_ids = confirmedUserIds.value

  const timeRange = getTimeRange()
  if (timeRange.start_time) params.start_time = timeRange.start_time
  if (timeRange.end_time) params.end_time = timeRange.end_time

  if (selectedAdTypeId.value !== 0) params.ad_type_id = selectedAdTypeId.value
  if (selectedTagId.value !== 0) params.tag_id = selectedTagId.value

  return params
}

const search = async () => {
  if (isLoading.value) return
  isLoading.value = true
  hasSearched.value = true
  loadMoreState.value = 'loading'
  uni.showLoading()
  try {
    const res = await searchPostsApi(buildSearchParams(1))
    if (res.code === 1 && res.data) {
      searchResult.value = res.data
      loadMoreState.value =
        res.data.page * res.data.limit >= res.data.total ? 'finished' : 'loading'
    }
  } catch (e) {
    console.error('search failed', e)
    loadMoreState.value = 'error'
  } finally {
    isLoading.value = false
    uni.hideLoading()
  }
}

const loadMore = async () => {
  if (isLoading.value) return
  if (loadMoreState.value === 'finished' || loadMoreState.value === 'error') return
  isLoading.value = true
  loadMoreState.value = 'loading'
  try {
    const res = await searchPostsApi(buildSearchParams(searchResult.value.page + 1))
    if (res.code === 1 && res.data) {
      searchResult.value.posts = searchResult.value.posts.concat(res.data.posts)
      searchResult.value.page = res.data.page
      loadMoreState.value =
        res.data.page * res.data.limit >= res.data.total ? 'finished' : 'loading'
    }
  } catch (e) {
    console.error('loadMore failed', e)
    loadMoreState.value = 'error'
  } finally {
    isLoading.value = false
  }
}

// ========== 滚动区域定位 ==========
const filterStickyHeight = computed(() => (confirmedUserIds.value.length > 0 ? 260 : 110))
const scrollViewTop = computed(() => cntPaddingTop.value + filterStickyHeight.value + 'rpx')

// PromotionPostItem 组件实例引用（按 item.id 收集）
const postItemRefs = ref<Record<number, any>>({})

// 检查推广发布资格，如果不可发布则隐藏当前用户帖子的刷新按钮
const syncRefreshEligibility = async () => {
  try {
    const eligRes = await checkAdEligibilityApi()
    if (eligRes.code === 1 && eligRes.data.can_publish === false) {
      const currentMemberId = userStore.userInfo?.member_id
      searchResult.value.posts.forEach((post: any) => {
        if (post.member_id === currentMemberId) {
          postItemRefs.value[post.id]?.hideRefresh()
        }
      })
    }
  } catch (e) {
    console.error('checkAdEligibility after refresh failed', e)
  }
}

// 刷新推广帖（调用接口，成功后更新当前页搜索结果列表）
const handleRefreshPost = async (item: any) => {
  try {
    uni.showLoading()
    const res = await refreshAdPostApi(item.id)
    uni.hideLoading()
    if (res.code === 1) {
      toast.show(t('social.detail.refresh.success'))
      // 重新拉取当前搜索条件下的第一页结果
      if (hasSearched.value) await refreshData()
      // 刷新后检查推广发布资格，如果不可发布则隐藏当前用户帖子的刷新按钮
      await syncRefreshEligibility()
    } else {
      toast.show(res.msg || t('social.detail.refresh.failed'))
      await syncRefreshEligibility()
    }
  } catch (e) {
    uni.hideLoading()
    toast.show(t('social.detail.refresh.failed'))
  }
}
const debouncedHandleRefreshPost = debounce(handleRefreshPost, 500)

const refreshData = async () => {
  if (isLoading.value) return
  isLoading.value = true
  loadMoreState.value = 'loading'
  try {
    const res = await searchPostsApi(buildSearchParams(1))
    if (res.code === 1 && res.data) {
      searchResult.value = res.data
      loadMoreState.value =
        res.data.page * res.data.limit >= res.data.total ? 'finished' : 'loading'
    }
  } catch (e) {
    console.error('refreshData failed', e)
    loadMoreState.value = 'error'
  } finally {
    isLoading.value = false
  }
}

// ========== 页面级下拉刷新 ==========
onPullDownRefresh(() => {
  if (hasSearched.value) {
    refreshData()
  }
  uni.stopPullDownRefresh()
})

// ========== 页面级上拉加载更多 ==========
onReachBottom(() => {
  if (loadMoreState.value !== 'finished' && loadMoreState.value !== 'error') {
    loadMore()
  }
})

// ========== 点赞 ==========
const likeSearchPost = async (post: any) => {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/cats/login/login' })
    return
  }
  try {
    const res = await likePostApi(post.id)
    if (res.code === 1) {
      post.like_count = res.data.like_count
      post.is_liked = res.data.is_liked
      const ts = Date.now()
      post.currentGif = post.is_liked === 1 ? `${GIF_LIKE}?t=${ts}` : `${GIF_UNLIKE}?t=${ts}`
      setTimeout(() => {
        post.currentGif = ''
      }, 800)
    }
  } catch (e) {
    console.error('likeSearchPost failed', e)
  }
}

const handleShare = (post: any) => {
  console.log(shareRef.value)
  shareRef.value?.openSharePopup(post)
}

const doHandlePreview = (images: string[], currentIndex: number = 0) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}

/** 删除帖子 */
const handleDelPost = (id: number) => {
  message
    .confirm({ msg: t('social.index.del_post_confirm_txt') })
    .then(() => {
      deletePostApi(id).then((res) => {
        if (res.data?.result == 1) {
          toast.success(t('common.operation_success'))

          searchResult.value.posts = searchResult.value.posts.filter((p) => p.id !== id)
        }
      })
    })
    .catch(() => {})
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
const reportPostItem = ref<any>({})

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
/** 同步搜索结果中同一用户的禁言状态 */
const syncMemberBanState = (memberId: number, isBanned: boolean) => {
  searchResult.value.posts.forEach((post) => {
    if (post.member_id === memberId) {
      post.member.is_banned = isBanned
    }
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
          syncMemberBanState(banTargetMemberId.value, false)
        } else {
          toast.show(res.msg || t('common.error'))
        }
      })
    })
    .catch(() => {})
}

const reportSheetSelect = ({ item, index }: any) => {
  if (index === reportActionIndex.follow) {
    const member = reportPostItem.value.member
    if (member?.is_following) {
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
    handleReportPostAction()
    return
  }
  if (index === reportActionIndex.block) {
    handleBlockUser()
    return
  }
  if (index === reportActionIndex.remove) {
    handleRemovePost()
    return
  }
  if (index === reportActionIndex.ban) {
    reportShow.value = false
    handleBan()
    return
  }
  if (index === reportActionIndex.unban) {
    handleUnban()
  }
}

const reportPost = async (post: any) => {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/cats/login/login' })
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
      member.is_special_following = isSpecial ? 0 : 1
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

const handleReportPostAction = () => {
  uni.navigateTo({ url: `/pages/cats/report/content?id=${reportPostItem.value.id}&type=post` })
}

const handleBlockUser = () => {
  message
    .confirm({ msg: t('social.index.report_user_confirm_txt') })
    .then(() => {
      blockUserApi(reportPostItem.value.id).then((res) => {
        if (res.data?.result === 1) {
          searchResult.value.posts = searchResult.value.posts.filter(
            (p) => p.member_id !== reportPostItem.value.member_id,
          )
        }
      })
    })
    .catch(() => {})
}

const handleRemovePost = () => {
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
            searchResult.value.posts = searchResult.value.posts.filter(
              (p) => p.id !== reportPostItem.value.id,
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

const handleActionSheetUnfollow = async (member: any) => {
  try {
    await message.confirm({ msg: t('social.index.user.follow.cancel'), zIndex: 1300 })
  } catch {
    return
  }
  const res = await deleteFollowApi(member.id)
  if (res.code === 1) {
    member.is_following = 0
    member.is_mutual_following = 0
    uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
  }
}

const handleFollowClick = async (member: any) => {
  if (member.is_special_following) {
    try {
      await message.confirm({ msg: t('social.index.user.special.cancel.confirm') })
    } catch {
      return
    }
    await setSpecialFollowApi(member.id, 0)
    member.is_special_following = 0
    uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
  } else if (member.is_following) {
    try {
      await message.confirm({ msg: t('social.index.user.follow.cancel') })
    } catch {
      return
    }
    const res = await deleteFollowApi(member.id)
    if (res.code === 1) {
      member.is_following = 0
      member.is_mutual_following = 0
      uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
    }
  } else {
    const res = await createFollowApi(member.id)
    if (res.code === 1) {
      member.is_following = 1
      uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
    } else {
      uni.showToast({
        title: res.msg || t('common.request.error'),
        icon: 'none',
      })
    }
  }
}

// ============================================================
// Level 等级处理工具函数
// ============================================================
/** 获取 level_id 的值（优先使用 level_id，兼容旧的 level 字段） */
const getLevelValue = (member: any): number | null => {
  // 优先使用 level_id
  if (member?.level_id !== undefined) {
    const num = Number(member.level_id)
    return isNaN(num) || num <= 0 ? null : num
  }

  // 兼容旧的 level 字段
  const level = member?.level
  if (!level) return null

  // Vue 3 的响应式对象也是 object，先尝试取 level 属性
  const levelNum = level.level !== undefined ? level.level : level

  // 转换为数字
  const num = Number(levelNum)
  return isNaN(num) || num <= 0 ? null : num
}

/** 获取 level 图标路径（使用 level_id） */
const getLevelIcon = (member: any): string => {
  const levelId = getLevelValue(member)
  if (!levelId) return ''
  return `/static/images/level/${levelId}.png`
}

/** 图片加载成功 */
const handleLevelIconLoad = (member: any) => {
  console.log('Level icon loaded:', {
    nickname: member?.nickname,
    level_id: member?.level_id,
    level: member?.level,
    icon: getLevelIcon(member),
  })
}

/** 图片加载失败 */
const handleLevelIconError = (member: any) => {
  console.error('Level icon load failed:', {
    nickname: member?.nickname,
    level_id: member?.level_id,
    level: member?.level,
    levelValue: getLevelValue(member),
    icon: getLevelIcon(member),
  })
}

// 加载筛选选项
onMounted(async () => {
  try {
    const res = await getAdTypeListApi()
    if (res.code === 1 && res.data) {
      adTypes.value = res.data as any[]
    }
  } catch (e) {
    /* ignore */
  }
  loadHotTags()

  // 监听刷新事件（从编辑页返回后重新搜索）
  uni.$on('refreshPromotionPost', () => {
    if (hasSearched.value) {
      search()
    }
  })

  // 监听单项更新事件（用详情页结果替换列表项）
  uni.$on('updatePromotionPostItem', (data: any) => {
    if (!hasSearched.value || !data?.id) return
    const index = searchResult.value.posts.findIndex((p) => p.id === data.id)
    if (index !== -1) {
      Object.assign(searchResult.value.posts[index], data)
    }
  })
})

onUnmounted(() => {
  uni.$off('refreshPromotionPost')
  uni.$off('updatePromotionPostItem')
  if (typeof uni.offKeyboardHeightChange === 'function') {
    uni.offKeyboardHeightChange()
  }
  debouncedHandleRefreshPost?.cancel()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

/* ========== 页面容器 ========== */
.page {
  min-height: 100vh;
  background-color: var(--liberty-cats-page-background-color);
}

/* ========== 自定义导航栏 ========== */
.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 99;
  width: 100%;
  overflow: hidden;

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);
  }

  .navCnt {
    display: flex;
    align-items: center;
    height: 104rpx;
    padding: 0 24rpx;

    .left {
      width: 44rpx;
      height: 44rpx;
      margin-right: 16rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }

    .searchBox {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 44rpx - 16rpx);
      height: 56rpx;
      padding: 6rpx;
      background-color: #ffffff;
      border-radius: 34rpx;
    }

    .searchDivider {
      width: 1rpx;
      height: 28rpx;
      background: rgba(0, 0, 0, 0.12);
    }

    .searchBtn {
      font-size: 28rpx;
      font-weight: 500;
      color: #999;
      white-space: nowrap;
      padding: 0 16rpx;
    }

    .searchInput {
      display: flex;
      align-items: center;
      flex: 1;
      height: 100%;
      margin-left: 24rpx;
    }
  }

  .navBg {
    position: relative;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: var(--liberty-cats-page-background-color);

    .pbl2,
    .pbr2 {
      position: absolute;
      top: 0;
      width: var(--liberty-cats-page-common-border-radius);
      height: var(--liberty-cats-page-common-border-radius);
      overflow: hidden;
      background-color: var(--liberty-cats-primary-color);
      .fbg {
        width: 100%;
        height: 100%;
        background-color: var(--liberty-cats-page-background-color);
      }
    }
    .pbl2 {
      left: 0;
      .fbg {
        border-radius: var(--liberty-cats-page-common-border-radius) 0 0 0;
      }
    }
    .pbr2 {
      right: 0;
      .fbg {
        border-radius: 0 var(--liberty-cats-page-common-border-radius) 0 0;
      }
    }
  }
}

/* ========== 滚动内容区 ========== */
.cntScrollWrap {
  position: relative;
}

.cntScroll {
  width: 100%;
  padding-left: 32rpx;
  padding-right: 32rpx;
  box-sizing: border-box;
}

/* ========== 橙色下拉刷新 ========== */
:deep(.uni-scroll-view-refresh__spinner > circle) {
  color: #ff6b03 !important;
}
:deep(.uni-scroll-view-refresh-inner > svg) {
  fill: #ff6b03 !important;
}

/* ========== 筛选栏 ========== */
.filterSticky {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 98;
  background-color: var(--liberty-cats-page-background-color);
}

.selectedUsersBar {
  padding: 16rpx 32rpx;

  .selectedUsersScroll {
    white-space: nowrap;

    .selectedUserItem {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      width: 110rpx;
      margin-right: 16rpx;
      vertical-align: top;

      .userAvatarWrap {
        position: relative;
        width: 80rpx;
        height: 80rpx;
        margin: 0 auto 15rpx;
        cursor: pointer;

        .userAvatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2rpx solid var(--liberty-cats-primary-color);
        }

        .levelIcon {
          position: absolute;
          right: -4rpx;
          bottom: 4rpx;
          z-index: 1;
          width: 28rpx;
          height: 28rpx;
          pointer-events: none;

          image {
            width: 100%;
            height: 100%;
          }
        }

        .removeIcon {
          position: absolute;
          top: 0;
          right: 0;
          width: 32rpx;
          height: 32rpx;
          background-color: rgba(0, 0, 0, 0.7);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22rpx;
          font-weight: bold;
          line-height: 1;
          z-index: 2;
          backdrop-filter: blur(4rpx);
          box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
          pointer-events: none;

          &::before {
            content: '';
            position: absolute;
            top: -8rpx;
            right: -8rpx;
            bottom: -8rpx;
            left: -8rpx;
            pointer-events: auto;
          }
        }
      }

      .userName {
        font-size: 24rpx;
        color: #666;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
      }
    }
  }
}

.filterBar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;

  .filterItem {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    font-size: 28rpx;
    color: var(--liberty-cats-primary-color);
    border: 1rpx solid var(--liberty-cats-primary-color);
    border-radius: 34rpx;

    .filterLabel {
      max-width: 200rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .filterArrow {
      font-size: 20rpx;
    }
  }
}

/* ========== 时间筛选弹窗内容 ========== */
.filterContent {
  padding: 24rpx 24rpx;

  .timePresetRow {
    display: flex;
    gap: 16rpx;

    .timePresetItem {
      flex: 1;
      padding: 16rpx 0;
      font-size: 28rpx;
      color: #333;
      text-align: center;
      background: #f5f5f5;
      border-radius: 12rpx;

      &.active {
        color: #fff;
        background: var(--liberty-cats-primary-color);
      }
    }
  }

  .customTimeSection {
    margin-top: 32rpx;
    padding-top: 24rpx;
    border-top: 2rpx solid #f0f0f0;

    .sectionTitle {
      font-size: 30rpx;
      font-weight: 500;
      color: #333333;
      margin-bottom: 16rpx;
    }

    .timeRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18rpx 0;

      .timeRowLabel {
        font-size: 28rpx;
        color: #333;
      }
    }

    .timeDivider {
      height: 1rpx;
      background: #f0f0f0;
    }
  }

  .searchMember {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
    width: 100%;

    :deep(.wd-input) {
      flex: 1;
    }

    :deep(.searchMemberBtn) {
      flex-shrink: 0;
    }
  }

  .recentMembers {
    margin-bottom: 24rpx;
    padding-bottom: 24rpx;
    border-bottom: 2rpx solid #f0f0f0;

    .recentTitle {
      font-size: 28rpx;
      font-weight: 500;
      color: #666;
      margin-bottom: 20rpx;
    }

    .recentMemberList {
      display: flex;
      flex-direction: column;
      gap: 12rpx;

      .recentMemberItem {
        display: flex;
        align-items: center;
        gap: 16rpx;
        padding: 16rpx;
        background: #f7f7f7;
        border-radius: 12rpx;
        transition: all 0.2s ease;

        &:active {
          background: #efefef;
          transform: scale(0.98);
        }

        .recentAvatarWrap {
          position: relative;
          width: 64rpx;
          height: 64rpx;
          flex-shrink: 0;

          .recentAvatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }

          .levelIcon {
            position: absolute;
            right: -4rpx;
            bottom: 2rpx;
            z-index: 9;
            width: 26rpx;
            height: 26rpx;

            image {
              width: 100%;
              height: 100%;
            }
          }
        }

        .recentMemberInfo {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6rpx;
          min-width: 0;

          .recentName {
            font-size: 28rpx;
            font-weight: 500;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .recentId {
            font-size: 24rpx;
            color: #999;
          }
        }

        .recentCheck {
          font-size: 32rpx;
          color: var(--liberty-cats-primary-color);
          font-weight: bold;
          width: 48rpx;
          text-align: center;
          flex-shrink: 0;
        }
      }
    }
  }

  .memberList {
    max-height: 600rpx;
    margin-bottom: 24rpx;

    .memberItem {
      display: flex;
      align-items: center;
      gap: 16rpx;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #f0f0f0;

      .memberAvatarWrap {
        position: relative;
        width: 72rpx;
        height: 72rpx;
        flex-shrink: 0;

        .memberAvatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }

        .levelIcon {
          position: absolute;
          right: -4rpx;
          bottom: 4rpx;
          z-index: 9;
          width: 28rpx;
          height: 28rpx;

          image {
            width: 100%;
            height: 100%;
          }
        }
      }

      .memberInfo {
        flex: 1;
        .memberName {
          font-size: 28rpx;
          color: #333;
          margin-right: 12rpx;
        }
        .memberId {
          font-size: 24rpx;
          color: #999;
          margin-top: 4rpx;
        }
      }

      .memberActions {
        display: flex;
        align-items: center;
        gap: 16rpx;
        flex-shrink: 0;

        .followBtn {
          padding: 8rpx 24rpx;
          border-radius: 34rpx;
          font-size: 24rpx;
          white-space: nowrap;

          &.follow {
            background: var(--liberty-cats-primary-color);
            color: #fff;
            border: 1rpx solid var(--liberty-cats-primary-color);
          }
          &.followed {
            background: #fff;
            color: #999;
            border: 1rpx solid #d9d9d9;
          }
          &.mutual {
            background: #fff;
            color: var(--liberty-cats-primary-color);
            border: 1rpx solid var(--liberty-cats-primary-color);
          }
        }

        .memberCheck {
          font-size: 32rpx;
          color: var(--liberty-cats-primary-color);
          width: 48rpx;
          text-align: center;
        }
      }
    }
  }

  .emptyHint {
    padding: 48rpx 0;
    font-size: 28rpx;
    color: #999;
    text-align: center;
    &.noResult {
      font-size: 26rpx;
      font-weight: 500;
      color: #666;
    }
  }

  .filterActions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 24rpx;

    :deep(.cancelBtn) {
      background: #f5f5f5 !important;
      color: #333 !important;
      border: none !important;
    }
  }

  .filterItem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 0;
    font-size: 28rpx;
    color: #333;
    border-bottom: 1rpx solid #f0f0f0;

    .tagCount {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.nameWrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.followBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 20rpx;
  border-radius: 22rpx;
  border: 1rpx solid transparent;
  background-color: #ff6b03;
  color: #fff;
  font-size: 22rpx;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
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
}

.socialItem {
  position: relative;

  .followBtn {
    position: absolute;
    right: 48rpx;
    top: 0;
    align-items: self-start;
    line-height: 42rpx;
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

:deep(.wd-action-sheet__action--disabled) {
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

/* ========== 推广专属样式 ========== */
.adTagsRow {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.adTagChip {
  font-size: 22rpx;
  color: var(--liberty-cats-primary-color);
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
      font-size: 24rpx;
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

/* ========== 空状态 ========== */
.emptyBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-bottom: 200rpx;

  .emptyText {
    font-size: 28rpx;
    color: #999999;
  }
}
.socialBox {
  padding-bottom: 24rpx;
}

/* ========== 用户筛选弹窗样式 ========== */
.userFilterHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #eee;
}
.userFilterTitle {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
}
.userFilterClose {
  padding: 8rpx 16rpx;
}
.closeIcon {
  font-size: 32rpx;
  color: #999;
}
</style>

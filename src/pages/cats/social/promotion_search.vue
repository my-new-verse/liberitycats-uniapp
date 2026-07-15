<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <!-- 自定义导航栏 + 搜索框 -->
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
              placeholder="搜索推广内容"
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

    <!-- 筛选栏 -->
    <view class="filterSticky" :style="{ top: cntPaddingTop + 'rpx' }">
      <view class="filterBar">
        <view class="filterItem" @click="showUserFilter = true">
          <text class="filterLabel">{{ selectedUserLabel || t('social.search.filter.user') }}</text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showTimeFilter = true">
          <text class="filterLabel">{{ selectedTimeLabel || t('social.search.filter.time') }}</text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showAdTypeFilter = true">
          <text class="filterLabel">{{ selectedAdTypeLabel || '类型' }}</text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showTagFilter = true">
          <text class="filterLabel">{{ selectedTagLabel || '标签' }}</text>
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

    <!-- 滚动内容区 -->
    <view class="cntScrollWrap" :style="{ top: scrollViewTop, height: scrollViewHeight }">
      <scroll-view
        class="cntScroll"
        :scroll-y="true"
        refresher-background="transparent"
        :refresher-enabled="true"
        refresher-color="#ff6b03"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
        @refresherrestore="onRefreshRestore"
        @refresherabort="onRefreshAbort"
        @scrolltolower="onScrollToLower"
      >
        <template v-if="!hasSearched">
          <view class="emptyBox">
            <view class="emptyText">输入关键词搜索推广内容</view>
          </view>
        </template>
        <template v-else-if="searchResult.length > 0">
          <view class="promoList socialBox">
            <view class="cell" v-for="item in searchResult" :key="item.id">
              <view class="socialItem">
                <view class="promoTypeTag" :class="'promoType--' + item.ad_type?.id">
                  {{ item.ad_type?.name }}
                </view>
                <view class="promoBody">
                  <view class="avatarBox" @click="toUserHome(item.member_id)">
                    <image
                      class="promoAvatar"
                      :src="getImageUrl(item.member?.avatar + '?x-oss-process=style/jzcq')"
                      mode="aspectFill"
                    />
                    <view class="levelIcon">
                      <image
                        :src="`/static/images/level/${item.member.level}.png`"
                        mode="widthFix"
                      />
                    </view>
                  </view>
                  <view class="promoText">
                    <text class="promoTitle">{{ item.title }}</text>
                    <text class="promoContent text-clamp-1">{{ item.content }}</text>
                  </view>
                </view>
                <view class="promoTags" v-if="item.ad_tags?.length">
                  <text class="promoTag" v-for="tag in item.ad_tags" :key="tag.id">
                    #{{ tag.display_name }}
                  </text>
                </view>
                <view class="socialCntBox">
                  <view class="socialTime">{{ formatRelativeTime(item.create_time) }}</view>
                </view>
                <view class="socialFoot">
                  <view class="socialBtnBox">
                    <view class="socialBtnIcon view"></view>
                    <view class="socialBtn">{{ item.view_count }}</view>
                  </view>
                  <view class="socialBtnBox">
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
                  <view
                    class="socialBtnBox"
                    v-if="item.member_id === userStore.userInfo?.member_id"
                    @click="handleDelPost(item.id)"
                  >
                    <view class="socialBtnIcon del"></view>
                  </view>
                  <view class="socialBtnBox" v-else @click="reportPost(item)">
                    <view class="socialBtnIcon more"></view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>
        <template v-else>
          <view class="emptyBox">
            <view class="emptyText">{{ t('common.no_data') }}</view>
          </view>
        </template>
      </scroll-view>
    </view>

    <!-- 时间筛选弹窗 -->
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

    <!-- 用户筛选弹窗 -->
    <wd-action-sheet
      v-model="showUserFilter"
      :title="t('social.search.filter.user')"
      :z-index="1100"
      @closed="onUserFilterClosed"
    >
      <view class="filterContent">
        <view class="searchMember">
          <wd-input
            v-model="memberKeyword"
            :placeholder="t('social.search.filter.userPlaceholder')"
            clearable
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
        <view class="emptyHint" v-else>{{ t('social.search.filter.userHint') }}</view>
        <view class="filterActions">
          <wd-button custom-class="cancelBtn" size="large" block @click="showUserFilter = false">
            {{ t('common.cancel') }}
          </wd-button>
          <wd-button type="primary" size="large" block @click="confirmUserFilter">
            {{ t('common.confirm') }}
          </wd-button>
        </view>
      </view>
    </wd-action-sheet>

    <!-- 类型筛选 -->
    <wd-action-sheet v-model="showAdTypeFilter" title="类型" :z-index="1100">
      <view class="filterContent">
        <view class="filterItem" @click="selectAdType({ id: 0 })">全部</view>
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

    <!-- 标签筛选 -->
    <wd-action-sheet v-model="showTagFilter" title="标签" :z-index="1100">
      <view class="filterContent">
        <view class="searchMember">
          <wd-input v-model="tagKeyword" placeholder="搜索标签" clearable @confirm="searchTags" />
          <wd-button type="primary" size="small" @click="searchTags" custom-class="searchMemberBtn">
            {{ t('common.search') }}
          </wd-button>
        </view>
        <view class="filterItem" @click="selectTag(0)">全部</view>
        <view class="filterItem" v-for="t in adTags" :key="t.id" @click="selectTag(t.id)">
          <text>{{ t.display_name }}</text>
          <text class="tagCount">{{ t.use_count }}</text>
        </view>
      </view>
    </wd-action-sheet>

    <!-- 操作面板 -->
    <wd-action-sheet
      custom-class="reportSheet"
      v-model="reportShow"
      :actions="reportActions"
      :z-index="1100"
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
import { ref, computed, onMounted, watch } from 'vue'
import { t } from '@/locale/index'
import { formatRelativeTime, getImageUrl, toUrl } from '@/utils'
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
  getPostBanStatusApi,
  banPostApi,
  unbanPostApi,
} from '@/service/api/community'
import { useUserStore } from '@/store/user'
import { useMessage, useToast } from 'wot-design-uni'

const messageBan = useMessage('wd-message-box-ban')
const message = useMessage('wd-message-box-slot')

const userStore = useUserStore()
const toast = useToast()

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

const locale = uni.getLocale()

const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref(0)
const navHeight = ref(0)
const navHeaderPaddingTop = ref(0)
const cntPaddingTop = ref(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)
  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20
})

const navigateBack = () => uni.navigateBack({ delta: 1 })
const toUserHome = (memberId: number) => {
  uni.navigateTo({ url: `/pages/cats/user/home?member_id=${memberId}` })
}

// ========== 用户筛选 ==========
const showUserFilter = ref(false)
const memberKeyword = ref('')
const searchedUsers = ref<any[]>([])
const tempSelectedUserIds = ref<number[]>([])
const tempSelectedUsers = ref<Map<number, any>>(new Map())
const confirmedUserIds = ref<number[]>([])
const confirmedUsers = ref<Map<number, any>>(new Map())
const selectedUserLabel = computed(() => {
  if (confirmedUserIds.value.length === 0) return ''
  return `${confirmedUserIds.value.length}位用户`
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
    const res = await searchMembersApi(memberKeyword.value.trim())
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
  confirmedUserIds.value = [...tempSelectedUserIds.value]
  confirmedUsers.value = new Map(tempSelectedUsers.value)
  tempSelectedUsers.value.forEach((member) => addToRecentMembers(member))
  showUserFilter.value = false
}
const onUserFilterClosed = () => {
  tempSelectedUserIds.value = [...confirmedUserIds.value]
  tempSelectedUsers.value = new Map(confirmedUsers.value)
  searchedUsers.value = []
  memberKeyword.value = ''
}
watch(
  confirmedUserIds,
  () => {
    doSearch(true)
  },
  { deep: true },
)

const getFollowButtonInfo = (user: any) => {
  if (user.is_self) return null
  if (user.is_mutual) return { text: '互相关注', style: 'mutual' }
  if (user.is_followed) return { text: '已关注', style: 'followed' }
  if (user.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
}
const handleFollow = async (user: any) => {
  if (user.is_followed) {
    await deleteFollowApi(user.member_id)
    user.is_followed = false
    user.is_mutual = false
  } else {
    await createFollowApi(user.member_id)
    user.is_followed = true
    if (user.is_following_me) user.is_mutual = true
  }
}

const getLevelValue = (member: any): number | null => {
  if (member?.level_id !== undefined) {
    const num = Number(member.level_id)
    return isNaN(num) || num <= 0 ? null : num
  }
  const level = member?.level
  if (!level) return null
  const levelNum = level.level !== undefined ? level.level : level
  const num = Number(levelNum)
  return isNaN(num) || num <= 0 ? null : num
}
const getLevelIcon = (member: any): string => {
  const levelId = getLevelValue(member)
  if (!levelId) return ''
  return `/static/images/level/${levelId}.png`
}

// 搜索
const searchText = ref('')
const hasSearched = ref(false)
const isLoading = ref(false)
const searchResult = ref<any[]>([])
const currentPage = ref(0)
const lastPage = ref(1)

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
  doSearch(true)
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
  doSearch(true)
}
const selectSort = (name: string) => {
  selectedSortName.value = name
  showSortFilter.value = false
  doSearch(true)
}
const selectTag = (id: number) => {
  selectedTagId.value = id
  showTagFilter.value = false
  doSearch(true)
}

const doSearch = async (refresh = false) => {
  if (isLoading.value) return
  isLoading.value = true
  hasSearched.value = true
  if (refresh) {
    currentPage.value = 0
    lastPage.value = 1
    searchResult.value = []
  }

  try {
    const params: any = {
      page: currentPage.value + 1,
      limit: 20,
      post_category: 'advertisement',
      sort: selectedSortName.value,
    }
    if (searchText.value.trim()) params.keyword = searchText.value.trim()
    if (confirmedUserIds.value.length > 0) params.member_ids = confirmedUserIds.value
    Object.assign(params, getTimeRange())
    if (selectedAdTypeId.value !== 0) params.ad_type_id = selectedAdTypeId.value
    if (selectedTagId.value !== 0) params.tag_id = selectedTagId.value

    const res = await searchPostsApi(params)
    if (res.code === 1 && res.data) {
      if (res.data.page === 1) {
        searchResult.value = res.data.posts
      } else {
        searchResult.value = searchResult.value.concat(res.data.posts)
      }
      currentPage.value = res.data.page
      lastPage.value = Math.ceil(res.data.total / 20)
    }
  } catch (e) {
    console.error('search failed', e)
  } finally {
    isLoading.value = false
  }
}

const search = () => doSearch(true)

// 上拉加载更多
const onScrollToLower = () => {
  if (currentPage.value < lastPage.value) doSearch()
}

// 下拉刷新
const isRefreshing = ref(false)
const onRefresh = () => {
  isRefreshing.value = true
  doSearch(true).finally(() => {
    isRefreshing.value = false
  })
}
// 点赞
const likePost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  likePostApi(id).then((res) => {
    if (res.code === 1) {
      const targetItem = searchResult.value.find((item) => item.id === id)
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
const handleBan = () => {
  banDays.value = 1
  banReason.value = ''
  messageBan
    .confirm({})
    .then(() => confirmBan())
    .catch(() => {})
}
const confirmBan = () => {
  banPostApi(banTargetMemberId.value, banDays.value, banReason.value || undefined).then((res) => {})
}
const handleUnban = () => {
  message
    .confirm({
      title: t('report.admin.unban_post'),
      msg: `t('report.admin.unban_post.confirm', { name: banTargetMemberName.value })`,
    })
    .then(() => {
      unbanPostApi(banTargetMemberId.value).then((res) => {
        if (res.code === 1) uni.showToast({ title: res.msg || '操作成功', icon: 'none' })
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
    return
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
  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    try {
      const statusRes = await getPostBanStatusApi(member.id)
      updateBanAction(statusRes.code === 1 && statusRes.data?.is_banned)
    } catch (e) {
      /* ignore */
    }
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
          searchResult.value = searchResult.value.filter(
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
      adminRemovalApi(reportPostItem.value.id, 'post').then((res) => {
        if (res.data?.status === 0) {
          searchResult.value = searchResult.value.filter((p) => p.id !== reportPostItem.value.id)
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
    }
  }
}

const handleDelPost = (id: number) => {
  message
    .confirm({ msg: t('social.index.del_post_confirm_txt') })
    .then(() => {
      deletePostApi(id).then((res) => {
        if (res.data?.result == 1) {
          searchResult.value = searchResult.value.filter((p) => p.id !== id)
        }
      })
    })
    .catch(() => {})
}

const onRefreshRestore = () => {}
const onRefreshAbort = () => {
  isRefreshing.value = false
}

// 滚动区域定位
const filterStickyHeight = computed(() => (confirmedUserIds.value.length > 0 ? 260 : 110))
const scrollViewTop = computed(() => cntPaddingTop.value + filterStickyHeight.value + 'rpx')
const scrollViewHeight = computed(
  () => `calc(100vh - ${cntPaddingTop.value + filterStickyHeight.value}rpx)`,
)

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
  loadRecentMembers()
  loadHotTags()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

.page {
  min-height: 100vh;
  background-color: var(--liberty-cats-page-background-color);
}

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
      background-color: #fff;
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

.cntScrollWrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.cntScroll {
  width: 100%;
  height: 100%;
  padding-left: 32rpx;
  padding-right: 32rpx;
  box-sizing: border-box;
}

.filterSticky {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 98;
  background-color: var(--liberty-cats-page-background-color);
}

.selectedUsersBar {
  padding: 16rpx 32rpx;
  .selectedUsersScroll {
    white-space: nowrap;
  }
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
      }
      .levelIcon image {
        width: 100%;
        height: 100%;
      }
      .removeIcon {
        position: absolute;
        top: 0;
        right: 0;
        width: 32rpx;
        height: 32rpx;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22rpx;
        font-weight: bold;
        line-height: 1;
        z-index: 2;
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
    flex-shrink: 0;

    .filterLabel {
      max-width: 100rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .filterArrow {
      font-size: 20rpx;
    }
  }
}

.filterContent {
  padding: 24rpx 24rpx;

  .timePresetRow {
    display: flex;
    gap: 16rpx;
  }
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
  .customTimeSection {
    margin-top: 32rpx;
    padding-top: 24rpx;
    border-top: 2rpx solid #f0f0f0;
  }
  .sectionTitle {
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 16rpx;
  }
  .timeRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18rpx 0;
  }
  .timeRowLabel {
    font-size: 28rpx;
    color: #333;
  }
  .timeDivider {
    height: 1rpx;
    background: #f0f0f0;
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
    }
    .recentMemberItem {
      display: flex;
      align-items: center;
      gap: 16rpx;
      padding: 16rpx;
      background: #f7f7f7;
      border-radius: 12rpx;
      &:active {
        background: #efefef;
        transform: scale(0.98);
      }
      .recentAvatarWrap {
        position: relative;
        width: 64rpx;
        height: 64rpx;
        flex-shrink: 0;
      }
      .recentAvatar {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
      .recentAvatarWrap .levelIcon {
        position: absolute;
        right: -4rpx;
        bottom: 2rpx;
        z-index: 9;
        width: 26rpx;
        height: 26rpx;
      }
      .recentAvatarWrap .levelIcon image {
        width: 100%;
        height: 100%;
      }
      .recentMemberInfo {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6rpx;
        min-width: 0;
      }
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

  .memberList {
    max-height: 600rpx;
    margin-bottom: 24rpx;
  }
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
    }
    .memberAvatar {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
    .memberAvatarWrap .levelIcon {
      position: absolute;
      right: -4rpx;
      bottom: 4rpx;
      z-index: 9;
      width: 28rpx;
      height: 28rpx;
    }
    .memberAvatarWrap .levelIcon image {
      width: 100%;
      height: 100%;
    }
    .memberInfo {
      flex: 1;
    }
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
    .memberActions {
      display: flex;
      align-items: center;
      gap: 16rpx;
      flex-shrink: 0;
    }
    .memberActions .followBtn {
      padding: 8rpx 24rpx;
      border-radius: 34rpx;
      font-size: 24rpx;
      white-space: nowrap;
    }
    .memberActions .followBtn.follow {
      background: var(--liberty-cats-primary-color);
      color: #fff;
      border: 1rpx solid var(--liberty-cats-primary-color);
    }
    .memberActions .followBtn.followed {
      background: #fff;
      color: #999;
      border: 1rpx solid #d9d9d9;
    }
    .memberActions .followBtn.mutual {
      background: #fff;
      color: var(--liberty-cats-primary-color);
      border: 1rpx solid var(--liberty-cats-primary-color);
    }
    .memberCheck {
      font-size: 32rpx;
      color: var(--liberty-cats-primary-color);
      width: 48rpx;
      text-align: center;
    }
  }

  .emptyHint {
    padding: 48rpx 0;
    font-size: 28rpx;
    color: #999;
    text-align: center;
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

.emptyBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-bottom: 200rpx;
  .emptyText {
    font-size: 28rpx;
    color: #999;
  }
}

.promoList {
  margin-top: 24rpx;
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

.socialBtnIcon.more {
  background-image: url('@/static/images/more.png');
}

.socialBtnIcon.del {
  background-image: url('@/static/images/trush@2x.png');
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

.promoTypeTag {
  display: inline-block;
  padding: 1rpx 12rpx;
  font-size: 22rpx;
  line-height: 32rpx;
  text-align: center;
  background: transparent;
  border: 1rpx solid;
  border-radius: 16rpx;
  margin-bottom: 16rpx;

  &.promoType--1 {
    color: #2979ff;
    border-color: #2979ff;
  }
  &.promoType--4 {
    color: #22c55e;
    border-color: #22c55e;
  }
  &.promoType--3 {
    color: #7c4dff;
    border-color: #7c4dff;
  }
  &.promoType--2,
  &.promoType--5 {
    color: #ffb020;
    border-color: #ffb020;
  }
}

.promoBody {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;

  .avatarBox {
    position: relative;
    width: 64rpx;
    height: 64rpx;
    flex-shrink: 0;
  }

  .promoAvatar {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .promoText {
    flex: 1;
    min-width: 0;

    .promoTitle {
      display: block;
      font-size: 30rpx;
      font-weight: 600;
      color: #1d1d1f;
      line-height: 40rpx;
      margin-bottom: 8rpx;
    }

    .promoContent {
      display: block;
      font-size: 26rpx;
      color: #333;
      line-height: 36rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.promoTags {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;

  .promoTag {
    font-size: 22rpx;
    color: #2979ff;
    margin-right: 16rpx;
  }
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
</style>

<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
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
              :placeholder="t('group_chat.history.search.placeholder')"
              :no-border="true"
              custom-class="searchInput"
              confirm-type="search"
              @confirm="handleSearchClick"
            />
            <view class="searchDivider"></view>
            <text class="searchBtn" @click="handleSearchClick">{{ t('common.search') }}</text>
          </view>
        </view>
      </view>
      <!-- <view class="navBg">
        <view class="pbl2"><view class="fbg"></view></view>
        <view class="pbr2"><view class="fbg"></view></view>
      </view> -->
    </view>

    <view class="cnt" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <!-- ========== 筛选栏：用户 + 时间 ========== -->
      <view class="filterSticky" :style="{ top: cntPaddingTop + 'rpx' }">
        <!-- ========== 类型切换 Tabs：消息 / 图片 ========== -->
        <view class="typeTabsWrap">
          <wd-tabs v-model="activeTab" custom-class="typeTabs" @change="onTabChange">
            <wd-tab :title="t('social.search.tab.all')" name="all" />
            <wd-tab :title="t('social.search.tab.message')" name="message" />
            <wd-tab :title="t('social.search.tab.image')" name="image" />
          </wd-tabs>
        </view>
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
        </view>

        <view class="selectedUsersBar" v-if="confirmedUserIds.length > 0">
          <scroll-view scroll-x class="selectedUsersScroll">
            <view class="selectedUserItem" v-for="uid in confirmedUserIds" :key="uid">
              <view class="userAvatarWrap" @click="removeSelectedUser(uid)">
                <image
                  class="userAvatar"
                  :src="getCachedAvatar(uid, selectedUsersCache.get(uid)?.avatar)"
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

      <view :style="{ height: filterStickyHeight + 28 + 'rpx' }"></view>

      <!-- ========== 搜索状态：初始提示 / 结果列表（暂无数据） ========== -->
      <template v-if="!hasSearched">
        <view class="emptyBox">
          <view class="emptyText">{{ t('group_chat.history.search.empty_hint') }}</view>
        </view>
      </template>
      <template v-else>
        <template v-for="tab in tabNames" :key="tab">
          <!-- 加载中：首次查询未完成时 -->
          <view
            class="emptyBox"
            v-show="activeTab === tab"
            v-if="isLoading && !isTabInitialized(tab)"
          >
            <wd-loadmore state="loading" />
          </view>
          <!-- 消息列表 -->
          <view
            class="messageList"
            v-show="activeTab === tab"
            v-if="getTabMessages(tab).length > 0"
          >
            <view
              class="messageItem"
              v-for="msg in getTabMessages(tab)"
              :key="msg.id"
              @click="handleMessageClick(msg)"
            >
              <!-- 头像 + 等级徽章 -->
              <view class="avatarBox">
                <view
                  class="u-avatar"
                  :style="getAvatarStyle(msg.sender?.avatar || '', 'chat')"
                ></view>
                <view class="levelIcon">
                  <view
                    v-if="getLevelBadgeStyle(msg.sender?.level?.level)"
                    class="levelBadge"
                    :style="getLevelBadgeStyle(msg.sender?.level?.level)"
                  ></view>
                </view>
              </view>
              <!-- 右侧内容区 -->
              <view class="msgContent">
                <view class="msgHeader">
                  <text class="msgNickname">{{ msg.sender?.nickname }}</text>
                  <text class="msgTime">{{ formatRelativeTime(msg.create_time) }}</text>
                </view>
                <!-- 图片消息 -->
                <wd-img
                  v-if="msg.message_type === 'image'"
                  custom-class="chat-img-custom"
                  mode="aspectFill"
                  :width="`${getImageMessageBoxSize(msg).width}px`"
                  :height="`${getImageMessageBoxSize(msg).height}px`"
                  :src="getImageUrl(msg.payload?.thumb_url || msg.payload?.url || '')"
                  :enable-preview="false"
                  radius="24rpx"
                />
                <!-- 表情消息 -->
                <wd-img
                  v-else-if="msg.message_type === 'emotion'"
                  custom-class="chat-img-custom"
                  mode="aspectFill"
                  width="140rpx"
                  height="140rpx"
                  :src="
                    getImageUrl(
                      msg.payload?.emotion_url || getEmotionIconPath(msg.payload?.emotion_id),
                    )
                  "
                />
                <!-- 文本消息 -->
                <view class="msgText" v-else>
                  <text
                    v-for="(seg, i) in highlightKeyword(msg.payload?.text || '', searchText.trim())"
                    :key="i"
                    :style="seg.isMatch ? { color: '#ff6b03' } : {}"
                  >
                    {{ seg.text }}
                  </text>
                </view>
              </view>
            </view>
          </view>
          <wd-loadmore
            v-show="activeTab === tab"
            v-if="getTabMessages(tab).length > 0"
            :state="getTabLoadMoreState(tab)"
            style="padding-bottom: 10rpx"
          />
          <!-- 空状态 -->
          <view
            class="emptyBox"
            v-show="activeTab === tab"
            v-if="isTabInitialized(tab) && getTabMessages(tab).length === 0"
          >
            <view class="emptyText">{{ t('common.no_data') }}</view>
          </view>
        </template>
      </template>
    </view>

    <!-- ========== 时间筛选弹窗 ========== -->
    <wd-action-sheet
      v-model="showTimeFilter"
      :title="t('social.search.filter.time')"
      :z-index="1100"
      @closed="onTimeFilterClosed"
    >
      <view class="filterContent">
        <!-- 预设时间范围：横向排列 -->
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
        <!-- 自定义时间范围：标题 + 起止两行 -->
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
    <MentionMemberPopup
      :visible="showUserFilter"
      :room-id="roomId"
      :keyword="''"
      :selected-ids="confirmedUserIds"
      :title-text="t('social.search.filter.user')"
      :done-text="t('common.confirm')"
      :search-placeholder-text="t('social.search.filter.userPlaceholder')"
      :loading-text="t('group.chat.mention.loading')"
      recommend-mode="history"
      @update:visible="showUserFilter = $event"
      @confirm="handleUserFilterConfirm"
    />
  </view>
</template>

<script lang="ts" setup>
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { t } from '@/locale/index'
import { toUrl, formatRelativeTime, getImageUrl } from '@/utils'
import { getEmotionIconPath } from '@/utils/emotionTool'
import {
  getAvatarStyle,
  getLevelBadgeStyle,
  getCachedMemberAvatar,
  cacheMemberAvatars,
  getCachedLevelBadgeUrl,
} from '@/utils/avatarCache'
import { searchChatMessagesApi, type ChatMember } from '@/service/api/groupChat'
import MentionMemberPopup from '@/components/chat-input-bar/MentionMemberPopup.vue'

// ============================================================
// 导航栏布局
// ============================================================
const locale = uni.getLocale()

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
  navHeight.value = safeTopRpx.value + 20 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

/** 点击消息：直接跳转群聊页，由群聊页调用 context 接口加载上下文 */
const handleMessageClick = (msg: any) => {
  if (!roomId.value || !msg.id) return
  toUrl(
    `/pages/cats/social/group_chat_new?room_id=${roomId.value}&code=${roomCode.value}&message_id=${msg.id}&from_context=1`,
    true,
    false,
  )
}

/** 高亮关键词：返回分段数组 */
const highlightKeyword = (text: string, keyword: string) => {
  if (!text || !keyword) return [{ text: text || '', isMatch: false }]
  const segments: { text: string; isMatch: boolean }[] = []
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  let lastIndex = 0
  let matchIndex = lowerText.indexOf(lowerKeyword)
  while (matchIndex !== -1) {
    if (matchIndex > lastIndex) {
      segments.push({ text: text.slice(lastIndex, matchIndex), isMatch: false })
    }
    segments.push({ text: text.slice(matchIndex, matchIndex + keyword.length), isMatch: true })
    lastIndex = matchIndex + keyword.length
    matchIndex = lowerText.indexOf(lowerKeyword, lastIndex)
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), isMatch: false })
  }
  return segments
}

// ============================================================
// 页面参数
// ============================================================
const roomCode = ref('')
const roomId = ref<number>(0)

onLoad((options) => {
  if (options?.room_id) {
    roomId.value = Number(options.room_id)
  }
  if (options?.code) {
    roomCode.value = options.code
  }
})

// ============================================================
// 搜索
// ============================================================
const searchText = ref('')
/** 是否已执行过搜索，控制初始提示 / 搜索结果切换 */
const hasSearched = ref(false)
const isLoading = ref(false)

/** 搜索结果 */
const searchResult = ref<{
  messages: any[]
  total: number
  page: number
  limit: number
}>({
  messages: [],
  total: 0,
  page: 0,
  limit: 20,
})

/** 每个 Tab 的数据缓存 */
type TabCache = {
  data: { messages: any[]; total: number; page: number; limit: number }
  /** 查询时的参数签名（keyword + memberIds + timeRange，不含 content_type） */
  paramsSignature: string
  hasInitialized: boolean
}

const createTabCache = (): TabCache => ({
  data: { messages: [], total: 0, page: 0, limit: 20 },
  paramsSignature: '',
  hasInitialized: false,
})

const tabCacheMap = ref<Record<string, TabCache>>({
  all: createTabCache(),
  message: createTabCache(),
  image: createTabCache(),
})

/** 获取当前查询条件签名（不含 content_type，因为 content_type 由 tab 决定） */
const getParamsSignature = () => {
  const keyword = searchText.value.trim()
  const memberIds = confirmedUserIds.value.join(',')
  const timeRange = getTimeRange()
  return `${keyword}|${memberIds}|${timeRange.start_time || ''}|${timeRange.end_time || ''}`
}

/** 检查指定 tab 的缓存是否有效 */
const isTabCacheValid = (tabName: string) => {
  const cache = tabCacheMap.value[tabName]
  return cache.hasInitialized && cache.paramsSignature === getParamsSignature()
}

/** 从缓存恢复数据到 searchResult */
const restoreTabCache = (tabName: string) => {
  const cache = tabCacheMap.value[tabName]
  searchResult.value = {
    messages: [...cache.data.messages],
    total: cache.data.total,
    page: cache.data.page,
    limit: cache.data.limit,
  }
}

/** 保存当前 searchResult 到指定 tab 的缓存 */
const saveTabCache = (tabName: string) => {
  const cache = tabCacheMap.value[tabName]
  cache.data = {
    messages: [...searchResult.value.messages],
    total: searchResult.value.total,
    page: searchResult.value.page,
    limit: searchResult.value.limit,
  }
  cache.paramsSignature = getParamsSignature()
  cache.hasInitialized = true
}

/** 清空所有 Tab 缓存 */
const clearAllTabCaches = () => {
  tabCacheMap.value.all = createTabCache()
  tabCacheMap.value.message = createTabCache()
  tabCacheMap.value.image = createTabCache()
  searchResult.value = { messages: [], total: 0, page: 0, limit: 20 }
  // 重置各 Tab 滚动位置
  tabScrollTopMap.value = { all: 0, message: 0, image: 0 }
  // 滚动到顶部
  nextTick(() => {
    uni.pageScrollTo({ scrollTop: 0, duration: 0 })
  })
}

/** 清空所有数据并重置搜索状态 */
const clearAllData = () => {
  clearAllTabCaches()
  hasSearched.value = false
}

/** Tab 名称列表 */
const tabNames = ['all', 'message', 'image'] as const

/** 获取指定 tab 的消息列表 */
const getTabMessages = (tab: string) => {
  return tabCacheMap.value[tab]?.data?.messages || []
}

/** 获取指定 tab 的加载更多状态 */
const getTabLoadMoreState = (tab: string): LoadMoreState => {
  const cache = tabCacheMap.value[tab]
  if (!cache.hasInitialized) return 'loading'
  const isNoMore = cache.data.total > 0 && cache.data.page * cache.data.limit >= cache.data.total
  if (isNoMore) return 'finished'
  if (isLoading.value && activeTab.value === tab) return 'loading'
  return 'success'
}

/** 检查指定 tab 是否已初始化 */
const isTabInitialized = (tab: string) => {
  return tabCacheMap.value[tab]?.hasInitialized ?? false
}

/** 构建搜索参数 */
const buildSearchParams = (page: number) => {
  const params: any = { room_id: roomId.value, page, limit: 20 }

  // 根据 Tab 设置 content_type
  if (activeTab.value === 'message') {
    params.content_type = 'text'
  } else if (activeTab.value === 'image') {
    params.content_type = 'media'
  }
  // all 不传 content_type

  const keyword = searchText.value.trim()
  if (keyword) params.keyword = keyword

  if (confirmedUserIds.value.length > 0) {
    params.member_ids = confirmedUserIds.value
  }

  const timeRange = getTimeRange()
  if (timeRange.start_time) params.start_time = timeRange.start_time
  if (timeRange.end_time) params.end_time = timeRange.end_time

  return params
}

/** 点击搜索按钮：校验后清空缓存并搜索 */
const handleSearchClick = () => {
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  const timeRange = getTimeRange()
  const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)
  if (!hasKeyword && !hasUser && !hasTimeFilter) {
    uni.showToast({ title: t('social.search.requireKeywordOrUser'), icon: 'none' })
    return
  }
  clearAllTabCaches()
  search()
}

const search = async () => {
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  const timeRange = getTimeRange()
  const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)
  if (!hasKeyword && !hasUser && !hasTimeFilter) {
    uni.showToast({ title: t('social.search.requireKeywordOrUser'), icon: 'none' })
    return
  }

  console.log('search', buildSearchParams(1))
  if (isLoading.value) return
  isLoading.value = true
  hasSearched.value = true

  try {
    const res = await searchChatMessagesApi(buildSearchParams(1))
    if (res.code === 1 && res.data) {
      searchResult.value = res.data
      saveTabCache(activeTab.value)
    }
  } catch (e) {
    console.error('search failed', e)
  } finally {
    isLoading.value = false
  }
}

const loadMore = async () => {
  if (isLoading.value) return
  if (searchResult.value.page * searchResult.value.limit >= searchResult.value.total) return
  isLoading.value = true
  try {
    const res = await searchChatMessagesApi(buildSearchParams(searchResult.value.page + 1))
    if (res.code === 1 && res.data) {
      searchResult.value.messages = searchResult.value.messages.concat(res.data.messages)
      searchResult.value.page = res.data.page
      saveTabCache(activeTab.value)
    }
  } catch (e) {
    console.error('loadMore failed', e)
  } finally {
    isLoading.value = false
  }
}

/** 触底加载更多 */
onReachBottom(() => {
  if (searchResult.value.page * searchResult.value.limit < searchResult.value.total) {
    loadMore()
  }
})

/** 下拉刷新 */
onPullDownRefresh(async () => {
  try {
    if (hasSearched.value) {
      const res = await searchChatMessagesApi(buildSearchParams(1))
      if (res.code === 1 && res.data) {
        searchResult.value = res.data
        saveTabCache(activeTab.value)
      }
    }
  } catch (e) {
    console.error('pullDownRefresh failed', e)
  } finally {
    setTimeout(() => {
      uni.stopPullDownRefresh()
    }, 500)
  }
})

// ============================================================
// 时间筛选
// ============================================================
const showTimeFilter = ref(false)
/** 预设时间范围：''=全部 / 'today' / 'week' / 'month' */
const selectedTimeRange = ref('')
/** 自定义开始时间（时间戳 ms） */
const customStartTime = ref<number>(0)
/** 自定义结束时间（时间戳 ms） */
const customEndTime = ref<number>(0)
const showStartCalendar = ref(false)
const showEndCalendar = ref(false)

/** 预设时间选项 */
const timeRanges = computed(() => [
  { label: t('social.search.filter.time.all'), value: '' },
  { label: t('social.search.filter.time.today'), value: 'today' },
  { label: t('social.search.filter.time.week'), value: 'week' },
  { label: t('social.search.filter.time.month'), value: 'month' },
])

/** 时间戳 → 展示文本 "M/D" */
const formatDateStr = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 时间戳 → 日期字符串 "YYYY-MM-DD" */
const toDateStr = (ts: number) => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 监听自定义日期变化，自动匹配预设按钮 */
watch([customStartTime, customEndTime], ([s, e]) => {
  if (!s && !e) return
  const day = 86400000
  const today = toDateStr(Date.now())
  const weekAgo = toDateStr(getTodayStart() - 7 * day)
  const monthAgo = toDateStr(getTodayStart() - 30 * day)
  const sDate = toDateStr(s)
  const eDate = toDateStr(e)

  if (sDate === today && eDate === today) {
    selectedTimeRange.value = 'today'
  } else if (sDate === weekAgo && eDate === today) {
    selectedTimeRange.value = 'week'
  } else if (sDate === monthAgo && eDate === today) {
    selectedTimeRange.value = 'month'
  } else {
    selectedTimeRange.value = ''
  }
})
const confirmedTimeRange = ref('')
const confirmedStartTime = ref<number>(0)
const confirmedEndTime = ref<number>(0)

/** 筛选栏按钮上展示的时间标签：基于确认后的值 */
const selectedTimeLabel = computed(() => {
  if (confirmedStartTime.value || confirmedEndTime.value) {
    const s = confirmedStartTime.value ? formatDateStr(confirmedStartTime.value) : ''
    const e = confirmedEndTime.value ? formatDateStr(confirmedEndTime.value) : ''
    if (s && e) return `${s} ~ ${e}`
    if (s) return `${s} 起`
    if (e) return `至 ${e}`
  }
  if (!confirmedTimeRange.value) return ''
  const range = timeRanges.value.find((r) => r.value === confirmedTimeRange.value)
  return range ? range.label : ''
})

/** 今天的开始时间戳 */
const getTodayStart = () => new Date(new Date().toDateString()).getTime()

/** 点击预设范围：应用预设，回填自定义日期 */
const selectTimeRange = (range: { label: string; value: string }) => {
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

/** 弹窗关闭动画完成后，恢复临时值为确认态 */
const onTimeFilterClosed = () => {
  selectedTimeRange.value = confirmedTimeRange.value
  customStartTime.value = confirmedStartTime.value
  customEndTime.value = confirmedEndTime.value
}

/** 确认时间筛选：同步到确认态，关闭弹窗 */
const confirmTimeFilter = () => {
  confirmedTimeRange.value = selectedTimeRange.value
  confirmedStartTime.value = customStartTime.value
  confirmedEndTime.value = customEndTime.value
  console.log(
    'confirmTimeFilter',
    confirmedTimeRange.value,
    confirmedStartTime.value,
    confirmedEndTime.value,
  )
  showTimeFilter.value = false
  // 有任意筛选条件即触发搜索
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  const timeRange = getTimeRange()
  const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)
  if (hasKeyword || hasUser || hasTimeFilter) {
    hasSearched.value = true
    clearAllTabCaches()
    search()
  } else {
    hasSearched.value = false
    clearAllData()
  }
}

/** 将确认后的筛选状态转为接口参数（start_time / end_time，单位秒） */
const getTimeRange = () => {
  // 自定义时间优先
  if (confirmedStartTime.value || confirmedEndTime.value) {
    const result: any = {}
    if (confirmedStartTime.value) result.start_time = Math.floor(confirmedStartTime.value / 1000)
    if (confirmedEndTime.value)
      result.end_time = Math.floor(confirmedEndTime.value / 1000) + 86400 - 1
    return result
  }

  if (!confirmedTimeRange.value) return {}

  const now = Math.floor(Date.now() / 1000)
  const day = 86400

  switch (confirmedTimeRange.value) {
    case 'today':
      return { start_time: now - day, end_time: now }
    case 'week':
      return { start_time: now - 7 * day, end_time: now }
    case 'month':
      return { start_time: now - 30 * day, end_time: now }
    default:
      return {}
  }
}

// ============================================================
// 用户筛选
// ============================================================
const showUserFilter = ref(false)
/** 确认后的用户 ID */
const confirmedUserIds = ref<number[]>([])
/** 确认后的用户信息缓存 */
const confirmedUsers = ref<Map<number, any>>(new Map())

/** 已选用户的完整信息缓存（跨搜索保留头像/昵称） */
const selectedUsersCache = computed(() => {
  const map = new Map<number, any>()
  for (const uid of confirmedUserIds.value) {
    const cached = confirmedUsers.value.get(uid)
    if (cached) {
      map.set(uid, cached)
    }
  }
  return map
})

/** 当前选中的 Tab（all / message / image） */
const activeTab = ref('all')

/** 记录每个 Tab 的滚动位置 */
const tabScrollTopMap = ref<Record<string, number>>({
  all: 0,
  message: 0,
  image: 0,
})

/** 当前页面滚动位置 */
const currentPageScrollTop = ref(0)
onPageScroll((e) => {
  currentPageScrollTop.value = e.scrollTop
})

const onTabChange = async ({ name }: { name: string }) => {
  // 保存当前 Tab 的滚动位置
  tabScrollTopMap.value[activeTab.value] = currentPageScrollTop.value
  activeTab.value = name
  if (hasSearched.value) {
    if (isTabCacheValid(name)) {
      // 缓存有效，直接恢复数据，不调用接口
      restoreTabCache(name)
    } else {
      // 缓存无效，重新查询
      await search()
    }
  }
  // 恢复目标 Tab 的滚动位置
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: tabScrollTopMap.value[name] || 0,
      duration: 0,
    })
  })
}

/** sticky 筛选栏占位高度（nav底部到内容区的间距） */
const filterStickyHeight = computed(() => {
  const tabsHeight = 80 // typeTabs 高度
  const filterBarHeight = confirmedUserIds.value.length > 0 ? 260 : 110
  return tabsHeight + filterBarHeight
})

/** 筛选栏用户按钮标签 */
const selectedUserLabel = computed(() => {
  if (confirmedUserIds.value.length === 0) return ''
  return t('social.search.confirmed_users', { count: confirmedUserIds.value.length })
})

/** 移除已选用户 */
const removeSelectedUser = (memberId: number) => {
  confirmedUserIds.value = confirmedUserIds.value.filter((id) => id !== memberId)
  confirmedUsers.value.delete(memberId)
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  if (hasKeyword || hasUser) {
    clearAllTabCaches()
    search()
  } else {
    clearAllData()
  }
}

// ============================================================
// Level 等级处理工具函数
// ============================================================
/** 获取 level_id 的值（优先使用 level_id，兼容旧的 level 字段） */
const getLevelValue = (member: any): number | null => {
  if (member?.level_id !== undefined) {
    const num = Number(member.level_id)
    return isNaN(num) || num <= 0 ? null : num
  }
  if (member?.level !== undefined && member?.level !== null) {
    const levelNum =
      typeof member.level === 'object' ? (member.level?.level_id ?? member.level?.id) : member.level
    const num = Number(levelNum)
    return isNaN(num) || num <= 0 ? null : num
  }
  return null
}

/** 获取 level 图标路径（使用缓存） */
const getLevelIcon = (member: any): string => {
  const levelId = getLevelValue(member)
  return getCachedLevelBadgeUrl(levelId)
}

/** 获取缓存后的头像 URL（基于 member_id） */
const getCachedAvatar = (memberId: number | undefined, source: string) =>
  getCachedMemberAvatar(memberId, source, 'member')

/** MentionMemberPopup 确认选择：更新已选用户并自动触发搜索 */
const handleUserFilterConfirm = (members: ChatMember[]) => {
  confirmedUserIds.value = members.map((m) => m.member_id)
  const map = new Map<number, any>()
  members.forEach((m) => {
    map.set(m.member_id, m)
  })
  confirmedUsers.value = map
  // 缓存头像和 level 资源
  cacheMemberAvatars(members)
  showUserFilter.value = false
  // 筛选条件变化，清空缓存并重新搜索
  clearAllTabCaches()
  search()
}

/** 根据原始图片尺寸计算显示大小（参考 chat-item.vue） */
const getImageMessageBoxSize = (msg: any) => {
  const maxWidth = Math.min(Math.round(uni.getSystemInfoSync().windowWidth * 0.52), 220)
  const minWidth = 120
  const rawWidth = Number(msg.payload?.width || 0)
  const rawHeight = Number(msg.payload?.height || 0)
  if (!rawWidth || !rawHeight) {
    return { width: maxWidth, height: maxWidth }
  }
  const widthRatio = maxWidth / rawWidth
  const scaledWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(rawWidth * widthRatio)))
  const scaledHeight = Math.max(90, Math.round(rawHeight * (scaledWidth / rawWidth)))
  return { width: scaledWidth, height: scaledHeight }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

/* ========== 页面容器 ========== */
.page {
  min-height: 100vh;
  background-color: var(--liberty-cats-page-background-color);

  :deep(*) {
    font-family: Alibaba PuHuiTi2 !important;
  }
  /* 恢复 wd-icon 图标字体，避免 :deep(*) 覆盖导致图标不显示 */
  :deep(.wd-icon) {
    font-family: 'wd-icons' !important;
  }
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
      background-color: var(--bg-card);
      border-radius: 34rpx;
    }

    .searchDivider {
      width: 1rpx;
      height: 28rpx;
      background: var(--black-12);
    }

    .searchBtn {
      font-size: calc(28rpx * var(--font-scale));
      font-weight: 500;
      color: var(--text-secondary);
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
}

/* ========== 内容区 ========== */
.cnt {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-left: 32rpx !important;
  padding-right: 32rpx !important;
}

/* ========== 筛选栏 ========== */
.typeTabsWrap {
  background-color: var(--liberty-cats-page-background-color);
  padding: 0 32rpx;
  width: 55%;
  :deep(.typeTabs) {
    background-color: var(--liberty-cats-page-background-color);
    .wd-tabs__nav {
      position: relative;
      background: transparent;
    }

    .wd-tabs__nav-item {
      font-size: calc(28rpx * var(--font-scale));
      color: var(--text-secondary);

      &.is-active .wd-tabs__nav-item-text {
        color: var(--liberty-cats-primary-color);
        font-weight: 600;
      }
    }

    .wd-tabs__line {
      background: var(--liberty-cats-primary-color);
    }
  }
}

.filterSticky {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9;
  background-color: var(--liberty-cats-page-background-color);
  box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
}

.selectedUsersBar {
  padding: 16rpx 32rpx;
  //   border-bottom: 1rpx solid #f0f0f0;

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
          background-color: var(--black-70);
          color: var(--bg-card);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: calc(22rpx * var(--font-scale));
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
        font-size: calc(24rpx * var(--font-scale));
        color: var(--wot-message-box-content-color);
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
    font-size: calc(28rpx * var(--font-scale));
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
      font-size: calc(20rpx * var(--font-scale));
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
      font-size: calc(28rpx * var(--font-scale));
      color: var(--actions-text);
      text-align: center;
      background: var(--wot-action-sheet-active-color);
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
    border-top: 2rpx solid var(--divider-color);

    .sectionTitle {
      font-size: calc(30rpx * var(--font-scale));
      font-weight: 500;
      color: var(--actions-text);
      margin-bottom: 16rpx;
    }

    .timeRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18rpx 0;

      .timeRowLabel {
        font-size: calc(28rpx * var(--font-scale));
        color: var(--actions-text);
      }
    }

    .timeDivider {
      height: 1rpx;
      background: var(--divider-color);
    }
  }

  .filterActions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 24rpx;

    :deep(.cancelBtn) {
      background: var(--wot-action-sheet-active-color) !important;
      color: var(--actions-text) !important;
      border: none !important;
    }
  }
}

/* ========== 搜索结果消息列表 ========== */
.messageList {
  padding: 0;

  .messageItem {
    display: flex;
    align-items: flex-start;
    gap: 20rpx;
    padding: 24rpx 0;
    border-bottom: 1rpx solid var(--divider-color);
    width: 100%;
    border-radius: 0;
    margin-bottom: 0;
    background-color: inherit;

    &:active {
      background-color: var(--wot-action-sheet-active-color);
    }

    .avatarBox {
      position: relative;
      width: 88rpx;
      height: 88rpx;
      flex-shrink: 0;

      .u-avatar {
        width: 88rpx;
        height: 88rpx;
        overflow: hidden;
        border-radius: 50%;
        background-color: var(--userFilterHeader-border-color);
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
      }

      .levelIcon {
        position: absolute;
        right: -4rpx;
        bottom: 6rpx;
        width: 28rpx;
        height: 28rpx;

        .levelBadge {
          width: 100%;
          height: 100%;
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
        }
      }
    }

    .msgContent {
      flex: 1;
      min-width: 0;

      .msgHeader {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 18rpx;

        .msgNickname {
          font-size: calc(28rpx * var(--font-scale));
          font-weight: 600;
          color: var(--actions-text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 400rpx;
        }

        .msgTime {
          font-size: calc(28rpx * var(--font-scale));
          color: var(--text-secondary);
          flex-shrink: 0;
          margin-left: 16rpx;
        }
      }

      .msgText {
        font-size: calc(28rpx * var(--font-scale));
        color: var(--wot-message-box-content-color);
        line-height: 1.5;
        word-break: break-all;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      :deep(.chat-img-custom) {
        display: block;
        border-radius: 16rpx;
        // box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
      }
    }
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
    font-size: calc(28rpx * var(--font-scale));
    color: #999999;
  }
}
</style>

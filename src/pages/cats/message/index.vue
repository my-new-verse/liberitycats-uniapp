<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    enablePullDownRefresh: true,
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
  <view
    :class="activeCategory === 'community' ? 'community-cnt' : ''"
    :style="{ '--message-nav-height': navHeight + 'rpx' }"
  >
    <wd-tabs
      v-model="activeCategory"
      @click="handleCategoryChange"
      :line-width="20"
      :style="{ paddingTop: navHeight + 'rpx' }"
      custom-class="custom-tab"
    >
      <wd-tab
        v-for="item in categoryList"
        :key="item.value"
        :title="`${item.label}`"
        :name="item.value"
        :badge-props="item.badgeProps"
      ></wd-tab>
    </wd-tabs>
    <custom-nav :title="t('notification.index.page_title')">
      <template #right>
        <view class="read_all" @click="handleReadAll">
          {{ $t('notification.index.make_all_read') }}
        </view>
      </template>
      <template #default>
        <view class="tab-wrapper" v-if="activeCategory === 'community'">
          <wd-segmented
            :options="subtypeList"
            v-model:value="activeSubtype"
            custom-class="custom-segment"
            @click="handleSubtypeChange"
          >
            <template #label="{ option }">
              <view class="tab-item">
                <!-- <view class="tab-icon-wrapper"> -->
                <!-- 图标容器 -->
                <wd-badge
                  :modelValue="unreadByCategory.subtypes?.community[option.value]"
                  bg-color="#ff6b03"
                  :max="99"
                >
                  <view class="tab-icon" :class="option.iconBgClass">
                    <wd-img custom-class="tab-icon-svg" mode="widthFix" :src="option.iconSrc" />
                  </view>
                </wd-badge>
                <view
                  class="tab-text"
                  :class="{ active: activeSubtype === option.value && !isShowingAll }"
                >
                  {{ option.label }}
                </view>
              </view>
            </template>
          </wd-segmented>
        </view>
        <view
          v-show="listData.data?.length > 0"
          :class="activeCategory === 'community' ? 'com-socialBox' : ''"
        >
          <template v-for="(item, index) in listData.data" :key="item.id">
            <!-- 社区消息时间分组标题 -->
            <view
              v-if="item.category === 'community' && groupHeaderMap.get(index)"
              class="time-header"
            >
              <text v-if="groupHeaderMap.get(index).label">
                {{ groupHeaderMap.get(index).label }}
              </text>
              <!-- <text v-if="groupHeaderMap.get(index).date" class="time-header-date-text">
                {{ groupHeaderMap.get(index).date }}
              </text> -->
              <view
                v-if="index === firstGroupHeaderIndex"
                class="time-header-calendar"
                @click.stop="calendarRef?.open()"
              >
                <wd-icon name="calendar" size="36rpx" color="#ff6b03"></wd-icon>
                <text v-if="calendarSelectedLabel" class="time-header-date">
                  {{ calendarSelectedLabel }}
                </text>
                <wd-icon
                  v-if="calendarSelectedLabel"
                  name="error-fill"
                  size="28rpx"
                  color="#ccc"
                  class="calendar-clear-icon"
                  @click.stop="handleCalendarClear"
                ></wd-icon>
              </view>
            </view>
            <view class="cell socialBox">
              <view
                class="item-wrapper"
                @touchend.stop="onTouchWrapperEnd($event, index)"
                @touchcancel.stop="onTouchWrapperEnd($event, index)"
              >
                <view
                  class="item-inner"
                  :style="{
                    transform: `translateX(${item.offsetX}px)`,
                    transition: item.transition,
                  }"
                  @touchstart.stop="onTouchStart($event, index)"
                  @touchmove.stop="onTouchMove($event, index)"
                  @touchend.stop="onTouchEnd($event, index)"
                  @touchcancel.stop="onTouchEnd($event, index)"
                >
                  <!-- 社区消息新样式 -->
                  <view
                    v-if="item.category === 'community'"
                    class="item-content community-item"
                    @click.stop="handleDetailClick(item)"
                  >
                    <view class="community-avatar-wrap">
                      <view
                        class="community-avatar"
                        :style="getAvatarStyle(item?.member?.avatar)"
                        @click.stop="handleUserHomeClick(item)"
                      ></view>
                      <view v-if="getLevelIcon(item?.member)" class="community-level-icon">
                        <image :src="getLevelIcon(item?.member)" mode="widthFix" />
                      </view>
                      <view class="community-unread-dot" :class="{ hide: item.is_read }"></view>
                    </view>
                    <view class="community-body">
                      <view class="community-top-row">
                        <view class="community-name-action">
                          <!-- like/comment/follow/special_follow/special_follow_post：只展示 actorName -->
                          <template v-if="isUnifiedDisplaySubtype(item)">
                            <text class="community-name" @click.stop="handleUserHomeClick(item)">
                              {{ item.params['${actorName}'] }}
                            </text>
                          </template>
                        </view>
                      </view>
                      <view
                        class="community-subtext"
                        v-if="
                          isUnifiedDisplaySubtype(item)
                            ? item.display?.actionSegments?.length
                            : item.i18n.content
                        "
                      >
                        <!-- like/comment/follow/special_follow/special_follow_post：遍历 actionSegments 展示 text（type=separator 跳过） -->
                        <view v-if="isUnifiedDisplaySubtype(item)" class="community-preview-text">
                          <template
                            v-for="(segment, segIndex) in item.display?.actionSegments || []"
                            :key="segIndex"
                          >
                            <!-- 第一个子元素：与时间同行 -->
                            <view v-if="segIndex === 0" class="p-txet-row">
                              <view class="p-txet" :class="segment.type">
                                <text v-if="segment?.type !== 'separator'">
                                  {{ getSegmentText(item, segment) }}
                                </text>
                              </view>
                              <text class="community-time">
                                {{ formatRelativeTime(item.create_time) }}
                              </text>
                            </view>
                            <!-- 后续子元素 -->
                            <view v-else class="p-txet" :class="segment.type">
                              <text v-if="segment?.type !== 'separator'">
                                {{ getSegmentText(item, segment) }}
                              </text>
                            </view>
                          </template>
                        </view>
                        <!-- 其他类型：展示 i18n.content -->
                        <rich-text
                          v-else
                          :nodes="item.i18n.content"
                          class="community-preview-text"
                        ></rich-text>
                      </view>
                    </view>
                    <view
                      v-if="getFollowBtnInfo(item)"
                      class="follow-back-btn"
                      :class="getFollowBtnInfo(item).style"
                      @click.stop="handleFollowBack(item)"
                    >
                      {{ getFollowBtnInfo(item).text }}
                    </view>
                    <!-- 帖子/评论内容预览（关注类型除外） -->
                    <view v-if="!shouldHideThumbnail(item)" class="community-thumbnail">
                      <image
                        v-if="item?.display?.imageUrl"
                        :src="item.display.imageUrl"
                        class="thumbnail-image"
                        mode="aspectFill"
                      />
                      <view v-else-if="item?.display?.rootPostSummary" class="thumbnail-text">
                        <text class="thumbnail-text-inner">
                          {{ item.display.rootPostSummary }}
                        </text>
                      </view>
                      <view v-else class="thumbnail-placeholder"></view>
                    </view>
                  </view>
                  <!-- 其他分类保持原样式 -->
                  <view
                    v-else
                    class="item-content socialItem"
                    @click.stop="handleDetailClick(item)"
                  >
                    <view class="socialHead">
                      <view class="unread-dot" :class="{ hide: item.is_read }"></view>
                      <view class="avatarBox">
                        <wd-icon
                          custom-class="avatar"
                          :name="getIconName(item)"
                          size="22px"
                          :color="item.is_read ? '#999999' : '#ff6b03'"
                        />
                      </view>
                      <view class="nameWrap">
                        <view class="name" style="margin-left: 0">
                          <text>
                            {{ item.display?.titleSegments?.[0]?.text || '' }}
                            {{ item.display?.titleSegments?.[1]?.text || '' }}
                          </text>
                          <view
                            v-if="item.display?.titleSegments?.[2]"
                            class="name-link"
                            @click.stop="handleUserHomeClick(item)"
                          >
                            <text style="font-weight: 700">
                              {{ item.display.titleSegments?.[2]?.text || '' }}
                            </text>
                          </view>
                        </view>
                      </view>
                    </view>
                    <view class="socialCntBox">
                      <view class="socialCnt">
                        <rich-text
                          :nodes="item?.i18n?.content"
                          class="rich-text-ellipsis"
                        ></rich-text>
                      </view>
                      <view class="socialTime">
                        {{ formatRelativeTime(item.create_time) }}
                      </view>
                    </view>
                  </view>
                  <view class="item-actions">
                    <view class="action-btn delete" @click.stop="handleMarkAsRead(item)">
                      {{ $t('notification.index.mark_read') }}
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
        <view
          v-if="activeCategory === 'community' && !currentCache.loading && !listData.data?.length"
          class="time-header time-header-empty"
        >
          <view class="time-header-calendar" @click.stop="calendarRef?.open()">
            <wd-icon name="calendar" size="36rpx" color="#ff6b03"></wd-icon>
            <text v-if="calendarSelectedLabel" class="time-header-date">
              {{ calendarSelectedLabel }}
            </text>
            <wd-icon
              v-if="calendarSelectedLabel"
              name="error-fill"
              size="28rpx"
              color="#ccc"
              class="calendar-clear-icon"
              @click.stop="handleCalendarClear"
            ></wd-icon>
          </view>
        </view>
        <view class="emptyBox" v-if="!currentCache.loading && currentList.length === 0">
          <view class="emptyImg"></view>

          <view class="emptyText">{{ t('common.no_data') }}</view>
        </view>
      </template>

      <template #footer>
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop" />
      </template>
    </custom-nav>
    <wd-toast />

    <!-- 日历筛选（起止时间） -->
    <wd-calendar
      ref="calendarRef"
      v-model="calendarRange"
      type="daterange"
      :with-cell="false"
      :max-date="Date.now()"
      @confirm="handleCalendarConfirm"
      :clearable="true"
    />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatRelativeTime, toUrlOnce, toUrl, formatNickname, getTimeZoneOffsetStr } from '@/utils'
import { useToast } from 'wot-design-uni'
// 滚动加载类型
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
// 消息中心接口&类型
import {
  getNotificationListApi,
  getUnreadByCategoryApi,
  getNotificationUnreadCountApi,
  markCategoryReadApi,
  getNotificationListResponse,
  UnreadByCategoryResponse,
  handleMarkReadApi,
} from '@/service/api/message'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import { useUserStore } from '@/store/user'
import { createFollowApi } from '@/service/api/community'
import { debounce } from 'lodash-es'
import { getAvatarStyle } from '@/utils/avatarCache'
const userStore = useUserStore()
const toast = useToast()
// 滚动到顶部监听
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
  saveCurrentScrollTop(e.scrollTop)
})

// 分页加载状态
const state = ref<LoadMoreState>('loading')
const createInitialListData = (): getNotificationListResponse => ({
  current_page: 0,
  data: [],
  last_page: 1,
  per_page: 15,
})

type NotificationSubtype = 'like' | 'follow' | 'comment'
type NotificationCacheEntry = {
  listData: getNotificationListResponse
  state: LoadMoreState
  loaded: boolean
  loading: boolean
  scrollTop: number
  calendarRange: number[]
  confirmedStartDate: string
  confirmedEndDate: string
}

const createCacheEntry = (): NotificationCacheEntry => ({
  listData: createInitialListData(),
  state: 'loading',
  loaded: false,
  loading: false,
  scrollTop: 0,
  calendarRange: [],
  confirmedStartDate: '',
  confirmedEndDate: '',
})
// 消息分类列表（对应接口category）
const categoryList = ref([
  {
    label: t('notification.index.all'),
    value: 'all',
    badgeProps: {
      modelValue: 0,
      right: '-8px',
    },
  },
  {
    label: t('notification.index.community'),
    value: 'community',
    badgeProps: {
      modelValue: 0,
      right: '-8px',
    },
  },
  {
    label: t('notification.index.mall'),
    value: 'mall',
    badgeProps: {
      modelValue: 0,
      right: '-8px',
    },
  },
  {
    label: t('notification.index.system'),
    value: 'system',
    badgeProps: {
      modelValue: 0,
      right: '-8px',
    },
  },
])
// 激活的分类
const activeCategory = ref<string>('all')
// 当前选中项
const activeSubtype = ref<NotificationSubtype>('like')

const listCache = reactive<Record<string, NotificationCacheEntry>>({})
const getCacheKey = (category = activeCategory.value, subtype: string = activeSubtype.value) =>
  category === 'community' ? `${category}:${subtype}` : category
const currentCacheKey = ref(getCacheKey())
const getCacheByKey = (key: string) => {
  if (!listCache[key]) listCache[key] = createCacheEntry()
  return listCache[key]
}
// 是否在全选模式（点同一个分类反选后）
const isShowingAll = ref(false)

const getCurrentCache = () => {
  const subtype = isShowingAll.value ? '' : activeSubtype.value
  return getCacheByKey(getCacheKey(activeCategory.value, subtype))
}
// 消息列表数据
const listData = ref<getNotificationListResponse>(getCurrentCache().listData)
const currentCache = computed(() => getCurrentCache())
const currentList = computed(() => listData.value.data || [])
const syncCurrentCache = () => {
  const subtype = isShowingAll.value ? '' : activeSubtype.value
  const key = getCacheKey(activeCategory.value, subtype)
  currentCacheKey.value = key
  const cache = getCacheByKey(key)
  listData.value = cache.listData
  state.value = cache.state
  scrollTop.value = cache.scrollTop
}
const saveCurrentScrollTop = (top = scrollTop.value) => {
  getCacheByKey(currentCacheKey.value).scrollTop = top
}
const restoreCurrentScrollTop = () => {
  const cache = getCacheByKey(currentCacheKey.value)
  scrollTop.value = cache.scrollTop
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: cache.scrollTop,
      duration: 0,
    })
  })
}
const resetCacheEntry = (cache: NotificationCacheEntry) => {
  const initialData = createInitialListData()
  cache.listData.data = initialData.data
  cache.listData.current_page = initialData.current_page
  cache.listData.last_page = initialData.last_page
  cache.listData.per_page = initialData.per_page
  cache.state = 'loading'
  cache.loaded = false
  cache.loading = false
  cache.scrollTop = 0
}
// 各分类未读数量
const unreadByCategory = ref<UnreadByCategoryResponse>({
  system: 0,
  community: 0,
  mall: 0,
  subtypes: {
    community: {
      comment: 0,
      like: 0,
      follow: 0,
    },
  },
})

// 导航栏尺寸计算（适配多端安全区）
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

const debouncedToDetailRef = ref<((notificationItem: any) => void) | null>(null)
const debouncedToUserHomeRef = ref<((notificationItem: any) => void) | null>(null)
onMounted(() => {
  // 状态栏高度转rpx
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  // 导航栏高度计算（同订单页规范）
  navHeight.value = safeTopRpx.value + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value + 88 // 导航栏+分类Tab高度
  // 初始化加载
  syncCurrentCache()
  loadMore()
  if (!debouncedToDetailRef.value) {
    debouncedToDetailRef.value = debounce(toDetail, 300, {
      leading: true,
      trailing: false,
    })
  }

  if (!debouncedToUserHomeRef.value) {
    debouncedToUserHomeRef.value = debounce(toUserHome, 300, {
      leading: true,
      trailing: false,
    })
  }
})

const subtypeList = computed(() => [
  {
    value: 'like',
    label: t('notification.index.tab.likes'),
    icon: '❤️', // 也可替换为图标库图标名
    iconClass: 'icon-like',
    iconBgClass: 'bg-like',
    iconSrc: '/static/images/like1.png',
  },
  {
    value: 'follow',
    label: t('notification.index.tab.follow'),
    icon: '👤',
    // icon: '👤',
    iconClass: 'icon-follow',
    iconBgClass: 'bg-follow',
    iconSrc: '/static/images/user-add1.png',
  },
  {
    value: 'comment',
    label: t('notification.index.tab.comment'),
    icon: '💬',
    iconClass: 'icon-comment',
    iconBgClass: 'bg-comment',
    iconSrc: '/static/images/comment1.png',
  },
  {
    value: 'special_follow_post',
    label: t('notification.index.tab.special_follow'),
    iconClass: 'icon-special',
    iconBgClass: 'bg-special',
    iconSrc: '/static/images/special.png',
  },
])
// 页面加载
onLoad((options) => {
  if (options.category) {
    activeCategory.value = options.category
  }
})

// 滚动到底部加载更多
onReachBottom(() => {
  if (listData.value?.current_page < listData.value?.last_page) {
    loadMore()
  }
})

// 获取各分类未读数量
const getNotificationUnreadCount = () => {
  getNotificationUnreadCountApi().then((res) => {
    console.log(res)
    if (res.data !== null) {
      categoryList.value[0].badgeProps.modelValue = res.data
    }
  })
}
const getUnreadByCategory = () => {
  getUnreadByCategoryApi().then((res) => {
    if (res.data) {
      console.log(res)
      const { community, mall, system } = res.data
      unreadByCategory.value = res.data
      categoryList.value[3].badgeProps.modelValue = system
      categoryList.value[1].badgeProps.modelValue = community
      categoryList.value[2].badgeProps.modelValue = mall
    }
  })
}

// ========== 日历筛选（起止时间） ==========
const calendarRef = ref()
// 日期筛选保存在当前 subtype 的缓存中，点赞/关注/评论互不影响。
const calendarRange = computed<number[]>({
  get: () => currentCache.value.calendarRange,
  set: (value) => {
    currentCache.value.calendarRange = value
  },
})
const confirmedStartDate = computed<string>({
  get: () => currentCache.value.confirmedStartDate,
  set: (value) => {
    currentCache.value.confirmedStartDate = value
  },
})
const confirmedEndDate = computed<string>({
  get: () => currentCache.value.confirmedEndDate,
  set: (value) => {
    currentCache.value.confirmedEndDate = value
  },
})
// 选中的日期范围展示文本，如 "2026-08-02～2026-08-04"
const calendarSelectedLabel = computed(() => {
  if (confirmedStartDate.value && confirmedEndDate.value) {
    return `${confirmedStartDate.value}～${confirmedEndDate.value}`
  }
  return ''
})

/** 时间戳 → YYYY-MM-DD */
const formatTimestampToDate = (ts: number): string => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 日历确认：格式化起止日期并重新加载 */
const handleCalendarConfirm = () => {
  const [start, end] = calendarRange.value
  confirmedStartDate.value = start ? formatTimestampToDate(start) : ''
  confirmedEndDate.value = end ? formatTimestampToDate(end) : ''
  // 重置缓存并重新加载第一页
  const cache = getCurrentCache()
  resetCacheEntry(cache)
  loadMore()
}

/** 清空日期筛选 */
const handleCalendarClear = () => {
  calendarRange.value = []
  confirmedStartDate.value = ''
  confirmedEndDate.value = ''
  const cache = getCurrentCache()
  resetCacheEntry(cache)
  loadMore()
}

// 加载消息列表
const loadMore = (refresh = false) => {
  const requestCategory = activeCategory.value
  const requestSubtype = isShowingAll.value ? '' : activeSubtype.value
  const requestKey = getCacheKey(requestCategory, requestSubtype)
  const apiSubtype = isShowingAll.value
    ? undefined
    : (activeSubtype.value as 'like' | 'follow' | 'comment')
  const cache = getCurrentCache()

  if (cache.loading) return
  if (refresh) resetCacheEntry(cache)

  cache.loading = true
  cache.state = 'loading'
  state.value = 'loading'
  uni.showLoading()
  // 传参：页码、分类、日期筛选
  getNotificationListApi(
    cache.listData.current_page + 1,
    cache.listData.per_page,
    requestCategory && requestCategory !== 'all' ? requestCategory : '',
    requestCategory === 'community' ? apiSubtype : undefined,
    confirmedStartDate.value || undefined,
    confirmedEndDate.value || undefined,
  )
    .then((res) => {
      console.log(res)

      if (!res.data) return
      if (res.data.current_page === 1) {
        cache.listData.data = res.data.data
      } else if (res.data.current_page > 1) {
        cache.listData.data = cache.listData.data.concat(res.data.data)
      }
      // listData.value.data = listData.value.data.concat(res.data.data)
      cache.listData.current_page = res.data.current_page
      cache.listData.last_page = res.data.last_page
      cache.loaded = true
      // 加载完成
      if (cache.listData?.current_page === res.data.last_page) {
        cache.state = 'finished'
      }
      handleRefreshComplete()
    })
    .catch(() => {
      handleRefreshError()
    })
    .finally(() => {
      cache.loading = false
      cache.state = 'finished'
      if (getCacheKey(requestCategory, requestSubtype) === requestKey) syncCurrentCache()
      uni.hideLoading()
    })
  getUnreadByCategory()
  getNotificationUnreadCount()
}

// 切换消息分类
const handleCategoryChange = (prop) => {
  saveCurrentScrollTop()
  activeCategory.value = prop.name
  syncCurrentCache()
  restoreCurrentScrollTop()
  const cache = getCurrentCache()
  if (!cache.loaded) loadMore()
}
let lastSubtype = ''

const handleSubtypeChange = (prop?: NotificationSubtype | { value?: NotificationSubtype }) => {
  saveCurrentScrollTop()
  const nextValue = typeof prop === 'string' ? prop : prop?.value || ''

  // wd-segmented 已通过 v-model 更新了 activeSubtype
  if (nextValue === lastSubtype && !isShowingAll.value) {
    // 重复点击同一分类 → 展示全部
    isShowingAll.value = true
  } else if (nextValue === lastSubtype && isShowingAll.value) {
    // 再次点击 → 恢复筛选
    isShowingAll.value = false
  } else {
    // 切换不同分类 → 筛选新分类
    isShowingAll.value = false
  }
  lastSubtype = nextValue

  syncCurrentCache()
  restoreCurrentScrollTop()
  const cache = getCurrentCache()
  if (!cache.loaded) loadMore()
}
// 跳转到消息详情
const toDetail = (notificationItem: any) => {
  if (shouldSuppressSwipeTap(notificationItem)) {
    clearSwipeTapSuppressed()
    return
  }
  if (notificationItem.opened || notificationItem.offsetX !== 0) {
    // 如果滑块是开着的，则执行关闭逻辑
    closeSwipe(notificationItem)
    return
  }
  if (!userStore.isLogin) {
    // toast.show(t('common.toast.pleaseLogin'))
    toUrl('/pages/cats/login', true, false)
    return
  }
  handleMarkAsRead(notificationItem)
  const { category, context } = notificationItem
  switch (category) {
    case 'mall':
      const { orderNo } = context
      toUrlOnce('/pages/cats/order/detail?order_no=' + orderNo)
      break
    case 'community':
      const { interactionTarget, rootPostId } = context
      // follow / special_follow 跳转个人主页，不涉及 target 状态；其余子类型需检查 target.status
      const isFollowType = ['follow', 'special_follow'].includes(notificationItem?.subtype)
      if (!isFollowType) {
        const targetStatus = context?.target?.status
        if (targetStatus && targetStatus !== 'available') {
          // 非 available 状态不可跳转，提示对应文案
          if (targetStatus === 'deleted') {
            toast.show(t('notification.index.content_deleted'))
          } else {
            toast.show(t('notification.index.content_unavailable'))
          }
          break
        }
      }
      /**
       *  rootPostId 所在帖子ID。
          interactionTarget：若 type === "Comment"，则 interactionTarget.id 定位被赞/被回复所在的那条评论ID；
          若 type === "Post"，则interactionTarget.id 是帖子ID。
       */
      switch (notificationItem?.subtype) {
        // 关注
        case 'follow':
          const { participantMemberId } = context
          toUrlOnce('/pages/cats/user/home?member_id=' + participantMemberId)
          break
        // 点赞
        case 'like':
          const { type, id } = interactionTarget
          // 根据 post_category 判断是跳转 social detail 还是 ad_detail
          const isAdvertisement = context?.post_category === 'advertisement'
          if (isAdvertisement) {
            // 广告详情页面
            const adId = context?.id || rootPostId
            toUrlOnce('/pages/cats/social/ad_detail?id=' + adId)
          } else {
            // 普通社交帖子
            if (type === 'Comment')
              toUrlOnce(
                `/pages/cats/social/detail?id=${rootPostId}&showComment=${true}&commentId=${id}`,
              )
            else toUrlOnce('/pages/cats/social/detail?id=' + id)
          }
          break
        // 特别关注发帖
        case 'special_follow_post':
          // 根据 post_category 判断是跳转 social detail 还是 ad_detail
          const isSpecialFollowAd = context?.post_category === 'advertisement'
          if (isSpecialFollowAd) {
            // 广告详情页面
            const adId = context?.id || rootPostId
            toUrlOnce('/pages/cats/social/ad_detail?id=' + adId)
          } else {
            // 普通社交帖子
            toUrlOnce('/pages/cats/social/detail?id=' + rootPostId)
          }
          break
        // 评论
        case 'comment':
          // 评论的话，要根据 post_category 判断是跳转 social detail 还是 ad_detail
          const isCommentAd = context?.post_category === 'advertisement'
          if (isCommentAd) {
            // 广告详情页面
            const adId = context?.id || rootPostId
            toUrlOnce('/pages/cats/social/ad_detail?id=' + adId)
          } else {
            // 普通社交帖子 - 跳到对应的评论
            toUrlOnce(
              `/pages/cats/social/detail?id=${rootPostId}&showComment=${true}&commentId=${context?.commentId}`,
            )
          }
          break
        default:
          break
      }

      break
    case 'system':
      toUrlOnce('/pages/cats/notification/detail?id=' + notificationItem.id)
      break
    default:
      break
  }
}
const handleDetailClick = (notificationItem: any) => {
  debouncedToDetailRef.value?.(notificationItem)
}
const handleMarkAsRead = (notificationItem: any) => {
  if (notificationItem?.is_read == 1) {
    closeSwipe(notificationItem)
    return
  }
  handleMarkReadApi(notificationItem?.id).then((res) => {
    if (res.code === 1) {
      markNotificationReadInCache(notificationItem?.id)
      getNotificationUnreadCount()
      getUnreadByCategory()
      closeSwipe(notificationItem)
      // 刷新 Tab 页面上的未读消息数量
      uni.$emit('refreshTabMsgUnread')
    } else {
      toast.show(res.msg || t('common.error'))
      closeSwipe(notificationItem)
    }
  })
}
// 全部已读
const handleReadAll = () => {
  if (activeCategory.value === 'all') {
    Promise.all([asyncMakeRead('system'), asyncMakeRead('community'), asyncMakeRead('mall')])
      .then(() => {
        markCategoryReadInCache()
        getNotificationUnreadCount()
        getUnreadByCategory()
      })
      .catch((err) => {
        toast.show(err.msg || t('common.error'))
      })
  } else {
    asyncMakeRead(activeCategory.value)
      .then(() => {
        markCategoryReadInCache(activeCategory.value)
        getNotificationUnreadCount()
        getUnreadByCategory()
      })
      .catch((err) => {
        toast.show(err.msg || t('common.error'))
      })
  }
}
const asyncMakeRead = (activeCategory: string) => {
  return new Promise((resolve, reject) => {
    markCategoryReadApi(activeCategory)
      .then((res) => {
        if (res.code === 1) {
          resolve(res) // 抛出成功结果
        } else {
          reject(res)
        }
      })
      .catch((err) => {
        reject(err)
      })
  })
}
const handleDelete = (notificationItem: any) => {}
const markNotificationReadInCache = (notificationId: number | string) => {
  Object.values(listCache).forEach((cache) => {
    const findItem = cache.listData.data.find((item) => item.id === notificationId)
    if (findItem) findItem.is_read = 1
  })
}
const markCategoryReadInCache = (category?: string) => {
  Object.values(listCache).forEach((cache) => {
    cache.listData.data.forEach((item) => {
      if (!category || item.category === category) item.is_read = 1
    })
  })
}
// 刷新状态追踪
const isRefreshing = ref(false)
const refreshError = ref(false)
// 处理刷新完成
const handleRefreshComplete = () => {
  if (isRefreshing.value) {
    setTimeout(() => {
      uni.stopPullDownRefresh()
      isRefreshing.value = false
      refreshError.value = false
    }, 1000)
  }
}

// 处理刷新错误
const handleRefreshError = () => {
  refreshError.value = true
  if (isRefreshing.value) {
    setTimeout(() => {
      uni.stopPullDownRefresh()
      isRefreshing.value = false
    }, 1000)
  }
}
// 下拉刷新方法
onPullDownRefresh(() => {
  isRefreshing.value = true
  refreshError.value = false
  loadMore(true)
  // 设置超时保护，防止刷新状态无限挂起
  setTimeout(() => {
    if (isRefreshing.value && !refreshError.value) {
      console.log('Refresh timeout, forcing stop')
      handleRefreshComplete()
    }
  }, 10000) // 10 秒超时保护
})

// 根据分类和子类型匹配图标
const getIconName = (item: any) => {
  const { category, subtype } = item
  // 系统消息固定图标
  if (category === 'system') return 'notification'
  // 社区消息图标
  if (category === 'community') {
    switch (subtype) {
      case 'comment':
        return 'chat1'
      case 'like':
        return 'heart'
      case 'follow':
        return 'user-add'
      default:
        return 'chat1'
    }
  }
  // 商城消息图标
  if (category === 'mall') {
    switch (subtype) {
      case 'payment_reminder':
        return 'creditcard'
      case 'order_created':
        return 'add-circle1'
      case 'payment_success':
        return 'check-circle'
      default:
        return 'chat1'
    }
  }
  // 默认图标
  return 'chat1'
}

// 已回关的 member ID 集合，用于隐藏已操作的按钮
const followedBackIds = reactive(new Set<number>())

// 关注按钮文案和样式（参考 user home 页面逻辑）
const getFollowBtnInfo = (
  item: any,
): { text: string; style: string; memberId: number | string } | null => {
  // 如果不是关注或特别关注类型，不显示按钮
  if (item?.subtype !== 'follow' && item?.subtype !== 'special_follow') return null

  const memberId = item?.display?.titleSegments?.[2]?.id || item?.context?.participantMemberId
  if (!memberId) return null

  // 如果已经点击过回关，不再显示按钮
  if (followedBackIds.has(memberId)) return null

  const u = item?.member || {}

  if (u.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'followed', memberId }
  if (u.is_mutual_following)
    return { text: t('social.index.user.mutual_following'), style: 'followed', memberId }
  if (u.is_following === 1)
    return { text: t('social.index.user.followed'), style: 'followed', memberId }
  if (u.is_following_me)
    return { text: t('social.index.user.follow_back'), style: 'follow', memberId }
  return { text: t('social.index.user.follow'), style: 'follow', memberId }
}

// 是否应该隐藏缩略图（category 为 community 且 subtype 为 follow 或 special_follow）
const shouldHideThumbnail = (item: any): boolean => {
  return (
    item?.category === 'community' &&
    (item?.subtype === 'follow' || item?.subtype === 'special_follow')
  )
}

/** 获取 level_id 的值（优先使用 level_id，兼容旧的 level 字段） */
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

/** 获取 level 图标路径 */
const getLevelIcon = (member: any): string => {
  const levelId = getLevelValue(member)
  if (!levelId) return ''
  return `/static/images/level/${levelId}.png`
}

/** interactionTargetSummary 的展示文本：根据 context.target.status 判断 */
const getInteractionTargetText = (item: any, segment: any): string => {
  const status = item?.context?.target?.status
  if (status === 'available') return segment?.text || ''
  if (status === 'deleted') return t('notification.index.content_deleted')
  return t('notification.index.content_unavailable')
}

/** 获取 segment 的展示文本（interactionTargetSummary 类型需根据 target 状态判断） */
const getSegmentText = (item: any, segment: any): string => {
  if (segment?.type === 'interactionTargetSummary') {
    return getInteractionTargetText(item, segment)
  }
  return segment?.text || ''
}

// 统一展示 actorName + actionText 的消息子类型
const UNIFIED_DISPLAY_SUBTYPES = [
  'like',
  'comment',
  'follow',
  'special_follow',
  'special_follow_post',
]
const isUnifiedDisplaySubtype = (item: any): boolean =>
  UNIFIED_DISPLAY_SUBTYPES.includes(item?.subtype)

// 回关按钮点击
const handleFollowBack = async (item: any) => {
  const btnInfo = getFollowBtnInfo(item)
  if (!btnInfo) return
  const { memberId, style } = btnInfo
  if (style !== 'follow') return
  if (!userStore.isLogin) {
    toUrlOnce('/pages/cats/login/login', true)
    return
  }
  try {
    const res = await createFollowApi(memberId)
    if (res.code === 1) {
      followedBackIds.add(memberId)
      uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
    } else {
      toast.show(res.msg || t('common.error'))
    }
  } catch (e) {
    console.error('handleFollowBack failed', e)
  }
}

// 社区消息时间分组
const getTimeGroupKey = (createTime: string): string => {
  if (!createTime) return 'earlier'
  const timeZone = uni.getStorageSync('timeZone') || 'Asia/Shanghai'
  let date: Date
  let str = createTime.trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
    str = str.replace(' ', 'T') + getTimeZoneOffsetStr(timeZone)
    date = new Date(str)
  } else {
    date = new Date(str)
  }
  if (isNaN(date.getTime())) {
    console.warn('[getTimeGroupKey] Invalid date:', createTime, '-> parsed as:', str)
    return 'earlier'
  }

  const now = new Date()

  // 直接用本地日期比较（date 已包含正确时区偏移，get* 方法返回设备本地时区日期）
  const todayY = now.getFullYear()
  const todayM = now.getMonth()
  const todayD = now.getDate()
  const dateY = date.getFullYear()
  const dateM = date.getMonth()
  const dateD = date.getDate()

  if (todayY === dateY && todayM === dateM && todayD === dateD) {
    return 'today'
  }
  // 昨天
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (
    dateY === yesterday.getFullYear() &&
    dateM === yesterday.getMonth() &&
    dateD === yesterday.getDate()
  ) {
    return 'yesterday'
  }
  return 'earlier'
}

// 获取当天日期文案（MM月DD日，按本地时区）
const getTodayDateLabel = (): string => {
  const timeZone = uni.getStorageSync('timeZone') || 'Asia/Shanghai'
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const month = parts.find((p) => p.type === 'month')?.value || ''
    const day = parts.find((p) => p.type === 'day')?.value || ''
    if (month && day) return `${month}月${day}日`
  }
  return ''
}

// 社区消息分组标题 Map（index → { label, date }）
const groupHeaderMap = computed(() => {
  const map = new Map<number, { label: string; date: string }>()
  let lastKey = ''
  listData.value.data.forEach((item, index) => {
    // 只对 community 类型的消息进行时间分组
    if (item.category !== 'community') return
    const key = getTimeGroupKey(item.create_time)
    if (key !== lastKey) {
      map.set(index, {
        label: getGroupLabel(key),
        // “今天”分组额外展示当天日期
        date: key === 'today' ? getTodayDateLabel() : '',
      })
      lastKey = key
    }
  })
  return map
})

// 第一个分组标题的 index（只有它展示日历按钮）
const firstGroupHeaderIndex = computed(() => {
  const first = groupHeaderMap.value.keys().next()
  return first.done ? -1 : first.value
})

const getGroupLabel = (key: string): string => {
  switch (key) {
    case 'today':
      return t('notification.index.today')
    case 'yesterday':
      return t('notification.index.yesterday')
    case 'earlier':
      return t('notification.index.earlier')
    default:
      return ''
  }
}

// 跳转用户主页
const toUserHome = (notificationItem: any) => {
  if (shouldSuppressSwipeTap(notificationItem)) {
    clearSwipeTapSuppressed()
    return
  }
  const memberId =
    notificationItem.member.member_id || notificationItem?.display.titleSegments[2].id
  if (notificationItem.opened || notificationItem.offsetX !== 0) {
    // 如果滑块是开着的，则执行关闭逻辑
    closeSwipe(notificationItem)
    return
  }
  toUrlOnce(`/pages/cats/user/home?member_id=${memberId}`)
}
const handleUserHomeClick = (notificationItem: any) => {
  debouncedToUserHomeRef.value?.(notificationItem)
}
// 按钮宽度 (px)
const BUTTON_WIDTH = 112

interface ChatItem {
  id: number
  nickname: string
  lastMsg: string
  avatar: string
  offsetX: number // 当前偏移量
  transition: string // 动画
}
const swipeTouchState = reactive({
  activeIndex: -1,
  startX: 0,
  startY: 0,
  startOffset: 0,
  currentOffset: 0,
  horizontalLocked: false,
  dragging: false,
  suppressTapItemId: '',
  suppressTapUntil: 0,
})
const markSwipeTapSuppressed = (item: any) => {
  swipeTouchState.suppressTapItemId = String(item?.id ?? '')
  swipeTouchState.suppressTapUntil = Date.now() + 320
}
const shouldSuppressSwipeTap = (item: any) =>
  swipeTouchState.suppressTapItemId === String(item?.id ?? '') &&
  Date.now() < swipeTouchState.suppressTapUntil
const clearSwipeTapSuppressed = () => {
  swipeTouchState.suppressTapItemId = ''
  swipeTouchState.suppressTapUntil = 0
}

const onTouchStart = (e: TouchEvent, index: number) => {
  e.stopPropagation?.()
  // 开始触摸时关闭所有其他已打开的项
  listData.value.data.forEach((item, i) => {
    if (i !== index) {
      item.offsetX = 0
      item.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }
  })

  const touch = e.touches?.[0]
  if (!touch) return

  swipeTouchState.activeIndex = index
  swipeTouchState.startX = touch.clientX
  swipeTouchState.startY = touch.clientY
  swipeTouchState.startOffset = listData.value.data[index].offsetX || 0
  swipeTouchState.currentOffset = swipeTouchState.startOffset
  swipeTouchState.horizontalLocked = false
  swipeTouchState.dragging = false
  listData.value.data[index].transition = 'none'
}

const onTouchMove = (e: TouchEvent, index: number) => {
  if (swipeTouchState.activeIndex !== index) return
  e.stopPropagation?.()
  const touch = e.touches?.[0]
  if (!touch) return
  const currentItem = listData.value.data[index]

  const deltaX = touch.clientX - swipeTouchState.startX
  const deltaY = touch.clientY - swipeTouchState.startY

  if (!swipeTouchState.horizontalLocked) {
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) return
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      swipeTouchState.horizontalLocked = true
    } else {
      return
    }
  }

  swipeTouchState.dragging = true
  e.preventDefault?.()
  let nextOffset = swipeTouchState.startOffset + deltaX
  if (nextOffset < -BUTTON_WIDTH) nextOffset = -BUTTON_WIDTH
  if (nextOffset > 0) nextOffset = 0

  swipeTouchState.currentOffset = nextOffset
  currentItem.offsetX = nextOffset
}

const onTouchEnd = (e: TouchEvent, index: number) => {
  if (swipeTouchState.activeIndex !== index) return
  e.stopPropagation?.()

  const currentItem = listData.value.data[index]
  currentItem.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'

  // 已展开状态下的轻点，直接收起，不再等 click 事件二次触发
  if (!swipeTouchState.dragging && swipeTouchState.startOffset < 0) {
    markSwipeTapSuppressed(currentItem)
    currentItem.offsetX = 0
    swipeTouchState.activeIndex = -1
    swipeTouchState.startOffset = 0
    swipeTouchState.currentOffset = 0
    swipeTouchState.horizontalLocked = false
    swipeTouchState.dragging = false
    return
  }

  const currentOffset = swipeTouchState.dragging
    ? swipeTouchState.currentOffset
    : swipeTouchState.startOffset
  const movedLeft = currentOffset < swipeTouchState.startOffset

  if (currentOffset <= -BUTTON_WIDTH + 2) {
    currentItem.offsetX = -BUTTON_WIDTH
  } else if (currentOffset >= -2) {
    currentItem.offsetX = 0
  } else if (movedLeft && currentOffset <= -BUTTON_WIDTH / 3) {
    currentItem.offsetX = -BUTTON_WIDTH
  } else if (!movedLeft && currentOffset >= (-BUTTON_WIDTH * 2) / 3) {
    currentItem.offsetX = 0
  } else if (Math.abs(currentOffset) >= BUTTON_WIDTH / 2) {
    currentItem.offsetX = -BUTTON_WIDTH
  } else {
    currentItem.offsetX = 0
  }

  swipeTouchState.activeIndex = -1
  swipeTouchState.startOffset = 0
  swipeTouchState.currentOffset = 0
  swipeTouchState.horizontalLocked = false
  swipeTouchState.dragging = false
}
const onTouchWrapperEnd = (e: TouchEvent, index: number) => {
  if (swipeTouchState.activeIndex !== index) return
  onTouchEnd(e, index)
}
// 提取关闭滑块的公共方法
const closeSwipe = (item: any) => {
  // 给一个丝滑的动画时间
  item.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
  // 位移归零
  item.offsetX = 0
  // 状态置为关闭
  item.opened = false
}

onUnmounted(() => {
  ;(debouncedToDetailRef.value as any)?.cancel?.()
  ;(debouncedToUserHomeRef.value as any)?.cancel?.()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

.page {
  background-color: var(--liberty-cats-page-background-color);
}

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.avatar) {
  display: flex;
  align-items: center;
  border: 0 !important;
  background-color: inherit !important;
}

:deep(.cnt) {
  padding-top: calc(104rpx + var(--liberty-cats-page-common-border-radius)) !important;
}
:deep(.community-cnt .cnt) {
  padding-top: 0 !important;
}
.nameWrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.name {
  pointer-events: none;
}

.name-link {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex: 0 0 auto;
  pointer-events: auto;
  margin-left: 0.3em;
}

:deep(.wd-tabs) {
  background-color: transparent;

  .wd-tabs__nav {
    position: fixed;
    // top: env(safe-area-inset-top);
    width: 100vw;
    left: 0;
    z-index: 11;
    // background-color: #f7f6f4;
  }
}

:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
}
.com-socialBox {
  padding-top: calc(104rpx + 180rpx);
}
.emptyBox {
  display: flex;
  justify-content: center;
  height: auto;
  padding-top: 200rpx;

  .emptyText {
    font-size: 28rpx;
    color: var(--text-secondary);
  }
}

/* 未读红点 */
.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--liberty-cats-primary-color);
  border-radius: 50%;
  margin-right: 8px;
  // margin-top: 8px;
  flex-shrink: 0;

  &.hide {
    display: none;
  }
}
.button {
  // display: inline-block;
  display: inline-flex;
  /* 关键：inline-block → inline-flex */
  align-items: center;
  /* 垂直居中核心 */
  justify-content: center;
  /* 可选：文字水平居中（根据需求加） */
  padding: 0 15px;
  height: 100%;
  color: white;
}
:deep(.custom-tab) {
  background-color: var(--liberty-cats-page-background-color) !important;
  z-index: 10;
  .wd-tabs__nav {
    background-color: var(--liberty-cats-page-background-color) !important;
    padding: 0 var(--liberty-cats-page-common-border-radius);
    box-sizing: border-box;
    font-family:
      Alimama FangYuanTi VF,
      sans-serif;

    height: var(--wot-tabs-nav-height, 88rpx);
    .wd-tabs__nav-container {
      height: 100%;
      width: 100%;
      .wd-tabs__nav-item {
        height: 100%;
      }
    }
  }
}

.tab-wrapper {
  position: fixed;
  top: calc(var(--message-nav-height) + 88rpx);
  left: 0;
  z-index: 9;
  width: 100vw;
  height: 180rpx;
  padding: 0 40rpx;
  margin: 0;
  background-color: var(--liberty-cats-page-background-color) !important;
  box-sizing: border-box;
}

// 穿透分段器组件，适配三栏布局
::v-deep .custom-segment {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  width: 100%;
  height: 100%;
  .wd-segmented__item {
    flex: 1;
    border: none !important;
    background-color: var(--liberty-cats-page-background-color) !important;
    padding: 0;
    border-radius: 0 !important;
  }

  // 隐藏默认选中态下划线，用自定义样式替代
  .wd-segmented__item-active {
    // background: transparent !important;
    border: 1px solid red !important;
  }
  .wd-segmented__item--active {
    height: auto !important;
  }
}

// 选项内部样式
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 0;
  border-radius: 32rpx;
  transition: all 0.3s ease;
  // overflow: visible !important;
  padding-top: 18rpx;
}

// 选中态背景（对应截图的浅蓝色背景）
.tab-item.active {
  // background: #f0f7ff;
  background-color: var(--liberty-cats-page-background-color) !important;
  font-family: 'Alimama FangYuanTi VF' !important;
}

// 图标容器
.tab-icon {
  width: 100rpx;
  height: 100rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
}

// 三个图标对应不同背景色
.bg-like {
  background: #ffe5e5; // 粉色背景（赞）
  background-color: rgba(255, 107, 3, 0.1);
}
.bg-follow {
  background: #e5f0ff; // 浅蓝色背景（新增关注）
  background-color: rgba(255, 107, 3, 0.1);
}
.bg-comment {
  background: #e5f5e5; // 浅绿色背景（评论）
  background-color: rgba(255, 107, 3, 0.1);
}
.bg-special {
  background: #fff0e5; // 浅橙色背景（特别关注）
  background-color: rgba(255, 107, 3, 0.1);
}

// 图标样式
.tab-icon-svg {
  width: 55%;
}

// 文字样式
.tab-text {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--actions-text);
  transition: color 0.3s ease;
  // font-family: Alibaba PuHuiTi2;
  font-family: 'Alimama FangYuanTi VF' !important;
  &.active {
    color: var(--liberty-cats-primary-color);
  }
  span {
    font-family: 'Alimama FangYuanTi VF' !important;
    color: red;
  }
}
::v-deep .wd-swipe-action__right {
  right: -2rpx;
}
:deep(.wd-badge__content) {
  background-color: var(--liberty-cats-primary-color);
}
.rich-text-ellipsis {
  width: 100%;
  // line-height: 1.6; /* 统一行高，方便计算3行高度 */
}

:deep(.rich-text-ellipsis) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1; /* 核心：限制3行 */
  overflow: hidden;
  text-overflow: ellipsis;
  /* 兼容不支持 line-clamp 的环境，设置最大高度 */
  // max-height: 4.8em; /* 3行 × 1.6行高 = 4.8em */
}

.item-wrapper {
  width: 100%;
  overflow: hidden; // 隐藏超出的按钮
}

.item-inner {
  display: flex;
  width: calc(100% + 112px - 5px);
  will-change: transform;
  /* 确保初始状态也足够温和 */
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  // margin: 16rpx;
  touch-action: pan-y;
}

.item-content {
  flex: 1;
  min-width: 0;
  box-sizing: border-box;
  align-items: center;
  padding: 16rpx;
  .label {
    font-size: 32rpx;
    font-style: normal;
    font-weight: 500;
    line-height: 48rpx;
    color: var(--text-primary);
  }
}

.item-actions {
  width: 112px; // 与 JS 中的 BUTTON_WIDTH 一致
  display: flex;
  position: relative;
  left: 24rpx;
  .action-btn {
    // flex: 1;
    width: 92%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--bg-card);
    font-size: 28rpx;
    border-radius: 0 34rpx 34rpx 0;
    &.delete {
      background-color: #ff6b03;
    }
  }
}
::v-deep .cell {
  padding: 16rpx;
}

/* 社区消息时间分组标题 */
.time-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 日期分组标题文本 */
.time-header-date-text {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-secondary);
}

.time-header-empty {
  justify-content: flex-end;
  padding-top: calc(104rpx + 180rpx);
}

/* 日历按钮圆形背景 */
.time-header-calendar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  height: 44rpx;
  padding: 0 16rpx;
  border-radius: 22rpx;
  background-color: #fff1e8;

  .calendar-clear-icon {
    position: absolute;
    top: -10rpx;
    right: -10rpx;
  }
}

/* 分组日期文案 */
.time-header-date {
  font-size: 22rpx;
  font-weight: 500;
  color: #ff6b03;
}

/* 社区消息项布局 */
.community-item {
  display: flex;
  align-items: flex-start;
  gap: 18rpx;
  padding: 20rpx 0 !important;
}

/* 头像 */
.community-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
}
.community-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-size: cover;
  background-position: center;
  background-color: var(--wot-action-sheet-active-color);
}
.community-unread-dot {
  position: absolute;
  top: 2rpx;
  right: 2rpx;
  width: 20rpx;
  height: 20rpx;
  background: var(--liberty-cats-primary-color);
  border-radius: 50%;
  border: 2rpx solid var(--bg-card);

  &.hide {
    display: none;
  }
}

/* 等级图标 */
.community-level-icon {
  position: absolute;
  right: -4rpx;
  bottom: 2rpx;
  z-index: 9;
  width: 28rpx;
  height: 28rpx;
  pointer-events: none;

  image {
    width: 100%;
    height: 100%;
  }
}

/* 主体内容 */
.community-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  flex-direction: column;
  justify-content: space-between;
  min-height: 75%;
}
.community-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16rpx;
}
.community-name-action {
  flex: 1;
  min-width: 0;
}
.community-name {
  font-size: 26rpx;
  // font-weight: 600;
  // color: #333;
  color: var(--text-black);
}
.community-time {
  font-size: 22rpx;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.community-subtext {
  margin-top: 8rpx;
  max-width: 100%;
  overflow: hidden;
}
.community-preview-text {
  color: var(--wot-message-box-content-color);
  display: flex;
  // align-items: center;
  flex-wrap: wrap;
  flex-direction: column;
  gap: 6rpx;
  max-width: 100%;
  overflow: hidden;
  .p-txet-row {
    display: flex;
    align-items: center;
    gap: 8rpx;
    max-width: 100%;
    width: 85%;
    overflow: hidden;
  }
  .p-txet {
    flex: 1;
    min-width: 0;
    max-width: 50vw;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2; /* 最多展示两行，超出部分省略号 */
  }
  .action {
    color: var(--text-secondary) !important;
    font-size: 24rpx !important;
  }

  .interactionTargetSummary,
  .commentContent {
    color: var(--text-black);
    font-size: 26rpx;
  }
}

/* 回关按钮 */
.follow-back-btn {
  flex-shrink: 0;
  padding: 8rpx 28rpx;
  font-size: 24rpx;
  font-weight: 500;
  border-radius: 32rpx;
  line-height: 1.4;

  // 未关注：主色背景，白色文字
  &.follow {
    color: var(--bg-card);
    background-color: #ff6b03;
  }

  // 已关注/特别关注/互相关注：浅灰背景，深色文字
  &.followed {
    color: var(--wot-message-box-content-color);
    background-color: var(--wot-action-sheet-active-color);
  }
}

/* 帖子/评论缩略图（关注类型除外） */
.community-thumbnail {
  flex-shrink: 0;
  width: 120rpx;
  height: 120rpx;
  margin-left: 8rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: var(--wot-action-sheet-active-color);
}
.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background-color: #fbf7f3;
  background-image: linear-gradient(90deg, #fbf7f3 25%, #f5ece6 50%, #fbf7f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12rpx;
}
.thumbnail-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-height: calc(100% - 16rpx);
  height: calc(100% - 16rpx);
  box-sizing: border-box;
  padding: 8rpx;
  background-color: var(--thumbnail-text-bg-color);

  .thumbnail-text-inner {
    font-size: 22rpx;
    color: var(--wot-message-box-content-color);
    line-height: 1.5;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    word-break: break-all;
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
</style>

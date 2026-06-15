<template>
  <view :style="{ paddingTop: cntPaddingTop + 32 + 'rpx' }">
    <!-- 消息 Tab ：社区通知列表 -->
    <!-- subtype 切换栏 -->
    <view class="notif-tab-wrapper">
      <wd-segmented
        :options="notifSubtypeList"
        v-model:value="activeNotifSubtype"
        custom-class="custom-segment"
      >
        <template #label="{ option }">
          <view class="tab-item">
            <wd-badge
              :modelValue="notifUnreadByCategory.subtypes?.community?.[option.value]"
              bg-color="#ff6b03"
              :max="99"
            >
              <view class="tab-icon" :class="option.iconBgClass">
                <wd-img
                  custom-class="tab-icon-svg"
                  mode="widthFix"
                  width="40"
                  height="40"
                  :src="option.iconSrc"
                />
              </view>
            </wd-badge>
            <view class="tab-text" :class="{ active: activeNotifSubtype === option.value }">
              {{ option.label }}
            </view>
          </view>
        </template>
      </wd-segmented>
    </view>
    <view :style="{ paddingTop: 180 + 24 * 2 + 'rpx' }">
      <view v-show="notificationList.data?.length > 0">
        <view class="cell socialBox" v-for="(item, index) in notificationList.data" :key="item.id">
          <view
            class="item-wrapper"
            @touchend.stop="onNotifTouchWrapperEnd($event, index)"
            @touchcancel.stop="onNotifTouchWrapperEnd($event, index)"
          >
            <view
              class="item-inner"
              :style="{ transform: `translateX(${item.offsetX}px)`, transition: item.transition }"
              @touchstart.stop="onNotifTouchStart($event, index)"
              @touchmove.stop="onNotifTouchMove($event, index)"
              @touchend.stop="onNotifTouchEnd($event, index)"
              @touchcancel.stop="onNotifTouchEnd($event, index)"
            >
              <view class="item-content socialItem" @click.stop="handleNotifClick(item)">
                <view class="socialHead">
                  <view class="unread-dot" :class="{ hide: item.is_read }"></view>
                  <view class="avatarBox">
                    <wd-icon
                      custom-class="avatar"
                      :name="getNotifIconName(item)"
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
                        v-if="item.display.titleSegments[2]"
                        class="name-link"
                        @click.stop="handleNotifUserHomeClick(item)"
                      >
                        <text style="font-weight: 700">
                          {{ ' ' + (item.display.titleSegments?.[2]?.text || '') }}
                        </text>
                      </view>
                    </view>
                  </view>
                </view>
                <view class="socialCntBox">
                  <view class="socialCnt">
                    <rich-text :nodes="item?.i18n?.content" class="rich-text-ellipsis" />
                  </view>
                  <view class="socialTime">
                    {{ formatRelativeTime(item.create_time) }}
                  </view>
                </view>
              </view>
              <view class="item-actions">
                <view class="action-btn delete" @click.stop="handleMarkNotifAsRead(item)">
                  {{ t('notification.index.mark_read') }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <template v-if="cache.initialized && !notificationList.data?.length">
        <view class="emptyBox"><view class="emptyImg"></view></view>
      </template>
    </view>
    <wd-toast />
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import { t } from '@/locale/index'
import { formatRelativeTime, toUrl, toUrlOnce } from '@/utils'
import { useToast } from 'wot-design-uni'
import { useUserStore } from '@/store/user'
import {
  getNotificationListApi,
  getNotificationListResponse,
  getUnreadByCategoryApi,
  UnreadByCategoryResponse,
  getNotificationUnreadCountApi,
  handleMarkReadApi,
} from '@/service/api/message'

type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'
type NotifSubtype = 'like' | 'follow' | 'comment'

// ========== Props / Emits ==========
const props = defineProps<{
  cntPaddingTop: number
  active: boolean
}>()

const emit = defineEmits<{
  'update:state': [state: LoadMoreState]
  'refresh-complete': []
  'refresh-error': []
}>()

const toast = useToast()
const userStore = useUserStore()

// ========== 缓存结构（组件内持久化，切走再切回数据仍在）==========
const cache = reactive({
  initialized: false,
  loading: false,
  state: 'loading' as LoadMoreState,
  scrollTop: 0,
})

// ========== 按 subtype 缓存 ==========
type SubtypeCacheEntry = {
  listData: getNotificationListResponse
  initialized: boolean
  loading: boolean
  state: LoadMoreState
  scrollTop: number
}

const createSubtypeCacheEntry = (): SubtypeCacheEntry => ({
  listData: { current_page: 0, data: [], last_page: 1, per_page: 15 },
  initialized: false,
  loading: false,
  state: 'loading' as LoadMoreState,
  scrollTop: 0,
})

const subtypeCacheMap = reactive<Record<string, SubtypeCacheEntry>>({})

const getSubtypeCache = (subtype: NotifSubtype): SubtypeCacheEntry => {
  if (!subtypeCacheMap[subtype]) subtypeCacheMap[subtype] = createSubtypeCacheEntry()
  return subtypeCacheMap[subtype]
}

const saveCurrentSubtypeCache = () => {
  const entry = getSubtypeCache(activeNotifSubtype.value)
  entry.listData = notificationList.value
  entry.initialized = cache.initialized
  entry.loading = cache.loading
  entry.state = cache.state
  entry.scrollTop = cache.scrollTop
}

const restoreSubtypeCache = (subtype: NotifSubtype) => {
  const entry = getSubtypeCache(subtype)
  notificationList.value = entry.listData
  cache.initialized = entry.initialized
  cache.loading = entry.loading
  cache.state = entry.state
  cache.scrollTop = entry.scrollTop
}

// ========== 通知列表 ==========
const notificationList = ref<getNotificationListResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
  per_page: 15,
})

const activeNotifSubtype = ref<NotifSubtype>('like')

const notifUnreadByCategory = ref<UnreadByCategoryResponse>({
  system: 0,
  community: 0,
  mall: 0,
  subtypes: { community: { comment: 0, like: 0, follow: 0 } },
})

const notifSubtypeList = computed(() => [
  {
    value: 'like',
    label: t('notification.index.tab.likes'),
    iconBgClass: 'bg-like',
    iconSrc: '/static/images/like1.png',
  },
  {
    value: 'follow',
    label: t('notification.index.tab.follow'),
    iconBgClass: 'bg-follow',
    iconSrc: '/static/images/user-add1.png',
  },
  {
    value: 'comment',
    label: t('notification.index.tab.comment'),
    iconBgClass: 'bg-comment',
    iconSrc: '/static/images/comment1.png',
  },
])

// ========== 未读数 ==========
const fetchNotifUnreadCount = () => {
  getUnreadByCategoryApi()
    .then((res: any) => {
      if (res.data) notifUnreadByCategory.value = res.data
    })
    .catch(() => {})
}

const getNotificationUnreadCount = () => {
  getNotificationUnreadCountApi().catch(() => {})
}

// ========== subtype 切换（watch 驱动，v-model 先更新值，watch 回调拿到 oldVal/newVal）==========
watch(activeNotifSubtype, (newVal, oldVal) => {
  // 保存旧 subtype 缓存
  const oldEntry = getSubtypeCache(oldVal)
  oldEntry.listData = notificationList.value
  oldEntry.initialized = cache.initialized
  oldEntry.loading = cache.loading
  oldEntry.state = cache.state
  oldEntry.scrollTop = cache.scrollTop

  // 恢复新 subtype 缓存
  restoreSubtypeCache(newVal)
  if (props.active) emit('update:state', cache.state)

  // 未加载过则请求
  if (!cache.initialized) loadNotifications(1)
})

// ========== 加载通知 ==========
const loadNotifications = async (page = 1, refresh = false) => {
  if (cache.loading) return
  if (refresh) {
    notificationList.value = { current_page: 0, data: [], last_page: 1, per_page: 15 }
    cache.initialized = false
  }
  cache.loading = true
  if (props.active) emit('update:state', 'loading')
  try {
    const res = await getNotificationListApi(page, 15, 'community', activeNotifSubtype.value)
    if (page === 1) {
      notificationList.value = res.data
    } else {
      notificationList.value.data = notificationList.value.data.concat(res.data.data)
      notificationList.value.current_page = res.data.current_page
      notificationList.value.last_page = res.data.last_page
    }
    cache.initialized = true
    fetchNotifUnreadCount()
    getNotificationUnreadCount()
    const newState: LoadMoreState =
      notificationList.value.current_page >= notificationList.value.last_page
        ? 'finished'
        : 'success'
    cache.state = newState
    if (props.active) emit('update:state', newState)
    if (refresh && page === 1) emit('refresh-complete')
  } catch (error) {
    cache.state = 'error'
    if (props.active) emit('update:state', 'error')
    if (refresh) emit('refresh-error')
    console.error('Failed to load notifications:', error)
  } finally {
    cache.loading = false
  }
}

// ========== 暴露给父组件的接口 ==========
/** 激活时同步状态（切换到本 tab 时调用） */
const onActivate = () => {
  emit('update:state', cache.initialized ? cache.state : 'loading')
  if (!cache.initialized) loadNotifications(1)
}

/** 加载更多 */
const loadMore = () => {
  if (cache.loading) return
  if (notificationList.value.current_page < notificationList.value.last_page) {
    loadNotifications(notificationList.value.current_page + 1)
  } else {
    emit('update:state', 'finished')
  }
}

/** 下拉刷新 */
const refresh = () => {
  fetchNotifUnreadCount()
  loadNotifications(1, true)
}

/** 获取当前缓存滚动位置 */
const getScrollTop = () => cache.scrollTop

/** 保存滚动位置 */
const saveScrollTop = (top: number) => {
  cache.scrollTop = top
}

defineExpose({ onActivate, loadMore, refresh, getScrollTop, saveScrollTop })

// ========== 滑动手势 ==========
const NOTIF_BUTTON_WIDTH = 112
const notifSwipeTouchState = reactive({
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

const markNotifSwipeTapSuppressed = (item: any) => {
  notifSwipeTouchState.suppressTapItemId = String(item?.id ?? '')
  notifSwipeTouchState.suppressTapUntil = Date.now() + 320
}
const shouldSuppressNotifSwipeTap = (item: any) =>
  notifSwipeTouchState.suppressTapItemId === String(item?.id ?? '') &&
  Date.now() < notifSwipeTouchState.suppressTapUntil
const clearNotifSwipeTapSuppressed = () => {
  notifSwipeTouchState.suppressTapItemId = ''
  notifSwipeTouchState.suppressTapUntil = 0
}
const closeNotifSwipe = (item: any) => {
  item.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
  item.offsetX = 0
  item.opened = false
}

const onNotifTouchStart = (e: TouchEvent, index: number) => {
  e.stopPropagation?.()
  notificationList.value.data.forEach((item, i) => {
    if (i !== index) {
      item.offsetX = 0
      item.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
    }
  })
  const touch = e.touches?.[0]
  if (!touch) return
  notifSwipeTouchState.activeIndex = index
  notifSwipeTouchState.startX = touch.clientX
  notifSwipeTouchState.startY = touch.clientY
  notifSwipeTouchState.startOffset = notificationList.value.data[index].offsetX || 0
  notifSwipeTouchState.currentOffset = notifSwipeTouchState.startOffset
  notifSwipeTouchState.horizontalLocked = false
  notifSwipeTouchState.dragging = false
  notificationList.value.data[index].transition = 'none'
}

const onNotifTouchMove = (e: TouchEvent, index: number) => {
  if (notifSwipeTouchState.activeIndex !== index) return
  e.stopPropagation?.()
  const touch = e.touches?.[0]
  if (!touch) return
  const deltaX = touch.clientX - notifSwipeTouchState.startX
  const deltaY = touch.clientY - notifSwipeTouchState.startY
  if (!notifSwipeTouchState.horizontalLocked) {
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) return
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
      notifSwipeTouchState.horizontalLocked = true
    } else {
      return
    }
  }
  notifSwipeTouchState.dragging = true
  e.preventDefault?.()
  let nextOffset = notifSwipeTouchState.startOffset + deltaX
  if (nextOffset < -NOTIF_BUTTON_WIDTH) nextOffset = -NOTIF_BUTTON_WIDTH
  if (nextOffset > 0) nextOffset = 0
  notifSwipeTouchState.currentOffset = nextOffset
  notificationList.value.data[index].offsetX = nextOffset
}

const onNotifTouchEnd = (e: TouchEvent, index: number) => {
  if (notifSwipeTouchState.activeIndex !== index) return
  e.stopPropagation?.()
  const currentItem = notificationList.value.data[index]
  currentItem.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)'
  if (!notifSwipeTouchState.dragging && notifSwipeTouchState.startOffset < 0) {
    markNotifSwipeTapSuppressed(currentItem)
    currentItem.offsetX = 0
    notifSwipeTouchState.activeIndex = -1
    notifSwipeTouchState.startOffset = 0
    notifSwipeTouchState.currentOffset = 0
    notifSwipeTouchState.horizontalLocked = false
    notifSwipeTouchState.dragging = false
    return
  }
  const currentOffset = notifSwipeTouchState.dragging
    ? notifSwipeTouchState.currentOffset
    : notifSwipeTouchState.startOffset
  const movedLeft = currentOffset < notifSwipeTouchState.startOffset
  if (currentOffset <= -NOTIF_BUTTON_WIDTH + 2) {
    currentItem.offsetX = -NOTIF_BUTTON_WIDTH
  } else if (currentOffset >= -2) {
    currentItem.offsetX = 0
  } else if (movedLeft && currentOffset <= -NOTIF_BUTTON_WIDTH / 3) {
    currentItem.offsetX = -NOTIF_BUTTON_WIDTH
  } else if (!movedLeft && currentOffset >= (-NOTIF_BUTTON_WIDTH * 2) / 3) {
    currentItem.offsetX = 0
  } else if (Math.abs(currentOffset) >= NOTIF_BUTTON_WIDTH / 2) {
    currentItem.offsetX = -NOTIF_BUTTON_WIDTH
  } else {
    currentItem.offsetX = 0
  }
  notifSwipeTouchState.activeIndex = -1
  notifSwipeTouchState.startOffset = 0
  notifSwipeTouchState.currentOffset = 0
  notifSwipeTouchState.horizontalLocked = false
  notifSwipeTouchState.dragging = false
}

const onNotifTouchWrapperEnd = (e: TouchEvent, index: number) => {
  if (notifSwipeTouchState.activeIndex !== index) return
  onNotifTouchEnd(e, index)
}

// ========== 通知图标 ==========
const getNotifIconName = (item: any) => {
  const { category, subtype } = item
  if (category === 'system') return 'notification'
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
  return 'chat1'
}

// ========== 标记已读 ==========
const markNotificationReadInCache = (notificationId: number | string) => {
  const findItem = notificationList.value.data.find((item) => item.id === notificationId)
  if (findItem) findItem.is_read = 1
}

const handleMarkNotifAsRead = (item: any) => {
  if (item?.is_read == 1) {
    closeNotifSwipe(item)
    return
  }
  handleMarkReadApi(item?.id).then((res: any) => {
    if (res.code === 1) {
      markNotificationReadInCache(item?.id)
      fetchNotifUnreadCount()
      getNotificationUnreadCount()
      closeNotifSwipe(item)
    } else {
      toast.show(res.msg || t('common.error'))
      closeNotifSwipe(item)
    }
  })
}

// ========== 通知点击跳转 ==========
const debouncedNotifClickRef = ref<((item: any) => void) | null>(null)
const toNotifDetail = (item: any) => {
  if (shouldSuppressNotifSwipeTap(item)) {
    clearNotifSwipeTapSuppressed()
    return
  }
  if (item.opened || item.offsetX !== 0) {
    closeNotifSwipe(item)
    return
  }
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true, false)
    return
  }
  handleMarkNotifAsRead(item)
  const { category, context } = item
  switch (category) {
    case 'mall': {
      const { orderNo } = context
      toUrlOnce('/pages/cats/order/detail?order_no=' + orderNo)
      break
    }
    case 'community': {
      const { interactionTarget, rootPostId } = context
      switch (item?.subtype) {
        case 'follow': {
          const { participantMemberId } = context
          toUrlOnce('/pages/cats/user/home?member_id=' + participantMemberId)
          break
        }
        case 'like': {
          const { type, id } = interactionTarget
          if (type === 'Comment')
            toUrlOnce(
              `/pages/cats/social/detail?id=${rootPostId}&showComment=${true}&commentId=${id}`,
            )
          else toUrlOnce('/pages/cats/social/detail?id=' + id)
          break
        }
        case 'comment':
          toUrlOnce(
            `/pages/cats/social/detail?id=${rootPostId}&showComment=${true}&commentId=${context?.commentId}`,
          )
          break
        default:
          break
      }
      break
    }
    case 'system':
      toUrlOnce('/pages/cats/notification/detail?id=' + item.id)
      break
    default:
      break
  }
}
const handleNotifClick = (item: any) => {
  debouncedNotifClickRef.value?.(item)
}

// ========== 用户主页点击 ==========
const debouncedNotifUserHomeRef = ref<((item: any) => void) | null>(null)
const toNotifUserHome = (item: any) => {
  if (shouldSuppressNotifSwipeTap(item)) {
    clearNotifSwipeTapSuppressed()
    return
  }
  const memberId = item?.display?.titleSegments?.[2]?.id
  if (!memberId) return
  if (item.opened || item.offsetX !== 0) {
    closeNotifSwipe(item)
    return
  }
  toUrlOnce(`/pages/cats/user/home?member_id=${memberId}`)
}
const handleNotifUserHomeClick = (item: any) => {
  debouncedNotifUserHomeRef.value?.(item)
}

// ========== 生命周期 ==========
onMounted(() => {
  debouncedNotifClickRef.value = debounce(toNotifDetail, 300, { leading: true, trailing: false })
  debouncedNotifUserHomeRef.value = debounce(toNotifUserHome, 300, {
    leading: true,
    trailing: false,
  })
})

onUnmounted(() => {
  ;(debouncedNotifClickRef.value as any)?.cancel?.()
  ;(debouncedNotifUserHomeRef.value as any)?.cancel?.()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

// 消息 Tab - 通知滑动条目
.item-wrapper {
  width: 100%;
  overflow: hidden;
}
.item-inner {
  display: flex;
  width: calc(100% + 112px - 5px);
  will-change: transform;
  transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  touch-action: pan-y;
}
.item-content {
  width: 100vw;
  box-sizing: border-box;
  align-items: center;
  padding: 16rpx;
}
.item-actions {
  width: 112px;
  display: flex;
  .action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 28rpx;
    border-radius: 0 34rpx 34rpx 0;
    &.delete {
      background-color: #ff6b03;
    }
  }
}
.rich-text-ellipsis {
  width: 100%;
}
:deep(.rich-text-ellipsis) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}
.unread-dot {
  width: 8px;
  height: 8px;
  background: var(--liberty-cats-primary-color);
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
  &.hide {
    display: none;
  }
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
}

:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
}

:deep(.avatar) {
  display: flex;
  align-items: center;
  border: 0 !important;
  background-color: inherit !important;
}

:deep(.wd-badge__content) {
  background-color: var(--liberty-cats-primary-color);
}

::v-deep .wd-swipe-action__right {
  right: -2rpx;
}

::v-deep .cell {
  padding: 16rpx;
}

// 消息 Tab - subtype 切换栏
.notif-tab-wrapper {
  position: fixed;
  top: calc(var(--message-nav-height) + 88rpx);
  left: 0;
  z-index: 9;
  width: 100vw;
  height: 204rpx;
  padding: 24rpx 40rpx;
  margin: 0;
  background-color: var(--liberty-cats-page-background-color) !important;
  box-sizing: border-box;
}
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

// 图标样式
.tab-icon-svg {
  width: 55%;
}

// 文字样式
.tab-text {
  font-size: 24rpx;
  font-weight: 500;
  color: #333;
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
</style>

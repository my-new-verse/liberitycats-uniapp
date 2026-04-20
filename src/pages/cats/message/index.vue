<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
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
  <view
    :class="activeCategory === 'community' ? 'community-cnt' : ''"
    :style="{ '--message-nav-height': navHeight + 'rpx' }"
  >
    <wd-tabs
      v-model="activeCategory"
      @click="handleCategoryChange"
      :line-width="20"
      swipeable
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
            :vibrate-short="true"
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
                <view class="tab-text" :class="{ active: activeSubtype === option.value }">
                  {{ option.label }}
                </view>
              </view>
            </template>
          </wd-segmented>
        </view>
        <view
          v-if="listData.data?.length > 0"
          :class="activeCategory === 'community' ? 'com-socialBox' : ''"
        >
          <view class="cell socialBox" v-for="item in listData.data" :key="item.id">
            <wd-swipe-action>
              <view class="socialItem" @click.stop="toDetail(item)">
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
                      <text
                        v-if="item.display.titleSegments[2]"
                        @click.stop="toUserHome(item.display.titleSegments[2].id)"
                        style="font-weight: 700"
                      >
                        {{ ' ' + item.display.titleSegments?.[2]?.text || '' }}
                      </text>
                    </view>
                  </view>
                </view>
                <view class="socialCntBox">
                  <view class="socialCnt">
                    {{ item.i18n?.content || '' }}
                  </view>
                  <view class="socialTime">
                    {{ formatRelativeTime(item.create_time) }}
                  </view>
                </view>
              </view>
              <template #right>
                <view class="button" style="background: #4d80f0" @click="handleMarkAsRead(item)">
                  {{ $t('notification.index.mark_read') }}
                </view>
              </template>
            </wd-swipe-action>
          </view>
        </view>
        <template v-else>
          <view class="emptyBox" :class="{ 'com-emptyBox': activeCategory === 'community' }">
            <view class="emptyImg"></view>
          </view>
        </template>
      </template>

      <template #footer>
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop" />
      </template>
    </custom-nav>
    <wd-toast />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatRelativeTime, toUrl } from '@/utils'
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
}

const createCacheEntry = (): NotificationCacheEntry => ({
  listData: createInitialListData(),
  state: 'loading',
  loaded: false,
  loading: false,
  scrollTop: 0,
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
const getCacheKey = (category = activeCategory.value, subtype = activeSubtype.value) =>
  category === 'community' ? `${category}:${subtype}` : category
const currentCacheKey = ref(getCacheKey())
const getCacheByKey = (key: string) => {
  if (!listCache[key]) listCache[key] = createCacheEntry()
  return listCache[key]
}
const getCurrentCache = () => getCacheByKey(getCacheKey())
// 消息列表数据
const listData = ref<getNotificationListResponse>(getCurrentCache().listData)
const syncCurrentCache = () => {
  const key = getCacheKey()
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
])
// 页面加载
// onLoad(() => {
//   loadMore()
// })

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

// 加载消息列表
const loadMore = (refresh = false) => {
  const requestCategory = activeCategory.value
  const requestSubtype = activeSubtype.value
  const requestKey = getCacheKey(requestCategory, requestSubtype)
  const cache = getCurrentCache()

  if (cache.loading) return
  if (refresh) resetCacheEntry(cache)

  cache.loading = true
  cache.state = 'loading'
  state.value = 'loading'
  uni.showLoading()
  // 传参：页码、分类
  getNotificationListApi(
    cache.listData.current_page + 1,
    cache.listData.per_page,
    requestCategory && requestCategory !== 'all' ? requestCategory : '',
    requestCategory === 'community' ? requestSubtype : undefined,
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
      if (getCacheKey() === requestKey) syncCurrentCache()
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
const handleSubtypeChange = (prop?: NotificationSubtype | { value?: NotificationSubtype }) => {
  saveCurrentScrollTop()
  if (typeof prop === 'string') {
    activeSubtype.value = prop
  } else if (prop?.value) {
    activeSubtype.value = prop.value
  }
  syncCurrentCache()
  restoreCurrentScrollTop()
  const cache = getCurrentCache()
  if (!cache.loaded) loadMore()
}
// 跳转到消息详情
const toDetail = (notificationItem: any) => {
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
      toUrl('/pages/cats/order/detail?order_no=' + orderNo)
      break
    case 'community':
      const { interactionTarget, rootPostId } = context
      /**
       *  rootPostId 所在帖子ID。
          interactionTarget：若 type === "Comment"，则 interactionTarget.id 定位被赞/被回复所在的那条评论ID；
          若 type === "Post"，则interactionTarget.id 是帖子ID。
       */
      switch (notificationItem?.subtype) {
        // 关注
        case 'follow':
          const { participantMemberId } = context
          toUrl('/pages/cats/user/home?member_id=' + participantMemberId)
          break
        // 点赞
        case 'like':
          const { type, id } = interactionTarget
          if (type === 'Comment')
            toUrl(`/pages/cats/social/detail?id=${rootPostId}&showComment=${true}&commentId=${id}`)
          else toUrl('/pages/cats/social/detail?id=' + id)
          break
        // 评论
        case 'comment':
          // 评论的话，都要跳到对应的评论，现在的评论只能评论帖子
          toUrl(
            `/pages/cats/social/detail?id=${rootPostId}&showComment=${true}&commentId=${context?.commentId}`,
          )
          break
        default:
          break
      }

      break
    case 'system':
      toUrl('/pages/cats/notification/detail?id=' + notificationItem.id)
      break
    default:
      break
  }
}
const handleMarkAsRead = (notificationItem: any) => {
  if (notificationItem?.is_read == 1) return
  handleMarkReadApi(notificationItem?.id).then((res) => {
    if (res.code === 1) {
      markNotificationReadInCache(notificationItem?.id)
      getNotificationUnreadCount()
      getUnreadByCategory()
    } else {
      toast.show(res.msg || t('common.error'))
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

// 跳转用户主页
const toUserHome = (memberId: number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}
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

:deep(.wd-tabs) {
  background-color: transparent;

  .wd-tabs__nav {
    position: fixed;
    // top: env(safe-area-inset-top);
    width: 100vw;
    left: 0;
    z-index: 1;
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
.com-emptyBox {
  padding-top: calc(104rpx + 180rpx);
  box-sizing: border-box;
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
    font-family:
      Alimama FangYuanTi VF,
      sans-serif;

    height: var(--wot-tabs-nav-height, 88rpx);
    .wd-tabs__nav-container {
      height: 100%;
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
::v-deep .wd-swipe-action__right {
  right: -2rpx;
}
:deep(.wd-badge__content) {
  background-color: var(--liberty-cats-primary-color);
}
</style>

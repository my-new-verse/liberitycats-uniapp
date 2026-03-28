<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
    enablePullDownRefresh: true, // 核心：开启下拉刷新
    onReachBottomDistance: 50, // 上拉加载触发距离（默认50rpx）
    pullDownRefresh: {
      color: '#ff4d4f', // 刷新动画颜色
      background: '#f7f6f4', // 刷新区域背景
    },
  },
}
</route>
<template>
  <!-- <page-meta :page-style="`overflow:${commentPopupVisible ? 'hidden' : 'visible'};`"></page-meta> -->
  <view class="page3" :class="[locale]">
    <custom-nav2 :title="t('notification.index.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <wd-tabs v-model="activeCategory" @click="handleCategoryChange" :line-width="20" swipeable>
          <wd-tab
            v-for="item in categoryList"
            :key="item.value"
            :title="`${item.label}`"
            :name="item.value"
            :badge-props="item.badgeProps"
          ></wd-tab>
        </wd-tabs>
        <!-- 消息列表内容 -->
        <view class="cnt">
          <view></view>
          <template v-if="listData.data.length > 0">
            <view class="messageItem" v-for="(item, index) in listData.data" :key="item.id">
              <wd-swipe-action>
                <MessageItem :message="item" @click="toDetail(item)"></MessageItem>
                <template #right>
                  <view class="button" style="background: #4d80f0" @click="handleMarkAsRead(item)">
                    {{ $t('notification.index.mark_read') }}
                  </view>
                  <!-- <view class="button" style="background: #fa4350" @click="handleDelete(item)">{{
                    $t('notification.index.delete') }}</view> -->
                </template>
              </wd-swipe-action>
            </view>
          </template>
          <template v-else>
            <view class="emptyBox">
              <view class="emptyImg"></view>
              <view class="emptyText">{{ t('common.empty') }}</view>
            </view>
          </template>
        </view>
        <!-- 分页加载 + 回到顶部 -->
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav2>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatTime, toUrl } from '@/utils'
import { useToast } from 'wot-design-uni'
// 滚动加载类型
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
// 消息中心接口&类型
import {
  getNotificationListApi,
  getUnreadCountApi,
  getUnreadByCategoryApi,
  getNotificationUnreadByCategoryApi,
  getNotificationUnreadCountApi,
  // markCategoryReadApi,
  getNotificationListResponse,
  UnreadByCategoryResponse,
  handleMarkReadApi,
} from '@/service/api/message'
import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'

import CommunityMessageItem from '@/components/message/CommunityMessageItem.vue'
import MallMessageItem from '@/components/message/MallMessageItem.vue'
import SystemMessageItem from '@/components/message/SystemMessageItem.vue'
import MessageItem from '@/components/message/MessageItem'
// 建立 category -> 组件 的映射
// const componentMap = {
//   community: CommunityMessageItem,
//   mall: MallMessageItem,
//   system: SystemMessageItem,
// } as const
// 语言标识
const locale = uni.getLocale()
const toast = useToast()

// 滚动到顶部监听
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

// 分页加载状态
const state = ref<LoadMoreState>('loading')
// 消息列表数据
const listData = ref<getNotificationListResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
  per_page: 15,
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
    label: t('notification.index.system'),
    value: 'system',
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
])
// 激活的分类
const activeCategory = ref<string>('all')
// 各分类未读数量
const unreadByCategory = ref<UnreadByCategoryResponse>({
  system: 0,
  community: 0,
  mall: 0,
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
  listData.value.data = []
  listData.value.current_page = 0
  listData.value.last_page = 1
  getUnreadByCategory()
  getNotificationUnreadCount()
  loadMore()
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
    if (res.data) {
      categoryList.value[0].badgeProps.modelValue = res.data
    }
  })
}
const getUnreadByCategory = () => {
  getUnreadByCategoryApi().then((res) => {
    if (res.data) {
      console.log(res)
      let { community, mall, system } = res.data
      categoryList.value[1].badgeProps.modelValue = system
      categoryList.value[2].badgeProps.modelValue = community
      categoryList.value[3].badgeProps.modelValue = mall
    }
  })
}

// 加载消息列表
const loadMore = () => {
  state.value = 'loading'
  uni.showLoading()
  // 传参：页码、分类
  getNotificationListApi(
    listData.value.current_page + 1,
    listData.value.per_page,
    activeCategory.value && activeCategory.value !== 'all' ? activeCategory.value : '',
  )
    .then((res) => {
      console.log(res)

      if (!res.data) return
      listData.value.data = listData.value.data.concat(res.data.data)
      listData.value.current_page = res.data.current_page
      listData.value.last_page = res.data.last_page
      // 加载完成
      if (listData.value?.current_page === res.data.last_page) {
        state.value = 'finished'
      }
      handleRefreshComplete()
    })
    .finally(() => {
      state.value = 'finished'
      uni.hideLoading()
    })
}

// 切换消息分类
const handleCategoryChange = (prop) => {
  // 重置列表重新加载
  listData.value.data = []
  listData.value.current_page = 0
  listData.value.last_page = 1
  loadMore()
}

// 跳转到消息详情
const toDetail = (notificationItem: any) => {
  let { category, context } = notificationItem
  switch (category) {
    case 'mall':
      let { orderNo } = context
      toUrl('/pages/cats/order/detail?order_no=' + orderNo)
      break
    case 'community':
      let { interactionTarget, rootPostId } = context
      /**
       *  rootPostId 所在帖子ID。
          interactionTarget：若 type === "Comment"，则 interactionTarget.id 定位被赞/被回复所在的那条评论ID；
          若 type === "Post"，则interactionTarget.id 是帖子ID。
       */
      switch (notificationItem?.subtype) {
        // 关注
        // case 'follow':
        //   break;
        // 点赞
        case 'like':
          let { type, id } = interactionTarget
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
  handleMarkAsRead(notificationItem)
}
const handleMarkAsRead = (notificationItem: any) => {
  if (notificationItem?.is_read == 1) return
  handleMarkReadApi(notificationItem?.id).then((res) => {
    let findIndex = listData.value.data.findIndex((item) => item.id === notificationItem?.id)
    listData.value.data[findIndex].is_read = 1
    getNotificationUnreadCount()
    getUnreadByCategory()
  })
}
const handleDelete = (notificationItem: any) => {}
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
  // 重置列表重新加载
  listData.value.data = []
  listData.value.current_page = 0
  listData.value.last_page = 1
  loadMore()
  // 设置超时保护，防止刷新状态无限挂起
  setTimeout(() => {
    if (isRefreshing.value && !refreshError.value) {
      console.log('Refresh timeout, forcing stop')
      handleRefreshComplete()
    }
  }, 10000) // 10 秒超时保护
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.page {
  background-color: var(--liberty-cats-page-background-color);
  min-height: 100vh;
}

// 自定义导航栏
.customNav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 998;
  width: 100%;
  overflow: hidden;
  height: calc(104rpx + var(--liberty-cats-page-common-border-radius) + env(safe-area-inset-top));

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    background-color: var(--liberty-cats-primary-color);
    padding-top: calc(env(safe-area-inset-top));
    overflow: hidden;

    .navCnt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 48rpx);
      height: 104rpx;
      padding: 0 24rpx;
      position: relative;

      /* 左侧返回 */
      .left {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        width: 64rpx;
        height: 44rpx;
        flex-shrink: 0;

        image {
          width: 44rpx;
          height: 44rpx;
        }
      }

      /* 中间标题 —— 真正居中 */
      .navTitle {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        top: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 60%;
        overflow: hidden;

        font-size: 34rpx;
        font-weight: 500;
        color: #ffffff;
        text-align: center;
        white-space: nowrap;
        text-overflow: ellipsis;

        &-text {
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      /* 右侧按钮组 */
      .rightBtns {
        display: flex;
        align-items: center;
        gap: 20rpx;
        /* 两个按钮之间的间距 */
        flex-shrink: 0;
      }

      .markReadBtn {
        font-size: 28rpx;
        color: #fff;
        white-space: nowrap;
      }
    }
  }

  .navBg {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: var(--liberty-cats-primary-color);

    .pbl2,
    .pbr2 {
      width: var(--liberty-cats-page-common-border-radius);
      height: var(--liberty-cats-page-common-border-radius);
      background-color: #f7f6f4;
      border-top-left-radius: var(--liberty-cats-page-common-border-radius);
    }

    .pbr2 {
      border-top-left-radius: 0;
      border-top-right-radius: var(--liberty-cats-page-common-border-radius);
    }
  }
}

// 分类Tab
.categoryTab {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 997;
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  height: 88rpx;
  background-color: #fff;
  border-bottom: 1rpx solid #eee;

  .tabItem {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 20rpx;

    .tabTxt {
      font-size: 28rpx;
      color: #666;
    }

    .badge {
      position: absolute;
      top: 16rpx;
      right: 0;
      min-width: 32rpx;
      height: 32rpx;
      line-height: 32rpx;
      padding: 0 8rpx;
      font-size: 20rpx;
      color: #fff;
      background-color: #ff6b03;
      border-radius: 16rpx;
      text-align: center;
    }

    &.active {
      .tabTxt {
        color: #ff6b03;
        font-weight: 600;
      }
    }
  }
}

// 列表内容
.cnt {
  // padding-right: 0px !important;
  // padding-left: 0px !important;
  // padding-right: 0px !important;
  padding-top: 88rpx !important;
}

.messageItem {
  // padding: 32rpx 24rpx;
  // margin-bottom: 24rpx;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  padding: 0;
  width: 100%;
  border-radius: 32rpx;
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
  // padding: 0 15px;
  // height: 100%;
  // color: white;
  // line-height: 100%;
}

:deep(.fixedBar) {
  background-color: #f7f6f4;
}

.page3 {
  position: relative;
  min-height: 100vh;
  background-color: #f7f6f4;
}

:deep(.wd-tabs) {
  background-color: transparent;

  .wd-tabs__nav {
    position: fixed;
    // top: env(safe-area-inset-top);
    width: 100vw;
    left: 0;
    z-index: 96;
    background-color: #f7f6f4;
  }
}

:deep(.mallTabs) {
  .wd-tabs__line {
    background: var(--liberty-cats-primary-color);
  }
}
</style>

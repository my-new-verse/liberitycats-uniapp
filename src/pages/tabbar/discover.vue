<!-- 使用 type="home" 属性设置首页，其他页面不需要设置，默认为page；推荐使用json5，更强大，且允许注释 -->
<route lang="json5">
{
  layout: 'default2',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%discover.page_title%',
    enablePullDownRefresh: true,
    backgroundTextStyle: 'dark',
    backgroundColor: '#f7f6f4', // 页面背景色
    navigationBarTextStyle: 'black', // 状态栏文字颜色
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
    class="page3"
    :class="[locale, isFixed ? 'is-fixed' : '']"
    :style="{ '--safe-top-rpx': safeTopRpx + 'rpx' }"
  >
    <view class="fixedBar" :style="{ height: safeTopRpx + 'rpx' }"></view>
    <wd-tabs
      v-model="activeTab"
      swipeable
      slidable="always"
      auto-line-width
      custom-class="mallTabs"
      @change="tabChange"
      :safe-top="safeTopRpx + 'rpx'"
    >
      <view class="content" style="padding-top: 0">
        <block v-for="item in tabs" :key="item">
          <wd-tab :title="item" :name="item">
            <view class="componentContent" :class="{ hidden: activeTab !== item }">
              <component
                v-if="activatedTabs.includes(item)"
                :is="tabComponents[item]"
                :state="getTabState(item)"
                @update:state="(state) => updateState(item, state)"
                @refresh-complete="handleRefreshComplete"
                @refresh-error="handleRefreshError"
                :cntPaddingTop="cntPaddingTop"
                @open-share="handleOpenShare"
              />
            </view>
          </wd-tab>
        </block>
      </view>
    </wd-tabs>
    <wd-loadmore :state="currentTabState" style="padding-bottom: 10rpx" />
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
    <SharePopup ref="shareRef" />
  </view>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { useUserStore } from '@/store/user'
import NewsTab from '@/components/discover/NewsTab.vue'
import QuotesTab from '@/components/discover/QuotesTab.vue'
import FiatTab from '@/components/discover/FiatTab.vue'
import SocialTab from '@/components/discover/SocialTab.vue'
import SharePopup from '@/components/SharePopup/SharePopup.vue'
const shareRef = ref<any>(null)
uni.hideTabBar()

const userStore = useUserStore()

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

const isFixed = ref<boolean>(false)
onMounted(() => {
  // 预加载liberty cats
  // plus.webview.prefetchURL('https://lcat8.com')
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 80
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value + 20

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)
  console.log('Platform:', systemInfo.platform)

  uni.$on('switchToSocialTab', () => {
    activeTab.value = t('discover.tabs.social')
  })
  uni.$on('switchToChildTab', (tab: string | number) => {
    if (tab === 'liberty') isFixed.value = true
    else isFixed.value = false
  })
})

onShow(() => {
  uni.$emit('discoverPageVisibilityChange', true)
  uni.$emit('discoverActiveTabChange', activeTab.value)
})

onHide(() => {
  uni.$emit('discoverPageVisibilityChange', false)
})

const handleOpenShare = (item: any) => {
  shareRef.value?.openSharePopup(item)
}

// 页面滚动
const scrollTop = ref(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const { t, locale } = useI18n()

// tabs
const tabs = computed(() => [
  t('discover.tabs.social'),
  t('discover.tabs.news'),
  t('discover.tabs.quotes'),
  t('discover.tabs.fiat'),
])
const activeTab = ref(t('discover.tabs.social'))
const activatedTabs = ref<string[]>([activeTab.value])

// tab组件映射
const tabComponents = computed(() => ({
  [t('discover.tabs.social')]: SocialTab,
  [t('discover.tabs.news')]: NewsTab,
  [t('discover.tabs.quotes')]: QuotesTab,
  [t('discover.tabs.fiat')]: FiatTab,
}))

const tabComponentNameMaps = computed(() => ({
  [t('discover.tabs.social')]: 'SocialTab',
  [t('discover.tabs.news')]: 'NewsTab',
  [t('discover.tabs.quotes')]: 'QuotesTab',
  [t('discover.tabs.fiat')]: 'FiatTab',
}))

// 按 tab 缓存加载状态，避免切换后触发重复请求
const tabStates = ref<Record<string, LoadMoreState>>({})
const currentTabState = computed<LoadMoreState>(() => tabStates.value[activeTab.value] || 'loading')
const getTabState = (tabName: string): LoadMoreState => tabStates.value[tabName] || 'loading'

const ensureTabState = (tabName: string) => {
  if (!tabStates.value[tabName]) {
    tabStates.value[tabName] = 'loading'
  }
}

const ensureTabActivated = (tabName: string) => {
  if (tabName && !activatedTabs.value.includes(tabName)) {
    activatedTabs.value.push(tabName)
  }
}

// 刷新状态追踪
const isRefreshing = ref(false)
const refreshError = ref(false)

// 更新加载状态
const updateState = (tabName: string, newState: LoadMoreState) => {
  tabStates.value[tabName] = newState
}

// 加载更多
const loadMore = () => {
  updateState(activeTab.value, 'loading')
}

// tab切换
const tabChange = (tabItem: any) => {
  if (tabItem.index !== 2) isFixed.value = false
}

const tabScrollTopMap = ref<Record<string, number>>({})
const restoreTabScroll = (tabName: string) => {
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: tabScrollTopMap.value[tabName] || 0,
      duration: 0,
    })
  })
}

watch(
  tabs,
  (newTabs) => {
    newTabs.forEach((tab) => {
      ensureTabState(tab)
    })
  },
  { immediate: true },
)

watch(activeTab, (newTab, oldTab) => {
  ensureTabState(newTab)
  ensureTabActivated(newTab)
  if (oldTab) {
    tabScrollTopMap.value[oldTab] = scrollTop.value
  }
  uni.$emit('discoverActiveTabChange', newTab)
  restoreTabScroll(newTab)
})

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

onUnmounted(() => {
  uni.$emit('discoverPageVisibilityChange', false)
  uni.$off('switchToSocialTab')
  uni.$off('switchToLibertyCatsTab')
  uni.$off('discoverActiveTabChange')
})

// 下拉刷新处理
onPullDownRefresh(() => {
  console.log('====== onPullDownRefresh triggered ======')
  console.log(
    'Current activeTab:',
    activeTab.value,
    `refresh${tabComponentNameMaps.value[activeTab.value]}Tab`,
  )
  isRefreshing.value = true
  refreshError.value = false
  // 发送刷新事件给当前激活的 tab
  uni.$emit(`refresh${tabComponentNameMaps.value[activeTab.value]}`)
  // 设置超时保护，防止刷新状态无限挂起
  setTimeout(() => {
    if (isRefreshing.value && !refreshError.value) {
      console.log('Refresh timeout, forcing stop')
      handleRefreshComplete()
    }
  }, 10000) // 10 秒超时保护
})
// 触发对应 tab 的分页加载
onReachBottom(() => {
  // 只有在非加载状态下才触发新的加载
  if (!['loading', 'finished'].includes(currentTabState.value)) {
    loadMore()
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.fixedBar) {
  background-color: #f7f6f4;
}

:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
}

.page3 {
  position: relative;
  min-height: 100vh;
  background-color: #f7f6f4;
}

.content {
  min-height: calc(100vh - 300rpx);
  padding-top: calc(var(--safe-top-rpx) + 100rpx);
}

:deep(.wd-tabs) {
  background-color: transparent;
  .wd-tabs__nav {
    position: fixed;
    top: var(--safe-top-rpx);
    left: 0;
    z-index: 96;
    background-color: #f7f6f4;
  }
}

:deep(.mallTabs) {
  .wd-tabs__nav {
    //padding: 0 32rpx;
    height: 80rpx;
  }
  .wd-tabs__line {
    height: 6rpx;
    border-radius: 4rpx;
  }
  .wd-tab {
    .componentContent {
      padding: 20rpx 32rpx;
    }
    .wd-tab__title {
      font-size: 32rpx;
      line-height: 44rpx;
    }
  }

  .wd-tabs__nav-item {
    font-size: 36rpx;
    font-weight: 400;
    line-height: 42rpx;
    color: #261000;
    &.is-active {
      .wd-tabs__nav-item-text {
        font-size: 36rpx;
        font-style: normal;
        font-weight: 600;
        line-height: 42rpx;
        color: var(--liberty-cats-primary-color);
      }
    }
  }

  .wd-tabs__line {
    background: var(--liberty-cats-primary-color);
  }
}

.hidden {
  display: none;
}
.is-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* 溢出隐藏，禁止内部滚动 */
  overflow: hidden;
  /* 保留你原来的背景色，删除 min-height: 100vh（和 fixed 冲突） */
  background-color: #f7f6f4;
  /* 层级拉满，防止被其他元素覆盖 */
  z-index: 999;
  height: 100vh;
}
</style>

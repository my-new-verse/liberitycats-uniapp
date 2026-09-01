<!-- 使用 type="home" 属性设置首页，其他页面不需要设置，默认为page；推荐使用json5，更强大，且允许注释 -->
<route lang="json5">
{
  layout: 'default2',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
    navigationBarTextStyle: 'black', // 状态栏文字颜色
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
    class="bg-white overflow-hidden page3"
    :class="[locale]"
    :style="{ '--safe-top-rpx': safeTopRpx + 'rpx' }"
  >
    <view class="fixedBar" :style="{ height: safeTopRpx + 'rpx' }"></view>
    <view
      class="search"
      :style="{ top: navHeaderPaddingTop + 'rpx' }"
      @click="toUrl('/pages/cats/goods/search')"
    >
      <view class="searchIcon"></view>
    </view>
    <wd-tabs
      v-if="tabList.length > 0"
      v-model="currentTabName"
      swipeable
      slidable="always"
      auto-line-width
      custom-class="mallTabs"
      @change="tabChange"
      :safe-top="safeTopRpx + 'rpx'"
    >
      <block v-for="item in tabList" :key="item">
        <wd-tab :title="`${item}`" :name="item">
          <view class="content" style="padding-top: 0">
            <view class="filterBox" :style="{ height: cntPaddingTop + 64 + 'rpx' }">
              <view
                class="filterItem active"
                @click="
                  handleFilterChange(mallFilter.search, mallFilter.order === 'asc' ? 'desc' : 'asc')
                "
              >
                <view>{{ t('common.price') }}</view>
                <view
                  class="updown"
                  :class="{ down: mallFilter.order === 'desc', up: mallFilter.order === 'asc' }"
                ></view>
              </view>
              <view
                class="filterItem"
                :class="{ active: mallFilter.search === 'new' }"
                @click="handleFilterChange('new', mallFilter.order)"
              >
                {{ t('common.new') }}
              </view>
              <view
                class="filterItem"
                :class="{ active: mallFilter.search === 'hot' }"
                @click="handleFilterChange('hot', mallFilter.order)"
              >
                {{ t('common.popularity') }}
              </view>
            </view>

            <template v-if="goodsList.data.length > 0">
              <view class="goodsBox" :style="{ paddingTop: cntPaddingTop + 64 + 32 + 'rpx' }">
                <view
                  class="goodsItem"
                  v-for="item in goodsList.data"
                  :key="item.id"
                  @click="toUrl('/pages/cats/goods/detail?goods_id=' + item.id)"
                >
                  <view class="goodsImg">
                    <view class="tag" v-if="item.tags.length > 0">{{ item.tags[0].tag_name }}</view>
                    <!-- <view
                      class="goodsLike"
                      :class="{ active: item.is_favorite }"
                      @click.stop="addFavorite(item.id)"
                    >
                      <view class="like"></view>
                    </view> -->
                    <image class="cover" :src="getImageUrl(item.cover)" mode="widthFix"></image>
                  </view>
                  <view class="goodsInfo">
                    <view class="name">{{ item.title }}</view>
                    <view class="priceBox">
                      <view class="icon">
                        <image :src="getImageUrl(item.currency.icon)" alt="" />
                      </view>
                      <view class="price">{{ item.sale_price }}</view>
                      <view class="unit">{{ item.currency.unit }}</view>
                    </view>
                  </view>
                </view>
              </view>
            </template>
            <template v-else-if="activeMallCache.hasLoaded">
              <view class="emptyBox">
                <view class="emptyImg"></view>
                <view class="emptyText">{{ t('common.empty') }}</view>
              </view>
            </template>
          </view>
        </wd-tab>
      </block>
    </wd-tabs>

    <wd-loadmore :state="state" @reload="loadMore" />
    <wd-backtop :scrollTop="scrollTop"></wd-backtop>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, toUrl } from '@/utils'
import CryptoJS from 'crypto-js'
import { addFavoriteApi, getMallGoodsListApi, MallGoodsListResponse } from '@/service/api/goods'

import { getGoodsCategoryApi, getGoodsCategoryApiResponse } from '@/service/api/mall'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { useUserStore } from '@/store/user'
import { useToast } from 'wot-design-uni'
uni.hideTabBar()
const userStore = useUserStore()
const toast = useToast()

// 语言
const locale = uni.getLocale()
defineOptions({
  name: 'Mall',
})

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)
const searchTop = ref<number>(0)

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value + 20
  cntPaddingTop.value = navHeight.value - 20
  searchTop.value = safeTopRpx.value + 40

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)
})

const tabList = ref<string[]>([])
const currentTabName = ref('')
const currentTabIndex = ref(0)

const filterIndex = ref(0)

type MallFilterSearch = '' | 'new' | 'hot' | string
type MallFilterOrder = 'asc' | 'desc' | string
type MallFilter = {
  order: MallFilterOrder
  search: MallFilterSearch
}
type MallCache = {
  goodsList: MallGoodsListResponse
  filter: MallFilter
  state: LoadMoreState
  scrollTop: number
  hasLoaded: boolean
  isLoading: boolean
}

const createGoodsList = (): MallGoodsListResponse => ({
  current_page: 0,
  data: [],
  last_page: 1,
  hash: '',
})

const createMallCache = (filter: MallFilter = { order: 'desc', search: '' }): MallCache => ({
  goodsList: createGoodsList(),
  filter: { ...filter },
  state: 'loading',
  scrollTop: 0,
  hasLoaded: false,
  isLoading: false,
})

const goodsList = ref<MallGoodsListResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
  hash: '',
})

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')
const mallCacheMap = ref<Record<string, MallCache>>({})

const MALL_REFRESH_EVENT = 'mall:refresh'

const categoryList = ref<getGoodsCategoryApiResponse[]>([])
onLoad(() => {
  getGoodsCategoryApi().then((res) => {
    categoryList.value = res.data
    categoryList.value.forEach((item, index) => {
      tabList.value.push(item.name)
      if (index === 0) {
        currentTabIndex.value = index
        currentTabName.value = item.name
      }
    })
    syncActiveCache()
    if (!activeMallCache.value.hasLoaded) {
      loadMore()
    }
  })
  uni.$on(MALL_REFRESH_EVENT, handleMallRefresh)
})

const handleMallRefresh = () => {
  const currentCategory = getActiveCategory()
  if (!currentCategory) return
  const cache = activeMallCache.value
  if (cache.isLoading) return
  loadMore(true)
}

onUnmounted(() => {
  uni.$off(MALL_REFRESH_EVENT, handleMallRefresh)
})

onReachBottom(() => {
  if (goodsList.value.current_page < goodsList.value.last_page && state.value !== 'loading') {
    loadMore()
  }
})

const mallFilter = reactive<MallFilter>({
  order: 'desc',
  search: '',
})

const getActiveCategory = () => categoryList.value[currentTabIndex.value]
const getFilterKey = (filter = mallFilter) => `${filter.search || 'default'}:${filter.order}`
const getMallCacheKey = (categoryId = getActiveCategory()?.id, filter = mallFilter) => {
  return `${categoryId || 'unknown'}:${getFilterKey(filter)}`
}
const activeMallCache = computed(() => getMallCache(getMallCacheKey()))

const getMallCache = (cacheKey: string) => {
  if (!mallCacheMap.value[cacheKey]) {
    mallCacheMap.value[cacheKey] = createMallCache({ ...mallFilter })
  }
  return mallCacheMap.value[cacheKey]
}

const syncActiveCache = () => {
  const cache = activeMallCache.value
  goodsList.value = cache.goodsList
  state.value = cache.state
  mallFilter.search = cache.filter.search
  mallFilter.order = cache.filter.order
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

const saveActiveScrollTop = async () => {
  activeMallCache.value.scrollTop = await getPageScrollTop()
}

const restoreCacheScrollTop = (cache: MallCache) => {
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: cache.hasLoaded ? cache.scrollTop || 0 : 0,
      duration: 0,
    })
  })
}

const applyMallCache = (cache: MallCache) => {
  goodsList.value = cache.goodsList
  state.value = cache.state
  mallFilter.search = cache.filter.search
  mallFilter.order = cache.filter.order
}

const handleFilterChange = async (search: string, order: string) => {
  await saveActiveScrollTop()
  // filterIndex.value = index
  const nextFilter = { search, order }
  const cache = getMallCache(getMallCacheKey(getActiveCategory()?.id, nextFilter))
  cache.filter = { ...nextFilter }
  applyMallCache(cache)
  restoreCacheScrollTop(cache)
  if (!cache.hasLoaded) {
    loadMore()
  }
}

// 创建一个函数来生成请求参数的hash
const createRequestHash = (params: any) => {
  const sortedParams = Object.entries(params)
    .sort(([key1], [key2]) => key1.localeCompare(key2))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  // 使用 MD5 生成哈希值
  return CryptoJS.MD5(sortedParams).toString()
}

const clickCount = ref(0)

const loadMore = async (refresh = false) => {
  const currentCategory = getActiveCategory()
  if (!currentCategory) return

  const cache = activeMallCache.value
  if (cache.isLoading) return

  if (refresh) {
    cache.goodsList = createGoodsList()
    cache.hasLoaded = false
    goodsList.value = cache.goodsList
  }

  cache.isLoading = true
  cache.state = 'loading'
  state.value = 'loading'
  const currentCategoryId = currentCategory.id
  clickCount.value += 1
  const requestClickCount = clickCount.value
  const params = {
    category_id: currentCategoryId,
    ...cache.filter,
    abc: requestClickCount,
  }

  // 生成请求参数的hash
  const requestHash = createRequestHash(params)

  params.hash = requestHash
  params.page = cache.goodsList.current_page + 1

  if (!isRefreshing.value) {
    uni.showLoading()
  }

  return getMallGoodsListApi(params)
    .then((res) => {
      if (!res.data) return
      const newParam = {
        category_id: currentCategoryId,
        ...cache.filter,
        abc: requestClickCount,
      }
      const newHash = createRequestHash(newParam)
      if (newHash === res.data.hash) {
        cache.goodsList.data = cache.goodsList.data.concat(res.data.data)
        cache.goodsList.current_page = res.data.current_page
        cache.goodsList.last_page = res.data.last_page
        cache.goodsList.hash = res.data.hash
        cache.hasLoaded = true
      }

      cache.state =
        cache.goodsList.current_page >= cache.goodsList.last_page ? 'finished' : 'success'
      if (activeMallCache.value === cache) {
        goodsList.value = cache.goodsList
        state.value = cache.state
      }
    })
    .catch((error) => {
      cache.state = 'error'
      if (activeMallCache.value === cache) {
        state.value = 'error'
      }
      throw error
    })
    .finally(() => {
      cache.isLoading = false
      uni.hideLoading()
    })
}

const tabChange = async (e) => {
  await saveActiveScrollTop()
  currentTabIndex.value = e.index
  currentTabName.value = e.name

  filterIndex.value = 0
  mallFilter.search = ''
  mallFilter.order = 'desc'

  const cache = activeMallCache.value
  applyMallCache(cache)
  restoreCacheScrollTop(cache)
  if (!cache.hasLoaded) {
    loadMore()
  }
}

// 添加收藏
const addFavorite = (goodsId: number) => {
  if (!userStore.isLogin) {
    toast.show(t('common.toast.pleaseLogin'))
  } else {
    addFavoriteApi(goodsId).then((res) => {
      if (res.code === 1) {
        if (res.data === 1) {
          toast.show(t('common.toast.add_favorites_success'))
        } else {
          toast.show(t('common.toast.cancel_favorites_success'))
        }
        goodsList.value.data.forEach((item) => {
          if (item.id === goodsId) {
            item.is_favorite = res.data
          }
          return item
        })
      }
    })
  }
}

// 刷新状态追踪
const isRefreshing = ref(false)
const refreshError = ref(false)
// 下拉刷新处理
onPullDownRefresh(async () => {
  const startTime = Date.now()
  isRefreshing.value = true
  refreshError.value = false

  const minWaitTime = 1000 // 最少显示1秒
  const maxWaitTime = 5000 // 最多等待5秒

  try {
    // 执行数据加载
    const categoryRes = await getGoodsCategoryApi()
    categoryList.value = categoryRes.data
    tabList.value = categoryRes.data.map((item) => item.name)

    // 如果当前选中的分类已不存在，重置到第一个
    const currentStillExists = categoryRes.data.some((item) => item.name === currentTabName.value)
    if (!currentStillExists && categoryRes.data.length > 0) {
      currentTabIndex.value = 0
      currentTabName.value = categoryRes.data[0].name
      syncActiveCache()
      if (!activeMallCache.value.hasLoaded) {
        await loadMore()
      }
    } else {
      await loadMore(true)
    }

    // 计算已用时间
    const elapsed = Date.now() - startTime
    // 计算需要等待的剩余时间（至少1秒，最多5秒）

    const remainingTime = Math.max(0, minWaitTime - elapsed)
    // 如果已经超过最大等待时间，立即结束
    if (elapsed >= maxWaitTime) {
      handleRefreshComplete()
      return
    }

    // 设置定时器，确保至少显示1秒
    setTimeout(() => {
      handleRefreshComplete()
    }, remainingTime)

    // 设置超时保护，确保不会无限等待
    setTimeout(() => {
      if (isRefreshing.value) {
        console.log('Refresh timeout, forcing stop')
        handleRefreshComplete()
      }
    }, maxWaitTime)
  } catch (error) {
    console.error('刷新出错:', error)
    refreshError.value = true
    const elapsed = Date.now() - startTime
    const remainingTime = Math.max(0, minWaitTime - elapsed)
    setTimeout(() => {
      handleRefreshComplete()
    }, remainingTime)
  }
})

// 处理刷新完成
const handleRefreshComplete = () => {
  if (isRefreshing.value) {
    uni.stopPullDownRefresh()
    isRefreshing.value = false
    refreshError.value = false
  }
}

// 处理刷新错误
const handleRefreshError = () => {
  refreshError.value = true
  handleRefreshComplete()
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/goods';
.content {
  min-height: calc(100vh - 300rpx);
  padding: 40rpx;
  padding-top: calc(var(--safe-top-rpx) + 100rpx);
  background-color: var(--bg-card);
}

:deep(.page-container) {
  background-color: var(--bg-card);
}

.page3 {
  background-color: var(--bg-card);
  .search {
    position: fixed;
    top: 16rpx;
    right: 24rpx;
    z-index: 98;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48rpx;
    height: 48rpx;
    background-color: var(--bg-card);
  }
  .searchIcon {
    width: 48rpx;
    height: 48rpx;
    background-color: var(--text-primary);
    -webkit-mask: url('@/static/images/search.svg') no-repeat center / 100% 100%;
    mask: url('@/static/images/search.svg') no-repeat center / 100% 100%;
  }
}

:deep(.mallTabs) {
  .wd-sticky__container {
    top: 0 !important;
    background: var(--bg-card);
  }
  .wd-tabs__nav-item-text {
    font-size: calc(36rpx * var(--font-scale));
    font-style: normal;
    font-weight: 400;
    line-height: calc(42rpx * var(--font-scale));
    color: var(--text-primary);
  }
  .wd-tabs__nav-item.is-active {
    .wd-tabs__nav-item-text {
      font-size: calc(36rpx * var(--font-scale));
      font-style: normal;
      font-weight: 600;
      line-height: calc(42rpx * var(--font-scale));
      color: var(--liberty-cats-primary-color);
    }
  }

  .wd-tabs__line {
    background: var(--liberty-cats-primary-color);
  }

  .wd-tabs__map-btn {
    right: 40px;
  }

  .wd-tabs__map-nav-btn.is-active {
    color: var(--liberty-cats-primary-color);
    border-color: var(--liberty-cats-primary-color);
  }

  .wd-tabs__nav {
    position: fixed;
    top: var(--safe-top-rpx);
    right: 0;
    left: 0;
    z-index: 96;
    background: var(--bg-card);
  }
}
:deep(.wd-tabs) {
  .wd-tabs__nav--wrap {
    padding-right: 90rpx;
  }
}
:deep(.wd-tabs.is-map) {
  .wd-tabs__nav--wrap {
    padding-right: 140rpx;
  }
}

.filterBox {
  display: flex;
  align-items: center;
  justify-content: start;
  // height: 64rpx;
  margin-bottom: 32rpx;
  position: fixed;
  width: 100vw;
  z-index: 90;
  background-color: var(--bg-card); // 必须设置背景色，否则滚动时下方内容会透出来
  align-items: flex-end;
  padding-bottom: 24rpx;
  //color: #999;
  //background-color: #efefef;

  &.fixed-filter {
    position: fixed;
    left: 0;
    right: 0;
    z-index: 95;
    padding: 0 40rpx;
    background-color: var(--bg-card);
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
  }

  .filter-placeholder {
    height: 64rpx;
    margin-bottom: 32rpx;
  }

  .filterItem {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    font-size: calc(28rpx * var(--font-scale));
    font-weight: 400;
    line-height: calc(33rpx * var(--font-scale));
    color: #999999;

    .updown {
      width: 20rpx;
      height: 32rpx;
      margin-top: -6rpx;
      margin-left: 4rpx;
      background: url('/static/images/updown.svg') no-repeat center center / 16rpx 32rpx;
    }

    .updown.down {
      margin-top: 4rpx;
      transform: rotate(180deg) rotateY(180deg);
    }

    .updown.up {
      //margin-top: 1rpx;
      //transform: rotate(180deg) rotateY(180deg);
    }
  }
  .filterItem.active {
    font-weight: 500;
    color: var(--liberty-cats-primary-color);

    .updown.down {
      margin-top: -6rpx;
      background: url('/static/images/updown_active.svg') no-repeat center center / 16rpx 32rpx;
      transform: rotate(0deg) rotateY(0deg);
    }

    .updown.up {
      margin-top: 4rpx;
      background: url('/static/images/updown_active.svg') no-repeat center center / 16rpx 32rpx;
      transform: rotate(180deg) rotateY(180deg);
    }
  }
}
</style>

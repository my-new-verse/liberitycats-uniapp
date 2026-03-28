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
      <image src="/static/images/search.png" mode="widthFix" />
    </view>
    <wd-tabs
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
          <view class="content" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
            <view class="filterBox">
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
              <view class="goodsBox">
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
            <template v-else>
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
    loadMore()
  })
})

onReachBottom(() => {
  if (goodsList.value.current_page < goodsList.value.last_page) {
    loadMore()
  }
})

const mallFilter = reactive({
  order: 'desc',
  search: '',
})

const handleFilterChange = (search: string, order: string) => {
  // filterIndex.value = index
  mallFilter.search = search
  mallFilter.order = order

  goodsList.value.current_page = 0
  goodsList.value.data = []
  loadMore()
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

const loadMore = () => {
  state.value = 'loading'
  const currentCategoryId = categoryList.value[currentTabIndex.value].id
  clickCount.value += 1
  const params = {
    category_id: currentCategoryId,
    ...mallFilter,
    abc: clickCount.value,
  }

  // 生成请求参数的hash
  const requestHash = createRequestHash(params)

  params.hash = requestHash
  params.page = goodsList.value?.current_page + 1

  if (!isRefreshing.value) {
    uni.showLoading()
  }

  getMallGoodsListApi(params)
    .then((res) => {
      if (!res.data) return
      const newParam = {
        category_id: currentCategoryId,
        ...mallFilter,
        abc: clickCount.value,
      }
      const newHash = createRequestHash(newParam)
      if (newHash === res.data.hash) {
        goodsList.value.data = goodsList.value.data.concat(res.data.data)
        goodsList.value.current_page = res.data.current_page
        goodsList.value.last_page = res.data.last_page
      }

      if (goodsList.value?.current_page === goodsList.value?.last_page) {
        state.value = 'finished'
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
}

const tabChange = (e) => {
  currentTabIndex.value = e.index
  currentTabName.value = e.name

  mallFilter.search = ''
  mallFilter.order = 'desc'
  filterIndex.value = 0

  goodsList.value.current_page = 0
  goodsList.value.data = []
  loadMore()
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
    goodsList.value.current_page = 0
    goodsList.value.data = []
    await loadMore()

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
}

.page3 {
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
    background-color: #ffffff;
  }
}

:deep(.mallTabs) {
  .wd-sticky__container {
    top: 0 !important;
    background: #ffffff;
  }
  .wd-tabs__nav-item-text {
    font-size: 36rpx;
    font-style: normal;
    font-weight: 400;
    line-height: 42rpx;
    color: #261000;
  }
  .wd-tabs__nav-item.is-active {
    .wd-tabs__nav-item-text {
      font-size: 36rpx;
      font-style: normal;
      font-weight: 600;
      line-height: 42rpx;
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
    background: #ffffff;
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
  height: 64rpx;
  margin-bottom: 32rpx;
  //color: #999;
  //background-color: #efefef;
  .filterItem {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;
    font-size: 28rpx;
    font-weight: 400;
    line-height: 33rpx;
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

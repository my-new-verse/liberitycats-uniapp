<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%goods.search.page_title%',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
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
              :placeholder="t('goods.search.searchInput.placeholder')"
              :no-border="true"
              custom-class="searchInput"
              confirm-type="search"
              @confirm="search"
              @focus="isClickSearchBtn = false"
              :ignoreCompositionEvent="false"
            />
            <wd-button custom-class="searchBtn" @click="search">
              {{ t('goods.search.btn_txt') }}
            </wd-button>
          </view>
        </view>
      </view>
      <view class="navBg">
        <view class="pbl2">
          <view class="fbg"></view>
        </view>
        <view class="pbr2">
          <view class="fbg"></view>
        </view>
      </view>
    </view>

    <view class="cnt" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <template v-if="searchText === '' || isClickSearchBtn === false">
        <view class="hotKey">
          <view class="key">{{ t('goods.search.recommand.search_keywords') }}</view>
          <view class="list">
            <view
              class="item"
              v-for="item in recommendSearchKeywordList"
              :key="item.id"
              @click="recommendSearch(item.name)"
            >
              {{ item.name }}
            </view>
          </view>
        </view>
      </template>
      <template v-else>
        <template v-if="searchResult.data.length > 0">
          <view class="goodsBox">
            <view
              class="goodsItem"
              v-for="item in searchResult.data"
              :key="item.id"
              @click="toUrl('/pages/cats/goods/detail?goods_id=' + item.id)"
            >
              <view class="goodsImg">
                <view class="tag" v-if="item.tags.length > 0">{{ item.tags[0].tag_name }}</view>
                <!-- <view
                    class="goodsLike"
                    :class="{ active: item.is_favorite }"
                    @click.stop="addFavorite(item)"
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
      </template>
    </view>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, toUrl } from '@/utils'
import {
  getSearchListByKeywordApi,
  getSearchListByKeywordResponse,
  getMallSearchPopularKeywordsApi,
  MallSearchPopularKeywords,
} from '@/service/api/goods'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { useToast } from 'wot-design-uni'
// 语言
const locale = uni.getLocale()
const toast = useToast()

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

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
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)

  // 获取热门搜索关键词
  getMallSearchPopularKeywordsApi().then((res) => {
    if (res.data) {
      recommendSearchKeywordList.value = res.data || []
    }
  })
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

const searchText = ref<string>('')
const searchResult = ref<getSearchListByKeywordResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

onReachBottom(() => {
  if (searchResult.value?.current_page < searchResult.value?.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  if (isLoading.value) return
  isLoading.value = true
  state.value = 'loading'
  getSearchListByKeywordApi(searchText.value, searchResult.value?.current_page + 1)
    .then((res) => {
      if (!res.data) return
      searchResult.value.data = searchResult.value.data.concat(res.data.data)
      searchResult.value.current_page = res.data.current_page
      searchResult.value.last_page = res.data.last_page
      if (searchResult.value?.current_page === searchResult.value?.last_page) {
        state.value = 'finished'
      }
    })
    .finally(() => {
      isLoading.value = false
    })
}

const isClickSearchBtn = ref<boolean>(false)

const isLoading = ref(false)
const search = () => {
  if (searchText.value === '') {
    toast.show(t('common.pleaseEnterSearch'))
    return
  }
  if (isLoading.value) return
  searchResult.value.data = []
  searchResult.value.current_page = 0
  searchResult.value.last_page = 1
  isClickSearchBtn.value = true
  loadMore()
}

const recommendSearchKeywordList = ref<MallSearchPopularKeywords[]>([])

const recommendSearch = (keyword: string) => {
  searchText.value = keyword
  search()
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/goods';

.page {
  background-color: var(--bg-card);
}

.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 999;
  width: 100%;
  height: calc(104rpx + var(--liberty-cats-page-common-border-radius) + env(safe-area-inset-top));
  overflow: hidden;

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    padding-top: calc(env(safe-area-inset-top));
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);

    .navCnt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 48rpx);
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
        width: calc(100% - 48rpx - 16rpx - 12rpx);
        height: 56rpx;
        padding: 6rpx;
        background-color: var(--bg-card);
        border-radius: 34rpx;

        .searchBtn {
          width: 162rpx;
          min-width: 0;
          height: 56rpx;
          padding: 0;
          background-color: var(--liberty-cats-primary-color);
          border-radius: 34rpx;
        }
        .searchInput {
          display: flex;
          align-items: center;
          width: calc(100% - 162rpx - 24rpx);
          height: 100%;
          margin-left: 24rpx;
        }
      }
    }
  }

  .navBg {
    position: relative;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: transparent;

    .pbl2,
    .pbr2 {
      position: absolute;
      top: 0;
      z-index: 9;
      width: var(--liberty-cats-page-common-border-radius);
      height: var(--liberty-cats-page-common-border-radius);
      overflow: hidden;
      background-color: var(--liberty-cats-primary-color);

      .fbg {
        width: 100%;
        height: 100%;
        background-color: var(--bg-card);
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

.hotKey {
  padding: 32rpx 0;
  .key {
    font-size: calc(28rpx * var(--font-scale));
    font-style: normal;
    font-weight: 400;
    line-height: calc(33rpx * var(--font-scale));
    color: var(--text-black);
  }
  .list {
    margin-top: 48rpx;
    .item {
      display: inline-block;
      padding: 16rpx 24rpx;
      margin-right: 24rpx;
      margin-bottom: 24rpx;
      font-size: calc(28rpx * var(--font-scale));
      font-style: normal;

      font-weight: 400;
      line-height: calc(33rpx * var(--font-scale));
      color: var(--text-secondary);
      border: 1rpx solid var(--item-border-color);
      border-radius: 34rpx;
    }
  }
}

.goodsBox {
  margin-top: 32rpx;
}
</style>

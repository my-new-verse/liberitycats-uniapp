<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('my.wishlist.page_title')">
      <template #default>
        <template v-if="favoriteList.data.length > 0">
          <view class="goodsBox">
            <view
              class="goodsItem"
              v-for="item in favoriteList.data"
              :key="item.goods_id"
              @click="toUrl('/pages/cats/goods/detail?goods_id=' + item.goods_id)"
            >
              <view class="goodsImg">
                <view class="tag" v-if="item.tags.length > 0">{{ item.tags[0].tag_name }}</view>
                <view
                  class="goodsLike"
                  :class="{ active: item.is_favorite }"
                  @click.stop="addFavorite(item)"
                >
                  <view class="like"></view>
                </view>
                <image class="cover" :src="getImageUrl(item.cover)" mode="widthFix"></image>
              </view>
              <view class="goodsInfo">
                <view class="name">{{ item.title }}</view>
                <view class="priceBox">
                  <view class="icon">
                    <image :src="getImageUrl(item.currency.icon)" alt="" />
                  </view>
                  <view class="price">{{ item.price }}</view>
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
      <template #footer>
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import {
  addFavoriteApi,
  getMyFavoriteListApi,
  GoodFavoriteList,
  MyFavoriteListResponse,
} from '@/service/api/goods'
import { useUserStore } from '@/store/user'
import { useToast } from 'wot-design-uni'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

import { getImageUrl, toUrl } from '@/utils'

const userStore = useUserStore()
const toast = useToast()
// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

onLoad(() => {
  loadMore()
})

const favoriteList = ref<MyFavoriteListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
})

onReachBottom(() => {
  if (favoriteList.value.current_page < favoriteList.value.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  state.value = 'loading'
  getMyFavoriteListApi(favoriteList.value?.current_page + 1).then((res) => {
    if (!res.data) return
    favoriteList.value.data = favoriteList.value.data.concat(res.data.data)
    favoriteList.value.current_page = res.data.current_page
    favoriteList.value.last_page = res.data.last_page
    if (favoriteList.value?.current_page === favoriteList.value?.last_page) {
      state.value = 'finished'
    }
  })
}

// 添加收藏
const addFavorite = (item: GoodFavoriteList) => {
  if (!userStore.isLogin) {
    toast.show(t('common.toast.pleaseLogin'))
  } else {
    addFavoriteApi(item.goods_id, item.sku_id).then((res) => {
      if (res.code === 1) {
        if (res.data === 1) {
          toast.show(t('common.toast.add_favorites_success'))
        } else {
          toast.show(t('common.toast.cancel_favorites_success'))
        }
        favoriteList.value.data = favoriteList.value.data.map((i) => {
          if (i.goods_id === item.goods_id) {
            i.is_favorite = res.data
          }
          return i
        })
      }
    })
  }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/goods';
:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

.page {
  background-color: var(--bg-card);
  .pbl,
  .pbr {
    .fbg {
      background-color: var(--bg-card);
    }
  }
}

// 特大字号档（1.5x）溢出适配：仅挂 font-scale-xlarge 类时生效，1 倍样式保持原样
// 商品信息区写死 80rpx 高度装不下放大后的文字，改为内容撑开，卡片高度同步放开
.font-scale-xlarge {
  .goodsBox {
    .goodsItem {
      height: auto;
    }
    .goodsInfo {
      height: auto;
    }
  }
}
</style>

<route lang="json5" type="home">
{
  layout: 'default2',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%home.page_title%',
  },
}
</route>

<template>
  <view class="page-content" :class="[locale]">
    <scroll-view
      scroll-y
      class="home-all-scroll-view"
      :refresher-enabled="false"
      :refresher-triggered="isRefreshing"
      @refresherrefresh="onRefresh"
      :refresher-threshold="140"
    >
      <view class="homeHeadBox" :style="{ height: headBoxHeight }">
        <view class="userInfoBox" :style="{ paddingTop: userInfoBoxPaddingTop }">
          <view class="username">
            <view>{{ t('home.say_hi_prefix') }}</view>
            <view style="word-break: break-all">
              {{ userStore.userInfo.nickname || t('home.un_login_nickname') }}
            </view>
          </view>
          <view class="message" @click="toUrl('/pages/cats/message/index', true)">
            <view class="msgDot" v-if="unreadCount > 0">
              <view>{{ unreadCount > 99 ? 99 : unreadCount }}</view>
              <view v-if="unreadCount > 99">+</view>
            </view>
            <image src="/static/images/message@2x.png" class="w-48rpx h-48rpx" alt="" />
          </view>
        </view>
        <wd-swiper
          :list="topBannerList"
          v-model:current="current"
          :indicator="{ type: 'dots-bar' }"
          height="978rpx"
          custom-class="homeSwiper"
        ></wd-swiper>
      </view>
      <view class="cntBox">
        <view class="cnt1">
          <view class="commonTitleBox">
            <view class="title navTitle">
              <image src="/static/images/hot@2x.png" class="tb" alt="" />
              {{ t('home.title.newArrivals') }}
            </view>
            <view class="more" @click="toMall">
              <view>{{ t('common.title.more') }}</view>
              <view><image src="/static/images/more@2x.png" class="moreIcon" alt="" /></view>
            </view>
          </view>
          <view class="hotSelling">
            <scroll-view
              class="scrollGoodsBox"
              :scroll-x="true"
              scroll-left="0"
              :show-scrollbar="false"
            >
              <template v-if="goodsListByTag && goodsListByTag.length > 0">
                <view
                  class="scrollGoodsItem"
                  @click="toUrl('/pages/cats/goods/detail?goods_id=' + item.id)"
                  v-for="(item, index) in goodsListByTag"
                  :key="index"
                >
                  <view class="goodsImg">
                    <view class="goodsTag" v-if="item.tags && item.tags.length > 0">
                      {{ item.tags[0].tag_name }}
                    </view>
                    <!-- <view
                    class="goodsLike"
                    :class="{ active: item.is_favorite }"
                    @click.stop="addFavorite(item.id, $event)"
                  >
                    <view class="like"></view>
                  </view> -->
                    <image :src="getImageUrl(item.cover)" class="w-100% h-100%" alt="" />
                  </view>
                  <view class="goodsInfo">
                    <view class="name">
                      {{ item.title }}
                    </view>
                    <view class="priceBox">
                      <view class="icon">
                        <image :src="getImageUrl(item.currency.icon)" alt="" />
                      </view>
                      <view class="price">{{ item.sale_price }}</view>
                      <view class="unit">{{ item.currency.unit }}</view>
                    </view>
                  </view>
                </view>
              </template>
              <template v-else>
                <view class="goodsLoadingBox">
                  <wd-loading color="#ff6b03" />
                </view>
              </template>
            </scroll-view>
          </view>
          <!-- 群聊start -->
          <!-- <view class="commonTitleBox">
            <view class="title navTitle">
              <image src="/static/images/nft@2x.png" class="tb" alt="" />
              {{ t('home.title.groupChat') }}
            </view>
          </view>

          <view class="activityBox" v-if="chatRoomList.length">
            <image
              :src="getImageUrl(chatRoomList[0].banner_image)"
              class="activityImg"
              @click="toChatGroup()"
            />
          </view> -->
          <view class="commonTitleBox">
            <view class="title navTitle">
              <image src="/static/images/nft@2x.png" class="tb" alt="" />
              {{ t('home.title.nftTradings') }}
            </view>
            <!-- <view class="more">
            <view>{{ t('common.title.more') }}</view>
            <view><image src="/static/images/more@2x.png" class="moreIcon" alt="" /></view>
          </view> -->
          </view>

          <view class="activityBox" v-if="NftTradeAd">
            <image
              :src="getImageUrl(NftTradeAd.ads[0].icon)"
              class="activityImg"
              @click="toAdUrl(NftTradeAd.ads[0].url, true)"
            />
          </view>

          <!-- <view class="partnerBox" v-if="NftTradePartner">
          <template v-for="(item, index) in NftTradePartner.ads" :key="index">
            <template v-if="index < 4">
              <view class="partnerItem" @click="toAdUrl(item.url)">
                <image :src="getImageUrl(item.icon)" class="partnerImg" alt="" />
                <view class="partnerName">{{ item.name }}</view>
              </view>
            </template>
          </template>
        </view> -->
        </view>
        <view class="cnt2">
          <view class="commonTitleBox">
            <view class="title navTitle">
              <image src="/static/images/msg@2x.png" class="tb" alt="" />
              {{ t('home.title.bulletins') }}
            </view>
            <view class="more" @click="toUrl('/pages/cats/bulletins/list')">
              <view>{{ t('common.title.more') }}</view>
              <view><image src="/static/images/more@2x.png" class="moreIcon" alt="" /></view>
            </view>
          </view>
          <view class="messageBox">
            <template v-for="(item, index) in announcementList.data" :key="index">
              <view
                class="messageItem"
                :class="{ active: index == 0 }"
                @click="toUrl('/pages/cats/bulletins/detail?id=' + item.id)"
              >
                <view class="messageTitle">
                  {{ item?.i18n_content?.title }}
                </view>
                <view class="messageTime">{{ formatTime(item.create_time, 'YYYY-M-D H:i') }}</view>
                <view class="messageDot"></view>
              </view>
            </template>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
//
import { ref } from 'vue'

import i18n, { t } from '@/locale/index'
import { formatTime, getImageUrl, toAdUrl, toUrl } from '@/utils'

import { useMessage, useToast } from 'wot-design-uni'
import { useUserStore } from '@/store/user'

import { getAnnouncementListApi, AnnouncementListResponse } from '@/service/api/announcement'
import { getAdListByKeysApi, getAdListByKeysApiResponse } from '@/service/api/ad'
import { getUnReadNotificationCountApi } from '@/service/api/user'
import { addFavoriteApi, getGoodsListByTagsApi, searchGoodsInfo } from '@/service/api/goods'
import { getChatRoomsApi } from '@/service/api/groupChat'
uni.hideTabBar()

const locale = uni.getLocale()
const message = useMessage()
const userStore = useUserStore()
const toast = useToast()

const { safeAreaInsets } = uni.getSystemInfoSync()
const headBoxHeight = ref<string>('')
const userInfoBoxPaddingTop = ref<string>('')
const goodsListByTag = ref<searchGoodsInfo[]>()

// 等待 App.vue 中 waitForNetwork 完成后再加载数据，避免 iOS 首次安装网络未就绪导致请求失败
const onNetworkReady = () => {
  getAdListByKeys()
  loadHomeData()
}

onMounted(() => {
  // #ifdef H5
  headBoxHeight.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 878 + 'rpx'
  userInfoBoxPaddingTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 32 + 'rpx'
  // #endif
  // #ifdef APP-PLUS
  headBoxHeight.value = (safeAreaInsets?.top || 0) + 878 + 'rpx'
  userInfoBoxPaddingTop.value = (safeAreaInsets?.top || 0) + 32 + 'rpx'
  // #endif
  // @ts-ignore
  if (globalThis.__networkReady) {
    onNetworkReady()
  } else {
    uni.$on('networkReady', onNetworkReady)
  }
})

onUnmounted(() => {
  uni.$off('networkReady', onNetworkReady)
})

const loadHomeData = () => {
  getGoodsListByTagsApi([1], 10).then((res) => {
    goodsListByTag.value = res.data
  })

  getAnnouncementListApi(1, 3).then((res) => {
    announcementList.value.data = res.data.data
  })

  getChatRoomsApi(1).then((res) => {
    chatRoomList.value = res.data.rooms
  })
}

const current = ref<number>(0)

const announcementList = ref<AnnouncementListResponse>({
  current_page: 1,
  data: [],
  last_page: 1,
})
const chatRoomList = ref([])
const toMall = () => {
  uni.switchTab({
    url: '/pages/tabbar/mall',
  })
}

const unreadCount = ref<number>(0)
onShow(() => {
  if (userStore.isLogin) {
    getUnReadNotificationCountApi().then((res) => {
      unreadCount.value = res.data
    })
  }
})

// 广告 start
const NftTradeAd = ref<getAdListByKeysApiResponse | null>(null)
const TopBanner = ref<getAdListByKeysApiResponse | null>(null)
const topBannerList = ref<string[]>(['/static/images/default_banner1.png'])

const getAdListByKeys = () => {
  getAdListByKeysApi(['app_home_nft_trade_ad', 'app_home_top_banner']).then((res) => {
    NftTradeAd.value = res.data.find((item) => item.quote_key === 'app_home_nft_trade_ad') || null
    TopBanner.value = res.data.find((item) => item.quote_key === 'app_home_top_banner') || null
    topBannerList.value = TopBanner.value?.ads?.map((item) => getImageUrl(item.icon, true)) || []
  })
}

// 广告 end

// 添加收藏
const addFavorite = (goodsId: number, event: Event) => {
  event.stopPropagation()
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

        // todo 把当前商品的收藏状态设置为true
        goodsListByTag.value.forEach((item) => {
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
const onRefresh = async () => {
  isRefreshing.value = true
  const startTime = Date.now()
  const minLoadingTime = 3000 // 最小加载时间3秒

  try {
    await Promise.all([
      loadHomeData(),
      // 创建一个至少等待3秒的Promise
      new Promise((resolve) => setTimeout(resolve, minLoadingTime)),
    ])
  } catch (error) {
    console.error('刷新失败:', error)
  } finally {
    // 计算已经过去的时间
    const elapsed = Date.now() - startTime
    // 如果还没到3秒，等待剩余时间
    if (elapsed < minLoadingTime) {
      await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsed))
    }
    isRefreshing.value = false
  }
}
// 跳转群聊tab
const toChatGroup = () => {
  uni.$emit('switchToChatGroup')
  uni.switchTab({
    url: '/pages/tabbar/discover',
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.notificationDot {
  :deep(.wd-badge__content) {
    border: none;
  }
}
/* 修改下拉刷新加载中的圆圈颜色 */
:deep(.uni-scroll-view-refresh__spinner > circle) {
  color: #ff6b03 !important;
}
/* 修改下拉箭头的颜色 */
:deep(.uni-scroll-view-refresh-inner > svg) {
  fill: #ff6b03 !important;
}

.page-content {
  position: relative;
  // height: calc(100vh - 120rpx);
  // padding-bottom: 120rpx;
  overflow: hidden;

  .home-all-scroll-view {
    height: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
  .homeHeadBox {
    position: relative;
    width: 100%;
    --wot-swiper-nav-dot-active-color: var(--liberty-cats-primary-color);
    :deep(.wd-swiper-nav--bottom) {
      bottom: 180rpx;
    }

    .homeSwiper {
      background-color: #f7f6f4;
    }

    .userInfoBox {
      position: absolute;
      top: 32rpx;
      left: 0;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 96rpx);
      height: 80rpx;
      padding: 10rpx 48rpx;

      .username {
        font-size: 36rpx;
        font-style: normal;
        font-weight: 500;
        line-height: 42rpx;
        color: #ffffff;
        text-align: left;
        text-shadow: 0px 2px 0px rgba(0, 0, 0, 0.15);
      }

      .message {
        position: relative;
        width: 48rpx;
        height: 48rpx;
        padding: 16rpx;
        cursor: pointer;
        background-color: #ffffff;
        border-radius: 76rpx;
        .msgDot {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4rpx 10rpx;
          font-size: 14rpx;
          font-style: normal;
          color: #ffffff;
          background-color: #ff6b03;
          border-radius: 12rpx;
        }
      }
    }
  }

  .cntBox {
    position: relative; /* 修改为 relative */
    width: 100%;
    margin-top: -64rpx; /* 保持重叠效果 */
    background: #fff;
    border-radius: var(--liberty-cats-page-border-radius) var(--liberty-cats-page-border-radius) 0 0;

    .cnt1 {
      display: flex;
      flex-direction: column;
      justify-content: start;
      width: 100%;
      height: fit-content;
      padding-bottom: 96rpx;
      background: #ffffff;
      border-radius: var(--liberty-cats-page-border-radius) var(--liberty-cats-page-border-radius) 0
        0;

      .hotSelling {
        display: flex;
        margin: 18rpx 0 0 40rpx;
        overflow-x: scroll;
        overflow-y: hidden;
      }

      .activityBox {
        width: calc(100% - 80rpx);
        height: 240rpx;
        padding: 20rpx 40rpx;
        .activityImg {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 40rpx;
        }
      }
    }

    .cnt2 {
      display: flex;
      flex-direction: column;
      justify-content: start;
      width: 100%;
      margin-top: -64rpx;
      background-color: #f7f6f4;
      border-radius: var(--liberty-cats-page-border-radius) var(--liberty-cats-page-border-radius) 0
        0;

      .messageBox {
        width: calc(100% - 96rpx);
        margin: 32rpx 48rpx 120rpx 48rpx;
      }
    }
  }
}

.scrollGoodsBox {
  width: 100%;
  height: 536rpx;
  white-space: nowrap;
  .goodsLoadingBox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 536rpx;
    .wd-loading {
      width: 50rpx;
      height: 50rpx;
    }
  }
}

.scrollGoodsItem {
  display: inline-block;
  width: 390rpx;
  height: 500rpx;
  padding: 10rpx;
  margin-right: 32rpx;
  margin-bottom: 40rpx;
  background-color: #f7f6f4;
  border-radius: 48rpx;

  .goodsImg {
    position: relative;
    width: 390rpx;
    height: 388rpx;
    overflow: hidden;
    background-color: #ffffff;
    border-radius: 48rpx;
    image {
      width: 100%;
      height: 100%;
      border-radius: 48rpx;
    }

    .goodsTag {
      position: absolute;
      top: 30rpx;
      left: 30rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5rpx 10rpx;

      font-family: Montserrat;
      font-size: 24rpx;
      font-weight: 500;
      color: #ffffff;
      text-transform: uppercase;
      white-space: nowrap;
      background: #ff6b03;
      border-radius: 84rpx;
    }

    .goodsLike {
      position: absolute;
      top: 30rpx;
      right: 30rpx;
      z-index: 9;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48rpx;
      height: 48rpx;
      cursor: pointer;
      background: rgba(171, 170, 170, 0.4);
      border-radius: 48rpx;
      .like {
        width: 32rpx;
        height: 32rpx;
        margin: auto;
        background-image: url('/static/images/like@2x.png');
        background-repeat: no-repeat;
        background-size: 100%;
        border-radius: 0;
      }
    }
    .goodsLike.active {
      background-color: #ff6b03;
      .like {
        background-image: url('/static/images/favorite_on@2x.png');
      }
    }
  }

  .goodsInfo {
    width: calc(100% - 60rpx);
    height: 80rpx;
    padding: 10rpx 30rpx 20rpx 30rpx;
    text-align: center;
    .name {
      min-height: 48rpx;
      overflow: hidden; //超出的文本隐藏
      font-size: 32rpx;
      font-style: normal;
      font-weight: normal;
      line-height: 38rpx;
      color: #261000;
      text-align: center;
      text-overflow: ellipsis; //溢出用省略号显示
      text-transform: none;
      white-space: nowrap; //溢出不换行
    }
    .priceBox {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-top: 6rpx;
      color: var(--liberty-cats-primary-color);
      .icon {
        width: 32rpx;
        height: 32rpx;
        border-radius: 0;
        image {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 0;
        }
      }
      .price {
        margin-right: 6rpx;
        font-size: 28rpx;
      }
      .unit {
        //color: #261000;
        font-size: 20rpx;
      }
    }
  }
}

.commonTitleBox {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 80rpx);
  height: 96rpx;
  margin: 24rpx auto 0 auto;
  .title {
    display: flex;
    align-items: center;
    font-size: 40rpx;
    font-weight: 600;
    color: #261000;
    .tb {
      width: 64rpx;
      height: 64rpx;
      margin-right: 12rpx;
    }
  }
  .more {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
    font-weight: 500;
    color: #ff6b03;
    .moreIcon {
      width: 24rpx;
      height: 24rpx;
      margin-left: 6rpx;
    }
  }
}
</style>

<route lang="json5">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%goods.detail.page_title%',
  },
}
</route>
<template>
  <view class="goodsDetail" :class="[locale]">
    <view
      class="nav"
      :style="{ backgroundColor: navBgOpacity, paddingTop: safeAreaInsets?.top + 'px' }"
    >
      <view class="left" @click="navigateBack()">
        <image src="/static/images/nav_left_back.png" mode="widthFix" />
      </view>
      <!-- <view>222</view>
      <view>333</view> -->
    </view>

    <template v-if="Object.keys(goodsDetail.sku_attributes).length > 0">
      <view class="goodsImg">
        <wd-swiper
          :list="goodsDetail.covers"
          v-model:current="current"
          :indicator="{ type: 'dots-bar' }"
          height="750rpx"
        ></wd-swiper>
      </view>
      <view class="info">
        <view class="title">{{ goodsDetail.i18n.title }}</view>
        <!-- 普通价格 -->
        <view class="priceBox" v-if="!nftDiscountEnabled">
          <view class="icon">
            <image :src="getImageUrl(goodsDetail.currency.icon)" alt="" />
          </view>
          <view class="price">
            {{ goodsDetail.sku_maps[goodsDetail.default_selected_sku_key.join(',')].price }}
          </view>
          <view class="unit">{{ goodsDetail.currency.unit }}</view>
        </view>

        <!-- NFT 折扣价格 -->
        <view class="priceBox isSupporter" v-else>
          <view class="discountLeft">
            <view class="price">
              <text class="symbol">{{ currentSku.currency.symbol }}</text>
              <text class="num">{{ currentSku.final_price || currentSku.price }}</text>
              <text class="unit">{{ currentSku.currency.unit }}</text>
            </view>
            <view class="discountBottom">
              <view class="originalPrice">
                {{ currentSku.currency.symbol }}{{ currentSku.original_price }}
              </view>
              <view class="saveTag" v-if="currentSku.saved_amount">
                {{ t('goods.detail.save') }} {{ currentSku.currency.symbol
                }}{{ currentSku.saved_amount }}
              </view>
            </view>
          </view>
          <view class="discountRight">
            <view
              v-if="goodsDetail.nft_discount.level.level > 0"
              class="level"
              :class="{
                ['level' + goodsDetail.nft_discount.level.level]:
                  goodsDetail.nft_discount.level.level > 0,
              }"
              @click="showMemberLevelPopup"
            >
              <image :src="getImageUrl(goodsDetail.nft_discount?.level?.icon)" mode="widthFix" />
            </view>
            <view class="supporterTag">
              {{ goodsDetail.nft_discount.tag.text }}
            </view>
          </view>
        </view>
      </view>

      <view class="attrBox">
        <view class="attrItem" v-for="(item, index) in goodsDetail.sku_attributes" :key="index">
          <view class="attrTitle">{{ item.attrName }}</view>
          <view class="attrValueBox">
            <template v-if="item.attrKeyValues.length > 0">
              <view
                class="attrValue"
                v-for="(item2, index2) in item.attrKeyValues"
                :key="index2"
                :class="{ active: goodsDetail.default_selected_sku_key.includes(item2.key) }"
                @click="attrValueClick(item.attrId, item2.key)"
              >
                {{ item2.value }}
              </view>
            </template>
          </view>
        </view>
        <view class="quantityBox">
          <view class="quantityTitle">{{ t('goods.detail.quantity') }}</view>
          <view class="quantityValue">
            <wd-input-number
              v-model="buyerQuantity"
              input-width="192rpx"
              :min="1"
              :max="goodsDetail.sku_maps[goodsDetail.default_selected_sku_key.join(',')].inventory"
            />
          </view>
        </view>
      </view>

      <view class="desc">
        <rich-text :nodes="processRichText(goodsDetail.i18n.content)"></rich-text>
      </view>
    </template>

    <view class="buyBarBox" v-if="Object.keys(goodsDetail.sku_attributes).length > 0">
      <view class="opBox">
        <wd-badge :model-value="myCartCount">
          <view class="cart" @click="toUrl('/pages/cats/flow/cart')">
            <image src="/static/images/cart.png" mode="widthFix" />
          </view>
        </wd-badge>
        <view
          class="like"
          :class="{ active: goodsDetail.is_favorite === 1 }"
          @click="addFavorite"
        ></view>
      </view>
      <view class="btnBox">
        <template v-if="goodsDetail.status === 1 && goodsDetail.total_inventory > 0">
          <wd-button
            type="primary"
            :disabled="addCartLoading"
            custom-class="buyBtn active addCart"
            @click="addCart"
          >
            {{ t('goods.detail.add_cart') }}
          </wd-button>
          <wd-button
            type="primary"
            custom-class="buyBtn quickBuy"
            @click="buyNow"
            :disabled="buyNowLoading"
          >
            {{ t('goods.detail.buy_now') }}
          </wd-button>
        </template>
        <template v-else>
          <wd-button type="primary" custom-class="buyBtn sellOut" @click="commonSoon">
            {{ t('goods.detail.sell_out') }}
          </wd-button>
        </template>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import {
  checkSkuQuantityApi,
  getGoodsDetailApi,
  NewGoodsDetailResponse,
  SkuItemResponse,
  CheckSkuQuantityRequest,
  addFavoriteApi,
} from '@/service/api/goods'

import { addCartApi, getMyCartCountApi } from '@/service/api/cart'

import { useToast } from 'wot-design-uni'
import { useUserStore } from '@/store/user'

import { getImageUrl, processRichText, toUrl } from '@/utils'
// 语言
const locale = uni.getLocale()
const toast = useToast()
const userStore = useUserStore()
const current = ref<number>(0)

const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const navBgOpacity = computed(() => {
  const opacity = Math.min(1, scrollTop.value / 400)
  return `rgba(255, 255, 255, ${opacity})`
})

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
console.log('safeAreaInsets->', safeAreaInsets)

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

const buyerQuantity = ref<number>(0)

const goodsDetail = ref<NewGoodsDetailResponse>({
  id: 0,
  category_id: 0,
  covers: [],
  status: 0,
  is_gift: 0,
  stock_unit: '',
  buyer_quantity: 0,
  limited_purchase_quantity: 0,
  purchase_flow: 0,
  specified_pay: null,
  currency: {
    name: '',
    unit: '',
    icon: '',
    symbol: '',
  },
  sku_maps: {},
  sku_attributes: {},
  sku_range_price: '',
  default_selected_sku_key: [],
  total_inventory: 0,
  is_favorite: 0,
  i18n: {
    id: 0,
    lang: '',
    title: '',
    content: '',
    goods_id: 0,
  },
})

const currentSku = computed(() => {
  const key = goodsDetail.value.default_selected_sku_key.join(',')
  return goodsDetail.value.sku_maps[key] || ({} as SkuItemResponse)
})

const nftDiscountEnabled = computed(
  () => goodsDetail.value.nft_discount?.enabled && goodsDetail.value.nft_discount?.discount_applied,
)

onLoad((options) => {
  if ('goods_id' in options) {
    uni.showLoading()
    getGoodsDetailApi(options.goods_id)
      .then((res) => {
        const data = res.data
        if (data.covers && data.covers.length > 0) {
          data.covers.forEach((item, index) => {
            data.covers[index] = getImageUrl(item)
          })
        }
        goodsDetail.value = data
        console.log('goodsDetail->', goodsDetail.value)
      })
      .finally(() => {
        uni.hideLoading()
      })
  }
})

// 选中属性
const attrValueClick = (attrId: string, attrValueKey: string) => {
  goodsDetail.value.default_selected_sku_key = goodsDetail.value.default_selected_sku_key.map(
    (item, index) => {
      const [key, value] = item.split(':')
      if (key === attrId) {
        return `${attrValueKey}`
      }
      return item
    },
  )
}

const buyNowLoading = ref(false)
// 购买
const buyNow = () => {
  if (!userStore.isLogin) {
    // toast.show(t('common.toast.pleaseLogin'))
    toUrl('/pages/cats/login', true, false)
  } else {
    const skuIdArr = goodsDetail.value.default_selected_sku_key
    if (skuIdArr.length !== Object.keys(goodsDetail.value.sku_attributes).length) {
      toast.show(t('goods.detail.select_attr'))
    } else {
      // 查询 sku + quantity 是否能购买
      const params: CheckSkuQuantityRequest[] = [
        {
          sku_id: goodsDetail.value.default_selected_sku_key.join(','),
          quantity: buyerQuantity.value,
          goods_id: goodsDetail.value.id,
        },
      ]

      if (buyNowLoading.value) return
      buyNowLoading.value = true

      checkSkuQuantityApi(params)
        .then((res) => {
          if (res.code === 1) {
            try {
              const orderData = {
                items: params,
                source: 'buy_now',
              }

              uni.setStorageSync('checkoutData', JSON.stringify(orderData))
              toUrl('/pages/cats/flow/confirm_order', true, false)
            } catch (error) {
              console.error('创建订单失败:', error)
              toast.error('创建订单失败:' + error.errMsg)
            }
          } else {
            toast.show(res.msg)
          }
        })
        .finally(() => {
          buyNowLoading.value = false
        })
    }
  }
}

// 添加收藏
const addFavorite = () => {
  if (!userStore.isLogin) {
    // toast.show(t('common.toast.pleaseLogin'))
    toUrl('/pages/cats/login', true, false)
  } else {
    addFavoriteApi(
      goodsDetail.value.id,
      goodsDetail.value.sku_maps[goodsDetail.value.default_selected_sku_key.join(',')].id,
    ).then((res) => {
      if (res.code === 1) {
        if (res.data === 1) {
          toast.show(t('common.toast.add_favorites_success'))
        } else {
          toast.show(t('common.toast.cancel_favorites_success'))
        }
        goodsDetail.value.is_favorite = res.data
      }
    })
  }
}

// 购物车数量
const myCartCount = ref<number>(0)
onShow(() => {
  refreshCartCount()
})

const refreshCartCount = () => {
  if (!userStore.isLogin) return
  getMyCartCountApi().then((res) => {
    myCartCount.value = res.data
  })
}

const addCartLoading = ref(false)
// 添加购物车
const addCart = () => {
  if (!userStore.isLogin) {
    // toast.show(t('common.toast.pleaseLogin'))
    toUrl('/pages/cats/login', true, false)
  } else {
    const skuIdArr = goodsDetail.value.default_selected_sku_key
    if (skuIdArr.length !== Object.keys(goodsDetail.value.sku_attributes).length) {
      toast.show(t('goods.detail.select_attr'))
    } else {
      if (addCartLoading.value) return
      addCartLoading.value = true

      addCartApi({
        goods_id: goodsDetail.value.id,
        sku_select_attrs_str: goodsDetail.value.default_selected_sku_key.join(','),
        quantity: buyerQuantity.value,
      })
        .then((res) => {
          if (res.code === 1) {
            refreshCartCount()
            toast.show(t('common.toast.add_cart_success'))
          } else {
            toast.show(res.msg)
          }
        })
        .finally(() => {
          addCartLoading.value = false
        })
    }
  }
}

const commonSoon = () => {
  toast.show(t('goods.detail.sell_out.click_msg'))
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.goodsDetail {
  background: #eee;
  :deep(.wd-swiper-nav--bottom) {
    //bottom: 106rpx;
  }
  :deep(.wd-swiper-nav__item--dots-bar) {
    background-color: #ccc;
  }
  :deep(.wd-swiper-nav__item--dots-bar.is-active) {
    background-color: var(--liberty-cats-primary-color);
  }
}

.nav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 48rpx);
  height: 88rpx;
  padding: 0 24rpx;
  background-color: transparent;
  .left {
    width: 64rpx;
    height: 64rpx;
    margin-right: 24rpx;
    image {
      width: 100%;
      height: 100%;
    }
  }
}

.goodsImg {
  height: 750rpx;
  background-color: #ffffff;
}

.info {
  padding: 32rpx 40rpx;
  background-color: #ffffff;
  .title {
    font-size: 40rpx;
    font-style: normal;
    font-weight: 400;
    line-height: 47rpx;
    color: #261000;
  }
  .priceBox {
    display: flex;
    align-items: center;
    margin-top: 20rpx;
    color: #ff6b03;
    .icon {
      width: 48rpx;
      height: 48rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }
    .price {
      margin-right: 12rpx;
      margin-left: 12rpx;
      font-size: 36rpx;
      font-style: normal;
      font-weight: 400;
      line-height: 37rpx;
    }
    .unit {
      font-size: 32rpx;
      font-style: normal;
      font-weight: 400;
      line-height: 33rpx;
    }

    &.isSupporter {
      display: flex;
      align-items: center;
      padding: 20rpx 24rpx;
      background: #fafafa;
      border: 2rpx solid #e8e8e8;
      border-radius: 16rpx;
      .discountLeft {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
        gap: 8rpx;
        padding-right: 20rpx;
        margin: 0 30rpx;
        .price {
          display: flex;
          align-items: baseline;
          line-height: 1;
          .symbol {
            font-size: 45rpx;
            font-weight: 800;
          }
          .num {
            font-size: 70rpx;
            font-weight: 800;
            margin-left: 5rpx;
          }
          .unit {
            font-size: 28rpx;
            font-weight: 600;
            margin-left: 8rpx;
          }
        }
        .discountBottom {
          display: flex;
          align-items: center;
          gap: 8rpx;
          .originalPrice {
            font-size: 24rpx;
            font-weight: 500;
            line-height: 1;
            color: #999;
            text-decoration: line-through;
            white-space: nowrap;
          }
          .saveTag {
            padding: 4rpx 8rpx;
            font-size: 24rpx;
            font-weight: 700;
            line-height: 1;
            color: #ff6b03;
            background: #fff1e5;
            border-radius: 8rpx;
            white-space: nowrap;
          }
        }
      }
      .discountRight {
        border-left: 2rpx solid #e5e5e5;
        flex: 1;
        min-width: 0;
        padding-left: 20rpx;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8rpx;
        // margin: 0 30rpx;
        .level {
          height: 56rpx;
          margin: 8rpx 0;
          image {
            width: 100%;
            height: 100%;
          }
        }
        .level1 {
          width: 112rpx;
        }
        .level2 {
          width: 202rpx;
        }
        .level3 {
          width: 182rpx;
        }
        .level4 {
          width: 248rpx;
        }
        .supporterTag {
          padding: 8rpx 16rpx;
          font-size: 24rpx;
          font-weight: 500;
          line-height: 1.2;
          color: #999;
          font-family:
            Alimama FangYuanTi VF,
            sans-serif;
          //   border-radius: 8rpx;
          white-space: nowrap;
          text-align: center;
        }
      }
    }
  }
}

.attrBox {
  padding: 40rpx;
  margin-top: 20rpx;
  background-color: #ffffff;
  .attrItem {
    margin-bottom: 48rpx;
    .attrTitle {
      font-size: 28rpx;
      font-style: normal;
      font-weight: 400;
      line-height: 33rpx;
      color: #261000;
    }
    .attrValueBox {
      .attrValue {
        display: inline-block;
        padding: 16rpx 48rpx;
        margin-top: 32rpx;
        margin-right: 32rpx;
        font-size: 28rpx;
        font-style: normal;

        font-weight: 400;
        line-height: 33rpx;
        color: #261000;

        border: 2rpx solid #261000;
        border-radius: 32rpx;
      }

      .attrValue.active {
        color: #ffffff;
        background: #ff6b03;
        border: 2rpx solid #ff6b03;
      }
    }
  }
  .attrItem:last-child {
    margin-bottom: 0;
  }
  .quantityBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 48rpx;
    border-top: 1rpx solid #e9e9e9;
  }
}

.desc {
  padding: 20rpx;
  padding-bottom: 150rpx;
  margin-top: 20rpx;
  background-color: #ffffff;
}

.buyBarBox {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 64rpx);
  height: 120rpx;
  padding: 0 32rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #ffffff;
  .opBox {
    display: flex;
    align-items: center;
    .like,
    .cart {
      width: 64rpx;
      height: 64rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }
    .like {
      width: 64rpx;
      height: 64rpx;
      margin-left: 32rpx;
      background-color: transparent;
      background-image: url('/static/images/detail_like@2x.png');
      background-repeat: no-repeat;
      background-size: 100% 100%;
    }
    .like.active {
      background-image: url('/static/images/detail_like_on@2x.png');
    }
  }
  .btnBox {
    display: flex;
    align-items: center;
    .buyBtn {
      width: 250rpx;
      height: 84rpx;
      font-size: 32rpx;
      font-style: normal;

      font-weight: 600;
      line-height: 48rpx;
      color: #ff6b03;
      background: #ffffff;
      border: 2rpx solid #ff6b03;
    }

    .addCart {
      border-right: none;
      border-radius: 44rpx 0 0 44rpx;
    }
    .quickBuy {
      border-radius: 0 44rpx 44rpx 0;
    }

    .buyBtn.active {
      color: #ffffff;
      background: #ff6b03;
    }

    .sellOut {
      width: 500rpx;
      height: 84rpx;
      font-size: 32rpx;
      font-style: normal;
      font-weight: 600;
      line-height: 48rpx;
      color: #999;
      background: #ffffff;
      border: 2rpx solid #999;
      border-radius: 44rpx;
    }
  }
}
</style>

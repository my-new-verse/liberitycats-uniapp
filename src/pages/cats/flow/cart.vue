<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav
      :title="t('cart.index.page_title')"
      pageBackgroundColor="#f7f6f4"
      padding-bottom="160rpx"
    >
      <template #default>
        <template v-if="cartList.data.length > 0">
          <view class="cell" v-for="item in cartList.data" :key="item.id">
            <wd-swipe-action>
              <view class="cartBox">
                <view class="cartItem">
                  <view class="itemInfo">
                    <view
                      class="checkBox"
                      @click="selectSkuItem(item as unknown as SkuItemResponse)"
                    >
                      <view
                        class="radioBox"
                        :class="{ checked: selectedSkuItems.map((i) => i.id).includes(item.id) }"
                      ></view>
                    </view>
                    <view class="goodsImg">
                      <image :src="getImageUrl(item.sku_cover)" mode="widthFix" />
                    </view>
                    <view class="goodsInfo">
                      <view class="goodsName">{{ item.name }}</view>
                      <view class="goodsAttrBox">
                        <view
                          class="goodsAttr"
                          v-for="(item2, index2) in item.sku_attributes"
                          :key="index2"
                        >
                          {{ item2.attr_name }}: {{ item2.attr_value }}
                        </view>
                      </view>
                      <view class="priceBox">
                        <view class="icon">
                          <image :src="getImageUrl(item.currency.icon)" alt="" />
                        </view>
                        <view class="price">{{ item.sku_price }}</view>
                        <view class="unit">{{ item.currency.unit }}</view>
                      </view>
                    </view>
                  </view>
                  <view class="numBox">
                    <wd-input-number
                      v-model="item.quantity"
                      :min="1"
                      :max="Math.min(item.available_inventory, item.remaining_quantity)"
                      @change="updateCartQuantity(item.id, item.quantity)"
                    />
                  </view>
                </view>
              </view>
              <template #right>
                <view class="cellAction" style="height: inherit" @click="deleteCart(item.id)">
                  <view class="button">{{ t('common.delete') }}</view>
                </view>
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
      </template>
      <template #footer>
        <view class="fixedBtnBox">
          <view class="cell leftRight" style="padding: 24rpx 0">
            <view class="label" @click="toggleAll">
              <view class="checkBox" style="display: flex; align-items: center">
                <view
                  class="radioBox"
                  :class="{ checked: selectedSkuItems.length === cartList.data.length }"
                ></view>
                <view style="margin-left: 12rpx">{{ t('common.select_all') }}</view>
              </view>
            </view>
            <view class="priceBox">
              <view class="icon" v-if="calcResultPrice !== '-'">
                <image :src="getImageUrl(cartList?.data[0]?.currency.icon)" alt="" />
              </view>
              <view class="price">{{ calcResultPrice }}</view>
              <view class="unit" v-if="calcResultPrice !== '-'">
                {{ cartList?.data[0]?.currency.unit }}
              </view>
            </view>
          </view>
          <view>
            <wd-button
              custom-class="mainBtn"
              :disabled="selectedSkuItems.length === 0"
              @click="debouncedCartToBuy"
            >
              {{ t('cart.index.btn_checkout') }}
            </wd-button>
          </view>
        </view>

        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, toUrl } from '@/utils'
import { useToast } from 'wot-design-uni'
import { debounce } from 'lodash-es'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

import {
  getMyCartListApi,
  getMyCartListApiResponse,
  deleteCartApi,
  updateCartQuantityApi,
} from '@/service/api/cart'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { SkuItemResponse } from '@/service/api/goods'
// 语言
const locale = uni.getLocale()
const toast = useToast()

const calcResultPrice = ref('-')

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

onReachBottom(() => {
  if (cartList.value?.current_page < cartList.value?.last_page) {
    loadMore()
  }
})

// 选中商品
const selectedSkuItems = ref<SkuItemResponse[]>([])
const selectSkuItem = (item: SkuItemResponse) => {
  if (selectedSkuItems.value.map((i) => i.id).includes(item.id)) {
    selectedSkuItems.value = selectedSkuItems.value.filter((i) => i.id !== item.id)
  } else {
    selectedSkuItems.value.push(item)
  }

  // 计算总价
  calcTotalPrice()
}

const toggleAll = () => {
  if (selectedSkuItems.value.length === cartList.value?.data.length) {
    selectedSkuItems.value = []
  } else {
    selectedSkuItems.value = cartList.value?.data
  }
  calcTotalPrice()
}

const calcTotalPrice = () => {
  if (selectedSkuItems.value.length === 0) {
    calcResultPrice.value = '-'
    return
  }
  calcResultPrice.value = selectedSkuItems.value
    .reduce((total, item) => {
      return total + Number(item.sku_price) * item.quantity
    }, 0)
    .toFixed(2)
}

// 首先初始化购物车列表
const cartList = ref<getMyCartListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

// 在页面显示时重置状态并加载数据
onShow(() => {
  // 重置加载状态
  state.value = 'loading'
  // 清空现有数据
  cartList.value = {
    current_page: 0,
    data: [],
    last_page: 1,
  }
  // 重置选中状态
  selectedSkuItems.value = []
  // 重新加载数据
  loadMore()
})

// 加载更多函数
const loadMore = () => {
  state.value = 'loading'
  getMyCartListApi(cartList.value?.current_page + 1).then((res) => {
    if (!res.data) return
    // 如果是第一次加载，直接赋值
    if (cartList.value.current_page === 0) {
      cartList.value.data = res.data.data
    } else {
      cartList.value.data = cartList.value.data.concat(res.data.data)
    }
    cartList.value.current_page = res.data.current_page
    cartList.value.last_page = res.data.last_page
    if (cartList.value?.current_page === cartList.value?.last_page) {
      state.value = 'finished'
    }
  })
}

// 创建原始的 cartToBuy 函数
const cartToBuy = async () => {
  try {
    if (!selectedSkuItems.value.length) {
      toast.error(t('cart.cart_to_buy.toast.please_select_goods'))
      return
    }

    const orderData = {
      items: selectedSkuItems.value,
      source: 'cart',
    }
    uni.setStorageSync('checkoutData', JSON.stringify(orderData))
    toUrl('/pages/cats/flow/confirm_order', true, false)
  } catch (error) {
    console.error('创建订单失败:', error)
    toast.error('创建订单失败:' + error.errMsg)
  }
}

// 删除购物车
const deleteCart = (cartId: number) => {
  deleteCartApi(cartId).then(() => {
    toast.show(t('common.delete_success'))
    // 更新列表数据
    cartList.value.data = cartList.value.data.filter((item) => item.id !== cartId)
    // 更新选中状态
    selectedSkuItems.value = selectedSkuItems.value.filter((item) => item.id !== cartId)
    // 重新计算总价
    calcTotalPrice()
  })
}

const updateNumberLock = ref(false)
// 更新购物车数量
const updateCartQuantity = (cartId: number, quantity: number) => {
  if (updateNumberLock.value) {
    toast.show(t('cart.update_cart_quantity.toast.updating'))
    return
  }
  updateNumberLock.value = true
  uni.showLoading()
  updateCartQuantityApi(cartId, quantity).then(() => {
    toast.show(t('common.save_success'))
    // 找到对应的购物车项并更新数量
    const cartItem = cartList.value.data.find((item) => item.id === cartId)
    if (cartItem) {
      cartItem.quantity = quantity
    }
    // 如果该商品被选中，更新选中状态
    const selectedCartItem = selectedSkuItems.value.find((item) => item.id === cartId)
    if (selectedCartItem) {
      selectedCartItem.quantity = quantity
    }
    // 重新计算总价
    calcTotalPrice()
    uni.hideLoading()
    setTimeout(() => {
      updateNumberLock.value = false
    }, 1000)
  })
}

// 使用 ref 来存储防抖函数的引用
const debouncedCartToBuy = ref<(() => Promise<void>) | null>(null)
onMounted(() => {
  debouncedCartToBuy.value = debounce(cartToBuy, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
  })
})
// 在组件卸载时清理防抖函数
onUnmounted(() => {
  if (debouncedCartToBuy.value) {
    ;(debouncedCartToBuy.value as any).cancel()
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
//

.page {
  background-color: var(--liberty-cats-page-background-color);
  .cnt {
    padding: 40rpx;
  }
}

.cellAction {
  .button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0 16rpx;
    font-size: 28rpx;
    font-style: normal;
    font-weight: 500;
    line-height: 33rpx;
    color: #261000;
    background: #efefef;
  }
}

.cartBox {
  .itemInfo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .checkBox {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 64rpx;
    }
    .goodsImg {
      width: 240rpx;
      height: 240rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }
    .goodsInfo {
      display: flex;
      flex-direction: column;
      justify-content: start;
      width: calc(100% - 304rpx - 16rpx);
      min-height: 240rpx;
      margin-left: 16rpx;
      .goodsName {
        margin-bottom: 16rpx;
        font-size: 28rpx;
        font-style: normal;
        font-weight: 500;
        line-height: 33rpx;
        color: #261000;
      }
      .goodsAttrBox {
        font-size: 28rpx;
        font-style: normal;
        font-weight: 400;
        line-height: 33rpx;
        color: rgba(38, 16, 0, 0.6);
        .goodsAttr {
          margin-bottom: 16rpx;
        }
      }
    }
  }
  .numBox {
    margin-top: 16rpx;
    margin-left: calc(64rpx + 240rpx + 16rpx);
  }
}
</style>

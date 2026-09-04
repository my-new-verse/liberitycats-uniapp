<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('order.confirm_order.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <template v-if="lastUseAddress?.id > 0">
          <view class="cell">
            <view
              class="addressBox"
              @click="toUrl('/pages/cats/address/select?bak=confirm_order', true, false)"
            >
              <view class="infoBox">
                <view class="titleBox">
                  <view class="name">{{ lastUseAddress.name }}</view>
                  <view class="phone">
                    <template v-if="lastUseAddress.area_code">
                      +{{ lastUseAddress.area_code }}
                    </template>
                    {{ lastUseAddress.cellphone }}
                  </view>
                  <!-- <view class="default" v-if="lastUseAddress.is_default == 1">
                  {{ t('common.address.default_txt') }}
                </view> -->
                </view>
                <view class="address">
                  {{ lastUseAddress.address }}
                </view>
              </view>
              <view class="checkbox">
                <view class="addressArrow"></view>
              </view>
            </view>
          </view>
        </template>
        <template v-else>
          <view
            class="cell center"
            @click="toUrl('/pages/cats/address/add?bak=confirm_order', true, true)"
          >
            <view class="addTxt">{{ t('order.confirm_order.add_address') }}</view>
          </view>
        </template>

        <template v-if="skuItemsList.length > 0">
          <view class="cell">
            <view class="goodsList">
              <view class="item" v-for="item in skuItemsList" :key="item.id">
                <view class="goodsImg">
                  <image class="cover" :src="getImageUrl(item.sku_cover)" mode="widthFix" />
                </view>
                <view class="goodsInfo">
                  <view class="goodsName">{{ item.sku_name }}</view>
                  <view class="goodsAttr">{{ item.attributes.join(' ') }}</view>
                </view>
                <view class="goodsPrice">
                  <view class="goodsPriceTxt">
                    {{ item.price }}
                    <text class="goodsPriceUnit">{{ skuItemsList[0]?.currency.name }}</text>
                  </view>
                  <view class="goodsPriceNum">x {{ item.quantity }}</view>
                </view>
              </view>
            </view>
          </view>
        </template>

        <view class="cell leftRight">
          <view class="label">
            {{ t('order.confirm_order.total_items', { count: skuItemsList.length }) }}
          </view>
          <view class="inputBox">{{ calcResultPrice }} {{ skuItemsList[0]?.currency.unit }}</view>
        </view>

        <view class="fixedBtnBox">
          <view class="cell leftRight" style="padding: 24rpx 0">
            <view class="label">{{ t('order.confirm_order.total') }}</view>
            <view class="priceBox">
              <view class="icon" v-if="calcResultPrice !== '-'">
                <image :src="getImageUrl(skuItemsList[0]?.currency.icon)" alt="" />
              </view>
              <view class="price">{{ calcResultPrice }}</view>
              <view class="unit" v-if="calcResultPrice !== '-'">
                {{ skuItemsList[0]?.currency.unit }}
              </view>
            </view>
          </view>
          <view>
            <wd-button
              custom-class="mainBtn"
              @click="debouncedSubmitOrder"
              :loading="submitLoading"
              :disabled="submitDisabled"
            >
              {{ t('order.confirm_order.submit_order') }}
            </wd-button>
          </view>
        </view>
      </template>
      <template #footer>
        <!-- <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop> -->
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, toUrl } from '@/utils'
import { getMyLastUseAddressApi, addressItem } from '@/service/api/address'
import { CheckSkuQuantityRequest, getSkuItemsApi, SkuItemResponse } from '@/service/api/goods'
import { createOrderApi, CreateOrderRequest } from '@/service/api/order'
import { useToast } from 'wot-design-uni'
import { debounce } from 'lodash-es'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()
const toast = useToast()

const lastUseAddress = ref<addressItem>({
  id: 0,
  name: '',
  cellphone: '',
  address: '',
  is_default: 0,
  member_id: 0,
  create_time: '',
  area_code: '',
})

const skuItemsList = ref<SkuItemResponse[]>([])
const cartIds = ref<number[]>([])
const calcResultPrice = ref('-')
// 使用 ref 来存储防抖函数的引用
const debouncedSubmitOrder = ref<(() => Promise<void>) | null>(null)

onMounted(() => {
  getMyLastUseAddressApi().then((res) => {
    if (res.code === 1) {
      lastUseAddress.value = res.data
      checkSubmitDisabled()
    }
  })
  uni.$on('addressSelected', addressSelected)
  const checkoutData = uni.getStorageSync('checkoutData')
  if (checkoutData) {
    const data = JSON.parse(checkoutData)
    if (data?.items) {
      checkSkuItemCanBuyNow(data.items)
    }
    if (data?.source === 'cart') {
      cartIds.value = data.items.map((item) => item.id)
    }
  }

  debouncedSubmitOrder.value = debounce(submitOrder, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
  })
})

const calcTotalPrice = () => {
  if (skuItemsList.value.length === 0) {
    calcResultPrice.value = '-'
    return
  }
  calcResultPrice.value = skuItemsList.value
    .reduce((total, item) => {
      return total + Number(item.sku_price) * item.quantity
    }, 0)
    .toFixed(2)
}

onUnmounted(() => {
  uni.$off('addressSelected', addressSelected)
  if (debouncedSubmitOrder.value) {
    ;(debouncedSubmitOrder.value as any).cancel()
  }
})

const addressSelected = (address: addressItem) => {
  lastUseAddress.value = address
  checkSubmitDisabled()
}

const checkSubmitDisabled = () => {
  if (lastUseAddress.value?.id > 0 && skuItemsList.value.length > 0) {
    submitDisabled.value = false
  } else {
    submitDisabled.value = true
  }
}

const checkSkuItemCanBuyNow = (skuItems: CheckSkuQuantityRequest[]) => {
  if (skuItems.length > 0) {
    getSkuItemsApi(skuItems).then((res) => {
      if (res.code === 1) {
        skuItemsList.value = res.data
        calcTotalPrice()
        checkSubmitDisabled()
      }
    })
  }
}

const submitLoading = ref<boolean>(false)
const submitDisabled = ref<boolean>(true)

// 创建原始的 submitOrder 函数
const submitOrder = async () => {
  try {
    if (lastUseAddress.value.id <= 0) {
      toast.error(t('address.select.pleaseSelectAddress'))
      return
    }
    const params: CreateOrderRequest = {
      address_id: lastUseAddress.value.id,
      remark: '',
      cart_ids: cartIds.value,
      sku_items: skuItemsList.value.map((item) => ({
        sku_id: item.id,
        quantity: item.quantity,
        goods_id: item.goods_id,
      })),
    }
    submitLoading.value = true
    const res = await createOrderApi(params)
    if (res.code === 1) {
      toUrl(
        '/pages/cats/pay/index?order_no=' +
          res.data.order_no +
          '&bak=' +
          encodeURIComponent('/pages/cats/order/list'),
        true,
        true,
      )
    } else {
      toast.show(res.msg)
    }
  } catch (error) {
    toast.error('创建订单失败:' + error.errMsg)
  } finally {
    submitLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

.inputBox {
  color: var(--text-black);
}

.addTxt {
  font-size: calc(32rpx * var(--font-scale));
  font-style: normal;
  font-weight: 500;
  line-height: calc(48rpx * var(--font-scale));
  color: #ff6b03;
}

.addressBox {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .infoBox {
    width: calc(100% - 50rpx);
    .titleBox {
      display: flex;
      flex-direction: column;
      justify-content: start;
      margin-bottom: 12rpx;
      .name {
        font-size: calc(36rpx * var(--font-scale));
        font-style: normal;
        font-weight: 600;
        line-height: calc(52rpx * var(--font-scale));
        color: var(--text-primary);
      }
      .phone {
        margin: 0 24rpx;
        font-size: calc(32rpx * var(--font-scale));
        font-style: normal;
        font-weight: 400;
        line-height: calc(48rpx * var(--font-scale));
        color: var(--text-primary);
      }
      .default {
        padding: 0 8rpx;
        font-size: calc(24rpx * var(--font-scale));
        font-style: normal;
        font-weight: 400;
        line-height: calc(40rpx * var(--font-scale));
        color: var(--bg-card);
        text-align: left;
        background: #ff6b03;
        border: 2rpx solid #ff6b03;
        border-radius: 8rpx;
      }
    }
    .address {
      font-size: calc(28rpx * var(--font-scale));
      font-style: normal;
      font-weight: 400;
      line-height: calc(40rpx * var(--font-scale));
      color: #999999;
    }
  }

  .checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50rpx;
    .addressArrow {
      width: 40rpx;
      height: 40rpx;
      background-image: url('@/static/images/chevron-right.png');
      background-repeat: no-repeat;
      background-size: 100% 100%;
    }
  }
}
</style>

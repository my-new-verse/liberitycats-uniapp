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
    <custom-nav :title="t('my_order.detail.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <template v-if="orderDetail && orderDetail.id > 0">
          <view class="cell">
            <view class="goodsList">
              <template v-if="orderDetail.sku_items.length > 0">
                <view class="item" v-for="skuItem in orderDetail.sku_items" :key="skuItem.id">
                  <view class="goodsImg">
                    <image class="cover" :src="getImageUrl(skuItem.sku_cover)" mode="widthFix" />
                  </view>
                  <view class="goodsInfo">
                    <view class="goodsName">{{ skuItem.goods_name }}</view>
                    <view class="goodsAttr">{{ skuItem.sku_attributes }}</view>
                  </view>
                  <view class="goodsPrice">
                    <view class="goodsPriceTxt">
                      {{ skuItem.sku_price }}
                      <text class="goodsPriceUnit">{{ orderDetail.order_currency }}</text>
                    </view>
                    <view class="goodsPriceNum">x{{ skuItem.quantity }}</view>
                  </view>
                </view>
              </template>
            </view>
          </view>

          <view class="cell">
            <view class="orderList">
              <view class="item">
                <view class="label">{{ t('my_order.detail.actual_payment') }}</view>
                <view class="value">{{ orderDetail.order_total_price }}</view>
              </view>
              <view class="item">
                <view class="label">{{ t('my_order.detail.order_sn') }}</view>
                <view class="value">{{ orderDetail.order_no }}</view>
              </view>
              <view class="item">
                <view class="label">{{ t('my_order.detail.pay_time') }}</view>
                <view class="value">
                  {{
                    orderDetail.pay_info?.pay_time ? formatTime(orderDetail.pay_info.pay_time) : '-'
                  }}
                </view>
              </view>
              <view class="item">
                <view class="label">{{ t('my_order.detail.currency') }}</view>
                <view class="value">{{ orderDetail.order_currency }}</view>
              </view>
            </view>
          </view>

          <view class="cell" v-if="orderDetail.address">
            <view class="orderList">
              <template v-if="orderDetail.logistics">
                <view class="item">
                  <view class="label">{{ t('order.detail.logistics.company') }}</view>
                  <view class="value">{{ orderDetail.logistics.logistic_company }}</view>
                </view>
                <view class="item">
                  <view class="label">{{ t('order.detail.logistics.no') }}</view>
                  <view class="value copyable" @click="copyLogisticNo">
                    {{ orderDetail.logistics.logistic_no }}
                  </view>
                </view>
              </template>
              <view class="item">
                <view class="label">{{ t('address.add.name') }}</view>
                <view class="value">{{ orderDetail.address.name }}</view>
              </view>
              <view class="item">
                <view class="label">{{ t('address.add.phone') }}</view>
                <view class="value">
                  <template v-if="orderDetail.address.area_code">
                    +{{ orderDetail.address.area_code }}
                  </template>
                  {{ orderDetail.address.cellphone }}
                </view>
              </view>
              <view class="item">
                <view>
                  <view class="label">{{ t('address.add.detail_address') }}</view>
                  <view class="value" style="margin-top: 12rpx">
                    {{ orderDetail.address.address }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatTime, getImageUrl, toUrl } from '@/utils'
import { getOrderDetailApi, OrderDetailResponse } from '@/service/api/order'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()

const orderDetail = ref<OrderDetailResponse>()
onLoad((options) => {
  if (options?.order_no) {
    uni.showLoading()
    getOrderDetailApi(options.order_no)
      .then((res) => {
        orderDetail.value = res.data
      })
      .finally(() => {
        uni.hideLoading()
      })
  }
})

const copyLogisticNo = () => {
  if (!orderDetail.value?.logistics?.logistic_no) return
  uni.setClipboardData({
    data: orderDetail.value.logistics.logistic_no,
    success: () => {
      uni.showToast({ title: t('common.copy_success'), icon: 'none' })
    },
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.orderList {
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24rpx;

    .label {
      font-size: 24rpx;
      font-weight: 400;
      line-height: 28 rpx;
      color: rgba(38, 16, 0, 0.6);
    }

    .value {
      font-size: 24rpx;
      font-weight: 400;
      line-height: 28rpx;
      color: #261000;

      &.copyable {
        color: #ff6b03;
      }
    }
  }

  .item:last-child {
    margin-bottom: 0;
  }
}
</style>

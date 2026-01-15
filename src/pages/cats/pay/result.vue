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
    <custom-nav :title="t('pay.result.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="cell" style="padding: 64rpx 0; text-align: center">
          <view class="payResult">
            <view class="payResultIcon">
              <view v-if="payResult.pay_status === 1">
                <image src="@/static/images/result/result-success.svg" mode="widthFix"></image>
              </view>
              <view v-else-if="payResult.pay_status === -1">
                <image src="@/static/images/result/result-error.svg" mode="widthFix"></image>
              </view>
              <view v-else>
                <wd-loading :show="true" size="120rpx" color="#ff6b03" />
              </view>
            </view>
            <view class="payResultText">{{ payStatusText }}</view>
          </view>
        </view>
        <view class="cell">
          <view class="orderList">
            <view class="item">
              <view class="label">{{ t('my_order.detail.pay_channel') }}</view>
              <view class="value">
                {{ payResult.order_no !== '' ? payResult.pay_channel : '-' }}
              </view>
            </view>
            <view class="item">
              <view class="label">{{ t('my_order.detail.actual_payment') }}</view>
              <view class="value">
                {{ payResult.order_no !== '' ? payResult.pay_amount : '' }}
                {{ payResult.currency.unit }}
              </view>
            </view>
            <view class="item">
              <view class="label">{{ t('my_order.detail.order_sn') }}</view>
              <view class="value">{{ payResult.order_no !== '' ? payResult.order_no : '' }}</view>
            </view>
            <view class="item">
              <view class="label">{{ t('my_order.detail.pay_time') }}</view>
              <view class="value">
                {{ payResult.pay_start_time ? formatTime(payResult.pay_start_time) : '-' }}
              </view>
            </view>
          </view>
        </view>

        <wd-button custom-class="mainBtn" @click="toOrderDetail">
          {{ t('pay.result.back_order_detail') }}
        </wd-button>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatTime, toUrl } from '@/utils'
import { getPayStatusApi, getPayStatusApiResponse } from '@/service/api/pay'
import { onUnmounted } from 'vue'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()

const checkPaymentCount = ref(30)
const orderNo = ref('')
const bak = ref('')

const payResult = ref<IResData<getPayStatusApiResponse>['data']>({
  order_no: '',
  pay_status: 0,
  pay_amount: '0',
  currency: {
    icon: '',
    name: '',
    symbol: '',
    unit: '',
  },
  pay_no: '',
  pay_channel: '',
  paid_member_id: 0,
  pay_start_time: 0,
})

const payStatusText = computed(() => {
  if (payResult.value.pay_status === 1) {
    return t('pay.result.pay_success')
  } else if (payResult.value.pay_status === -1) {
    return t('pay.result.pay_failed')
  } else {
    return t('pay.result.pay_processing')
  }
})

const timer = ref<number | null>(null)

// 清除定时器的函数
const clearTimer = () => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
}

onLoad((options) => {
  if (options?.order_no) {
    orderNo.value = options.order_no
    getPayStatusApi(orderNo.value).then((res) => {
      payResult.value = res.data
    })
  }
  if (options?.bak) {
    bak.value = options.bak
  }
})

onBackPress(() => {
  clearTimer()
  if (bak.value !== '') {
    toUrl(bak.value, true, true)
  } else {
    toUrl('/pages/cats/order/list', true, true)
  }
  return true
})

onShow(() => {
  checkPaymentStatus(orderNo.value, checkPaymentCount.value)
})

// 检查支付状态的函数
const checkPaymentStatus = async (orderNo: string, maxAttempts = 36) => {
  let attempts = 0
  clearTimer()
  return new Promise((resolve, reject) => {
    timer.value = setInterval(async () => {
      attempts++
      try {
        const res = await getPayStatusApi(orderNo)
        payResult.value = res.data
        console.log(`[支付状态查询] 第${attempts}次查询:`, payResult.value)
        if (payResult.value.pay_status === 1) {
          clearTimer()
          resolve(payResult.value)
        } else if (payResult.value.pay_status === -1) {
          clearTimer()
          reject(new Error('支付失败'))
        }
        if (attempts >= maxAttempts) {
          clearTimer()
          payResult.value.pay_status = -1
          reject(new Error('支付超时'))
        }
      } catch (error) {
        console.error('查询支付状态失败:', error)
      }
    }, 5000)
  })
}

const toOrderDetail = () => {
  clearTimer()
  toUrl(`/pages/cats/order/detail?order_no=${orderNo.value}`, false, true)
}

onUnmounted(() => {
  clearTimer()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.page {
  background-color: var(--liberty-cats-page-background-color);
  .cnt {
    padding: 40rpx;
  }
}

.payTitle {
  font-size: 28rpx;
  font-weight: 400;
  color: #999999;
}

.payResult {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64rpx 0;

  .payResultIcon {
    width: 160rpx;
    height: 160rpx;
    image {
      width: 100%;
      height: 100%;
    }
  }

  .payResultText {
    margin-top: 24rpx;
    font-size: 28rpx;
    font-weight: 400;
    color: #999999;
  }
}

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
    }
  }

  .item:last-child {
    margin-bottom: 0;
  }
}
</style>

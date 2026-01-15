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
    <page-meta :page-style="`overflow:${overlayShow ? 'hidden' : 'visible'};`"></page-meta>
    <custom-nav :title="t('pay.index.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="cell" style="padding: 64rpx 0; text-align: center">
          <view class="payTitle">{{ t('pay.index.pay_title') }}</view>
          <view class="priceBox">
            <view class="priceUnit">{{ payData.currency.symbol }}</view>
            <view class="price">{{ payData.pay_amount }}</view>
            <view class="priceUnit">{{ payData.currency.unit }}</view>
          </view>
          <view class="orderSn">{{ t('pay.index.order_sn') }}：{{ payData.order_no }}</view>
        </view>

        <view class="payMethod">{{ t('pay.index.pay_method') }}</view>

        <view class="menuBox">
          <!-- <view class="menuItem" v-if="isIos" @click="changePayMethod('iap')">
            <view class="menuItemTitle">
              <view class="title">{{ t('pay.index.pay_method.iap') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[usePayMethod === 'iap' ? 'active' : '']"></view>
            </view>
          </view>
          <view class="menuItem" v-else @click="changePayMethod('okx')">
            <view class="menuItemTitle">
              <view class="title">{{ t('pay.index.pay_method.okx') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[usePayMethod === 'okx' ? 'active' : '']"></view>
            </view>
          </view> -->
          <view class="menuItem" @click="changePayMethod('okx')">
            <view class="menuItemTitle">
              <view class="title">{{ t('pay.index.pay_method.okx') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[usePayMethod === 'okx' ? 'active' : '']"></view>
            </view>
          </view>
          <!-- <view class="menuItem" @click="changePayMethod('stripe')">
            <view class="menuItemTitle">
              <view class="title">{{ t('pay.index.pay_method.stripe') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[usePayMethod === 'stripe' ? 'active' : '']"></view>
            </view>
          </view> -->
          <!-- <view class="menuItem">
          <view class="menuItemTitle" @click="changePayMethod('points')">
            <view class="title">积分</view>
          </view>
          <view class="menuItemRight">
            <view class="arrow" :class="[usePayMethod === 'points' ? 'active' : '']"></view>
          </view>
        </view> -->
        </view>
      </template>
      <template #footer>
        <view class="fixedBtnBox">
          <wd-button
            custom-class="mainBtn"
            :loading="submitLoading"
            :disabled="payBtnDisabled || payData.pay_status !== 0"
            @click="debouncedPay"
          >
            {{ t('pay.index.pay_now') }}
          </wd-button>
        </view>

        <wd-popup
          v-model="overlayShow"
          lock-scroll
          :close-on-click-modal="false"
          closable
          @close="closePayConfirmWindow"
        >
          <view class="wrapper">
            <view class="block">
              <div class="loading">
                <wd-loading
                  color="#ff6b03"
                  :show="overlayShow"
                  custom-class="loading-primary"
                  :size="48"
                />
              </div>
              <div class="text">{{ t('pay.index.pay_confirm_loading_txt') }}</div>
            </view>
          </view>
        </wd-popup>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getPayStatusApi, getPayStatusApiResponse } from '@/service/api/pay'
import { createPaymentCheckoutApi } from '@/service/api/stripe'
import { createWebDataForKeyApi } from '@/service/api/web3'
import { toUrl, openOkx } from '@/utils'
import { debounce } from 'lodash-es'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

import { useToast } from 'wot-design-uni'

// 语言
const locale = uni.getLocale()
const toast = useToast()

const orderNo = ref('')
const bak = ref('')
onLoad((options) => {
  if (options?.order_no) {
    orderNo.value = options.order_no
    getPayData()
  }
  if (options?.bak) {
    bak.value = decodeURIComponent(options.bak)
  }
})

const payData = ref<getPayStatusApiResponse>({
  order_no: '',
  pay_status: 0,
  pay_amount: '0',
  currency: {
    unit: '',
    icon: '',
    name: '',
    symbol: '',
  },
  pay_no: '',
  pay_channel: '',
  paid_member_id: 0,
  pay_start_time: 0,
})

const getPayData = () => {
  uni.showLoading()
  getPayStatusApi(orderNo.value)
    .then((res) => {
      payData.value = res.data
      if (payData.value.pay_status === 1) {
        toUrl(`/pages/cats/pay/result?order_no=${orderNo.value}`, true, true)
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
}

onBackPress(() => {
  console.log('bak.value', bak.value)
  if (bak.value !== '') {
    toUrl(bak.value, true, true)
  } else {
    toUrl('/pages/cats/order/list', true, true)
  }
  return true
})

const submitLoading = ref(false)
const payBtnDisabled = ref(false)
const usePayMethod = ref('okx')
const overlayShow = ref(false)

const changePayMethod = (method: string) => {
  usePayMethod.value = method
  // todo 如果是积分，就要检查下积分是否足够，能不能使用积分进行支付，检查通过后，payBtnDisabled = false
  payBtnDisabled.value = false
}

const okxPay = async () => {
  submitLoading.value = true
  try {
    const res = await createWebDataForKeyApi('payOrder', {
      order_no: orderNo.value,
      pay_method: usePayMethod.value,
    })
    if (res.code === 1) {
      const dappUrl = `${import.meta.env.VITE_DAPP_BASEURL}?key=${res.data.key}&lang=${locale}`
      openOkx(dappUrl)
      return Promise.resolve()
    } else {
      toast.show(res.msg)
      return Promise.reject(new Error(res.msg))
    }
  } catch (error) {
    console.error('OKX支付失败:', error)
    toast.error('支付失败:' + error.message)
    return Promise.reject(error)
  } finally {
    submitLoading.value = false
  }
}

const stripePay = async () => {
  // 订单对象
  let orderInfo = {
    customer: 'Stripe的Customer', // Customer
    ephemeralKey: 'Stripe的Customer Ephemeral Key', // 临时访问Customer的Key
    isAllowDelay: true, // 是否支持延迟支付  默认false
    merchantName: 'DCloud', // 商户名
    paymentIntent: 'Stripe的PaymentIntent', // 订单信息
    publishKey: 'Public Key', // 公钥
    billingDetails: {
      // 账单信息(可选)
      name: '',
      email: '',
      phone: '',
      address: {
        city: '',
        country: 'CN', // 国家代码(ISO 3166-1 alpha-2)
        line1: '',
        line2: '',
        postalCode: '',
        state: '',
      },
    },
  }

  const res = await createPaymentCheckoutApi(orderNo.value, usePayMethod.value)
  console.log('createPaymentIntentApi', JSON.stringify(res))
  orderInfo = {
    customer: res.data.customer,
    ephemeralKey: res.data.ephemeralKey,
    isAllowDelay: true,
    merchantName: 'Liberty Cats',
    paymentIntent: res.data.paymentIntent,
    publishKey: res.data.publishableKey,
    billingDetails: res.data.billingDetails,
  }

  console.log('orderInfo', JSON.stringify(orderInfo))

  try {
    const paymentResult = await new Promise((resolve, reject) => {
      uni.getProvider({
        service: 'payment',
        success: function (res) {
          console.log('getProvider', res)
          if (~res.provider.indexOf('stripe')) {
            uni.requestPayment({
              provider: 'stripe',
              orderInfo,
              success(res) {
                console.log('requestPayment Success: ' + JSON.stringify(res))
                resolve(res)
              },
              fail(e) {
                console.log('requestPayment failed: ' + JSON.stringify(e))
                console.error(e)
                reject(e)
              },
            })
          } else {
            reject(new Error('不支持Stripe支付'))
          }
        },
        fail(e) {
          console.log('getProvider failed: ' + JSON.stringify(e))
          reject(e)
        },
      })
    })
    return paymentResult
  } finally {
    submitLoading.value = false
  }
}

const closePayConfirmWindow = () => {
  overlayShow.value = false
  toUrl('/pages/cats/order/detail?order_no=' + orderNo.value)
}

// 使用 ref 来存储防抖函数的引用
const debouncedPay = ref<(() => Promise<void>) | null>(null)

const isIos = ref(false)
onMounted(() => {
  debouncedPay.value = debounce(pay, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
  })

  uni.getSystemInfo({
    success(res) {
      if (res.osName === 'ios') {
        console.log('我是ios', res)
        isIos.value = true
        usePayMethod.value = 'iap'
      }
    },
  })
})

// 在组件卸载时清理防抖函数
onUnmounted(() => {
  if (debouncedPay.value) {
    ;(debouncedPay.value as any).cancel()
  }
})

// 创建原始的 pay 函数
const pay = async () => {
  try {
    submitLoading.value = true
    if (usePayMethod.value === 'okx') {
      await okxPay().then(() => {
        toUrl(`/pages/cats/pay/result?order_no=${orderNo.value}`, false, true)
      })
    } else if (usePayMethod.value === 'stripe') {
      await stripePay()
        .then(() => {
          toUrl(`/pages/cats/pay/result?order_no=${orderNo.value}`, false, true)
        })
        .catch((error) => {
          submitLoading.value = false
          toast.error('支付失败:' + error.errMsg)
        })
    } else if (usePayMethod.value === 'iap') {
      await iapPay()
        .then(() => {
          // toUrl(`/pages/cats/pay/result?order_no=${orderNo.value}`, false, true)
        })
        .catch((error) => {
          submitLoading.value = false
          toast.error('支付失败:' + error.errMsg)
        })
    }
  } catch (error) {
    console.error('支付失败:', error)
    toast.error('支付失败:' + error.errMsg)
  } finally {
    submitLoading.value = false
  }
}

const iapPay = async () => {
  submitLoading.value = true
  try {
    const res = await createWebDataForKeyApi('payOrder', {
      order_no: orderNo.value,
      pay_method: usePayMethod.value,
    })
    if (res.code === 1) {
      const dappUrl = `${import.meta.env.VITE_DAPP_BASEURL}?key=${res.data.key}&lang=${locale}`
      openOkx(dappUrl)
      return Promise.resolve()
    } else {
      toast.show(res.msg)
      return Promise.reject(new Error(res.msg))
    }
  } catch (error) {
    console.error('苹果支付失败:', error)
    toast.error('支付失败:' + error.message)
    return Promise.reject(error)
  } finally {
    submitLoading.value = false
  }
}
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

.orderSn {
  font-size: 22rpx;
  font-weight: 400;
  color: #999999;
}

.payMethod {
  margin: 48rpx 0 24rpx 0;
  font-size: 24rpx;
  font-weight: 400;
  color: #999999;
}

.priceBox {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin: 48rpx 0;
  .price {
    font-size: 72rpx;
    font-weight: 500;
    color: #ff6b03;
  }
  .priceUnit {
    margin-left: 12rpx;
    font-size: 28rpx;
    font-weight: 400;
    color: #999999;
    text-transform: uppercase;
  }
}

.menuItem {
  .menuItemRight {
    .arrow {
      width: 48rpx;
      height: 48rpx;
      background-image: url('@/static/images/checkbox.png');
    }
    .arrow.active {
      background-image: url('@/static/images/checkbox_on.png');
    }
  }
}

:deep(.wd-overlay) {
  z-index: 99 !important;
}
:deep(.wd-popup) {
  z-index: 100 !important;
  border-radius: 16rpx;
}

.wrapper {
  padding: 24rpx;
  padding-top: 64rpx;
  background-color: #fff;
  .block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    .text {
      margin-top: 48rpx;
    }
  }
}
</style>

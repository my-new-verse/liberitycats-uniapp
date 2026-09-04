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
          <view
            v-for="method in paymentMethods"
            :key="method.id"
            class="menuItem"
            :class="{ disabled: !method.enabled }"
            @click="changePayMethod(method)"
          >
            <view class="menuItemTitle">
              <view class="title">{{ method.display_name }}</view>
            </view>
            <view class="menuItemRight">
              <view
                class="arrow"
                :class="[selectedPaymentMethodId === method.id ? 'active' : '']"
              ></view>
            </view>
          </view>
        </view>
      </template>
      <template #footer>
        <view class="fixedBtnBox">
          <wd-button
            custom-class="mainBtn"
            :loading="submitLoading"
            :disabled="payBtnDisabled || !selectedPaymentMethod || payData.pay_status !== 0"
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
import { t } from '@/locale/index'
import {
  createPayCheckoutApi,
  getPaymentMethodsApi,
  getPayStatusApi,
  getPayStatusApiResponse,
  type PaymentMethod,
} from '@/service/api/pay'
import { openExternalPaymentLink, toUrl } from '@/utils'
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
    getPaymentMethods()
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
const selectedPaymentMethodId = ref('')
const paymentMethods = ref<PaymentMethod[]>([])
const overlayShow = ref(false)

const selectedPaymentMethod = computed(() => {
  return paymentMethods.value.find((method) => method.id === selectedPaymentMethodId.value)
})

const getPaymentMethods = () => {
  getPaymentMethodsApi(orderNo.value)
    .then((res) => {
      const methods = res.data.payment_methods || []
      paymentMethods.value = methods
      selectedPaymentMethodId.value =
        methods.find((method) => method.enabled && method.id === res.data.default_method_id)?.id ||
        methods.find((method) => method.enabled)?.id ||
        ''
    })
    .catch((error: any) => {
      toast.error(t('pay.index.get_methods_failed') + (error?.message ? ':' + error.message : ''))
    })
}

const changePayMethod = (method: PaymentMethod) => {
  if (!method.enabled) return
  selectedPaymentMethodId.value = method.id
  payBtnDisabled.value = false
}

const walletDappPay = async () => {
  const method = selectedPaymentMethod.value
  if (!method) {
    throw new Error(t('pay.index.select_method_required'))
  }

  submitLoading.value = true
  try {
    const res = await createPayCheckoutApi(orderNo.value, method.channel, method.wallet, locale)
    if (res.code === 1) {
      openExternalPaymentLink(res.data.link || res.data.url, res.data.fallback_url)
      return Promise.resolve()
    } else {
      // 错误提示统一由 pay() 的 catch 处理，这里只负责抛出
      return Promise.reject(new Error(res.msg))
    }
  } catch (error: any) {
    console.error('钱包支付失败:', error)
    return Promise.reject(error)
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

onMounted(() => {
  debouncedPay.value = debounce(pay, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
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
    await walletDappPay()
    toUrl(`/pages/cats/pay/result?order_no=${orderNo.value}`, false, true)
  } catch (error: any) {
    console.error('支付失败:', error)
    toast.error('支付失败:' + (error.errMsg || error.message || ''))
  } finally {
    submitLoading.value = false
  }
}

/*
 * ⚠️ 苹果内购（Apple IAP）保留逻辑 —— 目前不启用。
 * 收银台已统一走 Web3 钱包 DApp 支付（walletDappPay），此分支未接入 pay() 流程，
 * 也不在支付方式列表中展示。若后续需要恢复 App Store 内购，可参考此实现重新接入：
 * 依赖 createWebDataForKeyApi / openOkx（已从当前 import 中移除，恢复时需一并补回）。
 *
 * const iapPay = async () => {
 *   submitLoading.value = true
 *   try {
 *     const res = await createWebDataForKeyApi('payOrder', {
 *       order_no: orderNo.value,
 *       pay_method: 'iap',
 *     })
 *     if (res.code === 1) {
 *       const dappUrl = `${res.data.url}`
 *       openOkx(dappUrl)
 *       return Promise.resolve()
 *     } else {
 *       toast.show(res.msg)
 *       return Promise.reject(new Error(res.msg))
 *     }
 *   } catch (error) {
 *     console.error('苹果支付失败:', error)
 *     toast.error('支付失败:' + error.message)
 *     return Promise.reject(error)
 *   } finally {
 *     submitLoading.value = false
 *   }
 * }
 */
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

.page {
  background-color: var(--liberty-cats-page-background-color);
  .cnt {
    padding: 40rpx;
  }
}

.payTitle {
  font-size: calc(28rpx * var(--font-scale));
  font-weight: 400;
  color: var(--text-secondary);
}

.orderSn {
  font-size: calc(22rpx * var(--font-scale));
  font-weight: 400;
  color: var(--text-secondary);
}

.payMethod {
  margin: 48rpx 0 24rpx 0;
  font-size: calc(24rpx * var(--font-scale));
  font-weight: 400;
  color: var(--text-secondary);
}

.priceBox {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin: 48rpx 0;
  .price {
    font-size: calc(72rpx * var(--font-scale));
    font-weight: 500;
    color: #ff6b03;
  }
  .priceUnit {
    margin-left: 12rpx;
    font-size: calc(28rpx * var(--font-scale));
    font-weight: 400;
    color: var(--text-secondary);
    text-transform: uppercase;
  }
}

.menuItem {
  &.disabled {
    opacity: 0.45;
  }

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
  background-color: var(--bg-card);
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

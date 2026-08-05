<template>
  <root-portal>
    <wd-popup
      v-model="show"
      position="bottom"
      :z-index="99999"
      :close-on-click-modal="true"
      custom-style="border-radius: 40rpx 40rpx 0 0; background: #ffffff; overflow: hidden;"
      @close="handleClose"
    >
      <view class="unlockSheet">
        <view class="sheetHead">
          <view class="headText">
            <view class="headTitle">{{ headTitle }}</view>
            <view class="headDesc">{{ headDesc }}</view>
          </view>
          <view class="headClose" @click="handleClose">
            <wd-icon name="close" size="18px" color="#9b8d84" />
          </view>
        </view>

        <scroll-view class="sheetBody" :scroll-y="true">
          <!-- 资格已生效 -->
          <template v-if="mode === 'success'">
            <view class="stateCard success">
              <view class="stateIcon">
                <wd-icon name="check-outline" size="22px" color="#1f9254" />
              </view>
              <view class="stateTitle">{{ successTitle }}</view>
              <view class="stateDesc">{{ successDesc }}</view>
            </view>
            <view class="primaryBtn" @click="handleContinue">{{ successAction }}</view>
          </template>

          <!-- 资格未通过 / 异常状态 -->
          <template v-else-if="mode === 'notice'">
            <view class="stateCard notice">
              <view class="stateTitle">{{ noticeTitle }}</view>
              <view class="stateDesc">{{ noticeDesc }}</view>
            </view>
            <view class="primaryBtn" @click="handleRefresh">
              {{ t('membership.action.retry_refresh') }}
            </view>
            <view class="noticeActions">
              <view class="noticeAction" @click="openMarket('okx')">
                {{ t('membership.action.back_to_okx') }}
              </view>
              <view class="noticeAction" @click="openMarket('opensea')">
                {{ t('membership.action.back_to_opensea') }}
              </view>
              <view class="noticeAction" @click="toWalletSettings">
                {{ t('membership.action.check_wallet') }}
              </view>
              <view
                class="noticeAction"
                v-if="config.troubleshootUrl"
                @click="openExternal(config.troubleshootUrl)"
              >
                {{ t('membership.action.view_troubleshoot') }}
              </view>
            </view>
            <view class="backToOptions" @click="mode = 'options'">
              {{ t('membership.action.view_unlock_ways') }}
            </view>
          </template>

          <!-- 解锁路径 -->
          <template v-else>
            <view class="checkingBar" v-if="loading">
              <wd-loading size="16px" color="#ff6b03" />
              <text class="checkingText">{{ t('membership.status.checking') }}</text>
            </view>
            <view class="hintBar" v-else-if="hintText">{{ hintText }}</view>

            <!-- 资格来源一：订阅会员 -->
            <view class="group">
              <view class="groupTitle">{{ t('membership.unlock.subscribe.group_title') }}</view>
              <view class="sourceCard">
                <view class="sourceHead">
                  <view class="sourceName">{{ t('membership.unlock.subscribe.name') }}</view>
                  <view class="priceBox" v-if="planPrice">
                    <text class="priceCurrency">{{ planCurrency }}</text>
                    <text class="priceValue">{{ planPrice }}</text>
                    <text class="pricePeriod">{{ planPeriod }}</text>
                  </view>
                  <view class="priceBox pending" v-else>
                    {{ t('membership.unlock.subscribe.price_pending') }}
                  </view>
                </view>
                <view class="sourceDesc">{{ t('membership.unlock.subscribe.value') }}</view>
                <view class="primaryBtn" @click="handleSubscribe">
                  {{
                    eligibility.subscription.expired
                      ? t('membership.unlock.subscribe.renew')
                      : t('membership.unlock.subscribe.btn')
                  }}
                </view>
              </view>
            </view>

            <!-- 资格来源二：NFT Holder -->
            <view class="group">
              <view class="groupTitle">{{ t('membership.unlock.nft.group_title') }}</view>
              <view class="sourceCard">
                <view class="sourceHead">
                  <view class="sourceName">{{ t('membership.unlock.nft.name') }}</view>
                  <view class="sourceTag">
                    {{ t('membership.unlock.nft.condition', { count: eligibility.nft.min_hold }) }}
                  </view>
                </view>
                <view class="sourceDesc">{{ t('membership.unlock.nft.value') }}</view>

                <view class="metaList">
                  <view class="metaItem">
                    <text class="metaLabel">{{ t('membership.unlock.nft.wallet_label') }}</text>
                    <text class="metaValue" v-if="maskedWallet">{{ maskedWallet }}</text>
                    <text class="metaLink" v-else @click="handleBindWallet">
                      {{ t('membership.unlock.nft.bind_wallet') }}
                    </text>
                  </view>
                  <view class="metaItem">
                    <text class="metaLabel">{{ t('membership.unlock.nft.collection_label') }}</text>
                    <text class="metaValue">{{ eligibility.nft.collection }}</text>
                  </view>
                  <view class="metaItem">
                    <text class="metaLabel">{{ t('membership.unlock.nft.network_label') }}</text>
                    <text class="metaValue">{{ eligibility.nft.network }}</text>
                  </view>
                </view>
                <view class="walletTip">{{ t('membership.unlock.nft.wallet_tip') }}</view>

                <!-- 购买渠道：OKX / OpenSea -->
                <view class="channelList">
                  <view class="channelItem">
                    <view class="channelInfo">
                      <view class="channelName">{{ t('membership.unlock.market.okx.name') }}</view>
                      <view class="channelDesc">{{ t('membership.unlock.market.okx.desc') }}</view>
                    </view>
                    <view class="channelOps">
                      <view class="ghostBtn" @click="openMarket('okx')">
                        {{ t('membership.unlock.market.okx.action') }}
                      </view>
                      <view class="guideLink" @click="openExternal(config.okx.guide)">
                        {{ t('membership.unlock.market.okx.guide') }}
                      </view>
                    </view>
                  </view>
                  <view class="channelItem">
                    <view class="channelInfo">
                      <view class="channelName">
                        {{ t('membership.unlock.market.opensea.name') }}
                      </view>
                      <view class="channelDesc">
                        {{ t('membership.unlock.market.opensea.desc') }}
                      </view>
                    </view>
                    <view class="channelOps">
                      <view class="ghostBtn" @click="openMarket('opensea')">
                        {{ t('membership.unlock.market.opensea.action') }}
                      </view>
                      <view class="guideLink" @click="openExternal(config.opensea.guide)">
                        {{ t('membership.unlock.market.opensea.guide') }}
                      </view>
                    </view>
                  </view>
                </view>

                <view class="refreshLink" @click="handleRefresh">
                  {{
                    scene === 'nft_holder'
                      ? t('membership.unlock.nft.refresh_holding')
                      : t('membership.unlock.nft.refresh')
                  }}
                </view>
              </view>
            </view>
          </template>
        </scroll-view>

        <view class="sheetFoot" @click="toBenefits">
          <text class="footText">{{ t('membership.unlock.benefits_entry') }}</text>
          <wd-icon name="arrow-right" size="14px" color="#9b8d84" />
        </view>
      </view>
    </wd-popup>
  </root-portal>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { t } from '@/locale/index'
import { formatWalletAddress, openOkx, openUrl, toUrl } from '@/utils'
import { getServerI18nKey } from '@/utils/i18n'
import { createWebDataForKeyApi } from '@/service/api/web3'
import { createMembershipSubscriptionApi } from '@/service/api/membership'
import {
  getMembershipConfig,
  useMembershipEligibility,
  type MembershipScene,
} from '@/hooks/useMembership'
import { useUserStore } from '@/store/user'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    scene?: MembershipScene
  }>(),
  { scene: 'publish_ad' },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'unlocked', scene: MembershipScene): void
}>()

const userStore = useUserStore()
const { eligibility, loading, failed, load, refresh } = useMembershipEligibility()

type SheetMode = 'options' | 'notice' | 'success'
const mode = ref<SheetMode>('options')
const config = ref(getMembershipConfig())
/** 是否已经历一次主动刷新（用于区分"首次进入"与"刷新后仍未通过"） */
const refreshed = ref(false)

const show = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const scene = computed<MembershipScene>(() => props.scene)

const headTitle = computed(() => t(`membership.unlock.title.${scene.value}`))
const headDesc = computed(() => t(`membership.unlock.desc.${scene.value}`))
const successTitle = computed(() => t(`membership.success.${scene.value}.title`))
const successAction = computed(() => t(`membership.success.${scene.value}.action`))
const successDesc = computed(() => {
  if (eligibility.value.subscription.active && eligibility.value.nft.active) {
    return t('membership.status.both')
  }
  return eligibility.value.nft.active
    ? t('membership.status.nft_verified')
    : t('membership.status.subscribe_success')
})

const maskedWallet = computed(() => formatWalletAddress(eligibility.value.nft.wallet_address))

const planCurrency = computed(
  () => eligibility.value.subscription.plan?.currency_symbol || config.value.plan.currency,
)
const planPrice = computed(
  () => eligibility.value.subscription.plan?.price || config.value.plan.price,
)
const planPeriod = computed(() => {
  const period = eligibility.value.subscription.plan?.period || config.value.plan.period
  const key = `membership.unlock.subscribe.period.${period}`
  const label = t(key)
  return label || ''
})

/** 顶部轻量状态提示（不阻断解锁路径展示） */
const hintText = computed(() => {
  if (eligibility.value.nft.syncing) return t('membership.status.syncing')
  if (eligibility.value.subscription.expired) return t('membership.status.subscription_expired')
  if (eligibility.value.nft.held_before && !eligibility.value.nft.active) {
    return t('membership.status.nft_transferred')
  }
  return ''
})

const noticeTitle = computed(() => {
  if (failed.value) return t('membership.status.error')
  if (eligibility.value.nft.syncing) return t('membership.status.syncing_title')
  if (eligibility.value.subscription.expired) return t('membership.status.subscription_expired')
  if (eligibility.value.nft.held_before) return t('membership.status.nft_transferred')
  if (eligibility.value.nft.wallet_address) return t('membership.status.wrong_wallet')
  return t('membership.status.not_found')
})

const noticeDesc = computed(() => {
  if (failed.value) return t('membership.status.error_desc')
  if (eligibility.value.nft.syncing) return t('membership.status.syncing_desc')
  if (eligibility.value.subscription.expired) {
    return t('membership.status.subscription_expired_desc')
  }
  if (eligibility.value.nft.held_before) return t('membership.status.nft_transferred_desc')
  if (eligibility.value.nft.wallet_address) return t('membership.status.wrong_wallet_desc')
  return t('membership.status.not_found_desc')
})

const isUnlocked = () => {
  const sceneFlag = eligibility.value.scenes?.[scene.value]
  if (typeof sceneFlag === 'boolean') return sceneFlag
  if (scene.value === 'nft_holder') return eligibility.value.nft.active
  return eligibility.value.subscription.active || eligibility.value.nft.active
}

const checkEligibility = async () => {
  await load(scene.value)
  if (isUnlocked()) {
    mode.value = 'success'
    return
  }
  // 首次进入直接展示解锁路径；刷新后仍未通过时先说明状态
  mode.value = refreshed.value || failed.value ? 'notice' : 'options'
}

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return
    config.value = getMembershipConfig()
    refreshed.value = false
    mode.value = 'options'
    checkEligibility()
  },
  { immediate: true },
)

const handleClose = () => {
  show.value = false
  emit('close')
}

const handleContinue = () => {
  show.value = false
  emit('unlocked', scene.value)
}

/** 我已持有 / 我已购买：重新校验资格 */
const handleRefresh = async () => {
  if (loading.value) return
  await refresh(scene.value)
  refreshed.value = true
  if (isUnlocked()) {
    mode.value = 'success'
    return
  }
  mode.value = 'notice'
}

const handleSubscribe = async () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login')
    return
  }
  const { subscribePath, subscribeUrl } = config.value.plan
  try {
    const res = await createMembershipSubscriptionApi(eligibility.value.subscription.plan?.plan_id)
    if (res.code === 1 && res.data?.order_no) {
      show.value = false
      // 与商城下单一致，统一走收银台页面
      toUrl(`/pages/cats/pay/index?order_no=${res.data.order_no}`, true)
      return
    }
    if (res.code === 1 && res.data?.pay_url) {
      openUrl(res.data.pay_url)
      return
    }
    throw new Error(res.msg || 'subscription unavailable')
  } catch (error) {
    console.log('[v0] membership subscribe fallback', error)
    if (subscribePath) {
      show.value = false
      toUrl(subscribePath, true)
      return
    }
    if (subscribeUrl) {
      openUrl(subscribeUrl)
      return
    }
    uni.showToast({ title: t('membership.unlock.subscribe.unavailable'), icon: 'none' })
  }
}

/** 前往购买渠道：OKX 走钱包内 DApp，OpenSea 走系统浏览器 */
const openMarket = (channel: 'okx' | 'opensea') => {
  const url = channel === 'okx' ? config.value.okx.url : config.value.opensea.url
  if (!url) return
  if (channel === 'okx') {
    openOkx(url)
    return
  }
  openUrl(url)
}

const openExternal = (url: string) => {
  if (!url) return
  openUrl(url)
}

const toWalletSettings = () => {
  show.value = false
  toUrl('/pages/cats/settings/index', true)
}

const toBenefits = () => {
  toUrl('/pages/cats/member/benefits', true)
}

const handleBindWallet = () => {
  createWebDataForKeyApi('bindWallet', undefined, getServerI18nKey()).then((res) => {
    if (res.code === 1) {
      openOkx(res.data.url)
    } else {
      uni.showToast({ title: res.msg, icon: 'none' })
    }
  })
}
</script>

<style lang="scss" scoped>
.unlockSheet {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  max-height: 78vh;
  padding-bottom: env(safe-area-inset-bottom);
  overflow-x: hidden;
  background-color: #ffffff;

  /* 弹层内所有盒子统一按边框计算宽度，避免内边距把内容顶出屏幕 */
  view,
  scroll-view {
    box-sizing: border-box;
  }
}

.sheetHead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 40rpx 32rpx 24rpx;

  .headText {
    flex: 1;
    min-width: 0;
  }

  .headTitle {
    font-size: 36rpx;
    font-weight: 600;
    line-height: 48rpx;
    color: #261000;
  }

  .headDesc {
    margin-top: 12rpx;
    font-size: 24rpx;
    line-height: 36rpx;
    color: rgba(38, 16, 0, 0.6);
  }

  .headClose {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48rpx;
    height: 48rpx;
    margin-left: 16rpx;
  }
}

.sheetBody {
  flex: 1;
  width: 100%;
  max-height: 58vh;
  padding: 0 32rpx;
}

.checkingBar {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  background-color: #fff6ee;
  border-radius: 20rpx;

  .checkingText {
    margin-left: 12rpx;
    font-size: 24rpx;
    color: #ff6b03;
  }
}

.hintBar {
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: #b25f00;
  background-color: #fff6ee;
  border-radius: 20rpx;
}

.group {
  margin-bottom: 32rpx;

  .groupTitle {
    margin-bottom: 16rpx;
    font-size: 26rpx;
    font-weight: 500;
    color: rgba(38, 16, 0, 0.55);
  }
}

.sourceCard {
  padding: 28rpx;
  background-color: #faf8f5;
  border: 2rpx solid rgba(38, 16, 0, 0.06);
  border-radius: 28rpx;

  .sourceHead {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .sourceName {
    flex: 1;
    min-width: 0;
    font-size: 30rpx;
    font-weight: 600;
    color: #261000;
  }

  .sourceTag {
    flex-shrink: 0;
    margin-left: 16rpx;
    font-size: 22rpx;
    color: rgba(38, 16, 0, 0.55);
  }

  .sourceDesc {
    margin-top: 12rpx;
    font-size: 24rpx;
    line-height: 36rpx;
    color: rgba(38, 16, 0, 0.6);
  }
}

.priceBox {
  flex-shrink: 0;
  color: #ff6b03;

  .priceCurrency {
    font-size: 24rpx;
  }

  .priceValue {
    font-size: 40rpx;
    font-weight: 600;
  }

  .pricePeriod {
    font-size: 22rpx;
    color: rgba(38, 16, 0, 0.5);
  }
}

.priceBox.pending {
  font-size: 22rpx;
  color: rgba(38, 16, 0, 0.5);
}

.metaList {
  margin-top: 24rpx;

  .metaItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10rpx 0;
  }

  .metaLabel {
    font-size: 24rpx;
    color: rgba(38, 16, 0, 0.5);
  }

  .metaValue {
    font-size: 24rpx;
    color: #261000;
  }

  .metaLink {
    font-size: 24rpx;
    color: #ff6b03;
  }
}

.walletTip {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 32rpx;
  color: #b25f00;
}

.channelList {
  margin-top: 24rpx;

  .channelItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx;
    margin-bottom: 16rpx;
    background-color: #ffffff;
    border: 2rpx solid rgba(38, 16, 0, 0.06);
    border-radius: 24rpx;
  }

  .channelItem:last-child {
    margin-bottom: 0;
  }

  .channelInfo {
    flex: 1;
    min-width: 0;
    margin-right: 16rpx;
  }

  .channelName {
    font-size: 28rpx;
    font-weight: 500;
    color: #261000;
  }

  .channelDesc {
    margin-top: 8rpx;
    font-size: 22rpx;
    line-height: 32rpx;
    color: rgba(38, 16, 0, 0.5);
  }

  .channelOps {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    align-items: flex-end;
  }
}

.primaryBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  margin-top: 28rpx;
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
  background: linear-gradient(329deg, #ff6b03 0%, #ee941a 100%);
  border-radius: 44rpx;
}

.ghostBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx 24rpx;
  font-size: 24rpx;
  color: #ff6b03;
  white-space: nowrap;
  border: 2rpx solid #ff6b03;
  border-radius: 32rpx;
}

.guideLink {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: rgba(38, 16, 0, 0.45);
  text-decoration: underline;
}

.refreshLink {
  margin-top: 24rpx;
  font-size: 24rpx;
  color: #ff6b03;
  text-align: center;
}

.stateCard {
  padding: 32rpx;
  margin-bottom: 8rpx;
  background-color: #faf8f5;
  border-radius: 28rpx;

  .stateIcon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72rpx;
    height: 72rpx;
    margin-bottom: 16rpx;
    background-color: rgba(31, 146, 84, 0.1);
    border-radius: 50%;
  }

  .stateTitle {
    font-size: 30rpx;
    font-weight: 600;
    color: #261000;
  }

  .stateDesc {
    margin-top: 12rpx;
    font-size: 24rpx;
    line-height: 36rpx;
    color: rgba(38, 16, 0, 0.6);
  }
}

.stateCard.notice {
  background-color: #fff6ee;
}

.noticeActions {
  display: flex;
  flex-wrap: wrap;
  margin-top: 24rpx;

  .noticeAction {
    padding: 12rpx 24rpx;
    margin: 0 16rpx 16rpx 0;
    font-size: 24rpx;
    color: #261000;
    background-color: #faf8f5;
    border: 2rpx solid rgba(38, 16, 0, 0.08);
    border-radius: 32rpx;
  }
}

.backToOptions {
  margin-bottom: 8rpx;
  font-size: 24rpx;
  color: #ff6b03;
  text-align: center;
}

.sheetFoot {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28rpx 32rpx 36rpx;

  .footText {
    margin-right: 8rpx;
    font-size: 24rpx;
    color: rgba(38, 16, 0, 0.5);
  }
}
</style>

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
      :title="'#' + (nftDetail?.token_id || '')"
      page-background-color="#f7f6f4"
      padding-bottom="200rpx"
    >
      <template #default>
        <template v-if="nftDetail && nftDetail.id > 0">
          <view class="nftDetailBox">
            <image :src="getImageUrl(nftDetail.token_img)" mode="widthFix" class="nftImg" />
            <view class="nftInfo">
              <view class="nftId">#{{ nftDetail.token_id }}</view>
              <view class="nftName">Liberty Cats</view>
            </view>
          </view>

          <view class="cell" v-if="nftDetail.pledge_id > 0">
            <view class="flexBbetween">
              <view>
                <view class="pointValue active">
                  {{ nftDetail.pledge_info.active_pledge_days }}
                </view>
                <view class="pointLabel">{{ t('pledge.detail.active_pledge_days') }}</view>
              </view>
              <view>
                <view class="pointValue">
                  {{ formatNumber(nftDetail.pledge_info.today_except_point, 2) }}
                </view>
                <view class="pointLabel">{{ t('pledge.detail.today_except_point') }}</view>
              </view>
              <view>
                <view class="pointValue">
                  {{ formatNumber(nftDetail.pledge_info.total_except_point, 2) }}
                </view>
                <view class="pointLabel">{{ t('pledge.detail.total_except_point') }}</view>
              </view>
            </view>
            <view class="flexBbetween pledgeTime">
              <view class="pointLabel" style="margin-top: 0">
                {{ t('pledge.detail.pledge_start_time') }}
              </view>
              <view class="nftAttrValue">
                {{ nftDetail.pledge_info.pledge_start_time }}
              </view>
            </view>
          </view>

          <view class="nftAttrBox">
            <view
              class="nftAttrItem"
              v-for="(item, index) in nftDetail.token_attributes_json"
              :key="index"
            >
              <view class="nftAttrLabel">{{ item.trait_type }}</view>
              <view class="nftAttrValue">{{ item.value }}</view>
            </view>
          </view>
        </template>
      </template>
      <template #footer>
        <view class="fixedBtnBox">
          <template v-if="nftDetail.pledge_id === 0">
            <wd-button custom-class="mainBtn" :disabled="pledgeBtnDisabled" @click="handlePledge">
              {{ t('pledge.detail.pledge.btn.pledge') }}
            </wd-button>
          </template>
          <template v-else>
            <template v-if="nftDetail.pledge_info?.redeem_status === 0">
              <wd-button custom-class="mainBtn2" @click="handleRedeem">
                {{ t('pledge.detail.pledge.btn.redeem') }}
              </wd-button>
            </template>
            <template v-else-if="nftDetail.pledge_info?.redeem_status === -10">
              <wd-button custom-class="mainBtn2">
                {{ t('pledge.detail.pledge.btn.redeeming') }}
              </wd-button>
            </template>
          </template>
        </view>
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
        <!--质押的弹层-->
        <wd-popup v-model="pledgeAgreementPopupShow" custom-class="pledgeAgreementBox">
          <view class="titleBox">
            <view class="title">
              {{ agreementsMap?.user_pledge_nft_popup_content?.i18n_content.name }}
            </view>
          </view>
          <view class="contentBox">
            <scroll-view class="scrollBox" :scroll-y="true">
              <rich-text
                :nodes="agreementsMap?.user_pledge_nft_popup_content?.i18n_content?.content"
              ></rich-text>
            </scroll-view>
          </view>
          <view class="agreeBox" v-if="agreementsMap?.user_pledge_nft_agreement">
            <view class="checkbox2">
              <view
                class="icon"
                :class="{ active: isPledgeAgree }"
                @click="isPledgeAgree = !isPledgeAgree"
              ></view>
              <view class="txt">
                {{ t('pledge.detail.pledge.agreement.check') }}
                <text
                  style="color: #ff6b03"
                  @click="
                    toUrl(
                      '/pages/cats/agreement/detail?id=' +
                        agreementsMap?.user_pledge_nft_agreement.id,
                    )
                  "
                >
                  《{{ agreementsMap?.user_pledge_nft_agreement.i18n_content.name }}》
                </text>
              </view>
            </view>
          </view>
          <view class="btnBox">
            <wd-button
              type="success"
              custom-class="mainBtn"
              :disabled="pledgeSubmitBtnDisabled"
              @click="handlePledgeSubmit"
            >
              {{ t('pledge.detail.pledge.btn.pledge') }}
            </wd-button>
          </view>
        </wd-popup>
        <!--赎回的弹层-->
        <wd-popup v-model="pledgeRedeemPopupShow" custom-class="pledgeAgreementBox">
          <view class="titleBox">
            <view class="title">
              {{ agreementsMap?.user_redeem_nft_popup_content?.i18n_content.name }}
            </view>
          </view>
          <view class="contentBox">
            <scroll-view class="scrollBox" :scroll-y="true">
              <rich-text
                :nodes="agreementsMap?.user_redeem_nft_popup_content?.i18n_content.content"
              ></rich-text>
            </scroll-view>
          </view>
          <view class="agreeBox" v-if="agreementsMap?.user_pledge_nft_agreement">
            <view class="checkbox2">
              <view
                class="icon"
                :class="{ active: isRedeemAgree }"
                @click="isRedeemAgree = !isRedeemAgree"
              ></view>
              <view class="txt">
                {{ t('pledge.detail.pledge.agreement.check') }}
                <text
                  style="color: #ff6b03"
                  @click="
                    toUrl(
                      '/pages/cats/agreement/detail?id=' +
                        agreementsMap?.user_pledge_nft_agreement.id,
                    )
                  "
                >
                  《{{ agreementsMap?.user_pledge_nft_agreement.i18n_content.name }}》
                </text>
              </view>
            </view>
          </view>
          <view class="btnBox">
            <wd-button
              type="success"
              custom-class="mainBtn"
              :disabled="redeemSubmitBtnDisabled"
              @click="handleRedeemSubmit"
            >
              {{ t('pledge.detail.pledge.btn.redeem') }}
            </wd-button>
          </view>
        </wd-popup>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatNumber, getImageUrl, openOkx, toUrl } from '@/utils'
import { createWebDataForKeyApi } from '@/service/api/web3'
import { useUserStore } from '@/store'
import { useToast } from 'wot-design-uni'
import { getAgreementsByKeys, QuoteKeyAgreementList } from '@/service/api/agreement'
import { getNftDetailApi, NftItem, redeemNftApi, createPledgeApi } from '@/service/api/pledge'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

const toast = useToast()

// 语言
const locale = uni.getLocale()
const userStore = useUserStore()
const pledgeAgreementPopupShow = ref<boolean>(false)
const pledgeRedeemPopupShow = ref<boolean>(false)
const isPledgeAgree = ref<boolean>(false)
const isRedeemAgree = ref<boolean>(false)

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const nftDetail = ref<NftItem>({} as NftItem)
onShow(() => {
  if (userStore.isLogin) {
    // 查询NFT
    loadNftDetail()
  }
})

const loadNftDetail = () => {
  if (!userStore.isLogin) return
  uni.showLoading()
  getNftDetailApi(tokenId.value)
    .then((res) => {
      if (res.code === 1) {
        nftDetail.value = res.data
        pledgeBtnDisabled.value = false
      } else {
        toast.show(res.msg || t('common.error'))
        setTimeout(() => {
          toUrl('/pages/cats/pledge/index')
        }, 3000)
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
}
const tokenId = ref<string>('')
onLoad((options) => {
  if (options.token_id) {
    tokenId.value = options.token_id
  }
  agreementsMap.value = uni.getStorageSync('agreements')
})

const handlePledge = () => {
  pledgeAgreementPopupShow.value = true
}

const pledgeBtnDisabled = ref<boolean>(true)
const pledgeSubmitBtnDisabled = computed(() => !isPledgeAgree.value)
const handlePledgeSubmit = () => {
  if (!isPledgeAgree.value) {
    toast.show(t('common.agree'))
  }

  uni.showLoading()
  // 质押
  createPledgeApi(tokenId.value)
    .then(async (res) => {
      if (res.code === 1) {
        pledgeAgreementPopupShow.value = false
        await loadNftDetail()
        toast.show(t('pledge.detail.pledge.success'))
        isPledgeAgree.value = false
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
}

const agreementsMap = ref<QuoteKeyAgreementList>()

const handleRedeem = () => {
  pledgeRedeemPopupShow.value = true
}

const redeemSubmitBtnDisabled = computed(() => !isRedeemAgree.value)
const handleRedeemSubmit = () => {
  uni.showLoading()
  redeemNftApi(tokenId.value)
    .then((res) => {
      if (res.code === 1) {
        pledgeRedeemPopupShow.value = false
        isRedeemAgree.value = false
        toast.show(t('pledge.detail.redeem.success'))
        loadNftDetail()
      } else {
        toast.show(res.msg)
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
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

.page {
  .cnt {
    padding-bottom: 160rpx;
  }
}

:deep(.mainBtn2) {
  width: 100%;
  height: 88rpx !important;

  font-size: calc(32rpx * var(--font-scale));
  font-style: normal;
  font-weight: 600;
  color: #ff6b03 !important;
  text-align: center;
  background: var(--bg-card) !important;
  border: 4rpx solid #ff6b03;

  &.is-primary {
    color: #ff6b03;
  }
}

.pointLabel {
  margin-top: 24rpx;
  font-size: calc(28rpx * var(--font-scale));
  font-weight: normal;
  line-height: calc(33rpx * var(--font-scale));
  color: var(--text-primary);
  text-align: center;
}

.pointValue {
  font-size: calc(48rpx * var(--font-scale));
  font-style: normal;
  font-weight: normal;
  line-height: calc(56rpx * var(--font-scale));
  color: var(--text-primary);
  text-align: center;
  &.active {
    color: #ff6b03;
  }
}

.nftDetailBox {
  margin-bottom: 24rpx;
  overflow: hidden;
  background-color: var(--bg-card);
  border-radius: 40rpx;
  .nftImg {
    width: 100%;
    height: 100%;
  }

  .nftInfo {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20rpx 32rpx;
    color: var(--text-primary);

    .nftId {
      font-size: calc(40rpx * var(--font-scale));
      font-style: normal;
      font-weight: normal;
      line-height: calc(56rpx * var(--font-scale));
    }

    .nftName {
      font-size: calc(28rpx * var(--font-scale));
      font-style: normal;
      font-weight: normal;
      line-height: calc(33rpx * var(--font-scale));
    }
  }
}

.nftAttrBox {
  padding: 32rpx;
  margin: 24rpx 0;
  background-color: var(--bg-card);
  border-radius: 40rpx;

  .nftAttrItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 80rpx;
    margin-bottom: 16rpx;

    .nftAttrLabel {
      font-size: calc(28rpx * var(--font-scale));
      line-height: calc(33rpx * var(--font-scale));
      color: #999999;
    }

    .nftAttrValue {
      font-size: calc(28rpx * var(--font-scale));
      line-height: calc(33rpx * var(--font-scale));
      color: var(--text-primary);
    }
  }
}

:deep(.pledgeAgreementBox) {
  width: calc(100% - 128rpx - 48rpx - 48rpx);
  height: 780rpx;
  padding: 48rpx;
  background-color: var(--bg-card);
  border-radius: 24rpx;

  .titleBox {
    height: 52rpx;
    margin-bottom: 24rpx;
    font-size: calc(36rpx * var(--font-scale));
    line-height: calc(52rpx * var(--font-scale));
    color: var(--black-90);
    text-align: center;
  }

  .contentBox {
    height: 500rpx;
    overflow-y: scroll;

    .lineP {
      margin-bottom: 16rpx;
      font-size: calc(28rpx * var(--font-scale));
      line-height: calc(40rpx * var(--font-scale));
      color: var(--black-60);
      text-align: left;
    }
  }

  .agreeBox {
    display: flex;
    align-items: center;
    justify-content: start;
    height: 80rpx;
    font-size: calc(24rpx * var(--font-scale));
    line-height: calc(32rpx * var(--font-scale));
    color: var(--text-primary);
  }

  .btnBox {
    height: 60rpx;
  }
}

.checkbox2 {
  display: flex;
  align-items: center;
  justify-content: center;
  .icon {
    width: 28rpx;
    height: 28rpx;
    margin-right: 12rpx;
    cursor: pointer;
    background-image: url('@/static/images/checkbox2.png');
    background-repeat: no-repeat;
    background-size: 100%;
    &.active {
      background-image: url('@/static/images/checkbox2_on.png');
    }
  }

  .txt {
    font-size: calc(24rpx * var(--font-scale));
    line-height: calc(28rpx * var(--font-scale));
    color: var(--text-primary);
  }
}

.flexBbetween {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  .nftAttrValue {
    color: var(--text-black);
  }
}

.pledgeTime {
  padding-top: 40rpx;
  margin-top: 40rpx;
  border-top: 2rpx solid var(--divider-color);
}
</style>

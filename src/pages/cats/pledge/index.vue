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
    <custom-nav
      :title="t('pledge.index.page_title')"
      pageBackgroundColor="#f7f6f4"
      paddingBottom="160rpx"
    >
      <template #default>
        <view class="cell leftRight">
          <view @click="toUrl('/pages/cats/asset/log?assetKey=pledge_point')">
            <view class="pointLabel">{{ t('pledge.index.got_pledge_point') }}</view>
            <view class="pointValue active">{{ formatNumber(pledgeAsset.pledge_point, 2) }}</view>
          </view>
          <view>
            <view class="pointLabel">{{ t('pledge.index.except_total_point') }}</view>
            <view class="pointValue">
              {{ formatNumber(pledgeAsset.pledge_expect_total_point, 2) }}
            </view>
          </view>
          <view @click="toUrl('/pages/cats/pledge/ranking')">
            <view class="pointLabel">{{ t('pledge.index.current_ranking') }}</view>
            <view class="pointValue">{{ pledgeAsset.rank > 0 ? pledgeAsset.rank : '-' }}</view>
          </view>
        </view>

        <view class="NftBox">
          <view class="titleBox">
            <view class="titleLeft">
              {{ t('my.my_nft_title') }}
              <!-- <image class="refresh" src="@/static/images/refresh.png" mode="scaleToFill" /> -->
            </view>
            <view class="checkbox2" @click="handleCheckbox">
              <view class="icon" :class="{ active: checkboxOn }"></view>
              <view class="txt">{{ t('pledge.index.search.pledging') }}</view>
            </view>
          </view>

          <view class="nftBox">
            <template v-if="userStore.userInfo.wallet_address !== ''">
              <template v-if="isLoading">
                <view
                  class="emptyBox"
                  style="
                    width: 80%;
                    height: 200rpx;
                    margin: 40rpx auto 0 auto;
                    font-size: calc(24rpx * var(--font-scale));
                    color: #999;
                    text-align: center;
                  "
                >
                  {{ t('common.loading') }}
                </view>
              </template>
              <template v-else>
                <template v-if="nftList.length > 0">
                  <view class="nftList">
                    <view
                      class="nftItem"
                      v-for="(item, index) in nftList"
                      :key="index"
                      @click="handleNftClick(item)"
                    >
                      <view class="nftImg">
                        <image :src="getImageUrl(item.token_img)" class="nft" mode="widthFix" />
                      </view>
                      <view class="nftTitle">#{{ item.token_id }}</view>
                    </view>
                  </view>
                </template>
                <template v-else>
                  <view
                    class="emptyBox"
                    style="
                      width: 80%;
                      height: 200rpx;
                      margin: 40rpx auto 0 auto;
                      font-size: calc(24rpx * var(--font-scale));
                      color: #999;
                      text-align: center;
                    "
                  >
                    {{ t('my.nft.empty_txt') }}
                  </view>
                </template>
              </template>
            </template>
            <template v-else>
              <view
                class="emptyBox"
                style="
                  width: 80%;
                  height: 200rpx;
                  margin: 40rpx auto 0 auto;
                  font-size: calc(24rpx * var(--font-scale));
                  color: #999;
                  text-align: center;
                "
              >
                {{ t('my.nft.empty.not_bind_wallet') }}
              </view>
            </template>
          </view>
        </view>
      </template>
      <template #footer>
        <!-- <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop> -->
        <view class="fixedBtnBox">
          <wd-button
            custom-class="mainBtn"
            @click="
              toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.user_pledge_nft_guide.id)
            "
          >
            {{ t('pledge.index.btn.query_guide') }}
          </wd-button>
          <view
            class="txt2"
            @click="
              toUrl(
                '/pages/cats/agreement/detail?id=' + agreementsMap?.user_pledge_nft_agreement.id,
              )
            "
          ></view>
        </view>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import {
  getMemberNftsApi,
  getMemberNftsApiResponse,
  getPledgeAssetApi,
  getPledgeAssetApiResponse,
} from '@/service/api/pledge'
import { useUserStore } from '@/store'
import { formatNumber, getImageUrl, toUrl } from '@/utils'
import { QuoteKeyAgreementList } from '@/service/api/agreement'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()
const userStore = useUserStore()
const checkboxOn = ref<boolean>(false)

const agreementsMap = ref<QuoteKeyAgreementList>()
onLoad(() => {
  agreementsMap.value = uni.getStorageSync('agreements')
  loadNftList()
})

onShow(() => {
  if (userStore.isLogin) {
    // 查询积分
    loadPledgeAsset()
    // 查询NFT
    // loadNftList()
  }
})

const isLoading = ref<boolean>(true)

const loadNftList = () => {
  if (!userStore.isLogin) return
  uni.showLoading()
  isLoading.value = true
  getMemberNftsApi(1, checkboxOn.value)
    .then((res) => {
      nftList.value = res.data.data
    })
    .finally(() => {
      uni.hideLoading()
      isLoading.value = false
    })
}

const handleNftClick = (item: getMemberNftsApiResponse['data'][number]) => {
  toUrl('/pages/cats/pledge/detail?token_id=' + item.token_id)
}

const nftList = ref<getMemberNftsApiResponse['data']>([])

const handleCheckbox = () => {
  checkboxOn.value = !checkboxOn.value
  loadNftList()
}

const pledgeAsset = ref<getPledgeAssetApiResponse>({
  pledge_point: 0,
  pledge_expect_total_point: 0,
  rank: 0,
})

const loadPledgeAsset = () => {
  if (!userStore.isLogin) return
  // uni.showLoading()
  getPledgeAssetApi()
    .then((res) => {
      pledgeAsset.value = res.data
    })
    .finally(() => {
      // uni.hideLoading()
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

.pointLabel {
  margin-bottom: 16rpx;
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

// NFT
.NftBox {
  padding: 28rpx 32rpx;
  margin-bottom: 24rpx;
  background-color: var(--bg-card);
  border-radius: 40rpx;

  .titleBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

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
        background-size: 100% 100%;
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

    .titleLeft {
      display: flex;
      align-items: center;
      color: var(--text-black);
      .refresh {
        width: 36rpx;
        height: 36rpx;
        margin-left: 16rpx;
        cursor: pointer;
      }
    }

    .title {
      font-size: calc(36rpx * var(--font-scale));
      font-style: normal;
      font-weight: 500;
      line-height: calc(42rpx * var(--font-scale));
      color: var(--text-primary);
    }
  }
  .nftConnect {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 378rpx;
    height: 88rpx;
    margin: 42rpx auto;

    font-size: calc(32rpx * var(--font-scale));
    font-style: normal;
    font-weight: 500;
    line-height: calc(38rpx * var(--font-scale));
    color: #ff6b03;
    border: 2rpx solid #ff6b03;
    border-radius: 44rpx;
  }

  .nftList {
    .nftItem {
      display: inline-block;
      width: 128rpx;
      height: 174rpx;
      margin-top: 40rpx;
      margin-right: 30rpx;
      .nftImg {
        width: 128rpx;
        height: 128rpx;
        overflow: hidden;
        border-radius: 20rpx;
        .nft {
          width: 100%;
          height: 100%;
          border-radius: 20rpx;
        }
      }
      .nftTitle {
        height: 30rpx;
        margin-top: 16rpx;
        font-size: calc(24rpx * var(--font-scale));
        font-style: normal;
        font-weight: 400;
        line-height: calc(28rpx * var(--font-scale));
        color: var(--text-black);
        text-align: center;
      }
    }
    .nftItem:nth-child(4n) {
      margin-right: 0;
    }
  }

  .nftOp {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32rpx;
    margin-top: 24rpx;
    .opBtn {
      width: 32rpx;
      height: 32rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }
  }
}

// NFT end

.fixedBtnBox {
  .txt2 {
    margin: 16rpx 0;
    font-size: calc(20rpx * var(--font-scale));
    font-style: normal;
    font-weight: normal;
    line-height: calc(23rpx * var(--font-scale));
    color: #999999;
    text-align: center;
  }
}
</style>

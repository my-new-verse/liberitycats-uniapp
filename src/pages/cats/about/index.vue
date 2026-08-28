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
    <custom-nav :title="t('about.index.page_title')" page-background-color="#f7f6f4">
      <template #default>
        <view class="">
          <view class="webBox">
            <view class="logo">
              <image src="/static/app/icons/1024x1024.png" alt="" />
            </view>
            <view
              class="cell leftRight"
              @click="toAdUrl('https://www.libertycatsnfts.com')"
              v-if="getServerOnOff('about_exchange_link')"
            >
              <view style="color: var(--text-black) !important">https://libertycatsnfts.com</view>
              <view class="dot"></view>
            </view>
          </view>

          <view class="partnerBox" v-if="NftTradePartner && getServerOnOff('about_exchange_link')">
            <view class="partnerTitle">{{ t('about.block.nft_market') }}</view>
            <view class="partnerItemBox nft-partner-list">
              <template v-for="(item, index) in NftTradePartner.ads" :key="index">
                <template v-if="index < 4">
                  <view class="partnerItem" @click="toAdUrl(item.url)">
                    <image :src="getImageUrl(item.icon)" class="partnerImg" alt="" />
                    <view class="partnerName">{{ item.name }}</view>
                  </view>
                </template>
              </template>
            </view>
          </view>

          <view class="partnerBox" v-if="NftTradePartner">
            <view class="partnerTitle">{{ t('about.lock.community') }}</view>
            <view class="partnerItemBox">
              <template v-for="(item, index) in CommunityList.ads" :key="index">
                <template v-if="index < 5">
                  <view class="partnerItem2" @click="toAdUrl(item.url)">
                    <image :src="getImageUrl(item.icon)" class="partnerImg" :class="item.name" />
                  </view>
                </template>
              </template>
            </view>
          </view>

          <view class="xyBox">
            <view
              @click="
                toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.user_login_agreement.id)
              "
            >
              《{{ agreementsMap?.user_login_agreement.i18n_content.name }}》
            </view>
            <view
              @click="
                toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.user_privacy_policy.id)
              "
            >
              《{{ agreementsMap?.user_privacy_policy.i18n_content.name }}》
            </view>
          </view>
        </view>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getAdListByKeysApi, getAdListByKeysApiResponse } from '@/service/api/ad'
import { QuoteKeyAgreementList } from '@/service/api/agreement'
import { getImageUrl, toAdUrl, toUrl, getServerOnOff } from '@/utils'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()
const NftTradePartner = ref<getAdListByKeysApiResponse | null>(null)
const CommunityList = ref<getAdListByKeysApiResponse | null>(null)

const getAdListByKeys = () => {
  getAdListByKeysApi(['app_home_nft_trade_partner', 'about_commonity_list']).then((res) => {
    const nftData = res.data.find((item) => item.quote_key === 'app_home_nft_trade_partner')
    const communityData = res.data.find((item) => item.quote_key === 'about_commonity_list')

    if (nftData && nftData.ads && nftData.ads.some((ad) => ad.name === 'MAGIC EDEN')) {
      nftData.ads = nftData.ads.filter((ad) => ad.name !== 'MAGIC EDEN')
    }

    if (communityData && communityData.ads && communityData.ads.some((ad) => ad.name === 'ins')) {
      communityData.ads = communityData.ads.filter((ad) => ad.name !== 'ins')
    }

    NftTradePartner.value = nftData
    CommunityList.value = communityData
  })
}
const agreementsMap = ref<QuoteKeyAgreementList>()
const systemConfig = ref<any>({})
onLoad(() => {
  getAdListByKeys()
  // 加载用户协议
  agreementsMap.value = uni.getStorageSync('agreements')
  systemConfig.value = uni.getStorageSync('systemConfig')
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

.webBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding-top: 60rpx;
  background-color: var(--recentMemberItem-bg-color);

  .cell {
    width: calc(100% - 80rpx);
  }

  .logo {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 240rpx;
    height: 240rpx;
    margin-bottom: 60rpx;
    overflow: hidden;
    background-color: var(--bg-card);
    border: 2rpx solid #ffef6c;
    border-radius: 50%;
    image {
      width: 100%;
      height: 100%;
    }
  }
}
.partnerBox {
  padding: 40rpx;
  margin: 40rpx auto;
  background-color: var(--bg-card);
  border-radius: 40rpx;

  .partnerTitle {
    margin-bottom: 30rpx;
    font-size: calc(32rpx * var(--font-scale));
    font-weight: normal;
    color: var(--text-primary);
  }

  .partnerItemBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .partnerItem {
    text-align: center;

    .partnerImg {
      width: 128rpx;
      height: 128rpx;
    }
    .partnerName {
      margin-top: 24rpx;
      font-size: calc(24rpx * var(--font-scale));
      font-style: normal;
      font-weight: normal;
      line-height: calc(33rpx * var(--font-scale));
      color: var(--text-primary);
      text-align: center;
      text-transform: none;
    }
  }

  .partnerItem2 {
    text-align: center;
    .partnerImg {
      width: 64rpx;
      height: 64rpx;
    }

    .redbook {
      width: 112rpx !important;
      height: 40rpx !important;
    }
  }
  .nft-partner-list {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 60rpx;
  }
}

.dot {
  width: 56rpx;
  height: 56rpx;
  background-image: url('/static/images/messageDot1@2x.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.xyBox {
  display: flex;
  flex-wrap: wrap; // 允许自动换行
  gap: 16rpx; // 协议之间加点间距（可选）
  align-items: center;
  justify-content: center; // 居中
  margin-top: 40rpx;
  font-size: calc(24rpx * var(--font-scale));
  color: var(--commentTextArea-color);
  text-align: center; // 内容居中
}
.xyBox > view {
  max-width: 100%; // 防止超出
  margin: 0 8rpx; // 协议之间的间距（可选）
  text-align: center; // 居中
  word-break: break-all; // 长单词/长标题自动断行
  white-space: normal; // 允许换行
}
</style>

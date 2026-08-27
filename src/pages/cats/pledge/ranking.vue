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
      :title="t('pledge.ranking.page_title')"
      pageBackgroundColor="#f7f6f4"
      paddingBottom="80rpx"
    >
      <template #default>
        <view class="rankingBox">
          <view class="rankingItem">
            <view class="ranking" style="width: 12vw">{{ t('pledge.ranking.ranking') }}</view>
            <view class="ranking" style="flex: 1">{{ t('setting.index.nickname') }}</view>
            <view class="point pointHeader">
              <wd-icon
                name="info-circle"
                size="22px"
                color="#ff6b03"
                @click.stop="revenueHelpPopupShow = true"
              ></wd-icon>
              <text>{{ t('pledge.ranking.except_point') }}</text>
            </view>
          </view>
          <template v-if="rankingList && rankingList.data.length > 0">
            <view class="rankingItem" v-for="(item, index) in rankingList.data" :key="index">
              <view class="ranking">
                <view v-if="index < 3" style="width: 12vw">
                  <image
                    :src="'/static/images/rank' + (index + 1) + '.png'"
                    mode="widthFix"
                    class="rankIcon"
                  />
                </view>
                <view v-else style="width: 12vw">
                  <view class="rankIcon">{{ index + 1 }}</view>
                </view>
                <view class="memberBox">
                  <view class="memberAvatar">
                    <image
                      :src="getImageUrl(item.member?.avatar + '?x-oss-process=style/jzcq')"
                      mode="widthFix"
                      class="memberAvatarIcon"
                    />
                  </view>
                  <view class="nickname">{{ formatNickname(item.member?.nickname, 22) }}</view>
                </view>
              </view>
              <view class="point">{{ formatNumber(item.total_point, 2) }}</view>
            </view>
          </template>
          <template v-else>
            <view class="emptyBox">
              <view class="emptyImg"></view>
              <view class="emptyText">{{ t('common.empty') }}</view>
            </view>
          </template>
        </view>
      </template>
      <template #footer>
        <wd-loadmore v-if="isLoading" state="loading" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>

    <root-portal>
      <wd-popup v-model="revenueHelpPopupShow" custom-class="revenueHelpPopup" :z-index="10001">
        <view class="revenueHelpContent">
          <view class="revenueHelpClose" @click="revenueHelpPopupShow = false">
            <wd-icon name="close" size="18px" color="#8c7b70" />
          </view>
          <view class="revenueHelpTitle">{{ t('pledge.ranking.except_point') }}</view>

          <view class="revenueHelpDescription">
            {{ t('pledge.ranking.revenue_help') }}
          </view>
          <view class="revenueHelpButton" @click="revenueHelpPopupShow = false">
            {{ t('common.btn.got_it') }}
          </view>
        </view>
      </wd-popup>
    </root-portal>
  </view>
</template>

<script lang="ts" setup>
import { t } from '@/locale/index'
import { getPledgeRankingApi } from '@/service/api/pledge'
import type { getPledgeRankingListResponse } from '@/service/api/pledge'
import { formatNickname, formatNumber, getImageUrl } from '@/utils'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 滚动到顶部
const scrollTop = ref<number>(0)
const revenueHelpPopupShow = ref(false)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const isLoading = ref(false)
onLoad((options) => {
  loadMore()
})

const rankingList = ref<getPledgeRankingListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
})

onReachBottom(() => {
  if (rankingList.value.current_page < rankingList.value.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  if (isLoading.value) return
  isLoading.value = true
  getPledgeRankingApi(rankingList.value?.current_page + 1)
    .then((res) => {
      if (!res.data) return
      rankingList.value.data = rankingList.value.data.concat(res.data.data)
      rankingList.value.current_page = res.data.current_page
      rankingList.value.last_page = res.data.last_page
    })
    .finally(() => {
      isLoading.value = false
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

.rankingBox {
  padding: 40rpx;
  font-size: 28rpx;
  line-height: 33rpx;
  color: var(--text-primary);
  background-color: var(--bg-card);
  border-radius: 40rpx;

  .rankingItem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32rpx;

    .ranking {
      display: flex;
      align-items: center;
      .rankIcon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48rpx;
        height: 48rpx;
        margin-right: 16rpx;
        font-size: 24rpx;
        line-height: 32rpx;
        color: var(--text-primary);
        text-align: center;
      }
      .memberBox {
        display: flex;
        align-items: center;
        justify-content: center;

        .memberAvatar {
          width: 64rpx;
          height: 64rpx;
          padding: 2rpx;
          margin-right: 16rpx;
          overflow: hidden;
          border-radius: 50%;
          .memberAvatarIcon {
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }
        }

        .nickname {
          font-size: 28rpx;
          line-height: 40rpx;
          color: var(--text-primary);
        }
      }
    }

    .point {
      font-size: 28rpx;
      line-height: 40rpx;
      color: var(--text-primary);
    }

    .pointHeader {
      display: flex;
      align-items: center;
      gap: 8rpx;
    }
  }
  .rankingItem:last-child {
    margin-bottom: 0;
  }
}

:deep(.revenueHelpPopup) {
  width: 590rpx;
  max-width: calc(100vw - 80rpx);
  overflow: visible;
  background-color: var(--bg-card);
  border-radius: 40rpx;
  box-shadow: 0 24rpx 80rpx rgba(70, 34, 8, 0.2);
}

.revenueHelpContent {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 52rpx 40rpx 40rpx;
  text-align: center;
}

.revenueHelpClose {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  background: var(--revenueHelpClose-bg-color);
  border-radius: 50%;
}

.revenueHelpIcon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104rpx;
  height: 104rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(145deg, #fff4ec 0%, #ffe2cc 100%);
  border: 2rpx solid rgba(255, 107, 3, 0.12);
  border-radius: 50%;
}

.revenueHelpTitle {
  margin-bottom: 20rpx;
  font-size: 36rpx;
  font-weight: 600;
  line-height: 50rpx;
  color: var(--text-primary);
}

.revenueHelpDescription {
  width: 100%;
  box-sizing: border-box;
  padding: 28rpx 32rpx;
  margin-bottom: 36rpx;
  font-size: 28rpx;
  line-height: 44rpx;
  color: var(--revenueHelpDescription-color);
  text-align: left;
  background: var(--revenueHelpDescription-bg-color);
  border: 2rpx solid var(--revenueHelpDescription-border-color);
  border-radius: 24rpx;
  display: flex;
  justify-content: center;
}

.revenueHelpButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--bg-card);
  background: linear-gradient(135deg, #ff842e 0%, #ff6b03 100%);
  border-radius: 44rpx;
  box-shadow: 0 12rpx 28rpx rgba(255, 107, 3, 0.24);
}
</style>

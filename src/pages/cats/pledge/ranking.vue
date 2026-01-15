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
            <view class="ranking">{{ t('pledge.ranking.ranking') }}</view>
            <view class="point">{{ t('pledge.ranking.except_point') }}</view>
          </view>
          <template v-if="rankingList && rankingList.data.length > 0">
            <view class="rankingItem" v-for="(item, index) in rankingList.data" :key="index">
              <view class="ranking">
                <template v-if="index < 3">
                  <image
                    :src="'/static/images/rank' + (index + 1) + '.png'"
                    mode="widthFix"
                    class="rankIcon"
                  />
                </template>
                <template v-else>
                  <view class="rankIcon">{{ index + 1 }}</view>
                </template>
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
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getPledgeRankingApi, getPledgeRankingListResponse } from '@/service/api/pledge'
import { formatNickname, formatNumber, getImageUrl } from '@/utils'
import { useToast } from 'wot-design-uni'

import CustomNav from '@/components/CustomNav/CustomNav.vue'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

// 语言
const locale = uni.getLocale()
const toast = useToast()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')
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
  state.value = 'loading'
  getPledgeRankingApi(rankingList.value?.current_page + 1).then((res) => {
    if (!res.data) return
    rankingList.value.data = rankingList.value.data.concat(res.data.data)
    rankingList.value.current_page = res.data.current_page
    rankingList.value.last_page = res.data.last_page
    if (rankingList.value?.current_page === rankingList.value?.last_page) {
      state.value = 'finished'
    }
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.rankingBox {
  padding: 40rpx;
  font-size: 28rpx;
  line-height: 33rpx;
  color: #261000;
  background-color: #fff;
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
        color: #261000;
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
          color: #261000;
        }
      }
    }

    .point {
      font-size: 28rpx;
      line-height: 40rpx;
      color: #261000;
    }
  }
  .rankingItem:last-child {
    margin-bottom: 0;
  }
}
</style>

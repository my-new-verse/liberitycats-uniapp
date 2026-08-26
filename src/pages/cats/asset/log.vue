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
    <custom-nav :title="t('asset.log.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <template v-if="logResponse.log?.data.length > 0">
          <template v-for="item in logResponse.log.data" :key="item.id">
            <view class="logBox">
              <view class="logItem">
                <view class="logTile">{{ item.change_field_i18n }}</view>
                <view class="logRemark">{{ item.remark }}</view>
                <view class="logTime">{{ formatTime(item?.create_time, 'YYYY-M-D H:i') }}</view>
              </view>
              <view class="logValue" :class="{ logValue2: item.change_value > 0 }">
                {{ item.change_value }}
              </view>
            </view>
          </template>
        </template>
        <template v-else>
          <view class="emptyBox">
            <view class="emptyImg"></view>
          </view>
        </template>
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
import { getAssetLogListApi, getAssetLogListApiResponse } from '@/service/api/asset'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { formatTime, toUrl } from '@/utils'
// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')
const assetKey = ref<string>('point')
onLoad((param) => {
  if (param?.assetKey) {
    assetKey.value = param.assetKey
  }
  loadMore()
})

const logResponse = ref<getAssetLogListApiResponse>({
  log: {
    current_page: 0,
    data: [],
    last_page: 1,
  },
})

onReachBottom(() => {
  if (logResponse.value.log?.current_page < logResponse.value.log?.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  state.value = 'loading'
  getAssetLogListApi(assetKey.value, logResponse.value.log?.current_page + 1).then((res) => {
    if (!res.data) return
    logResponse.value.log.data = logResponse.value.log.data.concat(res.data.log.data)
    logResponse.value.log.current_page = res.data.log.current_page
    logResponse.value.log.last_page = res.data.log.last_page
    if (logResponse.value.log?.current_page === logResponse.value.log?.last_page) {
      state.value = 'finished'
    }
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.logBox {
  position: relative;
  display: flex;
  justify-content: space-between;
  width: calc(100% - 80rpx);
  padding: 40rpx;
  margin-bottom: 32rpx;
  color: var(--text-primary);
  background-color: var(--bg-card);
  border-radius: 48rpx;
  .logItem {
    display: flex;
    flex-direction: column;

    .logRemark {
      font-size: 24rpx;
      font-weight: 400;
      line-height: 28rpx;
      color: rgba(0, 0, 0, 0.3);
      text-align: left;
      text-transform: none;
    }

    .logTile {
      margin-bottom: 16rpx;
      font-size: 32rpx;
      font-weight: 600;
      line-height: 50rpx;
    }

    .logTime {
      margin-top: 16rpx;
      font-size: 24rpx;
      font-style: normal;
      font-weight: normal;
      line-height: 28rpx;
      color: rgba(0, 0, 0, 0.3);
      text-align: left;
      text-transform: none;
    }
  }
  .logValue {
    font-size: 38rpx;
    font-weight: 600;
    line-height: 56rpx;
    color: #ff6b03;
  }

  .logValue2 {
    color: var(--actions-text);
  }
}
</style>

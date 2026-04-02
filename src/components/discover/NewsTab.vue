<template>
  <view class="socialOpBox">
    <view class="opItem" :class="{ active: tabType === -1 }" @click="changeTab(-1)">
      {{ t('discover.news.tag.flash') }}
    </view>
    <view class="opItem" :class="{ active: tabType === 0 }" @click="changeTab(0)">
      {{ t('discover.news.tag.news') }}
    </view>
  </view>

  <template v-if="tabType === -1">
    <view style="padding: 32rpx; background-color: #ffffff; border-radius: 32rpx">
      <template v-if="newsList.data.length > 0">
        <wd-steps :active="2" vertical dot class="kxBox">
          <template v-for="(item, index) in newsList.data" :key="index">
            <wd-step @click="toUrl('/pages/cats/news/detail?id=' + item.id)">
              <template v-slot:title>
                {{ formatRelativeTime(item.create_time) }}
              </template>
              <template v-slot:description>
                {{ item.title }}
                <view class="coverBox" v-if="item.cover">
                  <image :src="item.cover" mode="widthFix" />
                </view>
              </template>
            </wd-step>
          </template>
        </wd-steps>
      </template>
      <template v-else>
        <view class="emptyBox">
          <view class="emptyImg"></view>
          <view class="emptyText">{{ t('common.empty') }}</view>
        </view>
      </template>
    </view>
  </template>
  <template v-else>
    <template v-if="newsList.data.length > 0">
      <view class="cell" v-for="(item, index) in newsList.data" :key="index">
        <view class="newsItem" @click="toUrl('/pages/cats/news/detail?id=' + item.id)">
          <view class="imgBox">
            <image :src="getImageUrl(item.cover)" mode="widthFix" />
          </view>
          <view class="infoBox">
            <view class="title">
              {{ item.title }}
            </view>
            <view class="time">{{ formatTime(item.create_time, 'YYYY-M-D H:i') }}</view>
          </view>
        </view>
      </view>
    </template>
    <template v-else>
      <view class="emptyBox">
        <view class="emptyImg"></view>
        <view class="emptyText">{{ t('common.empty') }}</view>
      </view>
    </template>
  </template>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { formatRelativeTime, formatTime, getImageUrl, toUrl } from '@/utils'
import { getNewsListApi } from '@/service/api/news'
import { t } from '@/locale'

const tabType = ref(-1)

type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'

interface NewsList {
  data: any[]
  last_page: number
  current_page: number
}

const props = defineProps<{
  state: LoadMoreState
}>()

const emit = defineEmits<{
  'update:state': [state: LoadMoreState]
  'refresh-complete': []
  'refresh-error': []
}>()

const newsList = ref<NewsList>({
  data: [],
  last_page: 1,
  current_page: 0,
})

let isRefreshing = false

// 更新加载状态
const updateState = (state: LoadMoreState) => {
  emit('update:state', state)
}

// 加载新闻数据
const loadNews = async (page = 1) => {
  try {
    const res = await getNewsListApi(page, tabType.value)
    if (page === 1) {
      newsList.value = res.data
    } else {
      newsList.value.data = newsList.value.data.concat(res.data.data)
      newsList.value.current_page = res.data.current_page
      newsList.value.last_page = res.data.last_page
    }

    // 更新状态为非加载状态
    updateState('success')
    // 如果是刷新操作，发出刷新完成事件
    if (isRefreshing && page === 1) {
      emit('refresh-complete')
      isRefreshing = false
    }
  } catch (error) {
    updateState('error')
    // 如果是刷新操作，发出刷新错误事件
    if (isRefreshing) {
      emit('refresh-error')
      isRefreshing = false
    }
    console.error('Failed to load news:', error)
  }
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      // 检查是否还有更多数据可以加载
      if (newsList.value.current_page < newsList.value.last_page) {
        loadNews(newsList.value.current_page + 1)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    }
  },
)

// 初始加载
onMounted(() => {
  loadNews()
  // 监听刷新事件
  uni.$on('refreshNewsTab', () => {
    isRefreshing = true
    loadNews(1)
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  uni.$off('refreshNewsTab')
})

const changeTab = (type: number) => {
  tabType.value = type
  newsList.value.data = []
  newsList.value.current_page = 1
  newsList.value.last_page = 1
  loadNews()
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.kxBox) {
  .coverBox {
    width: 100%;
    margin-top: 20rpx;
    image {
      max-width: 100%;
    }
  }
}

.zh-Hans {
  .newsItem {
    .infoBox {
      .title {
        font-family: Alibaba PuHuiTi2;
      }
    }
  }
}
.zh-Hant {
  .newsItem {
    .infoBox {
      .title {
        font-family: Alibaba PuHuiTi2;
      }
    }
  }
}

.filterBox {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  margin-bottom: 20rpx;
  color: #999;
  background-color: #efefef;
}
// news start
.newsItem {
  display: flex;
  align-items: center;
  color: #999;
  background-color: #fff;
  .imgBox {
    width: 218rpx;
    height: 144rpx;
    margin-right: 24rpx;
    overflow: hidden;
    border-radius: 32rpx;
    image {
      width: 100%;
      height: 100%;
    }
  }

  .infoBox {
    width: calc(100% - 218rpx - 32rpx);
    .title {
      display: -webkit-box;
      max-height: 80rpx;
      overflow: hidden;
      font-size: 32rpx;
      font-weight: 400;
      line-height: 40rpx;
      color: #261000;
      text-overflow: ellipsis;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .time {
      margin-top: 20rpx;
      font-size: 24rpx;
      font-weight: 400;
      line-height: 28rpx;
      color: rgba(0, 0, 0, 0.3);
    }
  }
}

.socialOpBox {
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: 36rpx;
  .opItem {
    margin-right: 16rpx;
    font-size: 28rpx;
    font-weight: 400;
    line-height: 33rpx;
    color: #999999;
  }

  .opItem.active {
    font-weight: 500;
    color: #ff6b03;
  }
}
// news end
</style>

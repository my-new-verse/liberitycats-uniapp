<template>
  <view class="socialOpBox" :style="{ height: cntPaddingTop + 20 + 'rpx' }">
    <view class="opItem" :class="{ active: tabType === -1 }" @click="changeTab(-1)">
      {{ t('discover.news.tag.flash') }}
    </view>
    <view class="opItem" :class="{ active: tabType === 0 }" @click="changeTab(0)">
      {{ t('discover.news.tag.news') }}
    </view>
  </view>

  <template v-if="tabType === -1">
    <view class="" :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
      <view style="padding: 32rpx; background-color: var(--bg-card); border-radius: 32rpx">
        <template v-if="newsList.data.length > 0">
          <wd-steps :active="2" vertical dot class="kxBox">
            <template v-for="(item, index) in newsList.data" :key="index">
              <wd-step
                @click="toUrl('/pages/cats/news/detail?id=' + item.id)"
                custom-class="kx-step"
              >
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
        <template v-else-if="activeNewsCache.hasInitialized">
          <view class="emptyBox">
            <view class="emptyImg"></view>
            <view class="emptyText">{{ t('common.empty') }}</view>
          </view>
        </template>
      </view>
    </view>
  </template>
  <template v-else>
    <view v-if="newsList.data.length > 0" :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
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
    </view>
    <template v-else-if="activeNewsCache.hasInitialized">
      <view class="emptyBox">
        <view class="emptyImg"></view>
        <view class="emptyText">{{ t('common.empty') }}</view>
      </view>
    </template>
  </template>
</template>

<script lang="ts" setup>
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from 'vue'
import { formatRelativeTime, formatTime, getImageUrl, toUrl } from '@/utils'
import { getNewsListApi } from '@/service/api/news'
import { t } from '@/locale'

type NewsTabType = -1 | 0
const tabType = ref<NewsTabType>(-1)

type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'

interface NewsList {
  data: any[]
  last_page: number
  current_page: number
}

const props = defineProps<{
  state: LoadMoreState
  cntPaddingTop: number
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
type NewsCache = {
  list: NewsList
  state: LoadMoreState
  scrollTop: number
  hasInitialized: boolean
  isLoading: boolean
}

const createNewsList = (): NewsList => ({
  data: [],
  last_page: 1,
  current_page: 0,
})

const createNewsCache = (): NewsCache => ({
  list: createNewsList(),
  state: 'loading',
  scrollTop: 0,
  hasInitialized: false,
  isLoading: false,
})

const newsCacheMap = ref<Record<NewsTabType, NewsCache>>({
  [-1]: createNewsCache(),
  0: createNewsCache(),
})
const activeNewsCache = computed(() => newsCacheMap.value[tabType.value])

// 更新加载状态
const updateState = (state: LoadMoreState, type = tabType.value) => {
  newsCacheMap.value[type].state = state
  emit('update:state', state)
}

const getPageScrollTop = () => {
  return new Promise<number>((resolve) => {
    uni
      .createSelectorQuery()
      .selectViewport()
      .scrollOffset((res: any) => {
        resolve(res?.scrollTop || 0)
      })
      .exec()
  })
}

const saveCurrentScrollTop = async () => {
  newsCacheMap.value[tabType.value].scrollTop = await getPageScrollTop()
}

const restoreScrollTop = (type: NewsTabType) => {
  const cache = newsCacheMap.value[type]
  nextTick(() => {
    uni.pageScrollTo({
      scrollTop: cache.hasInitialized ? cache.scrollTop || 0 : 0,
      duration: 0,
    })
  })
}

const syncActiveCache = () => {
  const cache = newsCacheMap.value[tabType.value]
  newsList.value = cache.list
  emit('update:state', cache.state)
}

// 加载新闻数据
const loadNews = async (page = 1, type = tabType.value) => {
  const cache = newsCacheMap.value[type]
  if (cache.isLoading) return

  try {
    cache.isLoading = true
    const res = await getNewsListApi(page, type)
    if (page === 1) {
      cache.list = res.data
    } else {
      cache.list.data = cache.list.data.concat(res.data.data)
      cache.list.current_page = res.data.current_page
      cache.list.last_page = res.data.last_page
    }

    // 更新状态为非加载状态
    cache.state = 'success'
    cache.hasInitialized = true
    if (tabType.value === type) {
      newsList.value = cache.list
      updateState('success', type)
    }
    // 如果是刷新操作，发出刷新完成事件
    if (isRefreshing && page === 1) {
      emit('refresh-complete')
      isRefreshing = false
    }
  } catch (error) {
    cache.state = 'error'
    if (tabType.value === type) {
      updateState('error', type)
    }
    // 如果是刷新操作，发出刷新错误事件
    if (isRefreshing) {
      emit('refresh-error')
      isRefreshing = false
    }
    console.error('Failed to load news:', error)
  } finally {
    cache.isLoading = false
  }
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      // 检查是否还有更多数据可以加载
      if (newsList.value.current_page < newsList.value.last_page) {
        loadNews(newsList.value.current_page + 1, tabType.value)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    }
  },
)

// 初始加载
onMounted(() => {
  syncActiveCache()
  if (!newsCacheMap.value[tabType.value].hasInitialized) {
    loadNews(1, tabType.value)
  }
  // 监听刷新事件
  uni.$on('refreshNewsTab', () => {
    isRefreshing = true
    loadNews(1, tabType.value)
  })
  // 监听跳转快讯tab事件
  uni.$on('switchToNewsTab', () => {
    tabType.value = -1
    nextTick(() => {
      loadNews(1, -1)
    })
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  uni.$off('refreshNewsTab')
  uni.$off('switchToNewsTab')
})

const changeTab = async (type: NewsTabType) => {
  if (tabType.value === type) return
  await saveCurrentScrollTop()
  tabType.value = type
  syncActiveCache()
  restoreScrollTop(type)
  if (!newsCacheMap.value[type].hasInitialized) {
    loadNews(1, type)
  }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
:deep(.page-container) {
}

:deep(.kxBox) {
  .coverBox {
    width: 100%;
    margin-top: 20rpx;
    image {
      max-width: 100%;
    }
  }
  .kx-step {
    .wd-step__title,
    .wd-step__description {
      font-size: 28rpx !important;
      font-family: Alibaba PuHuiTi2 !important;
    }
    .wd-step__description {
      color: var(--text-primary);
    }
    .wd-step__title {
      color: var(--text-secondary);
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
  color: var(--text-secondary);
  background-color: #efefef;
}
// news start
.newsItem {
  display: flex;
  align-items: center;
  color: var(--text-secondary);
  background-color: var(--bg-card);
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
      color: var(--text-primary);
      text-overflow: ellipsis;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .time {
      margin-top: 20rpx;
      font-size: 24rpx;
      font-weight: 400;
      line-height: 28rpx;
      color: var(--black-30);
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
    color: var(--text-secondary);
  }

  .opItem.active {
    font-weight: 500;
    color: #ff6b03;
  }
}
::v-deep .wd-step.is-wait .wd-step__description {
  color: var(--text-secondary, var(--wot-steps-description-color, rgba(0, 0, 0, 0.45)));
}
::v-deep .wd-step.is-process .wd-step__title,
::v-deep .wd-step.is-finished .wd-step__title {
  color: var(--wot-steps-finished-color, var(--wot-color-theme, #4d80f0));
}
.socialOpBox {
  position: fixed;
  width: 100vw;
  z-index: 10;
  align-items: flex-end !important;
  background-color: var(--bg-primary);
  padding-bottom: 12rpx;
}
// news end
</style>

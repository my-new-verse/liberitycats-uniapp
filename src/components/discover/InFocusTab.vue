<template>
  <template v-if="inFocusList.data.length > 0">
    <view :style="{ paddingTop: cntPaddingTop + 36 + 20 + 'rpx' }">
      <view
        class="cell"
        v-for="item in inFocusList.data"
        :key="item.id"
        @click="toInFocusDetail(item)"
      >
        <view class="socialItem">
          <view class="socialHead">
            <view class="avatarBox">
              <image class="avatar" :src="item.author.avatar" />
            </view>
            <view class="nameWrap">
              <view class="name">{{ item.author?.name }}</view>
            </view>
          </view>
          <view class="socialCntBox">
            <view class="socialCnt">{{ item.text }}</view>
            <!-- article -->
            <view
              v-if="item.article && (item.article.title || item.article.preview_text)"
              class="articleCard"
            >
              <image
                v-if="item.article.cover_media_img_url"
                class="articleCover"
                :src="item.article.cover_media_img_url"
                mode="aspectFill"
              />
              <view class="articleBody">
                <view class="articleTitle">{{ item.article.title }}</view>
                <view v-if="item.article.preview_text" class="articlePreview">
                  {{ item.article.preview_text }}
                </view>
              </view>
            </view>
            <view
              class="socialMedia"
              v-if="item.media && item.media.length > 0"
              :class="{ mediaImg4: item.media.length === 4 }"
            >
              <view v-for="(media, index) in item.media" :key="index" style="width: 100%">
                <!-- 视频：使用 DomVideoPlayer（renderjs + HTML5 video），无原生层级问题 -->
                <view
                  v-if="isVideoMedia(media)"
                  :id="'vc_' + item.id + '_' + index"
                  class="videoCoverWrap"
                  @click.stop
                >
                  <DomVideoPlayer
                    :ref="(el) => setVideoRef(item.id, index, el)"
                    :src="getPlayableVideoUrl(media)"
                    controls
                    :poster="media.media_url_https || media.url || ''"
                    objectFit="contain"
                  />
                </view>
                <!-- 图片 -->
                <view
                  v-else
                  class="imgItemWrap"
                  @click.stop="handlePreviewMedia(item.media, index)"
                >
                  <wd-img
                    custom-class="mediaImgItem"
                    mode="widthFix"
                    :src="media.media_url_https || media.url || ''"
                    :enable-preview="false"
                    custom-style="height: auto !important;width: 100% !important;"
                  />
                </view>
              </view>
            </view>
            <view class="socialTime">
              {{ formatWithDate(item.publishedAt) }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
  <template v-else-if="cache.initialized">
    <view class="emptyBox">
      <view class="emptyImg"></view>
    </view>
  </template>
</template>

<script lang="ts" setup>
import { ref, reactive, nextTick, getCurrentInstance, onUnmounted } from 'vue'
import { getImageUrl, formatRelativeTime, toUrl, handlePreview } from '@/utils'
import {
  getInFocusListApi,
  InFocusListApiResponse,
  InFocusMedia,
  InFocusArticle,
} from '@/service/api/news'
import DomVideoPlayer from 'uniapp-video-player'

type LoadMoreState = 'loading' | 'finished' | 'error' | 'success'

// ========== Props / Emits ==========
const props = defineProps<{
  cntPaddingTop: number
  active: boolean
}>()

const emit = defineEmits<{
  'update:state': [state: LoadMoreState]
  'refresh-complete': []
  'refresh-error': []
}>()

// ========== 缓存结构 ==========
const cache = reactive({
  initialized: false,
  loading: false,
  state: 'loading' as LoadMoreState,
  scrollTop: 0,
})

const inFocusList = ref<InFocusListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
  per_page: 20,
  total: 0,
})

// ========== 视频工具 ==========
const isVideoMedia = (media: InFocusMedia) => {
  return !!(media.video_info && media.video_info.variants && media.video_info.variants.length > 0)
}

const getPlayableVideoUrl = (media: InFocusMedia): string => {
  const variants = media.video_info?.variants || []
  // 优先选 mp4（最高 bitrate）
  const mp4Variants = variants
    .filter((v) => v.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
  if (mp4Variants.length > 0) return mp4Variants[0].url || ''
  // 兜底：选第一个有 url 的
  const fallback = variants.find((v) => v.url)
  return fallback?.url || ''
}

// ========== 视频播放控制（离开可视区域自动暂停）==========
const videoRefs = new Map<string, any>()
const videoObservers: any[] = []
const componentInstance = getCurrentInstance()?.proxy

const setVideoRef = (itemId: number, mediaIndex: number, el: any) => {
  const key = `${itemId}_${mediaIndex}`
  if (el) {
    videoRefs.set(key, el)
  } else {
    videoRefs.delete(key)
  }
}

const disconnectAllObservers = () => {
  videoObservers.forEach((o) => {
    try {
      o.disconnect()
    } catch (_) {}
  })
  videoObservers.length = 0
}

const setupVideoObservers = () => {
  disconnectAllObservers()
  if (!componentInstance) return

  inFocusList.value.data.forEach((item) => {
    if (!item.media) return
    item.media.forEach((media, mediaIndex) => {
      if (!isVideoMedia(media)) return
      const key = `${item.id}_${mediaIndex}`
      const selector = `#vc_${item.id}_${mediaIndex}`
      try {
        const observer = uni.createIntersectionObserver(componentInstance, { thresholds: [0] })
        observer.relativeToViewport().observe(selector, (res) => {
          if (res.intersectionRatio <= 0) {
            const player = videoRefs.get(key)
            if (player) player.pause()
          }
        })
        videoObservers.push(observer)
      } catch (_) {
        // H5 等环境不支持 createIntersectionObserver，静默忽略
      }
    })
  })
}

onUnmounted(() => {
  disconnectAllObservers()
  videoRefs.clear()
})

// ========== 媒体点击 ==========
const handleMediaTap = (media: InFocusMedia[], index: number) => {
  const m = media[index]
  if (m && isVideoMedia(m)) {
    // 视频跳转详情页播放
    return
  }
  // 图片预览
  const urls = media.filter((m) => !isVideoMedia(m)).map((m) => m.media_url_https || m.url || '')
  const imgIndex = media.slice(0, index).filter((m) => !isVideoMedia(m)).length
  handlePreview(urls, imgIndex)
}

// ========== 图片预览 ==========
const handlePreviewMedia = (media: InFocusMedia[], index: number) => {
  const urls = media.map((m) => m.media_url_https || m.url || '')
  handlePreview(urls, index)
}
const formatWithDate = (isoString) => {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
// ========== 加载数据 ==========
const loadInFocus = async (page = 1, isRefresh = false) => {
  if (cache.loading) return
  cache.loading = true
  if (props.active) emit('update:state', 'loading')
  try {
    const res = await getInFocusListApi({ page, limit: 20 })
    // console.log(res.data.data.findIndex((item) => item.type === 'video' || item.video_info))
    if (page === 1) {
      inFocusList.value = res.data
    } else {
      inFocusList.value.data = inFocusList.value.data.concat(res.data.data)
      inFocusList.value.current_page = res.data.current_page
      inFocusList.value.last_page = res.data.last_page
    }
    cache.initialized = true
    // 在 API 返回后判断是否到底，避免提前展示 finished
    const noMore = inFocusList.value.current_page >= inFocusList.value.last_page
    cache.state = noMore ? 'finished' : 'success'
    if (props.active) emit('update:state', noMore ? 'finished' : 'success')
    if (isRefresh && page === 1) emit('refresh-complete')
    // 数据加载成功后 nextTick 设置视频可见性观察（离开视口自动暂停）
    await nextTick()
    setupVideoObservers()
  } catch (error) {
    cache.state = 'error'
    if (props.active) emit('update:state', 'error')
    if (isRefresh) emit('refresh-error')
    console.error('Failed to load inFocus:', error)
  } finally {
    cache.loading = false
  }
}

// ========== 暴露给父组件的接口 ==========
/** 激活时同步状态（切换到本 tab 时调用） */
const onActivate = () => {
  emit('update:state', cache.initialized ? cache.state : 'loading')
  if (!cache.initialized) loadInFocus(1)
}

/** 加载更多 */
const loadMore = () => {
  if (cache.loading) return
  if (inFocusList.value.current_page < inFocusList.value.last_page) {
    loadInFocus(inFocusList.value.current_page + 1)
  } else {
    emit('update:state', 'finished')
  }
}

/** 下拉刷新 */
const refresh = () => {
  loadInFocus(1, true)
}

/** 获取当前缓存滚动位置 */
const getScrollTop = () => cache.scrollTop

/** 保存滚动位置 */
const saveScrollTop = (top: number) => {
  cache.scrollTop = top
}

defineExpose({ onActivate, loadMore, refresh, getScrollTop, saveScrollTop })

// ========== 跳转详情 ==========
const toInFocusDetail = (item: any) => {
  toUrl(`/pages/cats/social/inFocus-detail?data=${encodeURIComponent(JSON.stringify(item))}`, false)
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

::v-deep .mediaImgItem {
  width: 100% !important;
  height: auto !important;
  min-height: 120rpx;
}

:deep(.socialMedia) {
  display: flex !important;
  grid-template-columns: repeat(3, 1fr);

  &.mediaImg4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

.videoCoverWrap {
  position: relative;
  width: 100%;
  // min-height: 400rpx;
  background-color: #f3f3f4;
  border-radius: 12rpx;
  overflow: hidden;
}

.imgItemWrap {
  width: 100%;
  min-height: 180rpx;
  background-color: #f3f3f4;
  border-radius: 12rpx;
  overflow: hidden;
}

.articleCard {
  margin-top: 16rpx;
  border: 1rpx solid #e8e8e8;
  border-radius: 16rpx;
  overflow: hidden;
  background-color: #fafafa;

  .articleCover {
    width: 100%;
    height: 240rpx;
  }

  .articleBody {
    padding: 20rpx 24rpx;

    .articleTitle {
      font-size: 28rpx;
      font-weight: 700;
      color: #261000;
      line-height: 40rpx;
    }

    .articlePreview {
      margin-top: 8rpx;
      font-size: 24rpx;
      font-weight: 400;
      color: #666666;
      line-height: 36rpx;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
    }
  }
}
</style>

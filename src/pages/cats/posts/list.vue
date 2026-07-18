<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    enablePullDownRefresh: true,
    'app-plus': {
      pullToRefresh: {
        style: 'circle',
        color: '#ff6b03',
        offset: '80rpx',
      },
    },
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('my.menu.my_post')">
      <template #default>
        <!-- 帖子筛选 tab -->
        <view class="postFilterBar">
          <view
            v-for="tab in postFilterTabs"
            :key="tab.key"
            class="postFilterTab"
            :class="{ active: activePostFilter === tab.key }"
            @click="handlePostFilterChange(tab.key)"
          >
            <text class="postFilterTabText">{{ tab.label }}</text>
          </view>
          <view class="postFilterSlider" :class="'slider--' + activePostFilter"></view>
        </view>

        <template v-if="socialList.data?.length > 0">
          <!-- 普通帖 -->
          <template v-if="activePostFilter === 'normal'">
            <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
              <SocialPostItem
                :item="item"
                show-delete
                @delete="handleDelPost"
                @avatar-click="
                  (i) => toUrl('/pages/cats/user/home?member_id=' + i.member_id, false)
                "
                @click="(i) => toUrl('/pages/cats/social/detail?id=' + i.id, false)"
                @view-click="(i) => toUrl('/pages/cats/social/detail?id=' + i.id, false)"
                @comment-click="
                  (i) => toUrl('/pages/cats/social/detail?id=' + i.id + '&showComment=false', false)
                "
                @like="likePost"
                @share="handleOpenShare"
                @preview="doHandlePreview"
              />
            </view>
          </template>

          <!-- 推广帖 -->
          <template v-if="activePostFilter === 'promotion'">
            <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
              <PromotionPostItem
                :item="item"
                show-delete
                @delete="handleDelPost"
                @avatar-click="
                  (i) => toUrl('/pages/cats/user/home?member_id=' + i.member_id, false)
                "
                @click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
                @view-click="(i) => toUrl('/pages/cats/social/ad_detail?id=' + i.id, false)"
                @comment-click="
                  (i) =>
                    toUrl('/pages/cats/social/ad_detail?id=' + i.id + '&showComment=false', false)
                "
                @like="likePost"
                @share="handleOpenShare"
              />
            </view>
          </template>

          <!-- 草稿：根据 post_category 判断展示样式 -->
          <template v-if="activePostFilter === 'draft'">
            <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
              <SocialPostItem
                v-if="item.post_category !== 'advertisement'"
                :item="item"
                show-delete
                :show-foot="false"
                @delete="handleDelPost"
                @click="(i) => toUrl('/pages/cats/social/publish?id=' + i.id + '&draft=true', true)"
                @preview="doHandlePreview"
              />
              <PromotionPostItem
                v-else
                :item="item"
                show-delete
                :show-foot="false"
                @delete="handleDelPost"
                @avatar-click="
                  (i) => toUrl('/pages/cats/user/home?member_id=' + i.member_id, false)
                "
                @click="(i) => toUrl('/pages/cats/social/publish?id=' + i.id + '&draft=true', true)"
              />
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
        <wd-backtop :scrollTop="scrollTop" />
      </template>
    </custom-nav>
    <SharePopup ref="shareRef" />
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { t } from '@/locale/index'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import SocialPostItem from '@/components/PostItem/SocialPostItem.vue'
import PromotionPostItem from '@/components/PostItem/PromotionPostItem.vue'
import {
  formatNickname,
  formatRelativeTime,
  getImageUrl,
  openUrl,
  toUrl,
  handlePreview,
} from '@/utils'
import { getUserInfoApi } from '@/service/api/user'
import {
  getCommunityPostListApi,
  getCommunityPostListApiResponse,
  getCommunityPostDetailApi,
  likePostApi,
  deletePostApi,
  reportPostApi,
  blockUserApi,
  createFollowApi,
  deleteFollowApi,
  getMyPostsApi,
} from '@/service/api/community'
import { useUserStore } from '@/store'
import { useMessage, useToast } from 'wot-design-uni'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

const userStore = useUserStore()
const message = useMessage()
const toast = useToast()
const shareRef = ref<any>(null)

const handleOpenShare = (item: any) => {
  shareRef.value?.openSharePopup(item)
}

// ========== 筛选缓存 ==========
type PostFilterCache = {
  list: getCommunityPostListApiResponse
  state: string
  loaded: boolean
  loading: boolean
}

const createPostFilterCache = (): PostFilterCache => ({
  list: { current_page: 0, data: [], last_page: 1 },
  state: 'loading',
  loaded: false,
  loading: false,
})

const postFilterCache = ref<Record<string, PostFilterCache>>({
  normal: createPostFilterCache(),
  promotion: createPostFilterCache(),
  draft: createPostFilterCache(),
})

const activePostFilter = ref('normal')
const postFilterTabs = [
  { key: 'normal', label: '普通帖' },
  { key: 'promotion', label: '推广帖' },
  { key: 'draft', label: '草稿' },
]

/** 根据筛选 key 返回接口参数 */
const getFilterParams = (filter: string) => {
  if (filter === 'draft') return { publish_status: 0 }
  const params: any = { publish_status: 1 }
  if (filter === 'normal') params.post_category = 'social'
  if (filter === 'promotion') params.post_category = 'advertisement'
  return params
}

const getCurrentCache = () => postFilterCache.value[activePostFilter.value]

const socialList = ref<getCommunityPostListApiResponse>(
  postFilterCache.value[activePostFilter.value].list,
)

const syncCurrentCache = () => {
  socialList.value = getCurrentCache().list
}

const state = computed(() => getCurrentCache().state || 'loading')

const handlePostFilterChange = (key: string) => {
  if (activePostFilter.value === key) return
  activePostFilter.value = key
  syncCurrentCache()
  const cache = getCurrentCache()
  if (!cache.loaded) loadMore()
}

// 滚动
const scrollTop = ref(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

// 页面加载
onLoad(() => {
  loadMore()

  // 监听刷新事件（从编辑页返回后更新对应帖子）
  uni.$on('refreshNormalPost', (postId?: number) => {
    if (postId) updateListItem(postId)
  })
  uni.$on('refreshPromotionPost', (postId?: number) => {
    if (postId) updateListItem(postId)
  })
  // 草稿编辑成功后刷新列表
  // 发布时携带 category 参数，需同时重置草稿 tab 和对应分类 tab 缓存
  uni.$on('refreshPostList', (category?: string) => {
    // 重置草稿 tab 缓存
    postFilterCache.value.draft = createPostFilterCache()
    // 如果指定了分类，重置对应分类 tab 缓存（发布后的帖子会出现在对应列表中）
    if (category === 'normal' || category === 'promotion') {
      postFilterCache.value[category] = createPostFilterCache()
    }
    // 刷新当前活跃 tab
    loadMore(true)
  })
})

onUnmounted(() => {
  uni.$off('refreshNormalPost')
  uni.$off('refreshPromotionPost')
  uni.$off('refreshPostList')
})

/** 单条更新：获取帖子详情并替换列表中对应项 */
const updateListItem = async (postId: number) => {
  try {
    const res = await getCommunityPostDetailApi(postId)
    if (res.code === 1 && res.data) {
      const index = socialList.value.data.findIndex((item) => item.id === postId)
      if (index !== -1) {
        socialList.value.data[index] = { ...socialList.value.data[index], ...res.data }
      }
    }
  } catch (e) {
    console.error('updateListItem failed', e)
  }
}

// 上拉加载
onReachBottom(() => {
  const cache = getCurrentCache()
  if (cache.loading) return
  if (cache.list.current_page < cache.list.last_page) {
    loadMore()
  }
})

const loadMore = (refresh = false) => {
  const cache = getCurrentCache()
  if (cache.loading) return
  if (refresh) {
    cache.list = { current_page: 0, data: [], last_page: 1 }
    cache.loaded = false
  }
  if (cache.list.current_page >= cache.list.last_page && !refresh) {
    cache.state = 'finished'
    syncCurrentCache()
    return
  }

  cache.loading = true
  cache.state = 'loading'

  const params: any = {
    limit: 20,
    sort: '',
    member_id: userStore.userInfo?.member_id || '',
    ...getFilterParams(activePostFilter.value),
  }

  getMyPostsApi(cache.list.current_page + 1, params)
    .then((res) => {
      if (!res.data) return

      if (res.data.current_page === 1) {
        cache.list.data = res.data.data
      } else {
        cache.list.data = cache.list.data.concat(res.data.data)
      }
      cache.list.current_page = res.data.current_page
      cache.list.last_page = res.data.last_page
      cache.loaded = true

      if (cache.list.current_page === cache.list.last_page) {
        cache.state = 'finished'
      } else {
        cache.state = 'success'
      }
    })
    .catch(() => {
      cache.state = 'error'
    })
    .finally(() => {
      cache.loading = false
      syncCurrentCache()
    })
}

// 下拉刷新
onPullDownRefresh(() => {
  loadMore(true)
  uni.stopPullDownRefresh()
})

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

// 点赞
const likePost = (item: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  likePostApi(item.id).then((res) => {
    if (res.code === 1) {
      item.like_count = res.data.like_count
      item.is_liked = res.data.is_liked

      const timestamp = new Date().getTime()
      if (item.is_liked === 1) {
        item.currentGif = `${GIF_LIKE}?t=${timestamp}`
      } else {
        item.currentGif = `${GIF_UNLIKE}?t=${timestamp}`
      }

      setTimeout(() => {
        item.currentGif = ''
      }, 800)
    }
  })
}

// 删除
const handleDelPost = (id: number) => {
  message
    .confirm({ msg: t('social.index.del_post_confirm_txt') })
    .then(() => {
      deletePostApi(id).then((res) => {
        if (res.data?.result == 1) {
          socialList.value.data = socialList.value.data.filter((i) => i.id !== id)
        }
      })
    })
    .catch(() => {})
}

const showMemberLevelPopup = () => {
  message.alert({})
}
const doHandlePreview = (images: string[], currentIndex: number = 0) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
.page {
  background-color: var(--liberty-cats-page-background-color);
}
:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}
:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}
.nameWrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.followBtn {
  padding: 6rpx 14rpx;
  border-radius: 50rpx;
  background-color: #ff6b03;
  color: #fff;
  font-size: 22rpx;
  &.followed {
    background-color: #fff;
    color: #999;
    border: 1rpx solid #ddd;
  }
}

.postFilterBar {
  position: relative;
  display: flex;
  background: #fff;
  border-radius: 32rpx;
  padding: 6rpx;
  margin-bottom: 20rpx;

  .postFilterTab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 64rpx;
    position: relative;
    z-index: 1;

    .postFilterTabText {
      font-size: 28rpx;
      color: #333;
      position: relative;
      z-index: 2;
    }

    &.active .postFilterTabText {
      color: #fff;
      font-weight: 500;
    }
  }

  .postFilterSlider {
    position: absolute;
    top: 6rpx;
    height: 64rpx;
    width: calc((100% - 12rpx) / 3);
    background: #ff6b03;
    border-radius: 26rpx;
    transition: left 0.15s ease;
    z-index: 0;

    &.slider--normal {
      left: 6rpx;
    }
    &.slider--promotion {
      left: calc((100% - 12rpx) / 3 + 6rpx);
    }
    &.slider--draft {
      left: calc((100% - 12rpx) / 3 * 2 + 6rpx);
    }
  }
}

.socialBtnIcon.more {
  background-image: url('@/static/images/more.png');
}

.socialCntBox {
  .titleRow {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 8rpx;
    .tag {
      padding: 4rpx 16rpx;
      font-size: 24rpx;
      text-transform: uppercase;
      border-radius: 8rpx;
      line-height: 1.4;
    }
    .tag1 {
      color: #fff;
      background: var(--wot-color-primary);
    }
    .tag2 {
      color: #ac59ff;
      background: #ece8f6;
    }
    .tag3 {
      color: #ff0303;
      background: #ffeaea;
    }
  }
  .title {
    flex: 1;
    color: #1d1d1f !important;
  }
  .content {
    color: #666666 !important;
  }
}

.adTagsRow {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 16rpx;
}

.adTagChip {
  font-size: 22rpx;
  color: var(--liberty-cats-primary-color);
  padding: 4rpx 0;
  border-radius: 8rpx;
  margin-right: 12rpx;
}

.zanWrapper {
  width: 85rpx !important;
  height: 85rpx !important;
  position: relative !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  flex-shrink: 0 !important;
  vertical-align: middle;
  margin: 0 -22rpx !important;
  overflow: visible !important;

  .Icon {
    position: absolute !important;
    width: 100% !important;
    height: 100% !important;
    left: 0 !important;
    top: 0 !important;
    display: block !important;
    pointer-events: none !important;
  }
}
</style>

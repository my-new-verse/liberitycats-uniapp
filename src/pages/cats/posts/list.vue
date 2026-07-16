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
              <view class="socialItem">
                <view class="delBox" @click="handleDelPost(item.id)"></view>
                <view class="socialHead">
                  <view class="avatarBox">
                    <image
                      class="avatar"
                      :src="getImageUrl(item.member.avatar + '?x-oss-process=style/jzcq')"
                    />
                    <view class="levelIcon">
                      <image
                        :src="`/static/images/level/${item.member.level}.png`"
                        mode="widthFix"
                      />
                    </view>
                  </view>
                  <view class="nameWrap">
                    <view class="name">{{ formatNickname(item.member.nickname, 22) }}</view>
                  </view>
                  <view v-if="item.tag?.name" class="tag" :class="item.tag?.extend_json?.class">
                    {{ item.tag?.name }}
                  </view>
                </view>
                <view
                  class="socialCntBox"
                  @click="toUrl('/pages/cats/social/detail?id=' + item.id, false)"
                >
                  <view class="socialCnt text-clamp-4">
                    <view class="socialTips" v-if="item.is_approved === 0">
                      {{ t('social.detail.content.not_audit_seed_myself') }}
                    </view>
                    {{ item.content }}
                  </view>
                  <view
                    class="socialMedia"
                    v-if="item.images.length > 0"
                    :class="{
                      mediaImg4: item.images.length === 4,
                      singleImg: item.images.length === 1,
                    }"
                  >
                    <view
                      v-for="(image, index) in item.images"
                      :key="index"
                      @tap.stop="doHandlePreview(item.images, index)"
                    >
                      <wd-img
                        :radius="5"
                        custom-class="mediaImgItem"
                        :mode="item.images.length === 1 ? 'widthFix' : 'aspectFill'"
                        :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                        :enable-preview="false"
                      />
                    </view>
                  </view>
                  <view class="socialTime">{{ formatRelativeTime(item.create_time) }}</view>
                </view>
                <view class="socialFoot">
                  <view
                    class="socialBtnBox"
                    @click="toUrl('/pages/cats/social/detail?id=' + item.id, false)"
                  >
                    <view class="socialBtnIcon view"></view>
                    <view class="socialBtn">{{ item.view_count }}</view>
                  </view>
                  <view
                    class="socialBtnBox"
                    @click="
                      toUrl('/pages/cats/social/detail?id=' + item.id + '&showComment=false', false)
                    "
                  >
                    <view class="socialBtnIcon quote"></view>
                    <view class="socialBtn">{{ item.commit_count }}</view>
                  </view>
                  <view class="socialBtnBox">
                    <view class="zanWrapper" @click.stop="likePost(item)">
                      <image
                        class="Icon"
                        :src="
                          item.is_liked === 1
                            ? '/static/images/unlike.png'
                            : '/static/images/zan0.33.png'
                        "
                        mode="aspectFit"
                        :style="{ opacity: item.currentGif ? 0 : 1 }"
                      />
                      <image :src="item.currentGif" class="Icon" mode="aspectFit" />
                    </view>
                    <view class="socialBtn">{{ item.like_count }}</view>
                  </view>
                  <view class="socialBtnBox" @click="handleOpenShare(item)">
                    <view class="socialBtnIcon share"></view>
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- 推广帖 -->
          <template v-if="activePostFilter === 'promotion'">
            <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
              <view class="socialItem">
                <view class="delBox" @click="handleDelPost(item.id)"></view>
                <view class="socialHead">
                  <view
                    class="avatarBox"
                    @click="toUrl('/pages/cats/user/home?member_id=' + item.member_id, false)"
                  >
                    <image
                      class="avatar"
                      :src="getImageUrl(item.member?.avatar + '?x-oss-process=style/jzcq')"
                    />
                    <view class="levelIcon">
                      <image
                        :src="`/static/images/level/${item.member.level}.png`"
                        mode="widthFix"
                      />
                    </view>
                  </view>
                  <view class="nameWrap">
                    <view class="name">{{ formatNickname(item.member?.nickname, 22) }}</view>
                  </view>
                </view>
                <view
                  class="socialCntBox"
                  @click="toUrl('/pages/cats/social/ad_detail?id=' + item.id, false)"
                >
                  <view class="titleRow" v-if="item.title">
                    <view v-if="item.ad_type?.name" class="tag tag1">
                      {{ item.ad_type?.name }}
                    </view>
                    <view class="socialCnt text-clamp-4 title">{{ item.title }}</view>
                  </view>
                  <view class="socialCnt text-clamp-4 content" v-if="item.content">
                    {{ item.content }}
                  </view>
                  <view class="adTagsRow" v-if="item.ad_tags?.length">
                    <text v-for="tag in item.ad_tags" :key="tag.id" class="adTagChip">
                      # {{ tag.display_name }}
                    </text>
                  </view>
                  <view
                    class="socialMedia"
                    v-if="item.images?.length > 0"
                    :class="{
                      mediaImg4: item.images.length === 4,
                      singleImg: item.images.length === 1,
                    }"
                  >
                    <view
                      v-for="(image, index) in item.images"
                      :key="index"
                      @tap.stop="doHandlePreview(item.images, index)"
                    >
                      <wd-img
                        :radius="5"
                        custom-class="mediaImgItem"
                        :mode="item.images.length === 1 ? 'widthFix' : 'aspectFill'"
                        :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                        :enable-preview="false"
                      />
                    </view>
                  </view>
                  <view class="socialTime">{{ formatRelativeTime(item.create_time) }}</view>
                </view>
                <view class="socialFoot">
                  <view
                    class="socialBtnBox"
                    @click="toUrl('/pages/cats/social/ad_detail?id=' + item.id, false)"
                  >
                    <view class="socialBtnIcon view"></view>
                    <view class="socialBtn">{{ item.view_count }}</view>
                  </view>
                  <view
                    class="socialBtnBox"
                    @click="
                      toUrl(
                        '/pages/cats/social/ad_detail?id=' + item.id + '&showComment=false',
                        false,
                      )
                    "
                  >
                    <view class="socialBtnIcon quote"></view>
                    <view class="socialBtn">{{ item.commit_count }}</view>
                  </view>
                  <view class="socialBtnBox">
                    <view class="zanWrapper" @click.stop="likePost(item)">
                      <image
                        class="Icon"
                        :src="
                          item.is_liked === 1
                            ? '/static/images/unlike.png'
                            : '/static/images/zan0.33.png'
                        "
                        mode="aspectFit"
                        :style="{ opacity: item.currentGif ? 0 : 1 }"
                      />
                      <image :src="item.currentGif" class="Icon" mode="aspectFit" />
                    </view>
                    <view class="socialBtn">{{ item.like_count }}</view>
                  </view>
                  <view class="socialBtnBox" @click="handleOpenShare(item)">
                    <view class="socialBtnIcon share"></view>
                  </view>
                </view>
              </view>
            </view>
          </template>

          <!-- 草稿：根据 post_category 判断展示样式 -->
          <template v-if="activePostFilter === 'draft'">
            <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
              <!-- 普通帖草稿 -->
              <view class="socialItem" v-if="item.post_category !== 'advertisement'">
                <view class="delBox" @click="handleDelPost(item.id)"></view>
                <view class="socialHead">
                  <view class="avatarBox">
                    <image
                      class="avatar"
                      :src="getImageUrl(item.member.avatar + '?x-oss-process=style/jzcq')"
                    />
                    <view class="levelIcon">
                      <image
                        :src="`/static/images/level/${item.member.level}.png`"
                        mode="widthFix"
                      />
                    </view>
                  </view>
                  <view class="nameWrap">
                    <view class="name">{{ formatNickname(item.member.nickname, 22) }}</view>
                  </view>
                  <view v-if="item.tag?.name" class="tag" :class="item.tag?.extend_json?.class">
                    {{ item.tag?.name }}
                  </view>
                </view>
                <view
                  class="socialCntBox"
                  @click="toUrl('/pages/cats/social/detail?id=' + item.id, false)"
                >
                  <view class="socialCnt text-clamp-4">
                    <view class="socialTips" v-if="item.is_approved === 0">
                      {{ t('social.detail.content.not_audit_seed_myself') }}
                    </view>
                    {{ item.content }}
                  </view>
                  <view
                    class="socialMedia"
                    v-if="item.images.length > 0"
                    :class="{
                      mediaImg4: item.images.length === 4,
                      singleImg: item.images.length === 1,
                    }"
                  >
                    <view
                      v-for="(image, index) in item.images"
                      :key="index"
                      @tap.stop="doHandlePreview(item.images, index)"
                    >
                      <wd-img
                        :radius="5"
                        custom-class="mediaImgItem"
                        :mode="item.images.length === 1 ? 'widthFix' : 'aspectFill'"
                        :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                        :enable-preview="false"
                      />
                    </view>
                  </view>
                  <view class="socialTime">{{ formatRelativeTime(item.create_time) }}</view>
                </view>
              </view>
              <!-- 推广帖草稿 -->
              <view class="socialItem" v-else>
                <view class="delBox" @click="handleDelPost(item.id)"></view>
                <view class="socialHead">
                  <view
                    class="avatarBox"
                    @click="toUrl('/pages/cats/user/home?member_id=' + item.member_id, false)"
                  >
                    <image
                      class="avatar"
                      :src="getImageUrl(item.member?.avatar + '?x-oss-process=style/jzcq')"
                    />
                    <view class="levelIcon">
                      <image
                        :src="`/static/images/level/${item.member.level}.png`"
                        mode="widthFix"
                      />
                    </view>
                  </view>
                  <view class="nameWrap">
                    <view class="name">{{ formatNickname(item.member?.nickname, 22) }}</view>
                  </view>
                </view>
                <view
                  class="socialCntBox"
                  @click="toUrl('/pages/cats/social/ad_detail?id=' + item.id, false)"
                >
                  <view class="titleRow" v-if="item.title">
                    <view v-if="item.ad_type?.name" class="tag tag1">
                      {{ item.ad_type?.name }}
                    </view>
                    <view class="socialCnt text-clamp-4 title">{{ item.title }}</view>
                  </view>
                  <view class="socialCnt text-clamp-4 content" v-if="item.content">
                    {{ item.content }}
                  </view>
                  <view class="adTagsRow" v-if="item.ad_tags?.length">
                    <text v-for="tag in item.ad_tags" :key="tag.id" class="adTagChip">
                      # {{ tag.display_name }}
                    </text>
                  </view>
                  <view
                    class="socialMedia"
                    v-if="item.images?.length > 0"
                    :class="{
                      mediaImg4: item.images.length === 4,
                      singleImg: item.images.length === 1,
                    }"
                  >
                    <view
                      v-for="(image, index) in item.images"
                      :key="index"
                      @tap.stop="doHandlePreview(item.images, index)"
                    >
                      <wd-img
                        :radius="5"
                        custom-class="mediaImgItem"
                        :mode="item.images.length === 1 ? 'widthFix' : 'aspectFill'"
                        :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                        :enable-preview="false"
                      />
                    </view>
                  </view>
                  <view class="socialTime">{{ formatRelativeTime(item.create_time) }}</view>
                </view>
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
})

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

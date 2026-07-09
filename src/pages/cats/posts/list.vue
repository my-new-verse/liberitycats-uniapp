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
        <template v-if="socialList.data?.length > 0">
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
                    <image :src="`/static/images/level/${item.member.level}.png`" mode="widthFix" />
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
                <view class="socialTime">
                  {{ formatRelativeTime(item.create_time) }}
                </view>
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
import { ref, watch, onMounted, onUnmounted } from 'vue'
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
  getMyPostListApi,
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

const socialList = ref<getCommunityPostListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

// 滚动
const scrollTop = ref(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

// 加载状态
const state = ref<LoadMoreState>('loading')

// 页面加载
onLoad(() => {
  loadMore()
})

// 上拉加载
onReachBottom(() => {
  if (socialList.value.current_page < socialList.value.last_page) {
    loadMore()
  }
})

const loadMore = () => {
  state.value = 'loading'

  const params: any = {
    limit: 20,
    sort: '',
    member_id: userStore.userInfo?.member_id || '',
  }

  getMyPostListApi(socialList.value.current_page + 1, params)
    .then((res) => {
      if (!res.data) return

      socialList.value.data = socialList.value.data.concat(res.data.data)
      socialList.value.current_page = res.data.current_page
      socialList.value.last_page = res.data.last_page

      if (socialList.value.current_page === socialList.value.last_page) {
        state.value = 'finished'
      } else {
        state.value = 'success'
      }
    })
    .catch(() => {
      state.value = 'error'
    })
}

// 下拉刷新
onPullDownRefresh(() => {
  socialList.value = {
    current_page: 0,
    data: [],
    last_page: 1,
  }
  loadMore()
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

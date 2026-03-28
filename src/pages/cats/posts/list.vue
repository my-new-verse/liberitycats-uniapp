<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
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
                <view class="socialCnt">
                  <view class="socialTips" v-if="item.is_approved === 0">
                    {{ t('social.detail.content.not_audit_seed_myself') }}
                  </view>
                  {{ item.content }}
                </view>
                <view
                  class="socialMedia"
                  v-if="item.images.length > 0"
                  :class="{ mediaImg4: item.images.length === 4 }"
                >
                  <template v-if="item.images.length == 1">
                    <wd-img
                      custom-class="mediaImgItem"
                      mode="widthFix"
                      :src="getImageUrl(item.images[0] + '?x-oss-process=style/sqdt')"
                      :preview-src="item.images.map((item) => getImageUrl(item))"
                      :enable-preview="true"
                    />
                  </template>
                  <template v-else-if="item.images.length > 1">
                    <template v-for="(image, index) in item.images" :key="index">
                      <wd-img
                        custom-class="mediaImgItem"
                        mode="widthFix"
                        :src="getImageUrl(image + '?x-oss-process=style/jzcq')"
                        :preview-src="item.images.map((item) => getImageUrl(item))"
                        :enable-preview="true"
                      />
                    </template>
                  </template>
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
                  <view
                    class="socialBtnIcon zan"
                    :class="{ on: item.is_liked === 1 }"
                    @click="likePost(item.id)"
                  ></view>
                  <view class="socialBtn">{{ item.like_count }}</view>
                </view>
                <view class="socialBtnBox" @click="toShare(item)">
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
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { t } from '@/locale/index'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import { formatNickname, formatRelativeTime, getImageUrl, openUrl, toUrl } from '@/utils'
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

const userStore = useUserStore()
const message = useMessage()
const toast = useToast()

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

// 点赞
const likePost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  likePostApi(id).then((res) => {
    if (res.code === 1) {
      const item = socialList.value.data.find((i) => i.id === id)
      if (item) {
        item.like_count = res.data.like_count
        item.is_liked = res.data.is_liked
      }
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

const toShare = (post: getCommunityPostListApiResponse['data'][number]) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  let twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(post.content)
  if (post.images.length > 0) {
    const twitterCardUrl =
      import.meta.env.VITE_SERVER_BASEURL + '/v1/community/post/share-to-twitter?id=' + post.id
    twitterUrl += '&url=' + encodeURIComponent(twitterCardUrl)
  }
  openUrl(twitterUrl)
}

const showMemberLevelPopup = () => {
  message.alert({})
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
</style>

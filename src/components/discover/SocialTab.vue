<template>
  <view class="socialBox">
    <view class="socialOpBox">
      <view
        class="opItem"
        :class="{ active: socialFilter === 'hot' }"
        @click="handleFilterChange('hot')"
      >
        {{ t('discover.social.filter.hot') }}
      </view>
      <view
        class="opItem"
        :class="{ active: socialFilter === 'latest' }"
        @click="handleFilterChange('latest')"
      >
        {{ t('discover.social.filter.latest') }}
      </view>
      <view
        class="opItem"
        :class="{ active: socialFilter === 'following' }"
        @click="handleFilterChange('following')"
      >
        {{ t('discover.social.filter.following') }}
      </view>
    </view>
    <template v-if="socialList.data.length > 0">
      <view class="cell" v-for="item in socialList.data" :key="item.id">
        <view class="socialItem">
          <view
            class="delBox"
            v-if="item.member_id === userStore.userInfo?.member_id"
            @click="handleDelPost(item.id)"
          ></view>
          <view class="jbBox" v-else @click="reportPost(item)"></view>
          <view class="socialHead">
            <view class="avatarBox" @click="toUserHome(item.member_id)">
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

              <!-- <view
                v-if="!item.member.is_self"
                class="followBtn"
                :class="{ followed: item.member.is_following === 1 }"
                @click="handleFollow(item)"
              >
                {{ item.member.is_following === 1 ? '取消关注' : '关注' }}
              </view> -->
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

    <view class="pubSocial" @click="toUrl('/pages/cats/social/publish', true)">
      <view class="pubImg"></view>
    </view>
  </view>
  <wd-message-box selector="wd-message-box-slot" />
  <wd-toast />
  <wd-action-sheet
    custom-class="reportSheet"
    v-model="reportShow"
    :actions="reportActions"
    :z-index="97"
    @close="reportSheetClose"
    @select="reportSheetSelect"
  />
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { t } from '@/locale/index'
import { formatNickname, formatRelativeTime, getImageUrl, openUrl, toUrl } from '@/utils'
import {
  getCommunityPostListApi,
  getCommunityPostListApiResponse,
  likePostApi,
  deletePostApi,
  reportPostApi,
  blockUserApi,
  createFollowApi,
  deleteFollowApi,
} from '@/service/api/community'

import { useMessage, useToast } from 'wot-design-uni'

import { useUserStore } from '@/store'

const userStore = useUserStore()
const message = useMessage('wd-message-box-slot')
const toast = useToast()

const props = defineProps<{
  state: string
}>()

const emit = defineEmits<{
  'update:state': [state: string]
  'refresh-complete': []
  'refresh-error': []
}>()

const socialList = ref<getCommunityPostListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

let isRefreshing = false

// 更新加载状态
const updateState = (state: string) => {
  emit('update:state', state)
}

const socialFilter = ref('latest')
const handleFilterChange = (filter: string) => {
  if (filter === 'following' && userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  socialFilter.value = filter
  socialList.value.data = []
  socialList.value.current_page = 0
  loadSocial()
}

// 加载社交数据
const loadSocial = async (page = 1) => {
  try {
    const params: any = {}
    if (socialFilter.value === 'following') {
      params.scope = 'following'
      params.sort = 'latest'
    } else {
      params.scope = 'all'
      params.sort = socialFilter.value
    }

    const res = await getCommunityPostListApi(page, params)

    if (page === 1) {
      socialList.value = res.data
    } else {
      socialList.value.data = socialList.value.data.concat(res.data.data)
      socialList.value.current_page = res.data.current_page
      socialList.value.last_page = res.data.last_page
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
    console.error('Failed to load social:', error)
  }
}

// 关注/取消关注
const handleFollow = (item) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }

  if (item.member.is_following === 1) {
    deleteFollowApi(item.member_id).then((res) => {
      if (res.code === 1) {
        socialList.value.data.forEach((post) => {
          if (post.member_id === item.member_id) {
            post.member.is_following = 0
          }
        })
        uni.showToast({ title: '已取消关注', icon: 'none' })
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
  } else {
    createFollowApi(item.member_id).then((res) => {
      if (res.code === 1) {
        socialList.value.data.forEach((post) => {
          if (post.member_id === item.member_id) {
            post.member.is_following = 1
          }
        })
        uni.showToast({ title: '关注成功', icon: 'none' })
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
  }
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      // 检查是否还有更多数据可以加载
      if (socialList.value.current_page < socialList.value.last_page) {
        loadSocial(socialList.value.current_page + 1)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    } else if (newVal === 'refreshing') {
      isRefreshing = true
      loadSocial(1)
    }
  },
  { immediate: true },
)

// 点赞
const likePost = (id: number) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  // uni.showLoading()
  likePostApi(id)
    .then((res) => {
      if (res.code === 1) {
        socialList.value.data.find((item) => item.id === id).like_count = res.data.like_count || 0
        socialList.value.data.find((item) => item.id === id).is_liked = res.data.is_liked || 0
      } else {
        toast.show(res.msg || t('common.error'))
      }
    })
    .finally(() => {
      // uni.hideLoading()
    })
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

const handleDelPost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  //  删除并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.del_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      deletePostApi(id)
        .then((res) => {
          if (res.data?.result == 1) {
            socialList.value.data = socialList.value.data.filter((item) => item.id !== id)
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

// 初始加载
onMounted(() => {
  loadSocial()
  // 监听刷新事件
  uni.$on('refreshSocialTab', () => {
    isRefreshing = true
    loadSocial(1)
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  uni.$off('refreshSocialTab')
})

const reportShow = ref<boolean>(false)
const reportActions = ref([
  {
    name: t('social.index.post.report'),
    color: '#ff6b03',
  },
  {
    name: t('social.index.user.block'),
  },
])

function reportSheetClose() {
  reportShow.value = false
}

function reportSheetSelect({ item, index }) {
  if (index === 0) {
    handleReportPost()
  } else {
    handleReportUser()
  }
}

const reportPostItem = ref<getCommunityPostListApiResponse['data'][number]>({})
const reportPost = (post: getCommunityPostListApiResponse['data'][number]) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  reportShow.value = true
  reportPostItem.value = post
}

const handleReportPost = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  // 举报并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.report_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      reportPostApi(reportPostItem.value.id)
        .then((res) => {
          if (res.data?.result === 1) {
            socialList.value.data = socialList.value.data.filter(
              (item) => item.id !== reportPostItem.value.id,
            )
          } else {
            toast.show(res.msg || t('common.error'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

const handleReportUser = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  // 举报并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.report_user_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      blockUserApi(reportPostItem.value.id)
        .then((res) => {
          if (res.data?.result === 1) {
            socialList.value.data = socialList.value.data.filter(
              (item) => item.member_id !== reportPostItem.value.member_id,
            )
          } else {
            toast.show(res.msg || t('common.error'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

// 跳转用户主页
const toUserHome = (memberId: number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
:deep(.reportSheet) {
  margin-bottom: calc(env(safe-area-inset-bottom) + 120rpx) !important;
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
  line-height: 1.1;
  text-align: center;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36rpx;
  &.followed {
    background-color: #ffffff;
    color: #999;
    border: 1rpx solid #ddd;
  }
}
</style>

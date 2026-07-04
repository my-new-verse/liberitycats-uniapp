<route lang="json5" type="page">
{
  //   layout: 'default2',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%user.homepage%',
  },
}
</route>

<template>
  <view class="pageMy" :class="[locale]">
    <view class="headBox" :style="{ height: headBoxHeight }">
      <view class="backBtn" :style="{ top: kfBoxTop }" @click="handleBack">
        <image src="@/static/images/back2.png" mode="widthFix" />
      </view>

      <view class="headCnt">
        <view class="avatar">
          <image
            :src="
              userInfo?.avatar
                ? getImageUrl(userInfo.avatar + '?x-oss-process=style/jzcq')
                : '/static/images/default_avatar.png'
            "
            mode="widthFix"
          ></image>
        </view>
        <view class="info">
          <!-- 名字 -->
          <view class="name">
            {{ formatNickname(userInfo?.nickname || '', 16) }}
          </view>
          <!-- 等级 -->
          <view
            class="level"
            :class="{
              ['level' + userInfo.level.level]: userInfo.level.level > 0,
            }"
            @click="showMemberLevelPopup"
            v-if="userInfo.level.level > 0"
          >
            <image :src="getImageUrl(userInfo?.level?.icon)" mode="widthFix" />
          </view>
          <!-- 猫粮 -->
          <view class="points">
            <view class="label">{{ t('my.asset.points') }}:</view>
            <view class="amount">
              {{ formatNumber(userInfo?.cat_food_balance || 0, 0) }}
            </view>
            <view class="unit">g</view>
          </view>
        </view>
      </view>

      <view
        v-if="!userInfo.is_self"
        class="followActions"
        :style="{ top: `calc(${kfBoxTop} + 176rpx + 48rpx)` }"
      >
        <view class="followBtn" :class="followBtnInfo.style" @click="handleFollow">
          <wd-button plain custom-class="follow-btn" size="small">
            {{ followBtnInfo.text }}
          </wd-button>
        </view>
        <view class="moreActionsBtn" @click="openMoreActions"></view>
      </view>
    </view>

    <view class="cnt" :style="{ top: headBoxHeight, height: cntHeight }">
      <scroll-view
        class="scrollBox"
        :scroll-y="true"
        refresher-background="transparent"
        :refresher-enabled="true"
        refresher-color="#ff6b03"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
        @refresherabort="onRefreshAbort"
        @scrolltolower="onScrollToLower"
      >
        <view class="scrollCnt">
          <template v-if="socialList.data?.length > 0">
            <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
              <view class="socialItem">
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
                  <view class="socialCnt">
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
              </view>
            </view>
          </template>
          <template v-else>
            <view class="emptyBox">
              <view class="emptyImg"></view>
            </view>
          </template>

          <wd-loadmore :state="state" @reload="loadMoreData" />
          <wd-backtop :scrollTop="scrollTop" />
        </view>
      </scroll-view>

      <wd-message-box selector="wd-message-box-slot">
        <wd-table
          :data="dataList"
          :stripe="false"
          :border="false"
          row-height="70rpx"
          custom-class="memberLevelTable"
        >
          <wd-table-col
            prop="level_img"
            :label="t('my.index.member.level.popup.table.level_img')"
            width="calc(100% - 200rpx)"
            align="left"
          >
            <template #value="{ row }">
              <view class="table-level-icon">
                <image :src="getImageUrl(row.level_img)" mode="heightFix" class="table-level-img" />
              </view>
            </template>
          </wd-table-col>
          <wd-table-col
            prop="level_count"
            :label="t('my.index.member.level.popup.table.level_count')"
            width="200rpx"
            align="center"
          ></wd-table-col>
        </wd-table>
      </wd-message-box>

      <wd-message-box selector="wd-message-box-slot2"></wd-message-box>
    </view>

    <wd-action-sheet
      v-model="showMoreActions"
      :actions="moreActions"
      :z-index="997"
      @select="handleMoreActionSelect"
    />
  </view>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { t } from '@/locale/index'
import {
  formatNickname,
  formatRelativeTime,
  getImageUrl,
  toUrl,
  formatNumber,
  handlePreview,
} from '@/utils'
import { useUserStore } from '@/store/user'
import { useToast, useMessage } from 'wot-design-uni'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import {
  getMemberHomepageApi,
  getCommunityPostListApiResponse,
  getMyPostListApi,
  deleteFollowApi,
  createFollowApi,
  setSpecialFollowApi,
  blockUserApi,
  adminRemovalApi,
} from '@/service/api/community'

const userStore = useUserStore()
const toast = useToast()
const locale = uni.getLocale()
const message = useMessage('wd-message-box-slot')
const message2 = useMessage('wd-message-box-slot2')
// 加载状态
const state = ref<LoadMoreState>('loading')
// 滚动
const scrollTop = ref(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

// 头部高度计算
const { safeAreaInsets } = uni.getSystemInfoSync()
const headBoxHeight = ref('')
const kfBoxTop = ref('')
const cntHeight = ref('')

const dataList = reactive([
  {
    level_count: '0',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/M3X1743689887U8kcjAy7RKasKNB4.png',
  },
  {
    level_count: '1-3',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/SC61743689887RNOqadYFhk1ZnMzT.png',
  },
  {
    level_count: '4-9',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/OBz1743689887dqzw6WxwlxwlxR0A.png',
  },
  {
    level_count: '≥10',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/MVP1743689887SFPj6iLTRHftaDhb.png',
  },
])

const memberId = ref(0)

// 用户主页数据
const userInfo = ref({
  member_id: 0,
  nickname: '',
  avatar: '',
  level: {
    level: 0,
    icon: '',
  },
  is_self: false,
  is_following: 0,
})

const socialList = ref<getCommunityPostListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

const isRefreshing = ref(false)

onLoad((options) => {
  memberId.value = Number(options.member_id || 0)
})

onShow(() => {
  loadAllData()
})

onMounted(() => {
  // #ifdef H5
  headBoxHeight.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 360 + 'rpx'
  kfBoxTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 36 + 'rpx'
  cntHeight.value = 'calc(100vh - ' + headBoxHeight.value + ' )'
  // #endif

  // #ifdef APP-PLUS
  headBoxHeight.value = (safeAreaInsets?.top || 0) + 360 + 'rpx'
  kfBoxTop.value = (safeAreaInsets?.top || 0) + 36 + 'rpx'
  cntHeight.value = 'calc(100vh - ' + headBoxHeight.value + ' + 64rpx)'
  // #endif
})

const onScrollToLower = () => {
  if (state.value === 'finished') return
  if (state.value === 'loading') return
  loadMoreData()
}

const loadMoreData = async () => {
  if (socialList.value.current_page >= socialList.value.last_page) {
    state.value = 'finished'
    return
  }

  state.value = 'loading'

  try {
    const postRes = await getMyPostListApi(socialList.value.current_page + 1, {
      limit: 20,
      member_id: memberId.value,
    })

    if (postRes.data) {
      socialList.value.data = socialList.value.data.concat(postRes.data.data)
      socialList.value.current_page = postRes.data.current_page
      socialList.value.last_page = postRes.data.last_page

      if (socialList.value.current_page === socialList.value.last_page) {
        state.value = 'finished'
      } else {
        state.value = 'success'
      }
    }
  } catch (err) {
    state.value = 'error'
  }
}

const loadAllData = async () => {
  try {
    const userRes = await getMemberHomepageApi(memberId.value)
    if (userRes.code === 1) {
      userInfo.value = userRes.data.member
    }

    state.value = 'loading'

    const postRes = await getMyPostListApi(1, {
      limit: 20,
      member_id: memberId.value,
    })

    if (postRes.data) {
      socialList.value.data = postRes.data.data
      socialList.value.current_page = postRes.data.current_page
      socialList.value.last_page = postRes.data.last_page

      if (socialList.value.current_page === socialList.value.last_page) {
        state.value = 'finished'
      } else {
        state.value = 'success'
      }
    }
  } catch (e) {
    state.value = 'error'
  }
}

const handleBack = () => {
  uni.navigateBack()
}

const showMemberLevelPopup = () => {
  message.alert({})
}

const onRefresh = async () => {
  isRefreshing.value = true
  socialList.value = {
    current_page: 0,
    data: [],
    last_page: 1,
  }
  state.value = ''

  await loadAllData()
  isRefreshing.value = false
}

const onRefreshAbort = () => {
  isRefreshing.value = false
}

// ========== 更多操作面板 ==========
const showMoreActions = ref(false)
const moreActions = ref<any[]>([])

/** 关注按钮文案和样式 */
const followBtnInfo = computed(() => {
  const u: any = userInfo.value || {}
  if (u.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'special' }
  if (u.is_mutual_following) return { text: '互相关注', style: 'followed' }
  if (u.is_following === 1) return { text: '已关注', style: 'followed' }
  if (u.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
})

const openMoreActions = () => {
  console.log('openMoreActions called')
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  const isFollowing = userInfo.value.is_following === 1
  const isSpecial = userInfo.value.is_special_following === 1
  const actions: any[] = []

  if (isFollowing) {
    actions.push({ name: t('social.index.user.unfollow'), type: 'follow', color: '#333' })
    actions.push({
      name: isSpecial ? t('social.index.user.special.cancel') : t('social.index.user.special.set'),
      type: 'specialFollow',
      color: '#333',
    })
  } else {
    actions.push({ name: t('social.index.user.follow'), type: 'follow', color: '#ff6b03' })
    actions.push({
      name: t('social.index.user.special.set'),
      type: 'specialFollow',
      color: '#333',
    })
  }

  actions.push({ name: '', type: 'divider', disabled: true })
  actions.push({ name: t('social.index.user.block'), type: 'block' })
  moreActions.value = actions
  showMoreActions.value = true
}

const handleMoreActionSelect = ({ item }: any) => {
  showMoreActions.value = false
  switch (item.type) {
    case 'follow':
      if (userInfo.value.is_following === 1) {
        unfollowUser()
      } else {
        handleFollow()
      }
      break
    case 'specialFollow':
      handleSpecialFollow()
      break
    case 'block':
      handleBlock()
      break
    case 'report':
      handleReport()
      break
    case 'remove':
      handleAdminRemove()
      break
  }
}

const handleSpecialFollow = () => {
  const isSpecial = userInfo.value.is_special_following === 1
  if (isSpecial) {
    message2
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => doSpecialFollow(isSpecial))
      .catch(() => {})
  } else {
    doSpecialFollow(isSpecial)
  }
}

const doSpecialFollow = (isSpecial: boolean) => {
  setSpecialFollowApi(memberId.value, isSpecial ? 0 : 1).then((res) => {
    if (res.code === 1) {
      syncUserFollowState({
        ...res.data,
        is_following: userInfo.value.is_following,
        is_mutual_following: userInfo.value.is_mutual_following,
      })
      uni.showToast({
        title: isSpecial
          ? t('social.index.user.special.canceled')
          : t('social.index.user.special.success'),
        icon: 'none',
      })
    }
  })
}

const handleBlock = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  message
    .confirm({ msg: t('social.index.report_user_confirm_txt') })
    .then(() => {
      uni.showLoading()
      // 用用户的第一篇帖子 ID 作为 block 的标识
      const postId = socialList.value.data?.[0]?.id || memberId.value
      blockUserApi(postId)
        .then((res) => {
          if (res.data?.result === 1) {
            uni.showToast({ title: t('common.operation_success'), icon: 'none' })
            setTimeout(() => uni.navigateBack(), 500)
          }
        })
        .finally(() => uni.hideLoading())
    })
    .catch(() => {})
}

const handleReport = () => {
  uni.navigateTo({ url: `/pages/cats/report/content?id=${memberId.value}&type=user` })
}

const handleAdminRemove = () => {
  const postId = socialList.value.data?.[0]?.id
  if (!postId) {
    uni.showToast({ title: t('common.no_data'), icon: 'none' })
    return
  }
  message
    .confirm({
      title: t('report.admin.remove_post'),
      msg: t('social.index.post.remove_content'),
    })
    .then(() => {
      uni.showLoading()
      adminRemovalApi(postId, 'post')
        .then((res) => {
          if (res.data?.status === 0) {
            socialList.value.data = socialList.value.data.filter((i) => i.id !== postId)
            uni.showToast({ title: t('common.operation_success'), icon: 'none' })
          }
        })
        .finally(() => uni.hideLoading())
    })
    .catch(() => {})
}

/** 根据接口返回数据同步用户关注状态 */
const syncUserFollowState = (data: any) => {
  const u: any = userInfo.value
  u.is_following = data.is_following
  u.is_mutual_following = data.is_mutual_following
  u.is_special_following = data.is_special_following
  u.is_following_me = data.is_following_me
}

// 操作面板的取消关注（直接完全取关）
const unfollowUser = () => {
  message2
    .confirm({ msg: t('social.index.user.follow.cancel') })
    .then(() => {
      deleteFollowApi(memberId.value).then((res) => {
        if (res.code === 1) {
          syncUserFollowState(res.data)
          uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
        }
      })
    })
    .catch(() => {})
}

// 关注/取消关注按钮
const handleFollow = () => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }

  const u: any = userInfo.value
  // 特别关注 → 取消特别关注，保持关注
  if (u.is_special_following) {
    message2
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => {
        setSpecialFollowApi(memberId.value, 0).then((res) => {
          if (res.code === 1) {
            syncUserFollowState({
              ...res.data,
              is_following: userInfo.value.is_following,
              is_mutual_following: userInfo.value.is_mutual_following,
            })
            uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
          }
        })
      })
      .catch(() => {})
  } else if (u.is_following === 1) {
    message2
      .confirm({ msg: t('social.index.user.follow.cancel') })
      .then(() => {
        deleteFollowApi(memberId.value).then((res) => {
          if (res.code === 1) {
            syncUserFollowState(res.data)
            uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
          }
        })
      })
      .catch(() => {})
  } else {
    createFollowApi(memberId.value).then((res) => {
      if (res.code === 1) {
        syncUserFollowState(res.data)
        uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
      }
    })
  }
}
const doHandlePreview = (images: string[], currentIndex: number = 0, needDealImg = true) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

:deep(.uni-scroll-view-refresh__spinner > circle) {
  color: #ff6b03 !important;
}

:deep(.uni-scroll-view-refresh-inner > svg) {
  fill: #ff6b03 !important;
}
:deep() {
  .wd-message-box__content {
    text-align: center;
    white-space: pre-line;
  }
}

.pageMy {
  height: 100vh;
  //   padding-bottom: 120rpx;
  background-color: var(--liberty-cats-page-background-color);
}
.headBox {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 98;
  height: 360rpx;
  padding-top: 48rpx;
  padding-right: 48rpx;
  padding-left: 48rpx;
  background: linear-gradient(329deg, #ff6b03 0%, #ee941a 100%);
  .kf {
    position: absolute;
    top: 36rpx;
    right: 32rpx;
    width: 48rpx;
    height: 48rpx;
    background-image: url('~@/static/images/kf.png');
    background-repeat: no-repeat;
    background-position: 100%;
    background-size: 100%;
  }
  .headCnt {
    display: flex;
    align-items: center;
    justify-content: start;
    width: 100%;
    height: 100%;
    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 176rpx;
      height: 176rpx;
      overflow: hidden;
      background-color: #ffffff;
      border-radius: 50%;
      image {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
    }
    .info {
      margin-left: 32rpx;
      .name {
        font-size: 48rpx;
        font-style: normal;
        font-weight: 600;
        line-height: 56rpx;
        color: #ffffff;
      }
      .points {
        font-size: 24rpx;
        font-style: normal;
        line-height: 56rpx;
        color: #ffffff;
        display: flex;
        .amount {
          margin: 0 12rpx;
          font-weight: 600;
        }
        .unit {
          font-weight: 600;
        }
      }
      .level {
        height: 56rpx;
        margin: 8rpx 0;
        image {
          width: 100%;
          height: 100%;
        }
      }
      .level1 {
        width: 112rpx;
      }
      .level2 {
        width: 202rpx;
      }
      .level3 {
        width: 182rpx;
      }
      .level4 {
        width: 248rpx;
      }
    }
  }
}

.cnt {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 98;
  margin-top: -18rpx;
  background-color: var(--liberty-cats-page-background-color);
  border-radius: var(--liberty-cats-page-border-radius) var(--liberty-cats-page-border-radius) 0 0;
  .scrollBox {
    width: 100%;
    height: calc(100% - 20rpx);
    padding-top: 20rpx;
    .scrollCnt {
      padding: 20rpx 40rpx 0 40rpx;
    }
  }
}

:deep(.table-level-icon) {
  height: 56rpx;
  .table-level-img {
    height: 100% !important;
  }
}

:deep(.memberLevelTable) {
  .wd-table__cell {
    min-height: 50rpx;
    padding: 0;
  }
  .wd-table__header {
    height: 60rpx;
  }
}

.backBtn {
  position: absolute;
  top: 36rpx;
  left: 32rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  z-index: 99;
  image {
    width: 36rpx;
    height: 36rpx;
  }
}
.followActions {
  position: absolute;
  z-index: 99;
  right: 32rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.followBtn {
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
    :deep(.follow-btn) {
      background: #ffffff !important;
      color: #999 !important;
      border-color: #ddd !important;
    }
  }
  &.special {
    :deep(.follow-btn) {
      background: linear-gradient(135deg, #fff7e5 0%, #fff0d6 100%) !important;
      color: #ff6b03 !important;
      border-color: #ff6b03 !important;
      font-weight: 600;
    }
  }
}
:deep() {
  .follow-btn {
    background: var(--wot-button-primary-bg-color) !important;
    border-color: #fff !important;
    color: #fff !important;
    // background-image: linear-gradient(90deg, rgba(232, 82, 18, 1) 0.00%, rgba(245, 148, 0, 1) 100.00%) !important;
    width: 140rpx;
    border-color: rgba(255, 208, 86, 1) !important;
  }
}

.moreActionsBtn {
  width: 40rpx;
  height: 40rpx;
  background-color: #fff;
  border-radius: 50%;
  background-image: url('@/static/images/more.png');
  background-repeat: no-repeat;
  background-position: center;
  background-size: 24rpx 24rpx;
}

/* ========== 操作面板分割线 ========== */
:deep(.wd-action-sheet__action--disabled) {
  height: 2rpx !important;
  min-height: 2rpx !important;
  margin: 16rpx 0;
  padding: 0 !important;
  background: #f0f0f0;
  pointer-events: none;
  border: none !important;
  overflow: hidden;

  .wd-action-sheet__name {
    display: none;
  }
}
</style>

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
        class="followBtn"
        :style="{ top: `calc(${kfBoxTop} + 176rpx)` }"
        :class="{ followed: userInfo.is_following === 1 }"
        @click="handleFollow"
      >
        {{ userInfo.is_following === 1 ? '取消关注' : '关注' }}
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
  </view>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { t } from '@/locale/index'
import { formatNickname, formatRelativeTime, getImageUrl, toUrl, formatNumber } from '@/utils'
import { useUserStore } from '@/store/user'
import { useToast, useMessage } from 'wot-design-uni'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import {
  getMemberHomepageApi,
  getCommunityPostListApiResponse,
  getMyPostListApi,
  deleteFollowApi,
  createFollowApi,
} from '@/service/api/community'

const userStore = useUserStore()
const toast = useToast()
const locale = uni.getLocale()
const message = useMessage('wd-message-box-slot')
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

// 关注/取消关注
const handleFollow = () => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }

  if (userInfo.value.is_following === 1) {
    deleteFollowApi(memberId.value).then((res) => {
      if (res.code === 1) {
        userInfo.value.is_following = 0
        uni.showToast({ title: '已取消关注', icon: 'none' })
      }
    })
  } else {
    createFollowApi(memberId.value).then((res) => {
      if (res.code === 1) {
        userInfo.value.is_following = 1
        uni.showToast({ title: '关注成功', icon: 'none' })
      }
    })
  }
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
    text-align: left;
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
  margin-top: -64rpx;
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
.followBtn {
  position: absolute;
  z-index: 99;
  right: 32rpx;
  padding: 6rpx 14rpx;
  border-radius: 50rpx;
  background-color: #ffffff;
  color: #999;
  border: 1rpx solid #ddd;
  font-size: 26rpx;
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

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
        <view class="topRow">
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
            <view class="pointsRow">
              <view class="label">{{ t('my.asset.points') }}:</view>
              <view class="amount">
                {{ formatNumber(userInfo?.cat_food_balance || 0, 0) }}
              </view>
              <view class="unit">g</view>
              <view v-if="!userInfo.is_self" class="followActions">
                <view class="followBtn" :class="followBtnInfo.style" @click="handleFollow">
                  <wd-button plain custom-class="follow-btn" size="small">
                    {{ followBtnInfo.text }}
                    <wd-icon
                      custom-style="margin-left: 8rpx"
                      name="star-on"
                      size="22rpx"
                      color="#ff6b03"
                      v-if="userInfo.is_special_following === 1"
                    ></wd-icon>
                  </wd-button>
                </view>
                <view class="moreActionsBtn" @click="openMoreActions"></view>
              </view>
            </view>
          </view>
        </view>
        <view class="whiteBox">
          <view
            class="statItem"
            @click="
              toUrl(
                '/pages/cats/social/follow_list?tab=following&member_id=' +
                  memberId +
                  '&fc=' +
                  (stats?.following_count || 0) +
                  '&fnc=' +
                  (stats?.fans_count || 0) +
                  '&sc=' +
                  (stats?.special_following_count || 0),
              )
            "
          >
            <text class="statCount">{{ formatCount(stats?.following_count || 0) }}</text>
            <text class="statLabel">{{ t('social.index.stats.following') }}</text>
          </view>
          <view class="statDivider">|</view>
          <view
            class="statItem"
            @click="
              toUrl(
                '/pages/cats/social/follow_list?tab=fans&member_id=' +
                  memberId +
                  '&fc=' +
                  (stats?.following_count || 0) +
                  '&fnc=' +
                  (stats?.fans_count || 0) +
                  '&sc=' +
                  (stats?.special_following_count || 0),
              )
            "
          >
            <text class="statCount">{{ formatCount(stats?.fans_count || 0) }}</text>
            <text class="statLabel">{{ t('social.index.stats.fans') }}</text>
          </view>
          <view class="statDivider">|</view>
          <view
            class="statItem"
            @click="
              toUrl(
                '/pages/cats/social/follow_list?tab=special&member_id=' +
                  memberId +
                  '&fc=' +
                  (stats?.following_count || 0) +
                  '&fnc=' +
                  (stats?.fans_count || 0) +
                  '&sc=' +
                  (stats?.special_following_count || 0),
              )
            "
          >
            <text class="statCount">{{ formatCount(stats?.special_following_count || 0) }}</text>
            <text class="statLabel">{{ t('social.index.stats.special_following') }}</text>
          </view>
        </view>
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
            <!-- 普通帖：社交卡片 -->
            <template v-if="activePostFilter === 'normal'">
              <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
                <view class="socialItem">
                  <view
                    v-if="item.member_id === userStore.userInfo?.member_id"
                    class="delBox"
                    @click="handleDelPost(item.id)"
                  ></view>
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
                      <view
                        v-if="item.member_id !== userStore.userInfo?.member_id"
                        class="moreActionsBtn"
                        @click.stop="openPostActions(item)"
                      ></view>
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
              </view>
            </template>
            <!-- 推广帖：推广卡片 -->
            <template v-if="activePostFilter === 'promotion'">
              <view class="cell socialBox" v-for="item in socialList.data" :key="item.id">
                <view class="socialItem">
                  <view v-if="item.member_id === userStore.userInfo?.member_id" class="delBox">
                    <wd-icon
                      @click="debouncedHandleRefreshPost(item)"
                      name="refresh1"
                      size="22px"
                      color="#999999"
                    ></wd-icon>
                    <view @click="handleDelPost(item.id)" class="del-child"></view>
                  </view>
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
                      <view
                        v-if="item.member_id !== userStore.userInfo?.member_id"
                        class="moreActionsBtn"
                        @click.stop="openPostActions(item)"
                      ></view>
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

      <wd-message-box selector="wd-message-box-ban" :title="t('report.admin.ban_post')">
        <view class="banDialog">
          <view class="banLabel">
            {{ t('report.admin.ban_post.label', { name: banTargetMemberName }) }}
          </view>
          <view class="banDaysTitle">{{ t('report.admin.ban_post.days') }}</view>
          <view class="banDaysRow">
            <view class="banDayItem" :class="{ active: banDays === 1 }" @click="banDays = 1">
              1天
            </view>
            <view class="banDayItem" :class="{ active: banDays === 3 }" @click="banDays = 3">
              3天
            </view>
            <view class="banDayItem" :class="{ active: banDays === 7 }" @click="banDays = 7">
              7天
            </view>
          </view>
          <wd-input
            v-model="banReason"
            :placeholder="t('report.admin.ban_post.reason_placeholder')"
            custom-class="banReasonInput"
          />
        </view>
      </wd-message-box>
    </view>

    <SharePopup ref="shareRef" />

    <wd-action-sheet
      v-model="showMoreActions"
      :actions="moreActions"
      :z-index="997"
      @select="handleMoreActionSelect"
    />
  </view>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
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
import { debounce } from 'lodash-es'
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
  likePostApi,
  deletePostApi,
  banPostApi,
  unbanPostApi,
  refreshAdPostApi,
} from '@/service/api/community'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

const userStore = useUserStore()
const toast = useToast()
const locale = uni.getLocale()
const message = useMessage('wd-message-box-slot')
const message2 = useMessage('wd-message-box-slot2')
const messageBan = useMessage('wd-message-box-ban')
const shareRef = ref<any>(null)

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

const handleOpenShare = (item: any) => {
  shareRef.value?.openSharePopup(item)
}

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
      const ts = new Date().getTime()
      item.currentGif = item.is_liked === 1 ? `${GIF_LIKE}?t=${ts}` : `${GIF_UNLIKE}?t=${ts}`
      setTimeout(() => {
        item.currentGif = ''
      }, 800)
    }
  })
}

// 删除帖子
const handleDelPost = (id: number) => {
  message2
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
// 加载状态
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

const stats = ref<{
  following_count: number
  fans_count: number
  special_following_count: number
} | null>(null)

const formatCount = (count: number) => {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  return String(count)
}

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
})

const activePostFilter = ref('normal')
const postFilterTabs = [
  { key: 'normal', label: '普通帖' },
  { key: 'promotion', label: '推广帖' },
]

/** 当前分类对应的 post_category 接口参数 */
const getPostCategoryParam = (filter: string) => {
  if (filter === 'normal') return 'social'
  if (filter === 'promotion') return 'advertisement'
  return undefined
}

const state = computed(() => postFilterCache.value[activePostFilter.value]?.state || 'loading')

/** 当前展示的帖子列表（同步自当前分类缓存） */
const socialList = ref<getCommunityPostListApiResponse>(
  postFilterCache.value[activePostFilter.value].list,
)

/** 同步当前分类缓存到 socialList 和 state */
const syncCurrentCache = () => {
  const cache = postFilterCache.value[activePostFilter.value]
  socialList.value = cache.list
}

const isRefreshing = ref(false)

onLoad((options) => {
  memberId.value = Number(options.member_id || 0)
})

onShow(() => {
  loadAllData()
})

onMounted(() => {
  // #ifdef H5
  headBoxHeight.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 460 + 'rpx'
  kfBoxTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 36 + 'rpx'
  cntHeight.value = 'calc(100vh - ' + headBoxHeight.value + ' )'
  // #endif

  // #ifdef APP-PLUS
  headBoxHeight.value = (safeAreaInsets?.top || 0) + 460 + 'rpx'
  kfBoxTop.value = (safeAreaInsets?.top || 0) + 36 + 'rpx'
  cntHeight.value = 'calc(100vh - ' + headBoxHeight.value + ' + 64rpx)'
  // #endif
})

onUnmounted(() => {
  debouncedHandleRefreshPost?.cancel()
})

const getCurrentCache = () => postFilterCache.value[activePostFilter.value]

const handlePostFilterChange = (key: string) => {
  if (activePostFilter.value === key) return
  activePostFilter.value = key
  syncCurrentCache()
  const cache = getCurrentCache()
  if (!cache.loaded) loadMoreData()
}

const onScrollToLower = () => {
  const cache = getCurrentCache()
  if (cache.state === 'finished') return
  if (cache.loading) return
  loadMoreData()
}

const loadMoreData = async (refresh = false) => {
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

  try {
    const params: any = {
      limit: 20,
      member_id: memberId.value,
    }
    const category = getPostCategoryParam(activePostFilter.value)
    if (category) params.post_category = category

    const postRes = await getMyPostListApi(cache.list.current_page + 1, params)

    if (postRes.data) {
      if (postRes.data.current_page === 1) {
        cache.list.data = postRes.data.data
      } else {
        cache.list.data = cache.list.data.concat(postRes.data.data)
      }
      cache.list.current_page = postRes.data.current_page
      cache.list.last_page = postRes.data.last_page
      cache.loaded = true

      if (cache.list.current_page === cache.list.last_page) {
        cache.state = 'finished'
      } else {
        cache.state = 'success'
      }
    }
  } catch (err) {
    cache.state = 'error'
  } finally {
    cache.loading = false
    syncCurrentCache()
  }
}

const loadAllData = async () => {
  try {
    const userRes = await getMemberHomepageApi(memberId.value)
    if (userRes.code === 1) {
      userInfo.value = userRes.data.member
      const data = userRes.data as any
      if (data.stats) stats.value = data.stats
    }

    await loadMoreData(true)
  } catch (e) {
    getCurrentCache().state = 'error'
    syncCurrentCache()
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
  await loadMoreData(true)
  isRefreshing.value = false
}

const onRefreshAbort = () => {
  isRefreshing.value = false
}

// ========== 更多操作面板 ==========
const showMoreActions = ref(false)
const moreActions = ref<any[]>([])
const reportTargetPost = ref<any>(null)

const banDays = ref(1)
const banReason = ref('')
const banTargetMemberId = ref(0)
const banTargetMemberName = ref('')

/** 关注按钮文案和样式 */
const followBtnInfo = computed(() => {
  const u: any = userInfo.value || {}
  if (u.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'followed' }
  if (u.is_mutual_following)
    return { text: t('social.index.user.mutual_following'), style: 'followed' }
  if (u.is_following === 1) return { text: '已关注', style: 'followed' }
  if (u.is_following_me) return { text: t('social.index.user.follow_back'), style: 'follow' }
  return { text: '关注', style: 'follow' }
})

const openMoreActions = () => {
  console.log('openMoreActions called')
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  reportTargetPost.value = null
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

  //   actions.push({ name: '', type: 'divider', disabled: true })
  //   actions.push({ name: t('social.index.user.block'), type: 'block' })
  moreActions.value = actions
  showMoreActions.value = true
}

const openPostActions = (post: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  reportTargetPost.value = post
  const member = post.member
  const actions: any[] = []

  actions.push({ name: t('social.index.post.report'), type: 'report', color: '#ff6b03' })
  actions.push({ name: t('social.index.user.block'), type: 'block' })

  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    actions.push({ name: t('report.admin.remove_post'), type: 'remove', color: '#FF3B30' })
  }

  moreActions.value = actions
  showMoreActions.value = true

  banTargetMemberId.value = member.id
  banTargetMemberName.value = member.nickname || ''

  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    updateBanAction(!!member.is_banned)
  }
}

const updateBanAction = (isBanned: boolean) => {
  const actions = moreActions.value
  // 移除已有的 ban/unban
  for (let i = actions.length - 1; i >= 0; i--) {
    if (actions[i].type === 'ban' || actions[i].type === 'unban') {
      actions.splice(i, 1)
    }
  }
  if (isBanned) {
    actions.push({ name: t('report.admin.unban_post.action'), type: 'unban', color: '#333' })
  } else {
    actions.push({ name: t('report.admin.ban_post.action'), type: 'ban', color: '#FF3B30' })
  }
  moreActions.value = actions
}

const handleBanPost = () => {
  banDays.value = 1
  banReason.value = ''
  messageBan
    .confirm({})
    .then(() => confirmBan())
    .catch(() => {})
}

const syncMemberBanState = (memberId: number, isBanned: boolean) => {
  socialList.value.data.forEach((post) => {
    if (post.member_id === memberId) {
      post.member.is_banned = isBanned
    }
  })
}

const confirmBan = () => {
  banPostApi(banTargetMemberId.value, banDays.value, banReason.value || undefined).then((res) => {
    if (res.code === 1) {
      uni.showToast({ title: res.msg || t('common.operation_success'), icon: 'none' })
      syncMemberBanState(banTargetMemberId.value, true)
    }
  })
}

const handleUnbanPost = () => {
  message2
    .confirm({
      title: t('report.admin.unban_post'),
      msg: t('report.admin.unban_post.confirm', { name: banTargetMemberName.value }),
    })
    .then(() => {
      unbanPostApi(banTargetMemberId.value).then((res) => {
        if (res.code === 1) {
          uni.showToast({ title: res.msg || t('common.operation_success'), icon: 'none' })
          syncMemberBanState(banTargetMemberId.value, false)
        }
      })
    })
    .catch(() => {})
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
    case 'ban':
      handleBanPost()
      break
    case 'unban':
      handleUnbanPost()
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
  setSpecialFollowApi(memberId.value, isSpecial ? 0 : 1)
    .then((res) => {
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
      } else {
        uni.showToast({
          title: res.msg || t('common.request.error'),
          icon: 'none',
        })
      }
    })
    .catch((err) => {
      console.error('doSpecialFollow error:', err)
      uni.showToast({
        title: t('common.network_error'),
        icon: 'none',
      })
    })
}

const handleBlock = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  const targetPost = reportTargetPost.value
  message2
    .confirm({ msg: t('social.index.report_user_confirm_txt') })
    .then(() => {
      uni.showLoading()
      const postId = targetPost?.id || socialList.value.data?.[0]?.id || memberId.value
      blockUserApi(postId)
        .then((res) => {
          if (res.data?.result === 1) {
            uni.showToast({ title: t('common.operation_success'), icon: 'none' })
            if (targetPost) {
              socialList.value.data = socialList.value.data.filter(
                (i) => i.member_id !== targetPost.member_id,
              )
            } else {
              setTimeout(() => uni.navigateBack(), 500)
            }
          }
        })
        .finally(() => {
          uni.hideLoading()
          reportTargetPost.value = null
        })
    })
    .catch(() => {})
}

const handleReport = () => {
  const targetPost = reportTargetPost.value
  reportTargetPost.value = null
  if (targetPost) {
    uni.navigateTo({ url: `/pages/cats/report/content?id=${targetPost.id}&type=post` })
  } else {
    uni.navigateTo({ url: `/pages/cats/report/content?id=${memberId.value}&type=user` })
  }
}

const handleAdminRemove = () => {
  const targetPost = reportTargetPost.value
  const postId = targetPost?.id || socialList.value.data?.[0]?.id
  if (!postId) {
    uni.showToast({ title: t('common.no_data'), icon: 'none' })
    return
  }
  message2
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
        .finally(() => {
          uni.hideLoading()
          reportTargetPost.value = null
        })
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
        setSpecialFollowApi(memberId.value, 0)
          .then((res) => {
            if (res.code === 1) {
              syncUserFollowState({
                ...res.data,
                is_following: userInfo.value.is_following,
                is_mutual_following: userInfo.value.is_mutual_following,
              })
              uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
            } else {
              uni.showToast({
                title: res.msg || t('common.request.error'),
                icon: 'none',
              })
            }
          })
          .catch((err) => {
            console.error('cancel special follow error:', err)
            uni.showToast({
              title: t('common.network_error'),
              icon: 'none',
            })
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
      } else {
        uni.showToast({
          title: res.msg || t('common.request.error'),
          icon: 'none',
        })
      }
    })
  }
}
const doHandlePreview = (images: string[], currentIndex: number = 0, needDealImg = true) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}
// 刷新推广帖（调用接口，成功后更新当前页列表）
const handleRefreshPost = async (item: any) => {
  try {
    // 注意：不要和 uni.showToast 混用，否则会冲突
    const res = await refreshAdPostApi(item.id)
    if (res.code === 1) {
      uni.showToast({ title: t('social.detail.refresh.success'), icon: 'success', duration: 2000 })
      // 重新拉取当前筛选下的列表
      loadData(1, true)
    } else {
      console.log(res.msg || t('social.detail.refresh.failed'))
      uni.showToast({
        title: res.msg || t('social.detail.refresh.failed'),
        icon: 'none',
        duration: 2000,
      })
    }
  } catch (e) {
    console.error('refresh failed:', e)
    uni.showToast({ title: t('social.detail.refresh.failed'), icon: 'none', duration: 2000 })
  }
}
const debouncedHandleRefreshPost = debounce(handleRefreshPost, 500)
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
  .headCnt {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    .topRow {
      display: flex;
      align-items: center;
      width: 100%;
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
        flex: 1;
        margin-left: 32rpx;
        .name {
          font-size: 48rpx;
          font-style: normal;
          font-weight: 600;
          line-height: 56rpx;
          color: #ffffff;
        }
        .pointsRow {
          font-size: 24rpx;
          font-style: normal;
          line-height: 40rpx;
          color: #ffffff;
          display: flex;
          align-items: center;
          width: 100%;
          .amount {
            margin: 0 12rpx 0 4rpx;
            font-weight: 600;
          }
          .unit {
            margin-right: 24rpx;
            font-weight: 600;
          }
          .followActions {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 12rpx;
            flex-shrink: 0;
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
    .whiteBox {
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: 100%;
      margin-top: 20rpx;
      padding: 20rpx 0;
      background: #fff;
      border-radius: 16rpx;
      .statItem {
        display: flex;
        flex-direction: column;
        align-items: center;
        .statCount {
          font-size: 32rpx;
          font-weight: 700;
          color: #333;
          line-height: 36rpx;
        }
        .statLabel {
          font-size: 22rpx;
          color: #999;
          line-height: 28rpx;
        }
      }
      .statDivider {
        font-size: 28rpx;
        color: #eee;
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
    width: calc((100% - 12rpx) / 2);
    background: #ff6b03;
    border-radius: 26rpx;
    transition: left 0.15s ease;
    z-index: 0;

    &.slider--normal {
      left: 6rpx;
    }
    &.slider--promotion {
      left: calc((100% - 12rpx) / 2 + 6rpx);
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

.followBtn {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  &.followed {
    :deep(.follow-btn) {
      background: #ffffff !important;
      color: #999 !important;
      border-color: #ddd !important;
    }
  }
}
:deep() {
  .follow-btn {
    background: var(--wot-button-primary-bg-color) !important;
    border-color: #fff !important;
    color: #fff !important;
    // background-image: linear-gradient(90deg, rgba(232, 82, 18, 1) 0.00%, rgba(245, 148, 0, 1) 100.00%) !important;
    // width: 140rpx;
    height: 40rpx !important;
    padding: 0 20rpx !important;
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
  flex-shrink: 0;
}

.nameWrap .moreActionsBtn {
  margin-left: auto;
  background-repeat: no-repeat;
  background-size: 100%;
}

.socialHead .nameWrap {
  flex: 1;
  min-width: 0;
  background-repeat: no-repeat;
  background-size: 100%;
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

.banDialog {
  padding: 16rpx 0;
  .banLabel {
    font-size: 28rpx;
    color: #333;
    margin-bottom: 24rpx;
  }
  .banDaysTitle {
    font-size: 26rpx;
    color: #666;
    margin-bottom: 12rpx;
  }
  .banDaysRow {
    display: flex;
    gap: 16rpx;
    margin-bottom: 20rpx;
    .banDayItem {
      flex: 1;
      padding: 16rpx 0;
      text-align: center;
      font-size: 28rpx;
      color: #333;
      background: #f5f5f5;
      border-radius: 12rpx;
      &.active {
        color: #fff;
        background: #ff6b03;
      }
    }
  }
}
:deep(.delBox) {
  background-image: none !important;
  width: auto !important;
  height: auto !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .del-child {
    width: 40rpx;
    height: 40rpx;
    background-image: url('@/static/images/trush@2x.png');
    background-repeat: no-repeat;
    background-size: 100%;
  }
}
</style>

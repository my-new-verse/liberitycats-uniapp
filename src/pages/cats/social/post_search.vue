<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <!-- ========== 自定义导航栏 + 搜索框 ========== -->
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="searchBox">
            <wd-input
              type="text"
              v-model="searchText"
              :placeholder="t('social.search.searchInput.placeholder')"
              :no-border="true"
              custom-class="searchInput"
              confirm-type="search"
              @confirm="search"
            />
            <view class="searchDivider"></view>
            <text class="searchBtn" @click="search">{{ t('common.search') }}</text>
          </view>
        </view>
      </view>
      <view class="navBg">
        <view class="pbl2"><view class="fbg"></view></view>
        <view class="pbr2"><view class="fbg"></view></view>
      </view>
    </view>

    <!-- ========== 筛选栏：用户 + 时间（fixed，在 scroll-view 外） ========== -->
    <view class="filterSticky" :style="{ top: cntPaddingTop + 'rpx' }">
      <view class="filterBar">
        <view class="filterItem" @click="showUserFilter = true">
          <text class="filterLabel">
            {{ selectedUserLabel || t('social.search.filter.user') }}
          </text>
          <text class="filterArrow">▼</text>
        </view>
        <view class="filterItem" @click="showTimeFilter = true">
          <text class="filterLabel">
            {{ selectedTimeLabel || t('social.search.filter.time') }}
          </text>
          <text class="filterArrow">▼</text>
        </view>
      </view>

      <view class="selectedUsersBar" v-if="confirmedUserIds.length > 0">
        <scroll-view scroll-x class="selectedUsersScroll">
          <view class="selectedUserItem" v-for="uid in confirmedUserIds" :key="uid">
            <view class="userAvatarWrap" @click="removeSelectedUser(uid)">
              <image
                class="userAvatar"
                :src="selectedUsersCache.get(uid)?.avatar"
                mode="aspectFill"
              />
              <view class="levelIcon" v-if="getLevelValue(selectedUsersCache.get(uid))">
                <image :src="getLevelIcon(selectedUsersCache.get(uid))" mode="aspectFit" />
              </view>
              <view class="removeIcon">×</view>
            </view>
            <text class="userName">{{ selectedUsersCache.get(uid)?.nickname }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- ========== 滚动内容区 ========== -->
    <view class="cntScrollWrap" :style="{ top: scrollViewTop, height: scrollViewHeight }">
      <scroll-view
        class="cntScroll"
        :scroll-y="true"
        refresher-background="transparent"
        :refresher-enabled="true"
        refresher-color="#ff6b03"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
        @refresherrestore="onRefreshRestore"
        @refresherabort="onRefreshAbort"
        @scrolltolower="onScrollToLower"
      >
        <!-- ========== 搜索状态：初始提示 / 结果列表（暂无数据） ========== -->
        <template v-if="!hasSearched">
          <view class="emptyBox">
            <view class="emptyText">{{ t('social.search.hint') }}</view>
          </view>
        </template>
        <template v-else-if="searchResult.posts.length > 0">
          <view class="socialBox">
            <view class="cell" v-for="post in searchResult.posts" :key="post.id">
              <view class="socialItem">
                <view
                  class="delBox"
                  v-if="post.member?.is_self"
                  @click="handleDelPost(post.id)"
                ></view>
                <view class="jbBox" v-else @click="reportPost(post)"></view>
                <!-- <view
                  v-if="getMemberFollowInfo(post.member)"
                  class="followBtn"
                  :class="getMemberFollowInfo(post.member).style"
                  @click.stop="handleFollowClick(post.member)"
                >
                  {{ getMemberFollowInfo(post.member).text }}
                  <wd-icon
                    custom-style="margin-left: 12rpx"
                    name="star-on"
                    size="22rpx"
                    color="#ff6b03"
                    v-if="post.member?.is_special_following === 1"
                  ></wd-icon>
                </view> -->
                <view class="socialHead">
                  <view class="avatarBox" @click="toPostDetail(post)">
                    <image class="avatar" :src="post.member?.avatar" />
                    <view class="levelIcon" v-if="getLevelValue(post.member)">
                      <image
                        :src="getLevelIcon(post.member)"
                        mode="aspectFit"
                        @error="handleLevelIconError(post.member)"
                        @load="handleLevelIconLoad(post.member)"
                      />
                    </view>
                  </view>
                  <view class="nameWrap">
                    <view class="name">{{ post.member?.nickname }}</view>
                  </view>
                  <view v-if="post.tag?.name" class="tag" :class="post.tag?.class">
                    {{ post.tag.name }}
                  </view>
                </view>
                <view class="socialCntBox" @click="toPostDetail(post)">
                  <view class="socialCnt">{{ post.content }}</view>
                  <view
                    class="socialMedia"
                    v-if="post.images.length > 0"
                    :class="{
                      mediaImg4: post.images.length === 4,
                      singleImg: post.images.length === 1,
                    }"
                  >
                    <view
                      v-for="(image, index) in post.images"
                      :key="index"
                      @tap.stop="doHandlePreview(post.images, index)"
                    >
                      <wd-img
                        :radius="5"
                        custom-class="mediaImgItem"
                        :mode="post.images.length === 1 ? 'widthFix' : 'aspectFill'"
                        :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                        :enable-preview="false"
                      />
                    </view>
                  </view>
                  <view class="socialTime">{{ formatRelativeTime(post.create_time) }}</view>
                </view>
                <view class="socialFoot">
                  <view class="socialBtnBox" @click="toPostDetail(post)">
                    <view class="socialBtnIcon view"></view>
                    <view class="socialBtn">{{ post.view_count || 0 }}</view>
                  </view>
                  <view class="socialBtnBox" @click="toPostDetail(post)">
                    <view class="socialBtnIcon quote"></view>
                    <view class="socialBtn">{{ post.commit_count || 0 }}</view>
                  </view>
                  <view class="socialBtnBox">
                    <view class="zanWrapper" @click.stop="likeSearchPost(post)">
                      <image
                        class="Icon"
                        :src="
                          post.is_liked === 1
                            ? '/static/images/unlike.png'
                            : '/static/images/zan0.33.png'
                        "
                        mode="aspectFit"
                        :style="{ opacity: post.currentGif ? 0 : 1 }"
                      />
                      <image
                        v-if="post.currentGif"
                        :src="post.currentGif"
                        class="Icon"
                        mode="aspectFit"
                      />
                    </view>
                    <view class="socialBtn" style="margin-left: 10rpx">
                      {{ post.like_count || 0 }}
                    </view>
                  </view>
                  <view class="socialBtnBox" @click.stop="handleShare(post)">
                    <view class="socialBtnIcon share"></view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>
        <template v-else>
          <view class="emptyBox">
            <view class="emptyText">{{ t('common.no_data') }}</view>
          </view>
        </template>
      </scroll-view>
    </view>

    <!-- ========== 时间筛选弹窗 ========== -->
    <wd-action-sheet
      v-model="showTimeFilter"
      :title="t('social.search.filter.time')"
      :z-index="1100"
      @closed="onTimeFilterClosed"
    >
      <view class="filterContent">
        <!-- 预设时间范围：横向排列 -->
        <view class="timePresetRow">
          <view
            class="timePresetItem"
            :class="{ active: selectedTimeRange === range.value }"
            v-for="range in timeRanges"
            :key="range.value"
            @click="selectTimeRange(range)"
          >
            {{ range.label }}
          </view>
        </view>
        <!-- 自定义时间范围：标题 + 起止两行 -->
        <view class="customTimeSection">
          <view class="sectionTitle">{{ t('social.search.filter.time.custom') }}</view>
          <view class="timeRow" @click="showStartCalendar = true">
            <text class="timeRowLabel">{{ t('social.search.filter.time.start') }}</text>

            <wd-calendar
              v-model="customStartTime"
              v-model:visible="showStartCalendar"
              type="date"
              :max-date="customEndTime || Date.now()"
              @confirm="showStartCalendar = false"
            />
          </view>
          <view class="timeDivider"></view>
          <view class="timeRow" @click="showEndCalendar = true">
            <text class="timeRowLabel">{{ t('social.search.filter.time.end') }}</text>

            <wd-calendar
              v-model="customEndTime"
              v-model:visible="showEndCalendar"
              type="date"
              :min-date="customStartTime || undefined"
              :max-date="Date.now()"
              @confirm="showEndCalendar = false"
            />
          </view>
        </view>

        <view class="filterActions">
          <wd-button custom-class="cancelBtn" size="large" block @click="showTimeFilter = false">
            {{ t('common.cancel') }}
          </wd-button>
          <wd-button type="primary" size="large" block @click="confirmTimeFilter">
            {{ t('common.confirm') }}
          </wd-button>
        </view>
      </view>
    </wd-action-sheet>

    <!-- ========== 用户筛选弹窗 ========== -->
    <wd-action-sheet
      v-model="showUserFilter"
      :title="t('social.search.filter.user')"
      :z-index="1100"
      @closed="onUserFilterClosed"
    >
      <view class="filterContent">
        <view class="searchMember">
          <wd-input
            v-model="memberKeyword"
            :placeholder="t('social.search.filter.userPlaceholder')"
            clearable
            @confirm="searchUsers"
          />
          <wd-button
            type="primary"
            size="small"
            @click="searchUsers"
            custom-class="searchMemberBtn"
          >
            {{ t('common.search') }}
          </wd-button>
        </view>

        <!-- 最近 @ 的成员 -->
        <view class="recentMembers" v-if="recentMembers.length > 0 && searchedUsers.length === 0">
          <view class="recentTitle">{{ t('social.search.filter.recentMembers') }}</view>
          <view class="recentMemberList">
            <view
              class="recentMemberItem"
              v-for="member in recentMembers"
              :key="member.member_id"
              @click="selectRecentMember(member)"
            >
              <view class="recentAvatarWrap">
                <image class="recentAvatar" :src="member.avatar" mode="aspectFill" />
                <view class="levelIcon" v-if="getLevelValue(member)">
                  <image :src="getLevelIcon(member)" mode="aspectFit" />
                </view>
              </view>
              <view class="recentMemberInfo">
                <text class="recentName">{{ member.nickname }}</text>
                <text class="recentId">ID: {{ member.member_id }}</text>
              </view>
              <view class="recentCheck" v-if="tempSelectedUserIds.includes(member.member_id)">
                ✓
              </view>
            </view>
          </view>
        </view>

        <scroll-view scroll-y class="memberList" v-if="searchedUsers.length > 0">
          <view
            class="memberItem"
            v-for="user in searchedUsers"
            :key="user.member_id"
            @click="selectUser(user)"
          >
            <view class="memberAvatarWrap">
              <image class="memberAvatar" :src="user.avatar" mode="aspectFill" />
              <view class="levelIcon" v-if="getLevelValue(user)">
                <image :src="getLevelIcon(user)" mode="aspectFit" />
              </view>
            </view>
            <view class="memberInfo">
              <text class="memberName">{{ user.nickname }}</text>
              <text class="memberId">ID: {{ user.member_id }}</text>
            </view>
            <view class="memberActions">
              <view
                v-if="getFollowButtonInfo(user)"
                class="followBtn"
                :class="getFollowButtonInfo(user).style"
                @click.stop="handleFollow(user)"
              >
                {{ getFollowButtonInfo(user).text }}
                <wd-icon
                  custom-style="margin-left: 12rpx"
                  name="star-on"
                  size="22rpx"
                  color="#ff6b03"
                  v-if="user.is_special_following === 1"
                ></wd-icon>
              </view>
              <view class="memberCheck" v-if="tempSelectedUserIds.includes(user.member_id)">✓</view>
            </view>
          </view>
        </scroll-view>
        <view class="emptyHint" v-else>
          {{ t('social.search.filter.userHint') }}
        </view>
        <view class="filterActions">
          <wd-button custom-class="cancelBtn" size="large" block @click="showUserFilter = false">
            {{ t('common.cancel') }}
          </wd-button>
          <wd-button type="primary" size="large" block @click="confirmUserFilter">
            {{ t('common.confirm') }}
          </wd-button>
        </view>
      </view>
    </wd-action-sheet>

    <SharePopup ref="shareRef" />

    <!-- ========== 举报/操作弹窗 ========== -->
    <wd-action-sheet
      custom-class="reportSheet"
      v-model="reportShow"
      :actions="reportActions"
      :z-index="1100"
      @close="reportSheetClose"
      @select="reportSheetSelect"
    />

    <wd-message-box selector="wd-message-box-slot" />
    <wd-toast />
  </view>
</template>

<script lang="ts" setup>
import { t } from '@/locale/index'
import { formatRelativeTime, getImageUrl, handlePreview } from '@/utils'
import {
  createFollowApi,
  deleteFollowApi,
  searchPostsApi,
  searchMembersApi,
  likePostApi,
  deletePostApi,
  setSpecialFollowApi,
  blockUserApi,
  adminRemovalApi,
} from '@/service/api/community'
import { useUserStore } from '@/store/user'
import { useMessage, useToast } from 'wot-design-uni'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

// ============================================================
// 导航栏布局
// ============================================================
const locale = uni.getLocale()

const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)
  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20

  // 加载最近选择的成员
  loadRecentMembers()
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

// ============================================================
// 搜索
// ============================================================
const searchText = ref('')
/** 是否已执行过搜索，控制初始提示 / 搜索结果切换 */
const hasSearched = ref(false)
const isLoading = ref(false)
const loadMoreState = ref<LoadMoreState>('loading')

/** 搜索结果 */
const searchResult = ref<{
  posts: any[]
  total: number
  page: number
  limit: number
}>({
  posts: [],
  total: 0,
  page: 0,
  limit: 20,
})

/** 构建搜索参数 */
const buildSearchParams = (page: number) => {
  const params: any = { page, limit: 20 }

  const keyword = searchText.value.trim()
  if (keyword) params.keyword = keyword

  if (confirmedUserIds.value.length > 0) {
    params.member_ids = confirmedUserIds.value
  }

  const timeRange = getTimeRange()
  if (timeRange.start_time) params.start_time = timeRange.start_time
  if (timeRange.end_time) params.end_time = timeRange.end_time

  return params
}

const search = async () => {
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  const timeRange = getTimeRange()
  const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)
  if (!hasKeyword && !hasUser) {
    uni.showToast({ title: t('social.search.requireKeywordOrUser'), icon: 'none' })
    return
  }

  console.log('search', buildSearchParams(1))
  if (isLoading.value) return
  isLoading.value = true
  hasSearched.value = true
  loadMoreState.value = 'loading'
  uni.showLoading()
  try {
    const res = await searchPostsApi(buildSearchParams(1))
    if (res.code === 1 && res.data) {
      searchResult.value = res.data
      loadMoreState.value =
        res.data.page * res.data.limit >= res.data.total ? 'finished' : 'loading'
    }
  } catch (e) {
    console.error('search failed', e)
    loadMoreState.value = 'error'
  } finally {
    isLoading.value = false
    uni.hideLoading()
  }
}

const loadMore = async () => {
  if (isLoading.value) return
  if (loadMoreState.value === 'finished' || loadMoreState.value === 'error') return
  isLoading.value = true
  loadMoreState.value = 'loading'
  try {
    const res = await searchPostsApi(buildSearchParams(searchResult.value.page + 1))
    if (res.code === 1 && res.data) {
      searchResult.value.posts = searchResult.value.posts.concat(res.data.posts)
      searchResult.value.page = res.data.page
      loadMoreState.value =
        res.data.page * res.data.limit >= res.data.total ? 'finished' : 'loading'
    }
  } catch (e) {
    console.error('loadMore failed', e)
    loadMoreState.value = 'error'
  } finally {
    isLoading.value = false
  }
}

/** 删除帖子 */
const handleDelPost = (id: number) => {
  console.log('handleDelPost', id)
  uni.showModal({
    content: t('social.index.del_post_confirm_txt'),
    success: (r) => {
      if (r.confirm) {
        deletePostApi(id).then((res) => {
          if (res.data?.result === 1) {
            searchResult.value.posts = searchResult.value.posts.filter((p) => p.id !== id)
            uni.showToast({ title: t('common.delete_success'), icon: 'none' })
          }
        })
      }
    },
  })
}

// ========== 举报/操作弹窗 ==========
const reportShow = ref(false)
const reportActions = ref<any[]>([])
const reportActionIndex: any = { follow: -1, special: -1, report: -1, block: -1, remove: -1 }
const reportPostItem = ref<any>({})

function reportSheetClose() {
  reportShow.value = false
}

const reportSheetSelect = ({ item, index }: any) => {
  if (index === reportActionIndex.follow) {
    const member = reportPostItem.value.member
    if (member?.is_following) {
      handleActionSheetUnfollow(member)
    } else {
      handleFollowClick(member)
    }
    reportShow.value = false
    return
  }
  if (index === reportActionIndex.special) {
    handleSpecialFollow()
    return
  }
  if (index === reportActionIndex.report) {
    handleReportPostAction()
    return
  }
  if (index === reportActionIndex.block) {
    handleBlockUser()
    return
  }
  if (index === reportActionIndex.remove) {
    handleRemovePost()
  }
}

const reportPost = (post: any) => {
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/cats/login/login' })
    return
  }
  const member = post.member
  const isFollowing = member?.is_following === 1
  const isSpecial = member?.is_special_following === 1
  const actions: any[] = []

  if (isFollowing) {
    actions.push({ name: t('social.index.user.unfollow'), type: 'follow', color: '#333' })
    reportActionIndex.follow = actions.length - 1
    actions.push({
      name: isSpecial ? t('social.index.user.special.cancel') : t('social.index.user.special.set'),
      type: 'special',
      color: '#333',
    })
    reportActionIndex.special = actions.length - 1
  } else {
    actions.push({ name: t('social.index.user.follow'), type: 'follow', color: '#ff6b03' })
    reportActionIndex.follow = actions.length - 1
    actions.push({
      name: t('social.index.user.special.set'),
      type: 'special',
      color: '#333',
    })
    reportActionIndex.special = actions.length - 1
  }

  actions.push({ name: '', type: 'divider', disabled: true })
  actions.push({ name: t('social.index.post.report'), type: 'report', color: '#ff6b03' })
  reportActionIndex.report = actions.length - 1
  actions.push({ name: t('social.index.user.block'), type: 'block' })
  reportActionIndex.block = actions.length - 1

  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    actions.push({ name: t('report.admin.remove_post'), type: 'remove', color: '#FF3B30' })
    reportActionIndex.remove = actions.length - 1
  }
  reportActions.value = actions
  reportShow.value = true
  reportPostItem.value = post
}

const handleSpecialFollow = () => {
  const member = reportPostItem.value.member
  const isSpecial = member.is_special_following === 1
  if (isSpecial) {
    message
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => doSetSpecialFollow(member, isSpecial))
      .catch(() => {})
  } else {
    doSetSpecialFollow(member, isSpecial)
  }
  reportShow.value = false
}

const doSetSpecialFollow = (member: any, isSpecial: boolean) => {
  setSpecialFollowApi(member.id, isSpecial ? 0 : 1).then((res) => {
    if (res.code === 1) {
      syncMemberFollowState(member.id, {
        is_following: member.is_following,
        is_mutual_following: member.is_mutual_following,
        is_special_following: res.data.is_special_following,
      })
      uni.showToast({
        title: isSpecial
          ? t('social.index.user.special.canceled')
          : t('social.index.user.special.success'),
        icon: 'none',
      })
    } else {
      uni.showToast({ title: res.msg || t('common.error'), icon: 'none' })
    }
  })
}

const handleReportPostAction = () => {
  uni.navigateTo({ url: `/pages/cats/report/content?id=${reportPostItem.value.id}&type=post` })
}

const handleBlockUser = () => {
  message
    .confirm({ msg: t('social.index.report_user_confirm_txt') })
    .then(() => {
      blockUserApi(reportPostItem.value.id).then((res) => {
        if (res.data?.result === 1) {
          searchResult.value.posts = searchResult.value.posts.filter(
            (p) => p.member_id !== reportPostItem.value.member_id,
          )
        }
      })
    })
    .catch(() => {})
}

const handleRemovePost = () => {
  message
    .confirm({
      title: t('report.admin.remove_post'),
      msg: t('social.index.post.remove_content'),
    })
    .then(() => {
      uni.showLoading()
      adminRemovalApi(reportPostItem.value.id, 'post')
        .then((res) => {
          if (res.data?.status === 0) {
            searchResult.value.posts = searchResult.value.posts.filter(
              (p) => p.id !== reportPostItem.value.id,
            )
            toast.success(t('common.operation_success'))
          } else {
            toast.show(res.msg || t('common.operationFailedRetry'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

/** 跳转帖子详情 */
const toPostDetail = (post: any) => {
  console.log('toPostDetail', post.id)
  uni.navigateTo({ url: `/pages/cats/social/detail?id=${post.id}` })
}

// ========== 滚动区域定位 ==========
const scrollViewTop = computed(() => cntPaddingTop.value + filterStickyHeight.value + 'rpx')
const scrollViewHeight = computed(
  () => `calc(100vh - ${cntPaddingTop.value + filterStickyHeight.value}rpx)`,
)

// ========== scroll-view 下拉刷新 ==========
const isRefreshing = ref(false)

const onRefresh = () => {
  if (!hasSearched.value) {
    isRefreshing.value = false
    return
  }
  isRefreshing.value = true
  refreshData()
}

const onRefreshRestore = () => {}

const onRefreshAbort = () => {
  isRefreshing.value = false
}

const refreshData = async () => {
  if (isLoading.value) return
  isLoading.value = true
  loadMoreState.value = 'loading'
  try {
    const res = await searchPostsApi(buildSearchParams(1))
    if (res.code === 1 && res.data) {
      searchResult.value = res.data
      loadMoreState.value =
        res.data.page * res.data.limit >= res.data.total ? 'finished' : 'loading'
    }
  } catch (e) {
    console.error('refreshData failed', e)
    loadMoreState.value = 'error'
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

// ========== scroll-view 触底加载更多 ==========
const onScrollToLower = () => {
  if (loadMoreState.value !== 'finished' && loadMoreState.value !== 'error') {
    loadMore()
  }
}

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

const message = useMessage('wd-message-box-slot')
const toast = useToast()
const shareRef = ref<any>(null)

/** 帖子作者关注按钮信息 */
const getMemberFollowInfo = (member: any) => {
  if (!member || member.is_self) return null
  if (member.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'followed' }
  if (member.is_mutual_following) return { text: '互相关注', style: 'followed' }
  if (member.is_following) return { text: '已关注', style: 'followed' }
  if (member.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
}

const syncMemberFollowState = (memberId: number, data: any) => {
  searchResult.value.posts.forEach((post) => {
    if (post.member_id === memberId) {
      post.member.is_following = data.is_following
      post.member.is_mutual_following = data.is_mutual_following
      post.member.is_special_following = data.is_special_following
    }
  })
}

/** 操作面板的取消关注（直接完全取关） */
const handleActionSheetUnfollow = async (member: any) => {
  try {
    await message.confirm({ msg: t('social.index.user.follow.cancel') })
  } catch {
    return
  }
  const res = await deleteFollowApi(member.id)
  if (res.code === 1) {
    syncMemberFollowState(member.id, res.data)
    uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
  }
}

/** 关注/取关帖子作者 */
const handleFollowClick = async (member: any) => {
  console.log('handleFollowClick', member.id)
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/cats/login/login' })
    return
  }
  try {
    // 特别关注状态 - 取消特别关注
    if (member.is_special_following) {
      try {
        await message.confirm({ msg: t('social.index.user.special.cancel.confirm') })
      } catch {
        return
      }
      const res = await setSpecialFollowApi(member.id, 0)
      if (res.code === 1) {
        syncMemberFollowState(member.id, {
          is_following: member.is_following,
          is_mutual_following: member.is_mutual_following,
          is_special_following: 0,
        })
        uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
      }
    }
    // 普通关注状态 - 取消关注
    else if (member.is_following) {
      try {
        await message.confirm({ msg: t('social.index.user.follow.cancel') })
      } catch {
        return
      }
      const res = await deleteFollowApi(member.id)
      if (res.code === 1) {
        syncMemberFollowState(member.id, res.data)
      }
      uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
    }
    // 未关注状态 - 直接关注
    else {
      const res = await createFollowApi(member.id)
      if (res.code === 1) {
        syncMemberFollowState(member.id, res.data)
      }
      uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
    }
  } catch (e) {
    console.error('handleFollowClick failed', e)
  }
}

const handleShare = (post: any) => {
  console.log('handleShare', post.id)
  shareRef.value?.openSharePopup(post)
}

const likeSearchPost = async (post: any) => {
  console.log('likeSearchPost', post.id)
  if (!userStore.isLogin) {
    uni.navigateTo({ url: '/pages/cats/login/login' })
    return
  }
  try {
    const res = await likePostApi(post.id)
    if (res.code === 1) {
      post.like_count = res.data.like_count
      post.is_liked = res.data.is_liked
      const ts = Date.now()
      post.currentGif = post.is_liked === 1 ? `${GIF_LIKE}?t=${ts}` : `${GIF_UNLIKE}?t=${ts}`
      setTimeout(() => {
        post.currentGif = ''
      }, 800)
    }
  } catch (e) {
    console.error('likeSearchPost failed', e)
  }
}

/** 格式化帖子时间 */
const formatPostTime = (timeStr: string) => {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${h}:${min}`
}

// ============================================================
// 时间筛选
// ============================================================
const showTimeFilter = ref(false)
/** 预设时间范围：''=全部 / 'today' / 'week' / 'month' */
const selectedTimeRange = ref('')
/** 自定义开始时间（时间戳 ms） */
const customStartTime = ref<number>(0)
/** 自定义结束时间（时间戳 ms） */
const customEndTime = ref<number>(0)
const showStartCalendar = ref(false)
const showEndCalendar = ref(false)

/** 预设时间选项 */
const timeRanges = computed(() => [
  { label: t('social.search.filter.time.all'), value: '' },
  { label: t('social.search.filter.time.today'), value: 'today' },
  { label: t('social.search.filter.time.week'), value: 'week' },
  { label: t('social.search.filter.time.month'), value: 'month' },
])

/** 时间戳 → 展示文本 "M/D" */
const formatDateStr = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 时间戳 → 日期字符串 "YYYY-MM-DD" */
const toDateStr = (ts: number) => {
  if (!ts) return ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 监听自定义日期变化，自动匹配预设按钮 */
watch([customStartTime, customEndTime], ([s, e]) => {
  if (!s && !e) return
  const day = 86400000
  const today = toDateStr(Date.now())
  const weekAgo = toDateStr(getTodayStart() - 7 * day)
  const monthAgo = toDateStr(getTodayStart() - 30 * day)
  const sDate = toDateStr(s)
  const eDate = toDateStr(e)

  if (sDate === today && eDate === today) {
    selectedTimeRange.value = 'today'
  } else if (sDate === weekAgo && eDate === today) {
    selectedTimeRange.value = 'week'
  } else if (sDate === monthAgo && eDate === today) {
    selectedTimeRange.value = 'month'
  } else {
    selectedTimeRange.value = ''
  }
})
const confirmedTimeRange = ref('')
const confirmedStartTime = ref<number>(0)
const confirmedEndTime = ref<number>(0)

/** 筛选栏按钮上展示的时间标签：基于确认后的值 */
const selectedTimeLabel = computed(() => {
  if (confirmedStartTime.value || confirmedEndTime.value) {
    const s = confirmedStartTime.value ? formatDateStr(confirmedStartTime.value) : ''
    const e = confirmedEndTime.value ? formatDateStr(confirmedEndTime.value) : ''
    if (s && e) return `${s} ~ ${e}`
    if (s) return `${s} 起`
    if (e) return `至 ${e}`
  }
  if (!confirmedTimeRange.value) return ''
  const range = timeRanges.value.find((r) => r.value === confirmedTimeRange.value)
  return range ? range.label : ''
})

/** 今天的开始时间戳 */
const getTodayStart = () => new Date(new Date().toDateString()).getTime()

/** 点击预设范围：应用预设，回填自定义日期 */
const selectTimeRange = (range: { label: string; value: string }) => {
  selectedTimeRange.value = range.value
  const now = Date.now()
  const day = 86400000
  switch (range.value) {
    case 'today':
      customStartTime.value = getTodayStart()
      customEndTime.value = now
      break
    case 'week':
      customStartTime.value = getTodayStart() - 7 * day
      customEndTime.value = now
      break
    case 'month':
      customStartTime.value = getTodayStart() - 30 * day
      customEndTime.value = now
      break
    default:
      customStartTime.value = 0
      customEndTime.value = 0
      break
  }
}

/** 弹窗关闭动画完成后，恢复临时值为确认态 */
const onTimeFilterClosed = () => {
  selectedTimeRange.value = confirmedTimeRange.value
  customStartTime.value = confirmedStartTime.value
  customEndTime.value = confirmedEndTime.value
}

/** 确认时间筛选：同步到确认态，关闭弹窗 */
const confirmTimeFilter = () => {
  confirmedTimeRange.value = selectedTimeRange.value
  confirmedStartTime.value = customStartTime.value
  confirmedEndTime.value = customEndTime.value
  console.log(
    'confirmTimeFilter',
    confirmedTimeRange.value,
    confirmedStartTime.value,
    confirmedEndTime.value,
  )
  showTimeFilter.value = false
}

/** 监听确认时间变化，自动重新搜索或清空数据 */
watch([confirmedTimeRange, confirmedStartTime, confirmedEndTime], () => {
  const hasKeyword = searchText.value.trim() !== ''
  const hasUser = confirmedUserIds.value.length > 0
  const timeRange = getTimeRange()
  const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)

  // 用户、关键词、时间筛选都为空，直接清空数据不调接口
  if (!hasUser && !hasKeyword && !hasTimeFilter) {
    hasSearched.value = false
    searchResult.value = { posts: [], total: 0, page: 0, limit: 20 }
    return
  }

  // 有筛选条件，自动调用搜索
  search()
})

/** 将确认后的筛选状态转为接口参数（start_time / end_time，单位秒） */
const getTimeRange = () => {
  // 自定义时间优先
  if (confirmedStartTime.value || confirmedEndTime.value) {
    const result: any = {}
    if (confirmedStartTime.value) result.start_time = Math.floor(confirmedStartTime.value / 1000)
    if (confirmedEndTime.value)
      result.end_time = Math.floor(confirmedEndTime.value / 1000) + 86400 - 1
    return result
  }

  if (!confirmedTimeRange.value) return {}

  const now = Math.floor(Date.now() / 1000)
  const day = 86400

  switch (confirmedTimeRange.value) {
    case 'today':
      return { start_time: now - day, end_time: now }
    case 'week':
      return { start_time: now - 7 * day, end_time: now }
    case 'month':
      return { start_time: now - 30 * day, end_time: now }
    default:
      return {}
  }
}

// ============================================================
// 用户筛选
// ============================================================
const showUserFilter = ref(false)
const memberKeyword = ref('')
const searchedUsers = ref<any[]>([])
/** 弹窗内临时选中的用户 ID */
const tempSelectedUserIds = ref<number[]>([])
/** 弹窗内临时缓存的用户信息 */
const tempSelectedUsers = ref<Map<number, any>>(new Map())
/** 确认后的用户 ID */
const confirmedUserIds = ref<number[]>([])
/** 确认后的用户信息缓存 */
const confirmedUsers = ref<Map<number, any>>(new Map())

// ============================================================
// 最近 @ 的成员（本地缓存）
// ============================================================
const RECENT_MEMBERS_KEY = 'social_search_recent_members'
const MAX_RECENT_MEMBERS = 5

/** 最近选择的成员列表 */
const recentMembers = ref<any[]>([])

/** 从本地存储加载最近成员 */
const loadRecentMembers = () => {
  try {
    const stored = uni.getStorageSync(RECENT_MEMBERS_KEY)
    if (stored && Array.isArray(stored)) {
      recentMembers.value = stored.slice(0, MAX_RECENT_MEMBERS)
    }
  } catch (e) {
    console.error('loadRecentMembers failed', e)
  }
}

/** 添加成员到最近列表 */
const addToRecentMembers = (member: any) => {
  // 移除已存在的相同成员
  recentMembers.value = recentMembers.value.filter((m) => m.member_id !== member.member_id)
  // 添加到列表开头
  recentMembers.value.unshift({
    member_id: member.member_id,
    nickname: member.nickname,
    avatar: member.avatar,
    level: member.level,
  })
  // 限制最多5个
  recentMembers.value = recentMembers.value.slice(0, MAX_RECENT_MEMBERS)
  // 保存到本地存储
  try {
    uni.setStorageSync(RECENT_MEMBERS_KEY, recentMembers.value)
  } catch (e) {
    console.error('saveRecentMembers failed', e)
  }
}

/** 点击最近成员 */
const selectRecentMember = (member: any) => {
  selectUser(member)
}

/** 已选用户的完整信息缓存（跨搜索保留头像/昵称） */
const selectedUsersCache = computed(() => {
  const map = new Map<number, any>()
  for (const uid of confirmedUserIds.value) {
    const cached = confirmedUsers.value.get(uid)
    if (cached) {
      map.set(uid, cached)
    }
  }
  return map
})

/** sticky 筛选栏占位高度（nav底部到内容区的间距） */
const filterStickyHeight = computed(() => (confirmedUserIds.value.length > 0 ? 260 : 110))

/** 筛选栏用户按钮标签 */
const selectedUserLabel = computed(() => {
  if (confirmedUserIds.value.length === 0) return ''
  return `${confirmedUserIds.value.length}位用户`
})

/** 移除已选用户 */
const removeSelectedUser = (memberId: number) => {
  confirmedUserIds.value = confirmedUserIds.value.filter((id) => id !== memberId)
  confirmedUsers.value.delete(memberId)
  tempSelectedUserIds.value = tempSelectedUserIds.value.filter((id) => id !== memberId)
  tempSelectedUsers.value.delete(memberId)
}

/** 监听已确认用户变化，自动重新搜索或清空数据 */
watch(
  confirmedUserIds,
  () => {
    const hasKeyword = searchText.value.trim() !== ''
    const hasUser = confirmedUserIds.value.length > 0
    const timeRange = getTimeRange()
    const hasTimeFilter = !!(timeRange.start_time || timeRange.end_time)

    // 用户、关键词、时间筛选都为空，直接清空数据不调接口
    if (!hasUser && !hasKeyword && !hasTimeFilter) {
      hasSearched.value = false
      searchResult.value = { posts: [], total: 0, page: 0, limit: 20 }
      return
    }

    // 有筛选条件，自动调用搜索
    search()
  },
  { deep: true },
)

/** 搜索成员 */
const searchUsers = async () => {
  console.log('searchUsers', memberKeyword.value)
  if (!memberKeyword.value.trim()) return
  try {
    const res = await searchMembersApi(memberKeyword.value.trim())
    if (res.code === 1 && res.data) {
      searchedUsers.value = res.data.list || []
    }
  } catch (e) {
    console.error('searchUsers failed', e)
  }
}

/** 选中/取消选中用户 */
const selectUser = (user: any) => {
  const idx = tempSelectedUserIds.value.indexOf(user.member_id)
  if (idx > -1) {
    tempSelectedUserIds.value.splice(idx, 1)
    tempSelectedUsers.value.delete(user.member_id)
  } else {
    tempSelectedUserIds.value.push(user.member_id)
    tempSelectedUsers.value.set(user.member_id, user)
  }
}

/** 确认用户筛选 */
const confirmUserFilter = () => {
  console.log('confirmUserFilter', tempSelectedUserIds.value)
  confirmedUserIds.value = [...tempSelectedUserIds.value]
  confirmedUsers.value = new Map(tempSelectedUsers.value)

  // 将选中的成员添加到最近列表
  tempSelectedUsers.value.forEach((member) => {
    addToRecentMembers(member)
  })

  showUserFilter.value = false
}

const userStore = useUserStore()

/** 获取关注按钮文案和样式 */
const getFollowButtonInfo = (user: any) => {
  if (user.is_self) return null
  if (user.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'followed' }
  if (user.is_mutual) return { text: '互相关注', style: 'followed' }
  if (user.is_followed) return { text: '已关注', style: 'followed' }
  if (user.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
}

/** 关注/取消关注 */
const handleFollow = async (user: any) => {
  console.log('handleFollow', user.member_id)
  try {
    if (user.is_special_following) {
      try {
        await message.confirm({ msg: t('social.index.user.special.cancel.confirm') })
      } catch {
        return
      }
      const res = await setSpecialFollowApi(user.member_id, 0)
      if (res.code === 1) {
        user.is_special_following = 0
        uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
      }
    } else if (user.is_followed) {
      try {
        await message.confirm({ msg: t('social.index.user.follow.cancel') })
      } catch {
        return
      }
      const res = await deleteFollowApi(user.member_id)
      if (res.code === 1) {
        user.is_followed = false
        user.is_mutual = false
        user.is_special_following = 0
        uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
      }
    } else {
      const res = await createFollowApi(user.member_id)
      if (res.code === 1) {
        user.is_followed = true
        if (user.is_following_me) user.is_mutual = true
        uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
      }
    }
  } catch (e) {
    console.error('handleFollow failed', e)
  }
}

/** 弹窗关闭后恢复临时值为确认态 */
const onUserFilterClosed = () => {
  tempSelectedUserIds.value = [...confirmedUserIds.value]
  tempSelectedUsers.value = new Map(confirmedUsers.value)
  searchedUsers.value = []
  memberKeyword.value = ''
}

const doHandlePreview = (images: string[], currentIndex: number = 0) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}

// ============================================================
// Level 等级处理工具函数
// ============================================================
/** 获取 level_id 的值（优先使用 level_id，兼容旧的 level 字段） */
const getLevelValue = (member: any): number | null => {
  // 优先使用 level_id
  if (member?.level_id !== undefined) {
    const num = Number(member.level_id)
    return isNaN(num) || num <= 0 ? null : num
  }

  // 兼容旧的 level 字段
  const level = member?.level
  if (!level) return null

  // Vue 3 的响应式对象也是 object，先尝试取 level 属性
  const levelNum = level.level !== undefined ? level.level : level

  // 转换为数字
  const num = Number(levelNum)
  return isNaN(num) || num <= 0 ? null : num
}

/** 获取 level 图标路径（使用 level_id） */
const getLevelIcon = (member: any): string => {
  const levelId = getLevelValue(member)
  if (!levelId) return ''
  return `/static/images/level/${levelId}.png`
}

/** 图片加载成功 */
const handleLevelIconLoad = (member: any) => {
  console.log('Level icon loaded:', {
    nickname: member?.nickname,
    level_id: member?.level_id,
    level: member?.level,
    icon: getLevelIcon(member),
  })
}

/** 图片加载失败 */
const handleLevelIconError = (member: any) => {
  console.error('Level icon load failed:', {
    nickname: member?.nickname,
    level_id: member?.level_id,
    level: member?.level,
    levelValue: getLevelValue(member),
    icon: getLevelIcon(member),
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

/* ========== 页面容器 ========== */
.page {
  min-height: 100vh;
  background-color: var(--liberty-cats-page-background-color);
}

/* ========== 自定义导航栏 ========== */
.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 99;
  width: 100%;
  overflow: hidden;

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);
  }

  .navCnt {
    display: flex;
    align-items: center;
    height: 104rpx;
    padding: 0 24rpx;

    .left {
      width: 44rpx;
      height: 44rpx;
      margin-right: 16rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }

    .searchBox {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 44rpx - 16rpx);
      height: 56rpx;
      padding: 6rpx;
      background-color: #ffffff;
      border-radius: 34rpx;
    }

    .searchDivider {
      width: 1rpx;
      height: 28rpx;
      background: rgba(0, 0, 0, 0.12);
    }

    .searchBtn {
      font-size: 28rpx;
      font-weight: 500;
      color: #999;
      white-space: nowrap;
      padding: 0 16rpx;
    }

    .searchInput {
      display: flex;
      align-items: center;
      flex: 1;
      height: 100%;
      margin-left: 24rpx;
    }
  }

  .navBg {
    position: relative;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: var(--liberty-cats-page-background-color);

    .pbl2,
    .pbr2 {
      position: absolute;
      top: 0;
      width: var(--liberty-cats-page-common-border-radius);
      height: var(--liberty-cats-page-common-border-radius);
      overflow: hidden;
      background-color: var(--liberty-cats-primary-color);
      .fbg {
        width: 100%;
        height: 100%;
        background-color: var(--liberty-cats-page-background-color);
      }
    }
    .pbl2 {
      left: 0;
      .fbg {
        border-radius: var(--liberty-cats-page-common-border-radius) 0 0 0;
      }
    }
    .pbr2 {
      right: 0;
      .fbg {
        border-radius: 0 var(--liberty-cats-page-common-border-radius) 0 0;
      }
    }
  }
}

/* ========== 滚动内容区 ========== */
.cntScrollWrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.cntScroll {
  width: 100%;
  height: 100%;
  padding-left: 32rpx;
  padding-right: 32rpx;
  box-sizing: border-box;
}

/* ========== 橙色下拉刷新 ========== */
:deep(.uni-scroll-view-refresh__spinner > circle) {
  color: #ff6b03 !important;
}
:deep(.uni-scroll-view-refresh-inner > svg) {
  fill: #ff6b03 !important;
}

/* ========== 筛选栏 ========== */
.filterSticky {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 98;
  background-color: var(--liberty-cats-page-background-color);
}

.selectedUsersBar {
  padding: 16rpx 32rpx;
  //   border-bottom: 1rpx solid #f0f0f0;

  .selectedUsersScroll {
    white-space: nowrap;

    .selectedUserItem {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      width: 110rpx;
      margin-right: 16rpx;
      vertical-align: top;

      .userAvatarWrap {
        position: relative;
        width: 80rpx;
        height: 80rpx;
        margin: 0 auto 15rpx;
        cursor: pointer;

        .userAvatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 2rpx solid var(--liberty-cats-primary-color);
        }

        .levelIcon {
          position: absolute;
          right: -4rpx;
          bottom: 4rpx;
          z-index: 1;
          width: 28rpx;
          height: 28rpx;
          pointer-events: none;

          image {
            width: 100%;
            height: 100%;
          }
        }

        .removeIcon {
          position: absolute;
          top: 0;
          right: 0;
          width: 32rpx;
          height: 32rpx;
          background-color: rgba(0, 0, 0, 0.7);
          color: #fff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22rpx;
          font-weight: bold;
          line-height: 1;
          z-index: 2;
          backdrop-filter: blur(4rpx);
          box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
          pointer-events: none;

          &::before {
            content: '';
            position: absolute;
            top: -8rpx;
            right: -8rpx;
            bottom: -8rpx;
            left: -8rpx;
            pointer-events: auto;
          }
        }
      }

      .userName {
        font-size: 24rpx;
        color: #666;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: center;
      }
    }
  }
}

.filterBar {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 24rpx 32rpx;

  .filterItem {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 12rpx 24rpx;
    font-size: 28rpx;
    color: var(--liberty-cats-primary-color);
    border: 1rpx solid var(--liberty-cats-primary-color);
    border-radius: 34rpx;

    .filterLabel {
      max-width: 200rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .filterArrow {
      font-size: 20rpx;
    }
  }
}

/* ========== 时间筛选弹窗内容 ========== */
.filterContent {
  padding: 24rpx 24rpx;

  .timePresetRow {
    display: flex;
    gap: 16rpx;

    .timePresetItem {
      flex: 1;
      padding: 16rpx 0;
      font-size: 28rpx;
      color: #333;
      text-align: center;
      background: #f5f5f5;
      border-radius: 12rpx;

      &.active {
        color: #fff;
        background: var(--liberty-cats-primary-color);
      }
    }
  }

  .customTimeSection {
    margin-top: 32rpx;
    padding-top: 24rpx;
    border-top: 2rpx solid #f0f0f0;

    .sectionTitle {
      font-size: 30rpx;
      font-weight: 500;
      color: #333333;
      margin-bottom: 16rpx;
    }

    .timeRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18rpx 0;

      .timeRowLabel {
        font-size: 28rpx;
        color: #333;
      }
    }

    .timeDivider {
      height: 1rpx;
      background: #f0f0f0;
    }
  }

  .searchMember {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-bottom: 24rpx;
    width: 100%;

    :deep(.wd-input) {
      flex: 1;
    }

    :deep(.searchMemberBtn) {
      flex-shrink: 0;
    }
  }

  .recentMembers {
    margin-bottom: 24rpx;
    padding-bottom: 24rpx;
    border-bottom: 2rpx solid #f0f0f0;

    .recentTitle {
      font-size: 28rpx;
      font-weight: 500;
      color: #666;
      margin-bottom: 20rpx;
    }

    .recentMemberList {
      display: flex;
      flex-direction: column;
      gap: 12rpx;

      .recentMemberItem {
        display: flex;
        align-items: center;
        gap: 16rpx;
        padding: 16rpx;
        background: #f7f7f7;
        border-radius: 12rpx;
        transition: all 0.2s ease;

        &:active {
          background: #efefef;
          transform: scale(0.98);
        }

        .recentAvatarWrap {
          position: relative;
          width: 64rpx;
          height: 64rpx;
          flex-shrink: 0;

          .recentAvatar {
            width: 100%;
            height: 100%;
            border-radius: 50%;
          }

          .levelIcon {
            position: absolute;
            right: -4rpx;
            bottom: 2rpx;
            z-index: 9;
            width: 26rpx;
            height: 26rpx;

            image {
              width: 100%;
              height: 100%;
            }
          }
        }

        .recentMemberInfo {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6rpx;
          min-width: 0;

          .recentName {
            font-size: 28rpx;
            font-weight: 500;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .recentId {
            font-size: 24rpx;
            color: #999;
          }
        }

        .recentCheck {
          font-size: 32rpx;
          color: var(--liberty-cats-primary-color);
          font-weight: bold;
          width: 48rpx;
          text-align: center;
          flex-shrink: 0;
        }
      }
    }
  }

  .memberList {
    max-height: 600rpx;
    margin-bottom: 24rpx;

    .memberItem {
      display: flex;
      align-items: center;
      gap: 16rpx;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #f0f0f0;

      .memberAvatarWrap {
        position: relative;
        width: 72rpx;
        height: 72rpx;
        flex-shrink: 0;

        .memberAvatar {
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }

        .levelIcon {
          position: absolute;
          right: -4rpx;
          bottom: 4rpx;
          z-index: 9;
          width: 28rpx;
          height: 28rpx;

          image {
            width: 100%;
            height: 100%;
          }
        }
      }

      .memberInfo {
        flex: 1;
        .memberName {
          font-size: 28rpx;
          color: #333;
          margin-right: 12rpx;
        }
        .memberId {
          font-size: 24rpx;
          color: #999;
          margin-top: 4rpx;
        }
      }

      .memberActions {
        display: flex;
        align-items: center;
        gap: 16rpx;
        flex-shrink: 0;

        .followBtn {
          padding: 8rpx 24rpx;
          border-radius: 34rpx;
          font-size: 24rpx;
          white-space: nowrap;

          &.follow {
            background: var(--liberty-cats-primary-color);
            color: #fff;
            border: 1rpx solid var(--liberty-cats-primary-color);
          }
          &.followed {
            background: #fff;
            color: #999;
            border: 1rpx solid #d9d9d9;
          }
          &.mutual {
            background: #fff;
            color: var(--liberty-cats-primary-color);
            border: 1rpx solid var(--liberty-cats-primary-color);
          }
        }

        .memberCheck {
          font-size: 32rpx;
          color: var(--liberty-cats-primary-color);
          width: 48rpx;
          text-align: center;
        }
      }
    }
  }

  .emptyHint {
    padding: 48rpx 0;
    font-size: 28rpx;
    color: #999;
    text-align: center;
  }

  .filterActions {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    margin-top: 24rpx;

    :deep(.cancelBtn) {
      background: #f5f5f5 !important;
      color: #333 !important;
      border: none !important;
    }
  }
}

.nameWrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.followBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 20rpx;
  border-radius: 22rpx;
  border: 1rpx solid transparent;
  background-color: #ff6b03;
  color: #fff;
  font-size: 22rpx;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  &.followed {
    background-color: #ffffff;
    color: #999;
    border-color: #ddd;
  }
  &.special {
    background: linear-gradient(135deg, #fff7e5 0%, #fff0d6 100%);
    color: #ff6b03;
    border-color: #ff6b03;
    font-weight: 600;
  }
}

.socialItem {
  position: relative;

  .followBtn {
    position: absolute;
    right: 48rpx;
    top: 0;
    align-items: self-start;
    line-height: 42rpx;
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

/* ========== 空状态 ========== */
.emptyBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding-bottom: 200rpx;

  .emptyText {
    font-size: 28rpx;
    color: #999999;
  }
}
</style>

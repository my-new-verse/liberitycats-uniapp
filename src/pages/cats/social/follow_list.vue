<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view class="page">
    <!-- ========== 自定义导航栏 ========== -->
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="center">{{ t('follow_list.title') }}</view>
          <view class="right"></view>
        </view>
      </view>
      <view class="navBg">
        <view class="pbl2"><view class="fbg"></view></view>
        <view class="pbr2"><view class="fbg"></view></view>
      </view>
    </view>

    <view class="cntScrollWrap" :style="{ top: cntPaddingTop + 'rpx' }">
      <!-- ========== 子 Tab 切换 ========== -->
      <view class="tabBar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tabItem"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >
          <text>{{ tab.label }}</text>
          <text class="tabCount">{{ tab.count }}</text>
        </view>
      </view>

      <!-- ========== 搜索框 ========== -->
      <view class="searchBar">
        <wd-search
          v-model="searchKeyword"
          :placeholder="t('follow_list.search_placeholder')"
          hide-cancel
          @search="onSearch"
          @clear="onSearchClear"
        />
      </view>

      <!-- ========== 用户列表 ========== -->
      <scroll-view
        class="cntScroll"
        :scroll-y="true"
        @scrolltolower="onScrollToLower"
        style="flex: 1"
      >
        <view class="memberItem" v-for="user in currentList" :key="user.member_id">
          <view class="memberAvatarWrap" @click="toUserHome(user.member_id)">
            <image class="memberAvatar" :src="user.avatar" mode="aspectFill" />
            <view class="levelIcon" v-if="getLevelValue(user)">
              <image :src="getLevelIcon(user)" mode="aspectFit" />
            </view>
          </view>
          <view class="memberInfo" @click="toUserHome(user.member_id)">
            <text class="memberName">{{ user.nickname }}</text>
            <view class="memberSub">
              <text>粉丝数: {{ formatFansCount(user.fans_count || 0) }}</text>
              <text>ID: {{ user.member_id }}</text>
            </view>
          </view>
          <view
            v-if="getFollowButtonInfo(user)"
            class="followBtn"
            :class="getFollowButtonInfo(user).style"
            @click.stop="handleFollowClick(user)"
          >
            {{ getFollowButtonInfo(user).text }}
            <wd-icon
              v-if="user.is_special_following === 1"
              custom-style="margin-left: 8rpx"
              name="star-on"
              size="22rpx"
              color="#ff6b03"
            ></wd-icon>
          </view>
        </view>

        <wd-loadmore :state="loadState" @reload="loadData" />

        <view class="emptyBox" v-if="!currentCache.loading && currentList.length === 0">
          <view class="emptyText">{{ t('common.no_data') }}</view>
        </view>
      </scroll-view>
    </view>

    <wd-message-box selector="wd-message-box-slot" />
    <wd-toast />
  </view>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { t } from '@/locale/index'
import { useUserStore } from '@/store/user'
import { useMessage, useToast } from 'wot-design-uni'
import {
  createFollowApi,
  deleteFollowApi,
  setSpecialFollowApi,
  getFollowMembersApi,
} from '@/service/api/community'
import { toUrl } from '@/utils'

const userStore = useUserStore()
const message = useMessage('wd-message-box-slot')
const toast = useToast()

// ========== 导航栏 ==========
const { safeAreaInsets } = uni.getSystemInfoSync()
const navHeight = ref(0)
const navHeaderPaddingTop = ref(0)
const cntPaddingTop = ref(0)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  const safeTop =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  const safeTopRpx = safeTop / (systemInfo.windowWidth / 750)
  navHeight.value = safeTopRpx + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx
  cntPaddingTop.value = navHeight.value - 20
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

const toUserHome = (memberId: number) => {
  uni.navigateTo({ url: `/pages/cats/user/home?member_id=${memberId}` })
}

// ========== Tab 切换 ==========
type TabKey = 'following' | 'fans' | 'special'

const memberId = ref(0)

const activeTab = ref<TabKey>('following')

// 各 tab 的数量（优先从 URL 参数取，避免跳动）
const tabCounts = ref({
  following: 0,
  fans: 0,
  special: 0,
})

const tabs = computed(() => [
  { key: 'following', label: t('social.index.stats.following'), count: tabCounts.value.following },
  { key: 'fans', label: t('social.index.stats.fans'), count: tabCounts.value.fans },
  {
    key: 'special',
    label: t('social.index.stats.special_following'),
    count: tabCounts.value.special,
  },
])

// ========== 缓存 ==========
interface CacheItem {
  list: any[]
  page: number
  lastPage: number
  loaded: boolean
  loading: boolean
}

const createCache = (): CacheItem => ({
  list: [],
  page: 0,
  lastPage: 1,
  loaded: false,
  loading: false,
})

const cacheMap = reactive<Record<TabKey, CacheItem>>({
  following: createCache(),
  fans: createCache(),
  special: createCache(),
})

const currentCache = computed(() => cacheMap[activeTab.value])
const currentList = computed(() => currentCache.value.list)
const loadState = ref('loading')

const switchTab = (key: TabKey) => {
  if (activeTab.value === key) return
  const prevKey = activeTab.value
  activeTab.value = key

  if (searchKeyword.value.trim()) {
    cacheMap[prevKey].loaded = false
    cacheMap[prevKey].page = 0
    cacheMap[prevKey].list = []
  }
  searchKeyword.value = ''
  const cache = cacheMap[key]
  loadState.value = cache.loaded && cache.page >= cache.lastPage ? 'finished' : 'loading'
  if (!cache.loaded) loadData()
}

// ========== 搜索 ==========
const searchKeyword = ref('')

const onSearch = () => {
  loadData(true)
}

const onSearchClear = () => {
  loadData(true)
}

// ========== 数据加载 ==========
const loadData = async (refresh = false) => {
  const cache = currentCache.value
  if (cache.loading) return
  if (refresh) {
    cache.page = 0
    cache.list = []
    cache.lastPage = 1
    cache.loaded = false
  }
  if (cache.page >= cache.lastPage && !refresh) {
    loadState.value = 'finished'
    return
  }

  cache.loading = true
  loadState.value = 'loading'

  const type = activeTab.value === 'special' ? 'special_following' : activeTab.value
  const params: any = {
    type,
    page: cache.page + 1,
    limit: 20,
    member_id: memberId.value || undefined,
  }
  const keyword = searchKeyword.value.trim()
  if (keyword) params.keyword = keyword

  try {
    const res = await getFollowMembersApi(params)
    if (res.code === 1 && res.data) {
      const { members, page: resPage, total, limit } = res.data
      const lastPage = Math.ceil(total / limit)
      const list = members.map((m: any) => ({
        ...m,
        avatar: m.avatar || '/static/images/default_avatar.png',
      }))
      if (resPage === 1) {
        cache.list = list
      } else {
        cache.list = cache.list.concat(list)
      }
      cache.page = resPage
      cache.lastPage = lastPage
      cache.loaded = true
      loadState.value = cache.page >= cache.lastPage ? 'finished' : 'success'

      // 更新 tab 数量
      if (activeTab.value === 'following') tabCounts.value.following = total
      else if (activeTab.value === 'fans') tabCounts.value.fans = total
      else tabCounts.value.special = total
    }
  } catch (e) {
    loadState.value = 'error'
  }
  cache.loading = false
}

const onScrollToLower = () => {
  if (loadState.value !== 'finished' && loadState.value !== 'error') {
    loadData()
  }
}

// ========== 关注/取关 ==========
const getFollowButtonInfo = (user: any) => {
  if (user.is_self) return null
  if (user.is_special_following)
    return { text: t('social.index.stats.special_following'), style: 'special' }
  if (user.is_mutual_following) return { text: '互相关注', style: 'followed' }
  if (user.is_following) return { text: '已关注', style: 'followed' }
  if (user.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
}

const syncMemberFollowState = (targetId: number, data: any, user: any) => {
  const wasFollowing = user.is_following
  Object.values(cacheMap).forEach((cache) => {
    const u = cache.list.find((m: any) => m.member_id === targetId)
    if (u) {
      u.is_following = data.is_following
      u.is_mutual_following = data.is_mutual_following
      u.is_special_following = data.is_special_following
      u.is_following_me = data.is_following_me
    }
  })

  if (!memberId.value) {
    if (!wasFollowing && data.is_following) {
      // 新增关注
      tabCounts.value.following += 1
      if (cacheMap.following.loaded) {
        cacheMap.following.list.unshift({ ...user, ...data })
      }
    } else if (wasFollowing && !data.is_following) {
      // 取消关注
      tabCounts.value.following = Math.max(0, tabCounts.value.following - 1)
      if (cacheMap.following.loaded) {
        cacheMap.following.list = cacheMap.following.list.filter(
          (m: any) => m.member_id !== targetId,
        )
      }
    }
  }
}

const handleFollowClick = (user: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }

  if (user.is_special_following) {
    message
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => {
        setSpecialFollowApi(user.member_id, 0).then((res) => {
          if (res.code === 1) {
            syncMemberFollowState(
              user.member_id,
              {
                is_following: user.is_following,
                is_mutual_following: user.is_mutual_following,
                is_special_following: 0,
                is_following_me: user.is_following_me,
              },
              user,
            )
            uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
          }
        })
      })
      .catch(() => {})
  } else if (user.is_following) {
    message
      .confirm({ msg: t('social.index.user.follow.cancel') })
      .then(() => {
        deleteFollowApi(user.member_id).then((res) => {
          if (res.code === 1) {
            syncMemberFollowState(user.member_id, res.data, user)
            uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
          }
        })
      })
      .catch(() => {})
  } else {
    createFollowApi(user.member_id).then((res) => {
      if (res.code === 1) {
        syncMemberFollowState(user.member_id, res.data, user)
        uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
      }
    })
  }
}

// ========== Level 工具函数 ==========
const getLevelValue = (member: any): number | null => {
  if (member?.level_id !== undefined) {
    const num = Number(member.level_id)
    return isNaN(num) || num <= 0 ? null : num
  }
  const level = member?.level
  if (!level) return null
  const levelNum = level.level !== undefined ? level.level : level
  const num = Number(levelNum)
  return isNaN(num) || num <= 0 ? null : num
}

const getLevelIcon = (member: any): string => {
  const levelId = getLevelValue(member)
  if (!levelId) return ''
  return `/static/images/level/${levelId}.png`
}

const formatFansCount = (count: number) => {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万'
  return String(count)
}

// ========== 初始化 ==========
onLoad((options: any) => {
  const targetId = Number(options?.member_id || 0)
  if (targetId && targetId === userStore.userInfo?.member_id) {
    memberId.value = 0
  } else {
    memberId.value = targetId
  }

  if (options?.fc) tabCounts.value.following = Number(options.fc)
  if (options?.fnc) tabCounts.value.fans = Number(options.fnc)
  if (options?.sc) tabCounts.value.special = Number(options.sc)
  if (options?.tab === 'fans') activeTab.value = 'fans'
  else if (options?.tab === 'special') activeTab.value = 'special'
  loadData()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

.page {
  min-height: 100vh;
  background-color: #fff;
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
    justify-content: space-between;
    height: 104rpx;
    padding: 0 24rpx;

    .left {
      width: 44rpx;
      height: 44rpx;
      flex-shrink: 0;
      image {
        width: 100%;
        height: 100%;
      }
    }

    .center {
      flex: 1;
      text-align: center;
      font-size: 36rpx;
      font-weight: 600;
      color: #fff;
    }

    .right {
      width: 44rpx;
      height: 44rpx;
      flex-shrink: 0;
    }
  }

  .navBg {
    position: relative;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: #fff;

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
        background-color: #fff;
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

/* ========== 滚动区域 ========== */
.cntScrollWrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  background-color: #fff;
  display: flex;
  flex-direction: column;
}

.cntScroll {
  width: 100%;
  padding: 0 32rpx;
  box-sizing: border-box;
}

/* ========== 子 Tab ========== */
.tabBar {
  display: flex;
  background: #fff;
  padding: 0 32rpx;

  .tabItem {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4rpx;
    padding: 20rpx 0;
    font-size: 28rpx;
    color: #666;
    position: relative;

    &.active {
      color: var(--liberty-cats-primary-color);
      font-weight: 600;
    }

    &.active::after {
      content: '';
      position: absolute;
      bottom: 4rpx;
      left: 50%;
      transform: translateX(-50%);
      width: 40rpx;
      height: 6rpx;
      border-radius: 4rpx;
      background: var(--liberty-cats-primary-color);
    }
  }
}

.tabCount {
  font-size: 26rpx;
}

/* ========== 搜索框 ========== */
.searchBar {
  padding: 0 0 16rpx 0;
}

/* ========== 用户行 ========== */
.memberItem {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;

  .memberAvatarWrap {
    position: relative;
    width: 88rpx;
    height: 88rpx;
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
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6rpx;
    font-family:
      Alimama FangYuanTi VF,
      sans-serif;

    .memberName {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .memberSub {
      display: flex;
      align-items: center;
      gap: 16rpx;
      font-size: 24rpx;
      color: #999;
    }
  }
}

/* ========== 关注按钮（固定宽度） ========== */
.followBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 160rpx;
  height: 56rpx;
  border-radius: 28rpx;
  font-size: 24rpx;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  background: var(--liberty-cats-primary-color);
  color: #fff;

  &.followed {
    background: #fff;
    color: #999;
    border: 1rpx solid #ddd;
  }

  &.special {
    background: #fff;
    color: var(--liberty-cats-primary-color);
    border: 1rpx solid var(--liberty-cats-primary-color);
    font-weight: 600;
  }
}

/* ========== 空状态 ========== */
.emptyBox {
  display: flex;
  justify-content: center;
  padding-top: 200rpx;
  .emptyText {
    font-size: 28rpx;
    color: #999;
  }
}
</style>

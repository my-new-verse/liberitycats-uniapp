<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
    onReachBottomDistance: 80,
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <!-- 顶部导航栏 -->
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="searchBox">
            <view class="chat-title-info">
              <view class="title-text-wrap">
                <text class="main-title">{{ t('group.chat.title') }}</text>
              </view>
            </view>
          </view>
          <view class="right-placeholder"></view>
        </view>
      </view>
    </view>

    <view class="cnt" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <view class="member-list-page">
        <!-- 搜索栏 -->
        <view class="search-bar">
          <wd-search
            v-model="searchKeyword"
            :maxlength="30"
            hide-cancel
            :placeholder="$t('group.chat.member.searchPlaceholder')"
          />
        </view>
        <scroll-view
          class="member-scroll"
          scroll-y
          :style="{ height: scrollHeight }"
          lower-threshold="80"
          @scrolltolower="handleMemberScrollToLower"
        >
          <template v-if="!isSearching">
            <!-- 管理员分组 -->
            <view v-if="adminList.length > 0" class="group-title">
              {{ t('group.chat.member.adminGroupTitle') }}
            </view>
            <view v-if="adminList.length" class="member-group">
              <view
                class="member-item"
                v-for="item in adminList"
                :key="item.member_id"
                @longpress="handleMemberItemLongpress(item)"
              >
                <view class="avatar-wrap" @click="handleAvatarClick(item?.member_id)">
                  <view
                    class="avatar"
                    :class="{ 'is-default-avatar': item.isDefaultAvatar }"
                    :style="item.isDefaultAvatar ? undefined : item.avatarStyle"
                  ></view>
                  <view class="levelIcon">
                    <view
                      v-if="item.levelBadgeClass"
                      class="levelBadge"
                      :class="item.levelBadgeClass"
                    ></view>
                  </view>
                </view>
                <view class="member-info">
                  <view class="member-name" @click="handleAvatarClick(item?.member_id)">
                    {{ item.nickname }}
                    <!-- 静音标识 -->
                    <view class="mute-badge" v-if="item.is_muted">
                      <view class="mute-badge-icon"></view>
                    </view>
                  </view>
                </view>
                <view
                  v-if="item.hasActions"
                  class="member-more-btn"
                  @click.stop="openMemberActionSheet(item)"
                >
                  ···
                </view>
              </view>
            </view>
          </template>

          <!-- 普通成员分组 -->
          <view v-if="memberList.length && !isSearching" class="group-title">
            {{ t('group.chat.member.memberGroupTitle') }}
          </view>
          <view class="member-group" v-if="memberList.length > 0">
            <view
              class="member-item"
              v-for="item in memberList"
              :key="item.member_id"
              @longpress="handleMemberItemLongpress(item)"
            >
              <view class="avatar-wrap" @click="handleAvatarClick(item?.member_id)">
                <view
                  class="avatar"
                  :class="{ 'is-default-avatar': item.isDefaultAvatar }"
                  :style="item.isDefaultAvatar ? undefined : item.avatarStyle"
                ></view>
                <view class="levelIcon">
                  <view
                    v-if="item.levelBadgeClass"
                    class="levelBadge"
                    :class="item.levelBadgeClass"
                  ></view>
                </view>
              </view>
              <view class="member-info">
                <view class="member-name" @click="handleAvatarClick(item?.member_id)">
                  {{ item.nickname }}
                  <!-- 静音标识 -->
                  <view class="mute-badge" v-if="item.is_muted">
                    <view class="mute-badge-icon"></view>
                  </view>
                </view>
              </view>
              <view
                v-if="item.hasActions"
                class="member-more-btn"
                @click.stop="openMemberActionSheet(item)"
              >
                ···
              </view>
            </view>
          </view>

          <wd-loadmore v-if="memberLoadingMore" custom-class="loadmore" state="loading" />
          <wd-loadmore
            v-else-if="!memberHasMore && memberList.length > 0"
            custom-class="loadmore"
            state="finished"
          />

          <!-- 搜索无结果提示 -->
          <template v-if="!memberLoading && memberList.length === 0">
            <view class="emptyBox">
              <view class="emptyImg"></view>
            </view>
          </template>
        </scroll-view>
      </view>
    </view>

    <!-- 禁言设置弹窗 -->
    <wd-popup v-model="showMutePopup" position="bottom" :close-on-click-modal="false">
      <view class="mute-popup">
        <view class="popup-header">
          <text class="popup-title">
            {{
              muteDialogMode === 'unmute'
                ? t('group.chat.member.unmuteDialogTitle')
                : t('group.chat.member.muteDialogTitle')
            }}
          </text>
          <view class="close-btn" @click="showMutePopup = false">
            <wd-icon name="close" size="20px"></wd-icon>
          </view>
        </view>

        <view class="popup-content">
          <view class="form-item">
            <text class="label">
              {{
                muteDialogMode === 'unmute'
                  ? t('group.chat.member.unmuteReasonLabel')
                  : t('group.chat.member.muteReasonLabel')
              }}
            </text>
            <wd-input
              v-model="muteReason"
              :placeholder="
                muteDialogMode === 'unmute'
                  ? t('group.chat.member.unmuteReasonPlaceholder')
                  : t('group.chat.member.muteReasonPlaceholder')
              "
              clearable
              :maxlength="100"
            />
          </view>

          <view v-if="muteDialogMode !== 'unmute'" class="form-item">
            <text class="label">{{ t('group.chat.member.muteUntilLabel') }}</text>
            <wd-calendar
              v-model="muteUntilTimestamp"
              type="datetime"
              :min-date="Date.now()"
              :placeholder="t('group.chat.member.muteUntilPlaceholder')"
            />
          </view>
        </view>

        <view class="popup-footer">
          <wd-button custom-class="cancel-btn" @click="showMutePopup = false">
            {{ t('common.cancel') }}
          </wd-button>
          <wd-button type="primary" custom-class="confirm-btn" @click="confirmMute">
            {{ t('common.confirm') }}
          </wd-button>
        </view>
      </view>
    </wd-popup>
    <wd-action-sheet
      custom-class="messageActionSheet"
      custom-style="margin: 0 10px calc(var(--window-bottom) + 10px) 10px; border-radius: 16px; background: #fff;"
      v-model="memberActionSheetVisible"
      :title="t('group.chat.member.actionSheetTitle')"
    >
      <view class="action-sheet-slot">
        <view
          v-for="(item, index) in memberActionSheetActions"
          :key="`${item.key || 'action'}-${index}`"
          class="action-sheet-item"
          :class="{ destructive: item.destructive }"
          @click="handleMemberActionSheetItemClick(item)"
        >
          <view class="action-sheet-item-content">
            <wd-icon
              v-if="item.iconName"
              :name="item.iconName"
              :size="item.iconSize || '38rpx'"
              class="action-sheet-item-icon"
            />
            <image
              v-else-if="item.iconSrc"
              :src="item.iconSrc"
              mode="aspectFit"
              class="action-sheet-item-image"
            />
            <view v-else class="action-sheet-item-icon-placeholder"></view>
            <text class="action-sheet-item-text">{{ item.name }}</text>
          </view>
        </view>
      </view>
    </wd-action-sheet>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/store'
import { getImageUrl } from '@/utils'
import { getAvatarStyle, isDefaultAvatarSource } from '@/utils/avatarCache'
import { useToast } from 'wot-design-uni'
import { debounce } from 'lodash-es'
import {
  getChatRoomMembersApi,
  ChatMembersResponse,
  muteMemberApi,
  unmuteMemberApi,
  updateMemberRoleApi,
  removeMemberApi,
  ChatMember as ApiChatMember,
} from '@/service/api/groupChat'

const { t } = useI18n()
const userStore = useUserStore()
const toast = useToast()
const locale = uni.getLocale()

// 路由参数
const roomCode = ref('')
const routeRoomId = ref<number>(0)
const canSpeak = ref<boolean>(false)
const currentUserRole = ref<string>('')
// 导航栏高度
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

// 搜索关键词
const searchKeyword = ref('')
const MEMBER_PAGE_LIMIT = 30
const MEMBER_SEARCH_LIMIT = 20
const GROUP_MEMBERS_REFRESH_EVENT = 'group_members:refresh'
const GROUP_CHAT_MEMBER_STATUS_EVENT = 'group_chat:update_member_status'

// 禁言弹窗相关状态
const showMutePopup = ref(false)
const muteReason = ref('')
const muteUntilTimestamp = ref<number | null>(null) // 使用时间戳（毫秒）
const currentMuteMember = ref<ApiChatMember | null>(null)
const muteDialogMode = ref<'mute' | 'unmute'>('mute')
const selectedMemberActionTarget = ref<MemberDisplayItem | null>(null)
const memberActionSheetVisible = ref(false)
type MemberActionType = 'setAdmin' | 'removeAdmin' | 'mute' | 'unmute' | 'kick'
type MemberActionItem = {
  key: MemberActionType
  label: string
  destructive?: boolean
}
type MemberDisplayItem = ApiChatMember & {
  isDefaultAvatar: boolean
  avatarStyle: Record<string, string>
  actionList: MemberActionItem[]
  hasActions: boolean
  levelBadgeClass: string
}
type ActionSheetAction = {
  name: string
  color?: string
  key?: MemberActionType
  iconName?: string
  iconSrc?: string
  iconSize?: string
  destructive?: boolean
}

const normalizeLevelBadgeLevel = (level?: number | string | null) => {
  const normalizedLevel = Number(level || 0)
  if (!Number.isFinite(normalizedLevel) || normalizedLevel <= 0) return 0
  return Math.min(4, normalizedLevel)
}

const getLevelBadgeClass = (level?: number | string | null) => {
  const normalizedLevel = normalizeLevelBadgeLevel(level)
  return normalizedLevel ? `levelBadge--${normalizedLevel}` : ''
}

// 管理员列表（role: founder, moderator）
const adminList = ref<MemberDisplayItem[]>([])

// 普通成员列表（role: member）
const memberList = ref<MemberDisplayItem[]>([])
const memberCurrentPage = ref(1)
const memberLastPage = ref(1)
const memberHasMore = ref(true)
const memberLoading = ref(false)
const memberLoadingMore = ref(false)
const memberLoadRequestId = ref(0)
const cachedAdminList = ref<MemberDisplayItem[]>([])
const cachedMemberList = ref<MemberDisplayItem[]>([])
const cachedMemberCurrentPage = ref(1)
const cachedMemberLastPage = ref(1)
const cachedMemberHasMore = ref(true)
const hasDefaultMemberCache = ref(false)

const filteredMemberList = computed(() => memberList.value)
const isSearching = computed(() => !!searchKeyword.value.trim())

const normalizeMemberRole = (role?: string) => {
  switch (role) {
    case 'founder':
    case 'owner':
      return 'owner'
    case 'host':
      return 'host'
    case 'moderator':
    case 'admin':
      return 'admin'
    default:
      return 'member'
  }
}

const getRoleRank = (role?: string) => {
  const normalizedRole = normalizeMemberRole(role)
  if (normalizedRole === 'owner') return 3
  if (normalizedRole === 'host') return 2
  if (normalizedRole === 'admin') return 1
  return 0
}

const canOperateTargetMember = (item: ApiChatMember) => {
  if (!item || item.is_self) return false

  const currentRank = getRoleRank(currentUserRole.value)
  const targetRank = getRoleRank(item.role)

  if (currentRank <= 0) return false
  if (currentRank === 3) return true
  return currentRank > targetRank
}

const canManageRole = (item: ApiChatMember) => {
  if (!canOperateTargetMember(item)) return false

  const currentRank = getRoleRank(currentUserRole.value)
  const targetRole = normalizeMemberRole(item.role)
  if (currentRank < 2) return false

  return targetRole === 'member' || targetRole === 'admin'
}

const canManageMute = (item: ApiChatMember) => {
  if (!canOperateTargetMember(item)) return false

  const currentRank = getRoleRank(currentUserRole.value)
  const targetRole = normalizeMemberRole(item.role)

  if (currentRank === 1) {
    return targetRole === 'member'
  }

  return currentRank >= 2
}

const canKickMember = (item: ApiChatMember) => {
  return canOperateTargetMember(item)
}

const buildMemberActionList = (item: ApiChatMember): MemberActionItem[] => {
  const actionList: MemberActionItem[] = []
  const targetRole = normalizeMemberRole(item.role)

  if (canManageRole(item) && targetRole === 'member') {
    actionList.push({
      key: 'setAdmin',
      label: t('group.chat.member.action.setAdmin'),
    })
  }

  if (canManageRole(item) && targetRole === 'admin') {
    actionList.push({
      key: 'removeAdmin',
      label: t('group.chat.member.action.removeAdmin'),
    })
  }

  if (canManageMute(item)) {
    actionList.push({
      key: item.is_muted ? 'unmute' : 'mute',
      label: item.is_muted
        ? t('group.chat.member.action.unmute')
        : t('group.chat.member.action.mute'),
    })
  }

  if (canKickMember(item)) {
    actionList.push({
      key: 'kick',
      label: t('group.chat.member.action.kick'),
      destructive: true,
    })
  }

  return actionList
}

const canUseMemberLongpress = computed(() => getRoleRank(currentUserRole.value) > 0)
let scrollHeight = 'calc(100vh - 200rpx)' // iOS scroll-view 需要明确高度
const MEMBER_ACTION_ADMIN_ICON = '/static/images/add_administrator.png'
const MEMBER_ACTION_MUTE_ICON = '/static/images/mute_1.png'

const memberActionSheetActions = computed<ActionSheetAction[]>(() => {
  const targetMember = selectedMemberActionTarget.value
  if (!targetMember) return []

  return targetMember.actionList.map((action) => ({
    name: action.label,
    key: action.key,
    destructive: action.destructive,
    iconName: action.key === 'kick' ? 'user-clear' : undefined,
    iconSrc:
      action.key === 'setAdmin' || action.key === 'removeAdmin'
        ? MEMBER_ACTION_ADMIN_ICON
        : action.key === 'mute' || action.key === 'unmute'
          ? MEMBER_ACTION_MUTE_ICON
          : undefined,
  }))
})

const normalizeMemberList = (memberData: ApiChatMember[] = []): MemberDisplayItem[] => {
  return memberData.map((item: ApiChatMember) => {
    const normalizedItem = {
      ...item,
      is_self: item.member_id === userStore.userInfo?.member_id,
    } as ApiChatMember
    const actionList = buildMemberActionList(normalizedItem)
    const isDefaultAvatar = isDefaultAvatarSource(normalizedItem.avatar || '')

    return {
      ...normalizedItem,
      isDefaultAvatar,
      avatarStyle: isDefaultAvatar ? {} : getAvatarStyle(normalizedItem.avatar || '', 'member'),
      levelBadgeClass: getLevelBadgeClass(normalizedItem.level?.level),
      actionList,
      hasActions: actionList.length > 0,
    }
  })
}

const getMemberSearchKeyword = () => {
  const keyword = searchKeyword.value.trim()
  return keyword || undefined
}

watch(
  memberList,
  (newVal, oldVal) => {
    console.log('memberList 发生变化', newVal)
  },
  { deep: true, immediate: true },
)
const loadAdminMembers = async () => {
  const roomId = routeRoomId.value
  if (!roomId) return

  const adminRes = await getChatRoomMembersApi(roomId, 'moderator', 1, MEMBER_PAGE_LIMIT)
  if (adminRes.code === 1 && adminRes.data.data) {
    adminList.value = normalizeMemberList(adminRes.data.data)
    if (!isSearching.value) {
      cachedAdminList.value = [...adminList.value]
      hasDefaultMemberCache.value = true
    }
    return
  }

  adminList.value = []
  if (!isSearching.value) {
    cachedAdminList.value = []
  }
}

const applyMemberPageResult = (responseData: ChatMembersResponse, reset = false) => {
  const nextMembers = normalizeMemberList(responseData?.data || [])
  memberCurrentPage.value = Number(responseData?.current_page || 1)
  memberLastPage.value = Number(responseData?.last_page || 1)
  memberHasMore.value = memberCurrentPage.value < memberLastPage.value
  memberList.value = reset ? nextMembers : [...memberList.value, ...nextMembers]

  if (!isSearching.value) {
    cachedMemberList.value = [...memberList.value]
    cachedMemberCurrentPage.value = memberCurrentPage.value
    cachedMemberLastPage.value = memberLastPage.value
    cachedMemberHasMore.value = memberHasMore.value
    hasDefaultMemberCache.value = true
  }
}

const loadMemberPage = async (reset = false) => {
  console.log('==========', routeRoomId.value)
  const roomId = routeRoomId.value
  if (!roomId) return
  if (!reset && (memberLoading.value || memberLoadingMore.value)) return

  const nextPage = reset ? 1 : memberCurrentPage.value + 1
  const keyword = getMemberSearchKeyword()
  const roleFilter = 'member'
  const requestLimit = keyword ? MEMBER_SEARCH_LIMIT : MEMBER_PAGE_LIMIT
  if (!reset && !memberHasMore.value) return
  const currentRequestId = ++memberLoadRequestId.value

  if (reset) {
    memberLoading.value = true
  } else {
    memberLoadingMore.value = true
  }

  try {
    const memberRes = await getChatRoomMembersApi(
      roomId,
      roleFilter,
      nextPage,
      requestLimit,
      keyword,
    )
    if (currentRequestId !== memberLoadRequestId.value) return

    if (memberRes.code === 1 && memberRes.data) {
      applyMemberPageResult(memberRes.data, reset)
      return
    }

    if (reset) {
      memberList.value = []
      memberCurrentPage.value = 1
      memberLastPage.value = 1
      memberHasMore.value = false
    }
    console.error('load members page failed:', memberRes.msg)
  } catch (err) {
    console.error('捕获到错误：', err)
  } finally {
    if (currentRequestId === memberLoadRequestId.value) {
      memberLoading.value = false
      memberLoadingMore.value = false
    }
  }
}

const reloadCurrentMemberLists = async () => {
  if (!searchKeyword.value.trim()) {
    await loadAdminMembers()
  }
  await loadMemberPage(true)
}

const restoreDefaultMemberCache = () => {
  if (!hasDefaultMemberCache.value) return false

  adminList.value = [...cachedAdminList.value]
  memberList.value = [...cachedMemberList.value]
  memberCurrentPage.value = cachedMemberCurrentPage.value
  memberLastPage.value = cachedMemberLastPage.value
  memberHasMore.value = cachedMemberHasMore.value
  memberLoading.value = false
  memberLoadingMore.value = false
  memberLoadRequestId.value += 1
  return true
}

onLoad((options: any) => {
  roomCode.value = options?.code || ''
  routeRoomId.value = Number(options?.room_id || 0)
  currentUserRole.value = options?.currentUserRole || ''
})

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)
  navHeight.value = safeTopRpx.value + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value

  // 计算 scroll-view 可用高度（iOS 需要 scroll-view 有明确高度）
  const windowHeightRpx = systemInfo.windowHeight / (systemInfo.windowWidth / 750)
  scrollHeight = `${windowHeightRpx - navHeight.value - 80}rpx` // 80rpx = padding 40rpx*2

  // 加载成员列表
  reloadCurrentMemberLists()
  uni.$on(GROUP_MEMBERS_REFRESH_EVENT, handleGroupMembersRefreshEvent)
})

// 返回上一页
const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

const notifyGroupChatMemberStatus = (memberId: number, memberStatus: number) => {
  const roomId = Number(routeRoomId.value || 0)
  if (!roomId || !memberId) return
  uni.$emit(GROUP_CHAT_MEMBER_STATUS_EVENT, { roomId, memberId, memberStatus })
}

// 加载群成员列表
const loadMembers = async () => {
  try {
    await reloadCurrentMemberLists()
  } catch (error) {
    console.error('loadMembers error:', error)
    toast.show(t('group.chat.member.loadMembersFailed'))
    adminList.value = []
    memberList.value = []
  }
}

// 头像点击事件
const handleAvatarClick = (userId: string | number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${userId}`,
  })
}

// 管理员操作
const handleAdminAction = async (item: ApiChatMember, nextRole: 'moderator' | 'member') => {
  const roomId = routeRoomId.value
  if (!roomId) {
    toast.show(t('group.chat.member.roomInfoLoading'))
    return
  }

  try {
    uni.showLoading()
    const res = await updateMemberRoleApi(roomId, item.member_id, nextRole)
    uni.hideLoading()
    if (res.code === 1) {
      await loadMembers()
    } else {
      uni.showToast({ title: res.msg || t('common.operationFailed'), icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('handleAdminAction error:', error)
    uni.showToast({ title: t('common.operationFailedRetry'), icon: 'none' })
  }
}

// 禁言操作
const handleMuteAction = async (item: ApiChatMember) => {
  if (item.is_muted) {
    currentMuteMember.value = item
    muteDialogMode.value = 'unmute'
    muteReason.value = ''
    muteUntilTimestamp.value = null
    showMutePopup.value = true
    return
  }

  currentMuteMember.value = item
  muteDialogMode.value = 'mute'
  muteReason.value = ''
  muteUntilTimestamp.value = null
  showMutePopup.value = true
}

const handleKickMember = async (item: ApiChatMember) => {
  const roomId = routeRoomId.value
  if (!roomId) return

  try {
    uni.showLoading()
    const res = await removeMemberApi(roomId, item.member_id)
    uni.hideLoading()
    if (res.code === 1) {
      await loadMembers()
      notifyGroupChatMemberStatus(item.member_id, 3)
      return
    }
    uni.showToast({ title: res.msg || t('common.operationFailed'), icon: 'none' })
  } catch (error) {
    uni.hideLoading()
    console.error('handleKickMember error:', error)
    uni.showToast({ title: t('common.operationFailedRetry'), icon: 'none' })
  }
}

const openMemberActionSheet = (item: MemberDisplayItem) => {
  if (!item.hasActions) return
  selectedMemberActionTarget.value = item
  memberActionSheetVisible.value = true
}

const handleMemberItemLongpress = (item: MemberDisplayItem) => {
  if (!canUseMemberLongpress.value) return
  openMemberActionSheet(item)
}

const handleMemberScrollToLower = async () => {
  await loadMemberPage(false)
}

const handleMemberActionSheetSelect = async ({ item }: { item: ActionSheetAction }) => {
  const targetMember = selectedMemberActionTarget.value
  if (!targetMember || !item?.key) return

  memberActionSheetVisible.value = false

  if (item.key === 'setAdmin') {
    await handleAdminAction(targetMember, 'moderator')
    return
  }

  if (item.key === 'removeAdmin') {
    await handleAdminAction(targetMember, 'member')
    return
  }

  if (item.key === 'mute' || item.key === 'unmute') {
    await handleMuteAction(targetMember)
    return
  }

  if (item.key === 'kick') {
    await handleKickMember(targetMember)
  }
}

const handleMemberActionSheetItemClick = async (item: ActionSheetAction) => {
  await handleMemberActionSheetSelect({ item })
}

const debouncedSearchMembers = debounce(() => {
  reloadCurrentMemberLists()
}, 180)

const debouncedRefreshMembersBySocket = debounce((eventRoomId?: number) => {
  if (Number(eventRoomId || 0) !== Number(routeRoomId.value || 0)) return
  reloadCurrentMemberLists()
}, 200)

watch(searchKeyword, (value, oldValue) => {
  const nextKeyword = value.trim()
  const prevKeyword = oldValue.trim()
  if (nextKeyword === prevKeyword) return

  if (!nextKeyword) {
    debouncedSearchMembers.cancel()
    if (restoreDefaultMemberCache()) {
      return
    }
  }

  debouncedSearchMembers()
})

onReachBottom(() => {
  loadMemberPage(false)
})

onUnmounted(() => {
  debouncedSearchMembers.cancel()
  debouncedRefreshMembersBySocket.cancel()
  uni.$off(GROUP_MEMBERS_REFRESH_EVENT, handleGroupMembersRefreshEvent)
})

const handleGroupMembersRefreshEvent = (payload?: { roomId?: number }) => {
  debouncedRefreshMembersBySocket(payload?.roomId)
}

// 确认禁言
const confirmMute = async () => {
  if (!currentMuteMember.value) return

  const roomId = routeRoomId.value
  const reason = muteReason.value.trim()

  if (muteDialogMode.value === 'unmute') {
    try {
      uni.showLoading()
      const result = await unmuteMemberApi(roomId, currentMuteMember.value.member_id, reason)
      uni.hideLoading()

      if (result.code === 1) {
        showMutePopup.value = false
        await loadMembers()
        notifyGroupChatMemberStatus(currentMuteMember.value.member_id, 0)

        if (currentMuteMember.value.member_id === userStore.userInfo?.member_id) {
          canSpeak.value = true
        }
      } else {
        uni.showToast({ title: result.msg || t('common.operationFailed'), icon: 'none' })
      }
    } catch (error) {
      uni.hideLoading()
      console.error('confirmUnmute error:', error)
      uni.showToast({ title: t('common.operationFailedRetry'), icon: 'none' })
    }
    return
  }

  // 计算禁言截止时间戳（秒）
  let muteUntil: number
  if (muteUntilTimestamp.value) {
    // wd-calendar 返回的是毫秒级时间戳，需要转换为秒
    muteUntil = Math.floor(muteUntilTimestamp.value / 1000)
  } else {
    // 如果没有选择时间，默认为永久禁言（传0）
    muteUntil = 0
  }

  try {
    uni.showLoading()
    const result = await muteMemberApi(roomId, currentMuteMember.value.member_id, muteUntil, reason)
    uni.hideLoading()

    if (result.code === 1) {
      showMutePopup.value = false
      await loadMembers()
      notifyGroupChatMemberStatus(currentMuteMember.value.member_id, 4)
      // uni.showToast({ title: '禁言成功', icon: 'success' })
    } else {
      uni.showToast({ title: result.msg || t('common.operationFailed'), icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('confirmMute error:', error)
    uni.showToast({ title: t('common.operationFailedRetry'), icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.page {
  background-color: var(--liberty-cats-page-background-color);
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  .cnt {
    padding: 40rpx 0;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
}

.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 999;
  width: 100%;
  height: calc(104rpx + var(--liberty-cats-page-common-border-radius) + env(safe-area-inset-top));
  overflow: hidden;

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    padding-top: calc(env(safe-area-inset-top));
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);

    .navCnt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 48rpx);
      height: 104rpx;
      padding: 0 24rpx;

      .left {
        width: 60rpx;
        flex-shrink: 0;

        image {
          width: 40rpx;
        }
      }

      .searchBox {
        flex: 1;
        display: flex;
        justify-content: left;
        align-items: center;

        .chat-title-info {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 16rpx;

          .title-text-wrap {
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 8rpx;

            .main-title {
              font-size: 30rpx;
              font-weight: bold;
              color: #fff;
              max-width: 240rpx;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }

      .right-placeholder {
        width: 60rpx;
        flex-shrink: 0;
      }
    }
  }
}

.member-list-page {
  flex: 1;
  height: 0;
  min-height: 0;
  // padding: 20rpx 30rpx;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.member-scroll {
  width: 100%;
}

.search-bar {
  padding: 0;
  background: transparent;
  .search-member-input {
    padding: 12rpx;
    border-radius: 12rpx;
  }
}

.member-more-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 72rpx;
  height: 72rpx;
  font-size: 44rpx;
  line-height: 1;
  color: #1f1f1f;
}
.group-title {
  padding: 24rpx;
  font-size: 24rpx;
  color: #666;
}

.member-group {
  background: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  overflow: hidden;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.avatar-wrap {
  position: relative;
  margin-right: 24rpx;
  cursor: pointer;
  .levelIcon {
    position: absolute;
    right: 0rpx;
    bottom: 12rpx;
    width: 28rpx;
    height: 28rpx;
    .levelBadge {
      width: 100%;
      height: 100%;
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;

      &.levelBadge--1 {
        background-image: url('/static/images/level/1.png');
      }

      &.levelBadge--2 {
        background-image: url('/static/images/level/2.png');
      }

      &.levelBadge--3 {
        background-image: url('/static/images/level/3.png');
      }

      &.levelBadge--4 {
        background-image: url('/static/images/level/4.png');
      }
    }
  }
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: #eee;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;

  &.is-default-avatar {
    background-image: url('/static/images/default_avatar.png');
  }
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 28rpx;
  // font-weight: 500;
  color: #333;
  margin-bottom: 8rpx;
  display: flex;
  align-items: center;

  .mute-badge {
    margin-left: 8rpx;
    font-size: 28rpx;
    color: #ff4d4f;

    .mute-badge-icon {
      width: 28rpx;
      height: 28rpx;
      background-image: url('/static/images/silenced.png');
      background-position: center;
      background-repeat: no-repeat;
      background-size: contain;
    }
  }
}

.action-texts {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.action-text {
  font-size: 24rpx;
  color: #666;
  line-height: 1.2;
}

// 搜索无结果提示
.empty-tip {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80rpx 0;

  text {
    font-size: 28rpx;
    color: #999;
  }
}

.list-status-text {
  padding: 24rpx 0 32rpx;
  text-align: center;
  font-size: 24rpx;
  color: #999;
}

// 禁言弹窗样式
.mute-popup {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  max-height: 80vh;
  overflow-y: auto;

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx;

    .popup-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }

    .close-btn {
      padding: 8rpx;
      cursor: pointer;
    }
  }

  .popup-content {
    .form-item {
      margin-bottom: 32rpx;

      .label {
        display: block;
        font-size: 28rpx;
        color: #666;
        margin-bottom: 16rpx;
      }
    }
  }

  .popup-footer {
    display: flex;
    gap: 24rpx;
    margin-top: 40rpx;

    :deep(.cancel-btn) {
      flex: 1;
    }

    :deep(.confirm-btn) {
      flex: 1;
    }
  }
}
::v-deep .messageActionSheet {
  .wd-action-sheet__header {
    text-align: left;
  }
}

.action-sheet-slot {
  padding-bottom: 8rpx;
}

.action-sheet-item {
  position: relative;
  padding: 28rpx 32rpx;

  &::before {
    content: '';
    position: absolute;
    left: 32rpx;
    right: 32rpx;
    top: 0;
    height: 1rpx;
    background: rgba(0, 0, 0, 0.06);
  }

  &:first-child::before {
    display: none;
  }

  &.destructive .action-sheet-item-icon,
  &.destructive .action-sheet-item-text {
    color: #ff4d4f;
  }
}

.action-sheet-item-content {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-sheet-item-icon {
  width: 38rpx;
  text-align: center;
  color: #333;
  flex-shrink: 0;
}

.action-sheet-item-image {
  width: 38rpx;
  height: 38rpx;
  flex-shrink: 0;
}

.action-sheet-item-icon-placeholder {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.action-sheet-item-text {
  font-size: 30rpx;
  line-height: 1.4;
  color: #333;
}
</style>

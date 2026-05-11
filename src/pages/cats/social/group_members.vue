<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
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
        <view v-show="!searchKeyword.length">
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
                <image :src="item.avatar" class="avatar" />
                <view class="levelIcon">
                  <image :src="`/static/images/level/${item.level.level}.png`" mode="widthFix" />
                </view>
              </view>
              <view class="member-info">
                <view class="member-name" @click="handleAvatarClick(item?.member_id)">
                  {{ item.nickname }}
                  <!-- 静音标识 -->
                  <view class="mute-badge" v-if="item.is_muted">
                    <wd-img
                      src="/src/static/images/silenced.png"
                      mode="widthFix"
                      :width="22"
                      :height="22"
                    ></wd-img>
                  </view>
                </view>
              </view>
              <view
                v-if="getMemberActionList(item).length > 0"
                class="member-more-btn"
                @click.stop="openMemberActionSheet(item)"
              >
                ···
              </view>
            </view>
          </view>
        </view>

        <!-- 普通成员分组 -->
        <view v-show="filteredMemberList.length && !searchKeyword.length" class="group-title">
          {{ t('group.chat.member.memberGroupTitle') }}
        </view>
        <view class="member-group" v-if="filteredMemberList.length > 0">
          <view
            class="member-item"
            v-for="item in filteredMemberList"
            :key="item.member_id"
            @longpress="handleMemberItemLongpress(item)"
          >
            <view class="avatar-wrap" @click="handleAvatarClick(item?.member_id)">
              <image :src="item.avatar" class="avatar" />
              <view class="levelIcon">
                <image :src="`/static/images/level/${item.level.level}.png`" mode="widthFix" />
              </view>
            </view>
            <view class="member-info">
              <view class="member-name" @click="handleAvatarClick(item?.member_id)">
                {{ item.nickname }}
                <!-- 静音标识 -->
                <view class="mute-badge" v-if="item.is_muted">
                  <wd-img
                    src="/src/static/images/silenced.png"
                    mode="widthFix"
                    :width="22"
                    :height="22"
                  ></wd-img>
                </view>
              </view>
            </view>
            <view
              v-if="getMemberActionList(item).length > 0"
              class="member-more-btn"
              @click.stop="openMemberActionSheet(item)"
            >
              ···
            </view>
          </view>
        </view>

        <!-- 搜索无结果提示 -->
        <template v-if="filteredMemberList.length === 0">
          <view class="emptyBox">
            <view class="emptyImg"></view>
          </view>
        </template>
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
              maxlength="100"
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
      v-model="memberActionSheetVisible"
      :actions="memberActionSheetActions"
      :title="t('group.chat.member.actionSheetTitle')"
      @select="handleMemberActionSheetSelect"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/store'
import { getImageUrl } from '@/utils'
import { useToast } from 'wot-design-uni'
import {
  getChatRoomMembersApi,
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

// 禁言弹窗相关状态
const showMutePopup = ref(false)
const muteReason = ref('')
const muteUntilTimestamp = ref<number | null>(null) // 使用时间戳（毫秒）
const currentMuteMember = ref<ApiChatMember | null>(null)
const muteDialogMode = ref<'mute' | 'unmute'>('mute')
const selectedMemberActionTarget = ref<ApiChatMember | null>(null)
const memberActionSheetVisible = ref(false)
type MemberActionType = 'setAdmin' | 'removeAdmin' | 'mute' | 'unmute' | 'kick'
type MemberActionItem = {
  key: MemberActionType
  label: string
  destructive?: boolean
}
type ActionSheetAction = {
  name: string
  color?: string
  key?: MemberActionType
}

// 管理员列表（role: founder, moderator）
const adminList = ref<ApiChatMember[]>([])

// 普通成员列表（role: member）
const memberList = ref<ApiChatMember[]>([])

// 搜索过滤后的普通成员列表
const filteredMemberList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return memberList.value
  }

  const keyword = searchKeyword.value.trim().toLowerCase()
  return memberList.value.filter((member) => {
    return member.nickname?.toLowerCase().includes(keyword)
  })
})

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

const getMemberActionList = (item: ApiChatMember): MemberActionItem[] => {
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

const memberActionSheetActions = computed<ActionSheetAction[]>(() => {
  const targetMember = selectedMemberActionTarget.value
  if (!targetMember) return []

  return getMemberActionList(targetMember).map((action) => ({
    name: action.label,
    // color: action.destructive ? '#ff4d4f' : undefined,
    key: action.key,
  }))
})

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

  // 加载成员列表
  loadMembers()
})

// 返回上一页
const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

// 加载群成员列表
const loadMembers = async () => {
  const roomId = routeRoomId.value
  if (!roomId) return

  try {
    // 并发请求：获取管理员（founder, moderator）和普通成员（member）
    const [adminRes, memberRes] = await Promise.all([
      getChatRoomMembersApi(roomId, 'moderator'), // 获取管理员和群主
      getChatRoomMembersApi(roomId), // 获取普通成员
    ])
    // 处理管理员列表
    if (adminRes.code === 1 && adminRes.data.data) {
      adminList.value = adminRes.data.data.map((item: ApiChatMember) => {
        item.is_self = item.member_id === userStore.userInfo?.member_id
        return item
      })
    } else {
      adminList.value = []
    }

    // 处理普通成员列表
    if (memberRes.code === 1 && memberRes.data.data) {
      memberList.value = memberRes.data.data.map((item: ApiChatMember) => {
        item.is_self = item.member_id === userStore.userInfo?.member_id
        return item
      })
    } else {
      memberList.value = []
      console.error('加载普通成员列表失败:', memberRes.msg)
    }
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
      return
    }
    uni.showToast({ title: res.msg || t('common.operationFailed'), icon: 'none' })
  } catch (error) {
    uni.hideLoading()
    console.error('handleKickMember error:', error)
    uni.showToast({ title: t('common.operationFailedRetry'), icon: 'none' })
  }
}

const openMemberActionSheet = (item: ApiChatMember) => {
  if (getMemberActionList(item).length === 0) return
  selectedMemberActionTarget.value = item
  memberActionSheetVisible.value = true
}

const handleMemberItemLongpress = (item: ApiChatMember) => {
  if (!canUseMemberLongpress.value) return
  openMemberActionSheet(item)
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

// 确认禁言
const confirmMute = async () => {
  if (!currentMuteMember.value) return

  const roomId = routeRoomId.value
  const reason = muteReason.value.trim()

  if (muteDialogMode.value === 'unmute') {
    if (!reason) {
      toast.show(t('group.chat.member.unmuteReasonRequired'))
      return
    }

    try {
      uni.showLoading()
      const result = await unmuteMemberApi(roomId, currentMuteMember.value.member_id, reason)
      uni.hideLoading()

      if (result.code === 1) {
        showMutePopup.value = false
        await loadMembers()

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

  .cnt {
    padding: 40rpx 0;
    flex: 1;
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
  // padding: 20rpx 30rpx;
  box-sizing: border-box;
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
    image {
      width: 100%;
      height: 100%;
    }
  }
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
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
  .wd-action-sheet__action {
    text-align: left;
  }
}
</style>

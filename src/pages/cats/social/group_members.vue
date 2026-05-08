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
          <view v-if="adminList.length > 0" class="group-title">群主及群管理员</view>
          <view v-if="adminList.length" class="member-group">
            <view class="member-item" v-for="item in adminList" :key="item.member_id">
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
              <view class="action-texts" v-if="canManageAdminRole(item) || canManageMute(item)">
                <text
                  v-if="canManageAdminRole(item)"
                  class="action-text"
                  @click="handleAdminAction(item)"
                >
                  {{ t('group.chat.member.action.removeAdmin') }}
                </text>
                <text
                  v-if="canManageMute(item)"
                  class="action-text"
                  @click="handleMuteAction(item)"
                  :style="{ color: item.is_muted ? '#007aff' : '#ff4d4f' }"
                >
                  {{
                    item.is_muted
                      ? t('group.chat.member.action.unmute')
                      : t('group.chat.member.action.mute')
                  }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <!-- 普通成员分组 -->
        <view v-show="filteredMemberList.length && !searchKeyword.length" class="group-title">
          群成员
        </view>
        <view class="member-group" v-if="filteredMemberList.length > 0">
          <view class="member-item" v-for="item in filteredMemberList" :key="item.member_id">
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
            <view class="action-texts" v-if="canManageMute(item)">
              <text
                class="action-text"
                @click="handleMuteAction(item)"
                :style="{ color: item.is_muted ? '#007aff' : '#ff4d4f' }"
              >
                {{
                  item.is_muted
                    ? t('group.chat.member.action.unmute')
                    : t('group.chat.member.action.mute')
                }}
              </text>
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
          <text class="popup-title">禁言设置</text>
          <view class="close-btn" @click="showMutePopup = false">
            <wd-icon name="close" size="20px"></wd-icon>
          </view>
        </view>

        <view class="popup-content">
          <!-- 禁言原因输入 -->
          <view class="form-item">
            <text class="label">禁言原因（可选）</text>
            <wd-input v-model="muteReason" placeholder="请输入禁言原因" clearable maxlength="100" />
          </view>

          <!-- 禁言时间选择 -->
          <view class="form-item">
            <text class="label">禁言截止时间</text>
            <wd-calendar
              v-model="muteUntilTimestamp"
              type="datetime"
              :min-date="Date.now()"
              placeholder="选择禁言截止时间"
            />
          </view>
        </view>

        <view class="popup-footer">
          <wd-button custom-class="cancel-btn" @click="showMutePopup = false">取消</wd-button>
          <wd-button type="primary" custom-class="confirm-btn" @click="confirmMute">确定</wd-button>
        </view>
      </view>
    </wd-popup>
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

const canManageAdminRole = (item: ApiChatMember) => {
  return !item?.is_self && item?.role === 'moderator' && currentUserRole.value === 'founder'
}

const canManageMute = (item: ApiChatMember) => {
  return !item?.is_self && item?.role === 'moderator' && currentUserRole.value === 'founder'
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
    toast.show('加载成员列表失败')
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
const handleAdminAction = async (item: ApiChatMember) => {
  const roomId = routeRoomId.value
  if (!roomId) {
    toast.show('房间信息加载中')
    return
  }

  try {
    uni.showLoading()
    const role = item.role === 'moderator' ? 'member' : 'moderator'
    const res = await updateMemberRoleApi(roomId, item.member_id, role)
    uni.hideLoading()
    if (res.code === 1) {
      await loadMembers()
    } else {
      uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('handleAdminAction error:', error)
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
  }
}

// 禁言操作
const handleMuteAction = async (item: ApiChatMember) => {
  const roomId = routeRoomId.value

  // 如果是解除禁言，直接执行
  if (item.is_muted) {
    try {
      uni.showLoading()
      const res = await unmuteMemberApi(roomId, item.member_id)
      uni.hideLoading()

      if (res.code === 1) {
        await loadMembers()

        if (item.member_id === userStore.userInfo?.member_id) {
          canSpeak.value = !item.is_muted
        }
      } else {
        uni.showToast({ title: res.msg || '操作失败', icon: 'none' })
      }
    } catch (error) {
      uni.hideLoading()
      console.error('handleMuteAction error:', error)
      uni.showToast({ title: '操作失败，请重试', icon: 'none' })
    }
    return
  }

  // 禁言操作：显示弹窗
  currentMuteMember.value = item
  muteReason.value = ''
  muteUntilTimestamp.value = null
  showMutePopup.value = true
}

// 确认禁言
const confirmMute = async () => {
  if (!currentMuteMember.value) return

  const roomId = routeRoomId.value
  const reason = muteReason.value.trim()

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
      uni.showToast({ title: result.msg || '操作失败', icon: 'none' })
    }
  } catch (error) {
    uni.hideLoading()
    console.error('confirmMute error:', error)
    uni.showToast({ title: '操作失败，请重试', icon: 'none' })
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
</style>

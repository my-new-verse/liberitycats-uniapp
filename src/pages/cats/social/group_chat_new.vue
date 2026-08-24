<!-- 聊天记录模式+虚拟列表演示(vue)，加载更多聊天记录无闪动&支持渲染大量数据 -->
<!-- 注意：虚拟列表缓存高度默认仅在cell初始化时获取一次，若您的聊天列表中带有图片，强烈建议给图片一个固定的高度，如果高度根据内容动态撑高，可能导致虚拟列表抖动 -->
<!-- 如果必须实现高度根据内容动态撑高+虚拟列表功能，可监听图片加载完毕事件，并在其中调用z-paging的didUpdateVirtualListCell刷新缓存高度 -->

<!-- 注意此demo为聊天记录模式+内置虚拟列表模式，在微信小程序一些平台此虚拟列表会有问题，请自行参考虚拟列表在不同平台兼容性进行更改 -->
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
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <!-- 顶部导航栏 -->
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="searchBox">
            <view class="chat-title-info">
              <!-- <view
                class="group-avatar"
                :style="getAvatarStyle(roomDetail?.room.avatar || '', 'room')"
              ></view> -->
              <view class="title-text-wrap">
                <text class="main-title">{{ roomDetail?.room.name || t('group.chat.title') }}</text>
                <text class="sub-title">({{ roomDetail?.room.member_count || 0 }})</text>
              </view>
            </view>
          </view>
          <view class="right-icons">
            <wd-icon
              name="search1"
              size="22px"
              color="#fff"
              @click="debouncedGoToHistory()"
            ></wd-icon>
            <wd-icon
              name="notification"
              size="22px"
              color="#fff"
              @click="debouncedGoToAnnouncementList()"
            ></wd-icon>
            <wd-icon
              name="usergroup"
              size="22px"
              color="#fff"
              @click="debouncedGoToMembers()"
            ></wd-icon>
          </view>
        </view>
      </view>
    </view>
    <view class="cnt content" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <!-- use-chat-record-mode：开启聊天记录模式 -->
      <!-- use-virtual-list：开启虚拟列表模式 -->
      <!-- cell-height-mode：设置虚拟列表模式高度不固定 -->
      <!-- bottom-bg-color：设置slot="bottom"容器的背景色，这里设置为和chat-input-bar的背景色一致 -->
      <!-- 注意：不开启 safe-area-inset-bottom，由 chat-input-bar 内部自己处理底部安全区，避免重复叠加 -->
      <z-paging
        ref="paging"
        v-model="messages"
        use-chat-record-mode
        use-virtual-list
        cell-height-mode="dynamic"
        :safe-area-inset-bottom="false"
        bottom-bg-color="#ffffff"
        @query="queryList"
        @scroll="handleChatScroll"
        cellKeyName="id"
        :show-scrollbar="false"
      >
        <template #top>
          <wd-notice-bar
            v-if="currentAnnouncement"
            :scrollable="false"
            @click="goToCurrentAnnouncementDetail"
            custom-class="announcement-notice"
          >
            <template #prefix>
              <wd-img src="/static/images/notice_outlined.png" size="22px"></wd-img>
            </template>
            <view class="current-announcement-text">{{ currentAnnouncementText }}</view>
            <template #suffix>
              <wd-icon
                @click.stop="goToCurrentAnnouncementDetail"
                name="arrow-right"
                size="22px"
              ></wd-icon>
            </template>
          </wd-notice-bar>
        </template>
        <template v-for="(item, index) in messages" :key="item.id">
          <view
            :class="{ 'msg-row-highlight': highlightedMsgId == item.id }"
            style="transform: scaleY(-1)"
            @contextmenu.stop.prevent="handleMessageContextMenu($event, item)"
            @touchstart="handleMessageTouchStart($event, item)"
            @touchmove="handleMessageTouchMove($event)"
            @touchend="handleMessageTouchEnd"
            @touchcancel="handleMessageTouchEnd"
          >
            <chat-item
              :item="item"
              @retry="retryFailedMessage"
              @mention="handleMentionUser"
              @reply-click="handleReplyClick"
            ></chat-item>
          </view>
        </template>
        <!-- 顶部提示文字 -->
        <!-- style="transform: scaleY(-1)"必须写，否则会导致列表倒置！！！ -->
        <!-- 注意不要直接在chat-item组件标签上设置style，因为在微信小程序中是无效的，请包一层view -->
        <!-- <template #cell="{ item, index }">
          <view style="transform: scaleY(-1)">
            <chat-item :item="item"></chat-item>
          </view>
        </template> -->

        <!-- 底部聊天输入框 -->
        <template #bottom>
          <view
            v-if="showNewMessageIndicator"
            class="new-message-indicator"
            @click="handleJumpToLatestMessage"
          >
            <wd-icon name="arrow-down" size="16px" color="#1f1f1f"></wd-icon>
            <text class="new-message-indicator-text">{{ getNewMessageIndicatorText() }}</text>
          </view>
          <chat-input-bar
            ref="inputBar"
            @sendMsg="doSend"
            :room-detail="roomDetail"
            :self-muted="isCurrentUserMuted"
            :self-mute-reason="selfMuteReason"
          />
        </template>
      </z-paging>
      <!-- 右侧悬浮按钮 -->
      <view
        v-if="showFloatBtn && !isFromHistory"
        class="float-action-btn"
        @click="handleFloatAction"
      >
        <wd-icon name="arrow-up" size="24rpx"></wd-icon>
        <text class="float-action-text">
          {{ t('group.chat.importantMessages') }} ({{ importantUnreadMessages.length }})
        </text>
      </view>
      <!-- WeChat 风格气泡菜单 -->
      <view
        v-if="messagePopoverVisible"
        class="msg-popover-overlay"
        @click.stop="messagePopoverVisible = false"
      >
        <view class="msg-popover-bubble" :style="messagePopoverBubbleStyle" @click.stop>
          <scroll-view scroll-x :show-scrollbar="false" class="msg-popover-scroll">
            <view class="msg-popover-items">
              <view
                v-for="(item, index) in messageActionSheetActions"
                :key="`popover-${item.action || 'action'}-${index}`"
                class="msg-popover-item"
                :class="{ destructive: item.destructive }"
                @click.stop="handlePopoverItemClick(item)"
              >
                <view class="msg-popover-item-icon">
                  <wd-icon
                    v-if="item.iconName"
                    :name="item.iconName"
                    size="42rpx"
                    :color="item.destructive ? '#ff6b6b' : '#fff'"
                  />
                  <image
                    v-else-if="item.iconSrc"
                    :src="item.iconSrc"
                    mode="aspectFit"
                    class="msg-popover-item-image"
                  />
                  <view v-else class="msg-popover-icon-placeholder" />
                </view>
                <text class="msg-popover-item-text" :class="{ destructive: item.destructive }">
                  {{ item.name }}
                </text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view
          class="msg-popover-arrow"
          :class="[`arrow-${messagePopoverPlacement}`]"
          :style="messagePopoverArrowStyle"
        />
      </view>
      <wd-popup v-model="showUnmuteReasonPopup" position="bottom" :close-on-click-modal="false">
        <view class="mute-popup">
          <view class="popup-header">
            <text class="popup-title">{{ t('group.chat.unmuteDialogTitle') }}</text>
            <view class="close-btn" @click="showUnmuteReasonPopup = false">
              <wd-icon name="close" size="20px"></wd-icon>
            </view>
          </view>
          <view class="popup-content">
            <view class="form-item">
              <text class="label">{{ t('group.chat.unmuteReasonOptionalLabel') }}</text>
              <wd-input
                v-model="unmuteReason"
                :placeholder="t('group.chat.unmuteReasonOptionalPlaceholder')"
                clearable
                maxlength="100"
              />
            </view>
          </view>
          <view class="popup-footer">
            <wd-button custom-class="cancel-btn" @click="showUnmuteReasonPopup = false">
              {{ t('common.cancel') }}
            </wd-button>
            <wd-button type="primary" custom-class="confirm-btn" @click="confirmMessageUnmute">
              {{ t('common.confirm') }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
      <wd-popup v-model="showDeleteReasonPopup" position="bottom" :close-on-click-modal="false">
        <view class="mute-popup">
          <view class="popup-header">
            <text class="popup-title">{{ t('group.chat.deleteDialogTitle') }}</text>
            <view class="close-btn" @click="showDeleteReasonPopup = false">
              <wd-icon name="close" size="20px"></wd-icon>
            </view>
          </view>
          <view class="popup-content">
            <view class="form-item">
              <text class="label">{{ t('group.chat.deleteReasonOptionalLabel') }}</text>
              <wd-input
                v-model="deleteReason"
                :placeholder="t('group.chat.deleteReasonOptionalPlaceholder')"
                clearable
                maxlength="100"
              />
            </view>
          </view>
          <view class="popup-footer">
            <wd-button custom-class="cancel-btn" @click="showDeleteReasonPopup = false">
              {{ t('common.cancel') }}
            </wd-button>
            <wd-button type="primary" custom-class="confirm-btn" @click="confirmDeleteMessage">
              {{ t('common.confirm') }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
      <wd-popup v-model="showKickReasonPopup" position="bottom" :close-on-click-modal="false">
        <view class="mute-popup">
          <view class="popup-header">
            <text class="popup-title">{{ t('group.chat.kickDialogTitle') }}</text>
            <view class="close-btn" @click="showKickReasonPopup = false">
              <wd-icon name="close" size="20px"></wd-icon>
            </view>
          </view>
          <view class="popup-content">
            <view class="form-item">
              <text class="label">{{ t('group.chat.kickReasonOptionalLabel') }}</text>
              <wd-input
                v-model="kickReason"
                :placeholder="t('group.chat.kickReasonOptionalPlaceholder')"
                clearable
                maxlength="100"
              />
            </view>
          </view>
          <view class="popup-footer">
            <wd-button custom-class="cancel-btn" @click="showKickReasonPopup = false">
              {{ t('common.cancel') }}
            </wd-button>
            <wd-button type="primary" custom-class="confirm-btn" @click="confirmKickMember">
              {{ t('common.confirm') }}
            </wd-button>
          </view>
        </view>
      </wd-popup>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { debounce } from 'lodash-es'
import { getImageUrl, toUrl, formatRelativeTime, getChatImageUrl } from '@/utils'
import chatItem from '@/components/chat-item/chat-item.vue'
import CryptoJS from 'crypto-js'
import { EchoPrivateChannelClient } from '@/utils/echoPrivateChannelClient'
import {
  getCommunityEmotionListItem,
  getCommunityEmotionListByCategoryApi,
} from '@/service/api/community'
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'
import {
  getCurrentGroupAnnouncementApi,
  type AnnouncementSummary,
} from '@/service/api/groupAnnouncement'
import {
  getChatRoomDetailApi,
  getChatRoomMembersApi,
  sendChatMessageApi,
  getChatMessageListApi,
  getChatMessageContextApi,
  markMessageReadApi,
  ChatMessage,
  ChatMember,
  ChatMessagePayload,
  ChatMessageReplyTo,
  ChatRoomDetail,
  ChatMessageType,
  muteMemberApi,
  unmuteMemberApi,
  removeMemberApi,
  recallChatMessageApi,
  reactChatMessageApi,
  deleteChatMessageApi,
  getUnreadNotificationsApi,
} from '@/service/api/groupChat'
import { useUserStore } from '@/store'
import { useToast } from 'wot-design-uni'
const locale = uni.getLocale()

// z-paging ref
/*
页面离开标志，用于标识当前页面是否正在被关闭或返回上一页。
它的主要作用是防止在页面已卸载后，继续执行异步操作（如 WebSocket 消息处理、定时器回调、滚动事件等）
导致内存泄漏或报错。
*/
const paging = ref(null)
const isPageLeaving = ref(false)
const commentPopupVisible = ref(false)
const runtimeSystemInfo = uni.getSystemInfoSync()
const isTouchRuntime = ['ios', 'android'].includes(runtimeSystemInfo.platform)
const isIosRuntime = runtimeSystemInfo.platform === 'ios'

const inputBar = ref<{
  addMention: (memberId: number, nickname: string) => void
  setReply: (
    messageId: number,
    memberId: number,
    senderNickname: string,
    messageContent: string,
  ) => void
} | null>(null)
// v-model绑定的这个变量不要在分页请求结束中自己赋值！！！
const messages = ref([])
const highlightedMsgId = ref('')
const pendingScrollToMessageId = ref('')
const isRestoringFromCache = ref(false)
const isFromContext = ref(false)
const isFromHistory = ref(false)
const contextAfterMessageId = ref<number | null>(null)
const contextLoadingMore = ref(false)
const contextLoadArmed = ref(false)
const halfScreenHeight = uni.getSystemInfoSync().screenHeight * 1
// 待发送消息暂存（isFromHistory 时先 reload 再发送）
let pendingSendAfterReload: {
  messageType: any
  payload: any
  mentioned_member_ids?: number[]
  reply_to?: ChatMessageReplyTo
  clientMessageId: string
} | null = null
const showFloatBtn = ref(false)
const importantUnreadMessages = ref<Array<{ message_id: number }>>([])
const currentUnreadIndex = ref(0)
const roomDetail = ref<ChatRoomDetail | null>(null)
const roomCode = ref('')
const routeRoomId = ref<number>(0)
let roomDetailPreloadPromise: Promise<boolean> | null = null
const userStore = useUserStore()
const toast = useToast()
const { t } = useI18n()
const roomDetailLoading = ref(false)
const showArrow = ref(false)

// 布局相关的
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)
onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value
  uni.$on(GROUP_CHAT_REFRESH_SENDERS_EVENT, handleRefreshMessageSendersEvent)
  loadRoomDetail()
})
onLoad((options: any) => {
  roomCode.value = options?.code || ''
  routeRoomId.value = Number(options?.room_id || 0)
  isFromContext.value = options?.from_context === '1'
  isFromHistory.value = options?.from_context === '1'
  if (options?.message_id) {
    pendingScrollToMessageId.value = String(options.message_id)
  }
})
const scrollIntoViewById = async (id: string, offset: number = 500) => {
  const targetId = Number(id)
  // 检查当前消息列表中是否已存在目标消息
  const findInCurrent = () => messages.value.some((m: any) => m.id === targetId)

  // 如果当前列表中不存在，循环加载历史消息直到找到或没有更多数据
  while (!findInCurrent() && hasMoreHistory.value) {
    const earliestId =
      messages.value.length > 0 ? Math.min(...messages.value.map((m: any) => m.id)) : undefined
    if (!earliestId) break
    // 使用 silent=true 避免触发 paging.complete，手动控制消息追加
    await getChatMessageList(earliestId, true)
    // 从缓存中取出刚加载的消息并追加到列表头部
    const cached = messageCache.get(earliestId)
    if (cached) {
      const filtered = filterExistingMessages(messages.value, cached.messages)
      messages.value = [...filtered, ...messages.value]
      lastestMessageId.value = cached.newLastestId
      messageCache.delete(earliestId)
    }
    await nextTick()
  }

  // 找到后滚动并高亮
  if (findInCurrent()) {
    paging.value.scrollIntoViewById('msg-row-' + id, offset)
    highlightedMsgId.value = id
    setTimeout(() => {
      highlightedMsgId.value = ''
    }, 1000)
  }
}
onHide(() => {
  // console.log('onHide')
  clearPendingMessageLongPress()
  messagePopoverVisible.value = false
  selectedMessageActionTarget.value = null
  clearPendingRealtimeMessageIndicator()
  flushPendingReadOnLeave()
  chatSocketClient.value?.handlePageHide()
})
onShow(() => {
  hasFlushedReadOnLeave = false
  clearPendingRealtimeMessageIndicator()
  resumeChatAfterForeground()
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (roomId) {
    loadCurrentAnnouncement(roomId)
  }
  // 页面回到前台时，检查并回填可能缺失的消息
  const lastPersistedMessage = getLastPersistedMessage()
  if (lastPersistedMessage) {
    backfillMissingMessagesByRoomSeq(lastPersistedMessage)
  }
})
onUnmounted(() => {
  clearPendingMessageLongPress()
  messagePopoverVisible.value = false
  selectedMessageActionTarget.value = null
  clearPendingRealtimeMessageIndicator()
  flushPendingReadOnLeave()
  chatSocketClient.value?.destroy()
  chatSocketClient.value = null
  pendingRealtimeMessages.clear()
  pendingRealtimeScrollToLatest = false
  uni.$off(GROUP_CHAT_REFRESH_SENDERS_EVENT, handleRefreshMessageSendersEvent)
})
const handleMentionUser = ({ member_id, nickname }: { member_id: number; nickname: string }) => {
  inputBar.value?.addMention(member_id, nickname)
}

/** 单选模式：选中成员后立即添加 @提及 */
const handlePopupSelectMention = (member: ChatMember) => {
  inputBar.value?.addMention(member.member_id, member.nickname)
}

/** 多选模式：批量添加 @提及 */
const handlePopupConfirmMention = (members: ChatMember[]) => {
  members.forEach((member) => {
    inputBar.value?.addMention(member.member_id, member.nickname)
  })
}

// 处理回复引用点击 - 跳转到被回复的消息并高亮
const handleReplyClick = (replyMessageId: number) => {
  scrollIntoViewById(String(replyMessageId))
}

const navigateBack = () => {
  if (isPageLeaving.value) return
  isPageLeaving.value = true
  flushPendingReadOnLeave()
  clearPendingMessageLongPress()

  // 停止 socket 连接
  chatSocketClient.value?.destroy()
  chatSocketClient.value = null
  pendingRealtimeMessages.clear()
  pendingRealtimeScrollToLatest = false
  // 清理其他定时器...
  uni.navigateBack({ delta: 1 })
}
const loadRoomDetail = async () => {
  const loaded = await ensureRoomDetailLoaded()
  if (loaded) {
    subscribeChatRoomChannel()
  }
}
// 记录滚动位置
const scrollTopValue = ref(0)
let lastScrollTop = 0

const loadAfterContextMessages = (afterId: number, limit: number = 50) => {
  uni.showLoading()
  contextLoadingMore.value = true
  getChatMessageListApi({
    room_id: roomDetail.value?.room?.id || routeRoomId.value,
    after_message_id: afterId,
    limit,
  })
    .then((afterRes) => {
      if (afterRes.code === 1 && afterRes.data?.messages?.length > 0) {
        const afterMessages = [...afterRes.data.messages]
        paging.value?.addChatRecordData(afterMessages, false, false)
        setTimeout(() => {
          // scrollIntoViewById(String(afterId) ,25)
          paging.value.scrollIntoViewById('msg-row-' + afterId, 50)
          uni.hideLoading()
        }, 10)
      }
      if (
        afterRes.code === 1 &&
        afterRes.data?.has_more_latest === 1 &&
        afterRes.data?.next_after_message_id
      ) {
        // 保存下一次调用的 after_message_id，等用户再次滚动到底部附近时触发
        contextAfterMessageId.value = afterRes.data.next_after_message_id
      } else {
        contextAfterMessageId.value = null
      }
    })
    .catch((e) => {
      console.error('load after context messages failed', e)
    })
    .finally(() => {
      contextLoadingMore.value = false
    })
}

const handleChatScroll = (e) => {
  const scrollTop = e.detail ? e.detail.scrollTop : e.contentOffset.y
  lastScrollTop = scrollTop
  scrollTopValue.value = e.detail.scrollTop
  // return
  // 上下文模式：scrollTop 小于 50vh 时加载一批 after_message_id 消息

  // 用户滚动到底部时，追加暂存的离屏消息并清除指示器
  if (isNearBottom()) {
    if (contextAfterMessageId.value && !contextLoadingMore.value) {
      const afterId = contextAfterMessageId.value
      loadAfterContextMessages(afterId, 20)
    }
    const hadPendingOffscreen = pendingOffscreenMessages.length > 0
    if (hadPendingOffscreen) {
      applyMessagesBatch(pendingOffscreenMessages, true)
      pendingOffscreenMessages.length = 0
    }
    if (pendingRealtimeMessageCount.value > 0) {
      clearPendingRealtimeMessageIndicator()
    }
    // 滚到底部后执行延迟的回填（防止消息断层）
    if (hadPendingOffscreen) {
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg) {
        backfillMissingMessagesByRoomSeq(lastMsg)
      }
    }
  }
}
// 用于判断是否在底部附近
const BOTTOM_AUTO_SCROLL_THRESHOLD_PX = 100
const isNearBottom = () => {
  return scrollTopValue.value < BOTTOM_AUTO_SCROLL_THRESHOLD_PX
}
//
/**
 * 从新消息数组中过滤掉在当前消息列表中已存在的消息（基于 id）
 * @param currentMessages 当前已有的消息列表
 * @param newMessages 待添加的新消息列表
 * @returns 过滤后不存在于当前列表中的新消息数组
 */
const filterExistingMessages = (
  currentMessages: ChatMessage[],
  newMessages: ChatMessage[],
): ChatMessage[] => {
  const existingIds = new Set(currentMessages.map((msg) => msg.id))
  const existingClientMessageIds = new Set(
    currentMessages.map((msg) => msg.client_message_id).filter(Boolean),
  )
  return newMessages.filter((msg) => {
    if (existingIds.has(msg.id)) return false
    if (msg.client_message_id && existingClientMessageIds.has(msg.client_message_id)) return false
    return true
  })
}
const applyMessagesBatch = (incomingMessages: ChatMessage[], scrollToLatest = false) => {
  const normalizedMessages = incomingMessages
    .filter((message) => !!message?.id)
    .map((message) => ({
      ...message,
      local_status: message.local_status || 'sent',
    }))

  if (normalizedMessages.length === 0) return

  const filtered = filterExistingMessages(messages.value, normalizedMessages)
  if (filtered.length > 0) {
    paging.value?.addChatRecordData(filtered, scrollToLatest, false)
  }

  normalizedMessages.forEach((message) => stageReadMessage(message.id))
}

const getLastPersistedMessage = () => {
  for (let index = messages.value.length - 1; index >= 0; index--) {
    const message = messages.value[index]
    const messageId = Number(message?.id || 0)
    if (Number.isFinite(messageId) && messageId > 0) {
      return message
    }
  }
  return null
}
const getLastPersistedMessageId = () => getLastPersistedMessage()?.id || null

const backfillMissingMessagesByRoomSeq = async (incomingMessage: ChatMessage) => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  const lastMessageId = getLastPersistedMessageId()
  if (!roomId || !lastMessageId || !incomingMessage?.id) return

  let nextAfterMessageId = Number(lastMessageId)
  if (!Number.isFinite(nextAfterMessageId) || nextAfterMessageId <= 0) return
  let shouldContinue = true

  while (shouldContinue && nextAfterMessageId) {
    const res = await getChatMessageListApi({
      room_id: roomId,
      after_message_id: nextAfterMessageId,
      limit: 50,
    })

    if (res.code !== 1 || !res.data) break

    const messageList = res.data.messages || []
    if (messageList.length === 0) break

    const normalizedMessages = messageList.map((message) => ({
      ...message,
      is_self: message.sender?.member_id === userStore.userInfo.member_id ? 1 : 0,
    }))
    applyMessagesBatch(normalizedMessages, false)

    if (messageList.some((message) => Number(message.id) === Number(incomingMessage.id))) {
      break
    }

    if (res.data.has_more_latest !== 1 || !res.data.next_after_message_id) {
      shouldContinue = false
      break
    }

    nextAfterMessageId = res.data.next_after_message_id
  }
}

const dedupeMessages = (messageList: ChatMessage[]) => {
  const dedupedMessages: ChatMessage[] = []
  const idIndexMap = new Map<number, number>()
  const clientMessageIdIndexMap = new Map<string, number>()

  messageList.forEach((message) => {
    const matchedIndexById = typeof message.id === 'number' ? idIndexMap.get(message.id) : undefined
    const matchedIndexByClientMessageId = message.client_message_id
      ? clientMessageIdIndexMap.get(message.client_message_id)
      : undefined
    const matchedIndex = matchedIndexById ?? matchedIndexByClientMessageId

    if (typeof matchedIndex === 'number') {
      const mergedMessage = {
        ...dedupedMessages[matchedIndex],
        ...message,
      }
      dedupedMessages.splice(matchedIndex, 1, mergedMessage)
      idIndexMap.set(mergedMessage.id, matchedIndex)
      if (mergedMessage.client_message_id) {
        clientMessageIdIndexMap.set(mergedMessage.client_message_id, matchedIndex)
      }
      return
    }

    dedupedMessages.push(message)
    const nextIndex = dedupedMessages.length - 1
    idIndexMap.set(message.id, nextIndex)
    if (message.client_message_id) {
      clientMessageIdIndexMap.set(message.client_message_id, nextIndex)
    }
  })

  return dedupedMessages
}
// 按 room_seq 排序消息列表（升序）
const sortMessagesByRoomSeq = (msgs: ChatMessage[]) => {
  return [...msgs].sort((a, b) => {
    const seqA = a.room_seq ?? 0
    const seqB = b.room_seq ?? 0
    return seqA - seqB
  })
}

/*
操作已读相关 start
减少网络请求：如果不暂存，每看到一条消息都发一个已读请求，会产生大量冗余 HTTP 调用。
保证逻辑正确：用户看到第 100 条消息，必然已经看过 1~99 条，所以后端只需知道“用户最后看到的是 100”即可将之前的全部标为已读。
最后发送时机：通常在页面离开时发送，也可以在定时器或滚动到底部时发送，避免频繁请求。
 */
// 暂存当前会话中用户已看到的最新（最大）消息 ID。
const pendingReadMessageId = ref<number | null>(null)

const stageReadMessage = (messageId?: number | null) => {
  const normalizedMessageId = Number(messageId || 0)
  if (!normalizedMessageId) return

  pendingReadMessageId.value = Math.max(pendingReadMessageId.value || 0, normalizedMessageId)
}
/*
操作已读相关 end
 */
/*
==============================================
🚀 WEB SOCKET 核心功能 【开始】
所有群聊实时消息、连接、监听、发送都在这里
==============================================
 */
const GROUP_MEMBERS_REFRESH_EVENT = 'group_members:refresh'
const GROUP_CHAT_REFRESH_SENDERS_EVENT = 'group_chat:refresh_message_senders'
// 存储 WebSocket 客户端实例，用于管理连接和订阅
const chatSocketClient = ref<EchoPrivateChannelClient | null>(null)
// 用于指示在批量刷新实时消息后是否需要自动滚动到最新消息（通常是最底部）。
let pendingRealtimeScrollToLatest = false

/**
 * 订阅当前群聊的私有 WebSocket 频道
 * 频道命名规则：private-chat.room.{roomId}
 */
const handleRefreshMessageSendersEvent = (payload?: { roomId?: number }) => {
  if (
    Number(payload?.roomId || 0) !== Number(roomDetail.value?.room.id || routeRoomId.value || 0)
  ) {
    return
  }
  refreshMessageSendersBeforeCurrentLast()
}
const subscribeChatRoomChannel = () => {
  const roomId = roomDetail.value?.room.id
  if (!roomId) return

  const channelName = getPrivateChannelName(roomId) // 'chat.room.{roomId}'
  // 实际订阅时会自动加上 'private-' 前缀
  initChatSocketClient().subscribe(channelName)
}

// 辅助方法：生成频道名称
const getPrivateChannelName = (roomId: number) => `chat.room.${roomId}`
/**
 * 自动为事件生成带点和不带点的处理器
 */
const createEventHandlers = <T extends Record<string, (...args: any[]) => any>>(
  handlers: T,
): Record<string, (...args: any[]) => any> => {
  const result: Record<string, (...args: any[]) => any> = {}
  Object.entries(handlers).forEach(([event, handler]) => {
    result[event] = handler // 不带点
    result[`.${event}`] = handler // 带点
  })
  return result
}
/**
 * 处理实时推送事件（统一入口）
 * @param eventName 事件名称
 * @param payload   事件负载数据
 */
const handleRealtimeEvent = async (eventName: string, payload: any) => {
  // 如果事件携带 room_id 且与当前房间不匹配，则忽略
  if (payload?.room_id && payload.room_id !== roomDetail.value?.room.id) return
  const message = resolveIncomingMessage(payload) // 尝试解析消息对象
  const normalizedEventName = eventName.startsWith('.') ? eventName.slice(1) : eventName
  const kickedMemberPayload = resolveMemberKickPayload(payload)

  // 如果事件涉及成员变动，触发全局刷新成员列表事件
  if (shouldNotifyGroupMembersRefresh(normalizedEventName, message, payload)) {
    notifyGroupMembersRefresh(payload?.room_id || message?.room_id)
  }

  // 处理消息创建事件（新消息）
  if (normalizedEventName === 'message.created' || normalizedEventName === 'GroupMessageEvent') {
    if (message?.id) {
      const is_self = message.sender?.member_id === userStore.userInfo.member_id
      // 不在此处计数，由 flushRealtimeMessages 统一在「不在底部」时计数，避免重复累加
      enqueueRealtimeMessage({ ...message, is_self }, false)

      // 消息回填：防止消息断层（仅在底部时立即执行，不在底部时延迟到点击箭头或滚到底部）
      if (isNearBottom()) {
        // backfillMissingMessagesByRoomSeq({ ...message, is_self })
      }

      // if (!isSelf) {
      // } else if (message.client_message_id) {
      //   await upsertChatMessage(message, true)
      //   await upsertChatMessage(message, false)
      // }
      return
    }
    return
  }

  // 处理消息状态变更（如撤回、删除）（功能还不上线，先不处理）
  if (
    normalizedEventName === 'message.state_changed' ||
    normalizedEventName === 'message.reaction_changed'
  ) {
    const statePayload =
      normalizedEventName === 'message.state_changed' ? resolveMessageStatePayload(payload) : null

    if (message?.id) {
      enqueueRealtimeMessage(
        normalizedEventName === 'message.state_changed'
          ? normalizeStateChangedMessage(message, statePayload)
          : message,
        false,
      )
      return
    }

    if (normalizedEventName === 'message.state_changed') {
      if (statePayload && applyMessageDisplayStatus(statePayload)) {
        return
      }
    }
    return
  }

  // 处理成员踢出 / 状态变更
  if (
    normalizedEventName === 'member.kicked' ||
    normalizedEventName === 'member.removed' ||
    normalizedEventName === 'member.status_changed'
  ) {
    if (kickedMemberPayload) {
      const kickedId = kickedMemberPayload.member_id
      // 自己被踢出群聊
      if (kickedId && kickedId === userStore.userInfo?.member_id) {
        handleSelfKicked()
        return
      }
      applyMemberKickedState(kickedId)
    }
    return
  }

  // 处理禁言 / 解除禁言 / 角色变更
  if (normalizedEventName === 'member.state_changed') {
    const memberId = Number(payload?.member_id || payload?.data?.member_id || 0)
    const action = payload?.action || payload?.data?.action
    const isSelf = memberId === userStore.userInfo?.member_id
    if (memberId && (action === 'muted' || action === 'unmuted')) {
      const reason = payload?.data?.reason || payload?.reason || ''
      applyMemberMuteState(memberId, action, reason)
    } else if (memberId && action === 'kicked') {
      if (isSelf) {
        handleSelfKicked()
        return
      }
      applyMemberKickedState(memberId)
    } else if (memberId && action === 'role_changed') {
      const newRole = payload?.role || payload?.data?.role || ''
      applyMemberRoleChanged(memberId, newRole)
    }
    return
  }

  // 兜底：若有消息则入队
  if (message?.id) {
    enqueueRealtimeMessage(message, false)
  }
}

const resolveDeletedMessageText = (
  displayStatus?: string,
  payloadText?: string,
  placeholderText?: string,
) => {
  if (displayStatus !== 'deleted') return ''
  return payloadText || placeholderText || ''
}
const applyMessageDisplayStatus = (payload: MessageStatePayload) => {
  if (!payload.message_id || !payload.display_status) return false

  const targetIndex = messages.value.findIndex((msg) => msg.id === payload.message_id)
  if (targetIndex < 0) return false

  const currentMessage = messages.value[targetIndex]
  const deletedText = resolveDeletedMessageText(
    payload.display_status,
    payload.payload?.text,
    payload.placeholder?.text,
  )
  const nextMessage: ChatMessage = {
    ...currentMessage,
    display_status: payload.display_status,
    placeholder: deletedText ? { text: deletedText } : payload.placeholder,
    ...(deletedText
      ? {
          message_type: 'text' as const,
          payload: {
            text: deletedText,
          },
        }
      : {}),
  }

  console.log(nextMessage)
  messages.value.splice(targetIndex, 1, nextMessage)
  // paging.value.refresh()
  return true
}
/**
 * 从 WebSocket 推送的原始负载中解析“成员被踢出/移除”的事件数据
 **/
const resolveMemberKickPayload = (payload: any) => {
  const candidateList = [
    payload?.member,
    payload?.data?.member,
    payload?.member_state,
    payload?.data?.member_state,
    payload?.data,
    payload,
  ]

  for (const candidate of candidateList) {
    const memberId = Number(candidate?.member_id || 0)
    const memberStatus = Number(candidate?.member_status ?? candidate?.status ?? 0)
    if (memberId > 0 && memberStatus === 3) {
      return {
        member_id: memberId,
        member_status: 3,
        room_id: Number(candidate?.room_id || payload?.room_id || payload?.data?.room_id || 0),
      }
    }
  }

  return null
}
// 判断是否需要更新群成员列表
const shouldNotifyGroupMembersRefresh = (
  normalizedEventName: string,
  message?: ChatMessage | null,
  payload?: any,
) => {
  if (
    normalizedEventName === 'member.kicked' ||
    normalizedEventName === 'member.removed' ||
    normalizedEventName === 'member.status_changed' ||
    normalizedEventName === 'member.state_changed'
  ) {
    return true
  }

  if (normalizedEventName !== 'message.created' && normalizedEventName !== 'GroupMessageEvent') {
    return false
  }

  if (message?.message_type !== 'system') return false

  return Boolean(
    payload?.message?.payload?.params?.member_id ||
      payload?.data?.message?.payload?.params?.member_id ||
      payload?.payload?.params?.member_id ||
      message?.payload?.params?.member_id,
  )
}
// 辅助：从负载中解析消息对象（对象格式可能不固定）
const resolveIncomingMessage = (payload: any): ChatMessage | null => {
  const candidateList = [payload?.message, payload?.data?.message, payload]
  for (const candidate of candidateList) {
    if (candidate?.id) return candidate as ChatMessage
  }
  return null
}

// 辅助：解析消息状态负载
const resolveMessageStatePayload = (payload: any): MessageStatePayload | null => {
  const candidateList = [
    payload?.message_state,
    payload?.data?.message_state,
    payload?.data,
    payload,
  ]
  for (const candidate of candidateList) {
    if (candidate?.message_id && candidate?.display_status) {
      return candidate as MessageStatePayload
    }
  }
  return null
}
// 暂存待处理的实时消息（Map 用于去重）
const pendingRealtimeMessages = new Map<string, ChatMessage>()
// 不在底部时暂存他人消息，等点击箭头或滚到底部再追加到列表
const pendingOffscreenMessages: ChatMessage[] = []
// 定时器（realtimeFlushTimer），将多条消息合并为一次批量更新，避免高频渲染。
let realtimeFlushTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 将实时消息加入队列，并安排批量刷新
 */
const enqueueRealtimeMessage = (incomingMessage: ChatMessage, scrollToLatest = false) => {
  if (!incomingMessage?.id) return

  const queueKey = incomingMessage.client_message_id || String(incomingMessage.id)
  const previousMessage = pendingRealtimeMessages.get(queueKey)
  pendingRealtimeMessages.set(queueKey, {
    ...previousMessage,
    ...incomingMessage,
    local_status: 'sent',
  })

  if (scrollToLatest) {
    pendingRealtimeScrollToLatest = true
  }

  // 延迟 120ms 后批量刷新，避免高频渲染
  if (realtimeFlushTimer || isPageLeaving.value) return
  realtimeFlushTimer = setTimeout(flushRealtimeMessages, 120)
}

/**
 * 批量将队列中的消息合并到 messages 数组并更新界面
 * - 自己发的消息始终立即追加
 * - 他人消息：在底部则立即追加，不在底部则暂存到 pendingOffscreenMessages
 */
const flushRealtimeMessages = () => {
  realtimeFlushTimer = null
  if (pendingRealtimeMessages.size === 0) {
    pendingRealtimeScrollToLatest = false
    return
  }

  const queuedMessages = Array.from(pendingRealtimeMessages.values())
  pendingRealtimeMessages.clear()
  const shouldScrollToLatest = pendingRealtimeScrollToLatest
  pendingRealtimeScrollToLatest = false

  // 自己发的消息：先尝试更新本地待确认消息，避免重复追加
  const selfMessages = queuedMessages.filter((msg) => msg.is_self)
  if (selfMessages.length > 0) {
    const unmatchedSelfMessages: ChatMessage[] = []
    for (const msg of selfMessages) {
      let matched = false
      // 1. 优先通过 client_message_id 匹配并更新本地待确认消息
      if (msg.client_message_id) {
        matched = updateChatMessageByClientMessageId(msg.client_message_id, {
          ...msg,
          local_status: 'sent',
        })
      }
      // 2. WS 广播可能不含 client_message_id，查找本地 sending 状态的消息进行更新
      if (!matched) {
        const localPendingIndex = messages.value.findIndex(
          (m) => m.is_self === 1 && m.local_status === 'sending',
        )
        if (localPendingIndex >= 0) {
          messages.value.splice(localPendingIndex, 1, {
            ...messages.value[localPendingIndex],
            ...msg,
            local_status: 'sent',
          })
          matched = true
        }
      }
      // 3. 若 API 响应已先于 WS 更新了本地消息（id 已替换为服务端 id），直接跳过
      if (!matched && messages.value.some((m) => m.id === msg.id)) {
        matched = true
      }
      if (!matched) {
        unmatchedSelfMessages.push(msg)
      }
    }
    if (unmatchedSelfMessages.length > 0) {
      if (isNearBottom()) {
        applyMessagesBatch(unmatchedSelfMessages, shouldScrollToLatest)
      } else {
        const filtered = filterExistingMessages(messages.value, unmatchedSelfMessages)
        if (filtered.length > 0) {
          pendingOffscreenMessages.push(...filtered)
        }
      }
    }
  }

  // 他人消息：在底部则立即追加，不在底部则暂存并更新未读计数
  const otherMessages = queuedMessages.filter((msg) => !msg.is_self)
  if (otherMessages.length > 0) {
    if (isNearBottom()) {
      applyMessagesBatch(otherMessages, shouldScrollToLatest)
    } else {
      pendingOffscreenMessages.push(...otherMessages)
      // 更新未读计数（这里才是真正暂存时才计数）
      pendingRealtimeMessageCount.value += otherMessages.length
    }
  }
}
/**
 * 初始化 WebSocket 连接客户端
 * 配置包括：服务端地址、认证端点、令牌获取函数、事件处理器等
 */
const initChatSocketClient = () => {
  if (chatSocketClient.value) return chatSocketClient.value
  chatSocketClient.value = new EchoPrivateChannelClient({
    key: import.meta.env.VITE_WS_APP_KEY || 'libertycats-key',
    wsHost: import.meta.env.VITE_WS_HOST || 'app.libertycats.app',
    authEndpoint: import.meta.env.VITE_SERVER_BASEURL.replace('/api', '') + '/broadcasting/auth',
    getToken: () => userStore.userInfo.token || uni.getStorageSync('token'),
    debug: false,
    eventHandlers: {
      GroupMessageEvent: handleIncomingMessage,
      '.GroupMessageEvent': handleIncomingMessage,
      'message.created': (payload) => handleRealtimeEvent('message.created', payload),
      '.message.created': (payload) => handleRealtimeEvent('.message.created', payload),
      'message.state_changed': (payload) => handleRealtimeEvent('message.state_changed', payload),
      '.message.state_changed': (payload) => handleRealtimeEvent('.message.state_changed', payload),
      'message.reaction_changed': (payload) =>
        handleRealtimeEvent('message.reaction_changed', payload),
      '.message.reaction_changed': (payload) =>
        handleRealtimeEvent('.message.reaction_changed', payload),
      'member.kicked': (payload) => handleRealtimeEvent('member.kicked', payload),
      '.member.kicked': (payload) => handleRealtimeEvent('.member.kicked', payload),
      'member.removed': (payload) => handleRealtimeEvent('member.removed', payload),
      '.member.removed': (payload) => handleRealtimeEvent('.member.removed', payload),
      'member.status_changed': (payload) => handleRealtimeEvent('member.status_changed', payload),
      '.member.status_changed': (payload) => handleRealtimeEvent('.member.status_changed', payload),
      'member.state_changed': (payload) => handleRealtimeEvent('member.state_changed', payload),
      '.member.state_changed': (payload) => handleRealtimeEvent('.member.state_changed', payload),
    },
    onMessage: handleIncomingMessage,
    onConnectionError: (error) => {
      console.error('[GroupChat] Echo connection error:', error)
    },
    onPrivateChannelError: (error) => {
      console.error('[GroupChat] private channel error:', error)
    },
    onAllEvent: (eventName, data) => {
      const normalizedEventName = eventName.startsWith('.') ? eventName.slice(1) : eventName
      const shouldHandleMemberEvent =
        normalizedEventName.endsWith('member.kicked') ||
        normalizedEventName.endsWith('member.removed') ||
        normalizedEventName.endsWith('member.status_changed')

      const isDirectRegisteredMemberEvent =
        normalizedEventName === 'member.kicked' ||
        normalizedEventName === 'member.removed' ||
        normalizedEventName === 'member.status_changed'

      if (shouldHandleMemberEvent && !isDirectRegisteredMemberEvent) {
        handleRealtimeEvent(eventName, data)
      }
    },
  })

  return chatSocketClient.value
}
const handleIncomingMessage = async (payload: any) => {
  await handleRealtimeEvent('GroupMessageEvent', payload)
}
/**
 * 断开 WebSocket 连接
 *  manual 是否手动断开（true: 主动断开, false: 其他情况）
 */
const closeChatSocket = (manual = true) => {
  chatSocketClient.value?.disconnect(manual)
}

/**
 * 自己被踢出群聊时的处理：弹窗提示 → 断开 WebSocket → 返回上一页
 */
const handleSelfKicked = () => {
  uni.showModal({
    title: '',
    content: t('group.chat.selfKicked'),
    showCancel: false,
    success: () => {
      closeChatSocket()
      uni.navigateBack({ delta: 1 })
    },
  })
}
// 辅助函数：通知成员列表刷新
const notifyGroupMembersRefresh = (roomId?: number) => {
  const normalizedRoomId = Number(roomId || roomDetail.value?.room.id || routeRoomId.value || 0)
  if (!normalizedRoomId) return
  uni.$emit(GROUP_MEMBERS_REFRESH_EVENT, { roomId: normalizedRoomId })
}
// 页面从后台恢复至前台时，恢复 WebSocket 连接与群聊频道订阅
const resumeChatAfterForeground = async () => {
  if (!userStore.isLogin) return
  if (roomDetailLoading.value) return

  if (!roomDetail.value?.room.id) {
    await ensureRoomDetailLoaded()
    return
  }

  await initChatSocketClient().handlePageShow()
  subscribeChatRoomChannel()
}
/*
🚀 🚀 🚀 🚀 🚀 🚀 🚀 🚀 WEB SOCKET 核心功能 【结束】
 */

//  向下的箭头 ⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️ start
const pendingRealtimeMessageCount = ref(0)

const showNewMessageIndicator = computed(
  () => pendingRealtimeMessageCount.value > 0 && !isNearBottom(),
)

const clearPendingRealtimeMessageIndicator = () => {
  pendingRealtimeMessageCount.value = 0
}

const bumpPendingRealtimeMessageIndicator = () => {
  pendingRealtimeMessageCount.value += 1
}

const getNewMessageIndicatorText = () => {
  const count = pendingRealtimeMessageCount.value > 99 ? '99+' : pendingRealtimeMessageCount.value
  return count + '' + t('group.chat.newMessages')
}
const handleJumpToLatestMessage = () => {
  // 从历史记录跳转过来的：直接清空，重新加载最新 50 条
  if (isFromHistory.value) {
    isFromHistory.value = false
    contextAfterMessageId.value = null
    contextLoadArmed.value = false
    paging.value?.reload()
    return
  }
  // 先追加暂存的离屏消息
  if (pendingOffscreenMessages.length > 0) {
    applyMessagesBatch(pendingOffscreenMessages, true)
    pendingOffscreenMessages.length = 0
  }
  clearPendingRealtimeMessageIndicator()
  scrollToBottom()
  // 到达底部后执行延迟的回填（防止消息断层）
  const lastMsg = messages.value[messages.value.length - 1]
  if (lastMsg) {
    backfillMissingMessagesByRoomSeq(lastMsg)
  }
}

// 加载未读通知
const loadUnreadNotifications = async (roomId: number) => {
  if (isFromContext.value) return // 从聊天记录跳转过来的不展示重要消息按钮
  try {
    const res = await getUnreadNotificationsApi(roomId)
    if (res.code === 1 && res.data) {
      const { important_unread_count, important_unread_messages } = res.data
      if (important_unread_count > 0 && important_unread_messages?.length > 0) {
        showFloatBtn.value = true
        importantUnreadMessages.value = important_unread_messages
        currentUnreadIndex.value = 0

        // 等待消息列表渲染完成后，检查并移除已在视窗中显示的消息
        await nextTick()
        setTimeout(() => {
          filterVisibleUnreadMessages()
        }, 300)
      } else {
        showFloatBtn.value = false
      }
    }
  } catch (e) {
    // 忽略错误
  }
}

// 检查消息是否在视窗中可见
const isMessageVisibleInViewport = (messageId: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const query = uni.createSelectorQuery()

    query
      .select(`#msg-row-${messageId}`)
      .boundingClientRect((rect) => {
        if (rect) {
          const windowHeight = uni.getSystemInfoSync().windowHeight
          // 判断消息是否在视窗内（考虑一定的边距）
          const isVisible = rect.top >= 0 && rect.bottom <= windowHeight
          resolve(isVisible)
        } else {
          resolve(false)
        }
      })
      .exec()
  })
}

// 过滤掉已在视窗中显示的消息
const filterVisibleUnreadMessages = async () => {
  const visibleMessages: Array<{ message_id: number }> = []
  const visibleMessageIds: number[] = []

  for (const msg of importantUnreadMessages.value) {
    const isVisible = await isMessageVisibleInViewport(msg.message_id)
    if (isVisible) {
      visibleMessageIds.push(msg.message_id)
    } else {
      visibleMessages.push(msg)
    }
  }

  // 高亮已在视窗中显示的消息
  if (visibleMessageIds.length > 0) {
    highlightMessages(visibleMessageIds)
  }

  importantUnreadMessages.value = visibleMessages

  // 如果所有消息都已在视窗中显示，隐藏按钮
  if (visibleMessages.length === 0) {
    showFloatBtn.value = false
  }
}

// 高亮消息
const highlightMessages = (messageIds: number[]) => {
  messageIds.forEach((msgId, index) => {
    setTimeout(() => {
      highlightedMsgId.value = String(msgId)
      setTimeout(() => {
        highlightedMsgId.value = ''
      }, 2000)
    }, index * 2200)
  })
}

// 悬浮按钮点击 - 依次跳转到未读重要消息，每跳转一条计数减 1
const handleFloatAction = () => {
  const msgs = importantUnreadMessages.value
  if (msgs.length === 0) return
  // 取第一条未读消息，跳转后从数组中移除
  const msg = msgs[0]
  scrollIntoViewById(String(msg.message_id))
  importantUnreadMessages.value = msgs.slice(1)

  // 所有未读消息都已跳转完，隐藏按钮
  if (importantUnreadMessages.value.length === 0) {
    showFloatBtn.value = false
    currentUnreadIndex.value = 0
  }
}
//  向下的箭头 ⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️ end
const messageCache = new Map()
const lastestMessageId = ref('')
const hasMoreHistory = ref(true)
// @query所绑定的方法不要自己调用！！需要刷新列表数据时，只需要调用paging.value.reload()即可
const queryList = async (pageNo, pageSize) => {
  if (pageNo === 1) {
    if (isFromContext.value) {
      isFromContext.value = false
      const targetId = pendingScrollToMessageId.value
      pendingScrollToMessageId.value = ''
      try {
        const res = await getChatMessageContextApi(routeRoomId.value, Number(targetId))
        if (res.code === 1 && res.data?.messages?.length > 0) {
          const messages = [...res.data.messages].reverse()
          hasMoreHistory.value = res.data.has_more_history === 1
          if (res.data.next_before_message_id) {
            lastestMessageId.value = String(res.data.next_before_message_id)
          }
          paging.value?.complete(messages)
          messages.forEach((message) => stageReadMessage(message.id))
          await nextTick()
          setTimeout(async () => {
            await scrollIntoViewById(targetId)
            // 等 scrollIntoViewById 的滚动动画完全停止后，再设置 after_message_id
            // 这样只有用户后续手动滚动才会触发 loadAfterContextMessages
            setTimeout(() => {
              contextAfterMessageId.value = Number(messages[0]?.id)
            }, 800)
          }, 500)
        }
      } catch (e) {
        console.error('getChatMessageContextApi failed', e)
      }
      return
    }
    // 先取消 pending 的 WebSocket 刷新定时器，清空队列
    // reload 期间的 WebSocket 消息不手动追加，直接由 getChatMessageList 接口返回
    if (realtimeFlushTimer) {
      clearTimeout(realtimeFlushTimer)
      realtimeFlushTimer = null
    }
    pendingRealtimeMessages.clear()
    pendingOffscreenMessages.length = 0
    await getChatMessageList()
    const wasFromHistory = isFromHistory.value
    isFromHistory.value = false
    // reload 后重置滚动位置，确保 isNearBottom 返回 true
    scrollTopValue.value = 0
    // 如果有待发送的消息，先执行发送（先滚动到底部）
    if (pendingSendAfterReload) {
      const info = pendingSendAfterReload
      pendingSendAfterReload = null
      paging.value?.addChatRecordData(
        createLocalPendingMessage(
          info.clientMessageId,
          info.messageType,
          info.payload,
          info.reply_to,
        ),
        true,
        false,
      )
      sendChatMessageWithClientMessageId(
        roomDetail.value.room.id,
        info.messageType,
        info.clientMessageId,
        info.payload,
        info.mentioned_member_ids,
        info.reply_to,
      ).catch((error: any) => {
        markLocalMessageFailed(info.clientMessageId)
        console.error('sendChatMessageWithClientMessageId error:', error)
        toast.show(error?.errMsg || error?.message || t('group.chat.sendFailed'))
      })
    }
    setTimeout(() => {
      if (hasMoreHistory.value && !wasFromHistory) {
        getChatMessageList(lastestMessageId.value, true)
      }
    }, 5000)
  } else {
    let earliestId
    if (messages.value && messages.value.length > 0) {
      earliestId = Math.min(...messages.value.map((m) => m.id))
    } else {
      earliestId = undefined // 无消息，请求最新
    }
    if (earliestId && messageCache.has(earliestId)) {
      const cachedMessages = messageCache.get(earliestId)
      const filtered = filterExistingMessages(messages.value, cachedMessages.messages)
      paging.value?.complete(filtered)
      messageCache.delete(earliestId)
      // 继续后台预取下一页（用更新后列表的最早id）
      setTimeout(() => {
        const newEarliestId = messages.value.length
          ? Math.min(...messages.value.map((m) => m.id))
          : undefined
        if (newEarliestId) getChatMessageList(newEarliestId, true)
      }, 200)
    } else if (hasMoreHistory.value) {
      // 兜底：缓存未命中且有更多历史数据时，直接请求 API 加载
      await getChatMessageList(earliestId)
    } else {
      // 没有更多历史数据了，告知 z-paging 加载完毕
      paging.value?.complete([])
    }
  }
}
const getChatMessageList = async (beforeMessageId: string | number = null, silent = false) => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  const params = { room_id: roomId, limit: silent ? 100 : 50 }
  if (beforeMessageId) params.before_message_id = beforeMessageId
  const res = await getChatMessageListApi(params)
  if (res.code !== 1 || !res.data) return

  const messageList = res.data.messages || []
  // 没有历史数据了，不再做后续处理
  if (messageList.length === 0) {
    if (!silent) {
      paging.value?.complete([])
    }
    hasMoreHistory.value = false
    return
  }

  const newMessages = reverseMessageArray(messageList)
  const newLastestId = messageList[0].id
  if (!silent) {
    lastestMessageId.value = newLastestId
    const filtered = filterExistingMessages(messages.value, newMessages)
    paging.value?.complete(filtered)
    filtered.forEach((message) => stageReadMessage(message.id))
  } else {
    messageCache.set(beforeMessageId, {
      messages: newMessages,
      newLastestId: lastestMessageId.value,
    })
    lastestMessageId.value = newLastestId
  }

  // 接口返回 has_more_history === 0 表示没有更多历史数据
  if (res.data.has_more_history === 0) {
    hasMoreHistory.value = false
  }
}
const reverseMessageArray = (arr) => {
  // 先浅拷贝一份，再翻转，避免修改原数组
  return [...arr].reverse()
}

// 监听键盘高度改变，请不要直接通过uni.onKeyboardHeightChange监听，否则可能导致z-paging内置的键盘高度改变监听失效（如果不需要切换表情面板则不用写）
const keyboardHeightChange = (res) => {
  inputBar.value.updateKeyboardHeightChange(res)
}

// 用户尝试隐藏键盘，此时如果表情面板在展示中，应当通知chatInputBar隐藏表情面板（如果不需要切换表情面板则不用写）
const hidedKeyboard = () => {
  // inputBar.value.hidedKeyboard()
}

const scrollToBottom = () => {
  paging.value.scrollToBottom()
}

// 发送新消息
const createLocalPendingMessage = (
  clientMessageId: string,
  messageType: ChatMessageType,
  payload: ChatMessagePayload,
  reply_to?: ChatMessageReplyTo,
) => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  const memberId = Number(userStore.userInfo.member_id || 0)
  const now = Math.floor(Date.now() / 1000)

  return {
    id: Date.now(),
    room_seq: messages.value[messages.value.length - 1]?.room_seq || 0 + 1,
    room_id: roomId,
    member_id: memberId,
    message_type: messageType,
    payload,
    status: 1,
    display_status: 'normal',
    placeholder: undefined,
    reaction_summary: [],
    my_reactions: [],
    create_time: now,
    sender: {
      member_id: memberId,
      nickname: userStore.userInfo.nickname || t('common.me'),
      avatar: userStore.userInfo.avatar || '',
      role: roomDetail.value?.speaking.role || 'member',
    },
    is_self: 1 as const,
    client_message_id: clientMessageId,
    local_id: clientMessageId,
    local_status: 'sending' as const,
    reply_to,
  } satisfies ChatMessage
}
const sendChatMessageWithClientMessageId = async (
  roomId: number,
  messageType: ChatMessageType,
  clientMessageId: string,
  payload: ChatMessagePayload,
  mentioned_member_ids?: number[],
  reply_to?: ChatMessageReplyTo,
) => {
  const res = await sendChatMessageApi(
    roomId,
    messageType,
    clientMessageId,
    payload,
    mentioned_member_ids,
    reply_to?.message_id,
  )
  if (res.code === 1) {
    const nextMessage = {
      ...res.data.message,
      client_message_id: res.data.message.client_message_id || clientMessageId,
      local_status: 'sent' as const,
    }

    const updated = updateChatMessageByClientMessageId(clientMessageId, nextMessage)
    if (updated) {
      // 兜底去重：WS 可能在 API 返回前已追加了同 id 的消息，移除重复项
      const serverId = nextMessage.id
      if (serverId) {
        let firstFound = false
        const dedupedIndices: number[] = []
        messages.value.forEach((msg, idx) => {
          if (msg.id === serverId) {
            if (!firstFound) {
              firstFound = true
            } else {
              dedupedIndices.push(idx)
            }
          }
        })
        if (dedupedIndices.length > 0) {
          for (let i = dedupedIndices.length - 1; i >= 0; i--) {
            messages.value.splice(dedupedIndices[i], 1)
          }
        }
      }
    }
    return true
  }

  markLocalMessageFailed(clientMessageId)
  toast.show(res.msg || t('group.chat.sendFailed'))
  return false
}
/*
重新发送消息start 🔄🔄🔄🔄🔄🔄🔄🔄
*/
// 本地消息发送失败处理
const markLocalMessageFailed = (clientMessageId: string | undefined) => {
  if (!clientMessageId) return
  updateChatMessageByClientMessageId(clientMessageId, {
    local_status: 'failed',
  })
}
// 重新发送消息
const retryFailedMessage = async (msg: ChatMessage) => {
  if (msg.local_status !== 'failed') return
  // if (!validateBeforeSend()) return
  if (!msg.client_message_id || !roomDetail.value?.room.id) return

  markLocalMessageSending(msg.client_message_id)

  try {
    const sent = await sendChatMessageWithClientMessageId(
      roomDetail.value.room.id,
      msg.message_type,
      msg.client_message_id,
      msg.payload,
    )
    if (!sent) return
  } catch (error: any) {
    markLocalMessageFailed(msg.client_message_id)
    // console.error('retryFailedMessage error:', error)
    toast.show(error?.message || t('group.chat.sendFailed'))
  }
}
const markLocalMessageSending = (clientMessageId: string | undefined) => {
  if (!clientMessageId) return
  updateChatMessageByClientMessageId(clientMessageId, {
    local_status: 'sending',
  })
}
/*
重新发送消息end 🔄🔄🔄🔄🔄🔄🔄🔄
*/
/*
根据客户端临时 ID 更新本地消息对象
1、消息发送成功，用服务端数据替换临时消息
2、消息发送失败，标记状态为失败
3、撤回消息后同步状态
 */
const updateChatMessageByClientMessageId = (
  clientMessageId: string | undefined,
  message: Partial<ChatMessage>,
) => {
  if (!clientMessageId) return false

  const index = messages.value.findIndex((msg) => msg.client_message_id === clientMessageId)
  if (index < 0) return false

  messages.value.splice(index, 1, {
    ...messages.value[index],
    ...message,
  })
  return true
}
const doSend = (messageType, payload, mentioned_member_ids?, reply_to?: ChatMessageReplyTo) => {
  const clientMessageId = createClientMessageId()

  // 先追加暂存的离屏消息（确保时序正确：他人消息在自己消息之前）
  if (pendingOffscreenMessages.length > 0) {
    applyMessagesBatch(pendingOffscreenMessages, false)
    pendingOffscreenMessages.length = 0
  }
  clearPendingRealtimeMessageIndicator()
  // 发送消息后不再触发 after_message_id 滚动加载
  contextAfterMessageId.value = null
  contextLoadArmed.value = false

  // 从历史记录跳转过来的：先 reload 加载最新数据，queryList 完成后再发送
  if (isFromHistory.value) {
    pendingSendAfterReload = {
      messageType,
      payload,
      mentioned_member_ids,
      reply_to,
      clientMessageId,
    }
    paging.value?.reload()
    return
  }

  // 乐观追加本地消息，立即展示并滚动到底部
  paging.value?.addChatRecordData(
    createLocalPendingMessage(clientMessageId, messageType, payload, reply_to),
    true,
    false,
  )

  sendChatMessageWithClientMessageId(
    roomDetail.value.room.id,
    messageType,
    clientMessageId,
    payload,
    mentioned_member_ids,
    reply_to,
  ).catch((error: any) => {
    markLocalMessageFailed(clientMessageId)
    console.error('sendChatMessageWithClientMessageId error:', error)
    toast.show(error?.errMsg || error?.message || t('group.chat.sendFailed'))
  })
}
/* 公告start 📣📣📣📣📣📣📣📣📣📣📣 */
const currentAnnouncement = ref<AnnouncementSummary | null>(null)
const currentAnnouncementText = computed(() => {
  const announcement = currentAnnouncement.value
  if (!announcement) return ''
  return announcement.summary || announcement.title || ''
})
const loadCurrentAnnouncement = async (roomId: number) => {
  if (!roomId) {
    currentAnnouncement.value = null
    return
  }
  try {
    const res = await getCurrentGroupAnnouncementApi(roomId)
    if (res.code === 1) {
      currentAnnouncement.value = res.data?.announcement ?? null
    }
  } catch (error) {
    console.error('loadCurrentAnnouncement error:', error)
    currentAnnouncement.value = null
  }
}
const goToCurrentAnnouncementDetail = async () => {
  const announcement = currentAnnouncement.value
  if (!announcement?.id) return
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return
  chatSocketClient.value?.setKeepAliveOnHide(true)
  toUrl(
    `/pages/cats/social/group_announcement_detail?room_id=${roomId}&id=${announcement.id}&currentUserRole=${roomDetail.value?.speaking.role}`,
    true,
    false,
  )
}
const goToAnnouncementList = async () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return
  // await ensureRoomMemberMapLoaded(true)
  chatSocketClient.value?.setKeepAliveOnHide(true)
  toUrl(
    `/pages/cats/social/group_announcement_list?room_id=${roomId}&currentUserRole=${roomDetail.value?.speaking.role}`,
    true,
    false,
  )
}
const debouncedGoToAnnouncementList = debounce(goToAnnouncementList, 1000, {
  leading: true,
  trailing: false,
})
/* 公告end 📣📣📣📣📣📣📣📣📣📣📣 */
const ensureRoomDetailLoaded = async () => {
  if (roomDetail.value?.room.id) return true
  if (roomDetailPreloadPromise) return roomDetailPreloadPromise

  roomDetailPreloadPromise = (async () => {
    try {
      const res = await getChatRoomDetailApi(roomCode.value)
      if (res.code !== 1) {
        toast.show(res.msg || t('common.loadFailed'))
        return false
      }

      roomDetail.value = res.data
      routeRoomId.value = res.data.room.id
      await loadCurrentAnnouncement(res.data.room.id)
      await loadUnreadNotifications(res.data.room.id)
      return true
    } catch (error) {
      // console.error('loadRoomDetail error:', error)
      toast.show(t('common.loadFailed'))
      return false
    } finally {
      roomDetailPreloadPromise = null
    }
  })()

  return roomDetailPreloadPromise
}
/*
幂等 🆔🆔🆔🆔🆔🆔🆔🆔🆔START
 */
const CLIENT_MESSAGE_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
const CLIENT_DEVICE_ID_STORAGE_KEY = 'group_chat_client_device_id'
const formatUuidFromBytes = (bytes: number[]) =>
  [bytes.slice(0, 4), bytes.slice(4, 6), bytes.slice(6, 8), bytes.slice(8, 10), bytes.slice(10, 16)]
    .map((segment) => segment.map((byte) => byte.toString(16).padStart(2, '0')).join(''))
    .join('-')

const createUuidV5 = (name: string, namespace: string) => {
  const namespaceHex = namespace.replace(/-/g, '')
  const namespaceBytes = CryptoJS.enc.Hex.parse(namespaceHex)
  const nameBytes = CryptoJS.enc.Utf8.parse(name)
  const hash = CryptoJS.SHA1(namespaceBytes.clone().concat(nameBytes)).toString(CryptoJS.enc.Hex)
  const bytes = Array.from({ length: 16 }, (_, index) =>
    Number.parseInt(hash.slice(index * 2, index * 2 + 2), 16),
  )

  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  return formatUuidFromBytes(bytes)
}

/**
 * 获取客户端设备ID
 *
 * 优先级：系统信息中的deviceId > 缓存中的deviceId > 基于设备信息生成新的UUID v5
 *
 * @returns {string} 设备唯一标识符
 */
const getClientDeviceId = () => {
  const systemInfo = uni.getSystemInfoSync()
  const rawDeviceId = typeof systemInfo.deviceId === 'string' ? systemInfo.deviceId.trim() : ''

  if (rawDeviceId) return rawDeviceId

  const cachedDeviceId = uni.getStorageSync(CLIENT_DEVICE_ID_STORAGE_KEY)
  if (typeof cachedDeviceId === 'string' && cachedDeviceId) return cachedDeviceId

  const installSeed = [
    systemInfo.brand || 'unknown_brand',
    systemInfo.model || 'unknown_model',
    systemInfo.platform || 'unknown_platform',
    Date.now(),
    Math.random().toString(36).slice(2),
  ].join(':')
  const generatedDeviceId = createUuidV5(installSeed, CLIENT_MESSAGE_NAMESPACE)

  uni.setStorageSync(CLIENT_DEVICE_ID_STORAGE_KEY, generatedDeviceId)
  return generatedDeviceId
}

const createClientLocalMessageId = () => {
  const clientMessageSequence = messages.value[messages.value.length - 1]?.id || 0
  // console.log('clientMessageSequence', clientMessageSequence)

  return `${Date.now().toString(36)}-${clientMessageSequence.toString(36)}`
}

const createClientMessageId = () => {
  const deviceId = getClientDeviceId()
  const userId = String(userStore.userInfo.member_id || 'anonymous_user')
  const roomId = String(roomDetail.value?.room.id || routeRoomId.value || 'unknown_room')
  const clientLocalMessageId = createClientLocalMessageId()
  const uuidName = [deviceId, userId, roomId, clientLocalMessageId].join(':')
  return createUuidV5(uuidName, CLIENT_MESSAGE_NAMESPACE)
}
/*
幂等 🆔🆔🆔🆔🆔🆔🆔🆔🆔END
 */

/* 长按START 👆👆👆👆👆👆👆 */
// 弹窗相关的响应式变量
const showUnmuteReasonPopup = ref(false)
const unmuteReason = ref('')

const showDeleteReasonPopup = ref(false)
const deleteReason = ref('')

const showKickReasonPopup = ref(false)
const kickReason = ref('')
const MESSAGE_LONG_PRESS_DURATION_MS = 450 // 长按触发时间（毫秒）
const MESSAGE_LONG_PRESS_MOVE_THRESHOLD_PX = 12 // 移动阈值（像素），超过则取消长按
const selectedMessageActionTarget = ref<ChatMessage | null>(null) // 被长按的消息对象
const messagePopoverVisible = ref(false) // 操作菜单显示状态
const messagePopoverAnchorX = ref(0)
const messagePopoverAnchorY = ref(0)
const messagePopoverPlacement = ref<'top' | 'bottom'>('top')

const messagePopoverBubbleStyle = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  const screenW = sysInfo.screenWidth
  const screenH = sysInfo.screenHeight
  const x = messagePopoverAnchorX.value
  const y = messagePopoverAnchorY.value
  const isSelf = selectedMessageActionTarget.value?.is_self === 1

  if (isSelf) {
    // 自己的消息：用 right 定位
    const right = screenW / 10
    if (messagePopoverPlacement.value === 'top') {
      return { position: 'fixed', right: `${right}px`, bottom: `${screenH - y + 16}px` }
    }
    return { position: 'fixed', right: `${right}px`, top: `${y + 16}px` }
  }

  // 别人的消息：用 left 定位
  const left = Math.max(
    16,
    Math.min(
      x - Math.min(screenW / 2 - 16, 200),
      screenW - Math.min(screenW / 2 - 16, 200) * 2 - 16,
    ),
  )
  if (messagePopoverPlacement.value === 'top') {
    return { position: 'fixed', left: `${left}px`, bottom: `${screenH - y + 16}px` }
  }
  return { position: 'fixed', left: `${left}px`, top: `${y + 16}px` }
})

const messagePopoverArrowStyle = computed(() => {
  const sysInfo = uni.getSystemInfoSync()
  const screenW = sysInfo.screenWidth
  const screenH = sysInfo.screenHeight
  const x = messagePopoverAnchorX.value
  const y = messagePopoverAnchorY.value
  const isSelf = selectedMessageActionTarget.value?.is_self === 1
  const left = isSelf ? (screenW * 3) / 4 : screenW / 5
  if (messagePopoverPlacement.value === 'top') {
    return { position: 'fixed', left: `${left}px`, bottom: `${screenH - y + 8}px` }
  }
  return { position: 'fixed', left: `${left}px`, top: `${y + 8}px` }
})
let messageLongPressTimer: ReturnType<typeof setTimeout> | null = null // 长按定时器
let messageLongPressStartX = 0 // 触摸起始 X 坐标
let messageLongPressStartY = 0 // 触摸起始 Y 坐标
let messageLongPressMoved = false // 是否发生了超过阈值的移动
let lastTriggeredContextMenuAt = 0 // 上次触发上下文菜单的时间（用于防抖）
// 清除长按定时器函数
const clearPendingMessageLongPress = () => {
  if (!messageLongPressTimer) return
  clearTimeout(messageLongPressTimer)
  messageLongPressTimer = null
}
// 触摸开始处理
const handleMessageTouchStart = (event: any, msg: ChatMessage) => {
  if (!isTouchRuntime || msg.display_status === 'recalled' || msg.message_type === 'system') return

  clearPendingMessageLongPress()
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  if (!touch) return

  messageLongPressStartX = Number(touch.clientX || touch.pageX || 0)
  messageLongPressStartY = Number(touch.clientY || touch.pageY || 0)
  messageLongPressMoved = false
  messageLongPressTimer = setTimeout(() => {
    messageLongPressTimer = null
    if (messageLongPressMoved) return
    lastTriggeredContextMenuAt = Date.now()
    showMessageContextMenu(msg, messageLongPressStartX, messageLongPressStartY)
  }, MESSAGE_LONG_PRESS_DURATION_MS)
}
// 触摸移动处理
const handleMessageTouchMove = (event: any) => {
  if (!messageLongPressTimer) return

  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  if (!touch) return

  const currentX = Number(touch.clientX || touch.pageX || 0)
  const currentY = Number(touch.clientY || touch.pageY || 0)
  const deltaX = Math.abs(currentX - messageLongPressStartX)
  const deltaY = Math.abs(currentY - messageLongPressStartY)

  if (
    deltaX >= MESSAGE_LONG_PRESS_MOVE_THRESHOLD_PX ||
    deltaY >= MESSAGE_LONG_PRESS_MOVE_THRESHOLD_PX
  ) {
    messageLongPressMoved = true
    clearPendingMessageLongPress()
  }
}
// 触摸结束/取消处理
const handleMessageTouchEnd = () => {
  clearPendingMessageLongPress()
}
// 右键菜单（contextmenu）处理
const handleMessageContextMenu = (event: Event, msg: ChatMessage) => {
  event.preventDefault()
  event.stopPropagation()
  if (msg.message_type === 'system') return

  if (isTouchRuntime) {
    // 移动端由 touch 事件处理，避免重复触发
    if (Date.now() - lastTriggeredContextMenuAt < 300) return
    return
  }

  const x = (event as MouseEvent).clientX || 0
  const y = (event as MouseEvent).clientY || 0
  showMessageContextMenu(msg, x, y)
}
// 显示上下文菜单气泡
const showMessageContextMenu = async (msg: ChatMessage, touchX = 0, touchY = 0) => {
  console.log(msg)
  if (msg.display_status === 'recalled' || msg.message_type === 'system') return

  selectedMessageActionTarget.value = msg
  if (messageActionSheetActions.value.length === 0) return

  const sysInfo = uni.getSystemInfoSync()
  messagePopoverAnchorX.value = Math.max(0, touchX)
  messagePopoverAnchorY.value = Math.max(0, touchY)
  messagePopoverPlacement.value = touchY > sysInfo.screenHeight * 0.55 ? 'top' : 'bottom'
  messagePopoverVisible.value = true
}
// 菜单项选择处理
const handleMessageActionSheetSelect = ({ item }: { item: ActionSheetAction }) => {
  const targetMessage = selectedMessageActionTarget.value
  if (!targetMessage || !item?.action) return
  messagePopoverVisible.value = false
  handleMessageMenuClick(
    {
      item: {
        content: item.name,
        action: item.action,
      },
    },
    targetMessage,
  )
}

const handleMessageActionSheetItemClick = (item: ActionSheetAction) => {
  handleMessageActionSheetSelect({ item })
}

const handlePopoverItemClick = (item: ActionSheetAction) => {
  messagePopoverVisible.value = false
  handleMessageActionSheetItemClick(item)
}
// 回复消息：展示回复栏并打开弹出层
const handleReplyMessage = (msg: ChatMessage) => {
  const nickname = msg.sender?.nickname || ''
  let content = ''
  if (msg.message_type === 'text') {
    content = msg.payload?.text || ''
  } else if (msg.message_type === 'image') {
    content = t('group.chat.imageMessage')
  } else if (msg.message_type === 'emotion') {
    content = t('group.chat.emojiMessage')
  } else if (msg.message_type === 'rich' && msg.payload?.parts) {
    content = msg.payload.parts
      .filter((part) => part.type === 'text' && !!part.text)
      .map((part) => part.text || '')
      .join('')
  } else if (msg.message_type === 'news_card' && msg.payload?.items) {
    content = msg.payload.items.map((item: any) => item.title || '').join('；')
  }
  if (!nickname) return
  const memberId = getMessageTargetMemberId(msg)
  inputBar.value?.setReply(msg.id || 0, memberId, nickname, content)
}

// 复制消息内容
const handleCopyMessage = (msg: ChatMessage) => {
  if (msg.display_status === 'recalled') {
    toast.show(t('group.chat.unableToCopy'))
    return
  }

  let content = ''

  if (msg.message_type === 'text') {
    content = msg.payload?.text || ''
  } else if (msg.message_type === 'rich') {
    if (msg.payload?.parts) {
      content = msg.payload.parts
        .filter((part) => part.type === 'text' && !!part.text)
        .map((part) => part.text || '')
        .join('')
    }
  } else if (msg.message_type === 'news_card' && msg.payload?.items) {
    content = msg.payload.items.map((item: any) => item.title || '').join('\n')
  }

  if (content) {
    uni.setClipboardData({
      data: content,
      showToast: false,
    })
  } else {
    toast.show(t('group.chat.unableToCopy'))
  }
}

const canRecallMessage = (msg: ChatMessage) => {
  if (msg.is_self !== 1 || msg.display_status === 'recalled') return false

  const currentTime = Math.floor(Date.now() / 1000)
  const messageTime = msg.create_time || 0
  return currentTime - messageTime <= MESSAGE_RECALL_TIME_LIMIT_SECONDS
}

const canReeditRecalledMessage = (msg: ChatMessage) => {
  if (msg.is_self !== 1 || msg.display_status !== 'recalled') return false
  if (!msg.placeholder?.text) return false

  const currentTime = Math.floor(Date.now() / 1000)
  const messageTime = msg.create_time || 0
  return currentTime - messageTime <= MESSAGE_RECALL_TIME_LIMIT_SECONDS
}
// 菜单动作分发（复制、删除、禁言、踢人…）
const handleMessageMenuClick = ({ item }: { item: MessageMenuItem }, msg: ChatMessage) => {
  switch (item.action) {
    case 'reply':
      handleReplyMessage(msg)
      break
    case 'copy':
      handleCopyMessage(msg)
      break
    case 'delete':
      handleDeleteMessage(msg)
      break
    case 'mute':
    case 'unmute':
      handleMessageMemberMuteAction(msg)
      break
    case 'kick':
      handleMessageKickMember(msg)
      break
    case 'removed':
      toast.show(t('group.chat.memberKicked'))
      break
  }
}
const canManageTargetMute = (targetRole?: string, isSelf = false) => {
  if (!canOperateTargetRole(targetRole, isSelf)) return false
  const currentRank = getGovernanceRoleRank(getCurrentGovernanceRole())
  const normalizedRole = normalizeGovernanceRole(targetRole)

  if (currentRank === 1) {
    return normalizedRole === 'member'
  }

  return currentRank >= 2
}
const MESSAGE_RECALL_TIME_LIMIT_SECONDS = 2 * 60

const isMessageSenderRemoved = (msg: ChatMessage) => {
  const memberId = Number(msg.sender?.member_id || msg.member_id || 0)
  // 优先以 WS 实时事件记录的状态为准，找不到再 fallback 到消息自带的 member_status
  const realTimeStatus = memberId ? memberStateMap.value[memberId]?.status : undefined
  const status =
    realTimeStatus !== undefined ? realTimeStatus : Number(msg.sender?.member_status || 0)
  return status === 3
}

const isMessageSenderMuted = (msg?: ChatMessage | null) => {
  if (!msg) return false
  const memberId = Number(msg.sender?.member_id || msg.member_id || 0)
  const realTimeStatus = memberId ? memberStateMap.value[memberId]?.status : undefined
  const status =
    realTimeStatus !== undefined ? realTimeStatus : Number(msg.sender?.member_status || 0)
  return status === 4
}

/** 当前用户是否被禁言（由 WS member.state_changed 事件写入） */
const isCurrentUserMuted = computed(() => {
  const selfMemberId = userStore.userInfo?.member_id
  if (!selfMemberId) return false
  return memberStateMap.value[selfMemberId]?.status === 4
})

/** 自己的实时禁言信息，传给 chat-input-bar 作为禁用状态和提示文案 */
const selfMuteReason = computed(() => {
  const selfMemberId = userStore.userInfo?.member_id
  if (!selfMemberId) return ''
  return memberStateMap.value[selfMemberId]?.muteReason || ''
})

const getMessageSenderDisplayName = (msg: ChatMessage) => {
  const nickname = msg.sender?.nickname || ''
  if (!isMessageSenderRemoved(msg)) return nickname
  return `${nickname}${t('group.chat.memberRemovedLabel')}`
}

const getMemberByMessage = (msg: ChatMessage) => {
  if (isMessageSenderRemoved(msg)) return null
  const memberId = Number(msg.sender?.member_id || msg.member_id || 0)
  if (!memberId) return null
  return roomMemberMap.value[memberId] || null
}

const getMessageTargetMemberId = (msg?: ChatMessage | null) => {
  if (!msg) return 0
  return Number(getMemberByMessage(msg)?.member_id || msg.sender?.member_id || msg.member_id || 0)
}

const getGovernanceMenuOptions = (msg: ChatMessage): MessageMenuItem[] => {
  const member = getMemberByMessage(msg)
  const isDeletedMessage = msg.display_status === 'deleted'
  if (isMessageSenderRemoved(msg)) {
    const menuOptions: MessageMenuItem[] = []

    if (!isDeletedMessage) {
      const isSelfMsg = msg.is_self === 1
      if (!isSelfMsg) {
        menuOptions.push({
          content: t('common.reply'),
          action: 'reply',
        })
      }

      if (msg.message_type === 'text') {
        menuOptions.push({
          content: t('common.copy'),
          action: 'copy',
        })
      }
      menuOptions.push({
        content: t('group.chat.delete'),
        action: 'delete',
      })
    }

    menuOptions.push({
      content: t('group.chat.memberKicked'),
      action: 'removed',
    })

    return menuOptions
  }

  const memberId = Number(member?.member_id || msg.sender?.member_id || msg.member_id || 0)
  const isSelf = memberId === userStore.userInfo.member_id || msg.is_self === 1
  const menuOptions: MessageMenuItem[] = []
  // 优先取 memberStateMap 中的最新角色，没有再 fallback
  const realTimeRole = memberId ? memberStateMap.value[memberId]?.role : undefined
  const targetRole = realTimeRole || member?.role || msg.sender?.role || 'member'
  const isMuted = isMessageSenderMuted(msg)

  if (!isDeletedMessage) {
    if (!isSelf) {
      menuOptions.push({
        content: t('common.reply'),
        action: 'reply',
      })
    }

    if (msg.message_type === 'text') {
      menuOptions.push({
        content: t('common.copy'),
        action: 'copy',
      })
    }

    menuOptions.push({
      content: t('group.chat.delete'),
      action: 'delete',
    })
  }

  if (canManageTargetMute(targetRole, isSelf)) {
    menuOptions.push({
      content: isMuted ? t('group.chat.member.action.unmute') : t('group.chat.member.action.mute'),
      action: isMuted ? 'unmute' : 'mute',
    })
  }

  if (!isSelf && !isMessageSenderRemoved(msg)) {
    // if (!isSelf && !isMessageSenderRemoved(msg) && canOperateTargetRole(targetRole, isSelf)) {
    menuOptions.push({
      content: t('group.chat.kickMember'),
      action: 'kick',
    })
  }

  return menuOptions
}

const getMessageMenuOptions = (msg: ChatMessage): MessageMenuItem[] => {
  if (msg.display_status === 'deleted') {
    return []
  }

  const menuOptions: MessageMenuItem[] = []
  const isSelf = msg.is_self === 1

  menuOptions.push({
    content: t('common.reply'),
    action: 'reply',
  })

  // 只有 text 类型消息才能复制
  if (msg.message_type === 'text') {
    menuOptions.push({
      content: t('common.copy'),
      action: 'copy',
    })
  }

  // 管理员及以上才能删除消息
  if (getGovernanceRoleRank(getCurrentGovernanceRole()) > 0) {
    menuOptions.push({
      content: t('group.chat.delete'),
      action: 'delete',
    })
  }

  return menuOptions
}
const canShowGovernanceMessageActions = (msg: ChatMessage) => {
  return msg.is_self !== 1 && getGovernanceRoleRank(getCurrentGovernanceRole()) > 0
}
const normalizeGovernanceRole = (role?: string) => {
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
const getGovernanceRoleRank = (role?: string) => {
  const normalizedRole = normalizeGovernanceRole(role)
  if (normalizedRole === 'owner') return 3
  if (normalizedRole === 'host') return 2
  if (normalizedRole === 'admin') return 1
  return 0
}

const getCurrentGovernanceRole = () => {
  // 优先取 WS 实时事件记录的最新角色，没有再 fallback
  const selfMemberId = userStore.userInfo?.member_id
  const realTimeRole = selfMemberId ? memberStateMap.value[selfMemberId]?.role : undefined
  return realTimeRole || roomDetail.value?.speaking.role || 'member'
}
const canOperateTargetRole = (targetRole?: string, isSelf = false) => {
  if (isSelf) return false

  const currentRank = getGovernanceRoleRank(getCurrentGovernanceRole())
  const targetRank = getGovernanceRoleRank(targetRole)

  if (currentRank <= 0) return false
  if (currentRank === 3) return true
  return currentRank > targetRank
}

// 菜单项构建（根据消息类型和权限）
const messageActionSheetActions = computed<ActionSheetAction[]>(() => {
  const targetMessage = selectedMessageActionTarget.value
  if (!targetMessage) return []

  const menuOptions = canShowGovernanceMessageActions(targetMessage)
    ? getGovernanceMenuOptions(targetMessage)
    : getMessageMenuOptions(targetMessage)

  return menuOptions.map((item) => ({
    name: item.content,
    action: item.action,
    destructive: item.action === 'kick',
    iconName: (() => {
      switch (item.action) {
        case 'kick':
        case 'removed':
          return 'user-clear'
        case 'delete':
          return 'delete-thin'
        case 'copy':
          return 'file-copy'
        case 'reply':
          return 'chat'
        default:
          return undefined
      }
    })(),
    iconSrc:
      item.action === 'mute' || item.action === 'unmute' ? MESSAGE_ACTION_MUTE_ICON : undefined,
  }))
})
// 辅助变量（用于菜单图标等）
const MESSAGE_ACTION_MUTE_ICON = '/static/images/mute_1.png'
// 弹窗确认函数（由长按菜单项触发）
// 解除禁言确认
const confirmMessageUnmute = async () => {
  const targetMessage = selectedMessageActionTarget.value
  const roomId = targetMessage?.room_id || roomDetail.value?.room.id || routeRoomId.value
  const memberId = getMessageTargetMemberId(targetMessage)
  const reason = unmuteReason.value.trim()

  if (!roomId || !memberId) return

  try {
    uni.showLoading({ title: t('common.processing'), mask: true })
    const res = await unmuteMemberApi(roomId, memberId, reason)
    if (res.code === 1) {
      showUnmuteReasonPopup.value = false
      await refreshMessageSendersBeforeCurrentLast(memberId, res.data.status)
      uni.hideLoading()
      toast.show(t('group.member.action.unmuteSuccess'))
      return
    }
    uni.hideLoading()
    toast.show(res.msg || t('common.operationFailed'))
  } catch (error: any) {
    uni.hideLoading()
    toast.show(error?.message || t('common.operationFailed'))
  }
}

// 删除消息确认
const confirmDeleteMessage = async () => {
  const targetMessage = selectedMessageActionTarget.value
  const roomId = targetMessage?.room_id || roomDetail.value?.room.id || routeRoomId.value
  const reason = deleteReason.value.trim()

  if (!roomId || !targetMessage?.id) return

  uni.showLoading({ title: t('common.processing'), mask: true })
  try {
    const res = await deleteChatMessageApi(targetMessage.id, reason)
    uni.hideLoading()
    if (res.code === 1) {
      showDeleteReasonPopup.value = false
      return
    }
    toast.show(res.msg || t('group.chat.deleteFailed'))
  } catch (error: any) {
    uni.hideLoading()
    toast.show(error?.message || t('group.chat.deleteFailed'))
  }
}

// 踢出成员确认
const confirmKickMember = async () => {
  const targetMessage = selectedMessageActionTarget.value
  const roomId = targetMessage?.room_id || roomDetail.value?.room.id || routeRoomId.value
  const memberId = getMessageTargetMemberId(targetMessage)
  const reason = kickReason.value.trim()
  if (!roomId || !memberId) {
    toast.show(t('common.operationFailed'))
    return
  }

  uni.showLoading({ title: t('common.processing'), mask: true })
  try {
    const res = await removeMemberApi(roomId, memberId, reason)
    if (res.code === 1) {
      showKickReasonPopup.value = false
      applyMemberKickedState(memberId)
      uni.hideLoading()
      return
    }
    uni.hideLoading()
    toast.show(res.msg || t('common.operationFailed'))
  } catch (error: any) {
    uni.hideLoading()
    toast.show(error?.message || t('common.operationFailed'))
  }
}
const applyMemberKickedState = (memberId: number) => {
  if (!memberId) return false

  let hasUpdated = false
  messages.value = messages.value.map((message) => {
    const senderMemberId = Number(message.sender?.member_id || message.member_id || 0)
    if (senderMemberId !== memberId) return message
    hasUpdated = true
    return {
      ...message,
      sender: {
        ...message.sender,
        member_status: 3,
      },
    }
  })

  if (!hasUpdated) return false

  const nextMemberMap = { ...roomMemberMap.value }
  delete nextMemberMap[memberId]
  roomMemberMap.value = nextMemberMap
  return true
}

/**
 * 处理禁言/解除禁言状态变更（member.state_changed 事件）
 * 只写入 memberStateMap，菜单读取时通过 isMessageSenderMuted 动态计算
 */
const applyMemberMuteState = (memberId: number, action: 'muted' | 'unmuted', reason?: string) => {
  if (!memberId) return
  const newStatus = action === 'muted' ? 4 : 1
  memberStateMap.value = {
    ...memberStateMap.value,
    [memberId]: {
      ...memberStateMap.value[memberId],
      status: newStatus,
      ...(action === 'muted' ? { muteReason: reason || '' } : { muteReason: undefined }),
    },
  }
}

/**
 * 处理角色变更（member.state_changed + action=role_changed 事件）
 * 只写入 memberStateMap，菜单读取时动态计算
 */
const applyMemberRoleChanged = (memberId: number, newRole: string) => {
  if (!memberId || !newRole) return
  memberStateMap.value = {
    ...memberStateMap.value,
    [memberId]: { ...memberStateMap.value[memberId], role: newRole },
  }
}
// 长按菜单项中触发上述弹窗的函数
// 处理“禁言/解除禁言”动作（如果已经是禁言状态则弹出解除原因弹窗）
const handleMessageMemberMuteAction = async (msg: ChatMessage) => {
  const roomId = msg.room_id || roomDetail.value?.room.id || routeRoomId.value
  const memberId = getMessageTargetMemberId(msg)
  if (!roomId || !memberId) return

  if (isMessageSenderMuted(msg)) {
    selectedMessageActionTarget.value = msg
    unmuteReason.value = ''
    showUnmuteReasonPopup.value = true
    return
  }

  // 非禁言状态直接禁言（不弹窗）
  uni.showLoading({ title: t('common.processing'), mask: true })
  try {
    const res = await muteMemberApi(roomId, memberId, 0)
    if (res.code === 1) {
      await refreshMessageSendersBeforeCurrentLast(memberId, res.data.status)
      uni.hideLoading()
      toast.show(t('group.member.action.muteSuccess'))
      return
    }
    uni.hideLoading()
    toast.show(res.msg || t('common.operationFailed'))
  } catch (error: any) {
    uni.hideLoading()
    toast.show(error?.message || t('common.operationFailed'))
  }
}

// 处理“删除消息”动作（弹出删除原因弹窗）
const handleDeleteMessage = async (msg: ChatMessage) => {
  requestDeleteMessage(msg)
}

const requestDeleteMessage = (msg: ChatMessage) => {
  selectedMessageActionTarget.value = msg
  deleteReason.value = ''
  showDeleteReasonPopup.value = true
}

// 处理“踢出成员”动作（弹出踢出原因弹窗）
const handleMessageKickMember = async (msg: ChatMessage) => {
  requestKickMember(msg)
}

const requestKickMember = (msg: ChatMessage) => {
  selectedMessageActionTarget.value = msg
  kickReason.value = ''
  showKickReasonPopup.value = true
}
const refreshMessageSendersBeforeCurrentLast = async (
  memberId: string | number,
  status: number | string,
) => {
  const normalizedMemberId = Number(memberId)
  let changed = false
  for (let i = 0; i < messages.value.length; i++) {
    const msg = messages.value[i]
    if (msg.sender?.member_id === normalizedMemberId && msg.sender.member_status !== status) {
      messages.value[i] = {
        ...msg,
        sender: { ...msg.sender, member_status: status as any },
      }
      changed = true
    }
  }
  if (changed) {
    // paging.value?.refresh()
  }
}

/* 长按END 👆👆👆👆👆👆👆 */
/* 群成员start 📝📝📝📝📝📝📝 */
// 跳转到成员列表页面
const roomMemberMap = ref<Record<number, ChatMember>>({})

/**
 * 成员状态变更记录（由 WS 实时事件写入，优先于消息自带的 member_status / role）
 * 键：member_id
 * 值：{ status?: 1(正常) | 3(已踢出) | 4(禁言), role?: 最新角色 }
 */
const memberStateMap = ref<Record<number, { status?: number; role?: string; muteReason?: string }>>(
  {},
)

const goToMembers = async () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return
  await ensureRoomMemberMapLoaded(true)
  chatSocketClient.value?.setKeepAliveOnHide(true)
  toUrl(
    `/pages/cats/social/group_members?room_id=${roomId}&currentUserRole=${roomDetail.value?.speaking.role}`,
    true,
    false,
  )
}
const debouncedGoToMembers = debounce(goToMembers, 1000, {
  leading: true,
  trailing: false,
})
const goToHistory = async () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return
  // 保存页面状态到缓存，以便从历史搜索页返回时恢复
  chatSocketClient.value?.setKeepAliveOnHide(true)
  toUrl(
    `/pages/cats/social/group_chat_history?room_id=${roomId}&code=${roomCode.value}`,
    true,
    false,
  )
}
const debouncedGoToHistory = debounce(goToHistory, 1000, {
  leading: true,
  trailing: false,
})
let roomMemberMapPromise: Promise<void> | null = null

const ensureRoomMemberMapLoaded = async (forceRefresh = false) => {
  if (!forceRefresh && Object.keys(roomMemberMap.value).length > 0) return
  if (roomMemberMapPromise) return roomMemberMapPromise

  roomMemberMapPromise = loadRoomMemberMap().finally(() => {
    roomMemberMapPromise = null
  })

  return roomMemberMapPromise
}

const loadRoomMemberMap = async () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return

  const [adminRes, memberRes] = await Promise.all([
    getChatRoomMembersApi(roomId, 'moderator'),
    getChatRoomMembersApi(roomId),
  ])

  const mergedMembers: ChatMember[] = []
  if (adminRes.code === 1) {
    mergedMembers.push(...(adminRes.data?.data || []))
  }
  if (memberRes.code === 1) {
    mergedMembers.push(...(memberRes.data?.data || []))
  }

  setRoomMemberMap(mergedMembers)
}
const setRoomMemberMap = (memberList: ChatMember[]) => {
  const nextMemberMap: Record<number, ChatMember> = {}
  memberList.forEach((member) => {
    nextMemberMap[member.member_id] = member
  })
  roomMemberMap.value = nextMemberMap
}
/* 群成员end 📝📝📝📝📝📝📝 */
let hasFlushedReadOnLeave = false
// 离开页面时，把当前看到的最新消息 ID 告诉服务器，标记为已读
const flushPendingReadOnLeave = async () => {
  // if (hasFlushedReadOnLeave) return

  const roomId = roomDetail.value?.room.id || routeRoomId.value
  // 补充暂存的离屏消息 id（用户不在底部时收到的实时消息）
  pendingOffscreenMessages.forEach((msg) => stageReadMessage(msg.id))
  // 遍历所有消息取最大 id，确保不遗漏
  const maxMessageId = messages.value.reduce((max, msg) => {
    const id = Number(msg?.id || 0)
    return id > max ? id : max
  }, 0)
  const lastReadMessageId = pendingReadMessageId.value || maxMessageId
  if (!roomId || !lastReadMessageId) return

  hasFlushedReadOnLeave = true
  await markAsRead(roomId, lastReadMessageId)
}
// 标记消息为已读
const markAsRead = async (roomId: number, lastReadMessageId: number) => {
  try {
    const res = await markMessageReadApi(roomId, lastReadMessageId)
    if (res.code === 1) {
      // console.log('标记已读成功，未读数:', res.data.unread_count)
      // 可以在这里更新房间详情的未读数
      if (roomDetail.value) {
        roomDetail.value.room.unread_count = res.data.unread_count
      }
    }
  } catch (error) {
    // console.error('markAsRead error:', error)
  }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }

  .commentBox .commentItem .commentCntBox .commentCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }

  .wd-textarea * {
    font-family: Alibaba PuHuiTi2 !important;
  }
}
// 覆盖全局 .zh-Hans * 的 Alimama FangYuanTi VF
:deep(*) {
  font-family: Alibaba PuHuiTi2 !important;
}
.page {
  height: 100vh;
  overflow: hidden;
  background-color: var(--liberty-cats-page-background-color);
  display: flex;
  flex-direction: column;

  .cnt {
    padding: 40rpx 0;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
}

.announcement-notice {
  // position: fixed;
  // z-index: 9999;
  // width: 100vw;
}

/* 右侧悬浮按钮 */
.float-action-btn {
  position: absolute;
  right: 0;
  top: 20vh;
  z-index: 100;
  background-color: #fff;
  border-radius: 999px 0 0 999px;
  padding: 18rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8rpx;
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.08),
    0 -2px 10px rgba(0, 0, 0, 0.04);
}

.float-action-text {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
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
    // background-color: #fff;

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
          align-items: center; // 垂直居中对齐头像和文字
          gap: 16rpx;

          .group-avatar {
            width: 56rpx; // 头像尺寸
            height: 56rpx;
            border-radius: 50%; // 剪裁成圆形
            background-color: #eee;
            background-position: center;
            background-repeat: no-repeat;
            background-size: cover;
            flex-shrink: 0;
          }

          .title-text-wrap {
            display: flex;
            flex-direction: row;
            align-items: baseline;
            gap: 8rpx;

            .main-title {
              font-size: 30rpx;
              font-weight: bold;
              color: #1a1a1a;
              /* 防止标题过长 */
              max-width: 240rpx;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              color: #fff;
            }

            .sub-title {
              font-size: 28rpx;
              color: #1a1a1a;
              color: #fff;
            }
          }
        }
      }

      .right-placeholder {
        width: 60rpx; // 与左侧宽度一致，确保标题视觉居中
        flex-shrink: 0;
      }

      .right-icons {
        min-width: 60rpx;
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 24rpx;
      }
    }
  }
}

.message-list {
  padding: 20rpx 30rpx;
  padding-bottom: calc(148rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  width: 100%;

  .history-tip {
    display: flex;
    justify-content: center;
    padding: 12rpx 0 8rpx;
    gap: 12px;
    align-items: center;
  }

  .history-tip-text {
    font-size: 22rpx;
    line-height: 1.4;
    color: #999;
  }

  .virtual-spacer {
    width: 100%;
    pointer-events: none;
  }

  // 时间分组标记样式
  .time-divider {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 32rpx 0;

    .divider-time {
      font-size: 24rpx;
      color: #999;
      padding: 8rpx 24rpx;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 16rpx;
    }
  }

  .msg-row {
    display: flex;
    margin-bottom: 28rpx;

    // 系统消息样式：居中显示
    &.is-system {
      justify-content: center;
      align-items: center;

      .system-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8rpx;
        max-width: 90%;

        &.recalled-message {
          width: 100%;
          max-width: 100%;
        }

        .system-text {
          font-size: 24rpx;
          color: #999;
          text-align: center;
          line-height: 1.5;
          word-break: break-all;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 12rpx;
        }

        .reedit-btn {
          color: #167fff;
        }

        .msg-time {
          font-size: 20rpx;
          color: #bbb;
        }
      }
    }

    .avatarBox {
      position: relative;
      width: 88rpx;
      height: 88rpx;
      margin-right: 16rpx;

      .u-avatar {
        width: 88rpx;
        height: 88rpx;
        overflow: hidden;
        border-radius: 50%; // 圆形头像
        background-color: #eee;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        flex-shrink: 0;
      }

      .levelIcon {
        position: absolute;
        right: -4rpx;
        bottom: 6rpx;
        width: 28rpx;
        height: 28rpx;

        .levelBadge {
          width: 100%;
          height: 100%;
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
        }
      }
    }

    .u-content {
      margin-left: 20rpx;
      max-width: 70%;
      display: flex;
      flex-direction: column;

      .message-item-content {
        display: flex;
        align-items: center;
        gap: 12rpx;
      }

      .u-name {
        font-size: 24rpx;
        color: #888;
        margin-bottom: 8rpx;
        margin-left: 8rpx;
      }

      .bubble-wrap {
        display: inline-block;
        max-width: 100%;

        .text-bubble {
          background-color: #ffffff;
          padding: 20rpx 28rpx;
          /* 他人消息气泡圆角：左上角为小圆角，其余大圆角 */
          border-radius: 8rpx 30rpx 30rpx 30rpx;
          font-size: 28rpx;
          line-height: 1.5;
          color: #1a1a1a;
          box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
          word-break: break-all;
          display: inline-block;
          max-width: 100%;
        }

        .message-text-content {
          white-space: pre-wrap;
          word-break: break-all;
        }

        .text-bubble.is-recalled {
          color: #999;
          background-color: #f5f5f5;
          box-shadow: none;
        }

        .img-content {
          overflow: hidden;
          border-radius: 16rpx;
          background: #f1f2f4;

          .img-placeholder {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.12) 100%),
              #eceef2;
          }

          .img-placeholder-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.55) 48%,
              rgba(255, 255, 255, 0) 100%
            );
            transform: translateX(-100%);
            animation: image-placeholder-shimmer 1.35s ease-in-out infinite;
          }

          .chat-img-custom {
            width: 100%;
            height: 100%;
            border-radius: 16rpx;
            display: block;
            box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
            margin-top: 18rpx;
          }
        }

        .emotion-content {
          overflow: hidden;
          border-radius: 16rpx;
          background: #f1f2f4;

          .img-placeholder {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.12) 100%),
              #eceef2;
          }

          .img-placeholder-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0) 0%,
              rgba(255, 255, 255, 0.55) 48%,
              rgba(255, 255, 255, 0) 100%
            );
            transform: translateX(-100%);
            animation: image-placeholder-shimmer 1.35s ease-in-out infinite;
          }

          .emotion-img {
            width: 100%;
            height: 100%;
            display: block;
          }
        }

        .msg-time {
          font-size: 24rpx;
          color: #bbb;
          margin-top: 12rpx;
          display: block;
          margin-left: 10rpx;
        }
      }

      .reaction-row {
        display: flex;
        display: none;
        flex-wrap: wrap;
        gap: 12rpx;
        margin-top: 12rpx;
      }

      .reaction-chip {
        display: inline-flex;
        align-items: center;
        gap: 8rpx;
        min-height: 44rpx;
        padding: 0 16rpx;
        border-radius: 999rpx;
        background: rgba(0, 0, 0, 0.06);
        color: #666;

        &.active {
          background: rgba(255, 107, 3, 0.14);
          color: #ff6b03;
        }
      }

      .reaction-add {
        padding: 0 14rpx;
      }

      .reaction-emoji {
        font-size: 24rpx;
        line-height: 1;
      }

      .reaction-count {
        font-size: 22rpx;
        line-height: 1;
      }

      .message-status {
        margin-top: 10rpx;
        font-size: 22rpx;
        color: #999;

        &.failed {
          color: #e25b5b;
        }
      }

      .message-resend-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 34rpx;
        height: 34rpx;
        margin-top: 10rpx;
        margin-right: 8rpx;
        border: 1rpx solid #ff6b03;
        border-radius: 50%;
        color: #ff6b03;
        flex-shrink: 0;
      }

      .message-resend-icon {
        font-size: 24rpx;
        line-height: 1;
        font-weight: 600;
      }
    }

    /* 自己发送的消息样式 */
    &.is-me {
      flex-direction: row-reverse; // 整体反向排列

      .u-content {
        margin-left: 0;
        margin-right: 20rpx;
        align-items: flex-end; // 内容右对齐

        .bubble-wrap {
          .text-bubble {
            background-color: #ff6b03; // 使用您的主题橙色
            color: #ffffff;
            /* 自己消息气泡圆角：右上角为小圆角，其余大圆角 */
            border-radius: 30rpx 8rpx 30rpx 30rpx;
            display: inline-block;
            max-width: 100%;
          }

          .msg-time {
            text-align: right;
            margin-right: 10rpx;
            margin-left: 0;
          }
        }

        .reaction-row,
        .message-status,
        .message-resend-btn {
          justify-content: flex-end;
          text-align: right;
        }
      }
    }
  }
}

.chat-scroll {
  flex: 1;
  height: 100%;
  min-height: 0;
}

.scroll-bottom-anchor {
  height: calc(96rpx + env(safe-area-inset-bottom));
  pointer-events: none;
}

.new-message-indicator {
  position: fixed;
  left: 50%;
  bottom: calc(144rpx + env(safe-area-inset-bottom));
  z-index: 10;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 72rpx;
  padding: 0 28rpx;
  background: #ffffff;
  border-radius: 999rpx;
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
  transform: translateX(-50%);
}

.new-message-indicator-text {
  font-size: 28rpx;
  line-height: 1;
  color: #1f1f1f;
  white-space: nowrap;
}

@keyframes image-placeholder-shimmer {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(100%);
  }
}

.fixedCommentBox {
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;
  width: calc(100% - 48rpx);
  height: calc(120rpx - 48rpx);
  padding: 24rpx;
  padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx);
  background-color: #ffffff;
  border-top: 1rpx solid #f3f3f4;

  // ✅ 上传图标按钮样式
  .upload-icon-btn {
    width: 48rpx;
    height: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    cursor: pointer;

    &.is-disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  .commentTextArea {
    // width: calc(100% - 148rpx);
    flex: 1;
    height: calc(100% - 36rpx);
    padding: 18rpx 24rpx;
    font-size: 28rpx;
    font-weight: 400;
    line-height: 36rpx;
    color: rgba(38, 16, 0, 0.3);
    background: #f3f3f4;
    border-radius: 64rpx;

    &.is-muted {
      color: #ccc !important;
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
}

:deep(.sendCommentBtn) {
  background: #ff6b03 !important;
}

:deep(.stressTestBtn) {
  height: 64rpx !important;
  padding: 0 20rpx !important;
  background: #fff3e8 !important;
  color: #ff6b03 !important;
  border-color: #ffd2b2 !important;
  flex-shrink: 0;
}

.perf-panel {
  position: fixed;
  right: 24rpx;
  bottom: calc(160rpx + env(safe-area-inset-bottom));
  z-index: 20;
  width: 520rpx;
  padding: 20rpx 22rpx;
  background: rgba(255, 248, 241, 0.96);
  border: 2rpx solid rgba(255, 176, 107, 0.5);
  border-radius: 24rpx;
  box-shadow: 0 12rpx 36rpx rgba(83, 39, 0, 0.12);
  backdrop-filter: blur(12rpx);
}

.perf-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.perf-panel-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #8a4c19;
}

.perf-panel-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
}

.perf-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
}

.perf-item {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-height: 88rpx;
  padding: 14rpx 16rpx;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 18rpx;
}

.perf-item-wide {
  grid-column: span 2;
}

.perf-label {
  font-size: 20rpx;
  color: rgba(88, 51, 20, 0.66);
}

.perf-value {
  font-size: 24rpx;
  line-height: 1.35;
  color: #3d2209;
  word-break: break-all;
}

:deep(.commentPopup) {
  padding: 32rpx;
  padding-bottom: 32rpx !important;
  border-radius: 32rpx 32rpx 0 0 !important;

  .uni-textarea-wrapper {
    max-height: 200rpx;
    overflow-y: scroll;
  }

  .wd-textarea::after {
    height: 0;
  }

  .wd-textarea__count,
  .wd-textarea__value {
    background: transparent;
  }

  .opBarBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 64rpx;
    margin-top: 24rpx;

    .opIcon {
      width: 48rpx;
      height: 48rpx;
      background-repeat: no-repeat;
      background-position: center;
      background-size: 100% 100%;
    }

    .opIcon.keyboard {
      background-image: url('/static/images/keyboard@2x.png');
    }

    .opIcon.expression {
      background-image: url('/static/images/expiression@2x.png');
    }
  }

  .pubCommentBox {
    .commentTextAreaBox {
      background-color: #f3f3f4 !important;
      border-radius: 32rpx;

      .emojiBox2 {
        padding: 20rpx;

        .emojiItem2 {
          position: relative;
          display: inline-block;
          width: 112rpx;
          height: 112rpx;
          margin-right: 16rpx;
          margin-bottom: 16rpx;

          .emojiIcon2 {
            width: 100%;
            height: 100%;
          }

          .closeBtb {
            position: absolute;
            top: 0;
            right: 0;
            z-index: 9;
            width: 32rpx;
            height: 32rpx;
            background-image: url('/static/images/emoji_del.png');
            background-repeat: no-repeat;
            background-size: 100%;
          }
        }
      }
    }
  }

  .pubCommentTextArea {
    min-height: 108rpx;
    padding: 24rpx !important;
    padding-bottom: 0 !important;
    background-color: #f3f3f4 !important;
    border-radius: 32rpx;
  }

  .commentHidden {
    width: 100%;
    background-color: #fff;
  }

  // 表情包 start
  .expressionBox {
    width: 100%;
    height: 600rpx;
    padding-top: 24rpx;
    margin-top: 24rpx;
    border-top: 1rpx solid #f3f3f4;

    .category {
      display: flex;
      align-items: center;
      justify-content: start;
      width: 100%;
      height: 64rpx;

      //background-color: #ccc;
      .categoryItem {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 96rpx;
        height: 64rpx;
        margin-right: 24rpx;

        image {
          width: 44rpx;
          height: 44rpx;
        }
      }

      .categoryItem.active {
        background: #f3f3f4;
        border-radius: 84rpx;
      }
    }

    .expressionCnt {
      width: 100%;
      height: 500rpx;
      margin-top: 24rpx;
      // background-color: #ccc;

      .expressionItem {
        display: inline-block;
        width: 112rpx;
        height: 112rpx;
        margin-right: 74rpx;
        margin-bottom: 48rpx;

        image {
          width: 100%;
          height: 100%;
        }
      }

      .expressionItem:nth-child(4n) {
        margin-right: 0;
      }

      .emojiItem {
        display: inline-block;
        width: 64rpx;
        height: 64rpx;
        margin-right: 38rpx;
        margin-bottom: 12rpx;

        .emoji {
          font-size: 48rpx;
        }
      }

      .emojiItem:nth-child(7n) {
        margin-right: 0;
      }
    }
  }

  // 表情包end
}

.member-view {
  display: flex;
  flex-direction: column;
  height: 100%; // 必须撑满
  background-color: #fff;

  .member-scroll {
    flex: 1; // 占据剩余高度
    height: 0; // 配合 flex:1 解决部分机型不显示问题
    width: 100%;
  }

  .section-label {
    background-color: #f7f6f4;
    padding: 16rpx 30rpx;
    font-size: 24rpx;
    color: #999;
  }

  .member-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24rpx 30rpx;
    border-bottom: 1rpx solid #f2f2f2;
    background: #fff;

    &:active {
      background: #f9f9f9;
    }

    .item-left {
      display: flex;
      align-items: center;

      .avatar-box {
        position: relative;

        .m-avatar {
          width: 80rpx;
          height: 80rpx;
          border-radius: 12rpx;
        }

        .status-dot {
          position: absolute;
          right: -4rpx;
          bottom: -4rpx;
          width: 18rpx;
          height: 18rpx;
          border-radius: 50%;
          border: 4rpx solid #fff;
          background: #ccc;

          &.online {
          }
        }
      }

      .m-info {
        margin-left: 20rpx;

        .m-name-row {
          display: flex;
          align-items: center;
          gap: 8rpx;

          .m-name {
            font-size: 28rpx;
            color: #333;
            font-weight: 500;
          }

          .owner-icon {
            font-size: 24rpx;
          }
        }

        .m-status {
          font-size: 22rpx;
          color: #999;
          margin-top: 4rpx;
        }
      }
    }
  }
}

/* 气泡定位锚点 */
#pop-anchor {
  position: fixed;
  width: 1px;
  height: 1px;
  background: transparent;
  pointer-events: none;
}

:deep(.pubUpload) {
  .wd-upload__evoke,
  .wd-upload__preview {
    display: none;
  }
}

:deep(.custom-notice) {
  position: fixed;
  width: 100vw;
  z-index: 999;
}

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

.time-divider {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 20rpx 0;

  .divider-time {
    font-size: 24rpx;
    color: #999;
    background-color: rgba(0, 0, 0, 0.05);
    padding: 8rpx 20rpx;
    border-radius: 8rpx;
  }
}

::v-deep .wd-popover__menu {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}

::v-deep .wd-popover__target {
  display: flex;
  align-items: center;
}

::v-deep .uni-scroll-view {
  height: 100%;
}

::v-deep .messageActionSheet {
  .wd-action-sheet__header {
    text-align: left;
  }
}

// WeChat 风格气泡菜单
.msg-popover-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: transparent;
}

.msg-popover-bubble {
  position: fixed;
  z-index: 9999;
  background: rgba(45, 45, 45, 0.96);
  border-radius: 16rpx;
  overflow: hidden;
  max-width: calc(100vw - 32px);
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.35);
}

.msg-popover-scroll {
  max-width: calc(100vw - 32px);
}

.msg-popover-items {
  display: flex;
  flex-direction: row;
  padding: 20rpx 8rpx;
  align-items: flex-start;
}

.msg-popover-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8rpx 20rpx;
  min-width: 96rpx;
  cursor: pointer;

  &:active {
    background: rgba(255, 255, 255, 0.1);
  }
}

.msg-popover-item-icon {
  width: 42rpx;
  height: 42rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.msg-popover-item-image {
  width: 42rpx;
  height: 42rpx;
}

.msg-popover-icon-placeholder {
  width: 42rpx;
  height: 42rpx;
}

.msg-popover-item-text {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.92);
  text-align: center;
  white-space: nowrap;

  &.destructive {
    color: #ff6b6b;
  }
}

.msg-popover-arrow {
  position: fixed;
  z-index: 9999;
  width: 0;
  height: 0;

  &.arrow-top {
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-top: 9px solid rgba(45, 45, 45, 0.96);
  }

  &.arrow-bottom {
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-bottom: 9px solid rgba(45, 45, 45, 0.96);
  }
}
::v-deep .z-paging-content {
  padding-top: inherit !important;
}
.current-announcement-text {
  margin-left: 24rpx;
  font-size: 28rpx !important;
  font-family: Alibaba PuHuiTi2 !important;
}
.msg-row-highlight {
  background-color: rgba(255, 107, 3, 0.12);
}
</style>

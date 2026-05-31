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
              name="notification"
              size="22px"
              color="#fff"
              @click="goToAnnouncementList()"
            ></wd-icon>
            <wd-icon name="usergroup" size="22px" color="#fff" @click="goToMembers()"></wd-icon>
          </view>
        </view>
      </view>
    </view>
    <view class="cnt content" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <wd-notice-bar
        v-if="currentAnnouncement"
        :scrollable="false"
        @click="goToCurrentAnnouncementDetail"
        custom-style="z-index: 9999"
      >
        <template #prefix>
          <wd-img src="/static/images/notice_outlined.png" size="22px"></wd-img>
        </template>
        <view style="margin-left: 24rpx">{{ currentAnnouncementText }}</view>
        <template #suffix>
          <wd-icon
            @click.stop="goToCurrentAnnouncementDetail"
            name="arrow-right"
            size="22px"
          ></wd-icon>
        </template>
      </wd-notice-bar>
      <!-- use-chat-record-mode：开启聊天记录模式 -->
      <!-- use-virtual-list：开启虚拟列表模式 -->
      <!-- cell-height-mode：设置虚拟列表模式高度不固定 -->
      <!-- safe-area-inset-bottom：开启底部安全区域适配 -->
      <!-- bottom-bg-color：设置slot="bottom"容器的背景色，这里设置为和chat-input-bar的背景色一致 -->
      <z-paging
        ref="paging"
        v-model="messages"
        use-chat-record-mode
        use-virtual-list
        cell-height-mode="dynamic"
        safe-area-inset-bottom
        bottom-bg-color="#f8f8f8"
        @query="queryList"
        @scroll="handleChatScroll"
        cellKeyName="id"
      >
        <template v-for="(item, index) in messages" :key="item.id">
          <view style="transform: scaleY(-1)">
            <chat-item :item="item" @retry="retryFailedMessage"></chat-item>
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
          <chat-input-bar ref="inputBar" @sendMsg="doSend" :room-detail="roomDetail" />
        </template>
      </z-paging>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
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
  markMessageReadApi,
  ChatMessage,
  ChatMember,
  ChatMessagePayload,
  ChatRoomDetail,
  ChatMessageType,
  muteMemberApi,
  unmuteMemberApi,
  removeMemberApi,
  recallChatMessageApi,
  reactChatMessageApi,
  deleteChatMessageApi,
} from '@/service/api/groupChat'
import { useUserStore } from '@/store'
import { useToast } from 'wot-design-uni'
// z-paging ref
/*
页面离开标志，用于标识当前页面是否正在被关闭或返回上一页。
它的主要作用是防止在页面已卸载后，继续执行异步操作（如 WebSocket 消息处理、定时器回调、滚动事件等）
导致内存泄漏或报错。
*/
const paging = ref(null)
const isPageLeaving = ref(false)
const commentPopupVisible = ref(false)

const inputBar = ref(null)
// v-model绑定的这个变量不要在分页请求结束中自己赋值！！！
const messages = ref([])
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
  loadRoomDetail()
  // setTimeout(() => {
  //   showArrow.value = true
  // }, 2000)
})
onLoad((options: any) => {
  roomCode.value = options?.code || ''
  routeRoomId.value = Number(options?.room_id || 0)
})
onHide(() => {
  // ...
  chatSocketClient.value?.handlePageHide()
})
onShow(() => {
  // ...
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (roomId) {
    void loadCurrentAnnouncement(roomId)
  }
  resumeChatAfterForeground()
  // ...
})
onUnmounted(() => {
  // ...
  chatSocketClient.value?.destroy()
  chatSocketClient.value = null
  // ... 清理定时器
})
const navigateBack = () => {
  if (isPageLeaving.value) return
  isPageLeaving.value = true
  // flushPendingReadOnLeave()
  // clearPendingMessageLongPress()

  // 停止 socket 连接
  chatSocketClient.value?.destroy()
  chatSocketClient.value = null

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

const handleChatScroll = (e) => {
  const scrollTop = e.detail ? e.detail.scrollTop : e.contentOffset.y
  lastScrollTop = scrollTop
  scrollTopValue.value = e.detail.scrollTop

  // 用户滚动到底部时，追加暂存的离屏消息并清除指示器
  if (isNearBottom()) {
    if (pendingOffscreenMessages.length > 0) {
      applyMessagesBatch(pendingOffscreenMessages, true)
      pendingOffscreenMessages.length = 0
    }
    if (pendingRealtimeMessageCount.value > 0) {
      clearPendingRealtimeMessageIndicator()
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
  return newMessages.filter((msg) => !existingIds.has(msg.id))
}
const applyMessagesBatch = (incomingMessages: ChatMessage[], scrollToLatest = false) => {
  const normalizedMessages = incomingMessages
    .filter((message) => !!message?.id)
    .map((message) => ({
      ...message,
      local_status: message.local_status || 'sent',
    }))

  if (normalizedMessages.length === 0) return
  console.log(paging.value)
  paging.value.addChatRecordData(
    filterExistingMessages(messages.value, normalizedMessages),
    scrollToLatest,
    false,
  )

  normalizedMessages.forEach((message) => stageReadMessage(message.id))
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
  console.log('normalizedEventName', normalizedEventName, message)
  const kickedMemberPayload = payload // 尝试解析踢人负载

  // 如果事件涉及成员变动，触发全局刷新成员列表事件
  if (shouldNotifyGroupMembersRefresh(normalizedEventName, message, payload)) {
    notifyGroupMembersRefresh(payload?.room_id || message?.room_id)
  }

  // 处理消息创建事件（新消息）
  if (normalizedEventName === 'message.created' || normalizedEventName === 'GroupMessageEvent') {
    if (message?.id) {
      if (message.sender?.role === 'system' || message.sender?.member_id === 0) {
        enqueueRealtimeMessage({ ...message, is_self: false }, false)
      } else {
        const isSelf: boolean = message.sender?.member_id === userStore.userInfo.member_id
        // 未读计数统一由 flushRealtimeMessages 按位置判断，此处不再单独 bump
        enqueueRealtimeMessage({ ...message, is_self: isSelf }, false)
      }
    }
    return
  }

  // 处理消息状态变更（如撤回、删除）（功能还不上线，先不处理）
  if (
    normalizedEventName === 'message.state_changed' ||
    normalizedEventName === 'message.reaction_changed'
  ) {
    // const statePayload =
    //   normalizedEventName === 'message.state_changed' ? resolveMessageStatePayload(payload) : null
    // if (message?.id) {
    //   enqueueRealtimeMessage(
    //     normalizedEventName === 'message.state_changed'
    //       ? normalizeStateChangedMessage(message, statePayload)
    //       : message,
    //     false,
    //   )
    //   return
    // }
    // if (normalizedEventName === 'message.state_changed') {
    //   if (statePayload && applyMessageDisplayStatus(statePayload)) {
    //     return
    //   }
    // }
    // return
  }

  // 处理成员踢出 / 状态变更
  if (
    normalizedEventName === 'member.kicked' ||
    normalizedEventName === 'member.removed' ||
    normalizedEventName === 'member.status_changed'
  ) {
    if (kickedMemberPayload && applyMemberKickedState(kickedMemberPayload.member_id)) {
      return
    }
    return
  }

  // 兜底：若有消息则入队
  if (message?.id) {
    enqueueRealtimeMessage(message, false)
  }
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
    normalizedEventName === 'member.status_changed'
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

  // 自己发的消息始终立即追加（用户期望立即看到自己的消息）
  const selfMessages = queuedMessages.filter((msg) => msg.is_self)
  if (selfMessages.length > 0) {
    applyMessagesBatch(selfMessages, shouldScrollToLatest)
    pendingRealtimeMessageCount.value += selfMessages.length
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
    eventHandlers: createEventHandlers({
      GroupMessageEvent: handleIncomingMessage,
      'message.created': (payload) => handleRealtimeEvent('message.created', payload),
      'message.state_changed': (payload) => handleRealtimeEvent('message.state_changed', payload),
      'message.reaction_changed': (payload) =>
        handleRealtimeEvent('message.reaction_changed', payload),
      'member.kicked': (payload) => handleRealtimeEvent('member.kicked', payload),
      'member.removed': (payload) => handleRealtimeEvent('member.removed', payload),
      'member.status_changed': (payload) => handleRealtimeEvent('member.status_changed', payload),
    }),
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
  // 先追加暂存的离屏消息
  if (pendingOffscreenMessages.length > 0) {
    applyMessagesBatch(pendingOffscreenMessages, true)
    pendingOffscreenMessages.length = 0
  }
  clearPendingRealtimeMessageIndicator()
  scrollToBottom()
}
//  向下的箭头 ⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️ end
const messageCache = new Map()
const lastestMessageId = ref('')
// @query所绑定的方法不要自己调用！！需要刷新列表数据时，只需要调用paging.value.reload()即可
const queryList = async (pageNo, pageSize) => {
  if (pageNo === 1) {
    await getChatMessageList()
    setTimeout(() => {
      getChatMessageList(lastestMessageId.value, true)
    }, 2000)
  } else {
    let earliestId
    if (messages.value && messages.value.length > 0) {
      earliestId = Math.min(...messages.value.map((m) => m.id))
    } else {
      earliestId = undefined // 无消息，请求最新
    }
    if (earliestId && messageCache.has(earliestId)) {
      const cachedMessages = messageCache.get(earliestId)
      paging.value.complete(cachedMessages.messages)
      messages.value.push(...cachedMessages.messages)
      messageCache.delete(earliestId)
      // 继续后台预取下一页（用更新后列表的最早id）
      setTimeout(() => {
        const newEarliestId = messages.value.length
          ? Math.min(...messages.value.map((m) => m.id))
          : undefined
        if (newEarliestId) getChatMessageList(newEarliestId, true)
      }, 200)
    }
  }
}
const getChatMessageList = async (before_message_id: strin | number = null, silent = false) => {
  const res = await getChatMessageListApi({
    room_id: 1,
    limit: silent ? 100 : 50,
    before_message_id,
  })
  // lastestMessageId.value = res.data.messages[0].id
  const newMessages = reverseMessageArray(res.data.messages)
  const newLastestId = res.data.messages[0].id
  if (!silent) {
    lastestMessageId.value = newLastestId
    paging.value.complete(newMessages || [])
    messages.value.push(...newMessages)
  } else {
    messageCache.set(before_message_id, {
      messages: newMessages,
      newLastestId: lastestMessageId.value,
    })
    lastestMessageId.value = newLastestId
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
  } satisfies ChatMessage
}
const sendChatMessageWithClientMessageId = async (
  roomId: number,
  messageType: ChatMessageType,
  clientMessageId: string,
  payload: ChatMessagePayload,
) => {
  const res = await sendChatMessageApi(roomId, messageType, clientMessageId, payload)
  if (res.code === 1) {
    const nextMessage = {
      ...res.data.message,
      client_message_id: res.data.message.client_message_id || clientMessageId,
      local_status: 'sent' as const,
    }

    const updated = updateChatMessageByClientMessageId(clientMessageId, nextMessage)
    if (updated) {
      // 如果更新就不更新视图了，毕竟已经更新过了
      // messages.value = dedupeMessages(sortMessagesByRoomSeq(messages.value))
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
const doSend = (messageType, payload) => {
  let pendingClientMessageId = ''
  const clientMessageId = createClientMessageId()
  pendingClientMessageId = clientMessageId

  // 先追加暂存的离屏消息（确保时序正确：他人消息在自己消息之前）
  if (pendingOffscreenMessages.length > 0) {
    applyMessagesBatch(pendingOffscreenMessages, false)
    pendingOffscreenMessages.length = 0
  }
  clearPendingRealtimeMessageIndicator()

  // 再追加自己的消息，乐观更新
  paging.value.addChatRecordData(createLocalPendingMessage(clientMessageId, messageType, payload))
  scrollToBottom()

  sendChatMessageWithClientMessageId(
    roomDetail.value.room.id,
    messageType,
    clientMessageId,
    payload,
  ).catch((error: any) => {
    markLocalMessageFailed(pendingClientMessageId)
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

/* 群成员start 📝📝📝📝📝📝📝 */
// 跳转到成员列表页面
const roomMemberMap = ref<Record<number, ChatMember>>({})

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
              font-size: 22rpx;
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
        max-width: 80%;

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
  width: 36rpx;
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

.action-sheet-item-content {
  text-align: baseline;
}

.action-sheet-item::before {
  height: 1px;
}
</style>

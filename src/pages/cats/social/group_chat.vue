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
              <image
                class="group-avatar"
                :src="
                  getImageUrl(roomDetail?.room.avatar || '') || '/static/images/default_avatar.png'
                "
                mode="aspectFill"
              />
              <view class="title-text-wrap">
                <text class="main-title">{{ roomDetail?.room.name || t('group.chat.title') }}</text>
                <text class="sub-title">({{ roomDetail?.room.member_count || 0 }})</text>
              </view>
            </view>
          </view>
          <view class="right-icons" @click="goToMembers()">
            <wd-icon name="usergroup" size="22px" color="#fff"></wd-icon>
          </view>
        </view>
      </view>
    </view>

    <view class="cnt" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <!-- ✅ 全群禁言提示横幅 roomDetail?.speaking.is_room_muted === 1-->
      <wd-notice-bar
        v-if="roomDetail?.speaking.is_room_muted === 1"
        class="custom-notice"
        prefix="warn-bold"
        :scrollable="false"
      >
        <template #default>
          <text class="banner-text">
            {{ roomDetail?.speaking.reason || t('group.chat.roomMuted') }}
          </text>
        </template>
      </wd-notice-bar>
      <view id="message-list-root" class="message-list">
        <view class="virtual-spacer" :style="{ height: `${virtualTopSpacer}px` }"></view>
        <view
          v-for="(msg, localIndex) in visibleMessages"
          :key="msg.id"
          :id="'msg-row-' + msg.id"
          class="virtual-message-item"
          :data-message-id="msg.id"
        >
          <view
            v-if="shouldShowTimeDivider(getVisibleMessageIndex(localIndex))"
            class="time-divider"
          >
            <text class="divider-time">{{ formatRelativeTime(msg.create_time) }}</text>
          </view>

          <view
            class="msg-row"
            :class="{
              'is-me': msg.is_self,
              'is-system': msg.message_type === 'system' || msg.display_status === 'recalled',
            }"
          >
            <!-- 时间分组标记：第一条消息或距离上一条消息超过5分钟时显示 -->

            <!-- 系统消息：居中显示 -->
            <template v-if="msg.message_type === 'system'">
              <view class="system-message">
                <!-- <text class="msg-time">{{ formatRelativeTime(msg.create_time) }}</text> -->
                <view class="system-text">
                  <view v-for="(segItem, segIndex) in msg.payload?.segments" :key="segIndex">
                    <text
                      v-if="segItem.type === 'user'"
                      style="color: #167fff; margin-right: 8rpx"
                      @click="handleAvatarClick(msg?.payload.params?.member_id)"
                    >
                      "{{ segItem.text }}"
                    </text>
                    <text v-else>{{ segItem.text }}</text>
                  </view>
                </view>
              </view>
            </template>
            <template v-else-if="msg.display_status === 'recalled'">
              <view class="system-message recalled-message">
                <view class="system-text">
                  <text>{{ msg.placeholder?.text || t('group.chat.messageRecalled') }}</text>
                  <text
                    v-if="canReeditRecalledMessage(msg)"
                    class="reedit-btn"
                    @click.stop="handleReeditRecalledMessage(msg)"
                  >
                    {{ t('group.chat.reedit') }}
                  </text>
                </view>
              </view>
            </template>
            <!-- 普通消息：左右布局 -->
            <template v-else>
              <view class="avatarBox" @click="!msg.is_self && handleAvatarClick(msg?.member_id)">
                <image class="u-avatar" :src="msg?.sender?.avatar" mode="aspectFill" />
                <view class="levelIcon">
                  <image
                    :src="`/static/images/level/${msg.sender?.level?.level}.png`"
                    mode="widthFix"
                  />
                </view>
              </view>

              <view class="u-content">
                <text v-if="!msg.is_self" class="u-name">{{ msg.sender?.nickname }}</text>

                <wd-popover
                  :ref="(el) => setMessagePopoverRef(msg.id, el)"
                  mode="menu"
                  placement="top"
                  :content="getMessageMenuOptions(msg)"
                  :disabled="true"
                  @menuclick="handleMessageMenuClick($event, msg)"
                >
                  <view
                    class="bubble-wrap"
                    @contextmenu.stop.prevent="showMessageContextMenu(msg)"
                    @longpress.stop="showMessageContextMenu(msg)"
                  >
                    <view
                      v-if="msg.message_type === 'image'"
                      class="img-content"
                      :style="getImageMessageBoxStyle(msg)"
                    >
                      <wd-img
                        v-if="shouldRenderImageMessage(msg, getVisibleMessageIndex(localIndex))"
                        custom-class="chat-img-custom"
                        mode="aspectFill"
                        :width="`${getImageMessageBoxSize(msg).width}px`"
                        :height="`${getImageMessageBoxSize(msg).height}px`"
                        :src="getImageMessageSrc(msg)"
                        :enable-preview="true"
                        radius="24rpx"
                        @load="handleImageMessageLoaded(msg.id)"
                      />
                      <view v-else class="img-placeholder">
                        <view class="img-placeholder-shimmer"></view>
                      </view>
                    </view>
                    <view v-else-if="msg.message_type === 'rich'" class="text-bubble">
                      <view v-for="(richItem, index) in msg.payload?.parts" :key="index">
                        <template v-if="richItem.type === 'text'">
                          <view>{{ richItem?.text }}</view>
                        </template>
                        <view
                          v-else-if="richItem.type === 'emotion'"
                          class="emotion-content"
                          :style="getEmotionMessageBoxStyle()"
                        >
                          <image
                            v-if="
                              shouldRenderRichEmotionMessage(
                                msg,
                                getVisibleMessageIndex(localIndex),
                                index,
                              )
                            "
                            :src="getRichEmotionMessageSrc(richItem.emotion_id)"
                            mode="aspectFill"
                            class="emotion-img"
                            @load="handleEmotionMessageLoaded(msg.id, index)"
                          />
                          <view v-else class="img-placeholder">
                            <view class="img-placeholder-shimmer"></view>
                          </view>
                        </view>
                      </view>
                    </view>
                    <view
                      v-else-if="msg.message_type === 'emotion'"
                      class="emotion-content"
                      :style="getEmotionMessageBoxStyle()"
                    >
                      <image
                        v-if="shouldRenderEmotionMessage(msg, getVisibleMessageIndex(localIndex))"
                        :src="getEmotionMessageSrc(msg)"
                        mode="aspectFill"
                        class="emotion-img"
                        @load="handleEmotionMessageLoaded(msg.id)"
                      />
                      <view v-else class="img-placeholder">
                        <view class="img-placeholder-shimmer"></view>
                      </view>
                    </view>
                    <view v-else class="text-bubble">
                      <view>{{ msg.payload?.text }}</view>
                    </view>
                  </view>
                  <!-- 互动先不展示 -->
                  <view
                    v-if="msg.message_type !== 'system' && msg.display_status !== 'recalled'"
                    class="reaction-row"
                  >
                    <view
                      v-for="reaction in msg.reaction_summary || []"
                      :key="`${reaction.reaction_type}:${reaction.reaction_value}`"
                      class="reaction-chip"
                      :class="{
                        active: hasMyReaction(msg, reaction.reaction_type, reaction.reaction_value),
                      }"
                      @click.stop="
                        toggleReaction(msg, reaction.reaction_type, reaction.reaction_value)
                      "
                    >
                      <text class="reaction-emoji">
                        {{ getReactionDisplay(reaction.reaction_value) }}
                      </text>
                      <text class="reaction-count">{{ reaction.count }}</text>
                    </view>
                    <view
                      class="reaction-chip reaction-add"
                      :class="{
                        active: hasMyReaction(msg, REACTION_LIKE_TYPE, REACTION_LIKE_VALUE),
                      }"
                      @click.stop="toggleReaction(msg, REACTION_LIKE_TYPE, REACTION_LIKE_VALUE)"
                    >
                      <text class="reaction-emoji">👍</text>
                    </view>
                  </view>
                  <text v-if="msg.local_status === 'sending'" class="message-status">
                    {{ t('group.chat.sending') }}
                  </text>
                  <text v-else-if="msg.local_status === 'failed'" class="message-status failed">
                    {{ t('group.chat.sendFailed') }}
                  </text>
                </wd-popover>
              </view>
            </template>
          </view>
        </view>
        <view class="virtual-spacer" :style="{ height: `${virtualBottomSpacer}px` }"></view>
        <!-- 底部锚点，用于滚动定位 -->
        <view id="scroll-bottom-anchor" style="height: 120rpx"></view>
      </view>
      <!-- 底部发消息按钮 -->
      <view class="footer">
        <view class="fixedCommentBox" style="padding-bottom: env(safe-area-inset-bottom)">
          <!-- ✅ 使用原生 uni.chooseImage 替代 wd-upload -->
          <view
            class="upload-icon-btn"
            :class="{ 'is-disabled': roomDetail?.speaking.can_speak !== 1 }"
            @click="roomDetail?.speaking.can_speak === 1 && handleChooseImage()"
          >
            <wd-icon
              name="picture"
              size="22px"
              :color="roomDetail?.speaking.can_speak !== 1 ? '#ccc' : '#666'"
            ></wd-icon>
          </view>
          <view
            class="commentTextArea"
            :class="{ 'is-muted': roomDetail?.speaking.can_speak !== 1 }"
            @click="roomDetail?.speaking.can_speak === 1 && showCommentPopup()"
          >
            {{
              roomDetail?.speaking.can_speak !== 1
                ? roomDetail?.speaking.reason
                : t('social.detail.comment.placeholder')
            }}
          </view>
        </view>

        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
        <!-- 发布消息 -->
        <wd-popup
          v-model="commentPopupVisible"
          lock-scroll
          position="bottom"
          custom-class="commentPopup"
          @close="handleCloseCommentPopup"
        >
          <view class="pubCommentBox">
            <view class="commentTextAreaBox">
              <wd-textarea
                v-model="commentContent"
                :placeholder="t('social.detail.comment.placeholder')"
                :maxlength="500"
                show-word-limit
                auto-height
                hold-keyboard
                :adjust-position="false"
                custom-class="pubCommentTextArea"
                @keyboardheightchange="textAreaFocus"
                :focus="shouldFocus"
                :ignoreCompositionEvent="false"
                ref="commentTextarea"
              />
              <view class="emojiBox2" v-if="customEmojiList.length > 0">
                <view class="emojiItem2" v-for="(item, index) in customEmojiList" :key="index">
                  <view class="closeBtb" @click="deleteCustomEmoji(item.url)"></view>
                  <image :src="getImageUrl(item.url)" mode="widthFix" class="emojiIcon2" />
                </view>
              </view>
            </view>

            <view class="opBarBox">
              <view
                class="opIcon"
                :class="{
                  keyboard: currentOpBtn === 'keyboard',
                  expression: currentOpBtn === 'expression',
                }"
                @click="changeOpBtn"
              ></view>
              <view class="opBtnBox">
                <!-- 发布按钮 -->
                <wd-button
                  type="primary"
                  custom-class="sendCommentBtn"
                  :disabled="roomDetail?.speaking.can_speak !== 1"
                  :loading="sendLoading"
                  @click.stop="debouncedCreateCommentRef?.()"
                >
                  {{ t('social.detail.comment.btn.send') }}
                </wd-button>
              </view>
            </view>
          </view>
          <view class="expressionBox" v-if="currentOpBtn === 'expression'">
            <view class="category">
              <view
                class="categoryItem"
                :class="{ active: expressionCategory === -1 }"
                @click="changeExpressionCategory(-1)"
              >
                <image src="@/static/images/bq0/0.png" mode="heightFix" />
              </view>
              <template v-if="emotionList.length > 0">
                <view
                  class="categoryItem"
                  :class="{ active: expressionCategory === index }"
                  @click="changeExpressionCategory(index)"
                  v-for="(item, index) in emotionList"
                  :key="index"
                >
                  <image :src="getImageUrl(item.icon)" mode="heightFix" />
                </view>
              </template>
            </view>
            <view class="expressionCnt">
              <scroll-view class="scrollGoodsBox" :scroll-y="true" height="500rpx">
                <template v-if="expressionCategory === -1">
                  <view
                    class="emojiItem"
                    v-for="(item, index) in defaultEmojiList"
                    :key="index"
                    @click="addEmoji(item)"
                  >
                    <view class="emoji">{{ item }}</view>
                  </view>
                </template>
                <template v-else-if="expressionCategory > -1">
                  <view
                    class="expressionItem"
                    v-for="(item, index) in emotionList[expressionCategory].emotions"
                    :key="index"
                    @click="addCustomEmoji(item.icon, item.id)"
                  >
                    <image :src="getImageUrl(item.icon)" mode="heightFix" />
                  </view>
                </template>
              </scroll-view>
            </view>
          </view>
          <view class="commentHidden" :style="{ height: `${keyboardHeight}px` }"></view>
        </wd-popup>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/store'
import { getImageUrl, toUrl, formatRelativeTime } from '@/utils'
import { EchoPrivateChannelClient } from '@/utils/echoPrivateChannelClient'
import { useToast } from 'wot-design-uni'
import { debounce } from 'lodash-es'
import CryptoJS from 'crypto-js'
import {
  getCommunityEmotionListItem,
  getCommunityEmotionListByCategoryApi,
} from '@/service/api/community'
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'
import {
  getChatRoomDetailApi,
  sendChatMessageApi,
  getChatMessageListApi,
  markMessageReadApi,
  ChatMessage,
  ChatMessagePayload,
  ChatRoomDetail,
  ChatMessageType,
  recallChatMessageApi,
  reactChatMessageApi,
} from '@/service/api/groupChat'
import { defaultEmojiList } from '@/utils/defaultEmojiList'

const raf = (fn: () => void) => {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(fn)
  }
  return setTimeout(fn, 16) // 约等于一帧
}

declare const plus: any

type UploadChooseFile = {
  path: string
  size?: number
  name?: string
  type: 'image' | 'video' | 'file'
  duration?: number
  thumb?: string
}

type MessageMenuAction = 'copy' | 'recall'
type MessageMenuItem = {
  content: string
  action: MessageMenuAction
}

type MessageStatePayload = {
  message_id: number
  room_id?: number
  room_seq?: number
  display_status: string
  placeholder?: {
    text?: string
  }
  server_time?: number
}

const { t } = useI18n()
const userStore = useUserStore()
const toast = useToast()
const locale = uni.getLocale()
const roomCode = ref('')
const routeRoomId = ref<number>(0)
const roomDetail = ref<ChatRoomDetail | null>(null)
const roomDetailLoading = ref(false)
const chatSocketClient = ref<EchoPrivateChannelClient | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)
const messageListTop = ref(0)
const commentPopupVisible = ref(false)
const hasMoreHistory = ref(true)
const nextBeforeMessageId = ref<number | null>(null)
const loadingMoreHistory = ref(false)
// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)
const totalImageCount = ref<number>(0)
const loadedImageCount = ref<number>(0)
const messageHeightCache = ref<Record<number, number>>({})
const messagePrefixHeights = ref<number[]>([])
const renderedImageMessageMap = ref<Record<number, true>>({})
const renderedEmotionMessageMap = ref<Record<string, true>>({})
const DEFAULT_MESSAGE_HEIGHT = 96
const DEFAULT_SYSTEM_MESSAGE_HEIGHT = 60
const DEFAULT_IMAGE_MESSAGE_HEIGHT = 280
const DEFAULT_RICH_MESSAGE_HEIGHT = 120
const VIRTUAL_BUFFER_COUNT = 12
const SCROLL_UPDATE_THRESHOLD = 120
const IMAGE_RENDER_PRELOAD_PX = 180
const virtualRange = ref({
  start: 0,
  end: 0,
})
const virtualTopSpacer = ref(0)
const virtualBottomSpacer = ref(0)
let lastVirtualScrollTop = 0
let virtualRangeMeasureTimer: ReturnType<typeof setTimeout> | null = null
const isPageLeaving = ref(false)

const navigateBack = () => {
  if (isPageLeaving.value) return
  isPageLeaving.value = true

  // 停止 socket
  chatSocketClient.value?.destroy()
  chatSocketClient.value = null

  // 停止测量定时器
  if (virtualRangeMeasureTimer) {
    clearTimeout(virtualRangeMeasureTimer)
    virtualRangeMeasureTimer = null
  }

  uni.navigateBack({ delta: 1 })
}

// 跳转到成员列表页面
const goToMembers = () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return
  chatSocketClient.value?.setKeepAliveOnHide(true)
  toUrl(
    `/pages/cats/social/group_members?room_id=${roomId}&currentUserRole=${roomDetail.value?.speaking.role}`,
    true,
    false,
  )
}

// ✅ 点击头像查看用户主页
const handleAvatarClick = (memberId: number | undefined) => {
  if (!memberId) return
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}

const CLIENT_MESSAGE_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8'
const CLIENT_DEVICE_ID_STORAGE_KEY = 'group_chat_client_device_id'

onLoad((options: any) => {
  roomCode.value = options?.code || ''
  routeRoomId.value = Number(options?.room_id || 0)
})

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
  console.log('clientMessageSequence', clientMessageSequence)

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

const getPrivateChannelName = (roomId: number) => `chat.room.${roomId}`
const getFirstMessageId = () => messages.value[0]?.id
const getLastMessageId = () => messages.value[messages.value.length - 1]?.id
const getLastRoomSeq = () => messages.value[messages.value.length - 1]?.room_seq || 0
const REACTION_LIKE_TYPE = 'like'
const REACTION_LIKE_VALUE = 'thumbs_up'
const EMOTION_MESSAGE_SIZE_RPX = 140

const rpxToPx = (rpx: number) => {
  const systemInfo = uni.getSystemInfoSync()
  return Math.round((systemInfo.windowWidth / 750) * rpx)
}

const getEstimatedMessageHeight = (message: ChatMessage) => {
  if (messageHeightCache.value[message.id]) {
    return messageHeightCache.value[message.id]
  }

  if (message.message_type === 'system' || message.display_status === 'recalled') {
    return DEFAULT_SYSTEM_MESSAGE_HEIGHT
  }

  if (message.message_type === 'image') {
    const { height } = getImageMessageBoxSize(message)
    return height + 12
  }

  if (message.message_type === 'emotion') {
    return getEmotionMessageBoxSize().height + 12
  }

  if (message.message_type === 'rich') {
    return DEFAULT_RICH_MESSAGE_HEIGHT
  }

  const textLength = message.payload?.text?.length || 0
  return Math.max(DEFAULT_MESSAGE_HEIGHT, 72 + Math.ceil(textLength / 18) * 24)
}

const getImageMessageBoxSize = (message: ChatMessage) => {
  const systemInfo = uni.getSystemInfoSync()
  const maxWidth = Math.min(Math.round(systemInfo.windowWidth * 0.52), 220)
  const minWidth = 120
  const rawWidth = Number(message.payload?.width || 0)
  const rawHeight = Number(message.payload?.height || 0)

  if (!rawWidth || !rawHeight) {
    return {
      width: maxWidth,
      height: maxWidth,
    }
  }

  const widthRatio = maxWidth / rawWidth
  const scaledWidth = Math.max(minWidth, Math.min(maxWidth, Math.round(rawWidth * widthRatio)))
  const scaledHeight = Math.max(90, Math.round(rawHeight * (scaledWidth / rawWidth)))

  return {
    width: scaledWidth,
    height: scaledHeight,
  }
}

const getImageMessageBoxStyle = (message: ChatMessage) => {
  const { width, height } = getImageMessageBoxSize(message)
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
}

const getEmotionMessageBoxSize = () => {
  const size = rpxToPx(EMOTION_MESSAGE_SIZE_RPX)
  return {
    width: size,
    height: size,
  }
}

const getEmotionMessageBoxStyle = () => {
  const { width, height } = getEmotionMessageBoxSize()
  return {
    width: `${width}px`,
    height: `${height}px`,
  }
}

const getImageMessageSrc = (message: ChatMessage) => {
  const thumbUrl = message.payload?.thumb_url || ''
  if (thumbUrl && !thumbUrl.includes('NaN')) {
    return thumbUrl
  }

  return message.payload?.url || ''
}

const getEmotionMessageSrc = (message: ChatMessage) => {
  return getImageUrl(EmotionTool.findById(message.payload?.emotion_id)?.icon)
}

const getRichEmotionMessageSrc = (emotionId?: number) => {
  return getImageUrl(EmotionTool.findById(emotionId)?.icon)
}

const getEmotionRenderCacheKey = (messageId: number, partIndex?: number) => {
  return typeof partIndex === 'number' ? `${messageId}:${partIndex}` : String(messageId)
}

const markImageMessageRendered = (messageId: number) => {
  if (!messageId || renderedImageMessageMap.value[messageId]) return
  renderedImageMessageMap.value[messageId] = true
}

const markEmotionMessageRendered = (messageId: number, partIndex?: number) => {
  const cacheKey = getEmotionRenderCacheKey(messageId, partIndex)
  if (!messageId || renderedEmotionMessageMap.value[cacheKey]) return
  renderedEmotionMessageMap.value[cacheKey] = true
}

const isMessageWithinRenderZone = (message: ChatMessage, index: number) => {
  const itemTop = messageListTop.value + getMessageOffsetTop(index)
  const itemBottom = itemTop + getEstimatedMessageHeight(message)
  const viewportTop = scrollTop.value - IMAGE_RENDER_PRELOAD_PX
  const viewportBottom = scrollTop.value + viewportHeight.value + IMAGE_RENDER_PRELOAD_PX

  return itemBottom >= viewportTop && itemTop <= viewportBottom
}

const shouldRenderImageMessage = (message: ChatMessage, index: number) => {
  return renderedImageMessageMap.value[message.id] || isMessageWithinRenderZone(message, index)
}

const shouldRenderEmotionMessage = (message: ChatMessage, index: number) => {
  const cacheKey = getEmotionRenderCacheKey(message.id)
  return renderedEmotionMessageMap.value[cacheKey] || isMessageWithinRenderZone(message, index)
}

const shouldRenderRichEmotionMessage = (message: ChatMessage, index: number, partIndex: number) => {
  const cacheKey = getEmotionRenderCacheKey(message.id, partIndex)
  return renderedEmotionMessageMap.value[cacheKey] || isMessageWithinRenderZone(message, index)
}

const rebuildMessagePrefixHeights = () => {
  const prefixHeights = new Array(messages.value.length + 1).fill(0)
  for (let index = 0; index < messages.value.length; index += 1) {
    prefixHeights[index + 1] =
      prefixHeights[index] + getEstimatedMessageHeight(messages.value[index])
  }
  messagePrefixHeights.value = prefixHeights
}

const ensureMessagePrefixHeights = () => {
  if (messagePrefixHeights.value.length !== messages.value.length + 1) {
    rebuildMessagePrefixHeights()
  }
}

const getMessageOffsetTop = (targetIndex: number) => {
  ensureMessagePrefixHeights()
  return messagePrefixHeights.value[targetIndex] || 0
}

const getTotalMessageHeight = () => {
  ensureMessagePrefixHeights()
  return messagePrefixHeights.value[messagePrefixHeights.value.length - 1] || 0
}

const findMessageIndexByOffset = (offset: number) => {
  ensureMessagePrefixHeights()

  let left = 0
  let right = messages.value.length
  while (left < right) {
    const middle = Math.floor((left + right) / 2)
    if ((messagePrefixHeights.value[middle + 1] || 0) <= offset) {
      left = middle + 1
    } else {
      right = middle
    }
  }

  return Math.min(Math.max(0, left), Math.max(0, messages.value.length - 1))
}

const findVisibleRangeByScrollTop = (currentScrollTop: number) => {
  const localScrollTop = Math.max(0, currentScrollTop - messageListTop.value)
  const visibleHeight = viewportHeight.value || uni.getSystemInfoSync().windowHeight
  const startOffset = Math.max(0, localScrollTop - visibleHeight)
  const endOffset = localScrollTop + visibleHeight * 2

  const start = findMessageIndexByOffset(startOffset)
  const end = findMessageIndexByOffset(endOffset)

  return {
    start: Math.max(0, start - VIRTUAL_BUFFER_COUNT),
    end: Math.min(messages.value.length - 1, end + VIRTUAL_BUFFER_COUNT),
  }
}

let measureScheduled = false
const scheduleVisibleMessageMeasurement = () => {
  if (measureScheduled || isPageLeaving.value) return
  measureScheduled = true
  virtualRangeMeasureTimer = setTimeout(() => {
    measureScheduled = false
    virtualRangeMeasureTimer = null
    measureVisibleMessages()
  }, 100)
}

const updateVirtualRange = (currentScrollTop = scrollTop.value, force = false) => {
  if (messages.value.length === 0) {
    virtualRange.value = { start: 0, end: 0 }
    virtualTopSpacer.value = 0
    virtualBottomSpacer.value = 0
    return
  }

  if (!force && Math.abs(currentScrollTop - lastVirtualScrollTop) < SCROLL_UPDATE_THRESHOLD) {
    return
  }

  const nextRange = findVisibleRangeByScrollTop(currentScrollTop)
  const rangeChanged =
    nextRange.start !== virtualRange.value.start || nextRange.end !== virtualRange.value.end

  lastVirtualScrollTop = currentScrollTop
  if (!force && !rangeChanged) {
    return
  }

  virtualRange.value = nextRange
  virtualTopSpacer.value = getMessageOffsetTop(nextRange.start)
  const renderedHeight =
    getMessageOffsetTop(nextRange.end + 1) - getMessageOffsetTop(nextRange.start)
  const totalHeight = getTotalMessageHeight()
  virtualBottomSpacer.value = Math.max(0, totalHeight - virtualTopSpacer.value - renderedHeight)

  if (rangeChanged || force) {
    scheduleVisibleMessageMeasurement()
  }
}

const isNearBottom = () => {
  const threshold = 100 // px，可调
  const totalHeight = getTotalMessageHeight()
  const current = scrollTop.value + viewportHeight.value

  return totalHeight - current < threshold
}

const measureVisibleMessages = () => {
  if (isPageLeaving.value) return
  nextTick(() => {
    if (isPageLeaving.value) return
    const query = uni.createSelectorQuery()
    query.selectAll('.virtual-message-item').fields({ size: true, dataset: true }, (rects) => {
      let hasHeightChange = false

      ;(rects || []).forEach((rect: any) => {
        const messageId = Number(rect?.dataset?.messageId)
        const nextHeight = Math.ceil(rect?.height || 0)
        if (!messageId || !nextHeight) return
        if (messageHeightCache.value[messageId] === nextHeight) return

        messageHeightCache.value[messageId] = nextHeight
        hasHeightChange = true
      })

      if (hasHeightChange) {
        rebuildMessagePrefixHeights()
        updateVirtualRange(scrollTop.value, true)
      }
    })
    query.exec()
  })
}

const refreshViewportMetrics = () => {
  const systemInfo = uni.getSystemInfoSync()
  viewportHeight.value = systemInfo.windowHeight || 0

  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('#message-list-root').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((result) => {
      const rect = result?.[0]
      const viewport = result?.[1]
      if (!rect || !viewport) return
      messageListTop.value = (rect.top || 0) + (viewport.scrollTop || 0)
      updateVirtualRange(viewport.scrollTop || 0, true)
    })
  })
}

const updateChatMessageById = (messageId: number, message: Partial<ChatMessage>) => {
  const index = messages.value.findIndex((msg) => msg.id === messageId)
  if (index < 0) return false

  messages.value.splice(index, 1, {
    ...messages.value[index],
    ...message,
  })
  return true
}

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

const removeLocalMessageByClientMessageId = (clientMessageId: string | undefined) => {
  if (!clientMessageId) return
  const index = messages.value.findIndex((msg) => msg.client_message_id === clientMessageId)
  if (index > -1) {
    messages.value.splice(index, 1)
    rebuildMessagePrefixHeights()
    updateVirtualRange(scrollTop.value, true)
  }
}

const applyMessageDisplayStatus = (payload: MessageStatePayload) => {
  if (!payload.message_id || !payload.display_status) return false

  return updateChatMessageById(payload.message_id, {
    display_status: payload.display_status,
    placeholder: payload.placeholder,
  })
}

const resolveIncomingMessage = (payload: any): ChatMessage | null => {
  const candidateList = [payload?.message, payload?.data?.message, payload]

  for (const candidate of candidateList) {
    if (candidate?.id) {
      return candidate as ChatMessage
    }
  }

  return null
}

const resolveMessageStatePayload = (payload: any) => {
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

const shouldBackfillByRoomSeq = (incomingMessage: ChatMessage) => {
  const lastRoomSeq = getLastRoomSeq()
  if (!lastRoomSeq || !incomingMessage?.room_seq) return false
  return incomingMessage.room_seq > lastRoomSeq + 1
}

const syncLatestMessages = async () => {
  const lastMessageId = getLastMessageId()
  if (lastMessageId) {
    await fetchLatestMessages({
      afterMessageId: Number(lastMessageId),
      scrollToLatest: true,
    })
    return
  }

  await loadHistoryMessages()
}

const backfillMissingMessagesByRoomSeq = async (incomingMessage: ChatMessage) => {
  const lastMessageId = getLastMessageId()
  if (!lastMessageId) return

  await fetchLatestMessages({
    afterMessageId: Number(lastMessageId),
    stopAtMessageId: incomingMessage.id,
    scrollToLatest: false,
  })
}

const upsertChatMessage = async (incomingMessage: ChatMessage, scrollToLatest = false) => {
  if (!incomingMessage?.id) return

  const mergedMessage: ChatMessage = {
    ...incomingMessage,
    local_status: 'sent',
  }

  const existingIndex = messages.value.findIndex((msg) => msg.id === mergedMessage.id)
  if (existingIndex > -1) {
    messages.value.splice(existingIndex, 1, {
      ...messages.value[existingIndex],
      ...mergedMessage,
    })
  } else if (
    mergedMessage.client_message_id &&
    updateChatMessageByClientMessageId(mergedMessage.client_message_id, mergedMessage)
  ) {
    // noop: temporary local message replaced in place
  } else {
    messages.value.push(mergedMessage)
  }

  messages.value = sortMessagesByRoomSeq(messages.value)
  rebuildMessagePrefixHeights()
  updateVirtualRange(scrollTop.value, true)

  if (scrollToLatest) {
    scrollToMessage(incomingMessage.id)
  }

  if (roomDetail.value?.room.id) {
    await markAsRead(roomDetail.value.room.id, incomingMessage.id)
  }
}

const handleIncomingMessage = async (payload: any) => {
  await handleRealtimeEvent('GroupMessageEvent', payload)
}

const handleRealtimeEvent = async (eventName: string, payload: any) => {
  console.log('[GroupChat] realtime event payload', eventName, payload)

  if (payload?.room_id && payload.room_id !== roomDetail.value?.room.id) return

  const message = resolveIncomingMessage(payload)
  const normalizedEventName = eventName.startsWith('.') ? eventName.slice(1) : eventName

  if (normalizedEventName === 'message.created' || normalizedEventName === 'GroupMessageEvent') {
    if (message?.id) {
      if (shouldBackfillByRoomSeq(message)) {
        await backfillMissingMessagesByRoomSeq(message)
      }
      const isSelf = message.sender?.member_id === userStore.userInfo.member_id
      if (!isSelf) {
        await upsertChatMessage(message, true)
      } else if (message.client_message_id) {
        await upsertChatMessage(message, false)
      }
      return
    }

    await syncLatestMessages()
    return
  }

  if (
    normalizedEventName === 'message.state_changed' ||
    normalizedEventName === 'message.reaction_changed'
  ) {
    if (message?.id) {
      await upsertChatMessage(message, false)
      return
    }

    if (normalizedEventName === 'message.state_changed') {
      const statePayload = resolveMessageStatePayload(payload)
      if (statePayload && applyMessageDisplayStatus(statePayload)) {
        return
      }
    }

    await syncLatestMessages()
    return
  }

  if (message?.id) {
    await upsertChatMessage(message, false)
    return
  }

  await syncLatestMessages()
}

const initChatSocketClient = () => {
  if (chatSocketClient.value) return chatSocketClient.value

  chatSocketClient.value = new EchoPrivateChannelClient({
    key: import.meta.env.VITE_WS_APP_KEY || 'libertycats-key',
    wsHost: import.meta.env.VITE_WS_HOST || 'test-app.libertycats.app',
    authEndpoint: import.meta.env.VITE_SERVER_BASEURL.replace('/api', '') + '/broadcasting/auth',
    getToken: () => userStore.userInfo.token || uni.getStorageSync('token'),
    debug: true,
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
    },
    beforeReconnect: async () => {
      await syncLatestMessages()
    },
    onMessage: handleIncomingMessage,
    onAllEvent: (eventName, data) => {
      console.log('[GroupChat] listenToAll event:', eventName, data)
    },
    onSubscribed: (privateChannelName) => {
      console.log('[GroupChat] subscribed channel:', privateChannelName)
    },
    onAuthStart: (payload) => {
      console.log('[GroupChat] start auth request', payload)
    },
    onAuthResponse: (payload) => {
      console.log('[GroupChat] auth response', payload)
    },
    onConnectionConnected: (payload) => {
      console.log('[GroupChat] Echo connected', payload)
    },
    onConnectionDisconnected: () => {
      console.log('[GroupChat] Echo disconnected')
    },
    onConnectionStateChange: (states) => {
      console.log('[GroupChat] Echo state change:', states)
    },
    onConnectionError: (error) => {
      console.error('[GroupChat] Echo connection error:', error)
    },
    onPrivateChannelError: (error) => {
      console.error('[GroupChat] private channel error:', error)
    },
  })

  return chatSocketClient.value
}

const subscribeChatRoomChannel = () => {
  const roomId = roomDetail.value?.room.id
  if (!roomId) return

  const channelName = getPrivateChannelName(roomId)
  console.log('[GroupChat] subscribing channel', {
    roomId,
    channelName,
    privateChannelName: `private-${channelName}`,
  })
  initChatSocketClient().subscribe(channelName)
}

const closeChatSocket = (manual = true) => {
  chatSocketClient.value?.disconnect(manual)
}

const resumeChatAfterForeground = async () => {
  if (!userStore.isLogin) return
  if (roomDetailLoading.value) return

  if (!roomDetail.value?.room.id) {
    await loadRoomDetail()
    return
  }

  await syncLatestMessages()
  await initChatSocketClient().handlePageShow()
  subscribeChatRoomChannel()
}

const loadRoomDetail = async () => {
  if (roomDetailLoading.value) return
  roomDetailLoading.value = true
  try {
    const res = await getChatRoomDetailApi(roomCode.value)
    if (res.code === 1) {
      roomDetail.value = res.data
      routeRoomId.value = res.data.room.id

      // 先加载历史消息，再连接 Echo 私有频道
      await loadHistoryMessages()
      refreshViewportMetrics()
      subscribeChatRoomChannel()
    } else {
      toast.show(res.msg || '加载失败')
    }
  } catch (error) {
    console.error('loadRoomDetail error:', error)
    toast.show('加载失败')
  } finally {
    roomDetailLoading.value = false
  }
}

// 加载历史消息列表
const loadHistoryMessages = async () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return

  try {
    const res = await getChatMessageListApi({
      room_id: roomId,
      limit: 50,
    })
    if (res.code === 1 && res.data) {
      const messageList = res.data.messages || []
      messages.value = sortMessagesByRoomSeq(messageList)
      rebuildMessagePrefixHeights()
      updateVirtualRange(scrollTop.value, true)
      hasMoreHistory.value = res.data.has_more_history === 1
      nextBeforeMessageId.value = res.data.next_before_message_id || null
      console.log(messages.value)

      for (let index = 0; index < messageList.length; index++) {
        const item = messageList[index]
        if (item.message_type === 'image') {
          totalImageCount.value++
        }
      }
      // 加载完历史消息后，标记为已读并滚动到最后一条消息
      if (messageList.length > 0) {
        const lastMessage = messageList[messageList.length - 1]
        // ✅ 滚动到最后一条消息
        nextTick(() => {
          const totalHeight = getTotalMessageHeight()

          scrollTop.value = totalHeight

          updateVirtualRange(totalHeight, true)

          uni.pageScrollTo({
            scrollTop: totalHeight + messageListTop.value,
            duration: 0,
          })
        })
        await markAsRead(roomId, lastMessage.id)
      }
    }
  } catch (error) {
    console.error('loadHistoryMessages error:', error)
  }
}

const scrollToBottomDirect = () => {
  nextTick(() => {
    const totalHeight = getTotalMessageHeight()

    uni.pageScrollTo({
      scrollTop: totalHeight + messageListTop.value,
      duration: 0,
    })
  })
}

const loadMoreHistoryMessages = async () => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId || loadingMoreHistory.value || !hasMoreHistory.value) return

  const beforeMessageId = nextBeforeMessageId.value || getFirstMessageId()
  if (!beforeMessageId) return

  loadingMoreHistory.value = true

  try {
    const anchorSnapshot = await getMessageViewportSnapshot(beforeMessageId)
    const res = await getChatMessageListApi({
      room_id: roomId,
      before_message_id: beforeMessageId,
      limit: 20,
    })

    if (res.code === 1 && res.data) {
      const olderMessages = res.data.messages || []
      hasMoreHistory.value = res.data.has_more_history === 1
      nextBeforeMessageId.value = res.data.next_before_message_id || null

      if (olderMessages.length === 0) return

      const existingMessageIds = new Set(messages.value.map((msg) => msg.id))
      const prependMessages = olderMessages.filter((msg) => !existingMessageIds.has(msg.id))
      if (prependMessages.length === 0) return

      messages.value = sortMessagesByRoomSeq([...prependMessages, ...messages.value])
      rebuildMessagePrefixHeights()
      updateVirtualRange(scrollTop.value, true)
      await keepMessageViewportPosition(beforeMessageId, anchorSnapshot)
    }
  } catch (error) {
    console.error('loadMoreHistoryMessages error:', error)
  } finally {
    loadingMoreHistory.value = false
  }
}

const handleScrollToUpper = async () => {
  await loadMoreHistoryMessages()
}

let scrollTicking = false

onPageScroll((event) => {
  if (scrollTicking || isPageLeaving.value) return

  scrollTicking = true

  raf(() => {
    if (isPageLeaving.value) {
      scrollTicking = false
      return
    }

    scrollTop.value = event.scrollTop

    updateVirtualRange(event.scrollTop, false)

    scrollTicking = false
  })
})

// 标记消息为已读
const markAsRead = async (roomId: number, lastReadMessageId: number) => {
  try {
    const res = await markMessageReadApi(roomId, lastReadMessageId)
    if (res.code === 1) {
      console.log('标记已读成功，未读数:', res.data.unread_count)
      // 可以在这里更新房间详情的未读数
      if (roomDetail.value) {
        roomDetail.value.room.unread_count = res.data.unread_count
      }
    }
  } catch (error) {
    console.error('markAsRead error:', error)
  }
}

// 增量拉取最新消息（WebSocket 收到新消息后调用）
const fetchLatestMessages = async (params?: {
  afterMessageId?: number
  stopAtMessageId?: number
  scrollToLatest?: boolean
}) => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  if (!roomId) return

  try {
    let nextAfterMessageId = params?.afterMessageId
    let shouldContinue = true
    let appendedCount = 0
    let latestPulledMessageId = 0

    while (shouldContinue && nextAfterMessageId) {
      const res = await getChatMessageListApi({
        room_id: roomId,
        after_message_id: nextAfterMessageId,
        limit: 50,
      })

      if (res.code !== 1 || !res.data) break

      const messageList = res.data.messages || []
      if (messageList.length === 0) break

      for (const newMsg of messageList) {
        await upsertChatMessage(newMsg, false)
        latestPulledMessageId = Math.max(latestPulledMessageId, Number(newMsg.id || 0))
      }

      appendedCount += messageList.length

      if (
        params?.stopAtMessageId &&
        messageList.some((message) => Number(message.id) === Number(params.stopAtMessageId))
      ) {
        break
      }

      if (res.data.has_more_latest !== 1 || !res.data.next_after_message_id) {
        shouldContinue = false
        break
      }

      nextAfterMessageId = res.data.next_after_message_id
    }

    if (appendedCount === 0) return

    const lastMessage = messages.value[messages.value.length - 1]
    if (!lastMessage) return

    if (params?.scrollToLatest !== false) {
      scrollToMessage(lastMessage.id)
    }

    await markAsRead(roomId, latestPulledMessageId || lastMessage.id)
  } catch (error) {
    console.error('fetchLatestMessages error:', error)
  }
}
// 防抖
const debouncedCreateCommentRef = ref<(() => Promise<void>) | null>(null)
// 使用 ref 来存储防抖函数的引用
const debouncedCreateComment = ref<(() => Promise<void>) | null>(null)
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
  getAliyunOssConfigApi().then((res) => {
    ossConfig.value = res.data
  })

  // ✅ 加载表情列表
  getCommunityEmotionListByCategoryApi().then((res) => {
    emotionList.value = res.data
    EmotionTool.init(emotionList.value)
  })

  refreshViewportMetrics()
  loadRoomDetail()
  // 确保只初始化一次
  if (!debouncedCreateCommentRef.value) {
    debouncedCreateCommentRef.value = debounce(
      async () => {
        if (sendLoading.value) return
        await sendMsg()
      },
      1000,
      {
        leading: false,
        trailing: true,
      },
    )
  }
})

onHide(() => {
  console.log('onHide')
  chatSocketClient.value?.handlePageHide()
})

onShow(() => {
  resumeChatAfterForeground()
  refreshViewportMetrics()
})

// 在组件卸载时清理防抖函数
onUnmounted(() => {
  chatSocketClient.value?.destroy()
  chatSocketClient.value = null
  if (virtualRangeMeasureTimer) {
    clearTimeout(virtualRangeMeasureTimer)
    virtualRangeMeasureTimer = null
  }
  if (debouncedCreateCommentRef.value) {
    ;(debouncedCreateCommentRef.value as any).cancel()
  }
  if (debouncedCreateComment.value) {
    ;(debouncedCreateComment.value as any).cancel()
  }
})

// 评论内容
const commentContent = ref('')
// 评论发送状态
const sendLoading = ref(false)
const reactionLoadingMap = ref<Record<string, boolean>>({})

const createLocalPendingMessage = (
  clientMessageId: string,
  messageType: ChatMessageType,
  payload: ChatMessagePayload,
) => {
  const roomId = roomDetail.value?.room.id || routeRoomId.value
  const memberId = Number(userStore.userInfo.member_id || 0)
  const now = Math.floor(Date.now() / 1000)

  return {
    id: -Date.now(),
    room_seq: getLastRoomSeq() + 1,
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
      nickname: userStore.userInfo.nickname || 'Me',
      avatar: userStore.userInfo.avatar || '',
      role: roomDetail.value?.speaking.role || 'member',
    },
    is_self: 1 as const,
    client_message_id: clientMessageId,
    local_id: clientMessageId,
    local_status: 'sending' as const,
  } satisfies ChatMessage
}

const insertLocalPendingMessage = (message: ChatMessage) => {
  const shouldStickToBottom = isNearBottom()

  messages.value.push(message)

  if (
    messages.value.length > 1 &&
    messages.value[messages.value.length - 1].room_seq <
      messages.value[messages.value.length - 2].room_seq
  ) {
    messages.value = sortMessagesByRoomSeq(messages.value)
  }

  rebuildMessagePrefixHeights()

  if (shouldStickToBottom) {
    nextTick(() => {
      const totalHeight = getTotalMessageHeight()

      scrollTop.value = totalHeight
      updateVirtualRange(totalHeight, true)

      uni.pageScrollTo({
        scrollTop: totalHeight + messageListTop.value,
        duration: 0,
      })
    })
  } else {
    // 用户不在底部 → 不打扰
    updateVirtualRange(scrollTop.value, true)
  }
}

const markLocalMessageFailed = (clientMessageId: string | undefined) => {
  if (!clientMessageId) return
  updateChatMessageByClientMessageId(clientMessageId, {
    local_status: 'failed',
  })
  rebuildMessagePrefixHeights()
  updateVirtualRange(scrollTop.value, true)
}

/**
 * 发送消息前的完整校验
 * @returns {boolean} 是否通过校验
 */
const validateBeforeSend = (): boolean => {
  // 1. 用户必须登录
  if (userStore.isLogin === false) {
    toast.show(t('common.toast.pleaseLogin'))
    return false
  }

  // 2. 房间必须存在且状态正常
  if (!roomDetail.value?.room) {
    toast.show('群聊信息加载失败')
    return false
  }

  // 检查房间状态（假设 status 为 1 表示正常）
  if (roomDetail.value.room.status !== 1) {
    toast.show('当前群聊已关闭或异常')
    return false
  }

  // 3. 用户必须满足当前群准入条件（由服务端在发送时校验，客户端可做基础提示）
  if (roomDetail.value.access.is_joined !== 1) {
    toast.show('还未加入群聊')
    return false
  }

  // 4. 用户必须已加入群（未加入时服务端可自动补加入，此处仅做提示）
  // 如果 roomDetail 中有成员信息，可以检查是否已加入
  if (roomDetail.value.access.is_accessible !== 1) {
    toast.show('不可进群')
    return false
  }

  // 5. 房间发言模式必须允许该用户发言
  if (roomDetail.value.speaking.can_speak !== 1) {
    toast.show(roomDetail.value.speaking.reason || '当前不可发言')
    return false
  }

  // 6. 用户不能处于个人禁言中
  if (roomDetail.value.speaking.is_member_muted === 1) {
    toast.show(roomDetail.value.speaking.reason || t('group.chat.muted'))
    return false
  }

  // 7. client_message_id 幂等性由 createClientMessageId() 保证，每次生成唯一 ID
  // 该函数使用设备ID + 用户ID + 群ID + 序列号 + UUID v5 确保唯一性

  return true
}

// 发送消息
const sendMsg = async () => {
  // 执行发送前校验
  if (!validateBeforeSend()) {
    return
  }

  // 验证输入
  const text = commentContent.value.trim()
  const hasEmoji = customEmojiList.value.length > 0

  if (!text && !hasEmoji) {
    toast.show(t('common.toast.comment_required'))
    return
  }

  if (sendLoading.value) return
  sendLoading.value = true
  let pendingClientMessageId = ''

  try {
    let messageType: ChatMessageType
    let payload: ChatMessagePayload

    // 根据内容类型确定消息类型和 payload
    // 规则：
    // 1. 单文本、单表情、单图片优先使用对应的基础类型（text、emotion、image）
    // 2. 多段混合内容使用 rich
    if (text && hasEmoji) {
      // 文本 + 表情：多段混合内容，使用 rich 类型
      messageType = 'rich'
      payload = {
        parts: [
          { type: 'text' as const, text },
          ...customEmojiList.value.map((emoji) => ({
            type: 'emotion' as const,
            emotion_id: emoji.id,
          })),
        ],
      }
    } else if (hasEmoji && customEmojiList.value.length === 1 && !text) {
      // 单个表情：使用 emotion 类型
      messageType = 'emotion'
      payload = {
        emotion_id: customEmojiList.value[0].id,
      }
    } else if (hasEmoji && customEmojiList.value.length > 1) {
      // 多个表情：使用 rich 类型
      messageType = 'rich'
      payload = {
        parts: customEmojiList.value.map((emoji) => ({
          type: 'emotion' as const,
          emotion_id: emoji.id,
        })),
      }
    } else if (text) {
      // 纯文本：使用 text 类型
      messageType = 'text'
      payload = { text }
    } else {
      return
    }

    const clientMessageId = createClientMessageId()
    pendingClientMessageId = clientMessageId
    insertLocalPendingMessage(createLocalPendingMessage(clientMessageId, messageType, payload))
    // 使用 HTTP API 发送消息
    console.log(roomDetail.value.room.id, messageType, clientMessageId, payload)
    const res = await sendChatMessageApi(
      roomDetail.value.room.id,
      messageType,
      clientMessageId,
      payload,
    )
    console.log(res)
    commentPopupVisible.value = false
    if (res.code === 1) {
      handleCloseCommentPopup()
      commentContent.value = ''
      customEmojiList.value = []
      await appendChatMessage({
        ...res.data.message,
        client_message_id: res.data.message.client_message_id || clientMessageId,
      })
    } else {
      removeLocalMessageByClientMessageId(clientMessageId)
      toast.show(res.msg || '发送失败')
    }
  } catch (error: any) {
    markLocalMessageFailed(pendingClientMessageId)
    console.error('sendMsg error:', error)
    toast.show(error?.errMsg || error?.message || '发送失败')
  } finally {
    sendLoading.value = false
  }
}

/**
 * ✅ 追加消息到本地列表并标记已读
 */
const appendChatMessage = async (newMsg: ChatMessage) => {
  const shouldStickToBottom = isNearBottom()

  await upsertChatMessage(newMsg, false)

  if (shouldStickToBottom) {
    nextTick(() => {
      const totalHeight = getTotalMessageHeight()

      scrollTop.value = totalHeight
      updateVirtualRange(totalHeight, true)

      uni.pageScrollTo({
        scrollTop: totalHeight + messageListTop.value,
        duration: 0,
      })
    })
  }
}
// 发布评论 end

// 处理键盘和表情切换
const textareaFocus = ref(true)
const currentOpBtn = ref('keyboard')
const changeOpBtn = () => {
  if (currentOpBtn.value === 'keyboard') {
    currentOpBtn.value = 'expression'
    textareaFocus.value = false
  } else {
    currentOpBtn.value = 'keyboard'
    textareaFocus.value = true
  }
}

const commentTextarea = ref()
// 添加一个新的ref来管理焦点状态
const shouldFocus = ref(false)
// 修改showCommentPopup方法
const showCommentPopup = () => {
  // 检查用户是否被禁言
  if (roomDetail.value?.speaking.is_member_muted === 1) {
    toast.show(roomDetail.value.speaking.reason || t('group.chat.muted'))
    return
  }

  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  commentPopupVisible.value = true
  // 重置焦点状态
  shouldFocus.value = false
  customEmojiList.value = []
  currentOpBtn.value = 'keyboard'
  expressionCategory.value = -1

  // 使用nextTick确保DOM更新
  nextTick(() => {
    // 使用setTimeout确保在下一个事件循环中设置焦点
    setTimeout(() => {
      shouldFocus.value = true
    }, 100)
  })
}

// 修改handleCloseCommentPopup方法
const handleCloseCommentPopup = () => {
  commentPopupVisible.value = false
  shouldFocus.value = false
  commentContent.value = ''
}

const keyboardHeight = ref(0)
const textAreaFocus = (e: any) => {
  keyboardHeight.value = e.height
  if (currentOpBtn.value === 'expression') {
    currentOpBtn.value = 'keyboard'
    textareaFocus.value = true
  }

  console.log('textAreaFocus =======================', e, keyboardHeight.value)
}
// 处理键盘和表情切换 end

// 切换表情分类
const expressionCategory = ref(-1)
const changeExpressionCategory = (index: number) => {
  expressionCategory.value = index
}

// 输入emoji表情
const addEmoji = (emoji: string) => {
  commentContent.value += emoji
}

const customEmojiList = ref<{ id: number; url: string }[]>([])
const MAX_UPLOAD_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_UPLOAD_IMAGE_WIDTH = 4096
const MAX_UPLOAD_IMAGE_HEIGHT = 4096
const IMAGE_COMPRESS_QUALITY_STEPS = [85, 70, 55, 40]
const IMAGE_LIMIT_HINT = 'Image must be <= 10MB and <= 4096 x 4096.'

const addCustomEmoji = (src: string, emotionId?: number) => {
  if (!src) return
  if (customEmojiList.value.length >= 5) {
    toast.show(t('social.detail.add_custom_emoji_max5'))
    return
  }
  // 检查是否已存在
  const exists = customEmojiList.value.some((item) => item.url === src)
  if (!exists) {
    customEmojiList.value.push({
      id: emotionId || 0,
      url: src,
    })
  }
}
const deleteCustomEmoji = (src: string) => {
  const index = customEmojiList.value.findIndex((item) => item.url === src)
  if (index !== -1) {
    customEmojiList.value.splice(index, 1)
  }
}
const emotionList = ref<getCommunityEmotionListItem[]>([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)

// ✅ 图片上传工具函数

const getImageInfo = (src: string) => {
  return new Promise<UniApp.GetImageInfoSuccessData>((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: resolve,
      fail: reject,
    })
  })
}

const getFileSize = (filePath: string, fallbackSize = 0) => {
  return new Promise<number>((resolve) => {
    uni.getFileInfo({
      filePath,
      success: (res) => resolve(Number(res.size) || fallbackSize),
      fail: () => resolve(fallbackSize),
    })
  })
}

const getImageExtension = (filePath: string) => {
  const purePath = filePath.split('?')[0]
  const match = purePath.match(/\.([a-zA-Z0-9]+)$/)
  return match?.[1]?.toLowerCase() || 'jpg'
}

const createCompressedImagePath = (filePath: string, quality: number) => {
  const extension = getMimeFromUrl(filePath)
  return `_doc/chat_upload_${Date.now()}_${Math.random().toString(36).slice(2)}_${quality}.${extension}`
}

const calcTargetSize = (width: number, height: number) => {
  const scale = Math.min(1, MAX_UPLOAD_IMAGE_WIDTH / width, MAX_UPLOAD_IMAGE_HEIGHT / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

const isImageWithinLimit = (size: number, width: number, height: number) => {
  return (
    size <= MAX_UPLOAD_IMAGE_SIZE &&
    width <= MAX_UPLOAD_IMAGE_WIDTH &&
    height <= MAX_UPLOAD_IMAGE_HEIGHT
  )
}

const compressImageByUni = (src: string, quality: number) => {
  return new Promise<string>((resolve, reject) => {
    uni.compressImage({
      src,
      quality,
      success: (res) => resolve(res.tempFilePath || src),
      fail: reject,
    })
  })
}

const compressImageForApp = (src: string, width: number, height: number, quality: number) => {
  return new Promise<string>((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus?.zip?.compressImage) {
      reject(new Error('APP-PLUS only'))
      return
    }

    plus.zip.compressImage(
      {
        src,
        dst: createCompressedImagePath(src, quality),
        width: `${width}px`,
        height: `${height}px`,
        quality,
      },
      (event) => resolve(event.target),
      reject,
    )
  })
}

const getMimeFromUrl = (url: string) => {
  if (!url) return 'image/jpeg' // 默认值
  const ext = url.split('?')[0].split('.').pop().toLowerCase()
  return ext || 'jpeg'
}
/**
 * ✅ 处理图片选择（替代 wd-upload）
 */
const handleChooseImage = async () => {
  try {
    // 1. 选择图片
    const chooseRes = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: 1, // 最多选择 1 张
          sizeType: ['compressed'], // 使用压缩图
          sourceType: ['album', 'camera'], // 支持相册和相机
          success: resolve,
          fail: reject,
        })
      },
    )
    console.log(chooseRes)
    if (!chooseRes.tempFilePaths || chooseRes.tempFilePaths.length === 0) {
      return
    }
    const tempFilePath = chooseRes.tempFilePaths[0]
    const tempFileSize = chooseRes.tempFiles?.[0]?.size || 0
    const tempFileType = chooseRes.tempFiles?.[0]?.type || ''
    const tempFileName = chooseRes.tempFiles?.[0]?.name || ''
    // 2. 校验文件大小
    if (tempFileSize > MAX_UPLOAD_IMAGE_SIZE) {
      toast.show(IMAGE_LIMIT_HINT)
      return
    }
    // 3. 获取图片信息
    const imageInfo = await getImageInfo(tempFilePath)
    // 4. 校验图片尺寸
    if (imageInfo.width > MAX_UPLOAD_IMAGE_WIDTH || imageInfo.height > MAX_UPLOAD_IMAGE_HEIGHT) {
      toast.show(IMAGE_LIMIT_HINT)
      return
    }

    // 5. 如果需要压缩，进行压缩
    let finalPath = tempFilePath
    if (!isImageWithinLimit(tempFileSize, imageInfo.width, imageInfo.height)) {
      const targetSize = calcTargetSize(imageInfo.width, imageInfo.height)
      for (const quality of IMAGE_COMPRESS_QUALITY_STEPS) {
        try {
          // #ifdef APP-PLUS
          finalPath = await compressImageForApp(
            tempFilePath,
            targetSize.width,
            targetSize.height,
            quality,
          )
          // #endif
          // #ifndef APP-PLUS
          finalPath = await compressImageByUni(tempFilePath, quality)
          // #endif
          // 重新获取压缩后的图片信息
          const compressedInfo = await getImageInfo(finalPath)
          const compressedSize = await getFileSize(finalPath, tempFileSize)
          if (isImageWithinLimit(compressedSize, compressedInfo.width, compressedInfo.height)) {
            break
          }
        } catch (error) {
          console.error('compress image failed', error)
          continue
        }
      }
    }

    // 6. 上传图片到 OSS
    await uploadImageToOss(finalPath, tempFileType, tempFileName)
  } catch (error) {
    console.error('handleChooseImage error:', error)
    if (error?.errMsg !== 'chooseImage:fail cancel') {
      toast.show('图片选择失败')
    }
  }
}

/**
 * ✅ 上传图片到 OSS 并发送消息
 */
const uploadImageToOss = async (filePath: string, mimeType: string, fileName: string) => {
  if (!ossConfig.value) {
    toast.show('OSS 配置未加载')
    return
  }

  if (!roomDetail.value?.room.id) {
    toast.show('房间信息未加载')
    return
  }

  // 执行发送前校验
  if (!validateBeforeSend()) {
    return
  }

  let pendingClientMessageId = ''
  try {
    uni.showLoading({ title: '上传中...', mask: true })
    const key = `${ossConfig.value.dir}/${fileName}`

    // 2. 获取图片信息
    const imageInfo = await getImageInfo(filePath)
    const fileSize = await getFileSize(filePath)
    const formData = {
      key,
      OSSAccessKeyId: ossConfig.value?.accessKeyId,
      policy: ossConfig.value?.policy,
      signature: ossConfig.value?.signature,
      x_oss_region: ossConfig.value?.region,
      success_action_status: '200', // 将上传成功状态码设置为200，默认状态码为204
    }
    // 3. 上传到 OSS
    const uploadRes = await new Promise<UniApp.UploadFileSuccessCallbackResult>(
      (resolve, reject) => {
        uni.uploadFile({
          url: ossConfig.value.host,
          filePath,
          name: 'file',
          formData,
          success: resolve,
          fail: reject,
        })
      },
    )

    uni.hideLoading()
    if (uploadRes.statusCode !== 200) {
      throw new Error(`上传失败，状态码: ${uploadRes.statusCode}`)
    }
    // 4. 构建图片 URL
    const originalUrl = `${ossConfig.value.host}/${key}`
    // 5. 生成缩略图 URL
    const thumbUrl = getImageUrl(originalUrl, imageInfo.width, imageInfo.height)
    const payload: ChatMessagePayload = {
      url: originalUrl,
      thumb_url: thumbUrl,
      width: imageInfo.width,
      height: imageInfo.height,
      mime: mimeType,
      size: fileSize,
    }
    // 6. 创建客户端消息 ID
    const clientMessageId = createClientMessageId()
    pendingClientMessageId = clientMessageId
    insertLocalPendingMessage(createLocalPendingMessage(clientMessageId, 'image', payload))
    // 7. 构建消息 payload
    const imagePayload: ChatMessagePayload = payload
    // 8. 发送消息
    const res = await sendChatMessageApi(
      roomDetail.value.room.id,
      'image',
      clientMessageId,
      imagePayload,
    )

    if (res.code === 1) {
      await appendChatMessage({
        ...res.data.message,
        client_message_id: res.data.message.client_message_id || clientMessageId,
      })
    } else {
      removeLocalMessageByClientMessageId(clientMessageId)
      toast.show(res.msg || '发送失败')
    }
  } catch (error: any) {
    uni.hideLoading()
    markLocalMessageFailed(pendingClientMessageId)
    console.error('uploadImageToOss error:', error)
    toast.show(error?.message || '图片上传失败')
  }
}

const getReactionKey = (messageId: number, reactionType: string, reactionValue: string) =>
  `${messageId}:${reactionType}:${reactionValue}`

const hasMyReaction = (msg: ChatMessage, reactionType: string, reactionValue: string) => {
  return !!msg.my_reactions?.some(
    (reaction) =>
      reaction.reaction_type === reactionType && reaction.reaction_value === reactionValue,
  )
}

const getReactionDisplay = (reactionValue: string) => {
  if (reactionValue === REACTION_LIKE_VALUE) {
    return '👍'
  }

  return reactionValue
}

const toggleReaction = async (msg: ChatMessage, reactionType: string, reactionValue: string) => {
  if (!msg.id || msg.local_status === 'sending') return

  const action = hasMyReaction(msg, reactionType, reactionValue) ? 'remove' : 'add'
  const loadingKey = getReactionKey(msg.id, reactionType, reactionValue)
  if (reactionLoadingMap.value[loadingKey]) return

  reactionLoadingMap.value[loadingKey] = true
  try {
    const res = await reactChatMessageApi(msg.room_id, msg.id, reactionType, reactionValue, action)
    if (res.code === 1) {
      updateChatMessageById(msg.id, {
        reaction_summary: res.data.reaction_summary || [],
        my_reactions: res.data.my_reactions || [],
      })
      return
    }

    toast.show(res.msg || t('group.chat.reactionFailed'))
  } catch (error: any) {
    console.error('toggleReaction error:', error)
    toast.show(error?.message || t('group.chat.reactionFailed'))
  } finally {
    reactionLoadingMap.value[loadingKey] = false
  }
}

const messages = ref<ChatMessage[]>([])
const visibleMessages = computed(() => {
  if (messages.value.length === 0) return []
  return messages.value.slice(virtualRange.value.start, virtualRange.value.end + 1)
})
const getVisibleMessageIndex = (localIndex: number) => virtualRange.value.start + localIndex
watch(
  () =>
    visibleMessages.value.map(
      (message) =>
        `${message.id}:${message.display_status || 'normal'}:${message.local_status || 'sent'}:${message.reaction_summary?.length || 0}`,
    ),
  () => {
    scheduleVisibleMessageMeasurement()
  },
  { flush: 'post' },
)
const messagePopoverRefs = ref<Record<number, any>>({})
const MESSAGE_RECALL_TIME_LIMIT_SECONDS = 2 * 60

const setMessagePopoverRef = (messageId: number, el: any) => {
  if (!messageId) return
  if (el) {
    messagePopoverRefs.value[messageId] = el
    return
  }

  delete messagePopoverRefs.value[messageId]
}

const getMessageMenuOptions = (msg: ChatMessage): MessageMenuItem[] => {
  const menuOptions: MessageMenuItem[] = [
    {
      content: t('common.copy'),
      action: 'copy',
    },
  ]

  if (canRecallMessage(msg)) {
    menuOptions.push({
      content: t('group.chat.recall'),
      action: 'recall',
    })
  }

  return menuOptions
}

const showMessageContextMenu = (msg: ChatMessage) => {
  return // 先return掉，不上这个功能
  if (msg.display_status === 'recalled') return
  messagePopoverRefs.value[msg.id]?.open?.()
}

const handleMessageMenuClick = ({ item }: { item: MessageMenuItem }, msg: ChatMessage) => {
  switch (item.action) {
    case 'copy':
      handleCopyMessage(msg)
      break
    case 'recall':
      handleRecallMessage(msg)
      break
  }
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
  } else if (msg.message_type === 'image') {
    content = t('group.chat.imageMessage')
  } else if (msg.message_type === 'emotion') {
    content = t('group.chat.emojiMessage')
  } else if (msg.message_type === 'rich') {
    if (msg.payload?.parts) {
      content = msg.payload.parts
        .map((part) => {
          if (part.type === 'text') {
            return part.text
          } else if (part.type === 'emotion') {
            return t('group.chat.emojiMessage')
          } else if (part.type === 'image') {
            return t('group.chat.imageMessage')
          }
          return ''
        })
        .join('')
    }
  } else {
    content = msg.payload?.text || ''
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

const handleReeditRecalledMessage = (msg: ChatMessage) => {
  if (!canReeditRecalledMessage(msg)) return

  commentContent.value = msg.payload?.text || ''
  if (msg.message_type === 'rich') {
    const textParts = msg.payload?.parts?.filter((item) => item.type === 'text') || []
    const emotionParts = msg.payload?.parts?.filter((item) => item.type === 'emotion') || []
    commentContent.value = textParts.map((item) => item.text || '').join('')
    customEmojiList.value = emotionParts
      .map((item) => {
        const emotionInfo = EmotionTool.findById(item.emotion_id)
        if (!emotionInfo) return null
        return {
          id: emotionInfo.id,
          url: emotionInfo.icon,
        }
      })
      .filter((item): item is { id: number; url: string } => !!item)
  } else {
    customEmojiList.value = []
  }
  showCommentPopup()
}

// 撤回消息
const handleRecallMessage = async (msg: ChatMessage) => {
  if (msg.is_self !== 1) {
    toast.show(t('group.chat.cannotRecallOthersMessage'))
    return
  }

  if (!canRecallMessage(msg)) {
    toast.show(t('group.chat.recallTimeExpired'))
    return
  }
  uni.showLoading({ title: '正在撤回' })
  const res = await recallChatMessageApi(msg.room_id, msg.id)
  uni.hideLoading()
  if (res.code === 1) {
    if (
      applyMessageDisplayStatus({
        message_id: res.data.message_id,
        room_id: res.data.room_id,
        room_seq: res.data.room_seq,
        display_status: res.data.display_status,
        placeholder: {
          text: t('group.chat.messageRecalled'),
        },
      })
    ) {
      toast.show(t('group.chat.recallSuccess'))
    }
  } else {
    toast.show(res.msg || t('group.chat.recallFailed'))
  }
}

// 按 room_seq 排序消息列表（升序）
const sortMessagesByRoomSeq = (msgs: ChatMessage[]) => {
  return [...msgs].sort((a, b) => {
    const seqA = a.room_seq ?? 0
    const seqB = b.room_seq ?? 0
    return seqA - seqB
  })
}

// 判断是否应该显示时间分组标记
// 规则：第一条消息或距离上一条消息超过5分钟时显示
const shouldShowTimeDivider = (index: number): boolean => {
  if (index === 0) return true // 第一条消息始终显示

  const currentMsg = messages.value[index]
  const prevMsg = messages.value[index - 1]

  if (!currentMsg?.create_time || !prevMsg?.create_time) return false

  // 计算时间差（秒）
  const timeDiff = currentMsg.create_time - prevMsg.create_time
  const fiveMinutes = 5 * 60 // 5分钟 = 300秒

  return timeDiff >= fiveMinutes
}

let imageLoadTicking = false

const loadedImg = () => {
  loadedImageCount.value++

  if (imageLoadTicking || isPageLeaving.value) return
  imageLoadTicking = true

  setTimeout(() => {
    imageLoadTicking = false
    scheduleVisibleMessageMeasurement()
  }, 100)
}

const handleImageMessageLoaded = (messageId: number) => {
  markImageMessageRendered(messageId)
  loadedImg()
}

const handleEmotionMessageLoaded = (messageId: number, partIndex?: number) => {
  markEmotionMessageRendered(messageId, partIndex)
}

watch(
  () => visibleMessages.value.map((message) => `${message.id}:${message.message_type}`),
  () => {
    visibleMessages.value.forEach((message, localIndex) => {
      if (message.message_type !== 'image') return
      shouldRenderImageMessage(message, getVisibleMessageIndex(localIndex))
    })
  },
  { flush: 'post' },
)

const getMessageViewportSnapshot = (messageId: number | string) => {
  return new Promise<{ top: number; scrollTop: number } | null>((resolve) => {
    nextTick(() => {
      const query = uni.createSelectorQuery()
      query.select(`#msg-row-${messageId}`).boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec((result) => {
        const rect = result?.[0]
        const viewport = result?.[1]
        if (!rect || !viewport) {
          resolve(null)
          return
        }

        resolve({
          top: rect.top || 0,
          scrollTop: viewport.scrollTop || 0,
        })
      })
    })
  })
}

const keepMessageViewportPosition = async (
  messageId: number | string,
  previousSnapshot: { top: number; scrollTop: number } | null,
) => {
  if (!previousSnapshot) return

  const targetIndex = messages.value.findIndex(
    (message) => String(message.id) === String(messageId),
  )
  if (targetIndex < 0) return

  const nextRangeStart = Math.max(0, targetIndex - VIRTUAL_BUFFER_COUNT)
  const nextRangeEnd = Math.min(messages.value.length - 1, targetIndex + VIRTUAL_BUFFER_COUNT)
  virtualRange.value = {
    start: nextRangeStart,
    end: nextRangeEnd,
  }
  virtualTopSpacer.value = getMessageOffsetTop(nextRangeStart)
  const renderedHeight = getMessageOffsetTop(nextRangeEnd + 1) - getMessageOffsetTop(nextRangeStart)
  const totalHeight = getTotalMessageHeight()
  virtualBottomSpacer.value = Math.max(0, totalHeight - virtualTopSpacer.value - renderedHeight)

  const nextSnapshot = await getMessageViewportSnapshot(messageId)
  if (!nextSnapshot) return

  const delta = nextSnapshot.top - previousSnapshot.top
  if (Math.abs(delta) < 1) return

  const targetScrollTop = Math.max(0, nextSnapshot.scrollTop + delta)
  scrollTop.value = targetScrollTop
  uni.pageScrollTo({
    scrollTop: targetScrollTop,
    duration: 0,
  })
}

const scrollToMessage = (messageId: number | string) => {
  const targetIndex = messages.value.findIndex(
    (message) => String(message.id) === String(messageId),
  )
  if (targetIndex < 0) return

  const nextRangeStart = Math.max(0, targetIndex - VIRTUAL_BUFFER_COUNT)
  const nextRangeEnd = Math.min(messages.value.length - 1, targetIndex + VIRTUAL_BUFFER_COUNT)
  virtualRange.value = {
    start: nextRangeStart,
    end: nextRangeEnd,
  }
  virtualTopSpacer.value = getMessageOffsetTop(nextRangeStart)
  const renderedHeight = getMessageOffsetTop(nextRangeEnd + 1) - getMessageOffsetTop(nextRangeStart)
  const totalHeight = getTotalMessageHeight()
  virtualBottomSpacer.value = Math.max(0, totalHeight - virtualTopSpacer.value - renderedHeight)

  nextTick(() => {
    const targetScrollTop =
      messageListTop.value +
      getMessageOffsetTop(targetIndex) -
      Math.max(0, viewportHeight.value * 0.35)
    uni.pageScrollTo({
      scrollTop: Math.max(0, targetScrollTop),
      duration: 0,
    })
  })
}
const EmotionTool = (() => {
  const idMap = new Map()
  const groupMap = new Map()
  const nameMap = new Map()
  /**
   * 初始化数据（只调用一次）
   * @param {Array} groupList 表情分组数组
   */
  function init(groupList) {
    if (!Array.isArray(groupList)) return
    // 清空旧数据
    idMap.clear()
    groupMap.clear()
    nameMap.clear()

    // 构建缓存（一次遍历完成，性能最高）
    groupList.forEach((group) => {
      const groupInfo = {
        id: group.id,
        name: group.name,
        icon: group.icon,
        emotions: [...group.emotions],
      }
      groupMap.set(group.id, groupInfo)

      group.emotions.forEach((emo) => {
        idMap.set(emo.id, emo)
        nameMap.set(emo.name, emo)
      })
    })
  }

  //  按 ID 查找（最快 O(1)）
  function findById(id) {
    return idMap.get(Number(id)) || null
  }
  // 按名称精确查找（O(1)）
  function findByName(name) {
    return nameMap.get(name) || null
  }

  // 获取所有表情（平铺）
  function getAllEmotions() {
    return Array.from(idMap.values())
  }
  //  清空缓存
  function clear() {
    idMap.clear()
    groupMap.clear()
    nameMap.clear()
  }
  return {
    init,
    findById,
    findByName,
    getAllEmotions,
    clear,
  }
})()
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
  background-color: var(--liberty-cats-page-background-color);

  .cnt {
    padding: 40rpx 0;
    flex: 1; /* 撑满剩余高度 */
    display: flex;
    flex-direction: column;
    /* 确保 paddingTop 已经通过 TS 计算并传入，例如 180rpx */
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
        width: 60rpx;
        flex-shrink: 0;
        display: flex;
        justify-content: center;
        align-items: center;
      }
    }
  }
}
.message-list {
  padding: 20rpx 30rpx;
  box-sizing: border-box;
  width: 100%;

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
        flex-shrink: 0;
      }
      .levelIcon {
        position: absolute;
        right: -4rpx;
        bottom: 6rpx;
        width: 28rpx;
        height: 28rpx;
        image {
          width: 100%;
          height: 100%;
        }
      }
    }

    .u-content {
      margin-left: 20rpx;
      max-width: 70%;
      display: flex;
      flex-direction: column;

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
        .message-status {
          justify-content: flex-end;
          text-align: right;
        }
      }
    }
  }
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
  padding-bottom: env(safe-area-inset-bottom);
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
::v-deep .uni-scroll-view {
  height: 100vh;
}
::v-deep .wd-popover__menu {
  display: flex;
  gap: 24rpx;
}
</style>

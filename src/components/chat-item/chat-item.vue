<!-- z-paging聊天item -->

<template>
  <view class="chat-item" :id="'msg-row-' + item.id">
    <text class="chat-time" v-if="item.show_time">
      {{ formatRelativeTime(item.create_time) }}
    </text>
    <view
      :class="{
        'chat-container': true,
        'chat-location-me': item.is_self,
        'is-system': item.message_type === 'system' || item.display_status === 'recalled',
      }"
      class="msg-row"
    >
      <view v-if="item.message_type === 'system'">
        <view class="system-message">
          <!-- <text class="msg-time">{{ formatRelativeTime(msg.create_time) }}</text> -->
          <view class="system-text">
            <view
              v-for="(segItem, segIndex) in item.payload?.segments"
              :key="segIndex"
              :class="{
                user_name: segItem.type === 'user',
              }"
            >
              <!-- {{ segItem.text }} -->
              <text
                v-if="segItem.type === 'user'"
                style="color: #167fff; margin-right: 8rpx"
                @click="handleAvatarClick(item?.payload.params?.member_id)"
              >
                "{{ segItem.text }}"
              </text>
              <text v-else>{{ segItem.text }}</text>
            </view>
            <!-- <view v-for="(segItem, segIndex) in item.payload?.segments" :key="segIndex">
              <text v-if="segItem.type === 'user'" style="color: #167fff; margin-right: 8rpx">
                "{{ segItem.text }}"
              </text>
              <text v-else>{{ segItem.text }}</text>
            </view> -->
          </view>
        </view>
      </view>
      <template v-else>
        <!-- <view class="chat-icon-container">
          <image class="chat-icon" :src="item.sender.avatar" mode="aspectFill" />
        </view> -->
        <view
          class="avatarBox"
          @click="!item.is_self && handleAvatarClick(item?.member_id)"
          @touchstart.stop="handleAvatarTouchStart($event)"
          @touchmove.stop="handleAvatarTouchMove($event)"
          @touchend.stop="handleAvatarTouchEnd"
          @touchcancel.stop="handleAvatarTouchEnd"
        >
          <view class="u-avatar" :style="getAvatarStyle(item?.sender?.avatar || '', 'chat')"></view>
          <view class="levelIcon">
            <view v-if="levelBadgeStyle" class="levelBadge" :style="levelBadgeStyle"></view>
          </view>
        </view>
        <view class="chat-content-container">
          <text
            :class="{
              'chat-user-name': true,
              'chat-location-me': item.is_self,
              is_self: item.is_self,
            }"
          >
            {{ item.is_self ? '' : getMessageSenderDisplayName(item) }}
          </text>
          <view
            class="chat-text-container-super"
            :style="[{ justifyContent: item.is_self ? 'flex-end' : 'flex-start' }]"
          >
            <template v-if="item.message_type === 'text'">
              <view
                :class="{ 'chat-text-container': true, 'chat-text-container-me': item.is_self }"
              >
                <!-- 回复引用 -->
                <view
                  v-if="item.reply_to || item.reply_message"
                  class="reply-ref"
                  @click.stop="handleReplyClick"
                >
                  <text class="reply-ref-name">
                    {{ item.reply_to?.sender_nickname || item.reply_message?.sender?.nickname }}：
                  </text>
                  <wd-img
                    v-if="replyMessageType === 'image'"
                    custom-class="reply-ref-thumb"
                    mode="aspectFill"
                    width="40rpx"
                    height="40rpx"
                    :src="replyMessageThumbUrl"
                    radius="4rpx"
                  />
                  <wd-img
                    v-else-if="replyMessageType === 'emotion'"
                    custom-class="reply-ref-thumb"
                    mode="aspectFill"
                    width="40rpx"
                    height="40rpx"
                    :src="replyMessageEmotionSrc"
                    radius="4rpx"
                  />
                  <text v-else class="reply-ref-content">
                    {{ replyPreviewContent }}
                  </text>
                </view>
                <text :class="{ 'chat-text': true, 'chat-text-me': item.is_self }">
                  {{ item.payload.text }}
                </text>
              </view>
            </template>
            <template v-else-if="item.message_type === 'image'">
              <wd-img
                custom-class="chat-img-custom"
                mode="aspectFill"
                :width="`${getImageMessageBoxSize(item).width}px`"
                :height="`${getImageMessageBoxSize(item).height}px`"
                :src="item.payload.thumb_url"
                :enable-preview="true"
                radius="24rpx"
              />
            </template>
            <template v-else-if="item.message_type === 'emotion'">
              <!-- 有回复引用时需要容器包裹 -->
              <view
                v-if="item.reply_to || item.reply_message"
                :class="{ 'chat-text-container': true, 'chat-text-container-me': item.is_self }"
              >
                <!-- 回复引用 -->
                <view class="reply-ref" @click.stop="handleReplyClick">
                  <text class="reply-ref-name">
                    {{ item.reply_to?.sender_nickname || item.reply_message?.sender?.nickname }}：
                  </text>
                  <wd-img
                    v-if="replyMessageType === 'image'"
                    custom-class="reply-ref-thumb"
                    mode="aspectFill"
                    width="40rpx"
                    height="40rpx"
                    :src="replyMessageThumbUrl"
                    radius="4rpx"
                  />
                  <wd-img
                    v-else-if="replyMessageType === 'emotion'"
                    custom-class="reply-ref-thumb"
                    mode="aspectFill"
                    width="40rpx"
                    height="40rpx"
                    :src="replyMessageEmotionSrc"
                    radius="4rpx"
                  />
                  <text v-else class="reply-ref-content">
                    {{ replyPreviewContent }}
                  </text>
                </view>
                <wd-img
                  custom-class="chat-img-custom"
                  mode="aspectFill"
                  width="140rpx"
                  height="140rpx"
                  :src="
                    item.payload?.emotion_url
                      ? getImageUrl(item.payload?.emotion_url)
                      : getEmotionMessageSrc(item)
                  "
                />
              </view>
              <!-- 无回复时直接渲染 wd-img -->
              <wd-img
                v-else
                custom-class="chat-img-custom"
                mode="aspectFill"
                width="140rpx"
                height="140rpx"
                :src="
                  item.payload?.emotion_url
                    ? getImageUrl(item.payload?.emotion_url)
                    : getEmotionMessageSrc(item)
                "
              />
            </template>
            <view v-else-if="item.message_type === 'rich'" class="rich-item">
              <!-- 回复引用 -->
              <view
                v-if="item.reply_to || item.reply_message"
                class="reply-ref"
                @click.stop="handleReplyClick"
              >
                <text class="reply-ref-name">
                  {{ item.reply_to?.sender_nickname || item.reply_message?.sender?.nickname }}：
                </text>
                <wd-img
                  v-if="replyMessageType === 'image'"
                  custom-class="reply-ref-thumb"
                  mode="aspectFill"
                  width="40rpx"
                  height="40rpx"
                  :src="replyMessageThumbUrl"
                  radius="4rpx"
                />
                <wd-img
                  v-else-if="replyMessageType === 'emotion'"
                  custom-class="reply-ref-thumb"
                  mode="aspectFill"
                  width="40rpx"
                  height="40rpx"
                  :src="replyMessageEmotionSrc"
                  radius="4rpx"
                />
                <text v-else class="reply-ref-content">
                  {{ replyPreviewContent }}
                </text>
              </view>
              <view v-for="(richItem, index) in item.payload?.parts" :key="index">
                <template v-if="richItem.type === 'text'">
                  <view>
                    <text :class="{ 'chat-text': true, 'chat-text-me': richItem.is_self }">
                      {{ richItem.text }}
                    </text>
                  </view>
                </template>
                <view v-else-if="richItem.type === 'emotion'">
                  <wd-img
                    custom-class="chat-img-custom"
                    mode="aspectFill"
                    width="140rpx"
                    height="140rpx"
                    :src="
                      richItem?.emotion_url
                        ? getImageUrl(richItem?.emotion_url)
                        : getRichEmotionMessageSrc(richItem.emotion_id)
                    "
                  />
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>
      <view class="filled-icon">
        <wd-icon
          name="error-circle-filled"
          size="22px"
          @click.stop="retryFailedMessage(item)"
          color="#FF0000"
          v-if="item.local_status === 'failed'"
        ></wd-icon>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getImageUrl, toUrl, formatRelativeTime, getChatImageUrl } from '@/utils'
import {
  getAvatarStyle,
  getAvatarCacheStats,
  getLevelBadgeStyle,
  preloadAvatarUrls,
  preloadLevelBadgeUrls,
} from '@/utils/avatarCache'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['retry', 'mention', 'reply-click'])
const { t } = useI18n()

const props = defineProps({
  item: {
    type: Object,
    default: () => ({}),
  },
})

// 处理回复引用点击
const handleReplyClick = () => {
  const replyMessageId = props.item.reply_to?.message_id || props.item.reply_message?.id
  if (replyMessageId) {
    emit('reply-click', replyMessageId)
  }
}

// 回复引用预览内容：根据被回复消息的类型展示对应内容
const replyPreviewContent = computed(() => {
  const replyTo = props.item.reply_to
  const replyMessage = props.item.reply_message

  // reply_to.content 非空时直接使用（包括 [图片]、[表情] 等占位文本）
  if (replyTo?.content) {
    return replyTo.content
  }

  // reply_message 存在时根据消息类型生成预览
  if (replyMessage) {
    const messageType = replyMessage.message_type
    if (messageType === 'text') {
      return replyMessage.payload?.text || ''
    } else if (messageType === 'image') {
      return t('group.chat.imageMessage')
    } else if (messageType === 'emotion') {
      return t('group.chat.emojiMessage')
    } else if (messageType === 'rich' && replyMessage.payload?.parts) {
      return replyMessage.payload.parts
        .filter((part: any) => part.type === 'text' && !!part.text)
        .map((part: any) => part.text || '')
        .join('')
    }
  }

  return ''
})

// 被回复消息的类型（仅 reply_message 存在时可获取）
const replyMessageType = computed(() => {
  return props.item.reply_message?.message_type || ''
})

// 被回复消息的图片缩略图URL
const replyMessageThumbUrl = computed(() => {
  const replyMessage = props.item.reply_message
  if (!replyMessage) return ''
  return replyMessage.payload?.thumb_url || replyMessage.payload?.url || ''
})

// 被回复消息的表情图URL
const replyMessageEmotionSrc = computed(() => {
  const replyMessage = props.item.reply_message
  if (!replyMessage) return ''
  if (replyMessage.payload?.emotion_url) {
    return getImageUrl(replyMessage.payload.emotion_url)
  }
  return getEmotionMessageSrc(replyMessage)
})

const getMessageSenderDisplayName = (msg: ChatMessage) => {
  const nickname = msg.sender?.nickname || ''
  if (!isMessageSenderRemoved(msg)) return nickname
  return `${nickname}${t('group.chat.memberRemovedLabel')}`
}
const isMessageSenderRemoved = (msg: ChatMessage) => {
  return Number(msg.sender?.member_status || 0) === 3
}
const roomMemberMap = ref<Record<number, ChatMember>>({})

const levelBadgeStyle = computed(() => getLevelBadgeStyle(props.item?.sender?.level?.level))

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
const getEmotionMessageSrc = (message: ChatMessage) => {
  return getImageUrl(EmotionTool.findById(message.payload?.emotion_id)?.icon)
}

const getRichEmotionMessageSrc = (emotionId?: number) => {
  return getImageUrl(EmotionTool.findById(emotionId)?.icon)
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

const retryFailedMessage = (msg) => {
  emit('retry', msg)
}

// 头像长按 @提及

let avatarLongPressTimer: ReturnType<typeof setTimeout> | null = null
let avatarLongPressStartX = 0
let avatarLongPressStartY = 0
let avatarLongPressMoved = false
const AVATAR_LONG_PRESS_DURATION_MS = 450
const AVATAR_LONG_PRESS_MOVE_THRESHOLD_PX = 10

const handleAvatarTouchStart = (event: any) => {
  if (props.item.is_self) return
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  if (!touch) return
  avatarLongPressStartX = Number(touch.clientX || touch.pageX || 0)
  avatarLongPressStartY = Number(touch.clientY || touch.pageY || 0)
  avatarLongPressMoved = false
  if (avatarLongPressTimer) clearTimeout(avatarLongPressTimer)
  avatarLongPressTimer = setTimeout(() => {
    avatarLongPressTimer = null
    if (avatarLongPressMoved) return
    const memberId = props.item.sender?.member_id
    const nickname = props.item.sender?.nickname || ''
    if (!memberId) return
    emit('mention', { member_id: memberId, nickname })
  }, AVATAR_LONG_PRESS_DURATION_MS)
}

const handleAvatarTouchMove = (event: any) => {
  if (!avatarLongPressTimer) return
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  if (!touch) return
  const deltaX = Math.abs(Number(touch.clientX || touch.pageX || 0) - avatarLongPressStartX)
  const deltaY = Math.abs(Number(touch.clientY || touch.pageY || 0) - avatarLongPressStartY)
  if (
    deltaX >= AVATAR_LONG_PRESS_MOVE_THRESHOLD_PX ||
    deltaY >= AVATAR_LONG_PRESS_MOVE_THRESHOLD_PX
  ) {
    avatarLongPressMoved = true
    clearTimeout(avatarLongPressTimer)
    avatarLongPressTimer = null
  }
}

const handleAvatarTouchEnd = () => {
  if (avatarLongPressTimer) {
    clearTimeout(avatarLongPressTimer)
    avatarLongPressTimer = null
  }
}
// ✅ 点击头像查看用户主页
const handleAvatarClick = (memberId: number | undefined) => {
  console.log(memberId)
  if (!memberId) return
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}
</script>

<style scoped lang="scss">
@import '/src/style/base';
@import '/src/style/social';

// 聊天字体混入
@mixin chat-font {
  font-size: 28rpx;
  font-family: Alibaba PuHuiTi2 !important;
}
@mixin chat-font-important {
  font-size: 28rpx !important;
  font-family: Alibaba PuHuiTi2 !important;
}

:deep(.zh-Hans, .zh-Hant) {
  @include chat-font-important;
  .wd-backtop__backicon {
    font-family: wd-icons !important;
  }
}
.page {
  height: 100vh;
  overflow: hidden;
  background-color: var(--liberty-cats-page-background-color);
  display: flex;
  flex-direction: column;
}

.chat-item {
  display: flex;
  flex-direction: column;
  padding: 12rpx;
  @include chat-font-important;

  // 覆盖全局 .zh-Hans * 的 Alimama FangYuanTi VF
  :deep(*) {
    font-family: Alibaba PuHuiTi2 !important;
  }
}
.chat-time {
  padding: 4rpx 0rpx;
  text-align: center;
  // font-size: 22rpx;
  @include chat-font;
  color: #aaaaaa;
}
.chat-container {
  display: flex;
  flex-direction: row;
}
.chat-location-me {
  flex-direction: row-reverse;
  text-align: right;
}
.is_self {
  display: none;
}
.chat-icon-container {
  margin-top: 12rpx;
}
.chat-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #eeeeee;
}
.chat-content-container {
  margin: 0rpx 15rpx;
  flex: 1;
  min-width: 0;
}
.chat-user-name {
  @include chat-font;
  color: #888888;
}
.chat-text-container {
  text-align: left;
  background-color: #f1f1f1;
  border-radius: 8rpx;
  padding: 10rpx 15rpx;
  margin-top: 10rpx;
  /* #ifndef APP-NVUE */
  max-width: 500rpx;
  /* #endif */
  background-color: #ffffff;
  padding: 20rpx 28rpx;
  /* 他人消息气泡圆角：左上角为小圆角，其余大圆角 */
  border-radius: 8rpx 30rpx 30rpx 30rpx;
  // font-size: 26rpx;
  @include chat-font;
  line-height: 1.5;
  color: #1a1a1a;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  word-break: break-all;
  display: inline-block;
  max-width: 90%;
}
.rich-item {
  background-color: #f1f1f1;
  border-radius: 8rpx;
  padding: 10rpx 15rpx;
  flex-direction: column;
}
.chat-text-container-me {
  background-color: var(--liberty-cats-primary-color);
  // background-color: #007aff;
  border-radius: 30rpx 8rpx 30rpx 30rpx !important;
}
/* 回复引用样式 */
.reply-ref {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  margin-bottom: 12rpx;
  background-color: rgba(0, 0, 0, 0.06);
  border-radius: 8rpx;
  border-left: 4rpx solid #ccc;
  overflow: hidden;
  max-width: 100%;

  :deep(.reply-ref-thumb) {
    flex-shrink: 0;
    border-radius: 4rpx;
  }
}
.chat-text-container-me .reply-ref {
  background-color: rgba(255, 255, 255, 0.2);
  border-left-color: rgba(255, 255, 255, 0.5);
}
.reply-ref-name {
  font-size: 22rpx;
  color: #999;
  flex-shrink: 0;
}
.chat-text-container-me .reply-ref-name {
  color: rgba(255, 255, 255, 0.7);
}
.reply-ref-content {
  font-size: 22rpx;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.chat-text-container-me .reply-ref-content {
  color: rgba(255, 255, 255, 0.85);
}
/* 自己的消息气泡往右挪，减小右侧间距 */
.chat-location-me .chat-content-container {
  margin-right: 4rpx;
}
.chat-text-container-super {
  display: flex;
  flex-direction: row;
}
.chat-text {
  // font-size: 28rpx;
  @include chat-font;
  /* #ifndef APP-NVUE */
  word-break: break-all;
  /* #endif */
  /* #ifdef APP-NVUE */
  max-width: 500rpx;
  /* #endif */
}
.chat-text-me {
  color: white;
}

.msg-row {
  display: flex;
  margin-bottom: 16rpx;
  .filled-icon {
    display: flex;
    align-items: center;
  }
  // 系统消息样式：居中显示
  &.is-system {
    justify-content: center;
    align-items: center;

    .system-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8rpx;
      // max-width: 80%;

      &.recalled-message {
        width: 100%;
        max-width: 100%;
      }

      .system-text {
        @include chat-font;
        color: #999;
        text-align: center;
        line-height: 1.5;
        word-break: break-all;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
        gap: 12rpx;
        .user_name {
          color: #167fff;
          margin-right: 8rpx;
        }
      }

      .reedit-btn {
        color: #167fff;
      }

      .msg-time {
        // font-size: 20rpx;
        @include chat-font;
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
      @include chat-font;
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
        @include chat-font;
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
        @include chat-font;
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
      @include chat-font;
      line-height: 1;
    }

    .reaction-count {
      // font-size: 22rpx;
      @include chat-font;
      line-height: 1;
    }

    .message-status {
      margin-top: 10rpx;
      // font-size: 22rpx;
      @include chat-font;
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
      @include chat-font;
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
</style>

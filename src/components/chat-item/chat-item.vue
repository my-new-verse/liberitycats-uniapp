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
            v-if="!isNewsMessageType(item.message_type)"
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
            <!-- 新闻卡片 -->
            <view
              v-else-if="
                item.message_type === 'news_card' && item.payload.card_type === 'hourly_news_digest'
              "
              class="news-wrapper"
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
              </view>
              <view class="news-top-row">
                <text class="chat-user-name">{{ getMessageSenderDisplayName(item) }}</text>
                <view
                  v-if="
                    item.payload?.card_type === 'hourly_flash_digest' ||
                    item.payload?.card_type === 'daily_flash_digest' ||
                    item.payload?.card_type === 'hourly_news_digest' ||
                    item.payload?.card_type === 'daily_news_digest' ||
                    item.payload?.card_type === 'hourly_important_news_digest' ||
                    item.payload?.card_type === 'daily_important_flash_digest' ||
                    item.payload?.card_type === 'news_collection'
                  "
                  class="news-card-header-row"
                >
                  <text class="news-card-header-text">
                    {{ t('common.scheduled_push') }} /
                    {{ item.payload?.category || t('common.news') }}
                  </text>
                </view>
              </view>
              <view class="news-card">
                <view class="news-card-body">
                  <template v-if="item.payload?.items?.length">
                    <view
                      v-for="(newsItem, newsIndex) in item.payload?.items"
                      :key="newsIndex"
                      class="news-digest-item"
                    >
                      <view v-if="newsItem?.cover" class="news-digest-cover">
                        <image
                          :src="newsItem.cover"
                          mode="aspectFill"
                          class="news-digest-cover-img"
                        />
                      </view>
                      <view class="news-digest-content">
                        <view v-if="newsItem?.category" class="news-digest-category">
                          {{ newsItem.category }}
                        </view>
                        <text class="news-digest-title">{{ newsItem?.title || '' }}</text>
                        <text class="news-digest-summary">{{ newsItem?.summary || '' }}</text>
                        <view class="news-digest-footer">
                          <text class="news-digest-source">
                            {{ newsItem?.source || '' }}{{ newsItem?.source ? ' • ' : ''
                            }}{{ formatRelativeTime(newsItem?.published_at) }}
                          </text>
                          <text
                            class="news-digest-read-more"
                            @click.stop="handleNewsCardClick(newsItem)"
                          >
                            {{ t('common.read_full_text') }} →
                          </text>
                        </view>
                      </view>
                    </view>
                  </template>
                  <view v-else class="news-digest-empty">
                    <text class="news-digest-empty-title">{{ item.payload?.title || '' }}</text>
                  </view>
                </view>
              </view>
            </view>
            <!-- 热点新闻卡片 -->
            <view
              v-else-if="
                item.message_type === 'news_card' &&
                (item.payload.card_type === 'hourly_important_news_digest' ||
                  item.payload.card_type === 'daily_important_flash_digest')
              "
              class="news-wrapper"
            >
              <view class="news-top-row">
                <text class="chat-user-name">{{ getMessageSenderDisplayName(item) }}</text>
                <view
                  v-if="
                    item.payload?.card_type === 'hourly_flash_digest' ||
                    item.payload?.card_type === 'daily_flash_digest' ||
                    item.payload?.card_type === 'hourly_news_digest' ||
                    item.payload?.card_type === 'daily_news_digest' ||
                    item.payload?.card_type === 'hourly_important_news_digest' ||
                    item.payload?.card_type === 'daily_important_flash_digest' ||
                    item.payload?.card_type === 'news_collection'
                  "
                  class="news-card-header-row"
                >
                  <text class="news-card-header-text">
                    {{ t('common.scheduled_push') }} /
                    {{ item.payload?.category || t('common.hot_news') }}
                  </text>
                </view>
              </view>
              <view class="news-card">
                <view class="news-card-body">
                  <template v-if="item.payload?.items?.length">
                    <view
                      v-for="(newsItem, newsIndex) in item.payload?.items"
                      :key="newsIndex"
                      class="hot-news-item"
                      @click.stop="handleNewsCardClick(newsItem)"
                    >
                      <view v-if="newsItem?.cover" class="hot-news-cover">
                        <image :src="newsItem.cover" mode="aspectFill" class="hot-news-cover-img" />
                      </view>
                      <view class="hot-news-content">
                        <text class="news-card-title">{{ newsItem?.title || '' }}</text>
                        <text class="news-card-summary">{{ newsItem?.summary || '' }}</text>
                        <view class="hot-news-footer">
                          <text class="hot-news-source">
                            {{ newsItem?.source || '' }}{{ newsItem?.source ? ' • ' : ''
                            }}{{ formatRelativeTime(newsItem?.published_at) }}
                          </text>
                          <text
                            class="hot-news-read-more"
                            @click.stop="handleNewsCardClick(newsItem)"
                          >
                            {{ t('common.read_full_text') }} →
                          </text>
                        </view>
                      </view>
                    </view>
                  </template>
                  <view v-else class="hot-news-empty">
                    <text class="hot-news-empty-title">{{ item.payload?.title || '' }}</text>
                  </view>
                </view>
              </view>
            </view>
            <!-- 快讯卡片 -->
            <view
              v-else-if="
                item.message_type === 'news_card' &&
                item.payload.news_type === 'news' &&
                item.payload.card_type === 'news_collection'
              "
              class="news-wrapper"
            >
              <view class="news-top-row">
                <text class="chat-user-name">{{ getMessageSenderDisplayName(item) }}</text>
                <view
                  v-if="
                    !(item.reply_to || item.reply_message) &&
                    (item.payload?.card_type === 'hourly_flash_digest' ||
                      item.payload?.card_type === 'daily_flash_digest' ||
                      item.payload?.card_type === 'hourly_news_digest' ||
                      item.payload?.card_type === 'daily_news_digest' ||
                      item.payload?.card_type === 'hourly_important_news_digest' ||
                      item.payload?.card_type === 'daily_important_flash_digest' ||
                      item.payload?.card_type === 'news_collection')
                  "
                  class="news-card-header-row"
                  style="position: absolute; top: 0; right: 0"
                >
                  <text class="news-card-header-text">{{ t('common.scheduled_push') }}</text>
                </view>
              </view>
              <view class="news-card">
                <view class="quick-news-body">
                  <!-- 回复引用 -->
                  <view
                    v-if="item.reply_to || item.reply_message"
                    class="reply-ref"
                    @click.stop="handleReplyClick"
                  >
                    <text class="reply-ref-name">
                      {{ item.reply_to?.sender_nickname || item.reply_message?.sender?.nickname }}：
                    </text>
                    <text class="reply-ref-content">
                      {{ replyPreviewContent }}
                    </text>
                  </view>

                  <!-- 卡片标题和更新时间 -->
                  <view v-if="item.payload?.items?.length" class="quick-news-header">
                    <view class="quick-news-title-row">
                      <view v-if="item.payload?.category" class="quick-news-category-badge">
                        {{ item.payload.category }}
                      </view>
                      <text class="quick-news-title">
                        {{ item.payload?.title || t('common.tonight_news') }}
                      </text>
                    </view>
                    <text class="quick-news-update-time">
                      {{ item.payload?.updateTime || t('common.reverse_time_order') }}
                    </text>
                  </view>

                  <!-- wd-cell 展示快讯列表 -->
                  <wd-cell-group
                    v-if="item.payload?.items?.length"
                    :border="false"
                    custom-class="quick-news-cell-group"
                  >
                    <wd-cell
                      v-for="(newsItem, newsIndex) in item.payload?.items"
                      :key="newsIndex"
                      :title="newsItem.title"
                      is-link
                      custom-class="quick-news-cell"
                      @click="handleNewsCardClick(newsItem)"
                    />
                  </wd-cell-group>
                  <view v-else class="quick-news-empty">
                    <text class="quick-news-empty-title">{{ item.payload?.title || '' }}</text>
                  </view>
                </view>
              </view>
            </view>
            <!-- 快讯卡片（时间线样式） -->
            <view
              v-else-if="
                (item.message_type === 'news_card' &&
                  item.payload.news_type === 'flash' &&
                  item.payload.card_type === 'news_collection') ||
                item.payload.card_type === 'hourly_flash_digest' ||
                item.payload.card_type === 'daily_flash_digest'
              "
              class="news-wrapper"
            >
              <view class="news-top-row">
                <text class="chat-user-name">{{ getMessageSenderDisplayName(item) }}</text>
                <view
                  v-if="
                    !(item.reply_to || item.reply_message) &&
                    (item.payload?.card_type === 'hourly_flash_digest' ||
                      item.payload?.card_type === 'daily_flash_digest' ||
                      item.payload?.card_type === 'hourly_news_digest' ||
                      item.payload?.card_type === 'daily_news_digest' ||
                      item.payload?.card_type === 'hourly_important_news_digest' ||
                      item.payload?.card_type === 'daily_important_flash_digest' ||
                      item.payload?.card_type === 'news_collection')
                  "
                  class="news-card-header-row"
                  style="position: absolute; top: 0; right: 0"
                >
                  <text class="news-card-header-text">{{ t('common.scheduled_push') }}</text>
                </view>
              </view>
              <view class="news-card">
                <view class="quick-news-body">
                  <!-- 回复引用 -->
                  <view
                    v-if="item.reply_to || item.reply_message"
                    class="reply-ref"
                    @click.stop="handleReplyClick"
                  >
                    <text class="reply-ref-name">
                      {{ item.reply_to?.sender_nickname || item.reply_message?.sender?.nickname }}：
                    </text>
                    <text class="reply-ref-content">
                      {{ replyPreviewContent }}
                    </text>
                  </view>

                  <!-- 卡片标题和更新时间 -->
                  <view v-if="item.payload?.items?.length" class="quick-news-header">
                    <view class="quick-news-title-row">
                      <view v-if="item.payload?.category" class="quick-news-category-badge">
                        {{ item.payload.category }}
                      </view>
                      <text class="quick-news-title">
                        {{ item.payload?.title || t('common.tonight_news') }}
                      </text>
                    </view>
                    <text class="quick-news-update-time">
                      {{ item.payload?.updateTime || t('common.reverse_time_order') }}
                    </text>
                  </view>
                  <!-- wd-steps 时间线展示快讯列表 -->
                  <wd-steps
                    v-if="item.payload?.items?.length"
                    :active="item.payload.items.length"
                    vertical
                    dot
                    custom-class="quick-news-steps"
                  >
                    <wd-step
                      v-for="(newsItem, newsIndex) in item.payload?.items"
                      :key="newsIndex"
                      status="finished"
                    >
                      <template #title>
                        <view
                          class="quick-news-timeline-item"
                          @click.stop="handleNewsCardClick(newsItem)"
                        >
                          <text class="quick-news-timeline-time">
                            {{ formatRelativeTime(newsItem?.published_at) }}
                          </text>
                          <text class="quick-news-timeline-title">{{ newsItem.title }}</text>
                        </view>
                      </template>
                    </wd-step>
                  </wd-steps>
                  <view v-else class="quick-news-empty">
                    <text class="quick-news-empty-title">{{ item.payload?.title || '' }}</text>
                  </view>

                  <!-- 底部全部快讯 -->
                  <view
                    v-if="item.payload?.items?.length"
                    class="quick-news-footer"
                    @click.stop="handleViewAllNews(item)"
                  >
                    <text class="quick-news-footer-text">
                      {{ item.payload?.viewAllText || t('common.view_all_flash') + ' ›' }}
                    </text>
                  </view>
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

const isNewsMessageType = (type: string) => {
  return type === 'news' || type === 'hot_news' || type === 'news_card'
}

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

// news_card 单条点击跳转新闻详情
const handleNewsCardClick = (newsItem: any) => {
  const newsId = newsItem?.news_id
  if (!newsId) return
  toUrl(`/pages/cats/news/detail?id=${newsId}`)
}

// 查看全部快讯
const handleViewAllNews = (item: any) => {
  const url = item?.payload?.viewAllUrl
  if (url) {
    toUrl(url)
    return
  }
  // 跳转到发现页新闻tab，子tab设置为全部快讯
  uni.$emit('switchToNewsTabFromChat')
  uni.switchTab({
    url: '/pages/tabbar/discover',
  })
}

// 头像长按 @提及

let avatarLongPressTimer: ReturnType<typeof setTimeout> | null = null
let avatarLongPressStartX = 0
let avatarLongPressStartY = 0
let avatarLongPressMoved = false
let avatarLongPressTriggered = false // 长按是否已触发（用于阻止后续合成 click 跳转主页）
const AVATAR_LONG_PRESS_DURATION_MS = 450
const AVATAR_LONG_PRESS_MOVE_THRESHOLD_PX = 10

const handleAvatarTouchStart = (event: any) => {
  if (props.item.is_self) return
  const touch = event?.touches?.[0] || event?.changedTouches?.[0]
  if (!touch) return
  avatarLongPressStartX = Number(touch.clientX || touch.pageX || 0)
  avatarLongPressStartY = Number(touch.clientY || touch.pageY || 0)
  avatarLongPressMoved = false
  avatarLongPressTriggered = false
  if (avatarLongPressTimer) clearTimeout(avatarLongPressTimer)
  avatarLongPressTimer = setTimeout(() => {
    avatarLongPressTimer = null
    if (avatarLongPressMoved) return
    avatarLongPressTriggered = true
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
  // 长按已触发 @提及时，阻止后续合成 click 跳转主页
  if (avatarLongPressTriggered) {
    avatarLongPressTriggered = false
    return
  }
  if (!memberId) return

  // 如果用户已删除，禁止跳转到用户主页
  if (props.item?.sender?.is_deleted === 1) {
    uni.showToast({
      title: '该用户已注销',
      icon: 'none',
    })
    return
  }

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
  // 恢复 wd-icon 的图标字体，避免被 :deep(*) 覆盖导致图标不显示
  :deep(.wd-icon) {
    font-family: wd-icons !important;
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
  color: var(--chat-user-name-color);
}
.chat-text-container {
  text-align: left;
  background-color: var(--chat-text-container-bg-color);
  border-radius: 8rpx;
  padding: 10rpx 15rpx;
  margin-top: 10rpx;
  /* #ifndef APP-NVUE */
  max-width: 500rpx;
  /* #endif */
  background-color: var(--bg-card);
  padding: 20rpx 28rpx;
  /* 他人消息气泡圆角：左上角为小圆角，其余大圆角 */
  border-radius: 8rpx 30rpx 30rpx 30rpx;
  // font-size: 26rpx;
  @include chat-font;
  line-height: 1.5;
  color: var(--chat-text-color);
  box-shadow: 0 2rpx 10rpx var(--black-03);
  word-break: break-all;
  display: inline-block;
  max-width: 90%;
}
.rich-item {
  background-color: var(--chat-text-container-bg-color);
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
  background-color: var(--reply-ref-bg-color);
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
  color: var(--text-secondary);
  flex-shrink: 0;
}
.chat-text-container-me .reply-ref-name {
  color: rgba(255, 255, 255, 0.7);
}
.reply-ref-content {
  font-size: 22rpx;
  color: var(--wot-message-box-content-color);
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
        color: var(--text-secondary);
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
      background-color: var(--userFilterHeader-border-color);
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
      color: var(--chat-user-name-color);
      margin-bottom: 8rpx;
      margin-left: 8rpx;
    }

    .bubble-wrap {
      display: inline-block;
      max-width: 100%;

      .text-bubble {
        background-color: var(--bg-card);
        padding: 20rpx 28rpx;
        /* 他人消息气泡圆角：左上角为小圆角，其余大圆角 */
        border-radius: 8rpx 30rpx 30rpx 30rpx;
        @include chat-font;
        line-height: 1.5;
        color: var(--chat-text-color);
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
        color: var(--text-secondary);
        background-color: var(--wot-action-sheet-active-color);
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
      color: var(--wot-message-box-content-color);

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
      color: var(--text-secondary);

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
          color: var(--bg-card);
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

::v-deep {
  .chat-img-custom {
    width: 100%;
    height: 100%;
    border-radius: 16rpx;
    display: block;
    margin-top: 18rpx;
  }
}

/* ========== 新闻卡片样式 ========== */
.news-wrapper {
  display: flex;
  flex-direction: column;
  margin-top: 10rpx;
  width: 100%;
  max-width: 100%;
}

.news-top-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
  position: relative; /* 用于绝对定位右上角 badge */
  justify-content: space-between;
}

.news-card-header-row {
  display: inline-flex;
  background-color: var(--liberty-cats-primary-color, #ff6b03);
  padding: 4rpx 16rpx;
  border-radius: 8rpx;

  .news-card-header-text {
    font-size: 22rpx;
    color: var(--bg-card);
    font-weight: 500;
  }
}

.news-card {
  // width: 520rpx;
  background-color: var(--bg-card);
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}

.news-card-body {
  padding: 24rpx;
}

/* 新闻 digest 列表项 */
.news-digest-item {
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid var(--divider-color);

  &:last-child {
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: none;
  }
}

/* 空状态 */
.news-digest-empty,
.hot-news-empty,
.quick-news-empty {
  padding: 20rpx 0;
  text-align: center;
}

.news-digest-empty-title,
.hot-news-empty-title,
.quick-news-empty-title {
  font-size: 28rpx;
  color: var(--text-secondary);
}

.news-digest-cover {
  width: 100%;
  height: 280rpx;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 16rpx;

  .news-digest-cover-img {
    width: 100%;
    height: 100%;
  }
}

.news-digest-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.news-digest-category {
  display: inline-flex;
  align-self: flex-start;
  background-color: var(--liberty-cats-primary-color, #ff6b03);
  color: var(--bg-card);
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
  margin-bottom: 4rpx;
}

.news-digest-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--chat-text-color);
  line-height: 1.4;
}

.news-digest-summary {
  font-size: 24rpx;
  color: var(--wot-message-box-content-color);
  line-height: 1.5;
}

.news-digest-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--divider-color);
}

.news-digest-source {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.news-digest-read-more {
  font-size: 24rpx;
  color: var(--liberty-cats-primary-color, #ff6b03);
  font-weight: 500;
}

/* 新闻卡片横向布局 */
.news-card-content {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.news-card-thumb {
  flex-shrink: 0;
  width: 176rpx;
  height: 188rpx;
  border-radius: 12rpx;
  overflow: hidden;
  background-color: var(--wot-action-sheet-active-color);

  .news-card-thumb-img {
    width: 100%;
    height: 100%;
  }

  .news-card-thumb-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, #f0f0f0, #e0e0e0);
  }
}

.news-card-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.news-card-tag-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
}

.news-card-tag {
  font-size: 20rpx;
  color: var(--liberty-cats-primary-color, #ff6b03);
  background-color: rgba(255, 107, 3, 0.1);
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
  flex-shrink: 0;
}

.news-card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--chat-text-color);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.news-card-source {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.news-card-arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-left: 12rpx;

  .news-card-arrow-icon {
    font-size: 40rpx;
    color: #ccc;
    font-weight: 300;
    line-height: 1;
  }
}

.hot-news-source-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 4rpx;

  .news-card-read-more {
    font-size: 22rpx;
    color: var(--liberty-cats-primary-color, #ff6b03);
    font-weight: 500;
    flex-shrink: 0;
  }
}

.news-card-summary {
  font-size: 24rpx;
  color: var(--wot-message-box-content-color);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.news-card-footer {
  padding-top: 16rpx;
  margin-top: 16rpx;
  border-top: 1rpx solid var(--divider-color);

  .news-card-read-more {
    font-size: 24rpx;
    color: var(--liberty-cats-primary-color, #ff6b03);
    font-weight: 500;
  }
}

/* 热点新闻 */
.hot-news-item {
  padding-bottom: 24rpx;
  margin-bottom: 24rpx;
  border-bottom: 1rpx solid var(--divider-color);

  &:last-child {
    padding-bottom: 0;
    margin-bottom: 0;
    border-bottom: none;
  }
}

.hot-news-cover {
  width: 100%;
  height: 280rpx;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  background-color: #1a1a2e;

  .hot-news-cover-img {
    width: 100%;
    height: 100%;
  }

  .hot-news-cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #1a1a2e, #16213e);

    .hot-news-cover-label {
      font-size: 36rpx;
      font-weight: 800;
      color: var(--bg-card);
      letter-spacing: 4rpx;
    }
  }
}

.hot-news-content {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.hot-news-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid var(--divider-color);
}

.hot-news-source {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.hot-news-read-more {
  font-size: 24rpx;
  color: var(--liberty-cats-primary-color, #ff6b03);
  font-weight: 500;
}

.quick-news-body {
  text-align: left;
  background-color: var(--bg-card);
  padding: 20rpx 28rpx;
  border-radius: 8rpx 30rpx 30rpx 30rpx;
  @include chat-font;
  line-height: 1.5;
  color: var(--chat-text-color);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  word-break: break-all;
  max-width: 90%;
}

/* 快讯头部 */
.quick-news-header {
  margin-bottom: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.quick-news-header {
  margin-bottom: 16rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid var(--divider-color);
}

.quick-news-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.quick-news-category-badge {
  display: inline-flex;
  background-color: var(--liberty-cats-primary-color, #ff6b03);
  color: var(--bg-card);
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.quick-news-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--chat-text-color);
}

.quick-news-update-time {
  font-size: 22rpx;
  color: var(--text-secondary);
}

.quick-news-summary {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin-bottom: 16rpx;
}

.quick-news-card-type {
  font-size: 20rpx;
  font-weight: 500;
  color: var(--liberty-cats-primary-color, #ff6b03);
  line-height: 1.4;
  max-width: 80%;
  margin-top: 4rpx;
}

.quick-news-info {
  font-size: 22rpx;
  color: var(--text-secondary);
  margin: 16rpx 0;
}

/* wd-cell 快讯列表覆盖样式 */
:deep(.quick-news-cell-group) {
  background: transparent !important;
  // border-top: 1px solid #eeeef0;
  .wd-cell {
    background: transparent !important;
    padding: 12rpx 0 !important;

    .wd-cell__wrapper {
      padding: 0 !important;
      align-items: center !important;
    }

    .wd-cell__left {
      flex: 1 !important;
      margin-right: 0 !important;
      min-width: 90% !important;
    }

    .wd-cell__title {
      font-size: 28rpx !important;
      font-weight: 400 !important;
      color: var(--chat-text-color) !important;
      line-height: 1.5;
    }

    .wd-cell__value {
      display: none !important;
    }

    .wd-cell__arrow-right {
      font-size: 24rpx !important;
      color: #ccc !important;
    }

    &:last-child {
      .wd-cell__wrapper::after {
        display: none;
      }
    }
  }
}

/* wd-steps 时间线快讯样式 */
:deep(.quick-news-steps) {
  .wd-step {
    .wd-step__content {
      margin-left: 20rpx;
      padding-bottom: 24rpx;
      width: 100%;
    }

    .wd-step__title {
      width: 100%;
    }

    .wd-step__dot {
      width: 16rpx;
      height: 16rpx;
      background: var(--liberty-cats-primary-color, #ff6b03);
    }

    .wd-step__line {
      background: #e0e0e0;
    }

    &:last-child {
      .wd-step__content {
        padding-bottom: 0;
      }
    }
  }
}

.quick-news-timeline-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  margin-left: 12rpx;
}

.quick-news-timeline-time {
  font-size: 24rpx;
  font-weight: 500;
  color: var(--liberty-cats-primary-color, #ff6b03);
}

.quick-news-timeline-title {
  font-size: 28rpx;
  font-weight: 400;
  color: var(--chat-text-color);
  line-height: 1.5;
}

.quick-news-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  // border-top: 1rpx solid #f0f0f0;
  display: flex;
  justify-content: flex-end;

  .quick-news-footer-text {
    font-size: 24rpx;
    color: var(--liberty-cats-primary-color, #ff6b03);
  }
}
</style>

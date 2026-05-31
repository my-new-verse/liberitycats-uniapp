<!-- z-paging聊天item -->

<template>
  <view class="chat-item">
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
              {{ segItem.text }}
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
        <view class="avatarBox" @click="!item.is_self && handleAvatarClick(msg?.member_id)">
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
            {{ item.sender.nickname }}
          </text>
          <view
            class="chat-text-container-super"
            :style="[{ justifyContent: item.is_self ? 'flex-end' : 'flex-start' }]"
          >
            <template v-if="item.message_type === 'text'">
              <view
                :class="{ 'chat-text-container': true, 'chat-text-container-me': item.is_self }"
              >
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
            </template>
            <view v-else-if="item.message_type === 'rich'" class="rich-item">
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
const emit = defineEmits(['retry'])

const props = defineProps({
  item: {
    type: Object,
    default: () => ({}),
  },
})

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
</script>

<style scoped lang="scss">
@import '/src/style/base';
@import '/src/style/social';

:deep(.zh-Hans, .zh-Hant) {
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
  font-family:
    Alimama FangYuanTi VF,
    sans-serif;
}
.chat-time {
  padding: 4rpx 0rpx;
  text-align: center;
  font-size: 22rpx;
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
}
.chat-user-name {
  font-size: 26rpx;
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
  font-size: 28rpx;
  line-height: 1.5;
  color: #1a1a1a;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  word-break: break-all;
  display: inline-block;
  max-width: 100%;
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
}
.chat-text-container-super {
  display: flex;
  flex-direction: row;
}
.chat-text {
  font-size: 28rpx;
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
  margin-bottom: 28rpx;
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
        .user_name {
          color: #167fff;
          margin-right: 8rpx;
        }
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
</style>

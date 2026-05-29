<template>
  <view class="chat-input-bar-container">
    <view class="fixedCommentBox" style="padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx)">
      <!-- ✅ 使用原生 uni.chooseImage 替代 wd-upload -->
      <view
        class="upload-icon-btn"
        :class="{ 'is-disabled': canspeak !== 1 }"
        @click="canspeak === 1 && handleChooseImage()"
      >
        <wd-icon name="picture" size="22px" :color="canspeak !== 1 ? '#ccc' : '#666'"></wd-icon>
      </view>
      <view
        class="commentTextArea"
        :class="{ 'is-muted': canspeak !== 1 }"
        @click="canspeak === 1 && showCommentPopup()"
      >
        {{ canspeak !== 1 ? canSpeakReason : t('social.detail.comment.placeholder') }}
      </view>
    </view>
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
            :maxlength="300"
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
              :disabled="canspeak !== 1"
              @click.stop="handleSendButtonClick"
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
              <image :src="getCachedEmotionUrl(undefined, item.icon)" mode="heightFix" />
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
                @click="sendExpressionEmoji(item.id)"
              >
                <image :src="getCachedEmotionUrl(item.id, item.icon)" mode="heightFix" />
              </view>
            </template>
          </scroll-view>
        </view>
      </view>
      <view class="commentHidden" :style="{ height: `${keyboardHeight}px` }"></view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch, onMounted } from 'vue'
import { getChatImageUrl } from '@/utils'
import { ChatMessagePayload } from '@/service/api/groupChat'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '@/store'
import {
  getCommunityEmotionListItem,
  getCommunityEmotionListByCategoryApi,
} from '@/service/api/community'
import { defaultEmojiList } from '@/utils/defaultEmojiList'
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'
import { getCachedEmotionUrl } from '@/utils/chatAssetCache'
import { initEmotionTool } from '@/utils/emotionTool'

const emit = defineEmits(['sendMsg'])
const { t } = useI18n()
const userStore = useUserStore()
const commentPopupVisible = ref(false)
const canspeak = ref(1)
const canSpeakReason = ref('')
const commentContent = ref('')
const textareaFocus = ref(true)
const currentOpBtn = ref('keyboard')
const shouldFocus = ref(false)
const emotionList = ref<getCommunityEmotionListItem[]>([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)
const customEmojiList = ref<{ id: number; url: string }[]>([])
const props = defineProps({
  roomDetail: {
    type: Object,
    required: true, // 必传
  },
})
// 切换表情分类
const expressionCategory = ref(-1)
const changeExpressionCategory = (index: number) => {
  expressionCategory.value = index
}
const addEmoji = (emoji: string) => {
  commentContent.value += emoji
}

const changeOpBtn = () => {
  if (currentOpBtn.value === 'keyboard') {
    currentOpBtn.value = 'expression'
    textareaFocus.value = false
  } else {
    currentOpBtn.value = 'keyboard'
    textareaFocus.value = true
  }
}
const showCommentPopup = () => {
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
}
let auxiliaryPreloadPromise: Promise<void> | null = null
const ensureAuxiliaryDataLoaded = () => {
  if (auxiliaryPreloadPromise) return auxiliaryPreloadPromise

  auxiliaryPreloadPromise = Promise.allSettled([
    ossConfig.value
      ? Promise.resolve()
      : getAliyunOssConfigApi().then((res) => {
          ossConfig.value = res.data
        }),
    emotionList.value.length > 0
      ? Promise.resolve()
      : getCommunityEmotionListByCategoryApi().then((res) => {
          emotionList.value = res.data
          initEmotionTool(emotionList.value)
        }),
  ]).then(() => undefined)

  return auxiliaryPreloadPromise
}
let lastSendTriggerAt = 0
const handleSendButtonClick = () => {
  const now = Date.now()
  if (now - lastSendTriggerAt < 200) return
  lastSendTriggerAt = now
  commentPopupVisible.value = false
  doSend('text', { text: commentContent.value })
}

const sendExpressionEmoji = async (emotionId?: number) => {
  if (!emotionId) return
  const payload: ChatMessagePayload = { emotion_id: emotionId }
  commentPopupVisible.value = false
  doSend('emotion', payload)
}
const doSend = (type, payload) => {
  commentPopupVisible.value = false
  shouldFocus.value = false
  commentContent.value = ''
  customEmojiList.value = []
  emit('sendMsg', type, payload)
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
    toast.show(t('group.chat.groupInfoLoadFailed'))
    return false
  }

  // 检查房间状态（假设 status 为 1 表示正常）
  if (roomDetail.value.room.status !== 1) {
    toast.show(t('group.chat.groupClosedOrAbnormal'))
    return false
  }

  // 3. 用户必须满足当前群准入条件（由服务端在发送时校验，客户端可做基础提示）
  if (roomDetail.value.access.is_joined !== 1) {
    toast.show(t('group.chat.notJoined'))
    return false
  }

  // 4. 用户必须已加入群（未加入时服务端可自动补加入，此处仅做提示）
  // 如果 roomDetail 中有成员信息，可以检查是否已加入
  if (roomDetail.value.access.is_accessible !== 1) {
    toast.show(t('group.chat.notAccessible'))
    return false
  }

  // 5. 房间发言模式必须允许该用户发言
  if (roomDetail.value.speaking.can_speak !== 1) {
    toast.show(roomDetail.value.speaking.reason || t('group.chat.cannotSpeak'))
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
onMounted(() => {
  ensureAuxiliaryDataLoaded()
})
</script>

<style scoped lang="scss">
.fixedCommentBox {
  display: flex;
  align-items: center;
  gap: 24rpx;
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
</style>

<template>
  <view class="chat-input-bar-container">
    <view class="fixedCommentBox" style="padding-bottom: calc(env(safe-area-inset-bottom) + 24rpx)">
      <!-- ✅ 使用原生 uni.chooseImage 替代 wd-upload -->
      <view
        class="upload-icon-btn"
        :class="{ 'is-disabled': cannotSpeak }"
        @click="!cannotSpeak && handleChooseImage()"
      >
        <wd-icon name="picture" size="22px" :color="cannotSpeak ? '#ccc' : '#666'"></wd-icon>
      </view>
      <view
        class="commentTextArea"
        :class="{ 'is-muted': cannotSpeak }"
        @click="!cannotSpeak && showCommentPopup()"
      >
        {{ inputPlaceholder }}
      </view>
    </view>

    <!-- <wd-backtop :scrollTop="scrollTop"></wd-backtop> -->
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
              :disabled="cannotSpeak"
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
                @click="sendExpressionEmoji(item.id, item.icon)"
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
</template>

<script setup lang="ts">
import { ref, nextTick, computed, watch, onMounted } from 'vue'
import { debounce } from 'lodash-es'
import { getImageUrl, toUrl, formatRelativeTime, getChatImageUrl } from '@/utils'
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
import { useToast } from 'wot-design-uni'

const emit = defineEmits(['sendMsg'])
const { t } = useI18n()
const userStore = useUserStore()
const commentPopupVisible = ref(false)
const canspeak = ref(1)
const canSpeakReason = ref('')
const commentContent = ref('')
const mentionedUsers = ref<Map<number, string>>(new Map()) // memberId → nickname
const textareaFocus = ref(true)
const currentOpBtn = ref('keyboard')
const shouldFocus = ref(false)
const emotionList = ref<getCommunityEmotionListItem[]>([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)
const customEmojiList = ref<{ id: number; url: string }[]>([])
const toast = useToast()

const props = defineProps({
  roomDetail: {
    type: [Object, null],
    required: true, // 必传
  },
  /** WS 实时禁言状态（当前用户被禁言时为 true） */
  selfMuted: {
    type: Boolean,
    default: false,
  },
  /** WS 实时禁言原因 */
  selfMuteReason: {
    type: String,
    default: '',
  },
})
const { roomDetail, selfMuted, selfMuteReason } = toRefs(props)

/** 综合判断是否可发言：优先 WS 实时禁言，再 fallback 到 roomDetail */
const cannotSpeak = computed(() => {
  if (selfMuted.value) return true
  return roomDetail.value?.speaking?.can_speak !== 1
})

/** 当前展示在输入框的提示文案 */
const inputPlaceholder = computed(() => {
  if (selfMuted.value) return selfMuteReason.value || t('group.chat.muted')
  if (roomDetail.value?.speaking?.can_speak !== 1)
    return roomDetail.value?.speaking?.reason || t('group.chat.muted')
  return t('social.detail.comment.placeholder')
})
console.log('roomDetail', roomDetail.value)
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

const commentTextarea = ref()

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

  // console.log('textAreaFocus =======================', e, keyboardHeight.value)
}

const MAX_UPLOAD_IMAGE_SIZE = 10 * 1024 * 1024
const MAX_UPLOAD_IMAGE_WIDTH = 4096
const MAX_UPLOAD_IMAGE_HEIGHT = 4096
const IMAGE_COMPRESS_QUALITY_STEPS = [85, 70, 55, 40]
const IMAGE_LIMIT_HINT = t('group.chat.imageLimitHint')

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
          // 预解析所有表情和分类图标 URL，避免切换分类时反复调用 getCachedEmotionUrl
          emotionList.value.forEach((cat) => {
            ;(cat as any)._cachedUrl = getCachedEmotionUrl(cat.id, cat.icon)
            cat.emotions.forEach((emotion) => {
              ;(emotion as any)._cachedUrl = getCachedEmotionUrl(emotion.id, emotion.icon)
            })
          })
        }),
  ]).then(() => undefined)

  return auxiliaryPreloadPromise
}

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
  const extension = getImageExtension(filePath)
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
  const extension = getImageExtension(url)
  const normalizedExtension = extension === 'jpg' ? 'jpeg' : extension
  return `image/${normalizedExtension}`
}

const normalizeImageMimeType = (filePath: string, mimeType?: string) => {
  if (typeof mimeType === 'string' && mimeType.startsWith('image/')) {
    return mimeType
  }
  return getMimeFromUrl(filePath)
}

const stripImageExtensionFromUrl = (url: string) => {
  return url.replace(/\.(png|jpe?g|webp|gif|bmp|heic|heif)$/i, '')
}

const getFileNameFromPath = (filePath: string) => {
  const normalizedPath = filePath.split('?')[0] || filePath
  const pathSegments = normalizedPath.split('/')
  const rawFileName = stripImageExtensionFromUrl(pathSegments[pathSegments.length - 1] || '')

  if (rawFileName) {
    return rawFileName
  }

  const extension = getImageExtension(filePath)
  return `chat-image-${Date.now()}.${extension}`
}

const resolveUploadFileName = (filePath: string, fileName?: string) => {
  const normalizedFileName = (fileName || '').trim()
  if (normalizedFileName) return normalizedFileName
  return getFileNameFromPath(filePath)
}

/**
 * ✅ 处理图片选择
 */
const handleChooseImage = async () => {
  if (!validateBeforeSend()) {
    return
  }

  try {
    const chooseRes = await new Promise<UniApp.ChooseImageSuccessCallbackResult>(
      (resolve, reject) => {
        uni.chooseImage({
          count: 1,
          sizeType: ['compressed'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        })
      },
    )

    if (!chooseRes.tempFilePaths || chooseRes.tempFilePaths.length === 0) {
      return
    }
    const tempFilePath = chooseRes.tempFilePaths[0]
    const tempFileSize = chooseRes.tempFiles?.[0]?.size || 0
    const tempFileType = normalizeImageMimeType(tempFilePath, chooseRes.tempFiles?.[0]?.type || '')
    const tempFileName = resolveUploadFileName(tempFilePath, chooseRes.tempFiles?.[0]?.name)

    if (tempFileSize > MAX_UPLOAD_IMAGE_SIZE) {
      toast.show(IMAGE_LIMIT_HINT)
      return
    }

    const imageInfo = await getImageInfo(tempFilePath)
    if (imageInfo.width > MAX_UPLOAD_IMAGE_WIDTH || imageInfo.height > MAX_UPLOAD_IMAGE_HEIGHT) {
      toast.show(IMAGE_LIMIT_HINT)
      return
    }

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
          const compressedInfo = await getImageInfo(finalPath)
          const compressedSize = await getFileSize(finalPath, tempFileSize)
          if (isImageWithinLimit(compressedSize, compressedInfo.width, compressedInfo.height)) {
            break
          }
        } catch (error) {
          continue
        }
      }
    }

    await uploadImageToOss(finalPath, normalizeImageMimeType(finalPath, tempFileType), tempFileName)
  } catch (error) {
    if (error?.errMsg !== 'chooseImage:fail cancel') {
      // 用户取消不报错
    }
  }
}
/**
 * 生成基于用户 ID 的唯一标识（用于上传文件名）
 * @param userId 用户 ID（数字或字符串）
 * @returns 唯一字符串，格式如：`{userId}_{timestamp}_{random}`
 */
function generateUniqueIdWithUser(): string {
  const timestamp = Date.now() // 毫秒级时间戳
  const randomStr = Math.random().toString(36).substring(2, 10) // 随机 8 位字母数字
  return `${userStore.userInfo?.member_id || ''}_${timestamp}_${randomStr}`
}
/**
 * ✅ 上传图片到 OSS 并发送消息
 */
const uploadImageToOss = async (filePath: string, mimeType: string, fileName: string) => {
  if (!ossConfig.value) {
    toast.show(t('group.chat.ossConfigNotLoaded'))
    return
  }

  if (!roomDetail.value?.room?.id) {
    toast.show(t('group.chat.roomInfoNotLoaded'))
    return
  }

  try {
    uni.showLoading({ title: t('group.chat.uploading'), mask: true })
    const resolvedFileName = resolveUploadFileName(filePath, fileName)
    const uniqueId = generateUniqueIdWithUser()

    const key = `${ossConfig.value?.dir}/${uniqueId}_${resolvedFileName}` // 图片上传到oss的路径(拼接你的文件夹和文件名)

    const imageInfo = await getImageInfo(filePath)
    const fileSize = await getFileSize(filePath)
    const formData = {
      key,
      OSSAccessKeyId: ossConfig.value?.accessKeyId,
      policy: ossConfig.value?.policy,
      signature: ossConfig.value?.signature,
      x_oss_region: ossConfig.value?.region,
      success_action_status: '200',
    }

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
      throw new Error(
        t('group.chat.uploadFailedStatusCode', {
          statusCode: uploadRes.statusCode,
        }),
      )
    }

    const originalUrl = `${ossConfig.value.host}/${key}`
    const thumbUrl = getChatImageUrl(originalUrl, imageInfo.width, imageInfo.height)
    const normalizedMimeType = normalizeImageMimeType(filePath, mimeType)
    const payload = {
      url: originalUrl,
      thumb_url: thumbUrl,
      width: imageInfo.width,
      height: imageInfo.height,
      mime: normalizedMimeType,
      size: fileSize,
    }

    doSend('image', payload)
  } catch (error: any) {
    uni.hideLoading()
    toast.show(error?.message || t('group.chat.uploadImageFailed'))
  }
}

let lastSendTriggerAt = 0
const handleSendButtonClick = () => {
  if (commentContent.value.trim() === '') {
    toast.show(t('group.chat.empty_message'))
    return
  }
  const now = Date.now()
  if (now - lastSendTriggerAt < 200) return
  lastSendTriggerAt = now

  const mentionedIds =
    mentionedUsers.value.size > 0 ? Array.from(mentionedUsers.value.keys()) : undefined
  const payload: any = { text: commentContent.value.trim() }

  doSend('text', payload, mentionedIds)
  commentContent.value = ''
}

const sendExpressionEmoji = async (emotionId?: number, emotionUrl: string) => {
  if (!emotionId) return
  const payload: ChatMessagePayload = { emotion_id: emotionId, emotion_url: emotionUrl }
  commentPopupVisible.value = false
  doSend('emotion', payload)
}
const doSend = (type, payload, mentioned_member_ids?: number[]) => {
  commentPopupVisible.value = false
  shouldFocus.value = false
  commentContent.value = ''
  customEmojiList.value = []
  mentionedUsers.value.clear()
  emit('sendMsg', type, payload, mentioned_member_ids)
}

/**
 * 接受外部 @提及调用，将 @nickname 插入到输入框并记录 memberId
 */
const addMention = (memberId: number, nickname: string) => {
  if (!memberId || !nickname) return
  mentionedUsers.value.set(memberId, nickname)
  const prefix = commentContent.value.trimEnd()
  commentContent.value = prefix ? `${prefix} @${nickname} ` : `@${nickname} `
  showCommentPopup()
}
defineExpose({ addMention })
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

  // 6. 用户不能处于个人禁言中（优先 WS 实时禁言）
  if (selfMuted.value) {
    toast.show(selfMuteReason.value || t('group.chat.muted'))
    return false
  }
  if (roomDetail.value?.speaking?.is_member_muted === 1) {
    toast.show(roomDetail.value.speaking.reason || t('group.chat.muted'))
    return false
  }

  // 7. client_message_id 幂等性由 createClientMessageId() 保证，每次生成唯一 ID
  // 该函数使用设备ID + 用户ID + 群ID + 序列号 + UUID v5 确保唯一性

  return true
}
const getEmotionImageUrl = (emotion) => {
  // 优先使用预缓存的本地 URL
  if (emotion._cachedUrl) return emotion._cachedUrl
  // 如果未缓存，使用原 URL 并触发缓存
  const cached = getCachedEmotionUrl(emotion.id, emotion.icon)
  if (cached !== emotion.icon) {
    emotion._cachedUrl = cached
    return cached
  }
  return emotion.icon
}
onLoad(() => {
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

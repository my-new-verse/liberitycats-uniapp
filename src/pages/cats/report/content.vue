<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>
<template>
  <view>
    <custom-nav2 :title="t('report.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="container">
          <view class="componentContent">
            <view class="section-title">{{ t('report.select_reason') }}</view>
            <view class="section">
              <view
                v-for="item in reasonList"
                :key="item.value"
                class="reason-item"
                @click="selectedReason = item.value"
              >
                <view class="reason-left" :class="{ active: selectedReason === item.value }">
                  {{ item.label }}
                </view>

                <view class="radio">
                  <view class="radio-inner" v-if="selectedReason === item.value" />
                </view>
              </view>
            </view>

            <view class="section-title">{{ t('report.remark') }}</view>

            <view class="fake-textarea" @click="showCommentPopup">
              <view class="textarea-content" v-if="description">
                {{ description }}
              </view>
              <view class="textarea-placeholder" v-else>
                {{ t('report.remarkPlaceholder') }}
              </view>
              <view class="count">{{ description.length || 0 }}/500</view>
            </view>

            <view class="notice-box">
              <view class="notice-icon"></view>
              <view class="notice-text">{{ t('report.notice_text') }}</view>
            </view>
          </view>
        </view>
      </template>
      <template #footer>
        <view class="fixedCommentBox" style="padding-bottom: env(safe-area-inset-bottom)">
          <view
            class="commentTextArea"
            @click="handleSubmit()"
            :class="{ active: selectedReason && !submitLoading }"
            :disabled="submitLoading"
          >
            <text v-if="!submitLoading">{{ t('report.submit_title') }}</text>
            <text v-else>{{ t('common.processing') }}</text>
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
                v-model="content"
                :placeholder="t('report.remarkPlaceholder')"
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
            </view>

            <view class="opBarBox" style="justify-content: end">
              <wd-button
                type="primary"
                custom-class="sendCommentBtn"
                @click.stop="inputCompleted()"
              >
                {{ t('report.done') }}
              </wd-button>
            </view>
          </view>
          <view class="commentHidden" :style="{ height: `${keyboardHeight}px` }"></view>
        </wd-popup>
      </template>
    </custom-nav2>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'
import { t } from '@/locale'
import { getImageUrl } from '@/utils'
import { CommunityReportReason, reportPostApi } from '@/service/api/community'

const postId = ref<number>(0)
const commentPopupVisible = ref(false)
const commentTextarea = ref()

const selectedReason = ref('')
// 添加一个新的ref来管理焦点状态
const shouldFocus = ref(false)
const keyboardHeight = ref(0)
// 评论内容
const content = ref('')
const description = ref('')
const reportType = ref<'post' | 'comment' | undefined>()

const submitLoading = ref(false)
const isSubmitting = ref(false)

const reasonList = [
  { label: t('report.reason_spam_ad'), value: 'spam_ad' },
  { label: t('report.reason_pornographic'), value: 'pornographic' },
  { label: t('report.reason_violence'), value: 'violence' },
  { label: t('report.reason_illegal'), value: 'illegal' },
  { label: t('report.reason_fraud'), value: 'fraud' },
  { label: t('report.reason_harassment'), value: 'harassment' },
  { label: t('report.reason_misinformation'), value: 'misinformation' },
  { label: t('report.reason_infringement'), value: 'infringement' },
  { label: t('report.reason_other'), value: 'other' },
]

onLoad((options) => {
  if (options?.id) {
    postId.value = options.id // 获取帖子id
    reportType.value = options.type
  }
})

// 完成输入
const inputCompleted = () => {
  description.value = content.value
  handleCloseCommentPopup()
}

// 提交举报
const handleSubmit = async () => {
  if (isSubmitting.value) return

  if (!selectedReason.value) {
    uni.showToast({
      title: '请选择举报原因',
      icon: 'none',
    })
    return
  }

  isSubmitting.value = true
  submitLoading.value = true
  uni.showLoading({ mask: true })

  try {
    const res = await reportPostApi({
      target_type: reportType.value,
      target_id: postId.value,
      reason: selectedReason.value as CommunityReportReason,
      description: description.value,
    })

    if (res.code === 1) {
      uni.showToast({
        title: t('common.submit_success'),
        icon: 'success',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    } else {
      uni.showToast({
        title: res.msg || t('common.operationFailed'),
        icon: 'none',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1000)
    }
  } catch (err) {
    uni.showToast({
      title: t('common.request.network.error'),
      icon: 'none',
    })
  } finally {
    isSubmitting.value = false
    submitLoading.value = false
    uni.hideLoading()
  }
}

const textAreaFocus = (e: any) => {
  keyboardHeight.value = e.height
}

// 文本域
const showCommentPopup = () => {
  content.value = description.value
  commentPopupVisible.value = true
  // 重置焦点状态
  shouldFocus.value = false
  // 使用nextTick确保DOM更新
  nextTick(() => {
    // 使用setTimeout确保在下一个事件循环中设置焦点
    setTimeout(() => {
      shouldFocus.value = true
    }, 100)
  })
}

const handleCloseCommentPopup = () => {
  commentPopupVisible.value = false
  shouldFocus.value = false
  content.value = ''
}
</script>

<style scoped lang="scss">
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

:deep(.commentPopup) {
  padding: 32rpx;
  padding-bottom: 32rpx !important;
  border-radius: 32rpx 32rpx 0 0 !important;
  .uni-textarea-wrapper {
    max-height: 200rpx;
    overflow-y: scroll;
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
  }

  .pubCommentBox {
    .commentTextAreaBox {
      background-color: #f3f3f4 !important;
      border-radius: 32rpx;
    }
  }

  .pubCommentTextArea {
    min-height: 160rpx;
    padding: 24rpx !important;
    padding-bottom: 0 !important;
    background-color: #f3f3f4 !important;
    border-radius: 32rpx;
  }
  .commentHidden {
    width: 100%;
    background-color: #fff;
  }
}
.page {
  padding-bottom: 120rpx;
  .cnt {
    padding: 0;
  }
}

.componentContent {
  padding: 40rpx;
}

.section {
  background: #fff;
  border-radius: 24rpx;
  padding: 0 24rpx;
  margin-bottom: 40rpx;
}

.section-text {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.notice-box {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background-color: #fff9e6;
  padding: 24rpx;
  border-radius: 24rpx;
  margin-top: 40rpx;
}

.notice-icon {
  width: 32rpx;
  height: 32rpx;
  background-image: url('@/static/images/tips.png');
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.notice-text {
  flex: 1;
  font-size: 28rpx;
  line-height: 1.5;
  color: #333;
}

.section-title {
  font-size: 28rpx;
  font-weight: 400;
  line-height: 33rpx;
  color: #999999;
  margin-bottom: 24rpx;
}

.reason-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f2f2f2;

  &:last-child {
    border-bottom: none;
  }
}

.reason-left {
  font-size: 28rpx;
  color: #333;
}

.radio {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-inner {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: #ff6b03;
}

.pubCommentTextArea {
  min-height: 160rpx !important;
  padding: 24rpx !important;
  padding-bottom: 0 !important;
  background-color: #fff !important;
  border-radius: 24rpx;
}

:deep(.is-show-limit) {
  min-height: 160rpx !important;
}

:deep(.wd-textarea__inner) {
  min-height: 100rpx !important;
}

.count {
  margin-top: 12rpx;
  text-align: right;
  font-size: 24rpx;
  color: #999;
}
.fixedCommentBox {
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
  .commentTextArea {
    width: calc(100% - 48rpx);
    height: calc(100% - 36rpx);
    padding: 18rpx 24rpx;
    font-size: 28rpx;
    line-height: 36rpx;
    font-weight: 600;
    color: #999;
    background: #f3f3f4;
    border-radius: 64rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    &.active {
      color: #ffffff;
      background-color: #ff6b03;
    }
  }
}
.reason-left.active {
  color: #ff6b03;
}

.fake-textarea {
  position: relative;
  min-height: 200rpx;
  background-color: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  box-sizing: border-box;
  cursor: pointer;
}
.textarea-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
  word-break: break-all;
}
.textarea-placeholder {
  font-size: 28rpx;
  color: #bfbfbf;
  line-height: 1.5;
  word-break: break-all;
}
.count {
  position: absolute;
  right: 24rpx;
  bottom: 16rpx;
  font-size: 24rpx;
  color: #999;
}
</style>

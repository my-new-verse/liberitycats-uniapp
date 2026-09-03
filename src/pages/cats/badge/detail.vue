<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '徽章详情',
  },
}
</route>
<template>
  <view class="badge-detail-page">
    <!-- 自定义导航栏 -->
    <custom-nav2 title="徽章详情" pageBackgroundColor="#ffffff">
      <template #default>
        <scroll-view class="content-scroll" scroll-y sticky-scroll-bar :upper-threshold="10">
          <template v-if="badgeData">
            <view class="badge-card">
              <image class="badge-large-icon" :src="badgeData.iconUrl" mode="aspectFit"></image>
              <text class="badge-title">{{ badgeData.name }}</text>
              <text class="badge-category">{{ badgeData.category }}</text>
              <text class="badge-desc">{{ badgeData.description }}</text>
            </view>

            <!-- 未获得状态 -->
            <view v-if="!isEarned" class="unlocked-section">
              <view class="unlock-progress">
                <view class="progress-labels">
                  <text class="label">解锁进度</text>
                  <text class="num">
                    {{ badgeData.progressCurrent }} / {{ badgeData.progressTarget }}
                  </text>
                </view>
                <view class="progress-bar">
                  <view class="progress-fill" :style="{ width: progressPercentage + '%' }"></view>
                </view>
                <!-- <wd-progress
                :percentage="progressPercentage"
                hide-text
                custom-class="custom-progress"
              /> -->
                <text class="progress-tip">{{ progressTip }}</text>
              </view>

              <!-- <view class="action-btn" @click="handleGoParticipate">去参与评论</view> -->
              <wd-button custom-class="action-btn" plain hairline>去参与评论</wd-button>

              <!-- 佩戴后展示预览 -->
              <view class="preview-section">
                <text class="preview-title">佩戴后展示</text>
                <view class="nickname-preview">
                  <image
                    class="avatar"
                    src="/static/images/user/default-avatar.png"
                    mode="aspectFill"
                  ></image>
                  <text class="nickname">何金银</text>
                  <image class="badge-small-icon" :src="badgeData.iconUrl" mode="aspectFit"></image>
                </view>
                <text class="preview-desc">Supporter 保留头像角标；昵称旁只展示徽章图形</text>
              </view>

              <!-- 底部按钮 -->
              <view class="bottom-action">
                <wd-button custom-class="disable-btn" disabled>获得后可佩戴</wd-button>
              </view>
            </view>

            <!-- 已获得状态 -->
            <view v-else class="obtained-section">
              <!-- 获取信息 -->
              <view class="info-list">
                <view class="info-item">
                  <text class="info-label">获得方式</text>
                  <text class="info-value">{{ badgeData.description }}</text>
                </view>
                <view class="info-item">
                  <text class="info-label">获得时间</text>
                  <text class="info-value">{{ badgeData.earnedAt || '-' }}</text>
                </view>
                <view class="info-item obtained-status">
                  <text class="info-label">状态</text>
                  <text class="info-value obtained-tag">
                    {{ isEquipped ? '已佩戴' : '已获得' }}
                  </text>
                </view>
              </view>

              <!-- 昵称展示预览 -->
              <view class="preview-section">
                <text class="preview-title">昵称展示预览</text>
                <view class="nickname-preview">
                  <image
                    class="avatar"
                    src="/static/images/user/default-avatar.png"
                    mode="aspectFill"
                  ></image>
                  <text class="nickname">何金银</text>
                  <image class="badge-small-icon" :src="badgeData.iconUrl" mode="aspectFit"></image>
                </view>
                <text class="preview-desc">会员等级使用头像角标；昵称旁只展示徽章图形</text>
              </view>

              <!-- 底部按钮 -->
              <view class="bottom-action">
                <button class="primary-btn" :disabled="submitting" @click="handleEquippedAction">
                  {{ isEquipped ? '取消佩戴' : '佩戴这枚徽章' }}
                </button>
              </view>
            </view>
          </template>
        </scroll-view>
      </template>
    </custom-nav2>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from '@/locale/index'
import { onLoad } from '@dcloudio/uni-app'
import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'
import {
  equipBadgeApi,
  getBadgeDetailApi,
  unequipBadgeApi,
  type BadgeItem,
} from '@/service/api/badge'
import { useUserStore } from '@/store/user'

// 当前徽章数据 - 初始设置为空对象或默认值
const badgeData = ref<BadgeItem | null>(null)
const loading = ref(false)
const submitting = ref(false)
const userStore = useUserStore()

const isEarned = computed(
  () => badgeData.value?.status === 'EARNED' || badgeData.value?.status === 'EQUIPPED',
)
const isEquipped = computed(() => badgeData.value?.status === 'EQUIPPED')

// 计算属性
const progressPercentage = computed(() => {
  if (!badgeData.value?.progressTarget) return 0
  return Math.min(100, (badgeData.value.progressCurrent / badgeData.value.progressTarget) * 100)
})

const progressTip = computed(() => {
  if (!badgeData.value?.progressTarget) return ''
  const remaining = Math.max(0, badgeData.value.progressTarget - badgeData.value.progressCurrent)
  return `再完成 ${remaining}${badgeData.value.progressUnit || ''}即可获得`
})

// 生命周期
onLoad((options) => {
  // 获取徽章 ID
  const badgeCode = String(options?.code || options?.id || '')
  if (!badgeCode) {
    uni.showToast({ title: t('common.request.not_found'), icon: 'none' })
    return
  }
  void loadBadgeDetail(badgeCode)
})

// 方法
const loadBadgeDetail = async (code: string) => {
  loading.value = true
  try {
    const response = await getBadgeDetailApi(code)
    if (response.code === 1 && response.data) {
      badgeData.value = response.data
      return
    }
    uni.showToast({ title: response.msg || t('common.request.not_found'), icon: 'none' })
  } catch (error) {
    console.warn('[Badge] 获取徽章详情失败:', error)
  } finally {
    loading.value = false
  }
}

const handleEquippedAction = async () => {
  if (!badgeData.value || submitting.value || !isEarned.value) return
  submitting.value = true
  try {
    const wasEquipped = isEquipped.value
    const response = wasEquipped
      ? await unequipBadgeApi()
      : await equipBadgeApi(badgeData.value.code)
    if (response.code !== 1) {
      uni.showToast({ title: response.msg || t('common.operationFailedRetry'), icon: 'none' })
      return
    }

    badgeData.value = {
      ...badgeData.value,
      status: wasEquipped ? 'EARNED' : 'EQUIPPED',
    }
    uni.showToast({ title: wasEquipped ? '已取消佩戴' : '佩戴成功', icon: 'success' })
    void userStore.getUserInfo()
  } catch (error) {
    console.warn('[Badge] 更新佩戴状态失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
// 全局字体设置
* {
  font-family: Alibaba PuHuiTi2 !important;
}

:deep(.zh-Hans, .zh-Hant) {
  font-family: Alibaba PuHuiTi2 !important;
}
.badge-detail-page {
  min-height: 100vh;
  background: #f7f6f4;
}

.content-scroll {
  height: 100vh;
}

// 徽章卡片
.badge-card {
  margin: 40rpx 24rpx;
  padding: 40rpx;
  background: #ffffff;
  // border-radius: 24rpx;
  text-align: center;
  // box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .badge-large-icon {
    display: flex;
    width: 160rpx;
    height: 160rpx;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    border: 7px solid rgba(255, 255, 255, 0.75);
    background: #dcecff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
    margin: auto;
  }

  .badge-category {
    display: inline-block;
    padding: 6rpx 16rpx;
    background: #fff3e8;
    color: var(--liberty-cats-primary-color);
    font-size: 24rpx;
    border-radius: 18rpx;
    margin: 0 8rpx 16rpx;
  }

  .badge-title {
    display: flex;
    padding: 24rpx 0 16rpx 0;
    flex-direction: column;
    align-items: center;
    text-align: center;
    font-size: 48rpx;
    font-weight: 700;
    font-family: Alibaba PuHuiTi2 !important;
    span {
      font-family: Alibaba PuHuiTi2 !important;
    }
  }

  .badge-desc {
    color: #777;
    text-align: center;
    font-size: 26rpx;
    font-weight: 400;
    display: block;
  }
}

// 未获得状态
.unlocked-section {
  margin: 0 24rpx 24rpx;
  padding: 32rpx;
  background: #ffffff;
  // border-radius: 24rpx;
  // box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .unlock-progress {
    margin-bottom: 32rpx;
    display: flex;
    flex-direction: column;
    gap: 12rpx;

    .progress-labels {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;

      .label {
        font-size: 32rpx;
        font-weight: 600;
        color: #333333;
      }

      .num {
        font-size: 32rpx;
        font-weight: 600;
        color: #ff6b03;
      }
    }

    .progress-bar {
      height: 16rpx;
      background: #f0f0f0;
      border-radius: 6rpx;

      overflow: hidden;

      .progress-fill {
        height: 100%;
        // background: linear-gradient(90deg, #ff6b03 0%, #ee941a 100%);
        background: linear-gradient(90deg, #ee941a 0%, #ff6b03 100%);
        border-radius: 6rpx;
        transition: width 0.3s ease;
      }
    }

    .progress-tip {
      display: block;
      margin-top: 12rpx;
      font-size: 28rpx;
      color: #999999;
    }
  }

  .action-btn {
    width: 95%;
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    background: #ffffff;
    border: 2rpx solid #ff6b03;
    border-radius: 44rpx;
    font-size: 28rpx;
    color: #ff6b03;
    font-weight: 500;
    margin-bottom: 88rpx;
  }
}

// 已获得状态
.obtained-section {
  margin: 0 24rpx 24rpx;
  padding: 32rpx;
  background: #ffffff;
  border-radius: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .info-list {
    margin-bottom: 40rpx;

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 0;
      border-bottom: 1rpx solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        font-size: 26rpx;
        color: #999999;
      }

      .info-value {
        font-size: 26rpx;
        color: #333333;
        font-weight: 500;
      }

      &.obtained-status {
        .obtained-tag {
          color: #27c86b;
        }
      }
    }
  }
}

// 预览区域
.preview-section {
  margin: 0 0 40rpx;

  .preview-title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 20rpx;
  }

  .nickname-preview {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: #f7f6f4;
    border-radius: 16rpx;
    margin-bottom: 16rpx;

    .avatar {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      margin-right: 16rpx;
    }

    .nickname {
      flex: 1;
      font-size: 28rpx;
      color: #333333;
      font-weight: 500;
    }

    .badge-small-icon {
      width: 48rpx;
      height: 48rpx;
      margin-left: 16rpx;
    }
  }

  .preview-desc {
    display: block;
    font-size: 26rpx;
    color: #999999;
    line-height: 1.4;
  }
}

// 底部操作区
.bottom-action {
  padding: 0 24rpx 40rpx;
  margin-top: 120rpx;

  .disable-btn {
    width: 100%;
    height: 96rpx;
    background: #f5f5f5;
    border-radius: 48rpx;
    font-size: 28rpx;
    color: #999999;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .primary-btn {
    width: 100%;
    height: 96rpx;
    background: linear-gradient(135deg, #ff6b03 0%, #ee941a 100%);
    border-radius: 48rpx;
    font-size: 28rpx;
    color: #ffffff;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 关闭按钮
.close-btn {
  font-size: 48rpx;
  color: #333333;
  padding: 8rpx;
  line-height: 1;
}
:deep(.custom-progress) {
  .wd-progress__outer {
    height: 18rpx !important;
    border-radius: 38rpx;
  }
}
</style>

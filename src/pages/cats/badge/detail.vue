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
          <!-- 徽章卡片 -->
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
            <wd-button custom-class="action-btn" plain hairline @click="handleActionClick">
              {{ getActionButtonText() }}
            </wd-button>

            <!-- 佩戴后展示预览 -->
            <view class="preview-section">
              <text class="preview-title">佩戴后展示</text>
              <view class="nickname-preview">
                <!-- 头像 + 会员等级角标 -->
                <view class="avatar-container">
                  <image
                    class="avatar"
                    :src="userStore.userInfo.avatar || '/static/images/user/default-avatar.png'"
                    mode="aspectFill"
                  ></image>
                  <!-- 会员等级角标 -->
                  <view
                    v-if="userStore.userInfo.level"
                    class="level-badge"
                    :class="getLevelClass(userStore.userInfo.level)"
                  >
                    {{ getLevelText(userStore.userInfo.level) }}
                  </view>
                </view>
                <!-- 昵称 -->
                <text class="nickname">{{ userStore.userInfo.nickname }}</text>
                <!-- 徽章图标 -->
                <image class="badge-small-icon" :src="badgeData?.iconUrl" mode="aspectFit"></image>
              </view>
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
                <!-- 头像 + 会员等级角标 -->
                <view class="avatar-container">
                  <image
                    class="avatar"
                    :src="userStore.userInfo.avatar || '/static/images/user/default-avatar.png'"
                    mode="aspectFill"
                  ></image>
                  <!-- 会员等级角标 -->
                  <view
                    v-if="userStore.userInfo.level"
                    class="level-badge"
                    :class="getLevelClass(userStore.userInfo.level)"
                  >
                    {{ getLevelText(userStore.userInfo.level) }}
                  </view>
                </view>
                <!-- 昵称 -->
                <text class="nickname">{{ userStore.userInfo.nickname }}</text>
                <!-- 徽章图标 -->
                <image class="badge-small-icon" :src="badgeData?.iconUrl" mode="aspectFit"></image>
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
        </scroll-view>
      </template>
    </custom-nav2>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from '@/locale/index'
import { onLoad, onHide } from '@dcloudio/uni-app'
import { toUrl } from '@/utils'
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

    // 成功修改佩戴状态后，广播事件通知 index 页面刷新数据
    const currentCode = badgeData.value.code
    uni.$emit('badge_equipment_updated', {
      badgeCode: currentCode,
      newStatus: wasEquipped ? 'UNEQUIPPED' : 'EQUIPPED',
      timestamp: Date.now(),
    })

    uni.showToast({
      title: wasEquipped ? '已取消佩戴' : '佩戴成功',
      icon: 'success',
    })
    void userStore.getUserInfo()
  } catch (error) {
    console.warn('[Badge] 更新佩戴状态失败:', error)
  } finally {
    submitting.value = false
  }
}

// 获取会员等级文本
const getLevelText = (level: number): string => {
  const levelMap: Record<number, string> = {
    1: '铜牌',
    2: '银牌',
    3: '金牌',
    4: '钻石',
    5: '皇冠',
  }
  return levelMap[level] || `Lv.${level}`
}

// 获取会员等级样式类名
const getLevelClass = (level: number): string => {
  return `level-${level}`
}

// 获取操作按钮文字
const getActionButtonText = () => {
  if (badgeData.value?.guidanceAction) {
    return badgeData.value.guidanceAction.label
  }
  // 默认文字
  return isEquipped.value ? '查看详情' : '去参与'
}

// 处理点击事件
const handleActionClick = async () => {
  const guidanceAction = badgeData.value?.guidanceAction
  if (!guidanceAction) {
    uni.showToast({
      title: '该徽章暂不支持此操作',
      icon: 'none',
    })
    return
  }

  try {
    const { name, params } = guidanceAction.target

    // 根据不同的目标名称执行不同的跳转逻辑
    switch (name) {
      case 'profile_edit':
        // 完善头像和昵称，打开资料设置入口
        toUrl('/pages/cats/settings/index', params)
        break

      case 'post_create':
        if (params.category === 'normal') {
          toUrl('/pages/cats/social/publish', params || {}) // 读取 params.category
        } else {
          toUrl('/pages/cats/social/publish?category=promotion', params || {}) // 读取 params.category
        }
        break

      case 'community_discussion':
        // 参与社区评论，切换至社区发现页
        uni.switchTab({
          url: '/pages/tabbar/discover',
          complete: () => {
            // 可以在这里添加定位到评论区的相关逻辑
            // uni.showToast({
            //   title: '已切换至社区发现页',
            //   icon: 'success',
            // })
          },
        })
        break

      case 'check_in':
        // 前往签到入口，切换至“我的”页并定位签到区域
        uni.switchTab({
          url: '/pages/tabbar/my',
          complete: () => {
            // 延迟后定位签到区域（等待页面加载完成后）
            setTimeout(() => {
              // 这里可以添加滚动到签到区域的逻辑
              // 如果有相应的 API 或方法的话
              uni.showToast({
                title: '请查看顶部签到区域',
                icon: 'none',
              })
            }, 300)
          },
        })
        break

      case 'staking':
        // 查看质押，打开质押页
        toUrl('/pages/cats/pledge/index', params)
        break

      default:
        uni.showToast({
          title: '未定义的操作',
          icon: 'none',
        })
    }
  } catch (error) {
    console.error('[Badge] 跳转失败:', error)
    uni.showToast({
      title: '跳转失败，请重试',
      icon: 'none',
    })
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
    width: 240rpx;
    height: 240rpx;
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
  // box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .info-list {
    margin-bottom: 40rpx;

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20rpx 0;
      // border-bottom: 1rpx solid #f0f0f0;

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
          color: #2ca66f;
        }
      }
    }
  }
}

// 昵称预览区域（通用样式）
.nickname-preview {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #f7f6f4;
  border-radius: 16rpx;
  margin-bottom: 16rpx;

  .avatar-container {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;

    .avatar {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      object-fit: cover;
    }

    .level-badge {
      position: absolute;
      bottom: -4rpx;
      right: -4rpx;
      padding: 6rpx 10rpx;
      min-width: 44rpx;
      height: 28rpx;
      line-height: 24rpx;
      text-align: center;
      font-size: 18rpx;
      font-weight: 600;
      color: #ffffff;
      border-radius: 14rpx;

      &.level-1 {
        background: linear-gradient(135deg, #cd7f32 0%, #a0522d 100%);
      }

      &.level-2 {
        background: linear-gradient(135deg, #c0c0c0 0%, #808080 100%);
      }

      &.level-3 {
        background: linear-gradient(135deg, #ffd700 0%, #daa520 100%);
      }

      &.level-4 {
        background: linear-gradient(135deg, #b9f2ff 0%, #00ced1 100%);
        color: #006666;
      }

      &.level-5 {
        background: linear-gradient(135deg, #e6e6fa 0%, #9370db 100%);
        color: #4b0082;
      }
    }
  }

  .nickname {
    // flex: 1;
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

// 预览区域包装容器（用于包含标题）
.preview-section {
  margin-bottom: 80rpx; // 增加底部间距

  .preview-title {
    display: block;
    font-size: 32rpx;
    font-weight: 600;
    color: #333333;
    margin-bottom: 20rpx;
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

// 会员等级角标
.level-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  padding: 6rpx 10rpx;
  min-width: 44rpx;
  height: 28rpx;
  line-height: 24rpx;
  text-align: center;
  font-size: 18rpx;
  font-weight: 600;
  color: #ffffff;
  border-radius: 14rpx;

  &.level-1 {
    background: linear-gradient(135deg, #cd7f32 0%, #a0522d 100%);
  }

  &.level-2 {
    background: linear-gradient(135deg, #c0c0c0 0%, #808080 100%);
  }

  &.level-3 {
    background: linear-gradient(135deg, #ffd700 0%, #daa520 100%);
  }

  &.level-4 {
    background: linear-gradient(135deg, #b9f2ff 0%, #00ced1 100%);
    color: #006666;
  }

  &.level-5 {
    background: linear-gradient(135deg, #e6e6fa 0%, #9370db 100%);
    color: #4b0082;
  }
}

.avatar-container {
  position: relative;
}
</style>

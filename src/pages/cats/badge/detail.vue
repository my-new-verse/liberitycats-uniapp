<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '',
  },
}
</route>
<template>
  <view class="badge-detail-page">
    <!-- 自定义导航栏 -->
    <custom-nav2 :title="t('badge.detail.title')" pageBackgroundColor="var(--bg-primary)">
      <template #default>
        <view class="content-scroll-wrap">
          <view v-if="loading" class="loading-state"><wd-loading /></view>
          <scroll-view
            v-else-if="badgeData"
            class="content-scroll"
            scroll-y
            sticky-scroll-bar
            :upper-threshold="10"
          >
            <!-- 徽章卡片 -->
            <view class="badge-card">
              <image class="badge-large-icon" :src="badgeData.iconUrl" mode="aspectFit"></image>
              <text class="badge-title">{{ badgeData.name }}</text>
              <text class="badge-category">{{ categoryLabel }}</text>
              <text class="badge-desc">
                {{ badgeData.condition?.description || badgeData.description }}
              </text>
            </view>

            <!-- 未获得状态 -->
            <view v-if="!isEarned" class="unlocked-section">
              <view class="unlock-progress">
                <view class="progress-labels">
                  <text class="label">{{ t('badge.detail.unlock_progress') }}</text>
                  <text class="num">{{ progressCurrent }} / {{ progressTarget }}</text>
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
              <wd-button
                v-if="badgeData.guidanceAction"
                custom-class="action-btn"
                plain
                hairline
                @click="handleActionClick"
              >
                {{ badgeData.guidanceAction.label }}
              </wd-button>

              <!-- 佩戴后展示预览 - 只在自己的徽章页显示 -->
              <view v-if="!isPublicView" class="preview-section">
                <text class="preview-title">{{ t('badge.detail.preview_after_equipping') }}</text>
                <view class="nickname-preview">
                  <!-- 头像 + 会员等级角标 -->
                  <view class="avatar-container">
                    <image
                      class="avatar"
                      :src="userStore.userInfo.avatar || '/static/images/user/default-avatar.png'"
                      mode="aspectFill"
                    ></image>
                    <!-- 会员等级角标 -->
                    <view class="levelIcon">
                      <view
                        v-if="userStore.userInfo.level?.level"
                        class="levelBadge"
                        :style="getLevelClass(userStore.userInfo.level?.level)"
                      ></view>
                    </view>
                  </view>
                  <!-- 昵称 -->
                  <text class="nickname">{{ userStore.userInfo.nickname }}</text>
                  <!-- 徽章图标 -->
                  <image class="badge-small-icon" :src="previewIconUrl" mode="aspectFit"></image>
                </view>
              </view>
            </view>

            <!-- 已获得状态 -->
            <view v-else class="obtained-section">
              <!-- 获取信息 -->
              <view class="info-list">
                <view class="info-item">
                  <text class="info-label">{{ t('badge.detail.acquisition') }}</text>
                  <text class="info-value">
                    {{ badgeData.acquisition?.method || badgeData.description }}
                  </text>
                </view>
                <view class="info-item">
                  <text class="info-label">{{ t('badge.detail.time') }}</text>
                  <text class="info-value">
                    {{ formatTime(badgeData.acquisition?.earnedAt || badgeData.earnedAt) }}
                  </text>
                </view>
                <view class="info-item obtained-status">
                  <text class="info-label">{{ t('badge.detail.status') }}</text>
                  <text class="info-value obtained-tag">
                    {{ isEquipped ? t('badge.equipped') : t('badge.earned') }}
                  </text>
                </view>
              </view>

              <!-- 昵称展示预览 - 只在自己的徽章页显示 -->
              <view v-if="!isPublicView" class="preview-section">
                <text class="preview-title">{{ t('badge.detail.nickname_preview') }}</text>
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
                    ></view>
                  </view>
                  <!-- 昵称 -->
                  <text class="nickname">{{ userStore.userInfo.nickname }}</text>
                  <!-- 徽章图标 -->
                  <image class="badge-small-icon" :src="previewIconUrl" mode="aspectFit"></image>
                </view>
                <text class="preview-desc">{{ t('badge.detail.preview_description') }}</text>
              </view>
            </view>

            <view
              v-if="
                !isPublicView && badgeData.series?.type === 'STAGED' && badgeData.stages?.length
              "
              class="stages-section"
            >
              <text class="section-title">{{ badgeData.series.name }}</text>
              <view
                v-for="stage in badgeData.stages"
                :key="stage.code"
                class="stage-item"
                :class="{ current: stage.isCurrent }"
              >
                <image class="stage-icon" :src="stage.iconUrl" mode="aspectFit" />
                <view class="stage-info">
                  <text class="stage-name">{{ stage.name }}</text>
                  <text class="stage-progress">{{ stage.progressTarget }}{{ stage.unit }}</text>
                </view>
                <text class="stage-status">{{ getStageStatusText(stage.status) }}</text>
              </view>
            </view>

            <!-- 底部按钮 -->
            <view v-if="!isEarned && showDisabledEquipAction" class="bottom-action">
              <wd-button custom-class="disable-btn" disabled>{{ equipActionText }}</wd-button>
            </view>
            <view v-else-if="isEarned && showEquipmentAction" class="bottom-action">
              <button
                class="primary-btn"
                :disabled="submitting || !canRunEquipmentAction"
                @click="handleEquippedAction"
              >
                {{ equipActionText }}
              </button>
            </view>
          </scroll-view>
        </view>
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
  getUserBadgeDetailApi,
  unequipBadgeApi,
  type BadgeDetail,
  type BadgeStatus,
} from '@/service/api/badge'
import { useUserStore } from '@/store/user'
import { executeBadgeNavigationTarget } from '@/utils/badgeNavigation'
import { markBadgeListRefreshRequired } from '@/utils/badgeRefresh'
import { getLevelBadgeStyle, getCachedMemberAvatar, cacheMemberAvatars } from '@/utils/avatarCache'
import { formatTime } from '@/utils'

// 当前徽章数据 - 初始设置为空对象或默认值
const badgeData = ref<BadgeDetail | null>(null)
const loading = ref(false)
const submitting = ref(false)
const userStore = useUserStore()
const viewedMemberId = ref<number | null>(null)

const isEarned = computed(
  () => badgeData.value?.status === 'EARNED' || badgeData.value?.status === 'EQUIPPED',
)
const isEquipped = computed(() => badgeData.value?.status === 'EQUIPPED')
const progressCurrent = computed(
  () => badgeData.value?.progress?.current ?? badgeData.value?.progressCurrent ?? 0,
)
const progressTarget = computed(
  () => badgeData.value?.progress?.target ?? badgeData.value?.progressTarget ?? 0,
)
const previewIconUrl = computed(
  () => badgeData.value?.display?.preview?.iconUrl || badgeData.value?.iconUrl || '',
)
const categoryLabel = computed(() => {
  const category = badgeData.value?.category?.toUpperCase()
  const keyMap: Record<string, string> = {
    GROWTH: 'badge.category.growth',
    CREATION: 'badge.category.creation',
    INTERACTION: 'badge.category.interaction',
    TENURE: 'badge.category.tenure',
  }
  return category ? (keyMap[category] ? t(keyMap[category]) : category) : ''
})
const showEquipmentAction = computed(() => {
  const capabilities = badgeData.value?.capabilities
  return (
    !!capabilities &&
    (capabilities.canEquip ||
      capabilities.canUnequip ||
      capabilities.equipDisabledReasonCode !== 'NOT_OWNER')
  )
})
const showDisabledEquipAction = computed(
  () => badgeData.value?.capabilities?.equipDisabledReasonCode === 'BADGE_NOT_EARNED',
)
const canRunEquipmentAction = computed(() =>
  isEquipped.value
    ? badgeData.value?.capabilities?.canUnequip === true
    : badgeData.value?.capabilities?.canEquip === true,
)
const equipActionText = computed(() => {
  if (badgeData.value?.capabilities?.equipDisabledReasonCode === 'BADGE_NOT_EARNED')
    return t('badge.detail.equip_after_earned')
  if (isEquipped.value) return t('badge.detail.unequip')
  if (badgeData.value?.capabilities?.equipDisabledReasonCode === 'ALREADY_EQUIPPED')
    return t('badge.equipped')
  return t('badge.detail.equip_this')
})

// 计算属性
const progressPercentage = computed(() => {
  if (badgeData.value?.progress) return Math.min(100, badgeData.value.progress.percentage || 0)
  if (!progressTarget.value) return 0
  return Math.min(100, (progressCurrent.value / progressTarget.value) * 100)
})

const progressTip = computed(() => {
  if (!progressTarget.value) return ''
  const remaining =
    badgeData.value?.progress?.remaining ??
    Math.max(0, progressTarget.value - progressCurrent.value)
  const unit = badgeData.value?.progress?.unit || badgeData.value?.progressUnit || ''
  return t('badge.detail.remaining_to_earn', { remaining, unit })
})
// 判断是否是查看他人的徽章
const isPublicView = computed(
  () => viewedMemberId.value !== null && viewedMemberId.value != userStore.userInfo?.member_id,
)

// 生命周期
onLoad((options) => {
  // 获取徽章 ID
  const badgeCode = String(options?.code || options?.id || '')
  if (!badgeCode) {
    uni.showToast({ title: t('common.request.not_found'), icon: 'none' })
    return
  }
  // 判断是否是查看他人的徽章
  const memberId = Number(options?.memberId || options?.member_id || 0)
  viewedMemberId.value = memberId > 0 ? memberId : null
  void loadBadgeDetail(badgeCode, memberId ? String(memberId) : undefined)
})

// 方法
const loadBadgeDetail = async (code: string, memberId?: string) => {
  loading.value = true
  try {
    const response =
      memberId && memberId != userStore.userInfo?.member_id
        ? await getUserBadgeDetailApi(memberId, code)
        : await getBadgeDetailApi(code)
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
  if (!badgeData.value || submitting.value || !canRunEquipmentAction.value) return
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
      capabilities: {
        ...badgeData.value.capabilities,
        canEquip: wasEquipped,
        canUnequip: !wasEquipped,
        equipDisabledReasonCode: wasEquipped ? null : 'ALREADY_EQUIPPED',
      },
    }

    // 列表页此时处于隐藏状态，持久化标记保证返回时能够刷新。
    markBadgeListRefreshRequired()

    uni.showToast({
      title: wasEquipped ? t('badge.detail.unequip_success') : t('badge.detail.equip_success'),
    })
    void userStore.getUserInfo()
  } catch (error) {
    console.warn('[Badge] 更新佩戴状态失败:', error)
  } finally {
    submitting.value = false
  }
}

// 获取会员等级样式类名
const getLevelClass = (level: number): string => {
  return getLevelBadgeStyle(level)
}

// 处理点击事件
const handleActionClick = () => {
  const guidanceAction = badgeData.value?.guidanceAction
  if (guidanceAction && !executeBadgeNavigationTarget(guidanceAction.target))
    console.warn('[Badge] Guidance target ignored:', guidanceAction.target)
}

const getStageStatusText = (status: BadgeStatus) => {
  if (status === 'EQUIPPED') return t('badge.equipped')
  if (status === 'EARNED') return t('badge.earned')
  if (status === 'IN_PROGRESS') return t('badge.in_progress')
  return t('badge.locked')
}
</script>

<style lang="scss" scoped>
// 全局字体设置
* {
  font-family: Alibaba PuHuiTi2 !important;
}

:deep(.cnt2) {
  background-color: var(--bg-card) !important;
}

:deep(.zh-Hans, .zh-Hant) {
  font-family: Alibaba PuHuiTi2 !important;
}
.badge-detail-page {
  height: 100vh;
  overflow: hidden;
  color: var(--text-primary);
  background: var(--bg-primary);
}

:deep(.page) {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

:deep(.cnt2) {
  box-sizing: border-box;
  height: 100%;
  overflow: hidden;
}

:deep(.default-cnt) {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0 !important;
  overflow: hidden;
}

.content-scroll-wrap {
  flex: 1;
  height: 0;
  min-height: 0;
  overflow: hidden;
}

.content-scroll {
  width: 100%;
  height: 100%;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.stages-section {
  margin: 0 24rpx 40rpx;
  padding: 32rpx;
  background: var(--bg-card);
  background: var(--bg-card);
  border-radius: 24rpx;

  .section-title {
    display: block;
    color: var(--text-black);
    margin-bottom: 20rpx;
    font-size: calc(32rpx * var(--font-scale));
    font-weight: 600;
  }

  .stage-item {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 20rpx 0;
    border-bottom: 1rpx solid var(--border-light);
    border-bottom: 1rpx solid var(--border-light);

    &:last-child {
      border-bottom: 0;
    }

    &.current .stage-name {
      color: var(--liberty-cats-primary-color);
    }
  }

  .stage-icon {
    width: 64rpx;
    height: 64rpx;
  }

  .stage-info {
    display: flex;
    flex: 1;
    flex-direction: column;
  }

  .stage-name {
    font-size: calc(26rpx * var(--font-scale));
    font-weight: 500;
    color: var(--text-black);
  }

  .stage-progress,
  .stage-status {
    font-size: calc(22rpx * var(--font-scale));
    color: var(--text-secondary);
  }
}

// 徽章卡片
.badge-card {
  margin: 40rpx 24rpx;
  padding: 40rpx;
  background: var(--bg-card);
  background: var(--bg-card);
  border-radius: 24rpx;
  text-align: center;
  // box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);

  .badge-large-icon {
    display: flex;
    width: 260rpx;
    height: 260rpx;
    justify-content: center;
    align-items: center;
    border-radius: 50%;
    // border: 7px solid rgba(255, 255, 255, 0.75);
    // background: #dcecff;
    // box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04) inset;
    margin: auto;
  }

  .badge-category {
    display: inline-block;
    padding: 6rpx 16rpx;
    background: var(--promotionCard-bg-color);
    color: var(--liberty-cats-primary-color);
    font-size: calc(24rpx * var(--font-scale));
    border-radius: 18rpx;
    margin: 0 8rpx 16rpx;
  }

  .badge-title {
    display: flex;
    padding: 24rpx 0 16rpx 0;
    flex-direction: column;
    align-items: center;
    text-align: center;
    font-size: calc(48rpx * var(--font-scale));
    font-weight: 700;
    font-family: Alibaba PuHuiTi2 !important;
    color: var(--text-black);
    span {
      font-family: Alibaba PuHuiTi2 !important;
    }
  }

  .badge-desc {
    color: var(--badge-desc-color);
    text-align: center;
    font-size: calc(26rpx * var(--font-scale));
    font-weight: 400;
    display: block;
  }
}

// 未获得状态
.unlocked-section {
  margin: 0 24rpx 24rpx;
  padding: 32rpx;
  background: var(--bg-card);
  background: var(--bg-card);
  border-radius: 24rpx;
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
        font-size: calc(32rpx * var(--font-scale));
        font-weight: 600;
        color: var(--actions-text);
      }

      .num {
        font-size: calc(32rpx * var(--font-scale));
        font-weight: 600;
        color: #ff6b03;
      }
    }

    .progress-bar {
      height: 16rpx;
      background: var(--border-light);
      background: var(--border-light);
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
      font-size: calc(28rpx * var(--font-scale));
      color: var(--text-secondary);
    }
  }

  .action-btn {
    width: 95%;
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    background: var(--bg-card);
    background: var(--bg-card);
    border: 2rpx solid #ff6b03;
    border-radius: 44rpx;
    font-size: calc(28rpx * var(--font-scale));
    color: #ff6b03;
    font-weight: 500;
    margin-bottom: 88rpx;
  }
}

// 已获得状态
.obtained-section {
  margin: 0 24rpx 24rpx;
  padding: 32rpx;
  background: var(--bg-card);
  background: var(--bg-card);
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
        font-size: calc(26rpx * var(--font-scale));
        color: var(--text-secondary);
      }

      .info-value {
        font-size: calc(26rpx * var(--font-scale));
        color: var(--actions-text);
        font-weight: 500;
        // 英文换行时保持各行右对齐，与第一行一致
        text-align: right;
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
  background: var(--bg-primary);
  background: var(--bg-primary);
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

    .levelIcon {
      position: absolute;
      right: -4rpx;
      bottom: 6rpx;
      width: 28rpx;
      height: 28rpx;
      line-height: calc(24rpx * var(--font-scale));
      text-align: center;
      font-size: calc(18rpx * var(--font-scale));
      font-weight: 600;
      color: var(--bg-card);
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
    font-size: calc(28rpx * var(--font-scale));
    color: var(--actions-text);
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
    font-size: calc(32rpx * var(--font-scale));
    font-weight: 600;
    color: var(--actions-text);
    margin-bottom: 20rpx;
  }
  .preview-desc {
    font-size: calc(26rpx * var(--font-scale));
    color: var(--text-secondary);
  }
}

// 底部操作区
.bottom-action {
  padding: 0 24rpx 40rpx;
  margin-top: 120rpx;

  .disable-btn {
    width: 100%;
    height: 96rpx;
    background: var(--wot-search-input-bg);
    border-radius: 48rpx;
    font-size: calc(28rpx * var(--font-scale));
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .primary-btn {
    width: 100%;
    height: 96rpx;
    background: linear-gradient(135deg, #ff6b03 0%, #ee941a 100%);
    border-radius: 48rpx;
    font-size: calc(28rpx * var(--font-scale));
    color: var(--bg-card);
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 关闭按钮
.close-btn {
  font-size: calc(48rpx * var(--font-scale));
  color: var(--actions-text);
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
  line-height: calc(24rpx * var(--font-scale));
  text-align: center;
  font-size: calc(18rpx * var(--font-scale));
  font-weight: 600;
  color: var(--bg-card);
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

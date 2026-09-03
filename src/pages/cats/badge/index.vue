<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的徽章1',
  },
}
</route>
<template>
  <view class="badge-page">
    <!-- 自定义导航栏 -->
    <custom-nav2 title="我的徽章" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="current-badge-card">
          <view class="card-header"></view>
          <view v-if="currentBadge" class="badge-info">
            <image class="badge-icon" :src="currentBadge.iconUrl" mode="aspectFit"></image>
            <view class="badge-detail">
              <text class="label">当前佩戴</text>

              <text class="badge-name">{{ currentBadge.name }}</text>
              <text class="badge-desc">{{ currentBadge.description }}</text>
            </view>
            <text class="chevron" @click="toDetail">
              <wd-icon name="chevron-right" size="22px" color="#fff"></wd-icon>
            </text>
          </view>
          <view v-else class="badge-info">
            <view class="badge-detail">
              <text class="badge-name">暂未佩戴徽章</text>
              <text class="badge-desc">获得徽章后可在详情页佩戴</text>
            </view>
          </view>
          <view class="badge-progress">
            <text class="progress-num">
              {{ badgeSummary.earnedCount }} / {{ badgeSummary.totalCount }}
            </text>
            <text class="progress-text">已获得</text>
          </view>
        </view>

        <!-- 分类筛选 -->
        <view class="filter-scroll" scroll-x>
          <view class="filter-tags">
            <view
              v-for="tag in badgeTags"
              :key="tag.value"
              class="filter-tag"
              :class="{ active: activeTag === tag.value }"
              @click="handleTagClick(tag.value)"
            >
              <text>{{ tag.label }}</text>
            </view>
          </view>
        </view>
        <view class="badge-list-wrap">
          <scroll-view class="badge-list" scroll-y>
            <view class="badge-grid">
              <view
                v-for="badge in filteredBadges"
                :key="badge.code"
                class="badge-item"
                @click="handleBadgeClick(badge)"
                :style="{
                  opacity: badge.status === 'LOCKED' || badge.status === 'IN_PROGRESS' ? 0.5 : 1,
                }"
              >
                <view class="badge-content">
                  <image
                    class="badge-img"
                    :class="getCategoryClass(badge.category)"
                    :src="badge.iconUrl"
                    mode="aspectFit"
                  ></image>
                  <text class="badge-title">{{ badge.name }}</text>
                  <text class="badge-progress">{{ getBadgeProgressText(badge) }}</text>
                </view>
                <view v-if="!isBadgeEarned(badge)" class="badge-unlock">
                  <image
                    class="lock-icon"
                    src="/static/images/common/lock.svg"
                    mode="aspectFit"
                  ></image>
                </view>
              </view>
            </view>

            <!-- Loading 状态 -->
            <view v-if="loading" class="badge-list-loading">
              <view class="loading-spinner"></view>
              <text class="loading-text">加载中...</text>
            </view>
          </scroll-view>
        </view>
        <!-- 徽章列表 -->
      </template>

      <template #right>
        <view class="read_all" @click="handleRulesClick">
          {{ t('my.badge.rules') }}
        </view>
      </template>
    </custom-nav2>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { t } from '@/locale/index'
import { onShow, onHide } from '@dcloudio/uni-app'
import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'
import { toUrl } from '@/utils'
import { getMyBadgesApi, type BadgeItem, type MyBadgeList } from '@/service/api/badge'

// 分类标签
const badgeTags = [
  { label: '全部', value: 'ALL' },
  { label: '成长', value: 'GROWTH' },
  { label: '创作', value: 'CREATION' },
  { label: '互动', value: 'INTERACTION' },
  { label: '资历', value: 'TENURE' },
]

const badgeSummary = ref<MyBadgeList>({
  version: '',
  earnedCount: 0,
  totalCount: 0,
  equippedBadgeCode: null,
  items: [],
  nearest: [],
})

// 已佩戴徽章 - 独立存储，不受分类筛选影响
const equippedBadge = ref<BadgeItem | null>(null)

const loading = ref(false)

// 激活的分类标签
const activeTag = ref('ALL')

// 当前佩戴徽章 - 独立计算属性，不受分类筛选影响
const currentBadge = computed(() => {
  // 优先使用独立存储的已佩戴徽章
  if (equippedBadge.value) return equippedBadge.value

  // 否则从列表中查找
  const equippedCode = badgeSummary.value.equippedBadgeCode
  if (!equippedCode) return null

  return (
    badgeSummary.value.items.find(
      (badge) => badge.code === equippedCode && badge.status === 'EQUIPPED',
    ) || null
  )
})

// 过滤后的徽章列表
const filteredBadges = computed(() => {
  if (activeTag.value === 'ALL') return badgeSummary.value.items
  return badgeSummary.value.items.filter(
    (badge) => badge.category.toUpperCase() === activeTag.value,
  )
})

const toDetail = () => {
  if (currentBadge.value) toUrl(`/pages/cats/badge/detail?code=${currentBadge.value.code}`)
}
// 处理标签点击
const handleTagClick = (value: string) => {
  activeTag.value = value
  void loadBadges()
}

// 处理徽章点击
const handleBadgeClick = (badge: BadgeItem) => {
  toUrl(`/pages/cats/badge/detail?code=${encodeURIComponent(badge.code)}`)
}

const isBadgeEarned = (badge: BadgeItem) => badge.status === 'EARNED' || badge.status === 'EQUIPPED'

const getBadgeProgressText = (badge: BadgeItem) => {
  if (badge.status === 'EQUIPPED') return '已佩戴'
  if (badge.status === 'EARNED') return '已获得'
  return `${badge.progressCurrent || 0}/${badge.progressTarget || 0}${badge.progressUnit || ''}`
}

// 获取徽章分类样式类名
const getCategoryClass = (category: string) => {
  const categoryMap: Record<string, string> = {
    GROWTH: 'category-growth',
    CREATION: 'category-creation',
    INTERACTION: 'category-interaction',
    TENURE: 'category-tenure',
  }
  return categoryMap[category.toUpperCase()] || ''
}

const loadBadges = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const response = await getMyBadgesApi(activeTag.value)
    if (response.code === 1 && response.data) {
      badgeSummary.value = response.data

      // 提取已佩戴徽章 - 独立于分类筛选
      if (response.data.equippedBadgeCode) {
        const equipped = response.data.items.find(
          (badge) => badge.code === response.data.equippedBadgeCode,
        )
        if (equipped && equipped.status === 'EQUIPPED') {
          equippedBadge.value = equipped
        }
      }
    } else {
      uni.showToast({ title: response.msg || t('common.request.error'), icon: 'none' })
    }
  } catch (error) {
    console.warn('[Badge] 获取徽章列表失败:', error)
  } finally {
    loading.value = false
  }
}

onShow(() => {
  // 注册事件监听
  uni.$on('badge_equipment_updated', handleBadgeEquipmentUpdate)
  void loadBadges()
})

// 在 onHide 时移除事件监听，避免内存泄漏
onHide(() => {
  uni.$off('badge_equipment_updated', handleBadgeEquipmentUpdate)
})

// 监听徽章佩戴状态更新事件
const handleBadgeEquipmentUpdate = (data: {
  badgeCode: string
  newStatus: string
  timestamp: number
}) => {
  console.log('[Badge List] 收到徽章佩戴状态更新:', data)
  // 立即刷新当前分类的数据
  void loadBadges()
}

// 处理规则点击
const handleRulesClick = () => {
  console.log('查看徽章规则')
  // TODO: 跳转规则页面或显示规则弹窗
}
</script>

<style lang="scss" scoped>
// 全局字体设置
* {
  font-family: Alibaba PuHuiTi2 !important;
}

// 全局变量
$badge-page-bg: #f7f6f4;
$card-gradient-start: #ff6b03;
$card-gradient-end: #ee941a;
$card-bg: linear-gradient(135deg, $card-gradient-start 0%, $card-gradient-end 100%);
$primary-orange: #ff6b03;
$gray-bg: #f5f5f5;

// Loading 样式
.badge-list-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 0;

  .loading-spinner {
    width: 48rpx;
    height: 48rpx;
    border: 3rpx solid #f3f3f3;
    border-top: 3rpx solid $primary-orange;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-text {
    margin-top: 20rpx;
    font-size: 24rpx;
    color: #999;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

* {
  font-family: Alibaba PuHuiTi2 !important;
}

.badge-page {
  height: 100vh;
  overflow: hidden;
  background: #ffffff;
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

// 当前佩戴徽章卡片（橙色卡片）
.current-badge-card {
  flex-shrink: 0;
  margin: 24rpx;
  padding: 32rpx;
  background: $card-bg;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(255, 107, 3, 0.3);

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32rpx; // 增加间距

    .label {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.8);
    }

    .chevron {
      display: flex;
      align-items: center;
      justify-content: center;

      wd-icon {
        font-size: 22rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  .badge-info {
    display: flex;
    align-items: center;
    margin-bottom: 32rpx; // 增加间距
    padding-bottom: 24rpx; // 增加间距
    border-bottom: 1px solid rgba(255, 255, 255, 0.25);

    .badge-icon {
      width: 88rpx;
      height: 88rpx;
      margin-right: 24rpx;
      // 徽章图标圆形背景（橙色卡片）
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 50%;
      padding: 14rpx;
      background: #dcecff; // 浅蓝色背景
      box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.04) inset;
      border: 7rpx solid rgba(255, 255, 255, 0.75);
    }

    .badge-detail {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 12rpx;
      .label {
        color: #ffffff;
        font-size: 24rpx;
      }
      .badge-name {
        display: block;
        font-size: 36rpx;
        font-weight: 600;
        color: #ffffff;
      }

      .badge-desc {
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.4;
      }
    }
  }

  .badge-progress {
    display: flex;
    align-items: baseline;

    .progress-num {
      font-size: 48rpx;
      font-weight: 700;
      color: #ffffff;
      margin-right: 12rpx;
    }

    .progress-text {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.9);
    }
  }
}

// 分类筛选
.filter-scroll {
  flex-shrink: 0;
  z-index: 10;
  width: 100%;
  overflow-x: auto;
  white-space: nowrap;
  background: $badge-page-bg;

  &::-webkit-scrollbar {
    display: none;
  }

  .filter-tags {
    display: inline-flex;
    padding: 16rpx 24rpx;
    gap: 16rpx;

    .filter-tag {
      display: inline-block;
      padding: 14rpx 24rpx;
      background: #ffffff;
      border-radius: 50rpx;
      font-size: 26rpx;
      color: #6f6f73;
      transition: all 0.3s ease;

      &.active {
        background: $primary-orange;
        color: #ffffff;
        font-weight: 500;
      }
    }
  }
}

// 徽章列表：由普通 view 承担 flex 布局，避免 scroll-view 在 App 端产生空白占位。
.badge-list-wrap {
  flex: 1;
  height: 0;
  min-height: 0;
  overflow: hidden;
}

.badge-list {
  width: 100%;
  height: 100%;

  .badge-grid {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;
    padding: 24rpx 24rpx 40rpx;

    .badge-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32rpx 20rpx;
      background: #ffffff;
      border-radius: 20rpx;
      box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
      transition: all 0.2s ease;

      &:active {
        transform: scale(0.97);
        box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
      }

      .badge-content {
        display: flex;
        flex-direction: column;
        align-items: center;

        .badge-img {
          width: 72rpx;
          height: 72rpx;
          margin-bottom: 12rpx;
          // 徽章图标圆形背景（根据不同类别不同颜色）
          border-radius: 50%;
          padding: 6rpx;

          // 成长类徽章 - 绿色背景
          &.category-growth {
            background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
          }

          // 创作类徽章 - 橙色背景
          &.category-creation {
            background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          }

          // 互动类徽章 - 粉色背景
          &.category-interaction {
            background: linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%);
          }

          // 资历类徽章 - 金色背景
          &.category-history {
            background: linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%);
          }
        }

        .badge-title {
          font-size: 26rpx;
          color: #333333;
          text-align: center;
          margin-bottom: 6rpx;
          line-height: 1.3;
          font-weight: 700;
        }

        .badge-progress {
          font-size: 20rpx;
          color: #999999;
          font-weight: 400;
        }
      }

      .badge-unlock {
        position: absolute;
        top: 12rpx;
        right: 12rpx;

        .lock-icon {
          width: 28rpx;
          height: 28rpx;
          opacity: 0.3;
        }
      }
    }
  }
}
</style>

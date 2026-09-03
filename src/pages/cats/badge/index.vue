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
          <view class="card-header">
            <text class="label">当前佩戴</text>
            <text class="chevron" @click="toDetail">
              <wd-icon name="chevron-right" size="22px"></wd-icon>
            </text>
          </view>
          <view v-if="currentBadge" class="badge-info">
            <image class="badge-icon" :src="currentBadge.iconUrl" mode="aspectFit"></image>
            <view class="badge-detail">
              <text class="badge-name">{{ currentBadge.name }}</text>
              <text class="badge-desc">{{ currentBadge.description }}</text>
            </view>
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
        <scroll-view class="filter-scroll" scroll-x>
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
        </scroll-view>

        <!-- 徽章列表 -->
        <view class="badge-list">
          <view class="badge-grid">
            <view
              v-for="badge in filteredBadges"
              :key="badge.code"
              class="badge-item"
              @click="handleBadgeClick(badge)"
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
        </view>
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
import { onShow } from '@dcloudio/uni-app'
import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'
import { toUrl } from '@/utils'
import { getMyBadgesApi, type BadgeItem, type MyBadgeList } from '@/service/api/badge'

// 分类标签
const badgeTags = [
  { label: '全部', value: 'ALL' },
  { label: '成长', value: 'GROWTH' },
  { label: '创作', value: 'CREATION' },
  { label: '互动', value: 'INTERACTION' },
  { label: '资历', value: 'HISTORY' },
]

const badgeSummary = ref<MyBadgeList>({
  version: '',
  earnedCount: 0,
  totalCount: 0,
  equippedBadgeCode: null,
  items: [],
  nearest: [],
})
const loading = ref(false)

// 激活的分类标签
const activeTag = ref('ALL')
const currentBadge = computed(() => {
  const equippedCode = badgeSummary.value.equippedBadgeCode
  return (
    badgeSummary.value.items.find((badge) => badge.code === equippedCode) ||
    badgeSummary.value.items.find((badge) => badge.status === 'EQUIPPED')
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
    HISTORY: 'category-history',
  }
  return categoryMap[category.toUpperCase()] || ''
}

const loadBadges = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const response = await getMyBadgesApi('ALL')
    if (response.code === 1 && response.data) badgeSummary.value = response.data
    else uni.showToast({ title: response.msg || t('common.request.error'), icon: 'none' })
  } catch (error) {
    console.warn('[Badge] 获取徽章列表失败:', error)
  } finally {
    loading.value = false
  }
}

onShow(() => {
  void loadBadges()
})

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
$badge-page-bg: #fff8f2;
$card-gradient-start: #ff6b03;
$card-gradient-end: #ee941a;
$card-bg: linear-gradient(135deg, $card-gradient-start 0%, $card-gradient-end 100%);
$primary-orange: #ff6b03;
$gray-bg: #f5f5f5;

* {
  font-family: Alibaba PuHuiTi2 !important;
}

.badge-page {
  min-height: 100vh;
  background: #ffffff;
  padding-bottom: 40rpx;
}

// 当前佩戴徽章卡片（橙色卡片）
.current-badge-card {
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

      .badge-name {
        display: block;
        font-size: 36rpx;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 12rpx; // 增加间距
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
  position: sticky;
  top: 0;
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
      padding: 10rpx 24rpx;
      background: #e8e8e8;
      border-radius: 50rpx;
      font-size: 26rpx;
      color: #666666;
      transition: all 0.3s ease;

      &.active {
        background: $primary-orange;
        color: #ffffff;
        font-weight: 500;
      }
    }
  }
}

// 徽章列表
.badge-list {
  padding: 24rpx;

  .badge-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;

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

<template>
  <view class="test-page">
    <CustomNav title="公告结构化测试" />

    <scroll-view class="test-scroll" scroll-y>
      <view class="test-shell">
        <view class="hero-card">
          <text class="hero-label">结构化公告预览</text>
          <text class="hero-title">群公告详情页样式验收</text>
          <text class="hero-desc">
            这里直接用结构化数据渲染最终样式，点击下面按钮可进入正式公告页。
          </text>
          <view class="hero-action" @tap="goToBulletin">
            <text class="hero-action-text">进入公告详情</text>
          </view>
        </view>

        <view class="preview-card">
          <view class="preview-tag">{{ announcement.badge }}</view>
          <text class="preview-title">{{ announcement.title }}</text>
          <text class="preview-summary">{{ announcement.summary }}</text>

          <view class="preview-meta-list">
            <view
              v-for="(item, index) in announcement.meta"
              :key="`${item.label}-${index}`"
              class="preview-meta-row"
            >
              <view class="preview-meta-left">
                <text class="preview-meta-icon">{{ item.icon }}</text>
                <text class="preview-meta-label">{{ item.label }}:</text>
              </view>
              <text class="preview-meta-value">{{ item.value }}</text>
            </view>
          </view>

          <image
            class="preview-image"
            :src="announcement.image.url"
            mode="aspectFill"
            @tap="previewImage(announcement.image.url)"
          />

          <view class="preview-footer">
            <text class="preview-footer-text">{{ announcement.footerHint }}</text>
            <text class="preview-footer-link">查看更多公告 ›</text>
          </view>
        </view>

        <view class="schema-card">
          <text class="schema-title">当前结构化数据</text>
          <text class="schema-content">{{ formattedAnnouncement }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CustomNav from '@/components/CustomNav/CustomNav.vue'

const announcement = {
  badge: '潮玩上新',
  title: 'LABUBU夏日系列盲盒来袭!',
  summary: '夏日限定系列来袭，清凉配色+隐藏款惊喜上线!',
  meta: [
    {
      icon: '🕘',
      label: '上新时间',
      value: '5月15日 20:00',
    },
    {
      icon: '📍',
      label: '发售平台',
      value: '小程序商城',
    },
    {
      icon: '📢',
      label: '规则',
      value: '先到先得，限购2个/人',
    },
    {
      icon: '🔗',
      label: '链接',
      value: '点击前往',
    },
  ],
  image: {
    url: 'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20260506/J1h17780424780M8r6IIolEbQaHWG.png',
  },
  footerHint: '更多内容请查看详情页',
}

const formattedAnnouncement = computed(() => JSON.stringify(announcement, null, 2))

const goToBulletin = () => {
  uni.navigateTo({
    url: '/pages/cats/bulletins',
  })
}

const previewImage = (url: string) => {
  uni.previewImage({
    urls: [url],
    current: url,
  })
}
</script>

<style scoped lang="scss">
.test-page {
  height: 100vh;
  background: #f6f1ea;
}

.test-scroll {
  height: calc(100vh - 176rpx);
}

.test-shell {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.hero-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ffefe0 0%, #ffffff 100%);
  box-shadow: 0 16rpx 40rpx rgba(132, 88, 41, 0.08);
}

.hero-label {
  font-size: 22rpx;
  color: #c26b1f;
  font-weight: 600;
}

.hero-title {
  margin-top: 14rpx;
  display: block;
  font-size: 34rpx;
  line-height: 1.4;
  color: #24170d;
  font-weight: 700;
}

.hero-desc {
  margin-top: 14rpx;
  display: block;
  font-size: 24rpx;
  line-height: 1.7;
  color: #7a6a5b;
}

.hero-action {
  margin-top: 22rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 76rpx;
  padding: 0 28rpx;
  border-radius: 999rpx;
  background: #ff7a00;
  color: #fff;
  align-self: flex-start;
}

.hero-action-text {
  font-size: 26rpx;
  font-weight: 600;
}

.preview-card,
.schema-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 26rpx 24rpx;
  box-shadow: 0 16rpx 40rpx rgba(132, 88, 41, 0.08);
}

.preview-tag {
  display: inline-flex;
  align-items: center;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #fff2e4;
  color: #c26b1f;
  font-size: 22rpx;
  font-weight: 600;
}

.preview-title {
  margin-top: 16rpx;
  display: block;
  font-size: 34rpx;
  line-height: 1.45;
  color: #24170d;
  font-weight: 700;
}

.preview-summary {
  margin-top: 14rpx;
  display: block;
  font-size: 25rpx;
  line-height: 1.7;
  color: #7a6a5b;
}

.preview-meta-list {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.preview-meta-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.preview-meta-left {
  min-width: 180rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
}

.preview-meta-icon,
.preview-meta-label,
.preview-meta-value {
  font-size: 24rpx;
}

.preview-meta-label {
  color: #7d7267;
}

.preview-meta-value {
  flex: 1;
  color: #2b2118;
}

.preview-image {
  margin-top: 28rpx;
  width: 100%;
  height: 320rpx;
  border-radius: 24rpx;
  display: block;
  background: #f5efe7;
}

.preview-footer {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.preview-footer-text {
  flex: 1;
  font-size: 24rpx;
  color: #7a6a5b;
}

.preview-footer-link {
  font-size: 24rpx;
  color: #8f5a28;
  font-weight: 600;
}

.schema-title {
  display: block;
  font-size: 28rpx;
  color: #24170d;
  font-weight: 700;
}

.schema-content {
  margin-top: 16rpx;
  display: block;
  font-size: 22rpx;
  line-height: 1.7;
  color: #6e6258;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

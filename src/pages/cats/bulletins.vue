<template>
  <view class="bulletin-page">
    <CustomNav title="公告详情" />

    <scroll-view class="bulletin-scroll" scroll-y>
      <view class="bulletin-shell">
        <view class="bulletin-card">
          <view class="bulletin-head">
            <view class="bulletin-tag">{{ announcement.badge }}</view>
            <text class="bulletin-title">{{ announcement.title }}</text>
            <text class="bulletin-summary">{{ announcement.summary }}</text>
          </view>

          <view class="bulletin-meta-list">
            <view
              v-for="(item, index) in announcement.meta"
              :key="`${item.label}-${index}`"
              class="meta-row"
              @tap="handleMetaClick(item)"
            >
              <view class="meta-left">
                <text class="meta-icon">{{ item.icon }}</text>
                <text class="meta-label">{{ item.label }}:</text>
              </view>
              <view class="meta-right" :class="{ clickable: !!item.url }">
                <text class="meta-value">{{ item.value }}</text>
                <text v-if="item.url" class="meta-arrow">›</text>
              </view>
            </view>
          </view>

          <view class="hero-wrap">
            <image
              class="hero-image"
              :src="announcement.image.url"
              mode="aspectFill"
              @tap="previewImage(announcement.image.url)"
            />
          </view>

          <view class="bulletin-footer-row">
            <text class="footer-hint">{{ announcement.footerHint }}</text>
            <view class="footer-link" @tap="handleFooterLink">
              <text class="footer-link-text">{{ announcement.footerAction.text }}</text>
              <text class="footer-link-arrow">›</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import CustomNav from '@/components/CustomNav/CustomNav.vue'

type BulletinMetaItem = {
  icon: string
  label: string
  value: string
  url?: string
}

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
      url: '/pages/cats/bulletins/list',
    },
  ] satisfies BulletinMetaItem[],
  image: {
    url: 'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20260506/J1h17780424780M8r6IIolEbQaHWG.png',
  },
  footerHint: '更多内容请查看详情页',
  footerAction: {
    text: '查看更多公告',
    url: '/pages/cats/bulletins/list',
  },
}

const openUrl = (url?: string) => {
  if (!url) return

  if (url.startsWith('http')) {
    uni.navigateTo({
      url: `/pages/webview/index?url=${encodeURIComponent(url)}`,
    })
    return
  }

  uni.navigateTo({ url })
}

const handleMetaClick = (item: BulletinMetaItem) => {
  openUrl(item.url)
}

const handleFooterLink = () => {
  openUrl(announcement.footerAction.url)
}

const previewImage = (url: string) => {
  uni.previewImage({
    urls: [url],
    current: url,
  })
}
</script>

<style scoped lang="scss">
.bulletin-page {
  height: 100vh;
  background: linear-gradient(180deg, #fffaf5 0%, #f6f1ea 100%);
}

.bulletin-scroll {
  height: calc(100vh - 176rpx);
}

.bulletin-shell {
  padding: 28rpx 24rpx 48rpx;
}

.bulletin-card {
  background: #ffffff;
  border-radius: 28rpx;
  padding: 28rpx 24rpx 24rpx;
  box-shadow: 0 18rpx 48rpx rgba(132, 88, 41, 0.08);
}

.bulletin-head {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.bulletin-tag {
  align-self: flex-start;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: #fff2e4;
  color: #c26b1f;
  font-size: 22rpx;
  line-height: 1;
  font-weight: 600;
}

.bulletin-title {
  font-size: 34rpx;
  line-height: 1.45;
  color: #221910;
  font-weight: 700;
}

.bulletin-summary {
  font-size: 25rpx;
  line-height: 1.7;
  color: #766556;
}

.bulletin-meta-list {
  margin-top: 24rpx;
  padding-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.meta-left {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-width: 180rpx;
}

.meta-icon {
  font-size: 24rpx;
  line-height: 1;
}

.meta-label {
  font-size: 24rpx;
  color: #7d7267;
}

.meta-right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-width: 0;

  &.clickable {
    color: #b05d1d;
  }
}

.meta-value {
  font-size: 24rpx;
  line-height: 1.5;
  color: inherit;
  word-break: break-all;
}

.meta-arrow {
  margin-left: 10rpx;
  color: #c0b3a4;
  font-size: 28rpx;
}

.hero-wrap {
  margin-top: 28rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #f5efe7;
}

.hero-image {
  width: 100%;
  height: 320rpx;
  display: block;
}

.bulletin-footer-row {
  margin-top: 26rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.footer-hint {
  flex: 1;
  font-size: 24rpx;
  color: #766556;
}

.footer-link {
  display: inline-flex;
  align-items: center;
  color: #8f5a28;
}

.footer-link-text {
  font-size: 24rpx;
  font-weight: 600;
}

.footer-link-arrow {
  margin-left: 8rpx;
  font-size: 28rpx;
}
</style>

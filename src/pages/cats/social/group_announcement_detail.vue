<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#ffffff',
  },
}
</route>

<template>
  <view class="page">
    <view class="nav" :style="{ paddingTop: safeTop + 'px' }">
      <view class="nav-inner">
        <view class="nav-back" @click="navigateBack">‹</view>
        <text class="nav-title">公告详情</text>
        <view class="nav-more" @click="showActionSheet = true">···</view>
      </view>
    </view>

    <scroll-view class="content" scroll-y :style="{ paddingTop: navHeight + 'px' }">
      <view class="detail" v-if="announcement">
        <text class="tag">公告</text>
        <text class="title">{{ announcement.title }}</text>
        <view class="meta">
          <text>{{ announcement.publisher }}</text>
          <text>{{ announcement.publish_time_text }}</text>
        </view>

        <text class="body">{{ announcement.content }}</text>
        <image class="cover" :src="announcement.cover" mode="aspectFill" />

        <view class="info-card">
          <view class="info-row">
            <text class="info-icon">⏱</text>
            <text class="info-label">发布时间：</text>
            <text class="info-value">{{ announcement.publish_time }}</text>
          </view>
          <view class="info-row">
            <text class="info-icon">⌛</text>
            <text class="info-label">发布平台：</text>
            <text class="info-value">小程序商城</text>
          </view>
          <view class="info-row">
            <text class="info-icon">👥</text>
            <text class="info-label">规则：</text>
            <text class="info-value">{{ announcement.scope }}</text>
          </view>
        </view>

        <text class="tip">* 本公告将展示在群聊顶部</text>
      </view>
    </scroll-view>

    <wd-action-sheet
      v-model="showActionSheet"
      :actions="actions"
      cancel-text="取消"
      @select="handleActionSelect"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  getMockGroupAnnouncementDetail,
  type GroupAnnouncementItem,
} from '@/service/mock/groupAnnouncement'

const systemInfo = uni.getSystemInfoSync()
const safeTop = ref(systemInfo.statusBarHeight || 0)
const navHeight = ref(safeTop.value + 52)
const announcement = ref<GroupAnnouncementItem | null>(null)
const showActionSheet = ref(false)

const actions = [
  {
    name: '置顶',
    subname: '置顶后，该公告将在群聊顶部展示',
    value: 'pin',
  },
  {
    name: '取消置顶',
    subname: '取消后，该公告不再展示在群聊顶部',
    value: 'unpin',
  },
  {
    name: '下架',
    subname: '下架后，群成员将不可见该公告',
    value: 'offline',
  },
]

onLoad((options: any) => {
  announcement.value = getMockGroupAnnouncementDetail(options?.id)
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

const handleActionSelect = ({ item }: any) => {
  const actionName = item?.name || '操作'
  uni.showToast({ title: `${actionName}成功`, icon: 'none' })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: #fff;
}

.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  background: #fff;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.04);
}

.nav-inner {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28rpx;
}

.nav-back,
.nav-more {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111;
  font-size: 42rpx;
  font-weight: 300;
}

.nav-more {
  font-size: 34rpx;
  letter-spacing: -4rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111;
}

.content {
  box-sizing: border-box;
  height: 100vh;
}

.detail {
  padding: 34rpx 36rpx 72rpx;
}

.tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  height: 34rpx;
  padding: 0 10rpx;
  border-radius: 8rpx;
  color: #de8b2f;
  background: #fff3df;
  font-size: 20rpx;
}

.title {
  display: block;
  margin-top: 16rpx;
  color: #121212;
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.38;
}

.meta {
  display: flex;
  gap: 18rpx;
  margin-top: 18rpx;
  color: #8f8f8f;
  font-size: 24rpx;
}

.body {
  display: block;
  margin-top: 34rpx;
  color: #333;
  font-size: 28rpx;
  line-height: 1.8;
  white-space: pre-line;
}

.cover {
  width: 100%;
  height: 360rpx;
  margin-top: 28rpx;
  border-radius: 22rpx;
  background: #eee;
}

.info-card {
  margin-top: 34rpx;
  padding: 8rpx 0;
}

.info-row {
  display: flex;
  align-items: flex-start;
  padding: 12rpx 0;
  color: #2b2b2b;
  font-size: 26rpx;
  line-height: 1.45;
}

.info-icon {
  width: 42rpx;
  margin-top: 2rpx;
}

.info-label {
  flex: 0 0 auto;
  font-weight: 700;
}

.info-value {
  flex: 1;
}

.tip {
  display: block;
  margin-top: 18rpx;
  color: #c2a37b;
  font-size: 24rpx;
}
</style>

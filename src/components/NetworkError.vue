<template>
  <view class="network-error-page">
    <!-- 内容区域 -->
    <view class="content">
      <view class="wifi-icon">
        <wd-img src="/static/images/network_error.png" mode="widthFix" width="45vw"></wd-img>
      </view>
      <view class="title">{{ title }}</view>
      <view class="desc">{{ description }}</view>
      <button class="refresh-btn" @click="handleRefresh">{{ refreshText }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '网络不太顺畅',
  },
  description: {
    type: String,
    default: '请检查网络连接',
  },
  refreshText: {
    type: String,
    default: '刷新',
  },
})

const emit = defineEmits(['refresh'])

const handleRefresh = () => {
  emit('refresh')
}
</script>

<style lang="scss" scoped>
.network-error-page {
  padding-top: 48rpx;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  color: #333;
  overflow: hidden;

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 24px;
    padding-bottom: constant(safe-area-inset-bottom); /* 兼容 iOS 11.0-11.2 */
    padding-bottom: env(safe-area-inset-bottom); /* 兼容 iOS 11.2+ */

    .wifi-icon {
      width: 45vw;
      // height: 120px;
      margin-bottom: 96rpx;

      svg {
        width: 100%;
        height: 100%;
        fill: none;
        stroke: #ccc;
        stroke-width: 2;
        stroke-linecap: round;
      }
    }

    .title {
      font-size: 36rpx;
      color: #333;
      margin-bottom: 12px;
      font-weight: 500;
      font-family: Alibaba PuHuiTi2;
    }

    .desc {
      font-size: 28rpx;
      color: #999;
      margin-bottom: 40px;
      font-family: Alibaba PuHuiTi2;
    }

    .refresh-btn {
      width: 180px;
      height: 45px;
      line-height: 45px;
      background-color: #ff6b03;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 28rpx;
      text-align: center;
      cursor: pointer;
      margin-bottom: 20px;
      font-family: Alibaba PuHuiTi2;

      &:active {
        opacity: 0.8;
      }
    }
  }
}
</style>

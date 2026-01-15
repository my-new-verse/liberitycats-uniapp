<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <SafeArea>
      <view class="navbar">
        <!-- 导航栏内容 -->
      </view>
    </SafeArea>

    <!-- 主要内容区域 -->
    <SafeArea>
      <view class="main-content">
        <!-- 主要内容 -->
      </view>
    </SafeArea>

    <!-- 底部操作栏 -->
    <SafeArea>
      <view class="bottom-bar">
        <!-- 底部操作栏 -->
      </view>
    </SafeArea>
  </view>
</template>

<script setup>
import SafeArea from '@/components/SafeArea.vue'
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.navbar {
  height: 88rpx;
  background-color: #fff;
}

.main-content {
  flex: 1;
  overflow-y: auto;
}

.bottom-bar {
  height: 100rpx;
  background-color: #f5f5f5;
}
</style>

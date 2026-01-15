<template>
  <!-- 只在APP端显示 -->
  #ifdef APP-PLUS
  <view class="safe-area">
    <slot></slot>
  </view>
  #ifdef
  <!-- H5端直接显示内容 -->
  #ifdef H5
  <view>
    <slot></slot>
  </view>
  #ifdef
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'

const safeArea = ref({
  top: 0,
  bottom: 0,
})

const updateSafeArea = () => {
  const systemInfo = uni.getSystemInfoSync()
  safeArea.value = {
    top: systemInfo.safeAreaInsets?.top || 0,
    bottom: systemInfo.safeAreaInsets?.bottom || 0,
  }
}

onMounted(updateSafeArea)
onShow(updateSafeArea)
</script>

<style scoped>
.safe-area {
  padding-top: v-bind('safeArea.top + "px"');
  padding-bottom: v-bind('safeArea.bottom + "px"');
}
</style>

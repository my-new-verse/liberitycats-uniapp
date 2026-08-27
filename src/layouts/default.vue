<template>
  <wd-config-provider :themeVars="themeVars">
    <slot />
    <ActivityPopupHost />
    <wd-toast />
    <wd-message-box />
    <!-- 临时：夜间模式测试开关 -->
    <view class="darkModeTestSwitch" @click="toggleDarkModeTest">
      {{ isDarkTest ? '☀' : '☾' }}
    </view>
  </wd-config-provider>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import ActivityPopupHost from '@/components/ActivityPopup/ActivityPopupHost.vue'

const themeVars: ConfigProviderThemeVars = {}

const isDarkTest = ref(
  typeof document !== 'undefined' && document.documentElement
    ? document.documentElement.style.getPropertyValue('--bg-primary').trim() === '#1a1a1a'
    : false,
)
async function toggleDarkModeTest() {
  const mode = isDarkTest.value ? 'light' : 'dark'
  isDarkTest.value = !isDarkTest.value
  const { applyTheme } = await import('@/utils/theme')
  applyTheme(mode)
  uni.setStorageSync('app_theme', mode)
}
</script>

<style lang="scss" scoped>
.darkModeTestSwitch {
  position: fixed;
  bottom: 200rpx;
  right: 20rpx;
  width: 72rpx;
  height: 72rpx;
  background: rgba(0, 0, 0, 0.5);
  color: var(--bg-card);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  z-index: 99999;
}
</style>

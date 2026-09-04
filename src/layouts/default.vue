<template>
  <wd-config-provider
    :theme-vars="themeVars"
    :font-scale="fontScale"
    :change:font-scale="fontScaleRenderjs.setFontScale"
  >
    <slot />
    <ActivityPopupHost />
    <wd-toast />
    <wd-message-box />
  </wd-config-provider>
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue'
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import ActivityPopupHost from '@/components/ActivityPopup/ActivityPopupHost.vue'
import { resolveFontScale, getStoredFontScale, type FontScaleMode } from '@/utils/fontScale'

const themeVars: ConfigProviderThemeVars = {}

// 字号缩放系数：初始读存储，设置页切换时通过事件通知更新，renderjs 注入视图层
const fontScale = ref(resolveFontScale(getStoredFontScale()))
uni.$on('fontScaleChanged', (mode: FontScaleMode) => {
  fontScale.value = resolveFontScale(mode)
})
onUnmounted(() => {
  uni.$off('fontScaleChanged')
})
</script>

<script module="fontScaleRenderjs" lang="renderjs">
// 视图层脚本：运行在真实 WebView 环境，可操作 DOM，注入字号变量
export default {
  methods: {
    setFontScale(newVal) {
      if (document?.documentElement) {
        document.documentElement.style.setProperty('--font-scale', String(newVal))
        // 特大档（1.5x，与 FONT_SCALE_MAP.xlarge 一致）挂类，供页面做溢出适配
        document.documentElement.classList.toggle('font-scale-xlarge', newVal === 1.5)
      }
    },
  },
}
</script>

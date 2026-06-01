<template>
  <wd-config-provider :theme-vars="themeVars">
    <!-- 主要内容区域，添加底部内边距防止内容被tabbar遮挡 -->
    <view class="page-container" :style="{ paddingBottom: showTabbar ? '50px' : '0' }">
      <slot />
    </view>

    <!-- 使用 v-show 替代 v-if 避免组件重新挂载 -->
    <CustomTabbar v-show="showTabbar" />

    <wd-toast />
    <wd-message-box />
    <AppUpdatePopup
      :model-value="appUpdatePopupShow"
      :title="appUpdatePopupTitle"
      :content="appUpdatePopupContent"
      :clos-able="appUpdatePopupClosAble"
      @close="closeAppUpdatePopup"
      @btn-click="appBtnClick"
      :main-btn-text="t('common.btn.update_btn_txt')"
    />
  </wd-config-provider>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import type { ConfigProviderThemeVars } from 'wot-design-uni'
import CustomTabbar from '@/components/CustomTabbar.vue'
import AppUpdatePopup from '@/components/AppUpdatePopup.vue'
import { openUrl } from '@/utils'
import { t } from '@/locale'

const themeVars: ConfigProviderThemeVars = {
  // 主题变量配置
}

// 使用计算属性获取当前路径
const currentPath = computed(() => {
  const pages = getCurrentPages()
  if (!pages.length) return ''
  return '/' + pages[pages.length - 1].route
})

// 使用 ref 替代计算属性，避免重复计算
const showTabbar = ref(true) // 默认显示，避免初始闪烁

// 监听路由变化
watch(
  currentPath,
  (newPath) => {
    const tabbarPages = [
      '/pages/tabbar/home',
      '/pages/tabbar/mall',
      '/pages/tabbar/game',
      '/pages/tabbar/discover',
      '/pages/tabbar/my',
    ]
    showTabbar.value = tabbarPages.some(
      (path) => newPath.startsWith(path) || (newPath === '/' && path === '/pages/tabbar/home'),
    )
  },
  { immediate: true },
)

// 更新提示相关逻辑
const isClose = computed(() => {
  const systemConfig = uni.getStorageSync('systemConfigV2')

  const data = uni.getStorageSync('app_update_close')
  if (data == null) return false
  // 兼容旧版直接存布尔值 true 的情况
  if (typeof data === 'boolean') return false
  // 只有版本号匹配且 closed 为 true 才认为已关闭
  return data.version === systemConfig?.update?.version && data.closed === true
})

const appUpdatePopupShow = ref(false)
const appUpdatePopupTitle = ref('')
const appUpdatePopupContent = ref('')
const appUpdatePopupClosAble = ref(false)
const appUpdateUrl = ref('')

onMounted(() => {
  const systemConfig = uni.getStorageSync('systemConfigV2')
  console.log('-----------', systemConfig?.update?.version, !isClose.value)
  if (systemConfig?.update?.version && !isClose.value) {
    appUpdatePopupTitle.value = systemConfig.update.update_log?.title || ''
    appUpdatePopupContent.value = systemConfig.update.update_log?.content || ''
    appUpdatePopupClosAble.value = systemConfig.update?.is_force_update !== 1
    appUpdateUrl.value = systemConfig.update.url || ''
    appUpdatePopupShow.value = true
  }
})

const appBtnClick = () => {
  if (appUpdateUrl.value) {
    openUrl(appUpdateUrl.value)
  }
}

const closeAppUpdatePopup = () => {
  const systemConfig = uni.getStorageSync('systemConfigV2')
  appUpdatePopupShow.value = false
  uni.setStorageSync('app_update_close', {
    version: systemConfig?.update?.version, // 当前版本号
    closed: true,
  })
}
</script>

<style scoped>
/* 添加过渡效果 */
.page-container {
  box-sizing: border-box;
  min-height: 100vh;
  transition: padding-bottom 0.3s ease;
}
</style>

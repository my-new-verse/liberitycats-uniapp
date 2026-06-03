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
import buildInfo from '@/../build-info.json'
import { getSystemConfigApiV2 } from '@/service/api/user'
import { t } from '@/locale'
const version = `${buildInfo.version}`

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
const systemConfig = ref(uni.getStorageSync('systemConfigV2'))

onShow(() => {
  const systemInfo = uni.getSystemInfoSync()
  // const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
  const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
  getSystemConfigApiV2(version, platform).then((res) => {
    const newUpdate = res.data?.update

    // update 为空表示已是最新版本，不再展示弹窗
    systemConfig.value = { ...systemConfig.value, update: newUpdate ?? null }
    uni.setStorageSync('systemConfigV2', systemConfig.value)
  })
})

// 用 ref 追踪关闭状态，因为 uni.getStorageSync 不是响应式的
const updateDismissed = ref(
  (() => {
    const data = uni.getStorageSync('app_update_close')
    if (data == null || typeof data === 'boolean') return false
    return data.version === systemConfig.value?.update?.version && data.closed === true
  })(),
)

const isClose = computed(() => updateDismissed.value)

const appUpdatePopupShow = computed(() => {
  return !!systemConfig.value?.update?.version && !isClose.value
})
const appUpdatePopupTitle = computed(() => systemConfig.value?.update?.update_log?.title || '')
const appUpdatePopupContent = computed(() => systemConfig.value?.update?.version || '')
const appUpdatePopupClosAble = computed(() => systemConfig.value?.update?.is_force_update !== 1)
const appUpdateUrl = computed(() => systemConfig.value?.update?.url || '')

const dismissUpdate = () => {
  uni.setStorageSync('app_update_close', {
    version: systemConfig.value?.update?.version,
    closed: true,
  })
  updateDismissed.value = true // 触发响应式更新
}

const appBtnClick = () => {
  if (appUpdateUrl.value) {
    dismissUpdate()
    openUrl(appUpdateUrl.value)
  }
}

const closeAppUpdatePopup = () => {
  dismissUpdate()
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

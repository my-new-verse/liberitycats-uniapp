<template>
  <wd-popup
    :model-value="modelValue"
    custom-class="globalPopupBox"
    :close-on-click-modal="false"
    :modal-style="`z-index: ${modalZIndex}; position: fixed;`"
    :z-index="popupZIndex"
    :lock-scroll="true"
    :closable="closAbele"
    @close="closePopup"
  >
    <view class="titleBox">
      <view class="title">{{ title || t('my.menu.update.popup.title') }}</view>
      <view class="version" v-if="version">{{ version }}</view>
    </view>
    <view class="contentBox">
      <view>{{ t('my.menu.update.popup.current_version') }}:{{ currentVersion }}</view>
      <view class="content-title">{{ t('my.menu.update.popup.content_title') }}</view>
      <scroll-view class="scrollBox" :scroll-y="true">
        <rich-text :nodes="content"></rich-text>
      </scroll-view>
    </view>
    <view v-if="isDownloading" class="progress">
      <view class="progress-tip">
        <view class="title">{{ t('my.menu.update.popup.download_progress') }}</view>
        <view class="value">{{ downloadProgress }}%</view>
      </view>
      <wd-progress :percentage="downloadProgress" hide-text color="#ff6b03" />
    </view>
    <!-- 下载失败提示 -->
    <view v-if="downloadFailed" class="download-error">
      <view class="error-text">⚠️ {{ t('my.menu.update.popup.download_failed') }}</view>
      <view class="error-hint">{{ t('my.menu.update.popup.download_failed_hint') }}</view>
    </view>
    <view class="btnBox" v-if="platform === 'ios'">
      <wd-button type="success" custom-class="mainBtn" @click="btnClick()">
        {{ mainBtnText }}
      </wd-button>
    </view>
    <view class="btnBox" v-else>
      <wd-button
        type="success"
        custom-class="mainBtn"
        :disabled="isDownloading"
        :loading="isDownloading"
        loading-color="#ff6b03"
        @click="btnClick(true)"
      >
        {{
          isDownloading
            ? t('my.menu.update.popup.downloading')
            : downloadFailed
              ? t('my.menu.update.popup.retry')
              : mainBtnText
        }}
      </wd-button>
      <wd-button
        type="success"
        custom-class="mainBtn mainBtnPlain"
        :disabled="isDownloading"
        @click="btnClick()"
        plain
      >
        {{ t('my.menu.update.popup.open_in_browser') }}
      </wd-button>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { t } from '@/locale'
import buildInfo from '@/../build-info.json'
const currentVersion = `${buildInfo.version}`

declare const plus: any

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    default: '这里是默认内容',
  },
  popupZIndex: {
    type: Number,
    default: 10000,
  },
  modalZIndex: {
    type: Number,
    default: 9999,
  },
  mainBtnText: {
    type: String,
    default: 'Main Btn',
  },
  closAbele: {
    type: Boolean,
    default: true,
  },
  version: {
    type: String,
    default: '',
  },
  url: {
    type: String,
    default: '',
  },
})

const emits = defineEmits(['update:modelValue', 'btnClick', 'close', 'downloadError'])

const isDownloading = ref(false)
const downloadProgress = ref(0)
const downloadFailed = ref(false)

let downloadTask: any = null
let retryCount = 0 // 已自动重试次数，最多自动重试 1 次
const platform = ref(uni.getSystemInfoSync().platform?.toLowerCase() || '')

// 后台完成下载时暂存安装路径，等待回到前台再执行安装
let pendingInstallPath: string | null = null
let isInBackground = false

// 已下载 APK 的 storage key，格式：app_update_apk_{version}
function getApkCacheKey(version: string) {
  return `app_update_apk_${version || 'latest'}`
}

/** 检查已缓存的 APK 文件是否仍然存在，返回 file:// 路径或 null */
function getCachedApkPath(version: string): Promise<string | null> {
  return new Promise((resolve) => {
    const key = getApkCacheKey(version)
    const cached = uni.getStorageSync(key)
    if (!cached) {
      resolve(null)
      return
    }
    // #ifdef APP-PLUS
    // 验证文件是否真实存在（安装包可能被系统清理）
    plus.io.resolveLocalFileSystemURL(
      cached,
      () => resolve(cached),
      () => {
        uni.removeStorageSync(key)
        resolve(null)
      },
    )
    // #endif
    // #ifndef APP-PLUS
    resolve(null)
    // #endif
  })
}

/** 缓存已下载的 APK 路径 */
function saveApkCache(version: string, nativePath: string) {
  uni.setStorageSync(getApkCacheKey(version), nativePath)
}

// #ifdef APP-PLUS
function doInstall(nativePath: string) {
  plus.runtime.install(
    nativePath,
    {},
    () => {
      console.log('[AppUpdate] APK 安装成功')
      emits('btnClick')
      plus.runtime.restart()
    },
    (err: any) => {
      console.warn('[AppUpdate] APK 安装失败:', err)
    },
  )
}

const onPause = () => {
  isInBackground = true
  console.log('[AppUpdate] App 切入后台，下载任务继续运行')
}

const onResume = () => {
  isInBackground = false
  console.log('[AppUpdate] App 回到前台')
  // 后台完成下载的安装任务，回前台后立即执行
  if (pendingInstallPath) {
    const path = pendingInstallPath
    pendingInstallPath = null
    doInstall(path)
  }
}

onMounted(() => {
  plus.globalEvent.addEventListener('pause', onPause)
  plus.globalEvent.addEventListener('resume', onResume)
})

onUnmounted(() => {
  plus.globalEvent.removeEventListener('pause', onPause)
  plus.globalEvent.removeEventListener('resume', onResume)
})
// #endif

const btnClick = async (isDownload: false) => {
  console.log('isDownload', isDownload)
  if (!isDownload || !props.url) {
    emits('btnClick', true)
    return
  }

  // iOS 不需要下载 APK，直接 emit 由外部处理（如跳转 App Store）
  // #ifdef APP-PLUS
  console.log(platform.value)
  if (platform.value === 'ios') {
    emits('btnClick', true)
    return
  }

  // 先检查是否已有缓存的 APK
  const cachedPath = await getCachedApkPath(props.version)
  if (cachedPath) {
    console.log('[AppUpdate] 使用已缓存 APK，跳过下载:', cachedPath)
    doInstall(cachedPath)
    return
  }
  // #endif

  if (isDownloading.value) return

  // 手动重试时重置错误状态和自动重试计数
  downloadFailed.value = false
  retryCount = 0
  startDownload()
}

function startDownload() {
  isDownloading.value = true
  downloadProgress.value = 0
  downloadTask = uni.downloadFile({
    url: props.url,
    success: (res: any) => {
      isDownloading.value = false
      downloadProgress.value = 100

      if (res.statusCode === 200) {
        // #ifdef APP-PLUS
        const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(res.tempFilePath)
        // 保存缓存，下次无需重复下载
        saveApkCache(props.version, nativePath)
        if (isInBackground) {
          // 在后台完成下载，暂存路径，回到前台后再安装
          console.log('[AppUpdate] 后台下载完成，等待回到前台安装')
          pendingInstallPath = nativePath
        } else {
          doInstall(nativePath)
        }
        // #endif
      } else {
        // 非 200 响应（如 400 URL 失效）——尝试自动重试一次
        console.warn('[AppUpdate] 下载失败, statusCode:', res.statusCode)
        uni.removeStorageSync(getApkCacheKey(props.version))
        handleDownloadFailure(res.statusCode)
      }
    },
    fail: (err: any) => {
      isDownloading.value = false
      downloadTask = null
      downloadProgress.value = 0
      console.warn('[AppUpdate] 下载失败:', err)
      handleDownloadFailure(null)
    },
  })

  downloadTask.onProgressUpdate((res) => {
    if (res.totalBytesExpectedToWrite > 0) {
      downloadProgress.value = res.progress
    }
  })
}

function handleDownloadFailure(statusCode: number | null) {
  if (retryCount < 1) {
    retryCount++
    console.log(`[AppUpdate] 自动重试 (${retryCount}/1)…`)
    // 延迟 1s 再重试，避免立即再请求败利服务器
    setTimeout(() => startDownload(), 1000)
  } else {
    // 自动重试已用尽，展示错误 UI 由用户手动重试
    downloadFailed.value = true
    if (statusCode !== null) emits('downloadError', statusCode)
  }
}

const closePopup = () => {
  emits('close')
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
:deep(.globalPopupBox) :not(.wd-popup__close):not(.wd-icon-add) {
  font-family: 'Alibaba PuHuiTi2' !important;
}
:deep(.globalPopupBox) {
  position: relative;
  z-index: 10000 !important;
  width: calc(100% - 128rpx);
  padding: 0;
  padding-bottom: 48rpx !important;
  background-color: #ffffff;
  border-radius: 24rpx;
  font-family: 'Alibaba PuHuiTi2' !important;

  .wd-popup__close {
    color: #ffffff;
  }
  .titleBox {
    height: 124rpx;
    margin-bottom: 24rpx;
    font-size: 32rpx;
    color: rgba(0, 0, 0, 0.9);
    align-items: center;
    text-align: center;
    background: linear-gradient(135deg, #ff6b03, #ff8833);
    display: flex;
    padding: 0 24rpx;
    color: #fff;
    gap: 24rpx;
    .version {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.92);
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 14px;
      border-radius: 20px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
    }
  }

  .contentBox {
    min-height: 140rpx;
    max-height: 560rpx;
    overflow-y: scroll;
    margin: 24rpx 48rpx;
    .content-title {
      color: var(--liberty-cats-primary-color);
      font-weight: 500;
    }

    * {
      line-height: 1.4;
    }
  }
  .progress {
    background: #f5f6fa;
    border-radius: 14px;
    padding: 16px 18px 14px 18px;
    border: 1px solid rgba(255, 107, 3, 0.06);
    margin: 0 48rpx;
    margin-bottom: 24rpx;
    display: flex;
    flex-wrap: wrap;
    .progress-tip {
      width: 100%;
      display: flex;
      justify-content: space-between;
      color: #6b6b80;
      font-size: 28rpx;
      font-weight: 500;
      margin-bottom: 12rpx;
    }
  }
  .download-error {
    margin: 0 48rpx 24rpx;
    padding: 20rpx 24rpx;
    background: #fff3f0;
    border: 1px solid rgba(255, 77, 54, 0.2);
    border-radius: 12rpx;
    .error-text {
      font-size: 28rpx;
      color: #e53935;
      font-weight: 500;
      margin-bottom: 8rpx;
    }
    .error-hint {
      font-size: 24rpx;
      color: #999;
      line-height: 1.5;
    }
  }
  .btnBox {
    margin: 0 48rpx;
    justify-content: space-between;
    display: flex;
    gap: 14rpx;
    .mainBtnPlain {
      border-color: #ff6b03 !important;
      background: #ffffff !important;
      color: #ff6b03 !important;
    }
  }
}
</style>

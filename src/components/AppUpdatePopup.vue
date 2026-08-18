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
      <view style="color: #000">
        {{ t('my.menu.update.popup.current_version') }}:{{ currentVersion }}
      </view>
      <view class="content-title">{{ t('my.menu.update.popup.content_title') }}</view>
      <scroll-view class="scrollBox" :scroll-y="true">
        <rich-text :nodes="content" style="color: #333"></rich-text>
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
              : hasDownloaded
                ? t('my.menu.update.popup.install')
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const hasDownloaded = ref(false)

/** 更新流程是否仍在进行中（未完成安装），进行中时禁止关闭弹窗 */
const canClose = computed(() => {
  // 下载中、已下载待安装、下载失败均不允许关闭
  if (isDownloading.value || hasDownloaded.value || downloadFailed.value) return false
  return props.closAbele
})

let downloadTask: any = null
let retryCount = 0 // 已自动重试次数，最多自动重试 1 次
const platform = ref(uni.getSystemInfoSync().platform?.toLowerCase() || '')

// 后台完成下载时暂存安装路径，等待回到前台再执行安装
let pendingInstallPath: string | null = null
let isInBackground = false

// APK 持久化目录（参考 webviewResourceCache.ts 的 _doc/webview_cache/ 模式）
const APK_DIR = '_doc/apk_download/'

// 已下载 APK 的 storage key，格式：app_update_apk_{version}
function getApkCacheKey(version: string) {
  return `app_update_apk_${version || 'latest'}`
}

/** 确保 APK 下载目录存在 */
function ensureApkDir(): Promise<void> {
  return new Promise((resolve) => {
    try {
      plus.io.resolveLocalFileSystemURL(
        APK_DIR,
        () => resolve(),
        () => {
          plus.io.resolveLocalFileSystemURL(
            '_doc/',
            (entry: any) => {
              entry.getDirectory(
                'apk_download',
                { create: true },
                () => resolve(),
                () => resolve(),
              )
            },
            () => resolve(),
          )
        },
      )
    } catch {
      resolve()
    }
  })
}

/** 获取 APK 在持久化目录中的相对路径 */
function getApkLocalPath(version: string): string {
  return `${APK_DIR}update_${version || 'latest'}.apk`
}

/** 将临时文件移动到 _doc/apk_download/ 目录（参考 webviewResourceCache.ts moveTempFile） */
function moveApkToPersistent(
  tempFilePath: string,
  version: string,
  resolve: (nativePath: string) => void,
): void {
  const targetName = `update_${version || 'latest'}.apk`
  const targetPath = getApkLocalPath(version)

  // 先删除可能存在的旧文件，再移动
  plus.io.resolveLocalFileSystemURL(
    targetPath,
    (existingEntry: any) => {
      existingEntry.remove(
        () => doMoveApk(tempFilePath, targetName, resolve),
        () => doMoveApk(tempFilePath, targetName, resolve),
      )
    },
    () => doMoveApk(tempFilePath, targetName, resolve),
  )
}

/** 执行文件移动 */
function doMoveApk(
  tempFilePath: string,
  targetName: string,
  resolve: (nativePath: string) => void,
): void {
  plus.io.resolveLocalFileSystemURL(
    tempFilePath,
    (tempEntry: any) => {
      plus.io.resolveLocalFileSystemURL(
        APK_DIR,
        (dirEntry: any) => {
          tempEntry.moveTo(
            dirEntry,
            targetName,
            () => {
              const targetPath = `${APK_DIR}${targetName}`
              const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(targetPath)
              console.log('[AppUpdate] APK 移动到持久化目录:', nativePath)
              resolve(nativePath)
            },
            (err: any) => {
              console.warn('[AppUpdate] 移动 APK 失败，使用临时路径:', err)
              const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(tempFilePath)
              resolve(nativePath)
            },
          )
        },
        () => {
          // 目录不存在，先创建再重试
          ensureApkDir().then(() => {
            plus.io.resolveLocalFileSystemURL(
              APK_DIR,
              (dirEntry2: any) => {
                tempEntry.moveTo(
                  dirEntry2,
                  targetName,
                  () => {
                    const targetPath = `${APK_DIR}${targetName}`
                    const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(targetPath)
                    console.log('[AppUpdate] APK 移动到持久化目录(重试):', nativePath)
                    resolve(nativePath)
                  },
                  (err2: any) => {
                    console.warn('[AppUpdate] 移动 APK 失败(重试)，使用临时路径:', err2)
                    const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(tempFilePath)
                    resolve(nativePath)
                  },
                )
              },
              () => {
                const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(tempFilePath)
                resolve(nativePath)
              },
            )
          })
        },
      )
    },
    () => {
      console.warn('[AppUpdate] 临时文件不存在:', tempFilePath)
      const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(tempFilePath)
      resolve(nativePath)
    },
  )
}

/** 检查已缓存的 APK 文件是否仍然存在，返回 file:// 路径或 null */
function getCachedApkPath(version: string): Promise<string | null> {
  return new Promise((resolve) => {
    // #ifdef APP-PLUS
    // 优先从 storage 缓存中取路径
    const key = getApkCacheKey(version)
    const cached = uni.getStorageSync(key)
    if (cached) {
      // 验证 storage 中记录的文件是否真实存在
      plus.io.resolveLocalFileSystemURL(
        cached,
        () => resolve(cached),
        () => {
          uni.removeStorageSync(key)
          // storage 缓存失效，继续尝试从 apk_download 目录查找
          checkApkInDir(version, resolve)
        },
      )
      return
    }
    // storage 无缓存，直接从 _doc/apk_download/ 目录查找
    checkApkInDir(version, resolve)
    // #endif
    // #ifndef APP-PLUS
    resolve(null)
    // #endif
  })
}

/** 直接从 _doc/apk_download/ 目录检查 APK 文件是否存在 */
function checkApkInDir(version: string, resolve: (path: string | null) => void): void {
  // #ifdef APP-PLUS
  const localPath = getApkLocalPath(version)
  plus.io.resolveLocalFileSystemURL(
    localPath,
    () => {
      const nativePath = 'file://' + plus.io.convertLocalFileSystemURL(localPath)
      console.log('[AppUpdate] 从 apk_download 目录找到 APK:', nativePath)
      // 回填 storage 缓存
      saveApkCache(version, nativePath)
      resolve(nativePath)
    },
    () => resolve(null),
  )
  // #endif
}

/** 缓存已下载的 APK 路径 */
function saveApkCache(version: string, nativePath: string) {
  uni.setStorageSync(getApkCacheKey(version), nativePath)
}

// #ifdef APP-PLUS
/** 提取纯版本号（去掉 _buildNo 等后缀），用于跨版本比对 */
function extractVersion(version: string): string {
  return version.split('_')[0]
}

/** 检查上次更新是否已完成（buildInfo.version 与待安装版本一致则说明安装成功，清理残留 APK） */
function checkPreviousInstallSuccess() {
  const pendingVersion = uni.getStorageSync('app_update_pending_version')
  if (!pendingVersion) return
  // 当前构建版本 === 待安装版本（均提取纯版本号比对，忽略构建号后缀），说明安装已成功完成
  if (extractVersion(currentVersion) === extractVersion(pendingVersion)) {
    console.log('[AppUpdate] 检测到上次更新已成功，清理残留 APK:', pendingVersion)
    const localPath = getApkLocalPath(pendingVersion)
    plus.io.resolveLocalFileSystemURL(
      localPath,
      (entry: any) => {
        entry.remove(
          () => console.log('[AppUpdate] 残留 APK 已删除'),
          () => {},
        )
      },
      () => {},
    )
    uni.removeStorageSync(getApkCacheKey(pendingVersion))
    uni.removeStorageSync('app_update_pending_version')
  }
}

function doInstall(nativePath: string) {
  // 记录待安装版本，用于下次启动时通过 buildInfo.version 比对判断是否安装成功
  uni.setStorageSync('app_update_pending_version', props.version)

  plus.runtime.install(
    nativePath,
    {},
    () => {
      console.log('[AppUpdate] 已调起系统安装界面，等待用户确认安装')
      // emits('btnClick')
    },
    (err: any) => {
      console.warn('[AppUpdate] 调起安装失败:', err)
      uni.removeStorageSync('app_update_pending_version')
    },
  )
}

/** 安装成功后删除持久化的 APK 文件 */
function deleteApkFile(nativePath: string) {
  try {
    plus.io.resolveLocalFileSystemURL(
      nativePath,
      (entry) => {
        entry.remove(
          () => console.log('[AppUpdate] APK 文件已删除'),
          () => console.warn('[AppUpdate] APK 文件删除失败'),
        )
      },
      () => {},
    )
  } catch (e) {}
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
  // 检查上次更新是否已完成（版本匹配则清理残留 APK）
  checkPreviousInstallSuccess()
})

onUnmounted(() => {
  plus.globalEvent.removeEventListener('pause', onPause)
  plus.globalEvent.removeEventListener('resume', onResume)
})
// #endif

// 弹窗打开时检查是否已有缓存的 APK
watch(
  () => props.modelValue,
  async (val) => {
    if (!val) return
    // #ifdef APP-PLUS
    if (platform.value === 'ios') return
    const cachedPath = await getCachedApkPath(props.version)
    hasDownloaded.value = !!cachedPath
    // #endif
  },
  { immediate: true },
)

const btnClick = async (isDownload: boolean) => {
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

  // 已下载过，直接安装
  if (hasDownloaded.value) {
    const cachedPath = await getCachedApkPath(props.version)
    if (cachedPath) {
      console.log('[AppUpdate] 使用已缓存 APK，直接安装:', cachedPath)
      doInstall(cachedPath)
      return
    }
    // 缓存已失效，重置状态重新下载
    hasDownloaded.value = false
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
        // 将临时文件移动到 _doc/apk_download/ 持久化目录，避免被系统清理
        ensureApkDir().then(() => {
          moveApkToPersistent(res.tempFilePath, props.version, (nativePath) => {
            saveApkCache(props.version, nativePath)
            hasDownloaded.value = true
            if (isInBackground) {
              console.log('[AppUpdate] 后台下载完成，等待回到前台安装')
              pendingInstallPath = nativePath
            } else {
              doInstall(nativePath)
            }
          })
        })
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

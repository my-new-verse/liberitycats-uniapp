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
        {{ isDownloading ? t('my.menu.update.popup.downloading') : mainBtnText }}
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
import { ref } from 'vue'
import { t } from '@/locale'

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

const emits = defineEmits(['update:modelValue', 'btnClick', 'close'])

const isDownloading = ref(false)
const downloadProgress = ref(0)

let downloadTask: any = null
const platform = ref(uni.getSystemInfoSync().platform?.toLowerCase() || '')

const btnClick = (isDownload: false) => {
  console.log('isDownload', isDownload)
  if (!isDownload || !props.url) {
    emits('btnClick')
    return
  }

  // iOS 不需要下载 APK，直接 emit 由外部处理（如跳转 App Store）
  // #ifdef APP-PLUS
  console.log(platform.value)
  if (platform.value === 'ios') {
    emits('btnClick')
    return
  }
  // #endif

  if (isDownloading.value) return

  isDownloading.value = true
  downloadProgress.value = 0
  downloadTask = uni.downloadFile({
    url: props.url,
    success: (res: any) => {
      isDownloading.value = false
      downloadProgress.value = 100

      if (res.statusCode === 200) {
        // #ifdef APP-PLUS
        plus.runtime.install(
          res.tempFilePath,
          { force: true },
          () => {
            console.log('[AppUpdate] APK 安装成功')
            emits('btnClick')
          },
          (err: any) => {
            console.warn('[AppUpdate] APK 安装失败:', err)
          },
        )
        // #endif
      } else {
        console.warn('[AppUpdate] 下载失败, statusCode:', res.statusCode)
        uni.showToast({ title: t('my.menu.update.popup.download_failed'), icon: 'none' })
      }
    },
    fail: (err: any) => {
      isDownloading.value = false
      downloadTask = null
      console.warn('[AppUpdate] 下载失败:', err)
      uni.showToast({ title: t('my.menu.update.popup.download_failed'), icon: 'none' })
    },
  })

  downloadTask.onProgressUpdate((res) => {
    if (res.totalBytesExpectedToWrite > 0) {
      downloadProgress.value = res.progress
    }
  })
}

const closePopup = () => {
  emits('close')
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
:deep(.globalPopupBox) {
  position: relative;
  z-index: 10000 !important;
  width: calc(100% - 128rpx);
  padding: 0;
  padding-bottom: 48rpx !important;
  background-color: #ffffff;
  border-radius: 24rpx;
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

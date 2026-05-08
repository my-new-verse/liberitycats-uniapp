<template>
  <view v-if="isChatbotEnabled">
    <movable-area class="movable-area">
      <movable-view
        class="movable-view"
        direction="all"
        :x="x"
        :y="y"
        :damping="30"
        :friction="2"
        @change="onChange"
        @touchstart="onTouchStart"
        @touchend="onDragEnd"
        @click="handleCatClick"
      >
        <view class="cat-body" :class="{ 'is-dragging-body': false }">
          <image
            :src="`/static/images/${currentImgName}.gif`"
            class="cat-img normal-img"
            :class="{ hidden: false }"
            mode="aspectFit"
          />
          <image
            src="/static/images/01.png"
            class="cat-img drag-img"
            :class="{ show: false }"
            mode="aspectFit"
          />
        </view>
      </movable-view>
    </movable-area>

    <view v-if="isProcessing" class="custom-loading-mask">
      <view class="orange-spinner"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { getChatBotTempTokenApi } from '@/service/api/chatbot'
import { ref, onMounted, nextTick, computed } from 'vue'
import { toUrl } from '@/utils'
import { useUserStore } from '@/store'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()

const userStore = useUserStore()
const isProcessing = ref(false)

const ICON_SIZE_RPX = 120
const PADDING_RPX = 10
const sysInfo = uni.getSystemInfoSync()
const rpxToPx = sysInfo.screenWidth / 750

const x = ref(0)
const y = ref(0)
const lastX = ref(0)
const lastY = ref(0)

const isDragging = ref(false)
const hasMoved = ref(false)

const currentImgName = ref('01')

const onTouchStart = () => {
  hasMoved.value = false
}

const isChatbotEnabled = computed(() => {
  if (!systemStore.ready) return false
  return systemStore.config?.config?.common?.chatbot_enable === '1'
})

const onChange = (e: any) => {
  if (e.detail.source === 'touch') {
    if (!hasMoved.value) {
      hasMoved.value = true
      isDragging.value = true
    }
    lastX.value = e.detail.x
    lastY.value = e.detail.y
    const screenWidthPx = sysInfo.screenWidth
    const iconSizePx = ICON_SIZE_RPX * rpxToPx
    if (lastX.value + iconSizePx / 2 > screenWidthPx / 2) {
      currentImgName.value = '02' // 靠右侧
    } else {
      currentImgName.value = '01' // 靠左侧
    }
  }
}

const onDragEnd = () => {
  if (!hasMoved.value) {
    isDragging.value = false
    return
  }

  setTimeout(() => {
    isDragging.value = false
    hasMoved.value = false

    const iconSizePx = ICON_SIZE_RPX * rpxToPx
    const screenWidthPx = sysInfo.screenWidth
    const paddingPx = PADDING_RPX * rpxToPx

    let targetX = 0
    if (lastX.value + iconSizePx / 2 > screenWidthPx / 2) {
      targetX = screenWidthPx - iconSizePx - paddingPx
      currentImgName.value = '02'
    } else {
      targetX = paddingPx
      currentImgName.value = '01'
    }

    if (x.value === targetX) x.value = targetX + 0.1
    nextTick(() => {
      x.value = targetX
      y.value = lastY.value
    })
  }, 10)
}

const handleCatClick = () => {
  if (hasMoved.value || isProcessing.value) return

  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true, false)
    return
  }

  console.log('猫猫被点击了，准备进入 AI 界面')
  isProcessing.value = true

  getChatBotTempTokenApi()
    .then((res) => {
      const jumpUrl = res.data.jumpUrl + '&t=' + Date.now()

      uni.navigateTo({
        url: `/pages/webview/index?url=${jumpUrl}`,
      })
    })
    .catch((err) => {
      console.error(err)
    })
    .finally(() => {
      setTimeout(() => {
        isProcessing.value = false
      }, 800)
    })
}

onMounted(() => {
  const iconSizePx = ICON_SIZE_RPX * rpxToPx
  const paddingPx = PADDING_RPX * rpxToPx
  //   x.value = sysInfo.screenWidth - iconSizePx - paddingPx
  x.value = paddingPx // 默认靠左
  y.value = sysInfo.screenHeight * 0.7
  lastX.value = x.value
  lastY.value = y.value
})
</script>

<style scoped>
.movable-area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
}
.movable-view {
  width: 120rpx;
  height: 120rpx;
  pointer-events: auto;
}
.cat-body {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  will-change: transform;
}

.is-dragging-body {
  transform: scale(1.15);
}

.cat-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 120rpx;
  height: 120rpx;
  transition: opacity 0.2s ease-in-out;
  will-change: opacity;
}

.drag-img {
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.normal-img {
  opacity: 1;
}

.cat-img.show {
  opacity: 1;
  transform: scale(1);
}
.cat-img.hidden {
  opacity: 0;
}

.custom-loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  pointer-events: auto;
}

.orange-spinner {
  width: 64rpx;
  height: 64rpx;
  border: 6rpx solid #ffe0b2;
  border-top: 6rpx solid #ff9800;
  border-radius: 50%;
  animation: spinner 0.8s linear infinite;
}

@keyframes spinner {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>

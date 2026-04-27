<template>
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
      <view class="cat-body" :class="{ 'is-dragging-body': isDragging }">
        <image
          src="/static/images/cat.png"
          class="cat-img normal-img"
          :class="{ hidden: isDragging }"
          mode="aspectFit"
        />
        <image
          src="/static/images/cat_drag.png"
          class="cat-img drag-img"
          :class="{ show: isDragging }"
          mode="aspectFit"
        />
      </view>
    </movable-view>
  </movable-area>
</template>

<script setup lang="ts">
import { getChatBotTempTokenApi } from '@/service/api/chatbot'
import { ref, onMounted, nextTick } from 'vue'
import { toUrl } from '@/utils'
import { useUserStore } from '@/store'

const userStore = useUserStore()

const ICON_SIZE_RPX = 80
const PADDING_RPX = 10
const sysInfo = uni.getSystemInfoSync()
const rpxToPx = sysInfo.screenWidth / 750

const x = ref(0)
const y = ref(0)
const lastX = ref(0)
const lastY = ref(0)

const isDragging = ref(false)
const hasMoved = ref(false)

const onTouchStart = () => {
  hasMoved.value = false
}

const onChange = (e: any) => {
  if (e.detail.source === 'touch') {
    if (!hasMoved.value) {
      hasMoved.value = true
      isDragging.value = true
    }
    lastX.value = e.detail.x
    lastY.value = e.detail.y
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
    } else {
      targetX = paddingPx
    }

    if (x.value === targetX) x.value = targetX + 0.1
    nextTick(() => {
      x.value = targetX
      y.value = lastY.value
    })
  }, 10)
}

const handleCatClick = () => {
  if (hasMoved.value) return

  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true, false)
    return
  }

  console.log('猫猫被点击了，准备进入 AI 界面')

  getChatBotTempTokenApi().then((res) => {
    const jumpUrl = res.data.jumpUrl + '&t=' + Date.now()

    uni.navigateTo({
      url: `/pages/webview/index?url=${jumpUrl}`,
    })
  })
}

onMounted(() => {
  const iconSizePx = ICON_SIZE_RPX * rpxToPx
  const paddingPx = PADDING_RPX * rpxToPx
  x.value = sysInfo.screenWidth - iconSizePx - paddingPx
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
  width: 80rpx;
  height: 80rpx;
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
  width: 80rpx;
  height: 80rpx;
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
</style>

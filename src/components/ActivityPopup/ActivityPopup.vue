<template>
  <wd-popup
    :model-value="visible"
    :close-on-click-modal="false"
    :closable="false"
    custom-class="activityPopupBox"
    :z-index="10001"
    :lock-scroll="true"
    @close="handleClose"
  >
    <view class="popupContainer" :style="{ background: backgroundColor }">
      <!-- 关闭按钮 -->
      <view v-if="dismissible" class="closeBtn" @click="handleClose">
        <text class="closeIcon">✕</text>
      </view>

      <!-- 主标题 -->
      <view class="mainTitle">{{ title }}</view>

      <!-- 副标题 -->
      <view v-if="subtitle" class="subTitle">{{ subtitle }}</view>

      <!-- 图片 -->
      <view class="imageArea">
        <template v-if="!imageFailed && !imageLoading && images.length === 1">
          <image
            :src="images[0]"
            class="popupImage"
            mode="widthFix"
            @load="onImageLoad"
            @error="onImageError"
          />
        </template>
        <template v-else-if="!imageFailed && !imageLoading && images.length > 1">
          <swiper
            class="imageSwiper"
            :indicator-dots="images.length > 1"
            indicator-color="rgba(255,255,255,0.3)"
            indicator-active-color="#fff"
            :current="swiperIndex"
            @change="onSwiperChange"
          >
            <swiper-item v-for="(url, idx) in images" :key="idx">
              <image
                :src="url"
                class="popupImage"
                mode="widthFix"
                @load="onImageLoad"
                @error="onImageError"
              />
            </swiper-item>
          </swiper>
        </template>
        <view v-if="imageLoading" class="imageStatus">
          <wd-loading color="#fff" />
        </view>
        <view v-if="imageFailed" class="imageStatus">图片加载失败</view>
      </view>

      <!-- 底部按钮 -->
      <view v-if="buttonText" class="btnArea">
        <view class="actionBtn" @click="handleBtnClick">{{ buttonText }}</view>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    subtitle?: string
    imageUrl?: string | string[]
    images?: string[]
    buttonText?: string
    dismissible?: boolean
    clickUrl?: string
    clickType?: 'internal' | 'external' | 'webview' | 'none'
    backgroundColor?: string
  }>(),
  {
    title: '活动提醒',
    subtitle: '',
    imageUrl: '',
    buttonText: '',
    dismissible: true,
    clickUrl: '',
    clickType: 'none',
    backgroundColor: 'linear-gradient(135deg, #ffa93a, #c83900)',
  },
)

// 兼容单图和多图
const images = computed<string[]>(() => {
  if (props.images && props.images.length > 0) return props.images as string[]
  if (props.imageUrl) return [props.imageUrl as string]
  return []
})

const emit = defineEmits<{
  close: []
  click: []
}>()

const swiperIndex = ref(0)
const imageLoading = ref(false)
const imageLoaded = ref(false)
const imageFailed = ref(false)

watch(
  () => images.value,
  (urls) => {
    if (urls.length > 0) {
      imageLoading.value = true
      imageLoaded.value = false
      imageFailed.value = false
    }
  },
  { immediate: true },
)

const onImageLoad = () => {
  imageLoading.value = false
  imageLoaded.value = true
  imageFailed.value = false
}

const onImageError = () => {
  imageLoading.value = false
  imageLoaded.value = false
  imageFailed.value = true
}

const onSwiperChange = (e: any) => {
  swiperIndex.value = e.detail.current
}

const handleClose = () => {
  emit('close')
}

const handleBtnClick = () => {
  if (props.clickType === 'internal' && props.clickUrl) {
    uni.navigateTo({ url: props.clickUrl })
  } else if (props.clickType === 'webview' && props.clickUrl) {
    uni.navigateTo({ url: `/pages/cats/webview/webview?url=${encodeURIComponent(props.clickUrl)}` })
  } else if (props.clickType === 'external' && props.clickUrl) {
    // #ifdef H5
    window.open(props.clickUrl)
    // #endif
    // #ifdef APP-PLUS
    plus.runtime.openURL(props.clickUrl)
    // #endif
  }
  emit('click')
}
</script>

<style lang="scss" scoped>
:deep(.activityPopupBox) {
  width: calc(100% - 96rpx);
  padding: 0;
  background: transparent;
  border-radius: 32rpx;
  overflow: hidden;
}

.popupContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 48rpx 48rpx;
  border-radius: 32rpx;
  position: relative;
}

.closeBtn {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  .closeIcon {
    font-size: 32rpx;
    color: rgba(255, 255, 255, 0.7);
  }
}

.mainTitle {
  font-size: 56rpx;
  font-weight: 700;
  color: #fff;
  text-align: center;
  line-height: 1.3;
  padding: 0 16rpx;
}

.subTitle {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 1.5;
  margin-top: 16rpx;
  padding: 0 16rpx;
}

.imageArea {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 32rpx;
  width: 100%;

  .imageSwiper {
    width: 100%;
    height: 300rpx;
  }

  .popupImage {
    width: 100%;
    display: block;
  }

  .imageStatus {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx 0;
  }
}

.btnArea {
  margin-top: 40rpx;
  width: 100%;

  .actionBtn {
    width: 100%;
    height: 80rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    color: #ff6b03;
    font-size: 32rpx;
    font-weight: 600;
    border-radius: 40rpx;
  }
}
</style>

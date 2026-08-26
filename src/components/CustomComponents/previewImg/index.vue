<template>
  <view class="wd-img" :class="rootClasses" :style="rootStyles" @click="handleClick">
    <!-- 图片容器 -->
    <view class="wd-img__wrapper" :style="wrapperStyle">
      <!-- 图片 -->
      <image
        v-if="showImage"
        class="wd-img__image"
        :src="realSrc"
        :mode="mode"
        :lazy-load="lazyLoad"
        :show-menu-by-longpress="showMenuByLongpress"
        :webp="webp"
        :fade-show="fadeShow"
        :show-img-menu="showImgMenu"
        @load="handleLoad"
        @error="handleError"
      />

      <!-- 加载中状态 -->
      <view v-if="showLoading" class="wd-img__loading">
        <slot name="loading">
          <wd-loading :color="loadingColor" :size="loadingSize" />
        </slot>
      </view>

      <!-- 加载失败状态 -->
      <view v-if="showError" class="wd-img__error">
        <slot name="error">
          <wd-icon name="picture-error" size="40rpx" color="#C8C9CC" />
        </slot>
      </view>
    </view>

    <!-- 自定义预览弹窗 -->
    <wd-popup
      v-model="showPreview"
      position="center"
      custom-class="wd-img-preview"
      :close-on-click-modal="false"
      :z-index="zIndex"
      @close="handleClosePreview"
    >
      <view class="wd-img-preview__content">
        <!-- 预览头部 -->
        <view class="wd-img-preview__header">
          <view class="wd-img-preview__index">{{ currentIndex + 1 }}/{{ previewList.length }}</view>
          <wd-icon
            name="close"
            size="20px"
            color="#fff"
            custom-class="wd-img-preview__close"
            @click="handleClosePreview"
          />
        </view>

        <!-- 图片轮播 -->
        <swiper
          class="wd-img-preview__swiper"
          :current="currentIndex"
          @change="handleSwiperChange"
          :indicator-dots="previewList.length > 1"
          indicator-active-color="#fff"
        >
          <swiper-item
            v-for="(item, index) in previewList"
            :key="index"
            class="wd-img-preview__item"
          >
            <view class="wd-img-preview__item-wrapper">
              <image
                v-if="isGif(item)"
                class="wd-img-preview__image"
                :src="getGifUrl(item)"
                mode="aspectFit"
                @load="handlePreviewLoad"
              />
              <image
                v-else
                class="wd-img-preview__image"
                :src="item"
                mode="aspectFit"
                @load="handlePreviewLoad"
              />
            </view>
          </swiper-item>
        </swiper>
      </view>
    </wd-popup>
  </view>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue'
import WdPopup from '../popup/popup.vue'
import WdIcon from '../icon/icon.vue'
import WdLoading from '../loading/loading.vue'

export default defineComponent({
  name: 'WdImg',
  components: {
    WdPopup,
    WdIcon,
    WdLoading,
  },
  props: {
    // 图片地址
    src: {
      type: String,
      default: '',
    },
    // 预览图片地址，默认使用src
    previewSrc: {
      type: [String, Array],
      default: '',
    },
    // 图片模式
    mode: {
      type: String,
      default: 'aspectFill',
    },
    // 图片宽度
    width: {
      type: [String, Number],
      default: '',
    },
    // 图片高度
    height: {
      type: [String, Number],
      default: '',
    },
    // 圆角值
    radius: {
      type: [String, Number],
      default: '4px',
    },
    // 是否显示为圆形
    round: {
      type: Boolean,
      default: false,
    },
    // 是否懒加载
    lazyLoad: {
      type: Boolean,
      default: true,
    },
    // 是否开启长按菜单
    showMenuByLongpress: {
      type: Boolean,
      default: true,
    },
    // 是否显示图片菜单
    showImgMenu: {
      type: Boolean,
      default: true,
    },
    // 是否开启图片预览
    preview: {
      type: Boolean,
      default: true,
    },
    // 加载中图标颜色
    loadingColor: {
      type: String,
      default: '#C8C9CC',
    },
    // 加载中图标大小
    loadingSize: {
      type: [String, Number],
      default: '20px',
    },
    // 是否显示淡入效果
    fadeShow: {
      type: Boolean,
      default: true,
    },
    // 是否显示为webp格式
    webp: {
      type: Boolean,
      default: false,
    },
    // 预览弹窗的z-index
    zIndex: {
      type: Number,
      default: 1000,
    },
  },
  emits: ['load', 'error', 'click', 'preview-open', 'preview-close'],
  setup(props, { emit }) {
    // 状态
    const status = ref<'loading' | 'success' | 'error'>('loading')
    const showPreview = ref(false)
    const currentIndex = ref(0)
    const previewList = ref<string[]>([])

    // 计算属性
    const realSrc = computed(() => {
      if (!props.src) return ''
      return props.src
    })

    const showImage = computed(() => {
      return status.value === 'success' && props.src
    })

    const showLoading = computed(() => {
      return status.value === 'loading' && props.src
    })

    const showError = computed(() => {
      return status.value === 'error' && props.src
    })

    const rootClasses = computed(() => ({
      'is-round': props.round,
      'is-loading': status.value === 'loading',
      'is-error': status.value === 'error',
    }))

    const rootStyles = computed(() => {
      const style: Record<string, string> = {}
      if (props.width) style.width = addUnit(props.width)
      if (props.height) style.height = addUnit(props.height)
      if (props.radius && !props.round) {
        style.borderRadius = addUnit(props.radius)
      }
      return style
    })

    const wrapperStyle = computed(() => {
      const style: Record<string, string> = {}
      if (props.radius && !props.round) {
        style.borderRadius = addUnit(props.radius)
      }
      return style
    })

    // 方法
    const addUnit = (value: string | number): string => {
      if (typeof value === 'number') {
        return value + 'px'
      }
      if (/^\d+(\.\d+)?$/.test(value)) {
        return value + 'px'
      }
      return value
    }

    const isGif = (url: string): boolean => {
      if (!url) return false
      return url.toLowerCase().endsWith('.gif') || url.toLowerCase().includes('.gif?')
    }

    const getGifUrl = (url: string): string => {
      if (!url) return ''
      // 添加时间戳防止缓存
      return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`
    }

    const handleLoad = (event: Event) => {
      status.value = 'success'
      emit('load', event)
    }

    const handleError = (error: Event) => {
      status.value = 'error'
      emit('error', error)
    }

    const handleClick = (event: MouseEvent) => {
      emit('click', event)

      if (!props.preview || !props.src) return

      // 处理预览图片列表
      if (Array.isArray(props.previewSrc) && props.previewSrc.length > 0) {
        previewList.value = props.previewSrc
      } else if (props.previewSrc) {
        previewList.value = [props.previewSrc as string]
      } else {
        previewList.value = [props.src]
      }

      // 设置当前索引
      currentIndex.value = previewList.value.findIndex((item) => item === props.src)
      if (currentIndex.value === -1) currentIndex.value = 0

      // 显示预览
      showPreview.value = true
      emit('preview-open', { index: currentIndex.value, urls: previewList.value })
    }

    const handleClosePreview = () => {
      showPreview.value = false
      emit('preview-close')
    }

    const handleSwiperChange = (event: any) => {
      currentIndex.value = event.detail.current
    }

    const handlePreviewLoad = () => {
      // 图片加载完成处理
    }

    return {
      status,
      showPreview,
      currentIndex,
      previewList,
      realSrc,
      showImage,
      showLoading,
      showError,
      rootClasses,
      rootStyles,
      wrapperStyle,
      isGif,
      getGifUrl,
      handleLoad,
      handleError,
      handleClick,
      handleClosePreview,
      handleSwiperChange,
      handlePreviewLoad,
    }
  },
})
</script>

<style lang="scss">
@import '../common/styles/var';

.wd-img {
  position: relative;
  display: inline-block;
  overflow: hidden;
  line-height: 0;

  &__wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  &__image {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__loading,
  &__error {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: #f7f8fa;
  }

  &__error {
    color: #c8c9cc;
  }

  &.is-round {
    border-radius: 50%;

    .wd-img__wrapper,
    .wd-img__image {
      border-radius: 50%;
    }
  }
}

// 预览样式
.wd-img-preview {
  &__content {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
    background-color: #000;
  }

  &__header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 16px;
    color: var(--bg-card);
    background-color: var(--black-70);
  }

  &__close {
    padding: 10px;
  }

  &__swiper {
    flex: 1;
    width: 100%;
    height: 100%;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    overflow: hidden;
  }

  &__item-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  &__image {
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 100%;
  }
}
</style>

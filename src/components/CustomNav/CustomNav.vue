<template>
  <view class="page" :class="[locale]">
    <view class="customNav" :style="{ height: navFixedHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="navTitle">
            <span class="navTitle-text">{{ props.title }}</span>
          </view>
          <view class="rightIcon">
            <slot name="right" />
          </view>
        </view>
      </view>
      <view class="pbl2">
        <view class="fbg" :style="{ backgroundColor: props.pageBackgroundColor }"></view>
      </view>
      <view class="pbr2">
        <view class="fbg" :style="{ backgroundColor: props.pageBackgroundColor }"></view>
      </view>
    </view>
    <view
      class="cnt"
      :style="{
        backgroundColor: props.pageBackgroundColor,
        paddingTop: cntPaddingTop + 'rpx',
        paddingBottom: props.paddingBottom,
      }"
    >
      <view class="default-cnt" :style="{ minHeight: defaultCntHeight }">
        <slot name="default" />
      </view>

      <view class="footer">
        <slot name="footer" />
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'

import { navProps } from './types'

const props = defineProps(navProps)
// 语言
const locale = uni.getLocale()

const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navFixedHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)
const defaultCntHeight = ref('auto')

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navFixedHeight.value = safeTopRpx.value + 104
  navHeight.value = navFixedHeight.value + 40
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value

  const windowHeight = uni.getSystemInfoSync().windowHeight // px
  // 750rpx = windowWidth px
  const rpxRate = systemInfo.windowWidth / 750
  // 转换 px 为 rpx
  const windowHeightRpx = windowHeight / rpxRate
  defaultCntHeight.value = `${windowHeightRpx - cntPaddingTop.value - Number(props.paddingBottom)}rpx`
  defaultCntHeight.value = `${windowHeightRpx - cntPaddingTop.value - Number(props.paddingBottom)}rpx`

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)
})

const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  height: calc(104rpx + env(safe-area-inset-top));

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    padding-top: calc(env(safe-area-inset-top));
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);

    .navCnt {
      position: relative;
      width: 100%;
      height: 104rpx;

      .left {
        position: absolute;
        top: 50%;
        left: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64rpx; // >= padding，保证不重叠
        height: 44rpx;
        transform: translateY(-50%);
        pointer-events: auto;
        image {
          width: 44rpx;
          height: 44rpx;
        }
      }

      .navTitle {
        position: absolute;
        top: 0;
        right: 40rpx;
        bottom: 0;
        left: 60rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        font-size: 34rpx;
        font-weight: 500;
        line-height: 44rpx;
        color: #ffffff;
        text-align: center;
        pointer-events: none;

        // 让文本超长时显示省略号
        .navTitle-text {
          display: block;
          width: 100%;
          overflow: hidden;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
      // ✅ 右侧按钮（新增）
      .rightIcon {
        position: absolute;
        top: 50%;
        right: 20rpx;
        z-index: 2;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 60rpx;
        height: 60rpx;
        color: #fff;
        font-size: 28rpx;
        font-family: Alibaba PuHuiTi2;
        pointer-events: auto;
      }
    }
  }

  .pbl2,
  .pbr2 {
    position: absolute;
    top: 100%;
    z-index: 9;
    width: var(--liberty-cats-page-common-border-radius);
    height: var(--liberty-cats-page-common-border-radius);
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);
    pointer-events: none;

    .fbg {
      width: 100%;
      height: 100%;
      background-color: #fff;
      pointer-events: none;
    }
  }

  .pbl2 {
    left: 0;
    .fbg {
      border-radius: var(--liberty-cats-page-common-border-radius) 0 0 0;
    }
  }
  .pbr2 {
    right: 0;
    .fbg {
      border-radius: 0 var(--liberty-cats-page-common-border-radius) 0 0;
    }
  }
}
</style>

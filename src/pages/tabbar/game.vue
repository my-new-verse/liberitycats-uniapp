<!-- 使用 type="home" 属性设置首页，其他页面不需要设置，默认为page；推荐使用json5，更强大，且允许注释 -->
<route lang="json5">
{
  layout: 'default2',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '首页',
    navigationBarTextStyle: 'black', // 状态栏文字颜色
    enablePullDownRefresh: false,
    'app-plus': {
      pullToRefresh: {
        style: 'circle',
        color: '#ff6b03',
        offset: '80rpx',
      },
    },
  },
}
</route>
<template>
  <view class="bg-white overflow-hidden page3" :class="[locale]">
    <view class="icon3"></view>
    <view class="gameBox gameBox1" @click="openGameUrl('MATCH_THREE')">
      <view class="gameInfo">
        <view class="name">消消乐</view>
        <view class="memo">Matchin’ CAT</view>
      </view>
      <view class="icon icon1"></view>
    </view>
    <view class="gameBox gameBox2" @click="openGameUrl('JUMP')">
      <view class="gameInfo">
        <view class="name">跳一跳</view>
        <view class="memo">JUMPIN’ CAT</view>
      </view>
      <view class="icon icon2"></view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, getServerOnOff, toUrl } from '@/utils'

import { useUserStore } from '@/store/user'
import { useToast } from 'wot-design-uni'
import { getGameParamsApi } from '@/service/api/game'
uni.hideTabBar()
const userStore = useUserStore()
const toast = useToast()

// 语言
const locale = uni.getLocale()
defineOptions({
  name: 'Game',
})

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)
const searchTop = ref<number>(0)

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

  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value + 20
  cntPaddingTop.value = navHeight.value - 20
  searchTop.value = safeTopRpx.value + 40

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)
})

const openGameUrl = (gameType: string) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true, false)
    return
  }

  //   const gameEnableKey = 'game_' + gameType + '_enable'
  //   const gameEnable = getServerOnOff(gameEnableKey, 'common')
  //   const gameUrlKey = 'game_' + gameType + '_url'
  //   const gameUrl = getServerOnOff(gameUrlKey, 'common', true)
  //   console.log('gameEnable', gameEnable)
  //   console.log('gameUrl', gameUrl)
  //   if (!gameEnable || !gameUrl || gameUrl.length < 10) {
  //     toast.show(t('game.toast.game_not_open'))
  //     return
  //   }

  getGameParamsApi(gameType).then((res) => {
    const token = res.data.tempToken || ''
    console.log('token', token)
    if (!token) {
      toast.show(t('game.toast.game_not_open'))
      return
    }
    // 把token拼接到url上，注意url本身可能带参数
    // const url = gameUrl + (gameUrl.includes('?') ? '&' : '?') + 'token=' + token
    const url = res.data.jumpUrl
    // 优先在 App 上使用 webview 预加载能力，打开已预加载的实例以实现秒开体验
    toUrl(`/pages/game/index?gameType=${gameType}&url=` + encodeURIComponent(url))
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.page3 {
  position: relative;
  width: 100%;
  height: calc(100vh - 120rpx);
  padding-bottom: 120rpx;
  background-image: url('/static/images/game/bg@2x.png');
  background-repeat: no-repeat;
  background-size: cover;
}

.gameBox {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 20rpx 30rpx;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;

  .gameInfo {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    height: 100%;
    .name {
      font-size: 48rpx;
      font-weight: 600;
      color: #333333;
    }
    .memo {
      font-size: 22rpx;
      font-weight: 400;
      color: rgba(0, 0, 0, 0.3);
    }
  }
  .icon {
    width: 72rpx;
    height: 72rpx;
    margin-left: 30rpx;
  }
  .icon1 {
    background-image: url('/static/images/game/xxl@2x.png');
    background-repeat: no-repeat;
    background-size: cover;
  }
  .icon2 {
    background-image: url('/static/images/game/tyt@2x.png');
    background-repeat: no-repeat;
    background-size: cover;
  }
}
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-2px) rotate(-1deg);
  }
  50% {
    transform: translateX(2px) rotate(1deg);
  }
  75% {
    transform: translateX(-2px) rotate(1deg);
  }
}
.gameBox1 {
  top: 19%;
  left: 70rpx;
  transform-origin: center center;
  animation: shake 3s ease-in-out infinite;
}

@keyframes shakeAndBounce {
  /* 前80%的时间：左右晃动 */
  0%,
  80% {
    transform: translateX(0) translateY(0) scale(1);
    animation-timing-function: ease-in-out;
  }
  20%,
  60% {
    transform: translateX(-5rpx) translateY(0) scale(1);
    animation-timing-function: ease-in-out;
  }
  40%,
  80% {
    transform: translateX(5rpx) translateY(0) scale(1);
    animation-timing-function: ease-in-out;
  }
  /* 后20%的时间：跳一下 */
  85% {
    transform: translateY(0) scale(1);
    animation-timing-function: ease-out;
  }
  90% {
    transform: translateY(-30rpx) scale(1.1);
    animation-timing-function: ease-in;
  }
  95% {
    transform: translateY(0) scale(0.95);
    animation-timing-function: ease-out;
  }
  97% {
    transform: translateY(-10rpx) scale(1.05);
    animation-timing-function: ease-in;
  }
  100% {
    transform: translateY(0) scale(1);
    animation-timing-function: ease-out;
  }
}

.gameBox2 {
  right: 70rpx;
  bottom: 12%;
  transform-origin: center bottom;
  animation: shakeAndBounce 4s ease-in-out infinite;
}

.icon3 {
  position: absolute;
  top: 10%;
  right: 50rpx;
  width: 80rpx;
  height: 80rpx;
  background-image: url('/static/images/game/ar@2x.png');
  background-repeat: no-repeat;
  background-size: cover;
}
</style>

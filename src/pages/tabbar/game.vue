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
    <view class="icon3">
      <view class="first icon4" @click="toUrl('/pages/game/extract_coin_guide')"></view>
      <wd-img
        src="/static/images/game/game-05.svg"
        width="80rpx"
        height="80rpx"
        v-if="getServerOnOff('ar_enable', 'common')"
        @click="bindArGame"
      />
      <wd-img
        src="/static/images/game/game-02.svg"
        width="80rpx"
        height="80rpx"
        @click="openMiniProgram"
      />
    </view>
    <view class="gameBox gameBox1" @click="handleGameClick('MATCH_THREE')">
      <view class="gameInfo">
        <view class="name">消消乐</view>
        <view class="memo">Matchin’ CAT</view>
      </view>
      <view class="icon icon1"></view>
    </view>
    <view class="gameBox gameBox2" @click="handleGameClick('JUMP')">
      <view class="gameInfo">
        <view class="name">跳一跳</view>
        <view class="memo">JUMPIN’ CAT</view>
      </view>
      <view class="icon icon2"></view>
    </view>
    <game-resource-dialog
      v-model="showResourceDialog"
      :state="activeGameResourceLoadState"
      @retry="retryGameResources"
      @enter="enterSelectedGame"
    />
    <wd-message-box selector="wd-message-box-slot2"></wd-message-box>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { getImageUrl, getServerOnOff, toUrl } from '@/utils'
import GameResourceDialog from '@/components/GameResourceDialog.vue'

import { useUserStore } from '@/store/user'
import { useMessage, useToast } from 'wot-design-uni'
import { getGameParamsApi } from '@/service/api/game'
import type { getGameParamsApiResponse } from '@/service/api/game'
import { bindArGameApi } from '@/service/api/user'
import { onShow } from '@dcloudio/uni-app'
import { preloadIosGameWebView } from '@/utils/iosGameWebviewPreload'
import {
  ensureGameResourcesReady,
  gameResourceLoadState,
  iosGameResourceLoadState,
} from '@/utils/webviewResourceCache'
import { closeResidualAndroidGameWebviews } from '@/utils/androidGameWebview'
uni.hideTabBar()
const userStore = useUserStore()
const toast = useToast()
const message2 = useMessage('wd-message-box-slot2')
type GameType = 'MATCH_THREE' | 'JUMP'
const currentPlatform = (uni.getSystemInfoSync().platform || '').toLowerCase()
const showResourceDialog = ref(false)
const selectedGameType = ref<GameType | ''>('')
const selectedGameParams = ref<getGameParamsApiResponse | null>(null)
const isCheckingGameResources = ref(false)
/** 当前游戏已经触发过资源弹窗，关闭后允许原地再次打开 */
const hasResourceDialogSession = ref(false)
const activeGameResourceLoadState = computed(() =>
  currentPlatform === 'ios'
    ? iosGameResourceLoadState.value
    : isCheckingGameResources.value
      ? 'loading'
      : gameResourceLoadState.value,
)

watch(
  () => iosGameResourceLoadState.value,
  (state) => {
    if (currentPlatform === 'ios' && state === 'failed') showResourceDialog.value = true
  },
)

const retryGameResources = async () => {
  if (currentPlatform === 'ios') {
    void preloadIosGameWebView(selectedGameType.value || 'MATCH_THREE')
    return
  }
  if (!selectedGameType.value || isCheckingGameResources.value) return
  isCheckingGameResources.value = true
  try {
    selectedGameParams.value =
      (await ensureGameResourcesReady(selectedGameType.value, {
        onGameParamsError: (message) => {
          toast.show(message || t('game.toast.game_not_open'))
        },
      })) || null
  } catch (error) {
    console.warn('[Game] 重新下载游戏资源失败:', error)
  } finally {
    isCheckingGameResources.value = false
  }
}

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

/** 跳转微信小程序 */
const openMiniProgram = () => {
  // #ifdef APP-PLUS
  const schemeUrl =
    'weixin://dl/business/?appid=wx65ef2b125167db43&path=pages/landing/landing&query=project_id=99&env_version=release'
  plus.runtime.openURL(schemeUrl, () => {
    uni.showToast({ title: '请先安装微信', icon: 'none' })
  })
  // #endif
}

// 绑定/换绑的公共请求逻辑
const doBindArGame = (code: string) => {
  bindArGameApi(code)
    .then((res) => {
      console.log('bind Ar Game', res)
      if (res.code === 1) {
        toast.show(res.msg && res.msg.length ? res.msg : t('my.game.bind_ar.msgbox.success.msg'))
        userStore.getUserInfo()
      } else {
        toast.show(res.msg || t('my.game.bind_ar.msgbox.failed.msg'))
      }
    })
    .catch(() => {
      toast.show(t('my.game.bind_ar.msgbox.failed.msg'))
    })
}

// 弹出输入框让用户输入绑定口令
const showBindArPrompt = () => {
  return message2.prompt({
    title: t('my.game.bind_ar.msgbox.title'),
    inputValue: '',
    inputPlaceholder: t('my.game.bind_ar.msgbox.placeholder'),
    inputPattern: /^[a-zA-Z0-9]{6,12}$/,
    inputError: t('my.game.bind_ar.msgbox.inputError'),
    cancelButtonText: t('common.cancel'),
    confirmButtonText: t('common.confirm'),
  })
}

const bindArGame = () => {
  const hasValue = !!userStore?.userInfo?.bind_ar?.bind_status
  if (hasValue) {
    const canRebind = !!userStore?.userInfo?.bind_ar?.can_rebind
    if (canRebind) {
      // 已绑定且允许换绑：confirm 提示是否换绑
      message2
        .confirm({
          title: t('my.game.bind_ar.msgbox.was_bond.title'),
          msg:
            t('my.game.bind_ar.msgbox.was_bond.msg', {
              0: userStore?.userInfo?.bind_ar?.third_open_id,
            }) +
            '\n\n' +
            t('my.game.bind_ar.msgbox.change_bind.confirm_msg'),
          cancelButtonText: t('common.cancel'),
          confirmButtonText: t('common.confirm'),
        })
        .then(() => {
          showBindArPrompt()
            .then((resp) => {
              doBindArGame(resp.value)
            })
            .catch((error) => {
              console.log(error)
            })
        })
        .catch(() => {})
    } else {
      // 已绑定但不允许换绑：仅提示已绑定信息
      message2.alert({
        title: t('my.game.bind_ar.msgbox.was_bond.title'),
        msg: t('my.game.bind_ar.msgbox.was_bond.msg', {
          0: userStore?.userInfo?.bind_ar?.third_open_id,
        }),
      })
    }
  } else {
    // 未绑定：直接弹出输入框
    showBindArPrompt()
      .then((resp) => {
        doBindArGame(resp.value)
      })
      .catch((error) => {
        console.log(error)
      })
  }
}

let preparingGame = false
let pendingGameType: GameType | '' = ''

const handleGameClick = async (gameType: GameType) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true, false)
    return
  }

  // 仅在资源仍在下载或下载失败时恢复当前弹窗。
  // 资源已就绪后再点击应直接进入游戏。
  if (
    selectedGameType.value === gameType &&
    hasResourceDialogSession.value &&
    activeGameResourceLoadState.value !== 'ready'
  ) {
    showResourceDialog.value = true
    return
  }

  if (openingGame) return
  if (preparingGame) {
    // 同一游戏的连续点击只复用当前准备流程，避免误弹资源下载弹窗。
    if (selectedGameType.value === gameType) return

    // 当前游戏仍在准备时，先把另一款游戏记为最新待处理入口。
    // 立即展示它的弹窗，但不并行创建第二批下载任务。
    pendingGameType = gameType
    selectedGameType.value = gameType
    selectedGameParams.value = null
    hasResourceDialogSession.value = true
    isCheckingGameResources.value = true
    showResourceDialog.value = true
    return
  }
  preparingGame = true
  selectedGameType.value = gameType
  selectedGameParams.value = null
  hasResourceDialogSession.value = false
  showResourceDialog.value = false
  try {
    if (currentPlatform === 'android') {
      isCheckingGameResources.value = true
      let downloadRequired = false
      const preparedParams =
        (await ensureGameResourcesReady(gameType, {
          onDownloadRequired: () => {
            downloadRequired = true
            hasResourceDialogSession.value = true
            showResourceDialog.value = true
          },
          onGameParamsError: (message) => {
            toast.show(message || t('game.toast.game_not_open'))
          },
        })) || null
      // 用户可能在等待期间已点了另一款游戏，不能把旧游戏参数写给新入口。
      if (selectedGameType.value === gameType) selectedGameParams.value = preparedParams
      if (downloadRequired) return

      // 本地资源已完整，不再展示“已加载完成”弹窗。
      await openGameUrl(gameType, preparedParams)
      return
    } else if (currentPlatform === 'ios') {
      await preloadIosGameWebView(gameType)
      if (iosGameResourceLoadState.value !== 'ready') {
        hasResourceDialogSession.value = true
        showResourceDialog.value = true
        return
      }
      await openGameUrl(gameType)
      return
    }

    showResourceDialog.value = false
    await openGameUrl(gameType, selectedGameParams.value)
  } catch (error) {
    if (currentPlatform === 'android' && selectedGameType.value === gameType) {
      gameResourceLoadState.value = 'failed'
      showResourceDialog.value = true
    }
    console.warn(`[Game] ${gameType} 游戏资源准备失败:`, error)
  } finally {
    isCheckingGameResources.value = false
    preparingGame = false
    const queuedGameType = pendingGameType
    pendingGameType = ''
    if (queuedGameType && queuedGameType !== gameType) {
      // 清掉仅用于即时展示的会话标记，开始执行最后一次点击的游戏准备。
      hasResourceDialogSession.value = false
      void handleGameClick(queuedGameType)
    }
  }
}

let openingGame = false
let gameNavigationInFlight = false

const openGameUrl = async (
  gameType: GameType,
  preparedParams: getGameParamsApiResponse | null = null,
) => {
  if (openingGame) return
  openingGame = true
  gameNavigationInFlight = true
  let navigationStarted = false
  uni.showLoading({ title: t('game.entering'), mask: true })
  try {
    let gameParams = preparedParams
    if (!gameParams) {
      const res = await getGameParamsApi(gameType)
      console.log('res', res)
      if (res.code !== 1) {
        toast.show(res.msg || t('game.toast.game_not_open'))
        return
      }
      gameParams = res.data
    }
    const gameUrl = gameParams.jumpUrl || ''
    if (!gameUrl) {
      toast.show(t('game.toast.game_not_open'))
      return
    }
    const gamePage =
      currentPlatform === 'android' ? '/pages/game/androidIndex' : '/pages/game/index'
    const targetUrl = gamePage + '?url=' + encodeURIComponent(gameUrl) + '&gameType=' + gameType
    // #ifdef APP-PLUS
    if (currentPlatform === 'android') closeResidualAndroidGameWebviews()
    // #endif
    await new Promise<void>((resolve, reject) => {
      uni.navigateTo({
        url: targetUrl,
        success: () => {
          navigationStarted = true
          resolve()
        },
        fail: reject,
      })
    })
  } catch (error) {
    console.warn('[Game] 获取游戏参数失败:', error)
    toast.show(t('game.toast.game_not_open'))
  } finally {
    gameNavigationInFlight = false
    uni.hideLoading()
    // 跳转成功后保持锁定，等游戏页返回、当前 tab 页再次 onShow 时再解锁。
    if (!navigationStarted) openingGame = false
  }
}

onShow(() => {
  // App 前后台切换也会触发 onShow；请求或跳转尚未结束时不能提前释放锁。
  if (gameNavigationInFlight) return
  openingGame = false
})

const enterSelectedGame = async () => {
  if (!selectedGameType.value || activeGameResourceLoadState.value !== 'ready') return
  showResourceDialog.value = false
  hasResourceDialogSession.value = false
  await openGameUrl(selectedGameType.value, selectedGameParams.value)
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
  gap: 20rpx;
  display: flex;
  flex-direction: column;

  .icon4 {
    width: 80rpx;
    height: 80rpx;
    background-repeat: no-repeat;
    background-size: cover;
  }

  .first {
    background-image: url('/static/images/game/ar@2x.png');
  }
}
</style>

import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  loginApi,
  logoutApi,
  loginDiscordApi,
  virtualLoginApi,
  loginAppleApi,
  logoffApi,
} from '@/service/api/login'
import { getUserInfoApi, getSystemConfigApiV2 } from '@/service/api/user'
import { disconnectWalletApi } from '@/service/api/web3'
import { getGameParamsApi } from '@/service/api/game'
import { scheduleDualGamePreload } from '@/utils/plusGameWebViewPool'
import { downloadGameResources } from '@/utils/webviewResourceCache'
import traceContext from '@/utils/traceContext'
import { useSystemStore } from '@/store/system'
import buildInfo from '@/../build-info.json'

// 平台类型（避免多次调用 getSystemInfoSync）
const platform = uni.getSystemInfoSync().platform || ''
const isAndroid = platform === 'android'

const initState = {
  nickname: '',
  avatar: '',
  member_id: 0,
  level: {
    name: '',
    icon: '',
    level: 0,
  },
  // token: '16990|3p04IsMCo6IiM0r6Gdvgd02QPQGqdrl6TLDPoEOS931c8f0e',
  token: '',
  wallet_address: '',
  Currency_unit: '',
  login_account: '',
  login_account_is_real_mail: 0, // 是否是实际邮箱登录，0-否，1-是
  show_switch_virtual_account: 0, // 是否显示切换虚拟邮箱
  show_add_virtual_account: 0, // 是否显示添加虚拟邮箱
  bind_ar: {
    open_id: '',
    third_open_id: '',
    temp_code: '',
  },
}

const preloadGameWebViews = async () => {
  // #ifdef APP-PLUS
  const gameTypes = ['MATCH_THREE', 'JUMP'] as const
  // 记录第一个游戏类型的 preloadResources，用于去重判断
  let firstPreloadResourcesKey: string | null = null
  for (const gameType of gameTypes) {
    try {
      console.log(`[Preload] 开始获取 ${gameType} 游戏参数...`)
      const res = await getGameParamsApi(gameType)
      const jumpUrl = res.data.jumpUrl || ''
      const preloadResources = res.data.preloadResources || []
      const preloadResourcesKey = JSON.stringify(preloadResources)

      // 如果是第二个游戏且 preloadResources 与第一个相同，跳过创建
      if (firstPreloadResourcesKey !== null && preloadResourcesKey === firstPreloadResourcesKey) {
        console.log(`[Preload] ${gameType} 的 preloadResources 与前一个游戏相同，跳过 WebView 创建`)
      } else if (!jumpUrl) {
        console.warn(`[Preload] ${gameType} jumpUrl 为空，跳过`)
      } else {
        console.log(`[Preload] ${gameType} jumpUrl:`, jumpUrl)
        plus.webview.create(jumpUrl, `preload-webview-${gameType}`, {
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
        })
        console.log(`[Preload] ${gameType} WebView 已创建`)
      }

      // 记录第一个游戏类型的 preloadResources
      if (firstPreloadResourcesKey === null) {
        firstPreloadResourcesKey = preloadResourcesKey
      }
    } catch (error) {
      console.error(`[Preload] ${gameType} 预加载失败:`, error)
    }
    // 两个游戏之间间隔 3s
    if (gameType === 'MATCH_THREE') {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
  // #endif
}

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref<IUserInfo>({ ...initState })

    const setUserInfo = (val: IUserInfo) => {
      userInfo.value = val
    }

    const logout = async () => {
      const res = await logoutApi()
      if (res.code === 1) {
        userInfo.value = { ...initState }
        uni.removeStorageSync('hasToken')
        // 重置链路追踪上下文
        traceContext.reset()
      }
      return new Promise<any>((resolve, reject) => {
        resolve(res)
      })
    }

    const clearUserInfo = () => {
      userInfo.value = { ...initState }
      uni.removeStorageSync('hasToken')
      // 重置链路追踪上下文
      traceContext.reset()
    }

    const isLogin = computed(() => !!userInfo.value.token)

    const loginByEmailCode = async (
      email: string,
      code: string,
      extendData?: Record<string, any>,
    ) => {
      const res = await loginApi(email, code)
      return new Promise<any>((resolve, reject) => {
        if (res.code === 1) {
          uni.setStorageSync('login_email', email)
          userInfo.value.token = res.data.token
          getUserInfo().then(() => {
            resolve(res)
          })
        } else {
          reject(res)
        }
      })
    }

    const loginByVirtualEmailCode = async (
      email: string,
      code: string,
      extendData?: Record<string, any>,
    ) => {
      const res = await virtualLoginApi(email, code)
      return new Promise<any>((resolve, reject) => {
        if (res.code === 1) {
          uni.setStorageSync('virtual_login_email', email)
          userInfo.value.token = res.data.token
          getUserInfo().then(() => {
            resolve(res)
          })
        } else {
          reject(res)
        }
      })
    }

    const swithVirtualEmailAccount = async (token: string, virturalEmail: string) => {
      uni.setStorageSync('virtual_login_email', virturalEmail)

      return new Promise<any>((resolve, reject) => {
        userInfo.value.token = token
        getUserInfo().then(() => {
          resolve({
            token: userInfo.value.token,
            virtual_mail: virturalEmail,
          })
        })
      })
    }

    const loginByDiscord = async (code: string) => {
      const res = await loginDiscordApi(code)
      console.log('loginByDiscord res:', res)

      return new Promise<any>((resolve, reject) => {
        if (res.code === 1) {
          userInfo.value.token = res.data.token
          uni.setStorageSync(code, res.data.token)
          getUserInfo().then(() => {
            resolve(res)
          })
        } else {
          reject(res)
        }
      })
    }

    const loginByApple = async (info: any) => {
      const res = await loginAppleApi(info)
      console.log('loginByApple res:', res)

      return new Promise<any>((resolve, reject) => {
        if (res.code === 1) {
          userInfo.value.token = res.data.token
          getUserInfo().then(() => {
            resolve(res)
          })
        } else {
          reject(res)
        }
      })
    }

    const getUserInfo = async () => {
      console.log('getUserInfo')
      const res = await getUserInfoApi()
      console.log('getUserInfo res:', res)
      if (res.code === 1) {
        // 设置一个登录标记，便于有些页面判断，而不用全部走store
        uni.setStorageSync('hasToken', 1)
        setUserInfo(res.data)
      }
    }

    const disconnectWallet = async () => {
      const res = await disconnectWalletApi()
      if (res.code === 1) {
        getUserInfo()
      }
    }

    const logoffAccount = async () => {
      const res = await logoffApi()
      if (res.code === 1) {
        clearUserInfo()
      }
      return new Promise<any>((resolve, reject) => {
        resolve(res)
      })
    }

    let lastNavigateTime = 0

    const navigateToAfterLogin = (url?: string) => {
      const now = Date.now()
      if (now - lastNavigateTime < 5000) return
      lastNavigateTime = now

      const loginUrl = url || uni.getStorageSync('loginUrl')
      if (loginUrl) {
        uni.removeStorageSync('loginUrl')
        uni.redirectTo({
          url: loginUrl,
        })
      } else {
        uni.switchTab({
          url: '/pages/tabbar/my',
        })
      }
      // 登陆成功后重新调用getSystemConfigApiV2
      const systemInfo = uni.getSystemInfoSync()
      const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
      const systemStore = useSystemStore()
      const version = `${buildInfo.version}`

      getSystemConfigApiV2(version, platform).then((res) => {
        uni.setStorageSync('systemConfigV2', res.data)
        systemStore.setConfig(res.data)
      })
      // 通知 mall 页刷新数据
      uni.$emit('mall:refresh')
      uni.$emit('socialMessage:refresh')
      // 登录成功后触发游戏资源预加载
      if (isAndroid) {
        // Android: 预下载游戏资源（用于 overrideResourceRequest 重定向）
        downloadGameResources()
      } else {
        // iOS: 预加载游戏 WebView
        preloadGameWebViews()
      }
    }

    return {
      userInfo,
      setUserInfo,
      logout,
      isLogin,
      loginByEmailCode,
      getUserInfo,
      clearUserInfo,
      disconnectWallet,
      loginByDiscord,
      navigateToAfterLogin,
      loginByVirtualEmailCode,
      swithVirtualEmailAccount,
      loginByApple,
      logoffAccount,
    }
  },
  {
    persist: true,
  },
)

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
import { getUserInfoApi } from '@/service/api/user'
import { disconnectWalletApi } from '@/service/api/web3'

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
      }
      return new Promise<any>((resolve, reject) => {
        resolve(res)
      })
    }

    const clearUserInfo = () => {
      userInfo.value = { ...initState }
      uni.removeStorageSync('hasToken')
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

    const navigateToAfterLogin = (url?: string) => {
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

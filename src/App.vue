<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { checkTokenApi, getSystemConfigApi, getSystemConfigApiV2 } from '@/service/api/user'
import { useUserStore } from '@/store/user'
import { getAgreementsByKeys } from './service/api/agreement'
import { getImageUrl } from './utils'
import { getAdListByKeysApi } from './service/api/ad'
import { t } from './locale'
import buildInfo from '@/../build-info.json'
import { useSystemStore } from '@/store/system'
import { getGameParamsApi } from '@/service/api/game'
// import { scheduleDualGamePreload } from '@/utils/plusGameWebViewPool'
// import { useGameWebViewStore } from '@/store/gameWebview'

// 扩展 Plus 对象类型，避免 TS 报错
declare const plus: any

interface GameConfig {
  gameType: string
  url: string
  tempToken?: string
}

const systemStore = useSystemStore()
// const gameWebviewStore = useGameWebViewStore()
const version = `${buildInfo.version}`
const userStore = useUserStore()
const systemReady = ref(false)
const hasPendingIntent = ref(true) // 首次启动默认需要处理深链

onLaunch(() => {
  console.log('App Launch', uni.getSystemInfoSync())

  const systemInfo = uni.getSystemInfoSync()
  const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
  console.log('platform', platform)

  // iOS 首次安装 IPA 可能网络尚未就绪，轮询等待网络连接后再发起请求，避免白屏
  const waitForNetwork = (): Promise<void> => {
    return new Promise((resolve) => {
      uni.getNetworkType({
        success: (res) => {
          if (res.networkType !== 'none') {
            resolve()
            return
          }
          const timer = setInterval(() => {
            uni.getNetworkType({
              success: (r) => {
                if (r.networkType !== 'none') {
                  clearInterval(timer)
                  resolve()
                }
              },
            })
          }, 1000)
        },
      })
    })
  }

  waitForNetwork().then(() => {
    // @ts-ignore 全局标记，供页面通过 uni.$on('networkReady') 监听
    globalThis.__networkReady = true
    uni.$emit('networkReady')

    uni.removeStorageSync('app_update_close')
    getSystemConfigApiV2(version, platform).then((res) => {
      uni.setStorageSync('systemConfigV2', res.data)
      console.log(11111111)
      systemStore.setConfig(res.data)
    })

    getAgreementsByKeys(
      'user_login_agreement,user_privacy_policy,user_pledge_nft_agreement,user_pledge_nft_guide,user_pledge_nft_popup_content,user_redeem_nft_popup_content,virtual_email_intro',
    ).then((res) => {
      uni.setStorageSync('agreements', res.data)
      systemStore.setAgreements(res.data)
    })
  })

  // 请求并缓存广告

  // #ifdef APP-PLUS
  setTimeout(() => {
    plus.navigator.closeSplashscreen()
  }, 1000) // 5秒后关闭启动页
  // #endif

  // App启动时初始化WebView预加载（无token版本）
  // initializeGameWebviewPreload()

  // #ifdef APP-PLUS
  // 监听新的深链请求（App已在运行时，用户从浏览器再次点击链接）
  plus.globalEvent.addEventListener('newintent', () => {
    hasPendingIntent.value = true
  })
  // #endif
})

onShow(() => {
  // #ifdef APP-PLUS
  if (hasPendingIntent.value) {
    hasPendingIntent.value = false
    setTimeout(() => {
      handleSchemaArgs(plus.runtime.arguments)
    }, 500)
  }
  // #endif

  // 检查token
  checkTokenApi().then((res) => {
    if (res.data.token === 0) {
      userStore.clearUserInfo()
      // 清理游戏WebView状态
      // gameWebviewStore.clearGameConfigs()
    } else {
      userStore.getUserInfo()
      // 登录成功后重新初始化WebView预加载（带token版本）
      // initializeGameWebviewPreload()
    }
    localStorage.setItem('timeZone', res.data.timezone || 'Asia/Shanghai') // 缓存时区设置
  })
})

onHide(() => {
  console.log('App Hide')
})

// 初始化游戏WebView预加载
// const initializeGameWebviewPreload = async () => {
//   try {
//     // 只在App端执行预加载
//     // if (typeof plus === 'undefined') {
//     //   return
//     // }
//     const gameConfigs = []
//     // 获取两个游戏的配置
//     const matchThreeConfig = await getGameParamsApi('MATCH_THREE')
//     if (matchThreeConfig.code && matchThreeConfig.code === 1) {
//       gameConfigs.push({
//         gameType: 'MATCH_THREE',
//         url: matchThreeConfig.data.jumpUrl,
//         tempToken: matchThreeConfig.data.tempToken,
//       })
//     }
//     const jumpConfig = await getGameParamsApi('JUMP')
//     if (jumpConfig.code && jumpConfig.code === 1) {
//       gameConfigs.push({
//         gameType: 'JUMP',
//         url: jumpConfig.data.jumpUrl,
//         tempToken: jumpConfig.data.tempToken,
//       })
//     }
//     // 验证配置有效性
//     const validConfigs = gameConfigs.filter((config) => config.tempToken && config.url)

//     if (validConfigs.length) {
//       // 存储到Pinia store
//       validConfigs.forEach((config) => {
//         gameWebviewStore.setGameConfig(config.gameType as any, config)
//       })

//       // 调度预加载
//       scheduleDualGamePreload(validConfigs as [GameConfig, GameConfig])
//       console.log('游戏WebView预加载已调度')
//     } else {
//       console.warn('游戏配置不完整，跳过预加载')
//     }
//   } catch (error) {}
// }

const handleSchemaArgs = (args) => {
  console.log('handleSchemaArgs', args)
  if (args) {
    try {
      // 获取页面路径和参数
      const url = args.replace(/.*?:\/\//g, '') // 去掉协议部分
      const [path, queryString] = url.split('?')

      // 解析参数
      const params = {}
      if (queryString) {
        queryString.split('&').forEach((param) => {
          const [key, value] = param.split('=')
          if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value)
          }
        })
      }

      // 后端链接：libertycats://post/detail?postId=123&commentId=456
      if (path === 'post/detail' || path === '/post/detail' || path === '/detail') {
        const realPostId = params.postId || params.id
        if (realPostId) {
          let jumpUrl = `/pages/cats/social/detail?id=${realPostId}`

          if (params.commentId) {
            jumpUrl += `&commentId=${params.commentId}&showComment=true`
          }

          console.log('正在跳转到帖子详情:', jumpUrl)
          //   uni.navigateTo({ url: jumpUrl })
          setTimeout(() => {
            uni.reLaunch({
              url: jumpUrl,
            })
          }, 300)
          return
        }
      }

      if ('from' in params) {
        if (params.from === 'okx') {
          if (userStore.isLogin) {
            console.log('from okx refresh userInfo')
            userStore.getUserInfo()
          }
        }
      }

      if (path === 'discord/auth') {
        console.log('from discord auth')
        if ('code' in params) {
          console.log('Discord code================:', params.code)
          // 处理登录逻辑
          const code = params.code as string
          const cacheCode = uni.getStorageSync(code)
          console.log('cacheCode================:', cacheCode)
          if (!cacheCode) {
            userStore
              .loginByDiscord(code)
              .then((res) => {
                userStore.navigateToAfterLogin()
              })
              .catch((err) => {
                console.error('Discord login failed:', err)
                uni.showToast({
                  icon: 'none',
                  title: err.msg || t('login.discord_auth_failed'),
                })
                uni.setStorageSync('discord_auth_status', err.msg || t('login.discord_auth_failed'))
              })
          }
        }
      }

      console.log('Page Path:', path)
      console.log('Parameters:', params)
    } catch (error) {
      console.error('解析URL失败:', error)
    }
  }
}
</script>

<style lang="scss">
/* stylelint-disable selector-type-no-unknown */
button::after {
  border: none;
}

swiper,
scroll-view {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

image {
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

// 单行省略，优先使用 unocss: text-ellipsis
.ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 两行省略
.ellipsis-2 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

// 三行省略
.ellipsis-3 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>

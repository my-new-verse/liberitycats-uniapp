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
import { useGameWebViewStore } from '@/store/gameWebview'
import {
  downloadGameResources,
  resumeBackgroundDownloadIfNeeded,
  handleAppBackgroundDownload,
} from '@/utils/webviewResourceCache'

// 扩展 Plus 对象类型，避免 TS 报错
declare const plus: any

interface GameConfig {
  gameType: string
  url: string
  tempToken?: string
}

const systemStore = useSystemStore()
const gameWebviewStore = useGameWebViewStore()

// 平台类型（避免多次调用 getSystemInfoSync）
const platform = uni.getSystemInfoSync().platform || ''
const isAndroid = platform === 'android'
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
    // #ifdef APP-PLUS
    // Android: 预下载游戏资源（用于 overrideResourceRequest 重定向）
    if (isAndroid) {
      downloadGameResources()
    } else {
      // iOS: 预加载游戏 WebView
      setTimeout(() => {
        preloadGameWebViews()
      }, 3000)
    }
    // #endif
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

  // 从后台切回前台时，恢复可能被中断的资源下载（仅 Android）
  // #ifdef APP-PLUS
  if (isAndroid) {
    resumeBackgroundDownloadIfNeeded()
  }
  // #endif
})

onHide(() => {
  console.log('App Hide')
  // App进入后台时，重置 downloading 状态为 pending，避免状态卡住（仅 Android）
  // #ifdef APP-PLUS
  if (isAndroid) {
    handleAppBackgroundDownload()
  }
  // #endif
})

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

// 预加载游戏 WebView：依次获取 MATCH_THREE 和 JUMP 的 jumpUrl 并创建隐藏 WebView
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

// 测试:创建并销毁 WebView
const testCreateAndDestroyWebview = async () => {
  // #ifdef APP-PLUS
  try {
    console.log('[WebView测试] 开始获取游戏参数...')

    // 调用 API 获取游戏参数
    const res = await getGameParamsApi('MATCH_THREE')
    console.log('[WebView测试] 获取游戏参数成功:', res)
    const gameVersion = res.data.gameVersion || ''
    const jumpUrl = res.data.jumpUrl || ''
    // 构建游戏 URL

    console.log('[WebView测试] 开始创建 WebView, URL:', jumpUrl)

    // 创建 WebView 窗口
    const webView = plus.webview.create(jumpUrl, 'test-webview-temp', {
      top: '-9999px', // 隐藏在屏幕外
      left: '-9999px',
      width: '1px',
      height: '1px',
    })

    // 监听加载完成事件
    webView.addEventListener(
      'loaded',
      () => {
        console.log('[WebView测试] WebView 加载完成')

        // 立即销毁 WebView
        setTimeout(() => {
          console.log('[WebView测试] 开始销毁 WebView')
          webView.close()
          console.log('[WebView测试] WebView 已销毁')
        }, 18000)
      },
      false,
    )

    // 显示 WebView(触发加载)
    // webView.show()
    console.log('[WebView测试] WebView 已显示,等待加载完成...')
  } catch (error) {
    console.error('[WebView测试] 获取游戏参数失败:', error)
  }
  // #endif

  // #ifndef APP-PLUS
  console.log('[WebView测试] 仅在 APP-PLUS 平台支持')
  // #endif
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

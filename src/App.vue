<script setup lang="ts">
import { ref } from 'vue'
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { checkTokenApi, getSystemConfigApi, getSystemConfigApiV2 } from '@/service/api/user'
import { useUserStore } from '@/store/user'
import { getAgreementsByKeys } from './service/api/agreement'
import { getImageUrl } from './utils'
import { getAdListByKeysApi } from './service/api/ad'
import { t } from './locale'
import buildInfo from '@/../build-info.json'
import { useSystemStore } from '@/store/system'

const systemStore = useSystemStore()
export const preloadedWebViewReady = ref(false)
const version = `${buildInfo.version}`
const userStore = useUserStore()
const systemReady = ref(false)
onLaunch(() => {
  console.log('App Launch', uni.getSystemInfoSync())

  const systemInfo = uni.getSystemInfoSync()
  const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
  console.log('platform', platform)
  // todo 加载初始配置
  uni.removeStorageSync('app_update_close')
  getSystemConfigApiV2(version, platform).then((res) => {
    uni.setStorageSync('systemConfigV2', res.data)
    console.log(11111111)
    systemStore.setConfig(res.data)
  })

  // todo 检查更新包

  // 加载用户协议
  getAgreementsByKeys(
    'user_login_agreement,user_privacy_policy,user_pledge_nft_agreement,user_pledge_nft_guide,user_pledge_nft_popup_content,user_redeem_nft_popup_content,virtual_email_intro',
  ).then((res) => {
    uni.setStorageSync('agreements', res.data)
  })

  // 请求并缓存广告

  // #ifdef APP-PLUS
  setTimeout(() => {
    plus.navigator.closeSplashscreen()
  }, 1000) // 5秒后关闭启动页
  // #endif

  // 预加载 WebView：App 空闲时预热游戏页面，减少首次打开白屏与加载时间
  setTimeout(() => {
    try {
      const sys = uni.getSystemInfoSync()
      const platform = (sys.platform || sys.osName || '').toLowerCase()
      const isLowMem = !!(sys && (sys.totalMemory || sys.memory) && (sys.totalMemory || sys.memory) < 4096)
      if (isLowMem) {
        console.log('skip preload: low memory device')
        return
      }

      // 仅在 App 上执行预加载
      if (typeof uni.preloadWebview === 'function') {
        const preloadUrl = '/pages/game/index?url=' + encodeURIComponent('https://game.libertycats.app/minigame/index.html?preload=1')
        uni.preloadWebview({
          url: preloadUrl,
          success: () => {
            preloadedWebViewReady.value = true
            console.log('WebView preloaded via uni.preloadWebview')
          },
          fail: (e) => {
            console.warn('preloadWebview failed', e)
          },
        })
      } else {
        // fallback: 打开并立即返回，尝试保留 WebView 实例（部分平台有效）
        const preloadUrl = '/pages/game/index?url=' + encodeURIComponent('https://game.libertycats.app/minigame/index.html?preload=1') + '&preload=true'
        uni.navigateTo({
          url: preloadUrl,
          success: () => {
            preloadedWebViewReady.value = true
            console.log('WebView preloaded via navigateTo fallback')
            setTimeout(() => {
              try {
                uni.navigateBack({ delta: 1 })
              } catch (e) {}
            }, 300)
          },
          fail: (e) => {
            console.warn('navigateTo preload failed', e)
          },
        })
      }
    } catch (err) {
      console.warn('preload error', err)
    }
  }, 3000)
})

onShow(() => {
  // #ifdef APP-PLUS
  setTimeout(() => {
    const args = plus.runtime.arguments
    handleSchemaArgs(args)
  }, 500) // 调整为300ms延迟
  // #endif

  // 检查token
  checkTokenApi().then((res) => {
    if (res.data.token === 0) {
      userStore.clearUserInfo()
    } else {
      userStore.getUserInfo()
    }
    localStorage.setItem('timeZone', res.data.timezone || 'Asia/Shanghai') // 缓存时区设置
  })
})

onHide(() => {
  console.log('App Hide')
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

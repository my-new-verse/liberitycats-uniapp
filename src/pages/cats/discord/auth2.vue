<template>
  <view class="auth2-container">
    <view class="loading-text">{{ showMsg }}</view>
  </view>
</template>

<script setup>
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { useUserStore } from '@/store'
import { toUrl } from '@/utils'
import { t } from '@/locale'

const userStore = useUserStore()

const authorizeUrl = ref('')
const showMsg = ref('')

// 获取页面参数
onLoad((options) => {
  console.log('options================:', JSON.stringify(options))
  if (options.authorizeUrl) {
    authorizeUrl.value = decodeURIComponent(options.authorizeUrl)
  }
  showMsg.value = t('login.discord_auth_waiting')
  setInterval(() => {
    showMsg.value = uni.getStorageSync('discord_auth_status') || t('login.discord_auth_waiting')
  }, 1000)
})

// 打开授权页面
onMounted(() => {
  if (authorizeUrl.value) {
    console.log('authorizeUrl================:', authorizeUrl.value)

    // 解析URL参数
    const queryString = authorizeUrl.value.split('?')[1]
    const params = {}
    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=')
      params[decodeURIComponent(key)] = decodeURIComponent(value)
    })

    // 创建Discord网页授权URL
    const discordUrl =
      'https://discord.com/oauth2/authorize' +
      `?client_id=${params.client_id}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(params.redirect_uri)}` +
      `&scope=${params.scope}` +
      `&state=${encodeURIComponent('libertycats://discord/auth')}` // 将scheme编码到state参数中

    // 使用webview打开授权页面
    plus.runtime.openURL(discordUrl, function (res) {
      console.log('打开授权页面:', res)

      // 如果打开失败，使用系统浏览器打开
      if (res.error) {
        uni.showToast({
          title: '正在打开浏览器...',
          icon: 'none',
        })
        plus.runtime.openWeb(discordUrl)
      }
    })
  }
})

// 监听
// 监听登录状态，并调用getMemberNftsApi
watch(
  () => userStore.isLogin,
  () => {
    if (userStore.isLogin) {
      uni.switchTab({
        url: '/pages/tabbar/my',
      })
    }
  },
)
</script>

<style scoped>
.auth2-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #fff;
}

.loading-text {
  font-size: 16px;
  color: #666;
}
</style>

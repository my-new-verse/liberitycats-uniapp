<template>
  <wd-popup
    v-model="showShare"
    position="bottom"
    custom-style="border-radius: 32rpx 32rpx 0 0; padding-bottom: env(safe-area-inset-bottom); overflow: visible; z-index: 99999 !important;"
  >
    <view class="share-container">
      <view class="close-icon" @click="showShare = false">
        <wd-icon name="close" size="20px" color="#999" />
      </view>

      <view class="share-title">{{ t('social.share.to') }}</view>

      <view class="share-grid">
        <view
          class="share-item"
          v-for="(item, index) in shareOptions"
          :key="index"
          @click="handleShareClick(item.type)"
        >
          <image class="share-icon" :src="item.icon" />
          <text class="share-text">{{ item.label }}</text>
        </view>
      </view>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/store'
import { toUrl, openUrl } from '@/utils'
import i18n, { t } from '@/locale/index'

const userStore = useUserStore()

const showShare = ref(false)

interface ShareOption {
  label: string
  icon: string
  type: 'discord' | 'X' | 'copy'
}

const shareOptions = ref<ShareOption[]>([
  { label: 'discord', icon: '/static/images/Discord.png', type: 'discord' },
  { label: 'X', icon: '/static/images/X.png', type: 'X' },
  { label: '复制链接', icon: '/static/images/link.png', type: 'copy' },
])

const currentSharePost: { value: any } = { value: null }

const openSharePopup = (post: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  console.log(post)

  currentSharePost.value = post
  showShare.value = true
}

const handleShareClick = async (type: 'discord' | 'X' | 'copy') => {
  showShare.value = false

  const post = currentSharePost.value
  if (!post) return

  let cardUrl = ''
  if (post.images.length > 0) {
    cardUrl =
      import.meta.env.VITE_SERVER_BASEURL + '/v1/community/post/share-to-twitter?id=' + post.id
  }

  const isTest = import.meta.env.VITE_SERVER_BASEURL.includes('test')
  const host = isTest ? 'https://test-app.libertycats.app' : 'https://app.libertycats.app'
  const finalShareUrl = `${host}/s/p/${post.id}`
  console.log('finalShareUrl', finalShareUrl)

  switch (type) {
    case 'X': {
      let xUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(post.content)
      if (cardUrl) xUrl += '&url=' + encodeURIComponent(cardUrl)
      openUrl(xUrl)
      break
    }
    case 'discord': {
      //   const discordText = post.content + '\n' + finalShareUrl
      const discordText = finalShareUrl
      const discordUrl = 'https://discord.com/channels/@me?text=' + encodeURIComponent(discordText)
      console.log('discordUrl', discordUrl)

      uni.setClipboardData({
        data: discordText,
        showToast: false,
        success: () => {
          // 唤起 Discord
          setTimeout(() => {
            openUrl('https://discord.com/channels/@me')
          }, 300)
        },
      })

      break
    }
    case 'copy': {
      uni.setClipboardData({
        data: finalShareUrl,
        success: () => {
          uni.showToast({
            title: '复制成功',
            icon: 'success',
          })
        },
      })
      break
    }
  }
}

defineExpose({
  openSharePopup,
})
</script>

<style scoped>
/* 你的原有样式不变 */
.share-container {
  padding: 30rpx;
  background: #fff;
  position: relative;
}
.close-icon {
  position: absolute;
  right: 30rpx;
  top: 20rpx;
}
.share-title {
  text-align: center;
  margin-bottom: 30rpx;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 44rpx;
  color: #261000;
  font-family:
    Alimama FangYuanTi VF,
    sans-serif;
}
.share-grid {
  display: flex;
  justify-content: space-around;
  padding: 20rpx 0;
}
.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.share-icon {
  width: 60rpx;
  height: 60rpx;
}
.share-text {
  font-size: 24rpx;
  font-weight: 400;
  line-height: 36rpx;
  color: #999999;
  font-family:
    Alimama FangYuanTi VF,
    sans-serif;
}
</style>

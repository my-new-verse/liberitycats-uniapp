<template>
  <root-portal>
    <wd-popup
      v-model="showShare"
      position="bottom"
      :z-index="99999"
      custom-style="border-radius: 32rpx 32rpx 0 0; padding-bottom: env(safe-area-inset-bottom); overflow: visible;"
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
  </root-portal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/store'
import { toUrl, openUrl } from '@/utils'
import i18n, { t } from '@/locale/index'
import { getPostShareCopy } from '@/service/api/community'

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

const getShareLocale = () => {
  const locale = i18n.global.locale.value
  switch (locale) {
    case 'zh-Hans':
      return 'zh-CN'
    case 'zh-Hant':
      return 'zh-TW'
    default:
      return 'en-US'
  }
}

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
  if (!post.id) return
  try {
    const res = await getPostShareCopy({
      id: post.id,
      locale: getShareLocale(),
    })
    const shareText = res?.data?.text
    const shareUrl = res?.data?.url
    const discordText = res?.data?.discordText
    const twitterText = res?.data?.twitterText
    const text = res?.data?.text

    if (!shareText) {
      uni.showToast({
        title: t('common.requestFailed'),
        icon: 'none',
      })
      return
    }

    switch (type) {
      case 'X': {
        const xText = twitterText || shareText
        const xUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(xText)
        openUrl(xUrl)
        break
      }
      case 'discord': {
        uni.setClipboardData({
          data: discordText || shareText,
          showToast: false,
          success: () => {
            setTimeout(() => {
              openUrl('https://discord.com/channels/@me')
            }, 300)
          },
        })
        break
      }
      case 'copy': {
        uni.setClipboardData({
          data: text || shareText,
          success: () => {
            uni.showToast({
              title: t('common.copied'),
              icon: 'success',
            })
          },
        })
        break
      }
    }
  } catch (error) {
    console.error('获取分享文案失败:', error)
  }
}

defineExpose({
  openSharePopup,
})
</script>

<style scoped>
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

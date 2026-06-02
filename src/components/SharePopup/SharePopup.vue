<template>
  <root-portal>
    <wd-popup
      v-model="showShare"
      position="bottom"
      :z-index="99999"
      custom-style="border-radius: 24rpx 24rpx 0 0; padding-bottom: env(safe-area-inset-bottom); overflow: visible;"
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

        <!-- 海报模板区域 -->
        <template v-if="posterEnabled && posterTemplates.length > 0">
          <view class="poster-divider" />
          <view class="poster-title">{{ t('social.share.asPortfolio') }}</view>
          <scroll-view class="poster-templates" scroll-x :show-scrollbar="false">
            <view
              class="poster-template-item"
              v-for="tpl in posterTemplates"
              :key="tpl.id"
              @click="handleTemplateClick(tpl.id)"
            >
              <view v-if="!posterImgLoaded[tpl.id]" class="poster-template-placeholder" />
              <image
                :src="tpl.previewUrl"
                class="poster-template-img"
                mode="aspectFit"
                :style="{ opacity: posterImgLoaded[tpl.id] ? 1 : 0 }"
                @load="onPosterImgLoad(tpl.id)"
                @error="onPosterImgLoad(tpl.id)"
              />
            </view>
          </scroll-view>
        </template>
      </view>
    </wd-popup>

    <!-- 海报预览 -->
    <view v-if="showPosterPreview" class="poster-overlay" @click="showPosterPreview = false">
      <scroll-view class="poster-scroll" scroll-y :show-scrollbar="false">
        <image :src="posterUrl" class="poster-full-img" mode="aspectFit" @click.stop />
      </scroll-view>
      <view class="poster-actions" @click.stop>
        <view class="poster-action-item" @click="showPosterPreview = false">
          <image class="poster-action-icon" src="/static/images/cancel.png" />
          <text class="poster-action-text">取消</text>
        </view>
        <view class="poster-action-item" @click="savePoster">
          <image class="poster-action-icon" src="/static/images/download.png" />
          <text class="poster-action-text">保存图片</text>
        </view>
      </view>
    </view>
  </root-portal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/store'
import { toUrl, openUrl } from '@/utils'
import i18n, { t } from '@/locale/index'
import {
  getPostShareCopy,
  type PostShareCopyData,
  type PostSharePosterTemplate,
} from '@/service/api/community'
import { generatePostPoster } from '@/utils/poster'
const userStore = useUserStore()

const showShare = ref(false)
const isLoading = ref(false)
const showPosterPreview = ref(false)
const posterUrl = ref('')
const shareData = ref<PostShareCopyData | null>(null)
const posterEnabled = ref(false)
const posterTemplates = ref<PostSharePosterTemplate[]>([])
const posterImgLoaded = ref<Record<number, boolean>>({})

const onPosterImgLoad = (id: number) => {
  posterImgLoaded.value = { ...posterImgLoaded.value, [id]: true }
}

const handleTemplateClick = async (templateId: number) => {
  const post = currentSharePost.value
  if (!post.id) return

  if (isLoading.value) return
  isLoading.value = true
  showShare.value = false
  uni.showLoading({ title: t('social.share.generatingPoster'), mask: true })
  try {
    const url = await generatePostPoster(post.id, {
      template_id: templateId,
      locale: getShareLocale(),
    })
    posterUrl.value = url
    uni.hideLoading()
    showPosterPreview.value = true
  } catch (err) {
    uni.hideLoading()
    uni.showToast({ title: String(err), icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

interface ShareOption {
  label: string
  icon: string
  type: 'discord' | 'X' | 'copy'
}

const shareOptions = ref<ShareOption[]>([
  { label: 'discord', icon: '/static/images/Discord.png', type: 'discord' },
  { label: 'X', icon: '/static/images/X.png', type: 'X' },
  { label: '复制链接', icon: '/static/images/link.png', type: 'copy' },
  // { label: '下载图片', icon: '/static/images/download.png', type: 'download' },
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

const openSharePopup = async (post: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login', true)
    return
  }
  currentSharePost.value = post
  showShare.value = true

  // 重置状态，避免切换帖子时残留旧数据
  shareData.value = null
  posterEnabled.value = false
  posterTemplates.value = []
  posterImgLoaded.value = {}

  try {
    const res = await getPostShareCopy({
      id: post.id,
      locale: getShareLocale(),
    })
    shareData.value = res?.data ?? null
    posterEnabled.value = res?.data?.poster?.enabled ?? false
    posterTemplates.value = res?.data?.poster?.templates ?? []
  } catch {
    posterEnabled.value = false
    posterTemplates.value = []
  }
}

const handleShareClick = async (type: 'discord' | 'X' | 'copy') => {
  showShare.value = false

  const post = currentSharePost.value
  if (!post.id) return

  // 如果 openSharePopup 中的预请求已完成，直接使用缓存数据
  let data = shareData.value
  if (!data) {
    try {
      const res = await getPostShareCopy({
        id: post.id,
        locale: getShareLocale(),
      })
      data = res?.data ?? null
    } catch {
      // 预请求失败时降级再试
    }
  }

  const shareText = data?.text
  const discordText = data?.discordText
  const twitterText = data?.twitterText
  const text = data?.text

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
}

// 保存海报到相册
const savePoster = () => {
  if (!posterUrl.value) return
  uni.saveImageToPhotosAlbum({
    filePath: posterUrl.value,
    success: () => {
      uni.showToast({ title: t('common.save_success'), icon: 'success' })
      showPosterPreview.value = false
    },
    fail: () => {
      uni.showToast({ title: t('common.save_failed'), icon: 'none' })
    },
  })
}

defineExpose({ openSharePopup })
</script>

<style scoped>
.share-container {
  padding: 30rpx;
  background: linear-gradient(to top right, #ffffff 0%, #ffffff 60%, #ffecd8 100%);
  border-radius: 24rpx 24rpx 0 0;
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
  display: block;
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

.poster-divider {
  height: 1rpx;
  background-color: #ffecd8;
  margin: 12rpx 0 32rpx 0;
}
.poster-title {
  text-align: left;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 44rpx;
  color: #999;
  margin-bottom: 20rpx;
  font-family:
    Alimama FangYuanTi VF,
    sans-serif;
}
.poster-templates {
  width: 100%;
  white-space: nowrap;
  height: 300rpx;
}
.poster-template-item {
  display: inline-block;
  position: relative;
  width: 200rpx;
  height: 300rpx;
  margin-right: 16rpx;
  border-radius: 16rpx;
  overflow: hidden;
  /* background-color: #f5f5f5; */
}
.poster-template-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: poster-loading 1.5s infinite;
  border-radius: 16rpx;
}
@keyframes poster-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
.poster-template-img {
  width: 200rpx;
  height: 300rpx;
  border-radius: 16rpx;
}

.poster-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100000;
  background: #000;
}
.poster-scroll {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
.poster-full-img {
  width: 100%;
  height: 100%;
  padding-bottom: 120rpx;
}
.poster-actions {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-around;
  padding: 30rpx 40rpx;
  padding-bottom: calc(30rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top right, #ffffff 0%, #ffffff 60%, #ffecd8 100%);
  border-radius: 24rpx 24rpx 0 0;
}
.poster-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.poster-action-icon {
  width: 60rpx;
  height: 60rpx;
}
.poster-action-text {
  font-size: 24rpx;
  color: #261000;
}
</style>

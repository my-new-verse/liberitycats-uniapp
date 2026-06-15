<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view>
    <custom-nav2 :title="t('social.inFocus.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="container">
          <view class="socialBox">
            <view class="socialItem">
              <view class="socialHead">
                <view class="avatarBox" @click="needOpenX">
                  <image class="avatar" :src="detailData.author?.avatar || ''" />
                </view>
                <view class="nameWrap">
                  <view class="name">{{ detailData.author?.name }}</view>
                </view>
              </view>
              <view class="socialCntBox">
                <view class="socialCnt">{{ detailData.text }}</view>
                <!-- article -->
                <view
                  v-if="
                    detailData.article &&
                    (detailData.article.title || detailData.article.preview_text)
                  "
                  class="articleCard"
                >
                  <image
                    v-if="detailData.article.cover_media_img_url"
                    class="articleCover"
                    :src="detailData.article.cover_media_img_url"
                    mode="aspectFill"
                  />
                  <view class="articleBody">
                    <view class="articleTitle">{{ detailData.article.title }}</view>
                    <view v-if="detailData.article.preview_text" class="articlePreview">
                      {{ detailData.article.preview_text }}
                    </view>
                  </view>
                </view>
                <view class="socialMedia" v-if="detailData.media && detailData.media.length > 0">
                  <view v-for="(media, index) in detailData.media" :key="index" style="width: 100%">
                    <!-- 视频 -->
                    <view v-if="isVideoMedia(media)" class="videoItem">
                      <DomVideoPlayer
                        ref="domVideoPlayer"
                        :src="getPlayableVideoUrl(media)"
                        controls
                      ></DomVideoPlayer>
                    </view>
                    <!-- 图片 -->
                    <wd-img
                      v-else
                      @click="handlePreviewMedia(detailData.media, index)"
                      custom-class="mediaImgItem"
                      mode="widthFix"
                      :src="media.media_url_https || media.url || ''"
                      :enable-preview="false"
                      custom-style="height: auto !important;width:100% !important;"
                    />
                  </view>
                </view>
                <view class="socialTime">
                  {{ formatWithDate(detailData.publishedAt) }}
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>
      <template #footer>
        <view
          class="fixedTwitterBox"
          style="padding-bottom: calc(env(safe-area-inset-bottom) + 120rpx)"
        >
          <!-- <view class="twitterBtn" @click="openXApp">
            <image class="twitterIcon" src="/static/images/x@2x.png" mode="aspectFit" />
            <text class="twitterText">{{ t('social.inFocus.open_twitter') }}</text>
          </view> -->
          <wd-button type="success" custom-class="mainBtn" @click="openXApp">
            {{ t('social.inFocus.open_twitter') }}
          </wd-button>
        </view>

        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav2>

    <!-- 安装 X 提示弹窗 -->
    <wd-popup v-model="showInstallPopup" position="center" :close-on-click-modal="true">
      <view class="installPopup">
        <view class="installPopupTitle">{{ t('social.inFocus.install_x_title') }}</view>
        <view class="installPopupContent">{{ t('social.inFocus.install_x_content') }}</view>
        <view class="installPopupBtns">
          <!-- <view class="installPopupCancel" @click="showInstallPopup = false">
            {{ t('common.cancel') || '取消' }}
          </view> -->
          <view class="installPopupConfirm" @click="handleGoDownload">
            <!-- {{ t('social.inFocus.install_x_confirm') }} -->
            {{ t('common.confirm') }}
          </view>
        </view>
      </view>
    </wd-popup>

    <wd-popup v-model="showTip" position="center" :close-on-click-modal="true">
      <view class="installPopup">
        <view class="installPopupTitle">{{ t('social.inFocus.install_x_title') }}</view>
        <view class="installPopupContent">{{ t('social.inFocus.need_view_in_x') }}</view>
        <view class="installPopupBtns">
          <view class="installPopupCancel" @click="showTip = false">
            {{ t('common.cancel') || '取消' }}
          </view>
          <view class="installPopupConfirm" @click="openXApp">
            {{ t('social.inFocus.open_twitter') }}
          </view>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { t } from '@/locale'
import { InFocusItem, InFocusMedia, InFocusArticle } from '@/service/api/news'
import { handlePreview } from '@/utils'
import DomVideoPlayer from 'uniapp-video-player'

import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

// 详情数据
const detailData = ref<InFocusItem>({} as InFocusItem)

onLoad((options: any) => {
  if (options?.data) {
    try {
      detailData.value = JSON.parse(decodeURIComponent(options.data))
    } catch (e) {
      console.error('[InFocusDetail] 解析数据失败', e)
    }
  }
})
// ========== 安装提示弹窗 ==========
const showInstallPopup = ref(false)
const showTip = ref(false)
const handleGoDownload = () => {
  showInstallPopup.value = false
  // #ifdef APP-PLUS
  // plus.runtime.openURL(twitterConfig.downloadUrl)
  // #endif
}

const needOpenX = () => {
  showTip.value = true
}
// ========== 视频工具 ==========
const isVideoMedia = (media: InFocusMedia) => {
  return !!(
    media.type === 'video' &&
    media.video_info &&
    media.video_info.variants &&
    media.video_info.variants.length > 0
  )
}

const getPlayableVideoUrl = (media: InFocusMedia): string => {
  const variants = media.video_info?.variants || []
  // 优先选 mp4（最高 bitrate）
  const mp4Variants = variants
    .filter((v) => v.content_type === 'video/mp4')
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
  if (mp4Variants.length > 0) return mp4Variants[0].url || ''
  // 兜底：选第一个有 url 的
  const fallback = variants.find((v) => v.url)
  return fallback?.url || ''
}

// ========== 媒体点击 ==========
const handleMediaTap = (media: InFocusMedia[], index: number) => {
  console.log('media', media)
}

// ========== 图片预览 ==========
const handlePreviewMedia = (media: InFocusMedia[], index: number) => {
  const urls = media.map((m) => m.media_url_https || m.url || '')
  handlePreview(urls, index)
}

// ========== 时间格式化 ==========
const formatWithDate = (isoString: string | null) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// ========== 打开 X App ==========
const twitterConfig = {
  scheme: 'twitter://',
  pname: 'com.twitter.android',
  downloadUrl: 'https://twitter.com/download',
}

const openXApp = () => {
  // #ifdef APP-PLUS
  if (
    plus.runtime.isApplicationExist({ action: twitterConfig.scheme, pname: twitterConfig.pname })
  ) {
    plus.runtime.openURL(detailData.value.twitterUrl || twitterConfig.scheme)
  } else {
    showInstallPopup.value = true
  }
  // #endif
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';

::v-deep .mediaImgItem {
  height: auto !important;
  width: 100% !important;
}

.videoItem {
  width: 100%;

  .videoPlayer {
    width: 100%;
    height: 420rpx;
    border-radius: 12rpx;
  }
}

.articleCard {
  margin-top: 16rpx;
  border: 1rpx solid #e8e8e8;
  border-radius: 16rpx;
  overflow: hidden;
  background-color: #fafafa;

  .articleCover {
    width: 100%;
    height: 240rpx;
  }

  .articleBody {
    padding: 20rpx 24rpx;

    .articleTitle {
      font-size: 28rpx;
      font-weight: 700;
      color: #261000;
      line-height: 40rpx;
    }

    .articlePreview {
      margin-top: 8rpx;
      font-size: 24rpx;
      font-weight: 400;
      color: #666666;
      line-height: 36rpx;
    }
  }
}

:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
}

.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.socialBox {
  padding: 40rpx;
  padding-bottom: 20rpx;
  background-color: #ffffff;
}

:deep(.socialMedia) {
  display: flex !important;
  .mediaImg {
    width: 200rpx !important;
    height: 200rpx !important;
    margin-right: 24rpx !important;
  }
  .mediaImg:nth-child(3n) {
    margin-right: 0 !important;
  }
}

.fixedTwitterBox {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;
  padding: 24rpx 40rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f3f3f4;

  .twitterBtn {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88rpx;
    background-color: #000000;
    border-radius: 44rpx;
    cursor: pointer;

    .twitterIcon {
      width: 40rpx;
      height: 40rpx;
      margin-right: 16rpx;
    }

    .twitterText {
      font-size: 30rpx;
      font-weight: 600;
      color: #ffffff;
      line-height: 1;
    }
  }
}

.installPopup {
  width: 560rpx;
  padding: 48rpx 40rpx 32rpx;
  background-color: #ffffff;
  border-radius: 24rpx;
  text-align: center;

  .installPopupTitle {
    font-size: 32rpx;
    font-weight: 600;
    color: #261000;
  }

  .installPopupContent {
    margin-top: 24rpx;
    font-size: 28rpx;
    font-weight: 400;
    line-height: 44rpx;
    color: #666666;
  }

  .installPopupBtns {
    display: flex;
    gap: 24rpx;
    margin-top: 40rpx;
  }

  .installPopupCancel {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    font-size: 28rpx;
    font-weight: 500;
    color: #999999;
    text-align: center;
    background-color: #f3f3f4;
    border-radius: 40rpx;
  }

  .installPopupConfirm {
    flex: 1;
    height: 80rpx;
    line-height: 80rpx;
    font-size: 28rpx;
    font-weight: 500;
    color: #ffffff;
    text-align: center;
    background-color: #ff6b03;
    border-radius: 40rpx;
  }
}
</style>

<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('game.extract_coin_guide.title')">
      <template #default>
        <view class="guideImgBox">
          <view v-if="imgLoading" class="imgLoading">
            <wd-loading size="60rpx" color="#ff6b03" />
          </view>
          <wd-img
            :src="guideImgUrl"
            width="100%"
            mode="widthFix"
            @load="onImgLoad"
            @error="onImgError"
            :preview-src="guideImgUrl"
            :enable-preview="true"
          ></wd-img>
        </view>
      </template>
      <template #footer>
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { useToast } from 'wot-design-uni'
import { getImageUrl, getServerOnOff } from '@/utils'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

// 语言
const locale = uni.getLocale()
const toast = useToast()

// 图片 URL（带缓存）
const GUIDE_IMG_URL =
  'https://liberycats.oss-accelerate.aliyuncs.com/social/20260714/412c1496-b0d6-4bc9-9d61-e5315e731890extract_coin_guide.jpg'
const guideImgUrl = ref(GUIDE_IMG_URL + '?x-oss-process=style/sqdt')
console.log(guideImgUrl.value)
const imgLoading = ref(true)

const onImgLoad = () => {
  imgLoading.value = false
}
const onImgError = () => {
  imgLoading.value = false
}

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

onLoad(() => {
  // 预加载：重新获取缓存路径（首次访问会触发异步下载，后续直接用本地缓存）
  const ar_withdraw_process_image_url =
    getServerOnOff('ar_withdraw_process_image_url', 'common', true) || GUIDE_IMG_URL
  guideImgUrl.value = ar_withdraw_process_image_url + '?x-oss-process=style/sqdt'
  console.log(guideImgUrl.value)
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.page {
  .cnt {
    min-height: 100vh;
    background-color: #fff;
  }
  .pbl,
  .pbr {
    .fbg {
      background-color: #fff;
    }
  }
}

.title {
  font-size: 48rpx;
  font-style: normal;
  font-weight: 500;
  line-height: 56rpx;
  color: #261000;
}

.guideImgBox {
  position: relative;
  min-height: 400rpx;
}

.imgLoading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 200rpx;
  z-index: 1;
}
</style>

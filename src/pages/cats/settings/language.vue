<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('setting.language.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="menuBox">
          <view class="menuItem" @click="handleChangeLocale('en')">
            <view class="menuItemTitle">
              <view class="title">English</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[current === 'en' ? 'active' : '']"></view>
            </view>
          </view>
          <view class="menuItem" @click="handleChangeLocale('zh-Hans')">
            <view class="menuItemTitle">
              <view class="title">简体中文</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[current === 'zh-Hans' ? 'active' : '']"></view>
            </view>
          </view>
          <view class="menuItem" @click="handleChangeLocale('zh-Hant')">
            <view class="menuItemTitle">
              <view class="title">繁体中文</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[current === 'zh-Hant' ? 'active' : '']"></view>
            </view>
          </view>
          <!-- <view class="menuItem" @click="handleChangeLocale('ja')">
          <view class="menuItemTitle">
            <view class="title">日本語</view>
          </view>
          <view class="menuItemRight">
            <view class="arrow" :class="[current === 'ja' ? 'active' : '']"></view>
          </view>
        </view> -->
        </view>
      </template>
      <template #footer>
        <wd-message-box selector="wd-message-box-slot" />
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { useMessage } from 'wot-design-uni'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

const message = useMessage('wd-message-box-slot')
// 语言
const locale = uni.getLocale()

const current = ref(uni.getLocale())

const handleChangeLocale = (lang: string) => {
  message
    .confirm({
      msg: t('setting.language.confirm_txt'),
    })
    .then(() => {
      // 下面2句缺一不可！！！
      current.value = lang
      uni.setLocale(lang)

      // #ifdef APP
      plus.runtime.restart()
      // #endif

      i18n.global.locale = lang
    })
    .catch(() => {})
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

.menuItem {
  .menuItemRight {
    .arrow {
      width: 48rpx;
      height: 48rpx;
      background-image: url('@/static/images/checkbox.png');
    }
    .arrow.active {
      background-image: url('@/static/images/checkbox_on.png');
    }
  }
}
</style>

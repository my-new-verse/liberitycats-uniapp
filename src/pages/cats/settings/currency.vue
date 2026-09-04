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
    <custom-nav :title="t('setting.currency.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="menuBox">
          <view class="menuItem" @click="handleChangeLocale('usd')">
            <view class="menuItemTitle">
              <view class="title">USD</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[current === 'usd' ? 'active' : '']"></view>
            </view>
          </view>
          <view class="menuItem" @click="handleChangeLocale('cny')">
            <view class="menuItemTitle">
              <view class="title">人民币</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow" :class="[current === 'cny' ? 'active' : '']"></view>
            </view>
          </view>
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
import { useMessage, useToast } from 'wot-design-uni'
import { useUserStore } from '@/store'
import { updateBaseInfoApi, updateBaseInfoParams } from '@/service/api/user'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

const message = useMessage('wd-message-box-slot')
const userStore = useUserStore()
const toast = useToast()

// 语言
const locale = uni.getLocale()

// 加载用户默认使用的货币
const current = computed(() => {
  return userStore.userInfo.currency_unit
})

const handleChangeLocale = (currencyUnit: string) => {
  message
    .confirm({
      msg: t('setting.currency.confirm_txt'),
    })
    .then(() => {
      // 写入服务器
      updateBaseInfoApi({
        value: currencyUnit,
        field: 'currency_unit',
      } as updateBaseInfoParams).then((res) => {
        if (res.code === 1) {
          toast.show(t('common.save_success'))
          userStore.getUserInfo()
          // #ifdef APP
          plus.runtime.restart()
          // #endif
        } else {
          toast.show(res.msg)
        }
      })
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

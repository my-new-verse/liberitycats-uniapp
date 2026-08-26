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
    <custom-nav :title="t('setting.index.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="menuBox" style="padding-bottom: 400rpx">
          <view class="menuItem" @click="toUrl('/pages/cats/settings/avatar', true)">
            <view class="menuItemTitle">
              <view class="avatar">
                <image
                  :src="
                    userStore.userInfo.avatar.length > 0
                      ? getImageUrl(userStore.userInfo.avatar + '?x-oss-process=style/jzcq')
                      : '/static/images/default_avatar.png'
                  "
                  mode="widthFix"
                ></image>
              </view>
              <view class="title">{{ t('setting.index.avatar') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow"></view>
            </view>
          </view>
          <view class="menuItem" @click="toUrl('/pages/cats/settings/nickname', true)">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.nickname') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="rightTitle">
                {{ formatNickname(userStore.userInfo.nickname, 16) }}
              </view>
              <view class="arrow"></view>
            </view>
          </view>
          <view class="menuItem" @click="toUrl('/pages/cats/address/management', true)">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.address_management') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="arrow"></view>
            </view>
          </view>
          <view class="menuItem" @click="toUrl('/pages/cats/settings/language')">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.language') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="rightTitle">
                {{ getI18nNameMap()[locale] || '' }}
              </view>
              <view class="arrow"></view>
            </view>
          </view>
          <view class="menuItem" @click="showThemeSheet = true">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.theme') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="rightTitle">{{ themeModeLabel }}</view>
              <view class="arrow"></view>
            </view>
          </view>
          <view class="menuItem" @click="toUrl('/pages/cats/settings/currency', true)">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.pricing_currency') }}</view>
            </view>
            <view class="menuItemRight">
              <view class="rightTitle" style="text-transform: uppercase">
                {{ userStore.userInfo.currency_unit }}
              </view>
              <view class="arrow"></view>
            </view>
          </view>
          <view class="menuItem" v-if="userStore.userInfo.wallet_address !== ''">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.wallet') }}</view>
            </view>
            <view class="menuItemRight">
              {{ formatWalletAddress(userStore.userInfo.wallet_address) }}
              <!-- <span class="disconnect" @click="disconnectWallet">
                {{ t('setting.index.disconnect') }}
              </span> -->
            </view>
          </view>
          <view class="menuItem" v-if="userStore.isLogin">
            <view class="menuItemTitle">
              <view class="title">{{ t('setting.index.account.logoff') }}</view>
            </view>
            <view class="menuItemRight">
              <span class="disconnect" @click="logoffAccount">
                {{ t('setting.index.account.logoff_btn_now') }}
              </span>
            </view>
          </view>
        </view>

        <view class="btnBox" v-if="userStore.isLogin">
          <wd-button
            v-if="userStore.userInfo.show_switch_virtual_account === 1"
            type="success"
            custom-class="mainBtn2"
            @click="toUrl('/pages/cats/settings/virtual_account', true)"
          >
            {{ t('setting.index.change_account') }}
          </wd-button>
          <wd-button type="success" custom-class="mainBtn" @click="logout">
            {{ t('setting.index.logout') }}
          </wd-button>
        </view>
      </template>
      <template #footer>
        <wd-message-box selector="wd-message-box-slot" />
      </template>
    </custom-nav>
    <wd-action-sheet v-model="showThemeSheet" :actions="themeActions" @select="onThemeSelect" />
  </view>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import i18n, { t } from '@/locale/index'
import { useUserStore } from '@/store/user'
import { applyTheme, resolveTheme, getStoredTheme, type ThemeMode } from '@/utils/theme'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

import { useMessage } from 'wot-design-uni'

import { formatNickname, formatWalletAddress, getI18nNameMap, getImageUrl, toUrl } from '@/utils'
const userStore = useUserStore()
const message = useMessage('wd-message-box-slot')

// 语言
const locale = uni.getLocale()

// 夜间模式（浅色/深色/跟随系统 三档）
const themeMode = ref<ThemeMode>(getStoredTheme())
const themeModeLabel = computed(() => {
  if (themeMode.value === 'light') return t('setting.index.theme_light')
  if (themeMode.value === 'dark') return t('setting.index.theme_dark')
  return t('setting.index.theme_system')
})
const showThemeSheet = ref(false)
const themeActions = computed(() => [
  { name: t('setting.index.theme_light'), value: 'light' },
  { name: t('setting.index.theme_dark'), value: 'dark' },
  { name: t('setting.index.theme_system'), value: 'system' },
])
const onThemeSelect = ({ item }: any) => {
  const mode = item.value as ThemeMode
  themeMode.value = mode
  uni.setStorageSync('app_theme', mode)
  applyTheme(resolveTheme(mode))
}

const logout = () => {
  message
    .confirm({
      msg: t('setting.index.logout_confirm_txt'),
    })
    .then(() => {
      userStore.logout().then(() => {
        uni.switchTab({
          url: '/pages/tabbar/my',
        })
      })
    })
    .catch(() => {})
}

const disconnectWallet = () => {
  message
    .confirm({
      msg: t('setting.index.disconnect_content_confirm'),
    })
    .then(() => {
      userStore.disconnectWallet()
    })
    .catch(() => {})
}

const logoffAccount = () => {
  message
    .confirm({
      msg: t('setting.index.account.logoff_confirm_txt'),
    })
    .then(() => {
      userStore.logoffAccount().then((res) => {
        uni.switchTab({
          url: '/pages/tabbar/my',
        })
      })
    })
    .catch(() => {})
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--bg-primary) !important;
}

:deep(.fbg) {
  background-color: var(--bg-primary) !important;
}
.page {
  position: relative;
  .btnBox {
    position: fixed;
    bottom: 64rpx;
    width: calc(100% - 80rpx);
    margin: 0 auto;
    .mainBtn {
      width: 100%;
      height: 88rpx;

      font-size: 32rpx;
      font-style: normal;
      font-weight: 600;
      color: var(--bg-card);
      text-align: center;
      background: #ff6b03;
    }

    .mainBtn2 {
      width: 100%;
      height: 88rpx;
      margin-bottom: 20rpx;

      font-size: 32rpx;
      font-style: normal;
      font-weight: 600;
      color: #ff6b03;
      text-align: center;
      background: var(--liberty-cats-page-background-color);

      border: 2rpx solid #ff6b03;
    }
  }
}

.avatar {
  width: 112rpx;
  height: 112rpx;
  margin-right: 16rpx;
  overflow: hidden;
  background-color: var(--bg-card);
  border-radius: 50%;
  image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
}

.disconnect {
  margin-left: 16rpx;
  color: #ff6b03;
}
</style>

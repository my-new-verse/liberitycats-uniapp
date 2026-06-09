<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '',
  },
}
</route>

<template>
  <view class="page2" :class="[locale]">
    <view class="headBg"></view>
    <view class="nav" :style="{ top: navTop }">
      <wd-icon name="close" size="40rpx" @click="navigateBack"></wd-icon>
    </view>
    <view class="cnt">
      <view class="title">{{ t('login.title') }}</view>
      <view class="inputBox">
        <wd-input
          type="text"
          v-model="inputEmail"
          :placeholder="t('login.email_placeholder')"
          @change="handleChange"
          :no-border="true"
          custom-class="emailInput"
          clearable
          inputmode="email"
          :ignoreCompositionEvent="false"
        />
      </view>
      <view class="xyBox">
        <view
          class="checkbox"
          :class="[inputAgreement ? 'checked' : '']"
          @click="inputAgreement = !inputAgreement"
        ></view>
        <view class="txt">
          {{ t('login.agreement_1') }}
          <text
            @click="
              toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.user_login_agreement.id)
            "
          >
            《{{ agreementsMap?.user_login_agreement?.i18n_content.name }}》
          </text>
          {{ t('login.agreement_2') }}
          <text
            @click="
              toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.user_privacy_policy.id)
            "
          >
            《{{ agreementsMap?.user_privacy_policy?.i18n_content.name }}》
          </text>
        </view>
      </view>
      <view class="btnBox">
        <wd-button type="success" custom-class="mainBtn" @click="sendEmail">
          {{ t('login.send_email_btn') }}
        </wd-button>
      </view>
      <view class="unionBox">
        <!-- #ifdef APP-PLUS -->
        <view v-if="isIOS" class="item" @click="loginWithApple()">
          <image src="@/static/images/apple@2x.png" mode="widthFix" />
        </view>
        <!-- #endif -->
        <view class="item" @click="loginWithDiscord()" v-if="getServerOnOff('enable_discord')">
          <image src="@/static/images/discoard@2x.png" mode="widthFix" />
        </view>
        <view class="item" @click="toUrl('/pages/cats/login/virtual/login')">
          <image
            src="@/static/images/virtual-email.png"
            mode="widthFix"
            style="width: 54rpx; margin-left: 6rpx"
          />
        </view>
      </view>
    </view>
  </view>
  <wd-toast />
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import {
  toUrl,
  todoMsg,
  navigateBack,
  getServerOnOff,
  waitSystemConfig,
  waitAgreements,
} from '@/utils'
import { useToast } from 'wot-design-uni'
import { getAgreementsByKeys, QuoteKeyAgreementList } from '@/service/api/agreement'
import { getDiscordOauthUriApi } from '@/service/api/discord'
import { useUserStore } from '@/store'

const isIOS = ref(false)

const toast = useToast()
const userStore = useUserStore()
// 语言
const locale = uni.getLocale()

const inputEmail = ref('')
const inputAgreement = ref(false)
const handleChange = (e) => {
  inputEmail.value = e.detail.value
}

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const cntTop = ref<string>('')
const navTop = ref<string>('')

onMounted(async () => {
  // #ifdef H5
  cntTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 'rpx'
  navTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 28 + 'rpx'
  // #endif
  // #ifdef APP-PLUS
  cntTop.value = (safeAreaInsets?.top || 0) + 'rpx'
  navTop.value = (safeAreaInsets?.top || 0) + 28 + 'rpx'
  // #endif

  // #ifdef APP-PLUS
  const systemInfo = uni.getSystemInfoSync()
  console.log('APP环境系统信息:', systemInfo)
  isIOS.value =
    systemInfo.platform?.toLowerCase() === 'ios' || systemInfo.osName?.toLowerCase() === 'ios'
  console.log('是否iOS:', isIOS.value)
  // #endif

  // 确保 systemConfig 和 agreements 就绪（未就绪时自动补偿获取）
  const [, agreementsData] = await Promise.all([waitSystemConfig(), waitAgreements()])
  agreementsMap.value = agreementsData

  inputEmail.value = uni.getStorageSync('login_email') || ''
})

const sendEmail = () => {
  if (inputEmail.value === '') {
    toast.show(t('login.email_required'))
    return false
  }
  if (!/^\w+((-\w+)|(\.\w+))*@\w+((\.|-)\w+)*\.\w+$/.test(inputEmail.value)) {
    toast.show(t('login.email_format_error'))
    return false
  }

  if (!inputAgreement.value) {
    toast.show(t('login.agreement_required'))
    return false
  }

  uni.navigateTo({
    url:
      '/pages/cats/login/login_code?email=' +
      inputEmail.value +
      '&agreement=' +
      inputAgreement.value,
  })
}

const params = ref<any>({})
onLoad((option) => {
  params.value = option
})

const agreementsMap = ref<QuoteKeyAgreementList>()

// discord 登录
const loginWithDiscord = () => {
  if (!getServerOnOff('enable_discord')) return

  if (!inputAgreement.value) {
    toast.show(t('login.agreement_required'))
    return false
  }

  getDiscordOauthUriApi().then((res) => {
    const authorizeUrl = res.data.url
    // 跳转到auth2页面，传入授权URL
    uni.navigateTo({
      url: `/pages/cats/discord/auth2?authorizeUrl=${encodeURIComponent(authorizeUrl)}`,
    })
  })
}
// discord end

// Apple 登录
const loginWithApple = () => {
  if (!inputAgreement.value) {
    toast.show(t('login.agreement_required'))
    return false
  }

  uni.login({
    provider: 'apple',
    success: function (loginRes) {
      // 登录成功
      uni.getUserInfo({
        provider: 'apple',
        success: function (info) {
          console.log('Apple login success:', info)
          // 获取用户信息成功, info.authResult中保存登录认证数据
          uni.showLoading()
          userStore
            .loginByApple(info)
            .then((res) => {
              // 登录成功后，跳转到首页
              userStore.navigateToAfterLogin()
            })
            .catch((err) => {
              // 登录失败
              console.error('Apple login failed:', err)
              toast.show(err.msg || t('login.apple_auth_failed'))
            })
            .finally(() => {
              uni.hideLoading()
            })
        },
      })
    },
    fail: function (err) {
      console.log('eeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', err)
      // 登录授权失败
      // err.code错误码参考`授权失败错误码(code)说明`
      toast.show(t('login.apple_auth_failed'))
    },
  })
}
// Apple end
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.headBg {
  height: 142rpx;
  background:
    linear-gradient(360deg, #ffffff 0%, rgba(255, 255, 255, 0) 100%),
    linear-gradient(90deg, #fefcf5 0%, #fcfdd4 25%, #ffe8d7 71%);
}

.nav {
  position: fixed;
  display: flex;
  align-items: center;
  width: calc(100% - 48rpx);
  height: 108rpx;
  padding: 0 24rpx;
  //background: red;
}

.cnt {
  padding: 64rpx;
  //margin-top: 54rpx;
  //background: green;
  .title {
    height: 56rpx;
    font-size: 48rpx;
    font-style: normal;
    font-weight: 600;
    line-height: 56rpx;
    color: #261000;
  }
  .inputBox {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 72rpx;
    padding: 8rpx 24rpx;
    margin: 64rpx 0;
    background: #f7f6f4;
    border-radius: 16rpx;
    .emailInput {
      width: 100%;
      background: transparent;
    }
  }
  .xyBox {
    display: flex;
    align-items: center;
    .txt {
      font-size: 24rpx;
      font-style: normal;
      font-weight: 400;
      line-height: 32rpx;
      color: #999999;

      text {
        color: #ff6b03;
      }
    }
    .checkbox {
      width: 48rpx;
      height: 48rpx;
      margin-right: 8rpx;
      background-image: url('@/static/images/checkbox.png');
      background-repeat: no-repeat;
      background-position: 100%;
      background-size: 100%;
    }
    .checkbox.checked {
      background-image: url('@/static/images/checkbox_on.png');
    }
  }

  .btnBox {
    margin-top: 32rpx;
    .mainBtn {
      width: 100%;
      height: 88rpx;

      font-size: 32rpx;
      font-style: normal;
      font-weight: 600;
      color: #ffffff;
      text-align: center;
      background: #ff6b03;
    }
  }
  .unionBox {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 80rpx;
    .item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 96rpx;
      height: 96rpx;
      margin-right: 32rpx;
      border: 2rpx solid #e7e8eb;
      border-radius: 50%;
      image {
        width: 48rpx;
      }
    }
  }
}
</style>

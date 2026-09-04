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
      <view class="title">{{ t('login.virtual_title') }}</view>
      <view class="subTitle">
        <view class="txt">{{ t('login.virtual_sub_title') }}</view>
        <view
          class="learnMOre"
          @click="toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.virtual_email_intro.id)"
        >
          {{ t('login.virtual_sub_title_link') }}
        </view>
      </view>
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
            《{{ agreementsMap?.user_login_agreement.i18n_content.name }}》
          </text>
          {{ t('login.agreement_2') }}
          <text
            @click="
              toUrl('/pages/cats/agreement/detail?id=' + agreementsMap?.user_privacy_policy.id)
            "
          >
            《{{ agreementsMap?.user_privacy_policy.i18n_content.name }}》
          </text>
        </view>
      </view>
      <view class="btnBox">
        <wd-button type="success" custom-class="mainBtn" @click="sendEmail">
          {{ t('login.send_email_btn') }}
        </wd-button>
      </view>
    </view>
  </view>
  <wd-toast />
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { toUrl, todoMsg, navigateBack } from '@/utils'
import { useToast } from 'wot-design-uni'
import { getAgreementsByKeys, QuoteKeyAgreementList } from '@/service/api/agreement'
import { queryVirtualEmailApi } from '@/service/api/login'

const toast = useToast()

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

onMounted(() => {
  // #ifdef H5
  cntTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 'rpx'
  navTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 28 + 'rpx'
  // #endif
  // #ifdef APP-PLUS
  cntTop.value = (safeAreaInsets?.top || 0) + 'rpx'
  navTop.value = (safeAreaInsets?.top || 0) + 28 + 'rpx'
  // #endif

  // 加载用户协议
  agreementsMap.value = uni.getStorageSync('agreements')

  inputEmail.value = uni.getStorageSync('virtual_login_email') || ''
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

  // 校验虚拟邮箱格式

  if (!inputAgreement.value) {
    toast.show(t('login.agreement_required'))
    return false
  }

  // 查询虚拟账号是否存在
  queryVirtualEmailApi(inputEmail.value).then((res) => {
    if (res.code === 1) {
      uni.redirectTo({
        url:
          '/pages/cats/login/virtual/login_code?email=' +
          inputEmail.value +
          '&agreement=' +
          inputAgreement.value,
      })
    } else {
      toast.show(res.msg)
    }
  })
}

const params = ref<any>({})
onLoad((option) => {
  params.value = option
})

const agreementsMap = ref<QuoteKeyAgreementList>()
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.cnt) {
  background-color: var(--bg-card) !important;
}

.headBg {
  height: 142rpx;
  background: var(--login-head-bg);
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
  height: 100vh;
  //margin-top: 54rpx;
  //background: green;
  .title {
    height: 56rpx;
    font-size: calc(48rpx * var(--font-scale));
    font-style: normal;
    font-weight: 600;
    line-height: calc(56rpx * var(--font-scale));
    color: var(--text-primary);
  }
  .subTitle {
    display: flex;
    align-items: center;
    margin-top: 16rpx;
    .txt {
      font-size: calc(20rpx * var(--font-scale));
      font-style: normal;
      font-weight: 400;
      line-height: calc(28rpx * var(--font-scale));
      color: var(--text-secondary);

      text {
        color: #ff6b03;
      }
    }
    .learnMOre {
      margin-left: 8rpx;
      font-size: calc(20rpx * var(--font-scale));
      font-style: normal;
      font-weight: 400;
      line-height: calc(28rpx * var(--font-scale));
      color: #ff6b03;

      //text-decoration: underline;
    }
  }
  .inputBox {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 72rpx;
    padding: 8rpx 24rpx;
    margin: 64rpx 0;
    background: var(--bg-primary);
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
      font-size: calc(24rpx * var(--font-scale));
      font-style: normal;
      font-weight: 400;
      line-height: calc(32rpx * var(--font-scale));
      color: var(--text-secondary);

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

      font-size: calc(32rpx * var(--font-scale));
      font-style: normal;
      font-weight: 600;
      color: var(--bg-card);
      text-align: center;
      background: #ff6b03;
    }
  }
}
</style>

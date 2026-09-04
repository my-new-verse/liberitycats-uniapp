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
      <wd-icon name="arrow-left" size="40rpx" @click="navigateBack"></wd-icon>
    </view>
    <view class="cnt">
      <view class="title">{{ $t('login_code.sub_title') }}</view>
      <view class="subTitle">{{ t('login_code.code_sent', { email: data.email }) }}</view>
      <view class="inputBox">
        <wd-password-input
          v-model="code"
          :gutter="'28rpx'"
          v-model:visible="showKeyboard"
          :maxlength="6"
          :mask="false"
          @blur="showKeyboard = false"
          @focus="showKeyboard = true"
        />
      </view>
      <view class="subTitle">
        <template v-if="cuntDownStep == 1 && data.cuntDown > 0">
          <wd-count-down :time="data.cuntDown * 1000" @finish="cuntDownStep = 2" format="ss">
            <template #default="{ current }">
              <span class="custom-count-down">
                {{
                  t('login_code.cunt_down_txt', { time: current.minutes * 60 + current.seconds })
                }}
              </span>
            </template>
          </wd-count-down>
        </template>
        <template v-else-if="cuntDownStep == 2">
          <text class="retrieve" @click="doSendEmail(data.email)">
            {{ t('login_code.retrieve') }}
          </text>
        </template>
      </view>
      <view class="btnBox">
        <wd-button
          :loading="submitLoading"
          type="success"
          custom-class="mainBtn"
          @click="debouncedLogin"
          :disabled="submitDisabled"
        >
          {{ t('login_code.login_submit') }}
        </wd-button>
      </view>
    </view>
    <wd-number-keyboard
      v-model:visible="showKeyboard"
      mode="custom"
      extra-key="."
      close-text="完成"
      @input="onInput"
      @delete="onDelete"
    ></wd-number-keyboard>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'

import { useToast } from 'wot-design-uni'
import { toUrl, navigateBack } from '@/utils'
import { sendVirtualEmailApi, sendEmailResponse, LoginResponse } from '@/service/api/login'
import { useUserStore } from '@/store'
import { debounce } from 'lodash-es'
// 语言
const locale = uni.getLocale()
const { show: showToast } = useToast()

const code = ref<string>('')
const showKeyboard = ref<boolean>(true)

const submitDisabled = ref<boolean>(true)

const onInput = (value) => {
  console.log('value->', value)
  // showToast(`${value}`)
  code.value += value
  if (code.value.length === 6) {
    submitDisabled.value = true
    showKeyboard.value = false
    debouncedLogin.value()
  } else {
    showKeyboard.value = true
    submitDisabled.value = true
  }
}
const onDelete = () => {
  code.value = code.value.slice(0, -1)
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

  debouncedLogin.value = debounce(doLogin, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
  })
})

const cuntDownStep = ref(0)

const data = reactive({
  email: '',
  code: '',
  agreement: false,
  cuntDown: 0,
  referer: '',
})

onLoad((option) => {
  if (option?.email) {
    data.email = option.email
    doSendEmail(data.email)
  }
  if (option?.agreement) {
    data.agreement = option.agreement
  }
  if (option?.referer) {
    data.referer = option.referer
  }
})

const doSendEmail = (email: string) => {
  code.value = ''
  sendVirtualEmailApi(email).then((res) => {
    if (res.data.expire > 0) {
      data.cuntDown = res.data.expire
      cuntDownStep.value = 1
      console.log('data.cuntDown->', data.cuntDown)
    } else {
      cuntDownStep.value = 2
    }
  })
}

const submitLoading = ref(false)

// 使用 ref 来存储防抖函数的引用
const debouncedLogin = ref<(() => Promise<void>) | null>(null)

// 在组件卸载时清理防抖函数
onUnmounted(() => {
  if (debouncedLogin.value) {
    ;(debouncedLogin.value as any).cancel()
  }
})

const doLogin = async () => {
  try {
    if (code.value.length !== 6) {
      showToast(t('login.login_code.code_error'))
      return
    }

    submitLoading.value = true
    cuntDownStep.value = 0
    const { loginByVirtualEmailCode, navigateToAfterLogin } = useUserStore()
    const res = await loginByVirtualEmailCode(data.email, code.value)
    navigateToAfterLogin(data.referer)
  } catch (error) {
    showToast(error.msg)
    code.value = ''
    console.error('登录失败:', error)
  } finally {
    submitLoading.value = false
  }
}
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
  margin-top: 54rpx;
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
  }
  .subTitle,
  .custom-count-down,
  .retrieve {
    margin-top: 24rpx;
    font-size: calc(28rpx * var(--font-scale));
    font-style: normal;
    font-weight: 400;
    line-height: calc(36rpx * var(--font-scale));
    color: var(--text-secondary);
  }
  .custom-count-down {
    margin-left: 8rpx;
  }
  .retrieve {
    color: #ff6b03;
    cursor: pointer;
  }
  .inputBox {
    margin-top: 64rpx;
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
::v-deep .wd-password-input {
  margin: 0;
}
::v-deep .wd-password-input__item {
  width: 80rpx;
  height: 80rpx;
  background-color: var(--bg-primary);
  border-radius: 16rpx;
}
</style>

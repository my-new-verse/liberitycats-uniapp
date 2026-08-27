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
    <custom-nav :title="t('setting.nickname.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="menuBox">
          <view class="menuItem">
            <wd-input
              type="text"
              v-model="nickname"
              :placeholder="t('common.nickname_placeholder')"
              @input="handleChange"
              :no-border="true"
              clearable
              custom-class="nicknameInput"
              :ignoreCompositionEvent="false"
            />
            <view class="nicknameWordLimit">{{ nicknameLength }} / 30</view>
          </view>
          <view class="nicknameDesc">
            <view>{{ t('common.nickname_placeholder') }}</view>
            <view>{{ t('setting.nickname.nickname_desc') }}</view>
          </view>
          <view class="btnBox">
            <wd-button type="success" custom-class="mainBtn" @click="save">
              {{ t('common.save_btn_txt') }}
            </wd-button>
          </view>
        </view>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { useUserStore } from '@/store/user'
import { updateBaseInfoApi, updateBaseInfoParams } from '@/service/api/user'
import { useToast } from 'wot-design-uni'

import CustomNav from '@/components/CustomNav/CustomNav.vue'
import { calculateLength } from '@/utils'

const toast = useToast()
const userStore = useUserStore()
// 语言
const locale = uni.getLocale()

const nickname = ref('')
nickname.value = userStore.userInfo.nickname

const nicknameLength = ref(0)
nicknameLength.value = calculateLength(nickname.value)
const handleChange = (e) => {
  const value = e.value // 注意这里改为 e.detail.value
  const length = calculateLength(value)

  // 如果长度超过30个字符，截取合适的长度
  if (length > 30) {
    let newValue = ''
    let currentLength = 0
    for (let i = 0; i < value.length; i++) {
      const char = value[i]
      const charCode = char.charCodeAt(0)
      const charLength = charCode >= 0x4e00 && charCode <= 0x9fa5 ? 2 : 1

      if (currentLength + charLength > 30) break

      newValue += char
      currentLength += charLength
    }
    // 使用 nextTick 避免死循环
    nextTick(() => {
      nickname.value = newValue
      nicknameLength.value = currentLength
    })
  } else {
    nickname.value = value
    nicknameLength.value = length
  }
}

const save = () => {
  if (!nickname.value) {
    toast.show(t('setting.nickname.nickname_required'))
    return
  }

  // 禁止特殊字符
  const validReg = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/
  if (!validReg.test(nickname.value)) {
    toast.show(t('setting.nickname.nickname_invalid'))
    return
  }

  const bytesLength = calculateLength(nickname.value)
  console.log('bytesLength========================', bytesLength)
  if (bytesLength < 3) {
    toast.show(t('setting.nickname.nickname_min_length'))
    return
  }
  if (bytesLength > 30) {
    toast.show(t('setting.nickname.nickname_max_length'))
    return
  }

  updateBaseInfoApi({
    value: nickname.value,
    field: 'nickname',
  } as updateBaseInfoParams).then((res) => {
    if (res.code === 1) {
      toast.show(t('common.save_success'))
      userStore.getUserInfo()
    } else {
      toast.show(res.msg)
    }
  })
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
  flex-direction: column;
  .menuItemRight {
    width: 48rpx;
    height: 48rpx;
    background-image: url('@/static/images/checkbox.png');
  }
  .menuItemRight.active {
    background-image: url('@/static/images/checkbox_on.png');
  }
  .nicknameWordLimit {
    width: 100%;
    margin-top: 30rpx;
    font-size: 24rpx;
    font-style: normal;
    font-weight: 400;
    color: var(--text-secondary);
    text-align: right;
  }
}

.nicknameDesc {
  margin-left: 24rpx;
  font-size: 24rpx;
  font-style: normal;
  font-weight: 400;
  color: var(--text-secondary);
}

.btnBox {
  margin-top: 32rpx;
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
}

:deep(.nicknameInput) {
  width: 100%;
}
</style>

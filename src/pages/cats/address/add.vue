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
    <custom-nav :title="t('address.add.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="cell leftRight">
          <view class="label">{{ t('address.add.name') }}</view>
          <view class="inputBox">
            <wd-input
              type="text"
              v-model="addressData.name"
              :placeholder="t('address.add.name_placeholder')"
              :no-border="true"
              customInputClass="rightInput"
              :ignoreCompositionEvent="false"
            />
          </view>
        </view>
        <view class="cell leftRight">
          <view class="label">{{ t('address.add.phone_area_code') }}</view>
          <view class="inputBox phone-input">
            <wd-picker
              ref="picker"
              :columns="countryColumns"
              v-model="addressData.area_code"
              @confirm="handleCountrySelect"
              :title="t('address.add.select_phone_area_code')"
              custom-class="phoneAreaCode"
            >
              <template #default>
                <text>
                  {{ addressData.area_code }}
                </text>
              </template>
            </wd-picker>
          </view>
        </view>

        <view class="cell leftRight">
          <view class="label">{{ t('address.add.phone') }}</view>
          <view class="inputBox phone-input">
            <wd-input
              type="number"
              inputmode="tel"
              v-model="addressData.cellphone"
              :placeholder="t('address.add.phone_placeholder')"
              :no-border="true"
              customInputClass="rightInput"
              clearable
              clear-trigger="focus"
              :ignoreCompositionEvent="false"
            />
          </view>
        </view>
        <view class="cell">
          <view class="label">{{ t('address.add.detail_address') }}</view>
          <view class="inputBox">
            <wd-textarea
              v-model="addressData.address"
              :placeholder="t('address.add.detail_address_placeholder')"
              custom-class="textArea"
              auto-height
              :ignoreCompositionEvent="false"
            />
          </view>
        </view>
        <view class="cell leftRight">
          <view class="label">{{ t('address.add.set_default') }}</view>
          <view
            class="radioBox"
            :class="{ checked: addressData.is_default == 1 }"
            @click="
              addressData.is_default == 1
                ? (addressData.is_default = 0)
                : (addressData.is_default = 1)
            "
          ></view>
        </view>
      </template>
      <template #footer>
        <view class="fixedBtnBox">
          <wd-button custom-class="mainBtn" @click="save">{{ t('common.save_btn_txt') }}</wd-button>
        </view>
      </template>
    </custom-nav>
  </view>
</template>

<script setup lang="ts">
import i18n, { t } from '@/locale/index'
import { addressItem, getMyAddressDetailApi, updateMyAddressApi } from '@/service/api/address'
import { calculateLength, toUrl } from '@/utils'
import { useToast } from 'wot-design-uni'
import { ref } from 'vue'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

const toast = useToast()
// 语言
const locale = uni.getLocale()

// 地址数据
const addressData = ref<addressItem>({
  id: 0,
  name: '',
  cellphone: '',
  address: '',
  is_default: 0,
  member_id: 0,
  create_time: '',
  area_code: '',
})

const bak = ref<string>('')

const countryColumns = [
  { value: '86', label: t('address.add.country_option.china') },
  { value: '852', label: t('address.add.country_option.hongkong') },
  { value: '1', label: t('address.add.country_option.usa') },
  { value: '81', label: t('address.add.country_option.japan') },
  { value: '82', label: t('address.add.country_option.korea') },
  { value: '44', label: t('address.add.country_option.uk') },
]

const picker = ref()

const handleCountrySelect = ({ value }: { value: string }) => {
  addressData.value.area_code = value
}

onLoad((options) => {
  if (options?.id) {
    getMyAddressDetailApi(options.id).then((res) => {
      addressData.value = res.data
    })
  }
  if (options?.bak) {
    bak.value = options.bak
  }
})

const save = () => {
  const nameLent = calculateLength(addressData.value.name)

  if (nameLent < 2) {
    toast.show(t('address.add.name_required'))
    return
  }
  if (addressData.value.area_code === '') {
    toast.show(t('address.add.please_select_country_code'))
    return
  }
  const reg = /^[0-9\s\-()]{6,20}$/
  if (!addressData.value.cellphone || !reg.test(addressData.value.cellphone)) {
    toast.show(t('address.add.cellphone_required'))
    return
  }

  const addressLent = calculateLength(addressData.value.address)

  if (addressLent < 9 || addressLent > 200) {
    toast.show(t('address.add.detail_address_required'))
  }

  updateMyAddressApi(addressData.value).then((res) => {
    if (res.code === 1) {
      toast.show(t('common.save_success'))
      if (bak.value === 'confirm_order') {
        toUrl('/pages/cats/flow/confirm_order', true, true)
      } else if (bak.value === 'select') {
        toUrl('/pages/cats/address/select', true, true)
      } else {
        toUrl('/pages/cats/address/management', true, true)
      }
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

:deep(.wd-picker-view__roller) {
  background: var(--wot-action-sheet-active-color);
}

.phone-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.zh-Hans,
.zh-Hant {
  .cell {
    .label {
      white-space: nowrap;
    }
  }
}

:deep(.phoneAreaCode) {
  .wd-picker__cell {
    padding: 0;
  }
}
</style>

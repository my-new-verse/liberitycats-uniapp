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
    <custom-nav :title="t('address.management.page_tile')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <template v-if="responseData.data.length > 0">
          <view class="cell" v-for="item in responseData.data" :key="item.id">
            <view class="addressBox">
              <view class="infoBox">
                <view class="titleBox">
                  <view class="name">{{ item.name }}</view>
                  <view class="phone">
                    <template v-if="item.area_code">+{{ item.area_code }}</template>
                    {{ item.cellphone }}
                  </view>
                </view>
                <view class="address">
                  {{ item.address }}
                </view>
              </view>
              <view class="opBox">
                <view class="defaultBox" @click="setDefaultAddress(item.id)">
                  <view class="radioBox" :class="{ checked: item.is_default == 1 }"></view>
                  {{ t('common.set_default') }}
                </view>
                <view class="editBox">
                  <view class="icon">
                    <image src="@/static/images/edit@2x.png" mode="widthFix" />
                  </view>
                  <view
                    class="txt"
                    @click="toUrl('/pages/cats/address/add?bak=mgt&id=' + item.id, true, true)"
                  >
                    {{ t('common.edit') }}
                  </view>
                </view>
                <view class="deleteBox">
                  <view class="icon">
                    <image src="@/static/images/delete@2x.png" mode="widthFix" />
                  </view>
                  <view class="txt" @click="deleteAddress(item.id)">{{ t('common.delete') }}</view>
                </view>
              </view>
            </view>
          </view>
        </template>
        <template v-else>
          <view class="emptyBox">
            <view class="emptyImg"></view>
            <view class="emptyText">{{ t('common.empty') }}</view>
          </view>
        </template>
      </template>
      <template #footer>
        <view class="fixedBtnBox">
          <wd-button
            custom-class="mainBtn"
            @click="toUrl('/pages/cats/address/add?bak=mgt', true, true)"
          >
            {{ t('address.management.add_address') }}
          </wd-button>
        </view>

        <!-- <wd-loadmore :state="state" @reload="loadMore" /> -->
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
        <wd-message-box selector="wd-message-box-slot" />
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { toUrl, navigateBack } from '@/utils'
import { useToast, useMessage } from 'wot-design-uni'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

import {
  getMyAddressListApi,
  getMyAddressListResponse,
  deleteMyAddressApi,
  setDefaultMyAddressApi,
} from '@/service/api/address'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

const toast = useToast()
const message = useMessage('wd-message-box-slot')
// 语言
const locale = uni.getLocale()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

const responseData = ref<getMyAddressListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
})
onReachBottom(() => {
  if (responseData.value?.current_page < responseData.value?.last_page) {
    loadMore()
  }
})

onLoad(() => {
  loadMore()
})

const loadMore = () => {
  state.value = 'loading'
  getMyAddressListApi(responseData.value?.current_page + 1).then((res) => {
    if (!res.data) return
    responseData.value.data = responseData.value.data.concat(res.data.data)
    responseData.value.current_page = res.data.current_page
    responseData.value.last_page = res.data.last_page
    if (responseData.value?.current_page === responseData.value?.last_page) {
      state.value = 'finished'
    }
  })
}

const deleteAddress = (id: number) => {
  message
    .confirm({
      msg: t('common.delete_confirm'),
    })
    .then(() => {
      deleteMyAddressApi(id).then((res) => {
        if (res.code === 1) {
          toast.success(t('common.delete_success'))
          responseData.value.data = responseData.value.data.filter((item) => item.id !== id)
        }
      })
    })
    .catch(() => {})
}

const setDefaultAddress = (id: number) => {
  message
    .confirm({
      msg: t('address.management.is_set_default'),
    })
    .then(() => {
      setDefaultMyAddressApi(id).then((res) => {
        if (res.code === 1) {
          toast.show(t('common.save_success'))
          responseData.value.data = responseData.value.data.map((item) =>
            item.id === id ? { ...item, is_default: 1 } : { ...item, is_default: 0 },
          )
        }
      })
    })
    .catch(() => {})
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
//
.page {
  background-color: var(--liberty-cats-page-background-color);
  .cnt {
    padding: 40rpx;
  }
}

.addressBox {
  .infoBox {
    .titleBox {
      display: flex;
      flex-direction: column;
      justify-content: start;
      margin-bottom: 12rpx;
      .name {
        font-size: 36rpx;
        font-style: normal;
        font-weight: 600;
        line-height: 52rpx;
        color: var(--text-primary);
      }
      .phone {
        margin: 0 24rpx;
        font-size: 32rpx;
        font-style: normal;
        font-weight: 400;
        line-height: 48rpx;
        color: var(--text-primary);
      }
    }
    .address {
      font-size: 28rpx;
      font-style: normal;
      font-weight: 400;
      line-height: 40rpx;
      color: #999999;
    }
  }

  .opBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 24rpx;
    margin-top: 24rpx;
    border-top: 1rpx solid #e7e7e7;
    .icon {
      width: 32rpx;
      height: 32rpx;
      margin-right: 12rpx;
      image {
        width: 100%;
        height: 100%;
        margin-top: -6rpx;
      }
    }
    .defaultBox {
      display: flex;
      align-items: center;
      justify-content: center;
      .radioBox {
        margin-right: 12rpx;
      }
    }
    .editBox,
    .deleteBox {
      display: flex;
      justify-content: center;
      font-size: 28rpx;
      font-style: normal;
      font-weight: 400;
      color: var(--text-primary);
    }
  }
}
</style>

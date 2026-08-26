<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view>
    <custom-nav
      :title="t('setting.index.change_account')"
      pageBackgroundColor="#f7f6f4"
      paddingBottom="40rpx"
    >
      <template #default>
        <view class="opTitle">轻触头像以切换账号</view>
        <template v-if="responseData.data.length > 0">
          <view
            class="menuBox"
            v-for="item in responseData.data"
            :key="item.id"
            @click="switchAccount(item)"
          >
            <view class="menuItem">
              <view class="menuItemTitle">
                <view class="avatar">
                  <image
                    :src="
                      getImageUrl(
                        item.avatar
                          ? item.avatar + '?x-oss-process=style/jzcq'
                          : '/static/images/default_avatar.png',
                      )
                    "
                    mode="widthFix"
                  ></image>
                </view>
                <view>
                  <view class="nameBox">
                    <view class="title">{{ formatNickname(item.nickname, 20) }}</view>
                    <view class="tag" v-if="item.main_member_id === 0">Main</view>
                  </view>
                  <view class="subtitle">{{ formatWalletAddress(item.login_account, 20, 4) }}</view>
                </view>
              </view>
              <view class="menuItemRight">
                <view
                  class="arrow"
                  :class="{ active: userStore.userInfo.member_id === item.member_id }"
                ></view>
              </view>
            </view>
          </view>
        </template>

        <view
          class="menuBox"
          @click="toUrl('/pages/cats/login/virtual/bind', true)"
          v-if="userStore.userInfo.show_add_virtual_account === 1"
        >
          <view class="menuItem">
            <view class="menuItemTitle">
              <view class="avatar" style="border: none">
                <image :src="'/static/images/add_virtual_account.png'" mode="widthFix"></image>
              </view>
              <view class="title">{{ t('setting.virtual_account.add_account') }}</view>
            </view>
          </view>
        </view>
      </template>
      <template #footer>
        <wd-message-box selector="wd-message-box-slot" />
        <wd-loadmore :state="state" @reload="loadMore" />
        <wd-backtop :scrollTop="scrollTop"></wd-backtop>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { formatNickname, formatWalletAddress, getImageUrl, navigateBack, toUrl } from '@/utils'
import {
  getVirtualEmailAccountListResponse,
  getVirtualEmailAccountListApi,
  switchVirtualEmailAccountApi,
} from '@/service/api/virtualEmail'
import { useToast, useMessage } from 'wot-design-uni'
import { useUserStore } from '@/store'

// 滚动到底部加载更多
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

const message = useMessage('wd-message-box-slot')

// 语言
const locale = uni.getLocale()
const userStore = useUserStore()
const toast = useToast()

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})
const state = ref<LoadMoreState>('loading')

const responseData = ref<getVirtualEmailAccountListResponse>({
  data: [],
  current_page: 0,
  last_page: 1,
})
onReachBottom(() => {
  if (responseData.value?.current_page < responseData.value?.last_page) {
    loadMore()
  }
})

onShow(() => {
  responseData.value.data = []
  responseData.value.current_page = 0
  responseData.value.last_page = 1
  loadMore()
})

const loadMore = () => {
  state.value = 'loading'
  getVirtualEmailAccountListApi(responseData.value?.current_page + 1).then((res) => {
    if (!res.data) return
    responseData.value.data = responseData.value.data.concat(res.data.data)
    responseData.value.current_page = res.data.current_page
    responseData.value.last_page = res.data.last_page
    if (responseData.value?.current_page === responseData.value?.last_page) {
      state.value = 'finished'
    }
  })
}

const switchAccount = (item) => {
  console.log('switchAccount', item)

  if (userStore.userInfo.member_id == item.member_id) {
    // 如果是当前账号，则直接返回
    toast.show(t('setting.virtual.switch_account_current_txt'))
    return
  }

  message
    .confirm({
      msg: t('setting.virtual.switch_account_confirm_txt'),
    })
    .then(() => {
      // 切换账号,并重启
      switchVirtualEmailAccountApi(item.id).then((res) => {
        if (res.code === 1) {
          // 切换成功，把新的token保存起来，并重启app
          userStore.swithVirtualEmailAccount(res.data.token, item.login_account).then(() => {
            // #ifdef APP
            plus.runtime.restart()
            // #endif
            // #ifdef H5
            uni.reLaunch({
              url: '/',
            })
            // #endif
          })
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

.opTitle {
  width: 100%;
  margin: 96rpx auto;
  font-size: 48rpx;
  color: var(--text-primary);
  text-align: center;
}

.avatar {
  width: 112rpx;
  height: 112rpx;
  margin-right: 16rpx;
  overflow: hidden;
  background-color: var(--bg-card);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }
}

.subtitle {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-style: normal;
  font-weight: normal;
  color: #999999;
  text-align: left;
}

.nameBox {
  display: flex;
  align-items: center;
  .title {
    font-size: 32rpx;
    color: var(--text-primary);
  }

  .tag {
    padding: 6rpx 12rpx;
    margin-left: 8rpx;
    font-size: 20rpx;
    font-weight: 600;
    color: #ff6b03;
    text-transform: uppercase;
    background: #fff7e5;
    border-radius: 12rpx;
  }
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

<!-- 使用 type="home" 属性设置首页，其他页面不需要设置，默认为page；推荐使用json5，更强大，且允许注释 -->
<route lang="json5">
{
  layout: 'default2',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '%my.page_title%',
  },
}
</route>
<template>
  <view class="pageMy" :class="[locale]">
    <view class="headBox" :style="{ height: headBoxHeight }">
      <view class="kf" :style="{ top: kfBoxTop }" @click="handleKf"></view>
      <view class="headCnt">
        <view class="avatar" @click="toUrl('/pages/cats/settings/avatar', true)">
          <image
            :src="
              userStore.userInfo.avatar == ''
                ? '/static/images/default_avatar.png'
                : getImageUrl(userStore.userInfo.avatar + '?x-oss-process=style/jzcq')
            "
            mode="widthFix"
          ></image>
        </view>
        <view class="info">
          <template v-if="!userStore.isLogin">
            <view class="name" @click="toUrl('/pages/cats/login/login')">
              {{ t('my.index.nickname.login') }}
            </view>
          </template>
          <template v-else>
            <view class="name" @click="toUrl('/pages/cats/settings/nickname')">
              {{ formatNickname(userStore.userInfo.nickname, 16) }}
            </view>
            <view
              class="level"
              :class="{
                ['level' + currentLevel]: currentLevel > 0,
              }"
              @click="showMemberLevelPopup"
              v-if="currentLevel > 0"
            >
              <image :src="getImageUrl(userStore.userInfo.level.icon)" mode="widthFix" />
            </view>
            <!-- 隐藏argame -->
            <view class="gameIconBox" v-if="getServerOnOff('ar_enable', 'common')">
              <view
                class="gmAr"
                :class="{ on: userStore.userInfo?.bind_ar?.third_open_id }"
                @click="bindArGame"
              ></view>
            </view>
            <!-- <view class="points" @click="toUrl('/pages/cats/asset/log?assetKey=point', true)">
              <view class="label">{{ t('my.asset.points') }}:</view>
              <view class="amount">
                {{ formatNumber(assetResp?.point.usable_balance || 0, 0) }}
              </view>
              <view class="unit">g</view>
            </view> -->
            <view class="asset-resps" style="display: flex">
              <view
                v-if="assetResp"
                v-for="(item, key) in assetResp"
                :key="key"
                class="points"
                @click="toUrl(`/pages/cats/asset/log?assetKey=${key}`, true)"
              >
                <template v-if="key !== 'pledge_point'">
                  <!-- <wd-img
                    mode="aspectFit"
                    width="28rpx"
                    height="28rpx"
                    :src="iconMap[key]"
                  ></wd-img> -->
                  <view class="label">{{ item.name }}:</view>
                  <view class="amount">
                    {{ formatNumber(item.usable_balance || 0, 0) }}
                  </view>
                  <view class="unit">{{ item.unit || '' }}</view>
                </template>
              </view>
            </view>
          </template>
        </view>
      </view>
    </view>
    <view class="cnt" :style="{ top: headBoxHeight, height: cntHeight }">
      <scroll-view
        class="scrollBox"
        :scroll-y="true"
        refresher-background="transparent"
        :refresher-enabled="true"
        refresher-color="#ff6b03"
        :refresher-triggered="isRefreshing"
        @refresherrefresh="onRefresh"
        @refresherrestore="onRefreshRestore"
        @refresherabort="onRefreshAbort"
      >
        <view class="scrollCnt">
          <view class="checkinBox" v-if="userStore.isLogin">
            <view class="titleBox">
              <view class="titleLeft" style="font-size: 28rpx">
                {{ t('my.check_in_prefix') }}
                <text class="checkinDays">{{ checkinData.continuous_days }}</text>
                {{ t('my.check_in_suffix') }}
              </view>
              <view
                v-if="checkinData.today.date !== ''"
                class="titleRight"
                :class="{ active: checkinData.today.is_check === false }"
                @click="handleCheckIn"
              >
                {{
                  checkinData.today.is_check === false
                    ? t('my.check_in_btn')
                    : t('my.checkin_checked')
                }}
              </view>
            </view>
            <view class="checkinCnt">
              <view class="scrollOp"><view class="opl"></view></view>
              <scroll-view class="checkinDateBox" :scroll-x="true">
                <template v-if="checkinData.list.length > 0">
                  <view class="checkinDateBox">
                    <view
                      class="checkinDateItem"
                      :class="{ active: item.is_check }"
                      v-for="(item, index) in checkinData.list"
                      :key="index"
                    >
                      <view class="pointBox">
                        <view class="point">+{{ item.reward_amount }}</view>
                        <view class="gift"></view>
                      </view>
                      <view class="date">{{ item.date }}</view>
                    </view>
                  </view>
                </template>
                <template v-else>
                  <view class="checkinDateBox"></view>
                </template>
              </scroll-view>
              <view class="scrollOp"><view class="opr"></view></view>
            </view>
          </view>
          <!--
          <view class="NftBox" v-if="userStore.isLogin">
            <view class="titleBox">
              <view class="titleLeft nftTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/asset@2x.png" mode="widthFix" />
                </view>
                <view>
                  {{ t('my.my_assets_title') }}
                </view>
              </view>
            </view>
            <view class="assetBox">
              <view
                class="assetItem"
                @click="toUrl('/pages/cats/asset/log?assetKey=pledge_point', true)"
              >
                <view class="amountBox">
                  <view class="amount">
                    {{ formatNumber(assetResp?.pledge_point.usable_balance || 0, 0) }}
                  </view>
                </view>
                <view class="labelBox">
                  <view class="leftBox">
                    <view class="assetIcon assetPoint"></view>
                    <view class="label">{{ t('my.asset.pledgePoints') }}</view>
                  </view>
                  <view class="moreIcon"></view>
                </view>
              </view>
              <view class="assetItem" @click="toUrl('/pages/cats/asset/log?assetKey=point', true)">
                <view class="amountBox">
                  <view class="amount">
                    {{ formatNumber(assetResp?.point.usable_balance || 0, 0) }}
                  </view>
                  <view class="unit">g</view>
                </view>
                <view class="labelBox">
                  <view class="leftBox">
                    <view class="assetIcon assetPledgePoint"></view>
                    <view class="label">{{ t('my.asset.points') }}</view>
                  </view>
                  <view class="moreIcon"></view>
                </view>
              </view>
              <view
                class="assetItem"
                @click="toUrl('/pages/cats/asset/log?assetKey=ccToken', true)"
              >
                <view class="amountBox">
                  <view class="amount">
                    {{ formatNumber(assetResp?.ccToken?.usable_balance || 0, 0) }}
                  </view>
                  <view class="unit">c</view>
                </view>
                <view class="labelBox">
                  <view class="leftBox">
                    <view class="assetIcon assetccPoint"></view>
                    <view class="label">{{ t('my.asset.ccToken') }}</view>
                  </view>
                  <view class="moreIcon"></view>
                </view>
              </view>
            </view>
          </view> -->

          <view class="NftBox" v-if="userStore.isLogin && getServerOnOff('enable_nft')">
            <view class="titleBox">
              <view class="titleLeft nftTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/nft.png" mode="widthFix" />
                </view>
                <view>
                  {{ t('my.my_nft_title') }}
                </view>
                <!-- <image
                  class="refresh"
                  src="@/static/images/refresh.png"
                  mode="scaleToFill"
                  v-if="userStore.userInfo.wallet_address !== ''"
                  @click="handleRefreshNftList"
                /> -->
              </view>
              <view
                @click="toUrl('/pages/cats/pledge/index', true)"
                class="titleRight"
                v-if="userStore.isLogin"
              >
                {{ nftList.length }}
              </view>
            </view>
            <template v-if="userStore.userInfo.wallet_address !== ''">
              <view class="nftBox">
                <template v-if="nftList.length > 0">
                  <view class="nftList" @click="toUrl('/pages/cats/pledge/index', true)">
                    <template v-for="(item, index) in nftList" :key="index">
                      <template v-if="showNftMoreOnOff || index < 4">
                        <view class="nftItem">
                          <view class="nftImg">
                            <image :src="getImageUrl(item.token_img)" class="nft" mode="widthFix" />
                          </view>
                          <view class="nftTitle">#{{ item.token_id }}</view>
                        </view>
                      </template>
                    </template>
                  </view>
                  <view class="nftOp" v-if="nftList.length > 4" @click="showNftMore">
                    <view class="opBtn" :class="{ up: showNftMoreOnOff }">
                      <image src="@/static/images/down.png" />
                    </view>
                  </view>
                </template>
                <template v-else>
                  <view
                    class="emptyBox"
                    style="
                      width: 80%;
                      height: 200rpx;
                      margin: 40rpx auto 0 auto;
                      font-size: 24rpx;
                      color: #999;
                      text-align: center;
                    "
                  >
                    {{ t('my.nft.empty_txt') }}
                  </view>
                </template>
              </view>
            </template>
            <view
              class="emptyBox"
              style="
                width: 80%;
                height: 200rpx;
                margin: 40rpx auto 0 auto;
                font-size: 24rpx;
                color: #999;
                text-align: center;
              "
              v-else
            >
              {{ t('my.nft.empty.not_bind_wallet') }}
              <view
                class="nftConnect"
                @click="connectWallet"
                v-if="getServerOnOff('enable_bind_wallet')"
              >
                {{ t('my.nft.import_from_okx') }}
              </view>
            </view>
          </view>
          <view class="menuBox">
            <view class="menuItem" @click="toUrl('/pages/cats/posts/list', true)">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/posts.png" mode="widthFix" />
                </view>
                <view class="title">{{ t('my.menu.my_post') }}</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view>
            <view class="menuItem" @click="toUrl('/pages/cats/order/list', true)">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/order.png" mode="widthFix" />
                </view>
                <view class="title">{{ t('my.menu.my_order') }}</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view>
            <view class="menuItem" @click="toUrl('/pages/cats/favorite/list', true)">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/wishlist.png" mode="widthFix" />
                </view>
                <view class="title">{{ t('my.menu.my_wishlist') }}</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view>
            <view class="menuItem" @click="toUrl('/pages/cats/settings/index')">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/setting.png" mode="widthFix" />
                </view>
                <view class="title">{{ t('my.menu.settings') }}</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view>
            <view class="menuItem" @click="toUrl('/pages/cats/about/index')">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/about.png" mode="widthFix" />
                </view>
                <view class="title">{{ t('my.menu.about') }}</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view>
            <view class="menuItem" @click="checkForUpdate">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/update.png" mode="widthFix" />
                </view>
                <view class="title">{{ t('my.menu.update') }}</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view>

            <!-- <view class="menuItem" @click="toGame">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/about.png" mode="widthFix" />
                </view>
                <view class="title">小游戏</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view> -->

            <!-- <view class="menuItem" @click="shareToSystem('xxx')">
              <view class="menuItemTitle">
                <view class="icon2">
                  <image class="iconImg" src="@/static/images/about.png" mode="widthFix" />
                </view>
                <view class="title">测试</view>
              </view>
              <view class="menuItemRight">
                <view class="arrow"></view>
              </view>
            </view> -->
          </view>

          <!--新增一个版本号的显示，每次build版本号变更-->
          <view class="version-number">
            <wd-badge is-dot hidden>{{ version }}</wd-badge>
          </view>
        </view>
      </scroll-view>

      <wd-message-box selector="wd-message-box-slot">
        <wd-table
          :data="dataList"
          :stripe="false"
          :border="false"
          row-height="70rpx"
          custom-class="memberLevelTable"
        >
          <wd-table-col
            prop="level_img"
            :label="t('my.index.member.level.popup.table.level_img')"
            width="calc(100% - 200rpx)"
            align="left"
          >
            <template #value="{ row }">
              <view class="table-level-icon">
                <image :src="getImageUrl(row.level_img)" mode="heightFix" class="table-level-img" />
              </view>
            </template>
          </wd-table-col>
          <wd-table-col
            prop="level_count"
            :label="t('my.index.member.level.popup.table.level_count')"
            width="200rpx"
            align="center"
          ></wd-table-col>
        </wd-table>
      </wd-message-box>

      <wd-message-box selector="wd-message-box-slot2"></wd-message-box>
    </view>
    <FloatingCat />
    <!-- 版本更新弹窗 -->
    <AppUpdatePopup
      :model-value="manualUpdatePopupShow"
      :title="t('my.menu.update.popup.title')"
      :content="manualUpdateContent"
      :clos-able="manualUpdateClosable"
      @close="manualUpdatePopupShow = false"
      @btn-click="handleManualUpdateBtnClick"
      :main-btn-text="t('common.btn.update_btn_txt')"
      :modalZIndex="9999"
    />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import {
  formatNickname,
  getImageUrl,
  openOkx,
  shareToSystem,
  toAdUrl,
  toUrl,
  getServerOnOff,
  formatNumber,
  openUrl,
} from '@/utils'

import { useMessage, useToast } from 'wot-design-uni'

import { createWebDataForKeyApi } from '@/service/api/web3'

import { getAgreementsByKeys, QuoteKeyAgreementList } from '@/service/api/agreement'

import {
  getMemberNftsApi,
  getMemberNftsApiResponse,
  refreshMemberNftsApi,
} from '@/service/api/pledge'

import buildInfo from '@/../build-info.json'

import { useUserStore } from '@/store/user'
import { checkInApi, getCheckInDataApi, getCheckInDataApiResponse } from '@/service/api/checkin'
import {
  getAllAssetTotalBalanceApi,
  getAllAssetTotalBalanceApiResponse,
  getAssetTotalBalanceApi,
  refreshLevelApi,
  bindArGameApi,
  getSystemConfigApiV2,
} from '@/service/api/user'
import { getServerI18nKey } from '@/utils/i18n'
import pointIcon from '@/static/images/game1.png'
import ccIcon from '@/static/images/cc@2x.png'
import FloatingCat from '@/components/FloatingCat.vue'
import AppUpdatePopup from '@/components/AppUpdatePopup.vue'
import { useSystemStore } from '@/store/system'

uni.hideTabBar()

const userStore = useUserStore()
const toast = useToast()
const message = useMessage('wd-message-box-slot')
const message2 = useMessage('wd-message-box-slot2')
const agreementsMap = ref<QuoteKeyAgreementList>()

// 获取版本号
const version = `Version ${buildInfo.version}`
const locale = uni.getLocale()

defineOptions({
  name: 'My',
})

// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const headBoxHeight = ref<string>('')
const kfBoxTop = ref<string>('')
const cntHeight = ref<string>('')
const assetResp = ref<getAllAssetTotalBalanceApiResponse | null>(null)

onMounted(() => {
  // #ifdef H5
  headBoxHeight.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 360 + 'rpx'
  kfBoxTop.value = (safeAreaInsets?.top || 0) / uni.rpx2px(1) + 36 + 'rpx'
  cntHeight.value = 'calc(100vh - ' + headBoxHeight.value + ' - 32rpx)'
  // #endif
  // #ifdef APP-PLUS
  headBoxHeight.value = (safeAreaInsets?.top || 0) + 360 + 'rpx'
  kfBoxTop.value = (safeAreaInsets?.top || 0) + 36 + 'rpx'
  cntHeight.value = 'calc(100vh - ' + headBoxHeight.value + ' + 64rpx - 120rpx)'
  // #endif

  // 加载用户协议
  agreementsMap.value = uni.getStorageSync('agreements')

  if (userStore.isLogin) {
    loadNftList()
    loadCheckinData()
  }
})

onShow(() => {
  userStore.getUserInfo()
  refreshAssets()
  loadNftList()
  loadCheckinData()
  refreshLevel()
})

const iconMap = {
  point: pointIcon,
  cc_token: ccIcon,
}
const showNftMoreOnOff = ref(false)
const showNftMore = () => {
  showNftMoreOnOff.value = !showNftMoreOnOff.value
}

const refreshAssets = () => {
  if (!userStore.isLogin) return
  getAllAssetTotalBalanceApi().then((res) => {
    assetResp.value = res.data
  })
}

const currentLevel = ref<number>(0)
currentLevel.value = userStore.userInfo.level.level ?? 0
const refreshLevel = () => {
  if (!userStore.isLogin) return
  refreshLevelApi().then((res) => {
    currentLevel.value = res.data.level ?? 0
  })
}

const checkinData = ref<getCheckInDataApiResponse>({
  list: [],
  today: {
    date: '',
    is_check: false,
    continuous_days: 0,
    reward_amount: 0,
  },
  continuous_days: 0,
})

// 监听登录状态，并调用getMemberNftsApi
watch(
  () => userStore.isLogin,
  () => {
    if (userStore.isLogin) {
      loadNftList()
      loadCheckinData()
    }
  },
)

const loadNftList = () => {
  if (!userStore.isLogin) return
  getMemberNftsApi(1, false).then((res) => {
    nftList.value = res.data.data.filter((item) => item !== null)
  })
}

const loadCheckinData = () => {
  if (!userStore.isLogin) return
  getCheckInDataApi().then((res) => {
    checkinData.value = res.data
    // 刷新积分
    refreshAssets()
  })
}

// 签到
const handleCheckIn = async () => {
  if (!userStore.isLogin) {
    toast.show(t('common.toast.pleaseLogin'))
    return
  }
  if (checkinData.value.today.is_check) {
    toast.show(t('my.checkin_checked'))
    return
  }
  uni.showLoading()
  await checkInApi()
  loadCheckinData()
  uni.hideLoading()
}

// 语言
const walletLang = getServerI18nKey()

const connectWallet = () => {
  message2
    .confirm({
      msg: t('my.index.bind_wallet_confirm_txt'),
      // rich: true,
    })
    .then(() => {
      createWebDataForKeyApi('bindWallet').then((res) => {
        if (res.code === 1) {
          const dappUrl = `${import.meta.env.VITE_DAPP_BASEURL}?key=${res.data.key}&lang=${walletLang}`
          openOkx(dappUrl)
        } else {
          toast.show(res.msg)
        }
      })
    })
    .catch(() => {})
}

const nftList = ref<getMemberNftsApiResponse['data']>([])

const handleRefreshNftList = () => {
  if (!userStore.isLogin) return
  // message
  //   .confirm({
  //     msg: t('my.refreshNftList.confirm'),
  //   })
  //   .then(() => {
  //     refreshMemberNftsApi().then((res) => {
  //       if (res.code === 1) {
  //         setTimeout(() => {
  //           getMemberNftsApi(1).then((res) => {
  //             nftList.value = res.data.data
  //           })
  //         }, 5000)
  //       } else {
  //         toast.show(res.msg)
  //       }
  //     })
  //   })
  //   .catch(() => {})
  uni.showLoading()
  refreshMemberNftsApi()
    .then((res) => {
      if (res.code === 1) {
        setTimeout(() => {
          getMemberNftsApi(1, false).then((res) => {
            nftList.value = res.data.data
          })
        }, 5000)
      } else {
        toast.show(res.msg)
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
}

const handleKf = () => {
  toUrl('/pages/cats/kf/add', true)
}

const showMemberLevelPopup = () => {
  message.alert({})
}

const dataList = reactive([
  {
    level_count: '0',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/M3X1743689887U8kcjAy7RKasKNB4.png',
  },
  {
    level_count: '1-3',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/SC61743689887RNOqadYFhk1ZnMzT.png',
  },
  {
    level_count: '4-9',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/OBz1743689887dqzw6WxwlxwlxR0A.png',
  },
  {
    level_count: '≥10',
    level_img:
      'https://liberycats.oss-accelerate.aliyuncs.com/static_easyadmin/20250403/MVP1743689887SFPj6iLTRHftaDhb.png',
  },
])

// 刷新状态追踪
// 刷新状态
const isRefreshing = ref(false)

// 下拉刷新
const onRefresh = () => {
  isRefreshing.value = true
  const startTime = Date.now()

  // 执行刷新操作
  refreshData()
    .then(() => {
      // 计算剩余需要等待的时间，确保总时间至少为1秒
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 1000 - elapsed)
      return new Promise((resolve) => setTimeout(resolve, remaining))
    })
    .catch((error) => {
      console.error('刷新出错:', error)
      // 即使出错也保持1秒的加载状态
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 1000 - elapsed)
      return new Promise((resolve) => setTimeout(resolve, remaining))
    })
    .finally(() => {
      isRefreshing.value = false
    })
}

// 刷新数据
const refreshData = async () => {
  try {
    await Promise.all([
      refreshAssets(),
      loadNftList(),
      refreshLevel(),
      // 其他需要刷新的数据
    ])
  } catch (error) {
    console.error('刷新失败:', error)
  }
}

// 刷新被重置
const onRefreshRestore = () => {
  console.log('刷新被重置')
}

// 刷新被中止
const onRefreshAbort = () => {
  console.log('刷新被中止')
  isRefreshing.value = false
}

const toGame = () => {
  toUrl('/pages/game/index', true)
}

// 版本更新相关
const systemStore = useSystemStore()
const manualUpdatePopupShow = ref(false)
const manualUpdateContent = ref('')
const manualUpdateClosable = ref(true)
const manualUpdateUrl = ref('')

const checkForUpdate = async () => {
  // toast.show(t('my.menu.update.checking'))
  try {
    const systemInfo = uni.getSystemInfoSync()
    const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
    const currentVersion = `${buildInfo.version}`
    const res = await getSystemConfigApiV2(currentVersion, platform)
    const updateInfo = res.data?.update
    // 同步最新 config
    if (res.data) {
      systemStore.setConfig(res.data)
    }
    if (updateInfo?.version) {
      // 有新版本
      manualUpdateContent.value =
        t('my.menu.update.popup.content_prefix') +
        updateInfo.version +
        (updateInfo.update_log?.title ? '\n\n' + updateInfo.update_log.title : '')
      manualUpdateClosable.value = updateInfo.is_force_update !== 1
      manualUpdateUrl.value = updateInfo.url || ''
      manualUpdatePopupShow.value = true
    } else {
      toast.show(t('my.menu.update.latest'))
    }
  } catch (e) {
    toast.show(t('my.menu.update.latest'))
  }
}

const handleManualUpdateBtnClick = () => {
  manualUpdatePopupShow.value = false
  if (manualUpdateUrl.value) {
    openUrl(manualUpdateUrl.value)
  }
}

// 绑定/换绑的公共请求逻辑
const doBindArGame = (code: string) => {
  bindArGameApi(code).then((res) => {
    console.log('bind Ar Game', res)
    if (res.code === 1) {
      toast.show(res.msg && res.msg.length ? res.msg : t('my.game.bind_ar.msgbox.success.msg'))
      userStore.getUserInfo()
    }
  })
}

// 弹出输入框让用户输入绑定口令
const showBindArPrompt = () => {
  return message2.prompt({
    title: t('my.game.bind_ar.msgbox.title'),
    inputValue: '',
    inputPlaceholder: t('my.game.bind_ar.msgbox.placeholder'),
    inputPattern: /^[a-zA-Z0-9]{6,12}$/,
    inputError: t('my.game.bind_ar.msgbox.inputError'),
    cancelButtonText: t('common.cancel'),
    confirmButtonText: t('common.confirm'),
  })
}

const bindArGame = () => {
  const hasValue = !!userStore?.userInfo?.bind_ar?.bind_status
  if (hasValue) {
    const canRebind = !!userStore?.userInfo?.bind_ar?.can_rebind
    if (canRebind) {
      // 已绑定且允许换绑：confirm 提示是否换绑
      message2
        .confirm({
          title: t('my.game.bind_ar.msgbox.was_bond.title'),
          msg:
            t('my.game.bind_ar.msgbox.was_bond.msg', {
              0: userStore?.userInfo?.bind_ar?.third_open_id,
            }) +
            '\n\n' +
            t('my.game.bind_ar.msgbox.change_bind.confirm_msg'),
          cancelButtonText: t('common.cancel'),
          confirmButtonText: t('common.confirm'),
        })
        .then(() => {
          showBindArPrompt()
            .then((resp) => {
              doBindArGame(resp.value)
            })
            .catch((error) => {
              console.log(error)
            })
        })
        .catch(() => {})
    } else {
      // 已绑定但不允许换绑：仅提示已绑定信息
      message2.alert({
        title: t('my.game.bind_ar.msgbox.was_bond.title'),
        msg: t('my.game.bind_ar.msgbox.was_bond.msg', {
          0: userStore?.userInfo?.bind_ar?.third_open_id,
        }),
      })
    }
  } else {
    // 未绑定：直接弹出输入框
    showBindArPrompt()
      .then((resp) => {
        doBindArGame(resp.value)
      })
      .catch((error) => {
        console.log(error)
      })
  }
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
/* 修改下拉刷新加载中的圆圈颜色 */
:deep(.uni-scroll-view-refresh__spinner > circle) {
  color: #ff6b03 !important;
}
/* 修改下拉箭头的颜色 */
:deep(.uni-scroll-view-refresh-inner > svg) {
  fill: #ff6b03 !important;
}
:deep() {
  .wd-message-box__content {
    text-align: left;
    white-space: pre-line;
  }
}

.pageMy {
  height: calc(100vh - 120rpx);
  padding-bottom: 120rpx;
  background-color: var(--liberty-cats-page-background-color);
}
.headBox {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 98;
  height: 360rpx;
  padding-right: 48rpx;
  padding-left: 48rpx;
  padding-top: 48rpx;
  background: linear-gradient(329deg, #ff6b03 0%, #ee941a 100%);
  .kf {
    position: absolute;
    top: 36rpx;
    right: 32rpx;
    width: 48rpx;
    height: 48rpx;
    background-image: url('~@/static/images/kf.png');
    background-repeat: no-repeat;
    background-position: 100%;
    background-size: 100%;
  }
  .headCnt {
    display: flex;
    align-items: center;
    justify-content: start;
    width: 100%;
    height: 100%;
    //background-color: green;

    .avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 176rpx;
      height: 176rpx;
      overflow: hidden;
      background-color: #ffffff;
      border-radius: 50%;
      image {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
    }
    .info {
      margin-left: 32rpx;
      flex: 1;
      .name {
        font-size: 48rpx;
        font-style: normal;
        font-weight: 600;
        line-height: 56rpx;
        color: #ffffff;
      }
      .asset-resps {
        display: flex !important;
        justify-content: flex-start;
        gap: 32rpx;
        flex-wrap: nowrap;
        width: 100%;
      }
      .points {
        font-size: 24rpx;
        font-style: normal;
        line-height: 56rpx;
        color: #ffffff;
        display: flex;
        align-items: center;
        .amount {
          margin: 0 12rpx;
          font-weight: 600;
        }
        .unit {
          font-weight: 600;
        }
        .label {
          // margin-left: 12rpx;
        }
      }
      .connect {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 220rpx;
        height: 40rpx;
        margin-top: 16rpx;
        font-size: 24rpx;
        font-style: normal;
        font-weight: 500;
        line-height: 28rpx;
        color: #ffef6c;
        border: 2rpx solid #ffef6c;
        border-radius: 20rpx;
      }
      .level {
        height: 56rpx;
        margin: 8rpx 0;
        image {
          width: 100%;
          height: 100%;
        }
      }

      .level1 {
        width: 112rpx;
      }
      .level2 {
        width: 202rpx;
      }
      .level3 {
        width: 182rpx;
      }
      .level4 {
        width: 248rpx;
      }

      .point {
        font-size: 24rpx;
        font-style: normal;
        font-weight: 400;
        line-height: 28rpx;
        color: #ffffff;
        text {
          font-weight: 600;
        }
      }

      .gameIconBox {
        display: flex;
        align-items: center;
        margin-top: 16rpx;
        .gmAr {
          width: 42rpx;
          height: 42rpx;
          background-image: url('~@/static/images/game.png');
          background-repeat: no-repeat;
          background-position: 100%;
          background-size: 100%;
        }
        .gmAr.on {
          background-image: url('~@/static/images/game1.png');
        }
      }
    }
  }
}

.cnt {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 98;

  margin-top: -18rpx;
  background-color: var(--liberty-cats-page-background-color);
  border-radius: var(--liberty-cats-page-border-radius) var(--liberty-cats-page-border-radius) 0 0;
  .scrollBox {
    width: 100%;
    height: calc(100% - 20rpx);
    padding-top: 20rpx;
    .scrollCnt {
      padding: 20rpx 40rpx 120rpx 40rpx;
    }

    // NFT
    .NftBox {
      padding: 28rpx 32rpx;
      margin-bottom: 24rpx;
      background-color: #ffffff;
      border-radius: 40rpx;

      .titleBox {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;

        .titleRight {
          padding: 5rpx 26rpx;
          font-size: 28rpx;
          font-style: normal;
          font-weight: 600;
          color: #ffffff;
          background: #ff6b03;
          border-radius: 8rpx 10rpx 8rpx 8rpx;
        }

        .titleLeft {
          display: flex;
          align-items: center;

          .icon2 {
            width: 40rpx;
            height: 40rpx;
            margin-right: 16rpx;
            .iconImg {
              width: 100%;
              height: 100%;
              margin-top: -10rpx;
            }
          }

          .refresh {
            width: 36rpx;
            height: 36rpx;
            margin-left: 16rpx;
            cursor: pointer;
          }
        }

        .nftTitle {
          font-size: 32rpx;
          font-style: normal;
          font-weight: 500;
          color: #261000;
        }

        .title {
          font-size: 36rpx;
          font-style: normal;
          font-weight: 500;
          line-height: 42rpx;
          color: #261000;
        }
      }
      .nftConnect {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10rpx 20rpx;

        margin-top: 40rpx;

        font-size: 20rpx;
        font-style: normal;
        font-weight: 500;
        line-height: 38rpx;
        color: #ff6b03;
        border: 2rpx solid #ff6b03;
        border-radius: 44rpx;
      }

      .nftList {
        .nftItem {
          display: inline-block;
          width: 128rpx;
          height: 174rpx;
          margin-top: 40rpx;
          margin-right: 30rpx;
          .nftImg {
            width: 128rpx;
            height: 128rpx;
            overflow: hidden;
            border-radius: 20rpx;
            .nft {
              width: 100%;
              height: 100%;
              border-radius: 20rpx;
            }
          }
          .nftTitle {
            height: 30rpx;
            margin-top: 16rpx;
            font-size: 24rpx;
            font-style: normal;
            font-weight: 400;
            line-height: 28rpx;
            color: #000000;
            text-align: center;
          }
        }
        .nftItem:nth-child(4n) {
          margin-right: 0;
        }
      }

      .nftOp {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 32rpx;
        margin-top: 24rpx;
        .opBtn {
          width: 32rpx;
          height: 32rpx;
          image {
            width: 100%;
            height: 100%;
          }
        }
      }
      // 新增：当 showNftMoreOnOff 为 true 时，箭头图片旋转180度
      .opBtn.up image {
        transform: rotate(180deg);
      }
    }

    // NFT end

    // checkin start
    .checkinBox {
      padding: 28rpx 0;
      margin-bottom: 24rpx;
      background-color: #ffffff;
      border-radius: 40rpx;

      .titleBox {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: calc(100% - 64rpx);
        padding: 0 32rpx;

        .titleRight {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 28rpx;
          padding: 10rpx 16rpx;

          font-size: 24rpx;
          font-style: normal;
          font-weight: 600;
          line-height: 28rpx;
          color: #999;
          text-align: center;
          background: #f3f3f4;
          border-radius: 24rpx;
        }

        .titleRight.active {
          color: #ffffff;
          background: #ff6b03;
        }

        .titleLeft {
          .checkinDays {
            font-size: 28rpx;
            font-weight: 600;
            color: #ff6b03;
          }
        }

        .title {
          font-size: 28rpx;
          font-style: normal;
          font-weight: 500;
          line-height: 33rpx;
          color: #261000;
        }
      }

      .checkinCnt {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: calc(100% - 16rpx);
        padding: 0 8rpx;
        margin-top: 20rpx;

        .scrollOp {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16rpx;
          height: 100rpx;
          //background-color: green;
          .opl,
          .opr {
            width: 8rpx;
            height: 24rpx;
            margin-top: -40rpx;
            background-image: url('~@/static/images/scroll-jt.png');
            background-repeat: no-repeat;
            background-position: 100%;
            background-size: 100%;
          }
          .opl {
            transform: rotateY(180deg);
          }
        }

        .checkinDateBox {
          display: flex;
          align-items: center;
          justify-content: start;
          width: calc(100% - 64rpx - 8rpx);
          height: 148rpx;
          margin: 0 4rpx;
          //background-color: red;
          .checkinDateItem {
            width: 72rpx;
            height: 148rpx;
            margin-right: 16rpx;
            //background-color: blue;
            .pointBox {
              width: 40rpx;
              height: 74rpx;
              padding: 16rpx;
              background: #f9f9f9;
              border-radius: 16rpx;

              .point {
                height: 24rpx;
                font-size: 20rpx;
                font-style: normal;
                font-weight: 50 0;
                line-height: 23rpx;
                color: rgba(38, 16, 0, 0.2);
                text-align: center;
              }

              .gift {
                width: 42rpx;
                height: 50rpx;
                background-image: url('~@/static/images/checkin1.png');
                background-repeat: no-repeat;
                background-position: 100%;
                background-size: cover;
              }
            }

            .date {
              width: 72rpx;
              height: 30rpx;
              margin-top: 12rpx;
              font-size: 24rpx;
              font-style: normal;
              font-weight: 500;
              line-height: 28rpx;
              color: rgba(38, 16, 0, 0.3);
              text-align: center;
            }
          }
        }
        .checkinDateItem.active {
          .pointBox {
            width: 36rpx;
            height: 70rpx;
            background: #fffaf8;
            border: 2rpx solid #ff6b03;
            .gift {
              background-image: url('~@/static/images/checkin2.png');
            }
            .point {
              color: #ff6b03;
            }
          }
          .date {
            color: #ff6b03;
          }
        }
      }
    }
    // checkin end
  }
}
:deep(.myMessageBox) {
  .wd-overlay {
    z-index: 999;
  }
}
.version-number {
  margin-top: 32rpx;
  font-size: 28rpx;
  color: #ddd;
  text-align: center;
}

:deep(.table-level-icon) {
  height: 56rpx;
  .table-level-img {
    height: 100% !important;
  }
}

:deep(.memberLevelTable) {
  .wd-table__cell {
    min-height: 50rpx;
    padding: 0;
  }
  .wd-table__header {
    height: 60rpx;
  }
}

.assetBox {
  display: flex;
  justify-content: space-between;
  padding-top: 24rpx;
  .assetItem {
    display: flex;
    flex-direction: column;
    width: 131rpx;
    height: 74rpx;
    padding: 16rpx;
    background-color: #f9f9f9;
    border-radius: 16rpx;

    .amountBox {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      .amount {
        font-size: 28rpx;
        font-style: normal;
        font-weight: 600;
        color: #261000;
        text-align: left;
      }
      .unit {
        margin-left: 4rpx;
        font-size: 20rpx;
        font-style: normal;
        font-weight: 400;
        line-height: 24rpx;
        color: #999999;
      }
    }
    .labelBox {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8rpx;

      .leftBox {
        display: flex;
        align-items: center;
        justify-content: flex-start;
      }

      .assetIcon {
        width: 32rpx;
        height: 32rpx;
        margin-right: 8rpx;
      }

      .assetPoint {
        background-image: url('~@/static/images/point@2x.png');
        background-repeat: no-repeat;
        background-position: 100%;
        background-size: cover;
      }

      .assetPledgePoint {
        background-image: url('~@/static/images/pledge_point@2x.png');
        background-repeat: no-repeat;
        background-position: 100%;
        background-size: cover;
      }

      .assetccPoint {
        background-image: url('~@/static/images/cc@2x.png');
        background-repeat: no-repeat;
        background-position: 100%;
        background-size: cover;
      }

      .label {
        font-size: 24rpx;
        font-style: normal;
        font-weight: 500;
        color: rgba(38, 16, 0, 0.6);
        text-align: left;
      }

      .moreIcon {
        width: 24rpx;
        height: 24rpx;
        background-image: url('~@/static/images/arrow2@2x.png');
        background-repeat: no-repeat;
        background-position: 100%;
        background-size: cover;
      }
    }
  }
  .assetItem:nth-child(3) {
    width: 216rpx;
  }
}
</style>

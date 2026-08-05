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
    <custom-nav :title="t('membership.benefits.page_title')" page-background-color="#f7f6f4">
      <template #default>
        <view class="benefitsPage">
          <view class="pageIntro">{{ t('membership.benefits.subtitle') }}</view>

          <!-- 我的资格 -->
          <view class="card" v-if="userStore.isLogin">
            <view class="cardTitle">{{ t('membership.benefits.status.title') }}</view>
            <view class="statusRow">
              <view class="statusItem">
                <view class="statusName">{{ t('membership.benefits.status.subscription') }}</view>
                <view class="statusValue" :class="{ on: eligibility.subscription.active }">
                  {{
                    eligibility.subscription.active
                      ? t('membership.benefits.status.active')
                      : t('membership.benefits.status.inactive')
                  }}
                </view>
              </view>
              <view class="statusItem">
                <view class="statusName">{{ t('membership.benefits.status.holder') }}</view>
                <view class="statusValue" :class="{ on: eligibility.nft.active }">
                  {{
                    eligibility.nft.active
                      ? t('membership.benefits.status.active')
                      : t('membership.benefits.status.inactive')
                  }}
                </view>
              </view>
            </view>
          </view>

          <!-- 两种资格来源 -->
          <view class="card">
            <view class="cardTitle">{{ t('membership.benefits.source.title') }}</view>
            <view class="sourceItem">
              <view class="sourceName">{{ t('membership.unlock.subscribe.name') }}</view>
              <view class="sourceDesc">
                {{ t('membership.benefits.source.subscription.desc') }}
              </view>
            </view>
            <view class="sourceItem">
              <view class="sourceName">{{ t('membership.unlock.nft.name') }}</view>
              <view class="sourceDesc">{{ t('membership.benefits.source.holder.desc') }}</view>
            </view>
            <view class="channelNote">{{ t('membership.benefits.channel.desc') }}</view>
          </view>

          <!-- 权益与资格对照 -->
          <view class="card">
            <view class="cardTitle">{{ t('membership.benefits.list_title') }}</view>
            <view class="tableHead">
              <view class="colName"></view>
              <view class="colFlag">{{ t('membership.benefits.col.subscription') }}</view>
              <view class="colFlag">{{ t('membership.benefits.col.holder') }}</view>
            </view>
            <view class="tableRow" v-for="item in MEMBERSHIP_BENEFITS" :key="item.key">
              <view class="colName">
                <view class="benefitName">{{ t(`membership.benefits.item.${item.key}`) }}</view>
                <view class="benefitDesc">
                  {{ t(`membership.benefits.item.${item.key}.desc`) }}
                </view>
              </view>
              <view class="colFlag">
                <wd-icon
                  :name="item.subscription ? 'check' : 'close'"
                  size="16px"
                  :color="item.subscription ? '#ff6b03' : 'rgba(38,16,0,0.25)'"
                />
              </view>
              <view class="colFlag">
                <wd-icon
                  :name="item.holder ? 'check' : 'close'"
                  size="16px"
                  :color="item.holder ? '#ff6b03' : 'rgba(38,16,0,0.25)'"
                />
              </view>
            </view>
            <view class="holderTip">{{ t('membership.benefits.holder_only_tip') }}</view>
          </view>

          <view class="pageOps">
            <view class="primaryBtn" @click="openUnlock">
              {{ t('membership.benefits.cta.unlock') }}
            </view>
          </view>
        </view>
      </template>
    </custom-nav>

    <MembershipUnlockPopup
      v-model="unlockVisible"
      :scene="unlockScene"
      @unlocked="handleUnlocked"
    />
  </view>
</template>

<script lang="ts" setup>
import { onMounted } from 'vue'
import { t } from '@/locale/index'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import MembershipUnlockPopup from '@/components/MembershipUnlock/MembershipUnlockPopup.vue'
import {
  MEMBERSHIP_BENEFITS,
  useMembershipEligibility,
  useMembershipUnlock,
} from '@/hooks/useMembership'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const { eligibility, load } = useMembershipEligibility()
const { visible: unlockVisible, scene: unlockScene, open, handleUnlocked } = useMembershipUnlock()

const openUnlock = () => {
  open('nft_holder')
}

onMounted(() => {
  if (userStore.isLogin) load()
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.benefitsPage {
  padding: 0 32rpx 60rpx;
}

.pageIntro {
  padding: 24rpx 8rpx 32rpx;
  font-size: 24rpx;
  line-height: 36rpx;
  color: rgba(38, 16, 0, 0.6);
}

.card {
  padding: 32rpx;
  margin-bottom: 24rpx;
  background-color: #ffffff;
  border-radius: 40rpx;

  .cardTitle {
    margin-bottom: 24rpx;
    font-size: 32rpx;
    font-weight: 500;
    color: #261000;
  }
}

.statusRow {
  display: flex;
  align-items: center;

  .statusItem {
    flex: 1;
  }

  .statusName {
    font-size: 24rpx;
    color: rgba(38, 16, 0, 0.5);
  }

  .statusValue {
    margin-top: 8rpx;
    font-size: 28rpx;
    font-weight: 500;
    color: rgba(38, 16, 0, 0.45);
  }

  .statusValue.on {
    color: #ff6b03;
  }
}

.sourceItem {
  padding: 24rpx;
  margin-bottom: 16rpx;
  background-color: #faf8f5;
  border-radius: 24rpx;

  .sourceName {
    font-size: 28rpx;
    font-weight: 500;
    color: #261000;
  }

  .sourceDesc {
    margin-top: 8rpx;
    font-size: 24rpx;
    line-height: 34rpx;
    color: rgba(38, 16, 0, 0.6);
  }
}

.channelNote {
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 32rpx;
  color: rgba(38, 16, 0, 0.45);
}

.tableHead,
.tableRow {
  display: flex;
  align-items: center;
}

.tableHead {
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid rgba(38, 16, 0, 0.06);

  .colFlag {
    font-size: 22rpx;
    color: rgba(38, 16, 0, 0.5);
  }
}

.tableRow {
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgba(38, 16, 0, 0.04);
}

.colName {
  flex: 1;
  min-width: 0;
}

.colFlag {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 140rpx;
  text-align: center;
}

.benefitName {
  font-size: 28rpx;
  color: #261000;
}

.benefitDesc {
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 32rpx;
  color: rgba(38, 16, 0, 0.45);
}

.holderTip {
  margin-top: 24rpx;
  font-size: 22rpx;
  line-height: 32rpx;
  color: #b25f00;
}

.pageOps {
  margin-top: 8rpx;
}

.primaryBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  font-size: 30rpx;
  font-weight: 500;
  color: #ffffff;
  background: linear-gradient(329deg, #ff6b03 0%, #ee941a 100%);
  border-radius: 44rpx;
}
</style>

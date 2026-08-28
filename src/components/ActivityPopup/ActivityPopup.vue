<template>
  <view v-if="visible" class="activity-popup-mask" :style="{ zIndex }" @click="handleMaskClick">
    <view class="activity-popup" @click.stop>
      <view class="activity-popup__card-wrap">
        <view class="activity-popup__back"></view>

        <!-- 富文本内容展示 -->
        <template v-if="popupRichContent">
          <view class="activity-popup__front activity-popup__rich">
            <view v-if="popupTitle" class="activity-popup__rich-title">{{ popupTitle }}</view>
            <rich-text :nodes="popupRichContent" class="activity-popup__rich-content" />
          </view>
        </template>

        <!-- 图片内容展示 -->
        <template v-else>
          <swiper
            v-if="popupMedia.length > 1"
            class="activity-popup__swiper"
            :current="current"
            :circular="false"
            @change="handleSwiperChange"
          >
            <swiper-item v-for="(item, index) in popupMedia" :key="index">
              <view class="activity-popup__front activity-popup__image-content">
                <wd-img
                  v-if="item.url"
                  custom-class="activity-popup__image"
                  mode="widthFix"
                  width="42vw"
                  :src="item.url"
                />
                <view v-if="popupTitle" class="activity-popup__title">{{ popupTitle }}</view>
                <view v-if="popupSubtitle" class="activity-popup__subtitle">
                  {{ popupSubtitle }}
                </view>
                <!-- <view class="activity-popup__rules-link" @click.stop="handleRulesClick">
                  查看完整活动规则 ›
                </view> -->
              </view>
            </swiper-item>
          </swiper>

          <view v-else class="activity-popup__front activity-popup__image-content">
            <wd-img
              v-if="popupMedia[0]?.url"
              custom-class="activity-popup__image"
              mode="widthFix"
              width="42vw"
              :src="
                popupMedia[0]?.url ||
                'https://liberycats.oss-accelerate.aliyuncs.com/social/20260812/6660_1786511533285_kavlzmzs_2a1e2b14-613c-4954-abf3-cf8c78b45134gift-box-3d.png?x-oss-process=style/sqdt'
              "
            />

            <view v-if="popupTitle" class="activity-popup__title">{{ popupTitle }}</view>
            <view v-if="popupSubtitle" class="activity-popup__subtitle">
              {{ popupSubtitle }}
            </view>
            <!-- <view class="activity-popup__rules-link" @click.stop="handleRulesClick">
              查看完整活动规则 ›
            </view> -->
          </view>

          <view v-if="popupMedia.length > 1" class="activity-popup__dots">
            <view
              v-for="(_, index) in popupMedia"
              :key="index"
              class="activity-popup__dot"
              :class="{ 'activity-popup__dot--active': current === index }"
            ></view>
          </view>
        </template>
      </view>

      <button
        class="activity-popup__action"
        hover-class="activity-popup__action--pressed"
        @click="handleAction"
      >
        {{ popupButtonText }}
      </button>
      <button
        class="activity-popup__no-remind"
        hover-class="activity-popup__no-remind--pressed"
        @click="handleNeverRemind"
      >
        {{ popupNoRemindButtonText }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import type { PopupTarget, PopupCurrentData, PopupMediaItem } from '@/service/api/popup'
import { openUrl } from '@/utils'
import { t } from '@/locale'
import { useUserStore } from '@/store/user'
import { setNativeOverlayVisible } from '@/utils/nativeOverlayState'

type ActivityPopupImageShape = 'circle' | 'square'

const props = withDefaults(
  defineProps<{
    imageShape?: ActivityPopupImageShape
    closeOnClickMask?: boolean
    zIndex?: number
  }>(),
  {
    imageShape: 'circle',
    closeOnClickMask: false,
    zIndex: 10000,
  },
)
const userStore = useUserStore()

const visible = ref(false)

watch(
  visible,
  (isVisible) => {
    setNativeOverlayVisible(isVisible)
  },
  { flush: 'sync' },
)

onUnmounted(() => {
  if (visible.value) setNativeOverlayVisible(false)
})
const current = ref(0)
const popupMedia = ref<PopupMediaItem[]>([])
const popupTitle = ref('')
const popupSubtitle = ref('')
const popupRichContent = ref('')
const popupButtonText = ref(t('common.btn.got_it'))
const popupNoRemindButtonText = ref(t('activityPopup.no_remind'))
const popupId = ref<number | string>('')
const popupFrequency = ref<'once' | 'daily' | 'every_entry'>('every_entry')
const popupTarget = ref<PopupTarget | null>(null)

const ACTIVITY_CACHE_KEY = 'activity_popup_clicked'
const ACTIVITY_DAILY_KEY = 'activity_popup_daily'
const ACTIVITY_NEVER_REMIND_KEY = 'activity_popup_never_remind_v2'

type ActivityCache = Record<string, boolean>

/** 不同登录用户分别保存；未登录状态使用独立访客标识。 */
const getNeverRemindCacheKey = (activityId: number | string) => {
  const userId = userStore.userInfo?.member_id || 'guest'
  return `${userId}:${activityId}`
}

/** 用户主动设置当前活动不再提醒 */
const isActivityNeverRemind = (id: number | string) => {
  const cache = (uni.getStorageSync(ACTIVITY_NEVER_REMIND_KEY) || {}) as ActivityCache
  return cache[getNeverRemindCacheKey(id)] === true
}

const markActivityNeverRemind = (id: number | string) => {
  const cache = (uni.getStorageSync(ACTIVITY_NEVER_REMIND_KEY) || {}) as ActivityCache
  cache[getNeverRemindCacheKey(id)] = true
  uni.setStorageSync(ACTIVITY_NEVER_REMIND_KEY, cache)
}

/** 获取当天日期字符串 */
const getToday = () => {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

/** once 模式：检查活动是否已点击过 */
const isActivityClicked = (id: number | string) => {
  const cache = uni.getStorageSync(ACTIVITY_CACHE_KEY) || {}
  return cache[id] === true
}

/** 记录活动已点击（once 模式） */
const markActivityClicked = (id: number | string) => {
  const cache = uni.getStorageSync(ACTIVITY_CACHE_KEY) || {}
  cache[id] = true
  uni.setStorageSync(ACTIVITY_CACHE_KEY, cache)
}

/** daily 模式：检查是否在冷却期内（24小时） */
const DAILY_INTERVAL = 24 * 60 * 60 * 1000
const isActivityShownToday = (id: number | string) => {
  const cache = uni.getStorageSync(ACTIVITY_DAILY_KEY) || {}
  const lastShown = cache[id]
  if (!lastShown) return false
  return Date.now() - lastShown < DAILY_INTERVAL
}

/** 记录已展示（daily 模式） */
const markActivityShownToday = (id: number | string) => {
  const cache = uni.getStorageSync(ACTIVITY_DAILY_KEY) || {}
  cache[id] = Date.now()
  uni.setStorageSync(ACTIVITY_DAILY_KEY, cache)
}

/** 根据 target.type 跳转 */
const navigateByTarget = (target: PopupTarget) => {
  const params = target.params
  const query = params
    ? '&' +
      Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')
    : ''
  switch (target.type) {
    case 'none':
      break
    case 'post':
      uni.navigateTo({ url: `/pages/cats/social/detail?id=${target.id}${query}` })
      break
    case 'comment':
      uni.navigateTo({ url: `/pages/cats/social/detail?id=${target.id}&showComment=true${query}` })
      break
    case 'member':
      uni.navigateTo({ url: `/pages/cats/user/home?member_id=${target.id}${query}` })
      break
    case 'external_url':
      if (target.url) openUrl(target.url)
      break
    case 'agreement':
      uni.navigateTo({ url: `/pages/cats/agreement/detail?id=${target.id}${query}` })
      break
  }
}

/** 点击按钮关闭弹窗并跳转 */
const handleAction = () => {
  if (popupFrequency.value === 'once' && popupId.value) {
    markActivityClicked(popupId.value)
  }
  if (popupFrequency.value === 'daily' && popupId.value) {
    markActivityShownToday(popupId.value)
  }
  visible.value = false
  if (popupTarget.value) {
    navigateByTarget(popupTarget.value)
  }
}

const handleRulesClick = () => {
  emit('rules', popupId.value)
}

const handleNeverRemind = () => {
  if (!popupId.value) return
  markActivityNeverRemind(popupId.value)
  visible.value = false
  emit('dismiss', popupId.value)
}

function handleMaskClick() {
  if (props.closeOnClickMask) {
    visible.value = false
  }
}

function handleSwiperChange(e: any) {
  current.value = e.detail.current
}

/** 接收数据并展示 */
const show = (data: PopupCurrentData, force = false) => {
  // 用户主动设置过“不再提醒”，优先于后端展示频率
  if (isActivityNeverRemind(data.id)) {
    return
  }
  // 从后台回到前台时按产品要求重新展示；冷启动仍遵循接口频率。
  if (!force) {
    // once 模式：已点击过则不展示
    if (data.display_frequency === 'once' && isActivityClicked(data.id)) {
      return
    }
    // daily 模式：当天已展示过则不展示
    if (data.display_frequency === 'daily' && isActivityShownToday(data.id)) {
      return
    }
  }
  popupId.value = data.id
  popupFrequency.value = data.display_frequency
  popupTarget.value = data.target
  popupMedia.value = data.media || []
  current.value = 0
  popupTitle.value = data.title || ''
  popupSubtitle.value = data.subtitle || ''
  popupRichContent.value = data.rich_content || ''
  popupButtonText.value = data.button_text || t('common.btn.got_it')
  visible.value = true
}

const emit = defineEmits<{
  rules: [id: number | string]
  dismiss: [id: number | string]
}>()

defineExpose({ show })
</script>

<style lang="scss" scoped>
.activity-popup-mask {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  font-family: 'Alibaba PuHuiTi2', 'PingFang SC', sans-serif;
  background: rgba(83, 52, 4, 0.72);
  backdrop-filter: blur(6rpx);
}

.activity-popup-mask,
.activity-popup-mask view,
.activity-popup-mask image,
.activity-popup-mask swiper,
.activity-popup-mask swiper-item,
.activity-popup-mask button {
  box-sizing: border-box;
}

.activity-popup {
  position: relative;
  width: 660rpx;
  max-width: 100%;
  animation: activity-popup-in 0.3s cubic-bezier(0.2, 0.9, 0.2, 1.12);
}

.activity-popup__card-wrap {
  position: relative;
  width: 660rpx;
  max-width: 100%;
  height: 544rpx;
}

.activity-popup__back,
.activity-popup__front {
  position: absolute;
  top: 54rpx;
  left: 50%;
  width: 580rpx;
  z-index: 9999; /* 确保高于 WebView */
  height: 456rpx;
  border-radius: 56rpx;
}

.activity-popup__back {
  z-index: 9997; /* 后层 */
  background: #ff6b03;
  box-shadow: 0 36rpx 84rpx rgba(170, 69, 0, 0.24);
  transform: translate(-50%, 12rpx) rotate(8deg);
  transform-origin: center;
}

.activity-popup__front {
  z-index: 9998; /* 前层 */
  overflow: hidden;
  background: linear-gradient(160deg, #f8eedc 0%, #fffefd 100%);
  box-shadow: 0 24rpx 56rpx rgba(51, 94, 30, 0.14);
  transform: translateX(-50%);
}

.activity-popup__swiper {
  position: absolute;
  inset: 0;
  z-index: 9996;
  width: 100%;
  height: 100%;
}

.activity-popup__image-content {
  display: flex;
  width: 580rpx;
  height: 456rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx 36rpx;
  text-align: center;
}

.activity-popup__image {
  width: 264rpx;
  height: 264rpx;
  flex: 0 0 264rpx;
  margin-bottom: 24rpx;
  // background: #fff;
  // box-shadow: 0 16rpx 36rpx rgba(170, 69, 0, 0.18);
}

.activity-popup__image--circle {
  // border: 8rpx solid rgba(255, 255, 255, 0.88);
  // border-radius: 50%;
}

.activity-popup__image--square {
  width: 508rpx;
  border-radius: 36rpx;
}

.activity-popup__title {
  max-width: 100%;
  font-size: calc(44rpx * var(--font-scale));
  font-weight: 900;
  line-height: 1.12;
  color: #17120f;
  word-break: break-all;
}

.activity-popup__subtitle {
  max-width: 100%;
  margin-top: 18rpx;
  font-size: calc(30rpx * var(--font-scale));
  font-weight: 750;
  line-height: 1.3;
  color: #e95800;
  word-break: break-all;
}

.activity-popup__rules-link {
  margin-top: 14rpx;
  font-size: calc(22rpx * var(--font-scale));
  font-weight: 750;
  line-height: 1.3;
  color: #e95800;
  text-decoration: underline;
  text-underline-offset: 5rpx;
}

.activity-popup__rich {
  padding: 36rpx 48rpx;
  text-align: left;
}

.activity-popup__rich-title {
  margin-bottom: 24rpx;
  font-size: calc(40rpx * var(--font-scale));
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-primary);
}

.activity-popup__rich-content {
  display: block;
  overflow: hidden;
  font-size: calc(28rpx * var(--font-scale));
  line-height: 1.8;
  color: #725e51;
}

.activity-popup__dots {
  position: absolute;
  bottom: 28rpx;
  left: 50%;
  z-index: 10000;
  display: flex;
  gap: 12rpx;
  align-items: center;
  transform: translateX(-50%);
}

.activity-popup__dot {
  width: 12rpx;
  height: 12rpx;
  background: rgba(233, 88, 0, 0.25);
  border-radius: 999rpx;
  transition: width 0.2s ease;
}

.activity-popup__dot--active {
  width: 36rpx;
  background: #ff6b03;
}

.activity-popup__action {
  display: flex;
  width: 72%;
  height: 96rpx;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 48rpx auto 0;
  font-family: inherit;
  font-size: calc(30rpx * var(--font-scale));
  font-weight: 850;
  line-height: calc(96rpx * var(--font-scale));
  color: var(--bg-card);
  background: #ff6b03;
  border: 0;
  border-radius: 999rpx;
  box-shadow: 0 16rpx 40rpx rgba(170, 69, 0, 0.24);
}

.activity-popup__action::after {
  border: 0;
}

.activity-popup__action--pressed {
  transform: scale(0.98);
}

.activity-popup__no-remind {
  display: flex;
  min-width: 300rpx;
  height: 68rpx;
  align-items: center;
  justify-content: center;
  padding: 0 32rpx;
  margin: 20rpx auto 0;
  font-family: inherit;
  font-size: calc(24rpx * var(--font-scale));
  font-weight: 650;
  line-height: calc(68rpx * var(--font-scale));
  color: var(--activity-popup-no-remind-color);
  text-decoration: underline;
  text-underline-offset: 6rpx;
  background: rgba(255, 255, 255, 0.1);
  border: 2rpx solid rgba(255, 255, 255, 0.28);
  border-radius: 999rpx;
  backdrop-filter: blur(12rpx);
  width: 65%;
}

.activity-popup__no-remind::after {
  border: 0;
}

.activity-popup__no-remind--pressed {
  opacity: 0.72;
}

@keyframes activity-popup-in {
  from {
    opacity: 0;
    transform: translateY(36rpx) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>

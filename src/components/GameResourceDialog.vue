<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/locale/index'

type ResourceLoadState = 'idle' | 'loading' | 'ready' | 'failed'

const props = defineProps<{
  modelValue: boolean
  state: ResourceLoadState
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'retry'): void
  (event: 'enter'): void
}>()

const isLoading = computed(() => props.state !== 'ready' && props.state !== 'failed')
const dialogTitle = computed(() => {
  if (props.state === 'ready') return t('game.resource.dialog.title.ready')
  if (props.state === 'failed') return t('game.resource.dialog.title.failed')
  return t('game.resource.dialog.title.loading')
})
const close = () => emit('update:modelValue', false)
</script>

<template>
  <view v-if="modelValue" class="resource-dialog-mask">
    <view class="resource-dialog">
      <view class="resource-dialog-close" @click="close">
        <wd-icon name="close" size="22px" color="#7f7f7f" />
      </view>

      <view class="resource-dialog-status">
        <view v-if="isLoading" class="resource-dialog-spinner" />
        <wd-icon
          v-else-if="state === 'ready'"
          name="check-circle-filled"
          size="58rpx"
          color="#35b779"
        />
        <wd-icon v-else name="warning" size="58rpx" color="#ff6b03" />
      </view>

      <view class="resource-dialog-title">{{ dialogTitle }}</view>

      <template v-if="isLoading">
        <view class="resource-dialog-description">
          <text>{{ t('game.resource.dialog.first_download') }}</text>
          <text>{{ t('game.resource.dialog.estimated_time_prefix') }}</text>
          <text class="resource-dialog-highlight">
            {{ t('game.resource.dialog.estimated_time') }}
          </text>
          <text>{{ t('game.resource.dialog.estimated_time_suffix') }}</text>
          <text class="resource-dialog-description-line">
            {{ t('game.resource.dialog.please_wait') }}
          </text>
        </view>

        <view class="resource-dialog-network">{{ t('game.resource.dialog.network_tip') }}</view>

        <view class="resource-dialog-notice">
          <wd-icon name="warning" size="34rpx" color="#ff6b03" />
          <view class="resource-dialog-notice-text">
            <text>{{ t('game.resource.dialog.notice_prefix') }}</text>
            <text class="resource-dialog-highlight">
              {{ t('game.resource.dialog.notice_highlight') }}
            </text>
            <text class="resource-dialog-notice-line">
              {{ t('game.resource.dialog.notice_suffix') }}
            </text>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="resource-dialog-result">
          {{
            state === 'ready'
              ? t('game.resource.dialog.content.ready')
              : t('game.resource.dialog.content.failed')
          }}
        </view>
        <view v-if="state === 'ready'" class="resource-dialog-action" @click="emit('enter')">
          {{ t('game.resource.dialog.enter') }}
        </view>
        <view v-else class="resource-dialog-action" @click="emit('retry')">
          {{ t('game.resource.dialog.retry') }}
        </view>
      </template>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.resource-dialog-mask {
  position: fixed;
  z-index: 9999;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  background: var(--black-42);
}

.resource-dialog {
  position: relative;
  box-sizing: border-box;
  width: 620rpx;
  padding: 58rpx 40rpx 34rpx;
  overflow: hidden;
  text-align: center;
  background: var(--bg-card);
  border-radius: 34rpx;
  box-shadow: 0 24rpx 80rpx rgba(35, 20, 10, 0.18);
}

.resource-dialog-close {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
}

.resource-dialog-status {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
}

.resource-dialog-spinner {
  box-sizing: border-box;
  width: 58rpx;
  height: 58rpx;
  border: 6rpx solid #ffe1ce;
  border-top-color: #ff6b03;
  border-radius: 50%;
  animation: resource-dialog-spin 0.9s linear infinite;
}

.resource-dialog-title {
  margin-top: 30rpx;
  font-size: calc(38rpx * var(--font-scale));
  font-weight: 700;
  line-height: 1.4;
  color: var(--actions-text);
}

.resource-dialog-description {
  margin-top: 22rpx;
  font-size: calc(27rpx * var(--font-scale));
  line-height: 1.65;
  color: var(--chat-user-name-color);
}

.resource-dialog-description-line,
.resource-dialog-notice-line {
  display: block;
}

.resource-dialog-highlight {
  font-weight: 600;
  color: #ff6b03;
}

.resource-dialog-network {
  margin-top: 20rpx;
  padding: 0 30rpx;
  font-size: calc(24rpx * var(--font-scale));
  line-height: 1.6;
  color: var(--text-secondary);
}

.resource-dialog-notice {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 12rpx;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid var(--resource-dialog-notice-border-color);
}

.resource-dialog-notice-text {
  font-size: calc(23rpx * var(--font-scale));
  line-height: 1.55;
  color: var(--chat-user-name-color);
  text-align: left;
}

.resource-dialog-result {
  padding: 22rpx 20rpx 36rpx;
  font-size: calc(28rpx * var(--font-scale));
  line-height: 1.6;
  color: var(--chat-user-name-color);
}

.resource-dialog-action {
  padding: 22rpx 20rpx 0;
  font-size: calc(30rpx * var(--font-scale));
  font-weight: 600;
  color: #ff6b03;
  border-top: 1rpx solid var(--resource-dialog-notice-border-color);
}

@keyframes resource-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

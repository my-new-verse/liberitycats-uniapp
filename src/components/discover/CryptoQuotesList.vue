<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { getQuotesItemResponse } from '@/service/api/quotes'
import { t } from '@/locale'
import { getImageUrl } from '@/utils'
import { getStoredFontScale, resolveFontScale } from '@/utils/fontScale'
import type { FontScaleMode } from '@/utils/fontScale'

const props = defineProps<{ items: getQuotesItemResponse[] }>()

// 密集行情表最高放大到 1.15 倍，保留三列阅读顺序。
const quoteScale = ref(Math.min(resolveFontScale(getStoredFontScale()), 1.15))
const updateQuoteScale = (mode: FontScaleMode) => {
  quoteScale.value = Math.min(resolveFontScale(mode), 1.15)
}
onMounted(() => {
  updateQuoteScale(getStoredFontScale())
  uni.$on('fontScaleChanged', updateQuoteScale)
})
onUnmounted(() => uni.$off('fontScaleChanged', updateQuoteScale))

const PRICE_WIDTH = 228
const RATE_WIDTH = 144
const RATE_PADDING = 8

const fitNumberSize = (value: string, baseSize: number, width: number): string => {
  // 预留字宽余量；达到可读下限后由 CSS 换行，不能裁掉价格有效数字。
  const availableSize = width / (Math.max(value.length, 1) * 0.65)
  return `${Math.max(24, Math.min(baseSize * quoteScale.value, availableSize))}rpx`
}

const rows = computed(() =>
  props.items.map((item) => {
    const price = item.price?.trim() ? `$${item.price.trim()}` : '--'
    const rate = Number(item.up_down_rate)
    const hasRate = item.up_down_rate != null && Number.isFinite(rate)
    const rateText = hasRate ? `${rate > 0 ? '+' : ''}${rate.toFixed(2)}%` : '--%'
    return {
      item,
      price,
      rateText,
      isPositive: hasRate && rate > 0,
      priceSize: fitNumberSize(price, 32, PRICE_WIDTH),
      rateSize: fitNumberSize(rateText, 28, RATE_WIDTH - RATE_PADDING * 2),
    }
  }),
)
</script>

<template>
  <view
    class="crypto-quotes"
    :style="{
      '--quote-scale': quoteScale,
      '--price-width': PRICE_WIDTH + 'rpx',
      '--rate-width': RATE_WIDTH + 'rpx',
      '--rate-padding': RATE_PADDING + 'rpx',
    }"
  >
    <view class="quote-header">
      <text>{{ t('discover.quotes.op.title') }}</text>
      <text>{{ t('discover.quotes.op.currency_usdt') }}</text>
    </view>
    <view v-for="row in rows" :key="row.item.id" class="quote-row">
      <view class="coin">
        <image class="coin-icon" :src="getImageUrl(row.item.icon)" mode="aspectFit" />
        <view class="coin-info">
          <view class="coin-symbol">{{ row.item.short_name }}</view>
          <view class="coin-name">{{ row.item.name }}</view>
        </view>
      </view>
      <view class="quote-price" :style="{ fontSize: row.priceSize }">{{ row.price }}</view>
      <view class="quote-rate" :class="{ positive: row.isPositive }">
        <text :style="{ fontSize: row.rateSize }">{{ row.rateText }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.crypto-quotes {
  padding: 32rpx;
  margin-bottom: 24rpx;
  background: var(--bg-card);
  border-radius: 32rpx;
}

.quote-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48rpx;
  font-size: calc(24rpx * var(--quote-scale));
  color: var(--text-secondary);
}

.quote-row {
  display: flex;
  align-items: center;
  min-height: 120rpx;
  padding: 10rpx 0;
  box-sizing: border-box;
}

.coin {
  display: flex;
  align-items: center;
  flex: 1 1 0;
  min-width: 0;
}

.coin-icon {
  flex: 0 0 64rpx;
  width: 64rpx;
  height: 64rpx;
  margin-right: 12rpx;
}

.coin-info {
  flex: 1;
  min-width: 0;
}

.coin-symbol {
  font-size: calc(32rpx * var(--quote-scale));
  font-weight: 500;
  line-height: 1.2;
  color: var(--text-primary);
  word-break: break-all;
}

.coin-name {
  margin-top: 4rpx;
  overflow: hidden;
  font-size: calc(24rpx * var(--quote-scale));
  line-height: 1.2;
  color: var(--black-40);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quote-price {
  flex: 0 0 var(--price-width);
  width: var(--price-width);
  min-width: 0;
  margin: 0 16rpx;
  color: var(--text-primary);
  text-align: left;
}

.quote-price,
.quote-rate {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  word-break: break-all;
}

.quote-rate {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 var(--rate-width);
  width: var(--rate-width);
  min-height: 56rpx;
  padding: 8rpx var(--rate-padding);
  box-sizing: border-box;
  color: var(--bg-card);
  text-align: center;
  background: #1ec880;
  border-radius: 12rpx;

  text {
    min-width: 0;
    width: 100%;
  }

  &.positive {
    background: #f04f45;
  }
}
</style>

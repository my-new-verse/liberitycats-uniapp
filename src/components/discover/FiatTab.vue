<template>
  <view class="cell" :style="{ marginTop: cntPaddingTop + 20 + 'rpx' }">
    <view class="fiatItem" v-for="item in fiatList.data" :key="item.id">
      <view class="fiatBox">
        <view class="fiatImg">
          <image :src="getImageUrl(item.icon)" mode="widthFix" />
        </view>
        <view class="fiatInfo">
          <view class="fiatName">{{ item.name }}</view>
          <view class="fiatSubName">{{ item.short_name }}</view>
        </view>
      </view>
      <view class="fiatPrice">
        {{ item.symbol }}
        <!-- {{
          exchangeValue == '' || fiatPopupShow == true
            ? parseFloat(item.rate).toFixed(2)
            : exchangeResult[item.id]
        }} -->
        <wd-input
          type="number"
          inputmode="decimal"
          :key="item.id"
          v-model="item.input"
          :placeholder="item.placehodlertxt"
          no-border
          :custom-style="`width: ${getMaxWidth(item)}`"
          custom-class="fiatPriceInput"
          :focus="item.id === fiatList.data[0].id"
          @input="handleFiatInput(item, $event)"
          @focus="handleFiatFocus(item, $event)"
          @blur="handleFiatBlur(item, $event)"
          :ignoreCompositionEvent="false"
        />
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { t } from '@/locale'
import { getImageUrl } from '@/utils'
import { getFiatItemResponse, getFiatListApi, getFiatListApiResponse } from '@/service/api/fiat'
import { useToast } from 'wot-design-uni'

const toast = useToast()

const props = defineProps<{
  state: string
  cntPaddingTop: number
}>()

const emit = defineEmits<{
  'update:state': [state: string]
  'refresh-complete': []
  'refresh-error': []
}>()

const fiatList = ref<getFiatListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 0,
})

let isRefreshing = false
const hasInitialized = ref(false)
const isLoading = ref(false)
const loadState = ref<string>('loading')

// 更新加载状态
const updateState = (state: string) => {
  loadState.value = state
  emit('update:state', state)
}

// 获取汇率数据
const getCurrencyRate = async (page = 1) => {
  if (isLoading.value) return

  try {
    isLoading.value = true
    const res = await getFiatListApi(page)
    if (page === 1) {
      fiatList.value = res.data
    } else {
      fiatList.value.data = fiatList.value.data.concat(res.data.data)
      fiatList.value.current_page = res.data.current_page
      fiatList.value.last_page = res.data.last_page
    }

    fiatList.value.data.forEach((item) => {
      item.input = parseFloat(item.rate).toFixed(2)
      item.placehodlertxt = item.input
    })

    // 更新状态为非加载状态
    updateState('success')
    hasInitialized.value = true
    // 如果是刷新操作，发出刷新完成事件
    if (isRefreshing && page === 1) {
      emit('refresh-complete')
      isRefreshing = false
    }
  } catch (error) {
    updateState('error')
    // 如果是刷新操作，发出刷新错误事件
    if (isRefreshing) {
      emit('refresh-error')
      isRefreshing = false
    }
    toast.error((error as Error).message || '加载失败')
  } finally {
    isLoading.value = false
  }
}

const getMaxWidth = (item: any) => {
  // 计算输入框的最大宽度，兼容 input 和 placeholder 可能为 undefined
  const inputLen = (item.input ?? '').toString().length
  const placeholderLen = (item.placeholdertxt ?? '').toString().length
  // 每个字符按 15rpx 宽度，最小宽度 40rpx，左右加 10rpx
  return Math.max(inputLen, placeholderLen, 4) * 15 + 20 + 'rpx'
}

// 监听加载状态变化
watch(
  () => props.state,
  (newVal) => {
    if (newVal === 'loading') {
      // 检查是否还有更多数据可以加载
      if (fiatList.value.current_page < fiatList.value.last_page) {
        getCurrencyRate(fiatList.value.current_page + 1)
      } else {
        // 如果没有更多数据，直接更新状态为完成
        updateState('finished')
      }
    }
  },
)

// 初始加载
onMounted(() => {
  emit('update:state', loadState.value)
  if (!hasInitialized.value) {
    getCurrencyRate()
  }
  // 监听刷新事件
  uni.$on('refreshFiatTab', () => {
    isRefreshing = true
    getCurrencyRate(1)
  })
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  uni.$off('refreshFiatTab')
})

const selectFiatItem = ref<getFiatItemResponse>({} as getFiatItemResponse)

const handleFiatInput = (selectItem: any, e: any) => {
  console.log('handleFiatInput', e)
  console.log('handleFiatInput===========', selectItem)

  const selectedCurrencyRate = selectItem?.rate || 1 // 获取选中货币的汇率
  const inputValue = parseFloat(e.value)
  const usdAmount = inputValue / selectedCurrencyRate

  console.log('selectedCurrencyRate', usdAmount)

  fiatList.value.data.forEach((item, index) => {
    if (e.value === '') {
      // 清空输入框
      if (item.id !== selectItem.id) {
        fiatList.value.data[index].input = parseFloat(item.rate).toFixed(2)
      }
    } else {
      // 2. 用美元金额计算所有货币对应值
      if (item.rate && item.rate !== 0) {
        fiatList.value.data[index].input = Number((usdAmount * item.rate).toFixed(4))
      }
    }
  })
}

const handleFiatFocus = (selectItem: any, e: any) => {
  selectFiatItem.value = selectItem
  fiatList.value.data.forEach((item) => {
    if (item.id === selectItem.id) {
      item.input = ''
    } else {
      item.input = parseFloat(item.rate).toFixed(2)
    }
  })
}

const handleFiatBlur = (selectItem: any, e: any) => {
  if (e.value === '') {
    selectFiatItem.value = {} as getFiatItemResponse
    nextTick(() => {
      fiatList.value.data.forEach((item, index) => {
        if (item.id === selectItem.id) {
          fiatList.value.data[index].input = parseFloat(item.rate).toFixed(2)
        }
      })
    })
  }
  // 无论 value 是否为空，blur 后都隐藏键盘
  uni.hideKeyboard()
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.filterBox {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  margin-bottom: 20rpx;
  color: var(--text-secondary);
  background-color: #efefef;
}
// fiat start
.fiatOpBar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64rpx;
  margin-bottom: 30rpx;
  color: var(--text-secondary);
  background-color: #efefef;
}
.fiatItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 120rpx;
  margin-bottom: 20rpx;

  .fiatBox {
    display: flex;
    align-items: center;
    justify-content: center;
    .fiatImg {
      width: 80rpx;
      height: 80rpx;
      image {
        width: 100%;
        height: 100%;
      }
    }
    .fiatInfo {
      margin-left: 16rpx;
      .fiatName {
        margin-bottom: 4rpx;
        font-size: 32rpx;
        font-weight: 600;
        line-height: 38rpx;
        color: var(--text-primary);
      }
      .fiatSubName {
        font-size: 24rpx;
        font-weight: 500;
        line-height: 28rpx;
        color: #999999;
      }
    }
  }
  .fiatPrice {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 64rpx;
    padding: 0 20rpx;
    font-size: 28rpx;
    font-weight: 600;
    line-height: 33rpx;
    color: #ff6b03;
    background: rgba(255, 107, 3, 0.1);
    border-radius: 24rpx;

    &.active {
      color: var(--bg-card);
      background: #ff6b03;
    }
  }
}
// fiat end

:deep(.fiatPriceInput) {
  min-width: 40rpx;
  margin-left: 6rpx;

  text-align: right;
  background-color: transparent;
  .wd-input__inner {
    font-size: 28rpx;
    font-weight: 600;
    color: #ff6b03;
  }
}
.active {
  :deep(.fiatPriceInput) {
    .wd-input__inner {
      color: var(--bg-card);
    }
  }
}
:deep(.wd-input__placeholder) {
  color: var(--text-secondary);
}
</style>

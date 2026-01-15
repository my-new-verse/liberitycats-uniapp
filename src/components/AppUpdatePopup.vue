<template>
  <wd-popup
    :model-value="modelValue"
    custom-class="globalPopupBox"
    :close-on-click-modal="false"
    :modal-style="`z-index: ${modalZIndex}; position: fixed;`"
    :z-index="popupZIndex"
    :lock-scroll="true"
    :closable="closAbele"
    @close="closePopup"
  >
    <view class="titleBox" v-if="title.length > 0">
      <view class="title">
        {{ title }}
      </view>
    </view>
    <view class="contentBox">
      <scroll-view class="scrollBox" :scroll-y="true">
        <rich-text :nodes="content"></rich-text>
      </scroll-view>
    </view>
    <view class="btnBox">
      <wd-button type="success" custom-class="mainBtn" @click="btnClick">
        {{ mainBtnText }}
      </wd-button>
    </view>
  </wd-popup>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  content: {
    type: String,
    default: '这里是默认内容',
  },
  popupZIndex: {
    type: Number,
    default: 10000,
  },
  modalZIndex: {
    type: Number,
    default: 9999,
  },
  mainBtnText: {
    type: String,
    default: 'Main Btn',
  },
  closAbele: {
    type: Boolean,
    default: true,
  },
})

const emits = defineEmits(['update:modelValue', 'btnClick', 'close'])

const btnClick = () => {
  emits('btnClick')
}

const closePopup = () => {
  emits('close')
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
:deep(.globalPopupBox) {
  position: relative;
  z-index: 10000 !important;
  width: calc(100% - 128rpx - 48rpx - 48rpx);
  padding: 48rpx;
  padding-bottom: 48rpx !important;
  background-color: #ffffff;
  border-radius: 24rpx;

  .titleBox {
    height: 52rpx;
    margin-bottom: 24rpx;
    font-size: 36rpx;
    line-height: 52rpx;
    color: rgba(0, 0, 0, 0.9);
    text-align: center;
  }

  .contentBox {
    min-height: 200rpx;
    max-height: 560rpx;
    overflow-y: scroll;
  }
}
</style>

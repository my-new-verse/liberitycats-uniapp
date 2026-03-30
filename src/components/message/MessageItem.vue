<template>
  <view class="msg-card" @click="handleItemClick">
    <!-- 未读红点 -->
    <view class="unread-dot" :class="{ hide: message.is_read }"></view>

    <!-- 中间内容区 -->
    <view class="msg-body">
      <!-- 第一行：图标 + 标题 -->
      <view class="msg-top">
        <view class="msg-icon-wrap">
          <wd-icon
            :name="getIconName"
            size="22px"
            :color="message.is_read ? '#999999' : '#ff4d4f'"
          />
        </view>
        <view class="msg-title zh-Hans" :class="{ read: message.is_read }">
          {{ message.i18n?.title || '' }}
        </view>
      </view>

      <!-- 第二行：内容（系统消息隐藏） -->
      <view
        v-if="message.category !== 'system'"
        class="msg-content"
        :class="{ read: message.is_read }"
      >
        {{ message.i18n?.content || '' }}
      </view>

      <!-- 第三行：时间 -->
      <view class="msg-time">{{ formatTime(message.create_time, 'YYYY-M-D H:i') }}</view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { formatTime } from '@/utils'

// 通用消息接口
interface CommonMessage {
  id: number | string
  is_read: boolean
  create_time: string | number
  category: 'community' | 'system' | 'mall' // 消息分类
  subtype?:
    | 'comment'
    | 'like'
    | 'follow' // 社区子类型
    | 'payment_reminder'
    | 'order_created'
    | 'payment_success' // 商城子类型
  i18n: {
    title: string
    content: string
  }
}

// 接收props
const props = defineProps<{
  message: CommonMessage
}>()

// 定义事件
const emit = defineEmits(['click'])

// 根据分类和子类型匹配图标
const getIconName = computed(() => {
  const { category, subtype } = props.message

  // 系统消息固定图标
  if (category === 'system') return 'notification'

  // 社区消息图标
  if (category === 'community') {
    switch (subtype) {
      case 'comment':
        return 'chat1'
      case 'like':
        return 'heart'
      case 'follow':
        return 'add'
      default:
        return 'chat1'
    }
  }

  // 商城消息图标
  if (category === 'mall') {
    switch (subtype) {
      case 'payment_reminder':
        return 'creditcard'
      case 'order_created':
        return 'add-circle1'
      case 'payment_success':
        return 'check-circle'
      default:
        return 'chat1'
    }
  }

  // 默认图标
  return 'chat1'
})

// 点击事件
const handleItemClick = () => {
  emit('click', props.message)
}
</script>

<style lang="scss" scoped>
.msg-card {
  display: flex;
  align-items: flex-start;
  background: #fff;
  position: relative;
  padding: 32rpx 24rpx;
  border-radius: 32rpx;

  &:active {
    background: #f5f5f5;
  }
}

/* 未读红点 */
.unread-dot {
  width: 8px;
  height: 8px;
  background: #ff4d4f;
  border-radius: 50%;
  margin-right: 8px;
  margin-top: 8px;
  flex-shrink: 0;

  &.hide {
    display: none;
  }
}

/* 勾选框（预留编辑模式） */
.check-box {
  width: 20px;
  height: 20px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.checked {
    background: #ff4d4f;
    border-color: #ff4d4f;
  }

  .check-mark {
    color: #fff;
    font-size: 12px;
  }
}

/* 主体布局 */
.msg-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 系统消息调整间距 */
.msg-body:has(.msg-top:not(:has(+ .msg-content))) {
  gap: 6px;
}

/* 第一行：图标 + 标题 */
.msg-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.msg-icon-wrap {
  flex-shrink: 0;
}

.msg-title {
  flex: 1;
  line-height: 1.4;
  font-size: 28rpx;
  font-weight: 500;
  line-height: 33rpx;
  color: #261000;
}

/* 第二行：内容 */
.msg-content {
  font-size: 28rpx;
  font-weight: 400;
  line-height: 33rpx;
  color: rgba(38, 16, 0, 0.6);
  font-family: Alibaba PuHuiTi2;
}

/* 第三行：时间 */
.msg-time {
  font-size: 28rpx;
  font-weight: 400;
  line-height: 33rpx;
  color: rgba(38, 16, 0, 0.4);
  font-family: Alibaba PuHuiTi2;
  align-self: flex-end;
  margin-top: 2px;
}
</style>

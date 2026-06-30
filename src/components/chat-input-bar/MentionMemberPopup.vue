<template>
  <wd-popup
    :model-value="visible"
    custom-style="border-radius:32rpx 32rpx 0 0"
    position="bottom"
    @close="handleClose"
  >
    <view class="popup-head">
      <view class="popup-head__close" @click="handleClose">
        <wd-icon name="arrow-down" size="22px"></wd-icon>
      </view>
      <view class="popup-head__title">{{ titleText }}</view>
      <view v-if="!multiSelect" class="popup-head__action" @click="multiSelect = true">
        {{ t('group.chat.mention.multiSelect') }}
      </view>
      <view v-else class="popup-head__action popup-head__action--done" @click="handleConfirm">
        {{ doneText }}
      </view>
    </view>
    <wd-search
      v-model="searchValue"
      hide-cancel
      :placeholder="searchPlaceholderText"
      @change="handleSearch"
    />
    <!-- 已选成员头像行 -->
    <scroll-view v-if="multiSelect && selectedMembers.length > 0" scroll-x class="selected-bar">
      <view class="selected-bar__inner">
        <view
          v-for="m in selectedMembers"
          :key="m.member_id"
          class="selected-bar__item"
          @click="toggleMember(m)"
        >
          <image class="selected-bar__avatar" :src="m.avatar" mode="aspectFill" />
          <text class="selected-bar__name">{{ m.nickname }}</text>
        </view>
      </view>
    </scroll-view>
    <scroll-view scroll-y class="mention-popup-scroll">
      <!-- 最常提醒区域 -->
      <template v-if="smartMembers.length > 0">
        <view class="section-title">{{ t('group.chat.mention.smartMembers') || '最常提醒' }}</view>
        <template v-if="multiSelect">
          <view
            v-for="member in smartMembers"
            :key="member.member_id"
            class="mention-member-item"
            @touchend.prevent="toggleMember(member)"
          >
            <wd-checkbox :model-value="selectedIdArr.includes(member.member_id)" />
            <image class="mention-avatar" :src="member.avatar" mode="aspectFill" />
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
        <template v-else>
          <view
            v-for="member in smartMembers"
            :key="member.member_id"
            class="mention-member-item"
            @touchend.prevent="handleItemClick(member)"
          >
            <image class="mention-avatar" :src="member.avatar" mode="aspectFill" />
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
      </template>

      <!-- 全部人员区域 -->
      <template v-if="allMembers.length > 0">
        <view class="section-title">{{ t('group.chat.mention.allMembers') || '全部人员' }}</view>
        <template v-if="multiSelect">
          <view
            v-for="member in allMembers"
            :key="member.member_id"
            class="mention-member-item"
            @touchend.prevent="toggleMember(member)"
          >
            <wd-checkbox :model-value="selectedIdArr.includes(member.member_id)" />
            <image class="mention-avatar" :src="member.avatar" mode="aspectFill" />
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
        <template v-else>
          <view
            v-for="member in allMembers"
            :key="member.member_id"
            class="mention-member-item"
            @touchend.prevent="handleItemClick(member)"
          >
            <image class="mention-avatar" :src="member.avatar" mode="aspectFill" />
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
      </template>

      <view v-if="loading" class="mention-loading">{{ loadingText }}</view>
    </scroll-view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ChatMember } from '@/service/api/groupChat'
import { getChatRoomMembersApi, getSmartMembersApi } from '@/service/api/groupChat'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  roomId: number
  keyword: string
  titleText: string
  doneText: string
  searchPlaceholderText: string
  loadingText: string
}>()
const { t } = useI18n()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  /** 单选模式：点击某个成员立即触发 */
  (e: 'select', member: ChatMember): void
  /** 多选模式：点击"完成"后批量触发 */
  (e: 'confirm', members: ChatMember[]): void
}>()

const smartMembers = ref<ChatMember[]>([]) // 最常提醒
const allMembers = ref<ChatMember[]>([]) // 全部人员
const loading = ref(false)
const multiSelect = ref(false)
const selectedIdArr = ref<number[]>([])
const searchValue = ref('')

// 合并后的成员列表（用于显示，去重）
const members = computed(() => {
  const memberMap = new Map<number, ChatMember>()
  // 先添加全部人员
  allMembers.value.forEach((m) => {
    memberMap.set(m.member_id, m)
  })
  // 再添加最常提醒（如果已存在则覆盖，确保显示最常提醒的数据）
  smartMembers.value.forEach((m) => {
    memberMap.set(m.member_id, m)
  })
  return Array.from(memberMap.values())
})

const selectedMembers = computed(() => {
  const idSet = new Set(selectedIdArr.value)
  return members.value.filter((m) => idSet.has(m.member_id))
})

const fetchMembers = async (keyword: string) => {
  if (!props.roomId) return
  loading.value = true
  try {
    // 并行请求两个接口
    const [smartRes, allRes] = await Promise.all([
      getSmartMembersApi(props.roomId, 1, 30, keyword),
      getChatRoomMembersApi(props.roomId, undefined, 1, 100, keyword),
    ])

    if (smartRes.code === 1) {
      smartMembers.value = smartRes.data.members || []
    }
    if (allRes.code === 1) {
      allMembers.value = allRes.data.data || []
    }
  } finally {
    loading.value = false
  }
}

// 弹窗打开时加载全量成员，关闭时重置状态
watch(
  () => props.visible,
  (val) => {
    if (val) {
      fetchMembers('')
    } else {
      members.value = []
      multiSelect.value = false
      selectedIdArr.value = []
      searchValue.value = ''
    }
  },
)

// 父组件 keyword 变化时同步搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.keyword,
  (kw) => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      searchValue.value = kw
      // 搜索时调用后端接口（通过 handleSearch 统一处理）
      handleSearch(kw)
    }, 300)
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

// 处理搜索框输入
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const handleSearch = (value: string) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    fetchMembers(value)
  }, 300)
}

const handleItemClick = (member: ChatMember) => {
  // 单选模式：立即选中并关闭
  emit('select', member)
}

const toggleMember = (member: ChatMember) => {
  const idx = selectedIdArr.value.indexOf(member.member_id)

  if (idx > -1) {
    selectedIdArr.value.splice(idx, 1)
  } else {
    selectedIdArr.value.push(member.member_id)
  }
}

const handleConfirm = () => {
  const idSet = new Set(selectedIdArr.value)
  const selected = members.value.filter((m) => idSet.has(m.member_id))
  if (selected.length > 0) {
    emit('confirm', selected)
  }
  emit('update:visible', false)
}
</script>

<style scoped lang="scss">
.popup-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 24rpx 12rpx 24rpx;

  &__close {
    flex-shrink: 0;
    padding: 8rpx;
  }

  &__title {
    font-size: 30rpx;
    font-weight: 500;
    color: #333;
  }

  &__action {
    font-size: 28rpx;
    color: #ff6b03;
    flex-shrink: 0;
    padding: 8rpx;

    &--done {
      font-weight: 500;
    }
  }
}

.mention-popup-scroll {
  max-height: 60vh;
}

.section-title {
  padding: 24rpx 24rpx 12rpx;
  font-size: 26rpx;
  color: #999;
  font-weight: 500;
}

.selected-bar {
  white-space: nowrap;
  border-bottom: 1rpx solid #f0f0f0;

  &__inner {
    display: inline-flex;
    padding: 28rpx 24rpx;
    gap: 16rpx;
  }

  &__item {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    width: 96rpx;

    &:active {
      opacity: 0.6;
    }
  }

  &__avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__name {
    font-size: 20rpx;
    color: #666;
    max-width: 96rpx;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
}

.mention-member-item {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  gap: 16rpx;

  &:active {
    background: #f5f5f5;
  }
}

:deep(.wd-checkbox) {
  flex-shrink: 0;
}

:deep(.wd-checkbox__icon) {
  font-size: 36rpx;
}

.mention-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.mention-nickname {
  font-size: 28rpx;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-loading {
  padding: 32rpx;
  text-align: center;
  color: #999;
  font-size: 26rpx;
}
</style>

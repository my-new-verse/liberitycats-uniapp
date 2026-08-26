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
      @clear="handleClear"
      @click.stop
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
          <view class="selected-bar__avatar-wrap">
            <image class="selected-bar__avatar" :src="getCachedAvatar(m)" mode="aspectFill" />
            <view v-if="getMemberLevelStyle(m)" class="levelIcon">
              <view class="levelBadge" :style="getMemberLevelStyle(m)"></view>
            </view>
          </view>
          <text class="selected-bar__name">{{ m.nickname }}</text>
        </view>
      </view>
    </scroll-view>
    <scroll-view scroll-y class="mention-popup-scroll" @scrolltolower="handleScrollToLower">
      <!-- 最常提醒区域（有搜索条件时隐藏） -->
      <view v-show="!searchValue && smartMembers.length > 0">
        <view class="section-title">{{ t('group.chat.mention.smartMembers') || '最常提醒' }}</view>
        <template v-if="multiSelect">
          <view
            v-for="member in smartMembers"
            :key="member.member_id"
            class="mention-member-item"
            @click="toggleMember(member)"
          >
            <wd-checkbox :model-value="selectedIdArr.includes(member.member_id)" />
            <view class="mention-avatar-wrap">
              <image class="mention-avatar" :src="getCachedAvatar(member)" mode="aspectFill" />
              <view v-if="getMemberLevelStyle(member)" class="levelIcon">
                <view class="levelBadge" :style="getMemberLevelStyle(member)"></view>
              </view>
            </view>
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
        <template v-else>
          <view
            v-for="member in smartMembers"
            :key="member.member_id"
            class="mention-member-item"
            @click="handleItemClick(member)"
          >
            <view class="mention-avatar-wrap">
              <image class="mention-avatar" :src="getCachedAvatar(member)" mode="aspectFill" />
              <view v-if="getMemberLevelStyle(member)" class="levelIcon">
                <view class="levelBadge" :style="getMemberLevelStyle(member)"></view>
              </view>
            </view>
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
      </view>

      <!-- 全部人员区域 -->
      <view class="section-title">{{ t('group.chat.mention.allMembers') || '全部人员' }}</view>
      <!-- 无数据占位 -->
      <view v-if="!loading && !loadingMore && allMembers.length === 0" class="mention-empty">
        <text>{{ t('common.no_data') || '暂无数据' }}</text>
      </view>
      <template v-else-if="allMembers.length > 0">
        <template v-if="multiSelect">
          <view
            v-for="member in allMembers"
            :key="member.member_id"
            class="mention-member-item"
            @click="toggleMember(member)"
          >
            <wd-checkbox :model-value="selectedIdArr.includes(member.member_id)" />
            <view class="mention-avatar-wrap">
              <image class="mention-avatar" :src="getCachedAvatar(member)" mode="aspectFill" />
              <view v-if="getMemberLevelStyle(member)" class="levelIcon">
                <view class="levelBadge" :style="getMemberLevelStyle(member)"></view>
              </view>
            </view>
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
        <template v-else>
          <view
            v-for="member in allMembers"
            :key="member.member_id"
            class="mention-member-item"
            @click="handleItemClick(member)"
          >
            <view class="mention-avatar-wrap">
              <image class="mention-avatar" :src="getCachedAvatar(member)" mode="aspectFill" />
              <view v-if="getMemberLevelStyle(member)" class="levelIcon">
                <view class="levelBadge" :style="getMemberLevelStyle(member)"></view>
              </view>
            </view>
            <text class="mention-nickname">{{ member.nickname }}</text>
          </view>
        </template>
      </template>

      <view v-if="loading" class="mention-loading">{{ loadingText }}</view>
      <view v-else-if="loadingMore" class="mention-loading">{{ loadingText }}</view>
      <view v-else-if="!hasMoreAllMembers && allMembers.length > 0" class="mention-no-more">
        {{ t('common.noMore') || '没有更多了' }}
      </view>
    </scroll-view>
  </wd-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ChatMember } from '@/service/api/groupChat'
import { getChatRoomMembersApi, getSmartMembersApi } from '@/service/api/groupChat'
import { getLevelBadgeStyle, getCachedMemberAvatar, cacheMemberAvatars } from '@/utils/avatarCache'
import { t } from '@/locale'

const props = withDefaults(
  defineProps<{
    visible: boolean
    roomId: number
    keyword: string
    titleText: string
    doneText: string
    searchPlaceholderText: string
    loadingText: string
    selectedIds?: number[]
    defaultMultiSelect?: boolean
    maxSelected?: number
    /** 推荐模式：'smart' 调用智能推荐接口 | 'history' 使用本地历史选择缓存 */
    recommendMode?: 'smart' | 'history'
  }>(),
  {
    defaultMultiSelect: true,
    maxSelected: 10,
    recommendMode: 'smart',
  },
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  /** 单选模式：点击某个成员立即触发 */
  (e: 'select', member: ChatMember): void
  /** 多选模式：点击"完成"后批量触发 */
  (e: 'confirm', members: ChatMember[]): void
}>()

const smartMembers = ref<ChatMember[]>([]) // 最常提醒
const allMembers = ref<ChatMember[]>([]) // 全部人员
const rawSmartMembers = ref<ChatMember[]>([]) // 原始最常提醒数据（未搜索）
const rawAllMembers = ref<ChatMember[]>([]) // 原始全部人员数据（未搜索）
const loading = ref(false)
const multiSelect = ref(false)
const selectedIdArr = ref<number[]>([])
const searchValue = ref('')

// ========== 分页状态 ==========
const allMembersPage = ref(1) // 全部人员当前页码
const hasMoreAllMembers = ref(true) // 是否还有更多全部人员
const loadingMore = ref(false) // 是否正在加载更多
const ALL_MEMBERS_PAGE_SIZE = 50 // 每页数量

// ========== 历史选择缓存 ==========
const getHistoryCacheKey = () => `mentionHistory_${props.roomId}`

const loadHistoryMembers = (): ChatMember[] => {
  try {
    const data = uni.getStorageSync(getHistoryCacheKey())
    if (Array.isArray(data)) return data
  } catch {
    // ignore
  }
  return []
}

const saveHistoryMembers = (members: ChatMember[]) => {
  if (members.length === 0) return
  const existing = loadHistoryMembers()
  const newIds = new Set(members.map((m) => m.member_id))
  const remaining = existing.filter((m) => !newIds.has(m.member_id))
  const merged = [...members, ...remaining].slice(0, 30)
  uni.setStorageSync(getHistoryCacheKey(), merged)
}

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

const fetchMembers = async (keyword: string, isInitialLoad = false) => {
  if (!props.roomId) return
  loading.value = true
  // 重置分页状态
  allMembersPage.value = 1
  hasMoreAllMembers.value = true
  try {
    if (isInitialLoad) {
      if (props.recommendMode === 'history') {
        // 历史选择模式：从本地缓存加载最常使用
        const historyData = loadHistoryMembers()
        smartMembers.value = historyData
        rawSmartMembers.value = historyData
        // 全部人员仍走接口
        const allRes = await getChatRoomMembersApi(
          props.roomId,
          undefined,
          1,
          ALL_MEMBERS_PAGE_SIZE,
          keyword,
        )
        if (allRes.code === 1) {
          const data = allRes.data.data || []
          allMembers.value = data
          rawAllMembers.value = data
          cacheMemberAvatars(data)
          hasMoreAllMembers.value = data.length >= ALL_MEMBERS_PAGE_SIZE
        }
      } else {
        // 智能推荐模式：并行请求两个接口
        const [smartRes, allRes] = await Promise.all([
          getSmartMembersApi(props.roomId, 1, 30, keyword),
          getChatRoomMembersApi(props.roomId, undefined, 1, ALL_MEMBERS_PAGE_SIZE, keyword),
        ])

        if (smartRes.code === 1) {
          const data = smartRes.data.members || []
          smartMembers.value = data
          rawSmartMembers.value = data
          cacheMemberAvatars(data)
        }
        if (allRes.code === 1) {
          const data = allRes.data.data || []
          allMembers.value = data
          rawAllMembers.value = data
          cacheMemberAvatars(data)
          hasMoreAllMembers.value = data.length >= ALL_MEMBERS_PAGE_SIZE
        }
      }
    } else {
      // 搜索时：只请求全部人员接口
      const allRes = await getChatRoomMembersApi(
        props.roomId,
        undefined,
        1,
        ALL_MEMBERS_PAGE_SIZE,
        keyword,
      )
      if (allRes.code === 1) {
        const data = allRes.data.data || []
        allMembers.value = data
        cacheMemberAvatars(data)
        hasMoreAllMembers.value = data.length >= ALL_MEMBERS_PAGE_SIZE
      }
    }
  } catch (error) {
    console.error(error)
  } finally {
    loading.value = false
  }
}

/** 加载更多全部人员 */
const loadMoreMembers = async () => {
  if (!props.roomId || loadingMore.value || !hasMoreAllMembers.value) return
  loadingMore.value = true
  try {
    const nextPage = allMembersPage.value + 1
    const keyword = searchValue.value
    const allRes = await getChatRoomMembersApi(
      props.roomId,
      undefined,
      nextPage,
      ALL_MEMBERS_PAGE_SIZE,
      keyword,
    )
    if (allRes.code === 1) {
      const data = allRes.data.data || []
      if (data.length > 0) {
        // 追加新数据（去重）
        const existingIds = new Set(allMembers.value.map((m) => m.member_id))
        const newMembers = data.filter((m) => !existingIds.has(m.member_id))
        if (newMembers.length > 0) {
          allMembers.value = [...allMembers.value, ...newMembers]
          rawAllMembers.value = [...rawAllMembers.value, ...newMembers]
          cacheMemberAvatars(newMembers)
        }
        allMembersPage.value = nextPage
        hasMoreAllMembers.value = data.length >= ALL_MEMBERS_PAGE_SIZE
      } else {
        hasMoreAllMembers.value = false
      }
    }
  } catch (error) {
    console.error('loadMoreMembers failed', error)
  } finally {
    loadingMore.value = false
  }
}

/** 滚动到底部时触发加载更多 */
const handleScrollToLower = () => {
  if (!loading.value && !loadingMore.value && hasMoreAllMembers.value) {
    loadMoreMembers()
  }
}

// 弹窗打开时加载全量成员，关闭时重置状态
watch(
  () => props.visible,
  (val) => {
    if (val) {
      // 弹出层打开时隐藏键盘
      uni.hideKeyboard()
      // 预选成员（用于筛选场景恢复已选状态）
      if (props.selectedIds && props.selectedIds.length > 0) {
        selectedIdArr.value = [...props.selectedIds]
      }
      // 默认多选模式（可通过 defaultMultiSelect=false 关闭）
      if (props.defaultMultiSelect || (props.selectedIds && props.selectedIds.length > 0)) {
        multiSelect.value = true
      }
      fetchMembers('', true) // 初始加载，传入 isInitialLoad = true
    } else {
      smartMembers.value = []
      allMembers.value = []
      rawSmartMembers.value = []
      rawAllMembers.value = []
      multiSelect.value = false
      selectedIdArr.value = []
      searchValue.value = ''
      // 重置分页状态
      allMembersPage.value = 1
      hasMoreAllMembers.value = true
      loadingMore.value = false
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
const handleSearch = (keyword: string) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    if (keyword.value === '') {
      smartMembers.value = rawSmartMembers.value
      allMembers.value = rawAllMembers.value
    } else {
      fetchMembers(keyword.value)
    }
  }, 300)
}

// 处理搜索框清除
const handleClear = () => {
  searchValue.value = ''
  fetchMembers('')
}

const handleItemClick = (member: ChatMember) => {
  // 单选模式：缓存历史选择并关闭
  saveHistoryMembers([member])
  emit('select', member)
}

const toggleMember = (member: ChatMember) => {
  const idx = selectedIdArr.value.indexOf(member.member_id)

  if (idx > -1) {
    selectedIdArr.value.splice(idx, 1)
  } else {
    if (selectedIdArr.value.length >= props.maxSelected) {
      uni.showToast({
        title: t('group.chat.mention.maxSelectedLimit', { count: props.maxSelected }),
        icon: 'none',
      })
      return
    }
    selectedIdArr.value.push(member.member_id)
  }
}

/** 获取成员 level 徽章样式（优先 level_id，兼容 level.level） */
const getMemberLevelStyle = (member: ChatMember) => {
  const level = member.level_id ?? member.level?.level
  return getLevelBadgeStyle(level)
}

/** 获取缓存后的头像 URL（基于 member_id） */
const getCachedAvatar = (member: ChatMember) =>
  getCachedMemberAvatar(member.member_id, member.avatar, 'member')

const handleConfirm = () => {
  const idSet = new Set(selectedIdArr.value)
  const selected = members.value.filter((m) => idSet.has(m.member_id))
  if (selected.length > 0) {
    // 缓存历史选择
    saveHistoryMembers(selected)
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
    color: var(--actions-text);
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
  color: var(--text-secondary);
  font-weight: 500;
}

.selected-bar {
  white-space: nowrap;
  border-bottom: 1rpx solid var(--divider-color);

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

  &__avatar-wrap {
    position: relative;
    width: 72rpx;
    height: 72rpx;
    flex-shrink: 0;
  }

  &__avatar {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__name {
    font-size: 20rpx;
    color: var(--wot-message-box-content-color);
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
    background: var(--wot-action-sheet-active-color);
  }
}

:deep(.wd-checkbox) {
  flex-shrink: 0;
}

:deep(.wd-checkbox__icon) {
  font-size: 36rpx;
}

.mention-avatar-wrap {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
}

.mention-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.levelIcon {
  position: absolute;
  right: -4rpx;
  bottom: 2rpx;
  width: 24rpx;
  height: 24rpx;

  .levelBadge {
    width: 100%;
    height: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
  }
}

.mention-nickname {
  font-size: 28rpx;
  color: var(--actions-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mention-loading {
  padding: 32rpx;
  text-align: center;
  color: var(--text-secondary);
  font-size: 26rpx;
}

.mention-no-more {
  padding: 24rpx 32rpx;
  text-align: center;
  color: #ccc;
  font-size: 24rpx;
  height: 40vh;
}

.mention-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  // justify-content: center;
  min-height: 50vh;
  padding: 120rpx 32rpx;
  color: var(--text-secondary);
  font-size: 28rpx;
}
</style>

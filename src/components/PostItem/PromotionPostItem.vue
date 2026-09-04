<template>
  <view class="socialItem">
    <view v-if="showDelete" class="delBox">
      <wd-icon
        v-if="refreshVisible"
        @click="$emit('refresh', item)"
        name="refresh1"
        size="22px"
        color="#999999"
      ></wd-icon>
      <view @click="$emit('delete', item.id)" class="del-child"></view>
    </view>
    <view class="jbBox" v-else-if="showReport" @click="$emit('report', item)"></view>
    <view class="socialHead">
      <view class="avatarBox" @click="$emit('avatar-click', item)">
        <image
          class="avatar"
          :src="getImageUrl(item.member?.avatar + '?x-oss-process=style/jzcq')"
        />
        <view class="levelIcon">
          <image :src="`/static/images/level/${item.member?.level}.png`" mode="widthFix" />
        </view>
      </view>
      <view class="nameWrap">
        <view class="name">{{ formatNickname(item.member?.nickname, 22) }}</view>
        <!-- 徽章图标 - 显示在昵称右边 -->
        <wd-img
          width="42rpx"
          height="42rpx"
          v-if="item.member?.equippedCommunityBadge?.iconUrl"
          class="badge-icon"
          :src="getImageUrl(item.member.equippedCommunityBadge.iconUrl)"
          mode="aspectFit"
          :enable-preview="false"
          @click.stop="
            handleBadgeClick(
              item.member.equippedCommunityBadge.code,
              item.member_id || item.member?.member_id || item.member?.id,
            )
          "
        />
      </view>
    </view>
    <view class="socialCntBox" @click="$emit('click', item)">
      <view class="titleRow" v-if="item.title">
        <view v-if="item.ad_type?.name" class="tag tag1">
          {{ item.ad_type?.name }}
        </view>
        <view class="socialCnt text-clamp-4 title">{{ item.title }}</view>
      </view>
      <view class="socialCnt text-clamp-4 content" v-if="item.content">
        {{ item.content }}
      </view>
      <view class="adTagsRow" v-if="item.ad_tags?.length">
        <text v-for="tag in item.ad_tags" :key="tag.id" class="adTagChip">
          # {{ tag.display_name }}
        </text>
      </view>
      <view class="socialTime">
        {{ formatRelativeTime(item.promotion_sort_time || item.create_time) }}
      </view>
    </view>
    <view class="socialFoot" v-if="showFoot">
      <view class="socialBtnBox" @click="$emit('view-click', item)">
        <view class="socialBtnIcon view"></view>
        <view class="socialBtn">{{ item.view_count || 0 }}</view>
      </view>
      <view class="socialBtnBox" @click="$emit('comment-click', item)">
        <view class="socialBtnIcon quote"></view>
        <view class="socialBtn">{{ item.commit_count || 0 }}</view>
      </view>
      <view class="socialBtnBox">
        <view class="zanWrapper" @click.stop="$emit('like', item)">
          <image
            class="Icon"
            :src="item.is_liked === 1 ? '/static/images/unlike.png' : '/static/images/zan0.33.png'"
            mode="aspectFit"
            :style="{ opacity: item.currentGif ? 0 : 1 }"
          />
          <image :src="item.currentGif" class="Icon" mode="aspectFit" />
        </view>
        <view class="socialBtn" style="margin-left: 10rpx">{{ item.like_count }}</view>
      </view>
      <view class="socialBtnBox" @click="$emit('share', item)">
        <view class="socialBtnIcon share"></view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'
import { formatNickname, formatRelativeTime, getImageUrl, toUrl } from '@/utils'

const props = withDefaults(
  defineProps<{
    item: any
    showFoot?: boolean
    showDelete?: boolean
    showReport?: boolean
    showRefresh?: boolean
  }>(),
  {
    showFoot: true,
    showRefresh: true,
  },
)

const refreshVisible = ref(props.showRefresh)

watch(
  () => props.showRefresh,
  (val) => {
    refreshVisible.value = val
  },
)

const hideRefresh = () => {
  refreshVisible.value = false
}

defineExpose({ hideRefresh })

defineEmits<{
  delete: [id: number]
  report: [item: any]
  refresh: [item: any]
  'avatar-click': [item: any]
  click: [item: any]
  'view-click': [item: any]
  'comment-click': [item: any]
  like: [item: any]
  share: [item: any]
}>()

// 处理徽章点击
const handleBadgeClick = (badgeCode: string, memberId: number) => {
  if (!badgeCode || !memberId) return
  toUrl(
    `/pages/cats/badge/detail?code=${encodeURIComponent(badgeCode)}&memberId=${encodeURIComponent(memberId)}`,
  )
}
</script>

<style lang="scss">
@import '/src/style/social';

:deep(.delBox) {
  background-image: none !important;
  width: auto !important;
  height: auto !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  .del-child {
    width: 40rpx;
    height: 40rpx;
    background-image: url('@/static/images/trush@2x.png');
    background-repeat: no-repeat;
    background-size: 100%;
  }
}
</style>

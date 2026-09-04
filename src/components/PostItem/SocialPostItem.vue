<template>
  <view class="socialItem">
    <view class="delBox" v-if="showDelete" @click="$emit('delete', item.id)"></view>
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
      <view v-if="item.tag?.name" class="tag" :class="item.tag?.extend_json?.class">
        {{ item.tag?.name }}
      </view>
    </view>
    <view class="socialCntBox" @click="$emit('click', item)">
      <view class="socialCnt text-clamp-4">
        <view class="socialTips" v-if="item.is_approved === 0">
          {{ t('social.detail.content.not_audit_seed_myself') }}
        </view>
        {{ item.content }}
      </view>
      <view
        v-if="showImages && item.images?.length > 0"
        class="socialMedia"
        :class="{
          mediaImg4: item.images.length === 4,
          singleImg: item.images.length === 1,
        }"
      >
        <view
          v-for="(image, index) in item.images"
          :key="index"
          @tap.stop="$emit('preview', item.images, index)"
        >
          <wd-img
            :radius="5"
            custom-class="mediaImgItem"
            :mode="item.images.length === 1 ? 'widthFix' : 'aspectFill'"
            :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
            :enable-preview="false"
          />
        </view>
      </view>
      <view class="socialTime">{{ formatRelativeTime(item.create_time) }}</view>
    </view>
    <view class="socialFoot" v-if="showFoot">
      <view class="socialBtnBox" @click="$emit('view-click', item)">
        <view class="socialBtnIcon view"></view>
        <view class="socialBtn">{{ item.view_count }}</view>
      </view>
      <view class="socialBtnBox" @click="$emit('comment-click', item)">
        <view class="socialBtnIcon quote"></view>
        <view class="socialBtn">{{ item.commit_count }}</view>
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
import { formatNickname, formatRelativeTime, getImageUrl, toUrl } from '@/utils'
import { t } from '@/locale/index'

withDefaults(
  defineProps<{
    item: any
    showFoot?: boolean
    showImages?: boolean
    showDelete?: boolean
    showReport?: boolean
  }>(),
  {
    showFoot: true,
    showImages: true,
  },
)

defineEmits<{
  delete: [id: number]
  report: [item: any]
  'avatar-click': [item: any]
  click: [item: any]
  'view-click': [item: any]
  'comment-click': [item: any]
  like: [item: any]
  share: [item: any]
  preview: [images: string[], index: number]
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
</style>

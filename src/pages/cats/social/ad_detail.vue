<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <page-meta :page-style="`overflow:${commentPopupVisible ? 'hidden' : 'visible'};`"></page-meta>

  <view>
    <custom-nav2 :title="t('adDetail.page_title')" pageBackgroundColor="#f7f6f4">
      <template #right>
        <view v-if="postDetail.member_id === userStore.userInfo?.member_id" @click="handleEditPost">
          <wd-icon name="edit-outline" size="38rpx"></wd-icon>
        </view>
      </template>
      <template #default>
        <view class="container">
          <view class="socialBox">
            <view class="socialItem">
              <view
                class="delBox"
                v-if="postDetail.member_id === userStore.userInfo?.member_id"
                @click="handleDelMainPost"
              ></view>
              <view class="jbBox" v-else @click="reportPost(postDetail)"></view>
              <view
                v-if="getMemberFollowInfo(postDetail?.member)"
                class="followBtn"
                :class="getMemberFollowInfo(postDetail?.member).style"
                @click.stop="handleFollowClick(postDetail?.member)"
              >
                {{ getMemberFollowInfo(postDetail?.member).text }}
                <wd-icon
                  custom-style="margin-left: 12rpx"
                  name="star-on"
                  size="22rpx"
                  color="#ff6b03"
                  v-if="postDetail.member.is_special_following === 1"
                ></wd-icon>
              </view>
              <view class="socialHead">
                <view class="avatarBox" @click="debouncedToUserHomeRef?.(postDetail?.member_id)">
                  <image
                    v-if="postDetail?.member?.avatar"
                    class="avatar"
                    :src="getImageUrl(postDetail?.member?.avatar + '?x-oss-process=style/jzcq')"
                  />
                  <view class="levelIcon">
                    <image
                      :src="`/static/images/level/${postDetail.member?.level_id}.png`"
                      mode="scaleToFill"
                    />
                  </view>
                </view>
                <view class="nameWrap">
                  <view class="name">{{ formatNickname(postDetail?.member?.nickname, 22) }}</view>
                  <view class="metaRow">
                    <text class="metaTime">{{ formatRelativeTime(postDetail.create_time) }}</text>
                    <text class="metaSeparator">·</text>
                    <text class="metaPublished">{{ t('adDetail.published_in') }}</text>
                    <text class="metaZone">{{ t('adDetail.promotion_zone') }}</text>
                  </view>
                  <!-- <view
                    v-if="getMemberFollowInfo(postDetail?.member)"
                    class="followBtn"
                    :class="getMemberFollowInfo(postDetail?.member).style"
                    @click.stop="handleFollowClick(postDetail?.member)"
                  >
                    {{ getMemberFollowInfo(postDetail?.member).text }}
                    <wd-icon
                      custom-style="margin-left: 12rpx"
                      name="star-on"
                      size="22rpx"
                      color="#ff6b03"
                      v-if="postDetail.member.is_special_following === 1"
                    ></wd-icon>
                  </view> -->
                </view>
                <view
                  v-if="postDetail.tag?.name"
                  class="tag"
                  :class="postDetail.tag?.extend_json?.class"
                >
                  {{ postDetail.tag?.name }}
                </view>
              </view>
              <!-- 标题单独卡片 -->
              <view class="adTitleCard" v-if="postDetail.ad_type.name || postDetail.title">
                <view class="adTypeTag" v-if="postDetail.ad_type.name">
                  {{ postDetail.ad_type.name }}
                </view>
                <text class="adTitle" v-if="postDetail.title">{{ postDetail.title }}</text>
              </view>
              <view class="socialCntBox">
                <view class="socialCnt">
                  <view class="socialTips" v-if="postDetail.is_approved === 0">
                    {{ t('social.detail.content.not_audit_seed_myself') }}
                  </view>
                  {{ postDetail.content }}
                </view>
                <view class="adTagsRow" v-if="postDetail.ad_tags?.length">
                  <text v-for="tag in postDetail.ad_tags" :key="tag.id" class="adTagChip">
                    # {{ tag.display_name }}
                  </text>
                </view>
                <view
                  class="socialMedia"
                  v-if="postDetail?.images?.length > 0"
                  :class="{
                    mediaImg4: postDetail.images.length === 4,
                    singleImg: postDetail.images.length === 1,
                  }"
                >
                  <view v-for="(image, index) in postDetail.images" :key="index">
                    <wd-img
                      :radius="5"
                      custom-class="mediaImgItem"
                      :mode="postDetail.images.length === 1 ? 'widthFix' : 'aspectFill'"
                      :src="getImageUrl(image + '?x-oss-process=style/sqdt')"
                      :enable-preview="false"
                      @click="doHandlePreview(postDetail.images, index)"
                    />
                  </view>
                </view>
                <view
                  class="promotionCard"
                  v-if="postDetail.contact_email || postDetail.contact_wechat"
                >
                  <view class="promotionCardTitle">{{ t('adDetail.promotion_info') }}</view>
                  <view class="promotionRow" v-if="postDetail.contact_email">
                    <wd-img
                      width="36rpx"
                      height="36rpx"
                      :src="'/static/images/email.png'"
                      custom-class="promotionIcon"
                    />
                    <text class="promotionLabel">{{ t('adDetail.contact_email') }}</text>
                    <text class="promotionValue">{{ postDetail.contact_email }}</text>
                    <text class="copyBtn" @click.stop="copyText(postDetail.contact_email)">
                      {{ t('adDetail.copy') }}
                    </text>
                  </view>
                  <view class="promotionRow" v-if="postDetail.contact_wechat">
                    <wd-img
                      width="36rpx"
                      height="36rpx"
                      :src="'/static/images/wechat.png'"
                      custom-class="promotionIcon"
                    />
                    <text class="promotionLabel">{{ t('adDetail.contact_wechat') }}</text>
                    <text class="promotionValue">{{ postDetail.contact_wechat }}</text>
                    <text class="copyBtn" @click.stop="copyText(postDetail.contact_wechat)">
                      {{ t('adDetail.copy') }}
                    </text>
                  </view>
                </view>
                <view class="reportTip">
                  <wd-img
                    width="32rpx"
                    height="32rpx"
                    :src="'/static/images/safety.png'"
                    custom-class="reportTipIcon"
                  />
                  <text class="reportTipText">{{ t('adDetail.report_tip') }}</text>
                </view>
              </view>
              <view class="socialFoot">
                <view class="socialBtnBox">
                  <view class="socialBtnIcon view"></view>
                  <view class="socialBtn">{{ postDetail.view_count }}</view>
                </view>
                <view class="socialBtnBox" @click="showCommentPopup">
                  <view class="socialBtnIcon quote"></view>
                  <view class="socialBtn">{{ postDetail.commit_count }}</view>
                </view>
                <view class="socialBtnBox" @click="likePost(postId)">
                  <view class="zanWrapper">
                    <image
                      class="Icon"
                      :src="
                        postDetail.is_liked === 1
                          ? '/static/images/unlike.png'
                          : '/static/images/zan0.33.png'
                      "
                      mode="aspectFit"
                      :style="{ opacity: postDetail.currentGif ? 0 : 1 }"
                    />
                    <image :src="postDetail.currentGif" class="Icon" mode="aspectFit" />
                  </view>
                  <view class="socialBtn" style="margin-left: 10rpx">
                    {{ postDetail.like_count }}
                  </view>
                </view>
                <view class="socialBtnBox" @click="handleOpenShare(postDetail)">
                  <view class="socialBtnIcon share"></view>
                </view>
              </view>
            </view>
          </view>

          <view class="commentBox" id="commentSection">
            <view class="commentFilterBox">
              <view class="opTitle">{{ t('social.detail.comment_title') }}</view>
              <view class="opBox">
                <view
                  class="opBtn"
                  :class="{ active: commentSearch === 'latest' }"
                  @click="handleLoadComments('latest')"
                >
                  {{ t('social.detail.comment.filter.latest') }}
                </view>
                <view
                  class="opBtn"
                  :class="{ active: commentSearch === 'hot' }"
                  @click="handleLoadComments('hot')"
                >
                  {{ t('social.detail.comment.filter.hot') }}
                </view>
              </view>
            </view>
            <template v-if="commentList.data.length === 0">
              <view class="emptyBox" style="height: 300rpx; opacity: 0.4">
                <view class="emptyTxt">{{ t('social.detail.comment.empty') }}</view>
              </view>
            </template>
            <template v-else>
              <view
                class="commentItem"
                v-for="(item, index) in commentList.data"
                :key="item.id || index"
                :id="'commentItem_' + item.id"
                :class="{ highlight: highlightId === `commentItem_${item.id}` }"
                @click.stop="showCommentPopup('l1', item)"
              >
                <view class="avatarBox" @click.stop="debouncedToUserHomeRef?.(item.member_id)">
                  <image
                    class="avatar"
                    :src="getImageUrl(item.member.avatar + '?x-oss-process=style/jzcq')"
                    mode="widthFix"
                  />
                  <view class="levelIcon">
                    <image :src="`/static/images/level/${item.member.level}.png`" mode="widthFix" />
                  </view>
                </view>
                <view class="commentCntBox">
                  <view class="nameWrap">
                    <text class="nickname">{{ item._nickname }}</text>
                    <text class="authorTag" v-if="item.member_id === postDetail.member_id">
                      {{ t('social.detail.authorTag') }}
                    </text>
                    <!-- <wd-button v-if="item.member_id === postDetail.member_id" size="small">{{ t('social.detail.authorTag') }}</wd-button> -->
                    <!-- <view
                      v-if="getMemberFollowInfo(item.member)"
                      class="followBtn"
                      :class="getMemberFollowInfo(item.member).style"
                      @click.stop="handleFollowClick(item.member)"
                    >
                      {{ getMemberFollowInfo(item.member).text }}
                      <wd-icon
                        custom-style="margin-left: 12rpx"
                        name="star-on"
                        size="22rpx"
                        color="#ff6b03"
                        v-if="item.member.is_special_following === 1"
                      ></wd-icon>
                    </view> -->
                  </view>
                  <view class="commentCnt">
                    <view class="socialTips" v-if="item.is_approved === 0">
                      {{ t('social.detail.content.not_audit_seed_myself') }}
                    </view>
                    {{ item.content }}
                  </view>
                  <view class="commentMedia" v-if="item?._images?.length > 0">
                    <template v-for="(img, index) in item._images" :key="index">
                      <wd-img
                        :radius="5"
                        custom-class="mediaImg"
                        :src="img"
                        :enable-preview="false"
                        @click="doHandlePreview(item._previewImages, index, false)"
                      />
                    </template>
                  </view>
                  <view class="commentFoot">
                    <view class="time">{{ item._time }}</view>
                    <view class="rightBox">
                      <view class="likeBox" @click.stop="likeComment(item)">
                        <view class="zanWrapper">
                          <image
                            class="Icon"
                            :src="
                              item.is_liked === 1
                                ? '/static/images/unlike.png'
                                : '/static/images/zan0.33.png'
                            "
                            mode="aspectFit"
                            :style="{ opacity: item.currentGif ? 0 : 1 }"
                          />
                          <image :src="item.currentGif" class="Icon" mode="aspectFit" />
                        </view>
                        <view class="likeTxt" style="margin-left: 10rpx">
                          {{ item.like_count }}
                        </view>
                      </view>
                      <view
                        class="delBox"
                        v-if="userStore.userInfo?.member_id === item.member_id"
                        @click.stop="handleDelPost(item.id, 'l1')"
                      ></view>
                      <view class="jbBox" v-else @click.stop="reportPost(item)"></view>
                    </view>
                  </view>

                  <!-- 二级评论 -->
                  <view class="replyList" v-if="item.reply_count > 0">
                    <view
                      class="replyListCnt"
                      v-if="item.reply_preview && item.reply_preview.length > 0"
                    >
                      <view
                        class="replyItem"
                        v-for="reply in item.reply_preview"
                        :key="reply.id"
                        @click.stop="handleReplyL2(reply, item)"
                      >
                        <view class="replyHeader">
                          <view
                            class="replyAvatarWrap"
                            @click.stop="debouncedToUserHomeRef?.(reply.member.id)"
                          >
                            <image
                              class="replyAvatar"
                              :src="getImageUrl(reply.member.avatar + '?x-oss-process=style/jzcq')"
                              mode="aspectFill"
                            />
                            <view class="replyLevelIcon">
                              <image
                                :src="`/static/images/level/${reply.member.level}.png`"
                                mode="widthFix"
                              />
                            </view>
                          </view>
                          <view class="nameWrap">
                            <text
                              class="nickname replyNickname"
                              @click.stop="debouncedToUserHomeRef(reply.member.id)"
                            >
                              {{ reply.member.nickname }}
                            </text>
                            <text class="authorTag" v-if="reply.member_id === postDetail.member_id">
                              {{ t('social.detail.authorTag') }}
                            </text>
                            <!-- <view
                              v-if="getMemberFollowInfo(reply.member)"
                              class="followBtn"
                              :class="getMemberFollowInfo(reply.member).style"
                              @click.stop="handleFollowClick(reply.member)"
                            >
                              {{ getMemberFollowInfo(reply.member).text }}
                              <wd-icon
                                custom-style="margin-left: 12rpx"
                                name="star-on"
                                size="22rpx"
                                color="#ff6b03"
                                v-if="reply.member.is_special_following === 1"
                              ></wd-icon>
                            </view> -->
                          </view>
                        </view>

                        <view class="replyContent">
                          <view class="commentCnt" v-if="reply.reply_to_id !== item.id">
                            {{ t('social.detail.comment.reply_prefix') }}
                            <text
                              class="nickname replyNickname"
                              @click.stop="debouncedToUserHomeRef(reply.member.id)"
                            >
                              {{ reply.reply_to_member.nickname }}
                            </text>
                            {{ ': ' }}{{ reply.content }}
                          </view>
                          <view class="commentCnt" v-else>
                            {{ reply.content }}
                          </view>

                          <view class="commentMedia" v-if="reply?._images?.length > 0">
                            <template v-for="(img, index) in reply._images" :key="index">
                              <wd-img
                                custom-class="mediaImg"
                                :src="img"
                                :enable-preview="false"
                                @click="doHandlePreview(reply._previewImages, index, false)"
                              />
                            </template>
                          </view>

                          <view class="commentFoot">
                            <view class="time">{{ reply._time }}</view>
                            <view class="rightBox">
                              <view class="likeBox" @click.stop="likeReply(reply, item.id)">
                                <view class="zanWrapper">
                                  <image
                                    class="Icon"
                                    :src="
                                      reply.is_liked === 1
                                        ? '/static/images/unlike.png'
                                        : '/static/images/zan0.33.png'
                                    "
                                    mode="aspectFit"
                                    :style="{ opacity: reply.currentGif ? 0 : 1 }"
                                  />
                                  <image :src="reply.currentGif" class="Icon" mode="aspectFit" />
                                </view>
                                <view class="likeTxt" style="margin-left: 10rpx">
                                  {{ reply.like_count }}
                                </view>
                              </view>
                              <view
                                class="delBox"
                                v-if="userStore.userInfo?.member_id === reply.member_id"
                                @click.stop="handleDelPost(reply.id, 'l2', item)"
                              ></view>
                              <view class="jbBox" v-else @click.stop="reportPost(reply)"></view>
                            </view>
                          </view>
                        </view>
                      </view>
                    </view>

                    <view
                      class="replyCollapse"
                      v-if="item.hidden_reply_count > 0 || item.has_more === 1"
                      @click.stop="expandReplies(item)"
                    >
                      <template v-if="item.isExpandedStarted">
                        <text v-if="item.has_more === 1">
                          {{ t('social.detail.comment.more') }}
                        </text>
                      </template>

                      <template v-else>
                        <text>
                          {{ t('social.detail.comment.expand') + item.hidden_reply_count }}
                          {{ t('social.detail.comment.reply') }}
                        </text>
                      </template>
                      <view class="arrow"></view>
                    </view>
                  </view>
                </view>
              </view>
            </template>
          </view>
        </view>
      </template>
      <template #footer>
        <view class="fixedCommentBox" style="padding-bottom: env(safe-area-inset-bottom)">
          <view class="commentTextArea" @click="showCommentPopup('post')">
            {{ t('social.detail.comment.placeholder') }}
          </view>
        </view>

        <wd-backtop :scrollTop="scrollTop"></wd-backtop>

        <wd-popup
          v-model="commentPopupVisible"
          lock-scroll
          position="bottom"
          custom-class="commentPopup"
          @close="handleCloseCommentPopup"
        >
          <view class="pubCommentBox">
            <view class="commentTextAreaBox">
              <wd-textarea
                v-model="commentContent"
                :placeholder="placeholderText"
                :maxlength="140"
                show-word-limit
                auto-height
                hold-keyboard
                :adjust-position="false"
                custom-class="pubCommentTextArea"
                @keyboardheightchange="textAreaFocus"
                :focus="shouldFocus"
                :ignoreCompositionEvent="false"
                ref="commentTextarea"
              />
              <view class="emojiBox2" v-if="customEmojiList.length > 0">
                <view class="emojiItem2" v-for="(item, index) in customEmojiList" :key="index">
                  <view class="closeBtb" @click="deleteCustomEmoji(item)"></view>
                  <image :src="getImageUrl(item)" mode="widthFix" class="emojiIcon2" />
                </view>
              </view>
            </view>

            <view class="opBarBox">
              <view
                class="opIcon"
                :class="{
                  keyboard: currentOpBtn === 'keyboard',
                  expression: currentOpBtn === 'expression',
                }"
                @click="changeOpBtn"
              ></view>
              <view class="opBtnBox">
                <wd-button
                  type="primary"
                  custom-class="sendCommentBtn"
                  :disabled="commentContent.length === 0 && customEmojiList.length === 0"
                  :loading="sendLoading"
                  @click.stop="debouncedCreateCommentRef?.()"
                >
                  {{ t('social.detail.comment.btn.send') }}
                </wd-button>
              </view>
            </view>
          </view>
          <view class="expressionBox" v-if="currentOpBtn === 'expression'">
            <view class="category">
              <view
                class="categoryItem"
                :class="{ active: expressionCategory === -1 }"
                @click="changeExpressionCategory(-1)"
              >
                <image src="@/static/images/bq0/0.png" mode="heightFix" />
              </view>
              <template v-if="emotionList.length > 0">
                <view
                  class="categoryItem"
                  :class="{ active: expressionCategory === index }"
                  @click="changeExpressionCategory(index)"
                  v-for="(item, index) in emotionList"
                  :key="index"
                >
                  <image :src="getImageUrl(item.icon)" mode="heightFix" />
                </view>
              </template>
            </view>
            <view class="expressionCnt">
              <scroll-view class="scrollGoodsBox" :scroll-y="true" height="500rpx">
                <template v-if="expressionCategory === -1">
                  <view
                    class="emojiItem"
                    v-for="(item, index) in defaultEmojiList"
                    :key="index"
                    @click="addEmoji(item)"
                  >
                    <view class="emoji">{{ item }}</view>
                  </view>
                </template>
                <template v-else-if="expressionCategory > -1">
                  <view
                    class="expressionItem"
                    v-for="(item, index) in emotionList[expressionCategory].emotions"
                    :key="index"
                    @click="addCustomEmoji(item.icon)"
                  >
                    <image :src="getImageUrl(item.icon)" mode="heightFix" />
                  </view>
                </template>
              </scroll-view>
            </view>
          </view>
          <view class="commentHidden" :style="{ height: `${keyboardHeight}px` }"></view>
        </wd-popup>

        <wd-loadmore :state="state" @reload="getCommentList" />
      </template>
    </custom-nav2>
    <wd-message-box selector="wd-message-box-slot" />
    <SharePopup ref="shareRef" />
    <wd-action-sheet
      custom-class="reportSheet"
      v-model="reportShow"
      :actions="reportActions"
      :z-index="97"
      @close="reportSheetClose"
      @select="reportSheetSelect"
    />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import {
  commitPostApi,
  getCommunityPostCommentListApi,
  getCommunityPostDetailApi,
  getCommunityPostListApiResponse,
  getPostDetailResponse,
  likePostApi,
  getCommunityEmotionListByCategoryApi,
  getCommunityEmotionListItem,
  deletePostApi,
  getCommunityPostThreadApi,
  adminRemovalApi,
  blockUserApi,
  createFollowApi,
  deleteFollowApi,
  setSpecialFollowApi,
  getAdTypeListApi,
  AdTypeItem,
} from '@/service/api/community'
import {
  formatNickname,
  formatRelativeTime,
  getImageUrl,
  openUrl,
  toUrl,
  getStickerUrl,
  handlePreview,
} from '@/utils'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { useToast, useMessage } from 'wot-design-uni'
import { useUserStore } from '@/store'
import { debounce } from 'lodash-es'

import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'
import SharePopup from '@/components/SharePopup/SharePopup.vue'

import { ref } from 'vue'

// 防抖
const debouncedCreateCommentRef = ref<(() => Promise<void>) | null>(null)

// 语言
const locale = uni.getLocale()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage('wd-message-box-slot')

const postId = ref<number>(0)
const reportShow = ref<boolean>(false)
const reportActions = ref<any[]>([])
const reportPostItem = ref<any>({})

const reportPost = (post: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }

  const member = post.member
  const isFollowing = member?.is_following === 1
  const isSpecial = member?.is_special_following === 1
  const isPost = post === postDetail.value
  const actions: any[] = []

  // 关注相关操作
  if (isFollowing) {
    actions.push({ name: t('social.index.user.unfollow'), type: 'follow', color: '#333' })
    actions.push({
      name: isSpecial ? t('social.index.user.special.cancel') : t('social.index.user.special.set'),
      type: 'specialFollow',
      color: '#333',
    })
  } else {
    actions.push({ name: t('social.index.user.follow'), type: 'follow', color: '#ff6b03' })
    actions.push({ name: t('social.index.user.special.set'), type: 'specialFollow', color: '#333' })
  }

  actions.push({ name: '', type: 'divider', disabled: true })
  actions.push({
    name: isPost ? t('social.index.post.report') : t('social.index.post.report_comment'),
    type: 'report',
    color: '#ff6b03',
  })
  actions.push({ name: t('social.index.user.block'), type: 'block' })

  if (userStore.userInfo.community_permissions?.can_take_down === 1) {
    actions.push({
      name: isPost ? t('report.admin.remove_post') : t('report.admin.remove_comment'),
      type: 'remove',
      color: '#FF3B30',
    })
  }

  reportActions.value = actions
  reportShow.value = true
  reportPostItem.value = post
}

const currentRequestId = ref('')

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const GIF_LIKE = '/static/images/like_action.gif'
const GIF_UNLIKE = '/static/images/unlike_action.gif'

// 被回复的目标
const replyTarget = ref<{
  id: number
  nickname: string
  type: 'post' | 'l1' | 'l2'
  parentId?: number
}>({
  id: postId.value,
  nickname: '',
  type: 'post',
})

onBackPress((options) => {
  const pages = getCurrentPages() // 获取当前页面栈
  if (pages.length === 1) {
    uni.reLaunch({
      url: '/pages/tabbar/discover',
    })
    return true
  }
  return false
})

function reportSheetClose() {
  reportShow.value = false
}

function reportSheetSelect({ item }) {
  reportShow.value = false
  switch (item.type) {
    case 'follow':
      if (reportPostItem.value.member?.is_following) {
        handleActionSheetUnfollow(reportPostItem.value.member)
      } else {
        handleFollowClick(reportPostItem.value.member)
      }
      break
    case 'specialFollow':
      handleSpecialFollow()
      break
    case 'report':
      handleReportPost()
      break
    case 'block':
      handleBlockUser()
      break
    case 'remove':
      handleRemovePost()
      break
  }
}

const handleReportPost = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  const isPost = reportPostItem.value === postDetail.value
  toUrl(
    `/pages/cats/report/content?id=${reportPostItem.value.id}&type=${isPost ? 'post' : 'comment'}`,
  )
}

/** 管理员下架 */
const handleRemovePost = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  const item = reportPostItem.value
  const isPost = item === postDetail.value

  message
    .confirm({
      title: isPost ? t('report.admin.remove_post') : t('report.admin.remove_comment'),
      msg: isPost
        ? t('social.index.post.remove_content')
        : t('social.index.comment.remove_content'),
    })
    .then(() => {
      uni.showLoading()
      adminRemovalApi(item.id, isPost ? 'post' : 'comment')
        .then((res) => {
          if (res.data?.status === 0) {
            if (isPost) {
              uni.navigateBack()
            } else if (item.reply_preview) {
              commentList.value.data = commentList.value.data.filter((i) => i.id !== item.id)
            } else {
              const parentComment = commentList.value.data.find((i) => i.id === item.reply_to_id)
              if (parentComment) {
                parentComment.reply_preview = parentComment.reply_preview.filter(
                  (reply) => reply.id !== item.id,
                )
              }
            }
            toast.success(t('common.operation_success'))
          } else {
            toast.show(res.msg || t('common.operationFailedRetry'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

const placeholderText = computed(() => {
  if (replyTarget.value.type !== 'post' && replyTarget.value.nickname) {
    return `${t('social.detail.comment.reply_to')} @${replyTarget.value.nickname}`
  }
  return t('social.detail.comment.placeholder')
})

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
})

const commentPopupVisible = ref(false)
// 用于取消 shouldFocus 延迟设置的定时器（弹窗已关闭时旧定时器不应再触发）
let pendingFocusTimer: ReturnType<typeof setTimeout> | null = null
// const handleCloseCommentPopup = () => {
//   commentPopupVisible.value = false
// }
const highlightId = ref('') // 要高亮的元素ID

// 评论内容
const commentContent = ref('')
// 评论发送状态
const sendLoading = ref(false)

// 发布评论 start
const publishComment = async () => {
  if (userStore.isLogin === false) {
    toast.show(t('common.toast.pleaseLogin'))
    return
  }
  if (commentContent.value.length === 0 && customEmojiList.value.length === 0) {
    toast.show(t('common.toast.comment_required'))
    return
  }

  if (sendLoading.value) return
  sendLoading.value = true

  try {
    const requestId = generateUUID()
    const res = await commitPostApi(
      replyTarget.value.id,
      commentContent.value,
      customEmojiList.value,
      requestId,
    )

    if (res.code === 1) {
      toast.show(t('common.toast.comment_success'))

      const type = replyTarget.value.type

      if (type === 'l1' || type === 'l2') {
        // 所属的一级评论id
        const parentId = type === 'l1' ? replyTarget.value.id : replyTarget.value.parentId

        const parentComment = commentList.value.data.find((item) => item.id === parentId)

        // 展开状态（hidden_reply_count为0），局部刷新二级列表
        if (parentComment && parentComment.hidden_reply_count === 0) {
          const threadRes = await getCommunityPostThreadApi(parentId, 100)
          if (threadRes.code === 1) {
            // 格式化信息
            const items = threadRes.data.items || []
            parentComment.reply_preview = items.map((re: any) => {
              const reImgs = Array.isArray(re?.images) ? re.images : []
              const reProcessedImgs = reImgs.map((u: string) => getImageUrl(u))
              return {
                ...re,
                _nickname: formatNickname(re?.member?.nickname || '', 22),
                _time: formatRelativeTime(re?.create_time),
                _images: reProcessedImgs,
                _previewImages: reProcessedImgs,
              }
            })
            parentComment.reply_count = items.length
          }
        } else {
          commentList.value.current_page = 0
          commentList.value.data = []
          await getCommentList()
        }
      } else {
        commentList.value.current_page = 0
        commentList.value.data = []
        await getCommentList()
      }

      handleCloseCommentPopup()
      commentContent.value = ''
      customEmojiList.value = []
    } else {
      toast.show(res.msg)
    }
  } catch (error) {
    toast.show('error:' + error.errMsg)
  } finally {
    sendLoading.value = false
  }
}
// 发布评论 end

// 处理键盘和表情切换
const textareaFocus = ref(true)
const currentOpBtn = ref('keyboard')
const changeOpBtn = () => {
  if (currentOpBtn.value === 'keyboard') {
    currentOpBtn.value = 'expression'
    textareaFocus.value = false
  } else {
    currentOpBtn.value = 'keyboard'
    textareaFocus.value = true
  }
}

const commentTextarea = ref()
// 添加一个新的ref来管理焦点状态
const shouldFocus = ref(false)

// 修改showCommentPopup方法
const showCommentPopup = (type: 'post' | 'l1' = 'post', targetItem?: any) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }

  if (type === 'l1' && targetItem) {
    replyTarget.value = {
      id: targetItem.id, // 一级评论ID
      nickname: targetItem.member?.nickname || '',
      type: 'l1',
    }
  } else {
    replyTarget.value = {
      id: postId.value, // 帖子ID
      nickname: '',
      type: 'post',
    }
  }

  // 重置键盘高度，避免上次残留值导致 commentHidden 占位过高输入框弹飞
  keyboardHeight.value = 0
  commentPopupVisible.value = true
  // 重置焦点状态
  shouldFocus.value = false
  customEmojiList.value = []
  currentOpBtn.value = 'keyboard'
  expressionCategory.value = -1

  // 取消旧的 focus 定时器，设置新的
  if (pendingFocusTimer) clearTimeout(pendingFocusTimer)
  // 使用nextTick确保DOM更新
  nextTick(() => {
    // 使用setTimeout确保在下一个事件循环中设置焦点
    pendingFocusTimer = setTimeout(() => {
      pendingFocusTimer = null
      // 仅在弹窗仍打开时才聚焦
      if (commentPopupVisible.value) {
        shouldFocus.value = true
      }
    }, 100)
  })
}

// 修改handleCloseCommentPopup方法
const handleCloseCommentPopup = () => {
  // 取消 focus 延迟定时器
  if (pendingFocusTimer) {
    clearTimeout(pendingFocusTimer)
    pendingFocusTimer = null
  }
  commentPopupVisible.value = false
  shouldFocus.value = false
  keyboardHeight.value = 0
  commentContent.value = ''
}

const keyboardHeight = ref(0)
const textAreaFocus = (e: any) => {
  keyboardHeight.value = e.height
  if (currentOpBtn.value === 'expression') {
    currentOpBtn.value = 'keyboard'
    textareaFocus.value = true
  }

  console.log('textAreaFocus =======================', e, keyboardHeight.value)
}
// 处理键盘和表情切换 end

// 切换表情分类
const expressionCategory = ref(-1)
const changeExpressionCategory = (index: number) => {
  expressionCategory.value = index
}

const defaultEmojiList = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '😂',
  '🤣',
  '🥲',
  '☺️',
  '😊',
  '😇',
  '🙂',
  '🙃',
  '😉',
  '😌',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😙',
  '😚',
  '😋',
  '😛',
  '😝',
  '😜',
  '🤪',
  '🤨',
  '🧐',
  '🤓',
  '😎',
  '🥸',
  '🤩',
  '🥳',
  '😏',
  '😒',
  '😞',
  '😔',
  '😟',
  '😕',
  '🙁',
  '☹️',
  '😣',
  '😖',
  '😫',
  '😩',
  '🥺',
  '😢',
  '😭',
  '😤',
  '😠',
  '😡',
  '🤬',
  '🤯',
  '😳',
  '🥵',
  '🥶',
  '😱',
  '😨',
  '😰',
  '😥',
  '😓',
  '🤗',
  '🤔',
  '🤭',
  '🤫',
  '🤥',
  '😶',
  '😐',
  '😑',
  '😬',
  '🙄',
  '😯',
  '😦',
  '😧',
  '😮',
  '😲',
  '🥱',
  '😴',
  '🤤',
  '😪',
  '😵',
  '🤐',
  '🥴',
  '🤢',
  '🤮',
  '🤧',
  '😷',
  '🤒',
  '🤕',
  '🤑',
  '🤠',
  '😈',
  '👿',
  '👹',
  '👺',
  '🤡',
  '💩',
  '👻',
  '💀',
  '☠️',
  '👽',
  '👾',
  '🤖',
  '🎃',
  '😺',
  '😸',
  '😹',
  '😻',
  '😼',
  '😽',
  '🙀',
  '😿',
  '😾',
]

// 输入emoji表情
const addEmoji = (emoji: string) => {
  commentContent.value += emoji
}

const customEmojiList = ref<string[]>([])
const addCustomEmoji = (src: string) => {
  if (!src) return
  if (customEmojiList.value.length >= 5) {
    toast.show(t('social.detail.add_custom_emoji_max5'))
    return
  }
  if (!customEmojiList.value.includes(src)) {
    customEmojiList.value.push(src)
  }
}
const deleteCustomEmoji = (src: string) => {
  const index = customEmojiList.value.indexOf(src)
  if (index !== -1) {
    customEmojiList.value.splice(index, 1)
  }
}

// onload 获取帖子详情和评论列表
const postDetail = ref<getPostDetailResponse>({} as getPostDetailResponse)

const emotionList = ref<getCommunityEmotionListItem[]>([])

const commentSearch = ref('latest')

onLoad((options) => {
  console.log('======', options)

  if (options.id) {
    postId.value = Number(options.id)
    // uni.showLoading()
    Promise.allSettled([
      getCommentList(),
      getCommunityPostDetailApi(Number(options.id)).then((res) => {
        postDetail.value = res.data
      }),
      getAdTypeListApi().then((res) => {
        adTypeList.value = res.data
      }),
    ]).finally(() => {
      if (options.showComment === 'true') {
        uni.hideLoading()
        if (options.commentId) {
          setTimeout(() => {
            if (commentList.value?.data?.length) scrollToAnchor('commentItem_' + options.commentId)
            // uni.hideLoading()
          }, 1000)
        } else {
          setTimeout(() => {
            if (commentList.value?.data?.length === 0) {
              showCommentPopup()
            } else {
              scrollToComment()
            }
            // uni.hideLoading()
          }, 1000)
        }
      } else {
        uni.hideLoading()
      }
    })

    // 加载表情列表
    getCommunityEmotionListByCategoryApi().then((res) => {
      emotionList.value = res.data
    })
  }
})
// 获取帖子详情和评论列表 end

// 分页加载评论列表
const state = ref<LoadMoreState>('loading')
const commentList = ref<getCommunityPostListApiResponse>({
  current_page: 0,
  data: [],
  last_page: 1,
})

// 并发控制
const commentsReqSeq = ref(0) // 请求序号，自增
const commentsLoading = ref(false) // 加载锁

const getCommentList = async () => {
  // 启动加载
  state.value = 'loading'
  commentsLoading.value = true

  // 本次请求的序号
  const reqId = ++commentsReqSeq.value

  try {
    const res = await getCommunityPostCommentListApi(
      postId.value,
      commentSearch.value,
      commentList.value.current_page + 1,
    )

    // 不是最新请求，丢弃响应，防止覆盖
    if (reqId !== commentsReqSeq.value) return

    // 为每条评论预计算昵称，避免模板频繁调用格式化函数导致卡顿
    const mapped = (res.data.data || []).map((it: any) => {
      const imgs = Array.isArray(it?.images) ? it.images : []
      // 解决merge
      const processedImages = imgs.map((u: string) => getImageUrl(u))

      // --- 二级评论格式化处理 ---
      if (it.reply_preview && it.reply_preview.length > 0) {
        it.reply_preview = it.reply_preview.map((re: any) => {
          const reImgs = Array.isArray(re?.images) ? re.images : []
          const reProcessedImgs = reImgs.map((u: string) => getImageUrl(u))
          return {
            ...re,
            _nickname: formatNickname(re?.member?.nickname || '', 22),
            _time: formatRelativeTime(re?.create_time),
            _images: reProcessedImgs,
            _previewImages: reProcessedImgs,
          }
        })
      }

      return {
        ...it,
        _nickname: formatNickname(it?.member?.nickname || '', 22),
        _time: formatRelativeTime(it?.create_time),
        _images: processedImages,
        _previewImages: processedImages,
      }
    })

    // 正常落地
    commentList.value.data = commentList.value.data.concat(mapped)
    commentList.value.current_page = res.data.current_page
    commentList.value.last_page = res.data.last_page

    state.value =
      commentList.value.current_page === commentList.value.last_page ? 'finished' : 'loading'
  } catch (e) {
    // 仅对最新请求设置错误状态
    if (reqId === commentsReqSeq.value) {
      state.value = 'error'
    }
  } finally {
    // 仅在最新请求完成时释放加载锁
    if (reqId === commentsReqSeq.value) {
      commentsLoading.value = false
    }
  }
}

onReachBottom(() => {
  if (!commentsLoading.value && commentList.value.current_page < commentList.value.last_page) {
    getCommentList()
  }
})

// 分页加载评论列表 end

// 点赞
const likePost = (id: number) => {
  const realId = id || postId.value

  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  if (!realId) {
    console.log('帖子ID为空，取消点赞')
    return
  }
  // uni.showLoading()
  likePostApi(realId)
    .then((res) => {
      if (res.code !== 1) {
        toast.show(res.msg || t('common.error'))
        return
      }
      postDetail.value.like_count = res.data.like_count || 0
      postDetail.value.is_liked = res.data.is_liked || 0

      const timestamp = new Date().getTime()
      if (postDetail.value.is_liked === 1) {
        postDetail.value.currentGif = `${GIF_LIKE}?t=${timestamp}`
      } else {
        postDetail.value.currentGif = `${GIF_UNLIKE}?t=${timestamp}`
      }

      setTimeout(() => {
        postDetail.value.currentGif = ''
      }, 800)
    })
    .finally(() => {
      // uni.hideLoading()
    })
}

const likeComment = (item: any) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  // uni.showLoading()
  likePostApi(item.id)
    .then((res) => {
      if (res.code !== 1) {
        toast.show(res.msg || t('common.error'))
        return
      }

      item.like_count = res.data.like_count || 0
      item.is_liked = res.data.is_liked || 0

      const timestamp = new Date().getTime()
      if (item.is_liked === 1) {
        item.currentGif = `${GIF_LIKE}?t=${timestamp}`
      } else {
        item.currentGif = `${GIF_UNLIKE}?t=${timestamp}`
      }

      setTimeout(() => {
        item.currentGif = ''
      }, 800)
    })
    .finally(() => {
      // uni.hideLoading()
    })
}
// 点赞 end

// 使用 ref 来存储防抖函数的引用
const debouncedCreateComment = ref<(() => Promise<void>) | null>(null)
const debouncedToUserHomeRef = ref<((memberId: number) => void) | null>(null)

onMounted(() => {
  // 确保只初始化一次
  if (!debouncedCreateCommentRef.value) {
    debouncedCreateCommentRef.value = debounce(
      async () => {
        if (sendLoading.value) return
        await publishComment()
      },
      1000,
      {
        leading: false,
        trailing: true,
      },
    )
  }

  if (!debouncedToUserHomeRef.value) {
    debouncedToUserHomeRef.value = debounce(
      (memberId: number) => {
        if (!memberId) return
        toUserHome(memberId)
      },
      300,
      {
        leading: true,
        trailing: false,
      },
    )
  }

  // 监听刷新事件（从编辑页返回后刷新帖子详情）
  uni.$on('refreshPromotionPost', () => {
    if (postId.value) {
      getCommunityPostDetailApi(postId.value).then((res) => {
        if (res.code === 1 && res.data) {
          postDetail.value = res.data
        }
      })
    }
  })
})
// 在组件卸载时清理防抖函数和定时器
onUnmounted(() => {
  if (debouncedCreateComment.value) {
    ;(debouncedCreateComment.value as any).cancel()
  }
  if (pendingFocusTimer) {
    clearTimeout(pendingFocusTimer)
    pendingFocusTimer = null
  }
  uni.$off('refreshPromotionPost')
})

const handleLoadComments = (sort: string) => {
  commentList.value.current_page = 0
  commentSearch.value = sort
  commentList.value.data = []
  getCommentList()
}

const handleDelPost = (id: number, type: 'l1' | 'l2', parentItem?: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }

  message
    .confirm({
      msg: t('social.index.del_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      deletePostApi(id)
        .then(async (res) => {
          if (res.data?.result == 1) {
            toast.show(t('common.delete_success'))

            if (type === 'l1') {
              commentList.value.data = commentList.value.data.filter((it) => it.id !== id)
            } else if (type === 'l2' && parentItem) {
              const beforeLen = parentItem.reply_preview.length
              parentItem.reply_preview = parentItem.reply_preview.filter((r: any) => r.id !== id)
              const afterLen = parentItem.reply_preview.length

              if (beforeLen !== afterLen) {
                parentItem.commit_count = Math.max(0, (parentItem.commit_count || 0) - 1)
              }
            }
          } else {
            toast.show(res.msg || t('group.chat.deleteFailed'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

/** 删除主帖 */
const handleDelMainPost = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  message
    .confirm({ msg: t('social.index.del_post_confirm_txt') })
    .then(() => {
      uni.showLoading()
      deletePostApi(postDetail.value.id)
        .then((res) => {
          if (res.data?.result == 1) {
            toast.show(t('common.delete_success'))
            setTimeout(() => uni.navigateBack(), 500)
          }
        })
        .finally(() => uni.hideLoading())
    })
    .catch(() => {})
}

/** 操作面板的取消关注（直接完全取关，不检查特别关注状态） */
const handleActionSheetUnfollow = async (member: any) => {
  try {
    await message.confirm({ msg: t('social.index.user.follow.cancel') })
  } catch {
    return
  }
  const res = await deleteFollowApi(member.id)
  if (res.code === 1) {
    syncMemberFollowState(member.id, res.data)
    uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
  }
}

/** 关注/取关（用于名称旁的按钮，特别关注时先取消特别关注） */
const handleFollowClick = async (member: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  try {
    // 特别关注 → 取消特别关注，保持关注
    if (member.is_special_following) {
      try {
        await message.confirm({ msg: t('social.index.user.special.cancel.confirm') })
      } catch {
        return
      }
      const res = await setSpecialFollowApi(member.id, 0)
      if (res.code === 1) {
        syncMemberFollowState(member.id, {
          is_following: member.is_following,
          is_mutual_following: member.is_mutual_following,
          is_special_following: 0,
        })
        uni.showToast({ title: t('social.index.user.special.canceled'), icon: 'none' })
      }
    } else if (member.is_following) {
      const confirm = await new Promise<boolean>((resolve) => {
        message
          .confirm({ msg: t('social.index.user.follow.cancel') })
          .then(() => resolve(true))
          .catch(() => resolve(false))
      })
      if (!confirm) return
      const res = await deleteFollowApi(member.id)
      if (res.code === 1) {
        syncMemberFollowState(member.id, res.data)
        uni.showToast({ title: t('social.index.user.follow.canceled'), icon: 'none' })
      }
    } else {
      const res = await createFollowApi(member.id)
      if (res.code === 1) {
        syncMemberFollowState(member.id, res.data)
        uni.showToast({ title: t('social.index.user.follow.success'), icon: 'none' })
      }
    }
  } catch (e) {
    console.error('handleFollowClick failed', e)
  }
}

/** 设为/取消特别关注 */
const handleSpecialFollow = () => {
  const member = reportPostItem.value.member
  const isSpecial = member.is_special_following === 1
  if (isSpecial) {
    message
      .confirm({ msg: t('social.index.user.special.cancel.confirm') })
      .then(() => doSpecialFollow(member, isSpecial))
      .catch(() => {})
  } else {
    doSpecialFollow(member, isSpecial)
  }
}

const doSpecialFollow = (member: any, isSpecial: boolean) => {
  setSpecialFollowApi(member.id, isSpecial ? 0 : 1).then((res) => {
    if (res.code === 1) {
      syncMemberFollowState(member.id, {
        is_following: member.is_following,
        is_mutual_following: member.is_mutual_following,
        is_special_following: res.data.is_special_following,
      })
      uni.showToast({
        title: isSpecial
          ? t('social.index.user.special.canceled')
          : t('social.index.user.special.success'),
        icon: 'none',
      })
    } else {
      toast.show(res.msg || t('common.error'))
    }
  })
}

/** 拉黑用户 */
const handleBlockUser = () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  const item = reportPostItem.value
  message
    .confirm({ msg: t('social.index.report_user_confirm_txt') })
    .then(() => {
      uni.showLoading()
      blockUserApi(item.id)
        .then((res) => {
          if (res.data?.result === 1) {
            // 删除该用户的所有评论
            commentList.value.data = commentList.value.data.filter(
              (i) => i.member_id !== item.member_id,
            )
            // 同时清理剩余评论中该用户的二级回复
            commentList.value.data.forEach((i) => {
              if (i.reply_preview?.length) {
                i.reply_preview = i.reply_preview.filter((r: any) => r.member_id !== item.member_id)
              }
            })
            toast.show(t('common.operation_success'))
          } else {
            toast.show(res.msg || t('common.error'))
          }
        })
        .finally(() => uni.hideLoading())
    })
    .catch(() => {})
}

/** 同步评论中同一作者的关注状态 */
const syncMemberFollowState = (memberId: number, data: any) => {
  // 主帖作者
  if (postDetail.value.member?.id === memberId) {
    postDetail.value.member.is_following = data.is_following
    postDetail.value.member.is_mutual_following = data.is_mutual_following
    postDetail.value.member.is_special_following = data.is_special_following
  }
  // 评论
  commentList.value.data.forEach((comment) => {
    if (comment.member_id === memberId) {
      comment.member.is_following = data.is_following
      comment.member.is_mutual_following = data.is_mutual_following
      comment.member.is_special_following = data.is_special_following
    }
    // 二级评论
    comment.reply_preview?.forEach((reply: any) => {
      if (reply.member_id === memberId) {
        reply.member.is_following = data.is_following
        reply.member.is_mutual_following = data.is_mutual_following
        reply.member.is_special_following = data.is_special_following
      }
    })
  })
}

/** 帖子/评论作者关注按钮信息 */
const getMemberFollowInfo = (member: any) => {
  if (!member || member.is_self) return null
  if (member.is_special_following)
    return { text: t('social.index.user.special.following'), style: 'followed' }
  // return { text: t('social.index.user.special.following'), style: 'special' }
  if (member.is_mutual_following) return { text: '互相关注', style: 'followed' }
  if (member.is_following) return { text: '已关注', style: 'followed' }
  if (member.is_following_me) return { text: '回关', style: 'follow' }
  return { text: '关注', style: 'follow' }
}

const scrollToComment = () => {
  const query = uni.createSelectorQuery()
  query.select('#commentSection').boundingClientRect()
  query.selectViewport().scrollOffset()
  query.exec((res) => {
    if (res[0] && res[1]) {
      const commentTop = res[0].top
      const scrollTop = res[1].scrollTop
      // 计算目标位置，减去导航栏高度（假设为80rpx）
      const targetY = scrollTop + commentTop - uni.upx2px(80)

      uni.pageScrollTo({
        scrollTop: targetY,
        duration: 300,
      })
    }
  })
}

// 滚动到指定id的item锚点
const scrollToAnchor = (targetId: string) => {
  const query = uni.createSelectorQuery()
  query.select('#' + targetId).boundingClientRect()
  query.selectViewport().scrollOffset()
  query.exec((res) => {
    if (res[0] && res[1]) {
      const commentTop = res[0].top
      const scrollTop = res[1].scrollTop
      // 计算目标位置，减去导航栏高度（假设为80rpx）
      const targetY = scrollTop + commentTop - uni.upx2px(80)
      uni.pageScrollTo({
        scrollTop: targetY,
        duration: 300,
        complete: () => {
          // 2. 滚动完成后高亮目标元素
          highlightTargetElement(targetId)
        },
      })
    }
  })
}

// 高亮目标元素3秒（修复版，兼容多端）
const highlightTargetElement = (targetId: string) => {
  // 第一步：设置高亮
  highlightId.value = targetId
  // 第二步：3秒后取消高亮
  setTimeout(() => {
    highlightId.value = ''
  }, 1000)
}

// 跳转用户主页
const toUserHome = (memberId: number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}

// 二级评论点赞
const likeReply = async (replyItem: any, itemId: number) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  // uni.showLoading()
  likePostApi(replyItem.id)
    .then((res) => {
      if (res.code !== 1) {
        toast.show(res.msg || t('common.error'))
        return
      }
      const targetComment = commentList.value.data.find((item) => item.id === itemId)
      if (targetComment) {
        const targetReply = targetComment.reply_preview.find((reply) => reply.id === replyItem.id)

        if (targetReply) {
          targetReply.like_count = res.data.like_count || 0
          targetReply.is_liked = res.data.is_liked || 0

          const timestamp = new Date().getTime()
          if (targetReply.is_liked === 1) {
            targetReply.currentGif = `${GIF_LIKE}?t=${timestamp}`
          } else {
            targetReply.currentGif = `${GIF_UNLIKE}?t=${timestamp}`
          }

          setTimeout(() => {
            targetReply.currentGif = ''
          }, 800)
        }
      }
    })
    .finally(() => {
      // uni.hideLoading()
    })
}

const handleReplyL2 = (replyItem: any, parentItem: any) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }

  replyTarget.value = {
    id: replyItem.id,
    nickname: replyItem.member?.nickname || '',
    type: 'l2',
    parentId: parentItem.id,
  }
  currentRequestId.value = generateUUID()

  // 重置键盘高度，避免上次残留值导致 commentHidden 占位过高输入框弹飞
  keyboardHeight.value = 0
  commentPopupVisible.value = true

  shouldFocus.value = false
  customEmojiList.value = []
  currentOpBtn.value = 'keyboard'
  expressionCategory.value = -1

  // 取消旧的 focus 定时器，设置新的
  if (pendingFocusTimer) clearTimeout(pendingFocusTimer)
  nextTick(() => {
    pendingFocusTimer = setTimeout(() => {
      pendingFocusTimer = null
      if (commentPopupVisible.value) {
        shouldFocus.value = true
      }
    }, 100)
  })
}

const expandReplies = async (item: any) => {
  if (!item.id || item.has_more === 0) return

  uni.showLoading({ title: '加载中...' })

  try {
    let fetchLimit = 5
    if (!item.next_last_id) {
      const firstReply = item.reply_preview?.[0]
      if (firstReply) {
        item.next_last_id = firstReply.id
      } else {
        item.next_last_id = 0
      }

      const hiddenCount = item.hidden_reply_count || 0
      fetchLimit = hiddenCount > 5 ? 5 : hiddenCount
    }
    const res = await getCommunityPostThreadApi(item.id, fetchLimit, item.next_last_id)
    if (res.code === 1) {
      // 格式化新数据
      const newReplies = (res.data.items || []).map((re: any) => {
        const reImgs = Array.isArray(re?.images) ? re.images : []
        const reProcessedImgs = reImgs.map((u: string) => getImageUrl(u))
        return {
          ...re,
          _nickname: formatNickname(re?.member?.nickname || '', 22),
          _time: formatRelativeTime(re?.create_time),
          _images: reProcessedImgs,
          _previewImages: reProcessedImgs,
        }
      })

      if (!item.reply_preview) item.reply_preview = []
      item.reply_preview = [...item.reply_preview, ...newReplies]

      item.next_last_id = res.data.next_last_id
      item.has_more = res.data.has_more

      if (!item.isExpandedStarted) {
        item.isExpandedStarted = true
      }

      if (item.has_more === 0) {
        item.hidden_reply_count = 0
      }
    }
  } catch (error) {
    console.error('展开失败:', error)
  } finally {
    uni.hideLoading()
  }
}

const shareRef = ref<any>(null)
const handleOpenShare = (item: any) => {
  shareRef.value?.openSharePopup(item)
}

// 推广类型列表
const adTypeList = ref<AdTypeItem[]>([])

const doHandlePreview = (images: string[], currentIndex: number = 0) => {
  images = images.map((item) => (item = item + '?x-oss-process=style/sqdt'))
  handlePreview(images, currentIndex)
}

const copyText = (text: string) => {
  uni.setClipboardData({
    data: text,
    success: () => {
      //   toast.show(t('common.copy_success') || '已复制')
    },
  })
}
/** 编辑帖子 */
const handleEditPost = () => {
  toUrl(`/pages/cats/social/publish?id=${postId.value}&edit=true`, false)
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
:deep(.reportSheet) {
  font-family:
    Alimama FangYuanTi VF,
    sans-serif;

  .wd-action-sheet__action--disabled {
    height: 2rpx !important;
    min-height: 2rpx !important;
    margin: 16rpx 0;
    padding: 0 !important;
    background: #f0f0f0;
    pointer-events: none;
    border: none !important;
    overflow: hidden;

    .wd-action-sheet__name {
      display: none;
    }
  }
}
:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
    -webkit-user-select: text;
    user-select: text;
  }
  .socialBox .socialItem .adTitleCard,
  .socialBox .socialItem .adTitleCard * {
    font-family: Alibaba PuHuiTi2 !important;
  }
  .commentBox .commentItem .commentCntBox .commentCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
  .wd-textarea * {
    font-family: Alibaba PuHuiTi2 !important;
  }
}
.socialBox .socialItem .socialCntBox .socialCnt {
  -webkit-user-select: text;
  user-select: text;
}

.adTagsRow {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 16rpx;

  .adTagChip {
    font-size: 24rpx;
    color: #ff6b03;
    // background: rgba(255, 107, 3, 0.08);
    border-radius: 8rpx;
    padding: 6rpx 0;
    font-family: 'Alibaba PuHuiTi2' !important;
  }
}

.page {
  padding-bottom: 120rpx;
  .cnt {
    padding: 0;
  }
}
:deep(.socialMedia) {
  .mediaImg {
    width: 200rpx !important;
    height: 200rpx !important;
    margin-right: 24rpx !important;
  }
  .mediaImg:nth-child(3n) {
    margin-right: 0 !important;
  }
}
:deep(.sendCommentBtn) {
  background: #ff6b03 !important;
}
:deep(.commentPopup) {
  padding: 32rpx;
  padding-bottom: 32rpx !important;
  border-radius: 32rpx 32rpx 0 0 !important;
  .uni-textarea-wrapper {
    max-height: 200rpx;
    overflow-y: scroll;
  }
  .wd-textarea__count,
  .wd-textarea__value {
    background: transparent;
  }
  .opBarBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 64rpx;
    margin-top: 24rpx;
    .opIcon {
      width: 48rpx;
      height: 48rpx;
      background-repeat: no-repeat;
      background-position: center;
      background-size: 100% 100%;
    }
    .opIcon.keyboard {
      background-image: url('/static/images/keyboard@2x.png');
    }
    .opIcon.expression {
      background-image: url('/static/images/expiression@2x.png');
    }
  }

  .pubCommentBox {
    .commentTextAreaBox {
      background-color: #f3f3f4 !important;
      border-radius: 32rpx;

      .emojiBox2 {
        padding: 20rpx;
        .emojiItem2 {
          position: relative;
          display: inline-block;
          width: 112rpx;
          height: 112rpx;
          margin-right: 16rpx;
          margin-bottom: 16rpx;
          .emojiIcon2 {
            width: 100%;
            height: 100%;
          }

          .closeBtb {
            position: absolute;
            top: 0;
            right: 0;
            z-index: 9;
            width: 32rpx;
            height: 32rpx;
            background-image: url('/static/images/emoji_del.png');
            background-repeat: no-repeat;
            background-size: 100%;
          }
        }
      }
    }
  }

  .pubCommentTextArea {
    min-height: 108rpx;
    padding: 24rpx !important;
    padding-bottom: 0 !important;
    background-color: #f3f3f4 !important;
    border-radius: 32rpx;
  }
  .commentHidden {
    width: 100%;
    background-color: #fff;
  }

  // 表情包 start
  .expressionBox {
    width: 100%;
    height: 600rpx;
    padding-top: 24rpx;
    margin-top: 24rpx;
    border-top: 1rpx solid #f3f3f4;

    .category {
      display: flex;
      align-items: center;
      justify-content: start;
      width: 100%;
      height: 64rpx;
      //background-color: #ccc;
      .categoryItem {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 96rpx;
        height: 64rpx;
        margin-right: 24rpx;
        image {
          width: 44rpx;
          height: 44rpx;
        }
      }
      .categoryItem.active {
        background: #f3f3f4;
        border-radius: 84rpx;
      }
    }

    .expressionCnt {
      width: 100%;
      height: 500rpx;
      margin-top: 24rpx;
      // background-color: #ccc;

      .expressionItem {
        display: inline-block;
        width: 112rpx;
        height: 112rpx;
        margin-right: 74rpx;
        margin-bottom: 48rpx;
        image {
          width: 100%;
          height: 100%;
        }
      }
      .expressionItem:nth-child(4n) {
        margin-right: 0;
      }

      .emojiItem {
        display: inline-block;
        width: 64rpx;
        height: 64rpx;
        margin-right: 38rpx;
        margin-bottom: 12rpx;
        .emoji {
          font-size: 48rpx;
        }
      }
      .emojiItem:nth-child(7n) {
        margin-right: 0;
      }
    }
  }
  // 表情包end
}

.fixedCommentBox {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;
  width: calc(100% - 48rpx);
  height: calc(120rpx - 48rpx);
  padding: 24rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #ffffff;
  border-top: 1rpx solid #f3f3f4;
  .commentTextArea {
    width: calc(100% - 48rpx);
    height: calc(100% - 36rpx);
    padding: 18rpx 24rpx;
    font-size: 28rpx;
    font-weight: 400;
    line-height: 36rpx;
    color: rgba(38, 16, 0, 0.3);
    background: #f3f3f4;
    border-radius: 64rpx;
  }
}

.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
}
.socialBox {
  padding: 40rpx;
  padding-bottom: 20rpx;
  background-color: #ffffff;
}
.commentBox {
  flex: 1;
  padding: 40rpx;
  margin-top: 32rpx;
  overflow-y: auto;
  background-color: #ffffff;
  .commentFilterBox {
    display: flex;
    align-items: center;
    justify-content: space-between;
    .opTitle {
      font-size: 28rpx;
      font-weight: 600;
      line-height: 44rpx;
      color: #261000;
    }
    .opBox {
      display: flex;
      align-items: center;
      justify-content: end;
      .opBtn {
        margin-left: 16rpx;
      }
      .opBtn.active {
        color: #ff6b03;
      }
    }
  }

  .commentItem {
    display: flex;
    justify-content: start;
    margin-top: 24rpx;

    .avatarBox {
      position: relative;
      width: 64rpx;
      height: 64rpx;
      margin-right: 16rpx;
      .avatar {
        width: 64rpx;
        height: 64rpx;
        overflow: hidden;
        background-color: #fafafa;
        border: 2rpx solid #f3f3f4;
        border-radius: 50%;
      }
      .levelIcon {
        position: absolute;
        right: -4rpx;
        bottom: 0;
        width: 28rpx;
        height: 28rpx;
        image {
          width: 100%;
          height: 100%;
        }
      }
    }

    .commentCntBox {
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: calc(100% - 64rpx - 16rpx);
      .nickname {
        font-size: 24rpx;
        font-weight: 400;
        line-height: 36rpx;
        color: #999999;
        // margin-bottom: 6rpx;
      }
      .commentCnt {
        font-size: 28rpx;
        font-weight: 400;
        line-height: 40rpx;
        color: #261000;
        word-break: break-all;
      }
      .commentMedia {
        display: flex;
        align-items: center;
        margin-top: 12rpx;
        .mediaImg {
          width: 100rpx;
          height: 100rpx;
          margin-right: 16rpx;
        }
        .mediaImg:nth-child(3n) {
          margin-right: 0;
        }
      }
      .commentFoot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 12rpx;
        .time {
          font-size: 24rpx;
          font-weight: 400;
          line-height: 36rpx;
          color: #999999;
        }

        .rightBox {
          display: flex;
          align-items: center;
          justify-content: end;

          .likeBox {
            display: flex;
            align-items: center;
            position: relative;
            .zanWrapper {
              width: 70rpx !important;
              height: 70rpx !important;
              position: absolute !important;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              display: inline-flex !important;
              align-items: center;
              justify-content: center;
              overflow: visible !important;
            }
            .Icon {
              position: absolute !important;
              width: 100% !important;
              height: 100% !important;
              left: 0 !important;
              top: 0 !important;
              display: block !important;
              pointer-events: none !important;
            }
            .likeTxt {
              margin-left: 4rpx;
              font-size: 24rpx;
              font-weight: 400;
              color: #999999;
            }
          }

          .delBox,
          .jbBox {
            width: 32rpx;
            height: 32rpx;
            margin-left: 24rpx;
            background-image: url('@/static/images/trush@2x.png');
            background-repeat: no-repeat;
            background-size: 100% 100%;
          }
          .jbBox {
            background-image: url('@/static/images/jb.png');
          }
        }
      }
    }
  }
  .highlight {
    background-color: #f0f0f0 !important; // 加!important确保覆盖原有样式
    transition: background-color 0.3s ease;
  }
}

.replyList {
  //   margin-left: 80rpx;
  margin-top: 16rpx;
}
.replyCollapse {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
  .arrow {
    width: 0;
    height: 0;
    border-left: 6rpx solid transparent;
    border-right: 6rpx solid transparent;
    border-top: 6rpx solid #999;
    transition: transform 0.2s;
    &.up {
      transform: rotate(180deg);
    }
  }
}
.replyListCnt {
  margin-top: 12rpx;
}
.authorTag {
  padding: 0 18rpx;
  font-size: 22rpx;
  margin-left: 8rpx;
  font-weight: 400;
  line-height: 1;
  height: 40rpx;
  color: #ff6b03;
  background: #fff1e5;
  border-radius: 16px;
  vertical-align: middle;
  display: flex;
  align-items: center;
}
.replyItem {
  margin-bottom: 16rpx;
}
.replyHeader {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 6rpx;
}
.replyAvatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #f5f5f5;
}
.replyAvatarWrap {
  position: relative;
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}
.replyLevelIcon {
  position: absolute;
  right: -6rpx;
  bottom: 0rpx;
  width: 20rpx;
  height: 20rpx;
  image {
    width: 100%;
    height: 100%;
  }
}
.replyContent {
  padding-left: 48rpx;
}
.replyCollapse {
  padding-left: 48rpx;
}

.share-container {
  background-color: #fff;
  padding: 40rpx 0 60rpx;
  position: relative;

  .close-icon {
    position: absolute;
    right: 30rpx;
    top: 30rpx;
    padding: 10rpx;
    z-index: 10;

    &:active {
      opacity: 0.6;
    }
  }

  .share-title {
    text-align: center;
    margin-bottom: 50rpx;

    font-size: 28rpx;
    font-weight: 600;
    line-height: 44rpx;
    color: #261000;
    font-family:
      Alimama FangYuanTi VF,
      sans-serif;
  }

  .share-grid {
    display: flex;
    flex-wrap: wrap;
    padding: 0 20rpx;

    .share-item {
      width: 25%;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 20rpx;

      .share-icon {
        width: 46rpx;
        height: 46rpx;
        margin-bottom: 16rpx;
      }

      .share-text {
        font-size: 24rpx;
        color: #666;
        font-family:
          Alimama FangYuanTi VF,
          sans-serif;
      }
    }
  }
}
.zanWrapper {
  width: 85rpx !important;
  height: 85rpx !important;
  position: relative !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  flex-shrink: 0 !important;
  vertical-align: middle;
  margin: 0 -22rpx !important;
  overflow: visible !important;

  .Icon {
    position: absolute !important;
    width: 100% !important;
    height: 100% !important;
    left: 0 !important;
    top: 0 !important;
    display: block !important;
    pointer-events: none !important;
  }
}

.adTitleCard {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 24rpx 0;
  padding: 24rpx 0;
  background: #ffffff;
  border-radius: 16rpx;
  font-family: Alibaba PuHuiTi2 !important;

  .adTypeTag {
    flex-shrink: 0;
    padding: 4rpx 16rpx;
    font-size: 24rpx;
    color: #fff;
    background: var(--wot-color-primary);
    border-radius: 8rpx;
    line-height: 1.4;
    font-family: Alibaba PuHuiTi2 !important;
  }
  .adTitle {
    font-size: 32rpx;
    font-weight: 600;
    color: #261000;
    line-height: 1.4;
    font-family: Alibaba PuHuiTi2 !important;
    span {
      font-family: Alibaba PuHuiTi2 !important;
    }
    .zh-Hans * {
      font-family: Alibaba PuHuiTi2 !important;
    }
  }
}
.promotionCard {
  margin-top: 24rpx;
  padding: 24rpx;
  padding-bottom: 0;
  background: #fff2eb;
  border-radius: 16rpx;
  font-family: Alibaba PuHuiTi2 !important;
  border: 1px solid #f8efe6;
  .promotionCardTitle {
    font-size: 28rpx;
    font-weight: 600;
    color: #261000;
    margin-bottom: 16rpx;
  }
  .promotionRow {
    display: flex;
    align-items: center;
    padding: 24rpx 0;
    border-bottom: 1px solid #f8efe6;
    // padding-bottom: 18rpx;
    .promotionIcon {
      margin-right: 18rpx;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
    }
    .promotionLabel {
      width: 140rpx;
      font-size: 26rpx;
      color: #666;
      flex-shrink: 0;
    }
    .promotionValue {
      flex: 1;
      font-size: 26rpx;
      color: #333;
    }
    .copyBtn {
      flex-shrink: 0;
      font-size: 26rpx;
      color: #666;
      margin-left: 16rpx;
    }
  }
}

.reportTip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 16rpx;
  font-family: Alibaba PuHuiTi2 !important;
  .reportTipIcon {
    flex-shrink: 0;
  }
  .reportTipText {
    font-size: 24rpx;
    color: #999;
  }
}

/* ========== 关注按钮 ========== */
.nameWrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
  .metaRow {
    display: flex;
    align-items: center;
    font-family: Alibaba PuHuiTi2 !important;
    margin-left: 16rpx;
    .metaTime {
      font-size: 24rpx;
      color: #999;
    }
    .metaSeparator {
      font-size: 24rpx;
      color: #999;
      margin: 0 4rpx;
    }
    .metaPublished {
      font-size: 24rpx;
      color: #999;
    }
    .metaZone {
      font-size: 24rpx;
      color: #ff6b03;
      margin-left: 4rpx;
    }
  }
}
.followBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40rpx;
  padding: 0 20rpx;
  border-radius: 22rpx;
  font-size: 22rpx;
  line-height: 1;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1rpx solid transparent;
  background-color: #ff6b03;
  color: #fff;
  position: absolute;
  right: 48rpx;
  top: 0;
  &.followed {
    background-color: #ffffff;
    color: #999;
    border-color: #ddd;
  }
  &.special {
    background: linear-gradient(135deg, #fff7e5 0%, #fff0d6 100%);
    color: #ff6b03;
    border-color: #ff6b03;
    font-weight: 600;
  }
}
</style>

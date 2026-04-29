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
    <custom-nav2 :title="t('social.detail.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="container">
          <view class="socialBox">
            <view class="socialItem">
              <view class="socialHead">
                <view class="avatarBox" @click="toUserHome(postDetail?.member_id)">
                  <image
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
                <view class="name">{{ formatNickname(postDetail?.member?.nickname, 22) }}</view>
                <view
                  v-if="postDetail.tag?.name"
                  class="tag"
                  :class="postDetail.tag?.extend_json?.class"
                >
                  {{ postDetail.tag?.name }}
                </view>
              </view>
              <view class="socialCntBox">
                <view class="socialCnt">
                  <view class="socialTips" v-if="postDetail.is_approved === 0">
                    {{ t('social.detail.content.not_audit_seed_myself') }}
                  </view>
                  {{ postDetail.content }}
                </view>
                <view
                  class="socialMedia"
                  v-if="postDetail?.images?.length > 0"
                  :class="{ mediaImg4: postDetail.images.length === 4 }"
                >
                  <template v-for="(image, index) in postDetail.images" :key="index">
                    <wd-img
                      custom-class="mediaImgItem"
                      mode="widthFix"
                      :src="getImageUrl(image + '?x-oss-process=style/jzcq')"
                      :enable-preview="false"
                      @click="handlePreview(postDetail.images, index)"
                    />
                  </template>
                </view>
                <view class="socialTime">
                  {{ formatRelativeTime(postDetail.create_time) }}
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
                <view class="socialBtnBox" @click="likePost(postDetail.id)">
                  <view class="socialBtnIcon zan" :class="{ on: postDetail.is_liked === 1 }"></view>
                  <view class="socialBtn">{{ postDetail.like_count }}</view>
                </view>
                <view class="socialBtnBox" @click="toShare(postDetail)">
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
                <view class="avatarBox" @click.stop="toUserHome(item.member_id)">
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
                  <view class="nickname">{{ item._nickname }}</view>
                  <view class="commentCnt">
                    <view class="socialTips" v-if="item.is_approved === 0">
                      {{ t('social.detail.content.not_audit_seed_myself') }}
                    </view>
                    {{ item.content }}
                  </view>
                  <view class="commentMedia" v-if="item?._images?.length > 0">
                    <template v-for="(img, index) in item._images" :key="index">
                      <wd-img
                        custom-class="mediaImg"
                        :src="img"
                        :enable-preview="false"
                        @click="handlePreview(item._previewImages, index, false)"
                      />
                    </template>
                  </view>
                  <view class="commentFoot">
                    <view class="time">{{ item._time }}</view>
                    <view class="rightBox">
                      <view class="likeBox" @click.stop="likeComment(item.id)">
                        <view class="likeIcon" :class="{ on: item.is_liked === 1 }"></view>
                        <view class="likeTxt">{{ item.like_count }}</view>
                      </view>
                      <view
                        class="delBox"
                        v-if="userStore.userInfo?.member_id === item.member_id"
                        @click.stop="handleDelPost(item.id, 'l1')"
                      ></view>
                      <view class="jbBox" v-else @click.stop="handleReportPost(item.id)"></view>
                    </view>
                  </view>

                  <!-- 二级评论 -->
                  <view
                    class="replyList"
                    v-if="item.reply_preview && item.reply_preview.length > 0"
                  >
                    <view class="replyListCnt">
                      <view
                        class="replyItem"
                        v-for="reply in item.reply_preview"
                        :key="reply.id"
                        @click.stop="handleReplyL2(reply, item)"
                      >
                        <view class="replyHeader">
                          <image
                            class="replyAvatar"
                            :src="getImageUrl(reply.member.avatar + '?x-oss-process=style/jzcq')"
                            mode="aspectFill"
                            @click.stop="toUserHome(reply.member.id)"
                          />
                          <view class="replyNickname" @click.stop="toUserHome(reply.member.id)">
                            <text class="nickname">{{ reply.member.nickname }}</text>
                          </view>
                        </view>

                        <view class="replyContent">
                          <view class="commentCnt" v-if="reply.reply_to_id !== item.id">
                            {{ t('social.detail.comment.reply_prefix') }}
                            <text
                              class="nickname replyNickname"
                              @click.stop="toUserHome(reply.member.id)"
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
                                @click="handlePreview(reply._previewImages, index, false)"
                              />
                            </template>
                          </view>

                          <view class="commentFoot">
                            <view class="time">{{ reply._time }}</view>
                            <view class="rightBox">
                              <view class="likeBox" @click.stop="likeReply(reply, item.id)">
                                <view class="likeIcon" :class="{ on: reply.is_liked === 1 }"></view>
                                <view class="likeTxt">{{ reply.like_count }}</view>
                              </view>
                              <view
                                class="delBox"
                                v-if="userStore.userInfo?.member_id === reply.member_id"
                                @click.stop="handleDelPost(reply.id, 'l2', item)"
                              ></view>
                              <view
                                class="jbBox"
                                v-else
                                @click.stop="handleReplyReportPost(reply, item.id)"
                              ></view>
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
  reportPostApi,
  getCommunityPostThreadApi,
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

// 防抖
const debouncedCreateCommentRef = ref<(() => Promise<void>) | null>(null)

// 语言
const locale = uni.getLocale()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage('wd-message-box-slot')

const postId = ref<number>(0)

const currentRequestId = ref('')

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

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
            parentComment.reply_preview = threadRes.data.items.map((re: any) => {
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

  commentPopupVisible.value = true
  // 重置焦点状态
  shouldFocus.value = false
  customEmojiList.value = []
  currentOpBtn.value = 'keyboard'
  expressionCategory.value = -1

  // 使用nextTick确保DOM更新
  nextTick(() => {
    // 使用setTimeout确保在下一个事件循环中设置焦点
    setTimeout(() => {
      shouldFocus.value = true
    }, 100)
  })
}

// 修改handleCloseCommentPopup方法
const handleCloseCommentPopup = () => {
  commentPopupVisible.value = false
  shouldFocus.value = false
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
  if (options.id) {
    postId.value = Number(options.id)
    // uni.showLoading()
    // 获取评论列表
    getCommentList()
    getCommunityPostDetailApi(Number(options.id))
      .then((res) => {
        postDetail.value = res.data
      })
      .finally(() => {
        if (options.showComment === 'true') {
          uni.hideLoading()
          setTimeout(() => {
            if (commentList.value?.data?.length === 0) {
              showCommentPopup()
            } else {
              if (options.commentId) scrollToAnchor('commentItem_' + options.commentId)
              else scrollToComment()
            }
            // uni.hideLoading()
          }, 3000)
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
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  // uni.showLoading()
  likePostApi(id)
    .then((res) => {
      if (res.code !== 1) {
        toast.show(res.msg || t('common.error'))
        return
      }
      postDetail.value.like_count = res.data.like_count || 0
      postDetail.value.is_liked = res.data.is_liked || 0
    })
    .finally(() => {
      // uni.hideLoading()
    })
}

const likeComment = (id: number) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  // uni.showLoading()
  likePostApi(id)
    .then((res) => {
      if (res.code !== 1) {
        toast.show(res.msg || t('common.error'))
        return
      }
      commentList.value.data.find((item) => item.id === id).like_count = res.data.like_count || 0
      commentList.value.data.find((item) => item.id === id).is_liked = res.data.is_liked || 0
    })
    .finally(() => {
      // uni.hideLoading()
    })
}
// 点赞 end

const toShare = (post: getPostDetailResponse) => {
  if (userStore.isLogin === false) {
    toUrl('/pages/cats/login', true)
    return
  }
  let twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(post.content)
  if (post.images.length > 0) {
    const twitterCardUrl =
      import.meta.env.VITE_SERVER_BASEURL + '/v1/community/post/share-to-twitter?id=' + post.id
    twitterUrl += '&url=' + encodeURIComponent(twitterCardUrl)
  }
  openUrl(twitterUrl)
}

// 使用 ref 来存储防抖函数的引用
const debouncedCreateComment = ref<(() => Promise<void>) | null>(null)
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
})
// 在组件卸载时清理防抖函数
onUnmounted(() => {
  if (debouncedCreateComment.value) {
    ;(debouncedCreateComment.value as any).cancel()
  }
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
            toast.show(t('common.toast.del_success'))

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
            toast.show(res.msg || t('common.toast.del_failed'))
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}

const handleReplyReportPost = (replyItem: any, itemId: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  message
    .confirm({
      msg: t('social.index.report_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      reportPostApi(replyItem.id)
        .then((res) => {
          if (res.data?.result === 1) {
            const targetComment = commentList.value.data.find((item) => item.id === itemId)
            if (targetComment) {
              targetComment.reply_preview = targetComment.reply_preview.filter(
                (reply) => reply.id !== replyItem.id,
              )
            }
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
}
const handleReportPost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  // 举报并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.report_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      reportPostApi(id)
        .then((res) => {
          if (res.data?.result === 1) {
            commentList.value.data = commentList.value.data.filter((item) => item.id !== id)
          }
        })
        .finally(() => {
          uni.hideLoading()
        })
    })
    .catch(() => {})
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
  commentPopupVisible.value = true

  shouldFocus.value = false
  customEmojiList.value = []
  currentOpBtn.value = 'keyboard'
  expressionCategory.value = -1

  nextTick(() => {
    setTimeout(() => {
      shouldFocus.value = true
    }, 100)
  })
}

const expandReplies = async (item: any) => {
  if (!item.id || item.has_more === 0) return

  uni.showLoading({ title: '加载中...' })

  try {
    let fetchLimit = 5
    if (!item.next_last_id) {
      item.next_last_id = item.reply_preview[0].id
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
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
:deep(.zh-Hans, .zh-Hant) {
  .socialBox .socialItem .socialCntBox .socialCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
  .commentBox .commentItem .commentCntBox .commentCnt {
    font-family: Alibaba PuHuiTi2 !important;
  }
  .wd-textarea * {
    font-family: Alibaba PuHuiTi2 !important;
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
            justify-content: center;
            .likeIcon {
              width: 32rpx;
              height: 32rpx;
              //background-image: url('@/static/images/comment_like@2x.png');
              background-image: url('@/static/images/zan@2x.png');
              background-repeat: no-repeat;
              background-size: 100% 100%;
            }
            .likeIcon.on {
              //background-image: url('@/static/images/comment_like_on@2x.png');
              background-image: url('@/static/images/zan_on@2x.png');
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
</style>

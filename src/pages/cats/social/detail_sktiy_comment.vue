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
        <view class="mask" v-if="isCommentFixed"></view>
        <view class="socialBox">
          <view class="socialItem">
            <view class="socialHead">
              <view class="avatarBox" @click="toUserHome(postDetail?.member_id)">
                <image
                  class="avatar"
                  :src="getImageUrl(postDetail?.member?.avatar + '?x-oss-process=style/jzcq')"
                  mode="widthFix"
                />
                <view class="levelIcon">
                  <image
                    :src="`/static/images/level/${postDetail.member?.level}.png`"
                    mode="scaleToFill"
                  />
                </view>
              </view>
              <view class="name">{{ postDetail?.member?.nickname }}</view>
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
                <template v-if="postDetail.images.length > 1">
                  <template v-for="(image, index) in postDetail.images" :key="index">
                    <wd-img
                      custom-class="mediaImgItem"
                      mode="widthFix"
                      :src="getImageUrl(image + '?x-oss-process=style/jzcq')"
                      :preview-src="postDetail.images.map((item) => getImageUrl(item))[index]"
                      :enable-preview="true"
                    />
                  </template>
                </template>
                <template v-else>
                  <wd-img
                    custom-class="mediaImgItem"
                    mode="widthFix"
                    :src="getImageUrl(postDetail.images[0])"
                    :enable-preview="true"
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

        <view class="commentBox" id="commentSection" :class="{ 'comment-fixed': isCommentFixed }">
          <view class="commentFilterBox">
            <view class="fixedCommentClose" @click="handleTouch">
              <view class="closeBtb2"></view>
            </view>
            <view class="commentFilterBoxFixed">
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
          </view>
          <template v-if="commentList.data.length === 0">
            <view class="emptyBox" style="height: 300rpx; opacity: 0.4">
              <view class="emptyTxt">{{ t('social.detail.comment.empty') }}</view>
            </view>
          </template>
          <template v-else>
            <view class="commentItem" v-for="(item, index) in commentList.data" :key="index">
              <view class="avatarBox" @click="toUserHome(item.member_id)">
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
                <view class="nickname">{{ item.member.nickname }}</view>
                <view class="commentCnt">
                  <view class="socialTips" v-if="item.is_approved === 0">
                    {{ t('social.detail.content.not_audit_seed_myself') }}
                  </view>
                  {{ item.content }}
                </view>
                <view class="commentMedia" v-if="item?.images?.length > 0">
                  <template v-for="(image, index) in item.images" :key="index">
                    <wd-img
                      custom-class="mediaImg"
                      :src="getImageUrl(image)"
                      :enable-preview="true"
                      :preview-src="item.images.map((item) => getImageUrl(item))[index]"
                    />
                  </template>
                </view>
                <view class="commentFoot">
                  <view class="time">{{ formatRelativeTime(item.create_time) }}</view>
                  <view class="rightBox">
                    <view class="likeBox" @click="likeComment(item.id)">
                      <view class="likeIcon" :class="{ on: item.is_liked === 1 }"></view>
                      <view class="likeTxt">{{ item.like_count }}</view>
                    </view>
                    <view
                      class="delBox"
                      v-if="userStore.userInfo?.member_id === item.member_id"
                      @click="handleDelPost(item.id)"
                    ></view>
                    <view class="jbBox" v-else @click="handleReportPost(item.id)"></view>
                  </view>
                </view>
              </view>
            </view>
          </template>
        </view>
      </template>
      <template #footer>
        <view class="fixedCommentBox" style="z-index: 1002">
          <view class="commentTextArea" @click="showCommentPopup">
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
          :z-index="1003"
        >
          <view class="pubCommentBox">
            <view class="commentTextAreaBox">
              <wd-textarea
                v-model="commentContent"
                :placeholder="t('social.detail.comment.placeholder')"
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
                  @click="debouncedCreateComment"
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
    <wd-message-box :zIndex="1004" selector="wd-message-box-slot" />
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
} from '@/service/api/community'
import { formatRelativeTime, getImageUrl, openUrl, toUrl } from '@/utils'
import { LoadMoreState } from 'wot-design-uni/components/wd-loadmore/types'
import { useToast, useMessage } from 'wot-design-uni'
import { useUserStore } from '@/store'
import { debounce } from 'lodash-es'

import CustomNav2 from '@/components/CustomNav/CustomNav2.vue'

// 语言
const locale = uni.getLocale()
const userStore = useUserStore()
const toast = useToast()
const message = useMessage('wd-message-box-slot')

// 滚动到顶部
const scrollTop = ref<number>(0)
onPageScroll((e) => {
  scrollTop.value = e.scrollTop
  scrollPosition.value = e.scrollTop
})

const commentPopupVisible = ref(false)
// const handleCloseCommentPopup = () => {
//   commentPopupVisible.value = false
// }

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

  try {
    sendLoading.value = true
    commitPostApi(postId.value, commentContent.value, customEmojiList.value).then((res) => {
      if (res.code == 1) {
        toast.show(t('common.toast.comment_success'))
        // 评论成功后，重置状态
        commentList.value.current_page = 0
        getCommentList()
        // 关闭评论弹出层
        handleCloseCommentPopup()
        commentContent.value = ''
        customEmojiList.value = []
        sendLoading.value = false
      } else {
        toast.show(res.msg)
      }
    })
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
const showCommentPopup = () => {
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
const postId = ref<number>(0)

const emotionList = ref<getCommunityEmotionListItem[]>([])

const commentSearch = ref('latest')

onLoad((options) => {
  if (options.id) {
    postId.value = Number(options.id)
    uni.showLoading()
    getCommunityPostDetailApi(Number(options.id))
      .then((res) => {
        postDetail.value = res.data
      })
      .finally(() => {
        uni.hideLoading()
      })

    // 获取评论列表
    getCommentList()

    // 加载表情列表
    getCommunityEmotionListByCategoryApi().then((res) => {
      emotionList.value = res.data
    })
  }

  // 检查是否需要固定评论
  if (options?.showComment) {
    isCommentFixed.value = true
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

const getCommentList = () => {
  state.value = 'loading'
  uni.showLoading()
  getCommunityPostCommentListApi(
    postId.value,
    commentSearch.value,
    commentList.value?.current_page + 1,
  )
    .then((res) => {
      commentList.value = res.data
      if (commentList.value?.current_page === commentList.value?.last_page) {
        state.value = 'finished'
      }

      if (commentList.value?.data?.length === 0) {
        showCommentPopup()
      }
    })
    .finally(() => {
      uni.hideLoading()
    })
}

onReachBottom(() => {
  if (commentList.value?.current_page < commentList.value?.last_page) {
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
  debouncedCreateComment.value = debounce(publishComment, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
  })
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
  getCommentList()
}

const handleDelPost = (id: number) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true)
    return
  }
  //  删除并刷新页面（或者删去当前列表项）
  message
    .confirm({
      msg: t('social.index.del_post_confirm_txt'),
    })
    .then(() => {
      uni.showLoading()
      deletePostApi(id)
        .then((res) => {
          if (res.data?.result == 1) {
            commentList.value.data = commentList.value.data.filter((item) => item.id !== id)
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

const isCommentFixed = ref(false)
const scrollPosition = ref(0)
// 处理触摸事件
const handleTouch = () => {
  if (isCommentFixed.value) {
    isCommentFixed.value = false
    // 恢复滚动位置
    nextTick(() => {
      uni.pageScrollTo({
        scrollTop: scrollPosition.value,
        duration: 0,
      })
    })
  }
}

// 跳转用户主页
const toUserHome = (memberId: number) => {
  uni.navigateTo({
    url: `/pages/cats/user/home?member_id=${memberId}`,
  })
}
</script>

<style lang="scss" scoped>
@import '/src/style/base';
@import '/src/style/social';
.page {
  padding-bottom: 120rpx;
  .cnt {
    padding: 0;
  }
}
:deep(.wd-message-box) {
  z-index: 1004 !important;
}
:deep(.wd-overlay) {
  z-index: 1003 !important;
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
:deep(uni-toast) {
  // 这个地方是正确的，不需要签名.号
  z-index: 1005 !important;
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

.socialBox {
  padding: 40rpx;
  padding-bottom: 20rpx;
  background-color: #ffffff;
}
.commentBox {
  padding: 40rpx;
  padding-bottom: 160rpx;
  margin-top: 16rpx;
  background-color: #ffffff;
  .commentFilterBox {
    background-color: #fff;
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
}

// 处理评论区域滚动 start
/* 遮罩层样式 */
.mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  transition: opacity 0.3s ease;
}

.commentBox {
  position: relative;
  z-index: 1;
  padding: 40rpx;
  padding-bottom: 160rpx;
  margin-top: 16rpx;
  background-color: #ffffff;

  .fixedCommentClose {
    position: relative;
    display: none;
    width: 100%;
    height: 80rpx;
    .closeBtb2 {
      position: absolute;
      top: 40rpx;
      right: 0;
      z-index: 1003;
      width: 40rpx;
      height: 40rpx;
      background-image: url('@/static/images/emoji_del.png');
      background-repeat: no-repeat;
      background-size: 100% 100%;
    }
  }

  &.comment-fixed {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1001; // 确保在遮罩层上方
    height: 70vh;
    padding-top: 0;
    overflow-y: auto;
    background: #fff;
    border-radius: 24rpx 24rpx 0 0;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease;

    .fixedCommentClose {
      display: block;
    }
  }

  .commentFilterBox {
    position: sticky;
    top: 0;
    z-index: 10;

    .commentFilterBoxFixed {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 20rpx 0;
      margin-bottom: 20rpx;
      background: #fff;

      .opTitle {
        font-size: 28rpx;
        font-weight: 600;
        line-height: 44rpx;
        color: #261000;
      }

      .opBox {
        display: flex;
        align-items: center;

        .opBtn {
          padding: 8rpx 16rpx;
          margin-left: 16rpx;
          font-size: 24rpx;
          color: #999;
          background: #f5f5f5;
          border-radius: 30rpx;

          &.active {
            color: #fff;
            background: #ff6b03;
          }
        }
      }
    }
  }
}

// 处理评论区域滚动 end
</style>

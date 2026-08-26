<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Publish',
    backgroundColor: '#f7f6f4',
    softinputMode: 'adjustResize',
  },
}
</route>
<template>
  <view
    :style="{
      '--message-nav-height': navHeight + 'rpx',
      '--keyboard-height': keyboardHeight + 'px',
    }"
  >
    <wd-tabs
      v-model="activeCategory"
      @click="handleCategoryChange"
      :line-width="20"
      :style="{ paddingTop: navHeight + 'rpx' }"
      custom-class="custom-tab"
      v-if="!isEditMode && !isDraftEdit && isCatHolder"
    >
      <wd-tab
        v-for="item in categoryList"
        :key="item.value"
        :title="item.label"
        :name="item.value"
      ></wd-tab>
    </wd-tabs>
    <view v-else :style="{ paddingTop: navHeight - 80 + 'rpx' }"></view>
    <custom-nav
      :title="pageTitle"
      pageBackgroundColor="#f7f6f4"
      :paddingBottom="contentPaddingBottom"
    >
      <!-- <template #right>
        <view
          v-if="activeCategory === 'normal'"
          class="kf"
          :class="{ disabled: !isPublish }"
          @click.stop="debouncedCreatePost"
        >
          {{ t('publish.index.header.publish_btn') }}
        </view>
      </template> -->
      <template #default>
        <!-- 内容卡片 -->
        <view class="card title-card" v-if="activeCategory === 'promotion'">
          <view class="cardTitle">
            {{ t('publish.index.promotion.post_title') }}
            <text class="required">*</text>
          </view>

          <wd-input
            v-model="title"
            :placeholder="t('publish.index.promotion.title.placeholder')"
            custom-class="pubInput"
            clearable
            :ignoreCompositionEvent="false"
            :maxlength="30"
            show-word-limit
            :cursor-spacing="100"
            hold-keyboard
          />
          <view class="tip">{{ t('publish.index.promotion.title.tip') }}</view>
        </view>
        <view class="card">
          <template v-if="activeCategory === 'promotion'">
            <view class="cardTitle">
              {{ t('publish.index.promotion.title') }}
              <text class="required">*</text>
            </view>
            <view class="txtBox">
              <wd-textarea
                v-model="promotionContent"
                :placeholder="t('publish.index.content.placeholder')"
                custom-textarea-class="pubTextArea"
                auto-height
                :maxlength="1000"
                show-word-limit
                :ignoreCompositionEvent="false"
                :cursor-spacing="100"
                hold-keyboard
              />
            </view>
            <view class="tagBar">
              <wd-img
                src="/static/images/label.png"
                width="68rpx"
                mode="widthFix"
                @click="openTagPopup"
              ></wd-img>
              <view class="selectedTagsBox" v-if="selectedTagList.length > 0">
                <view v-for="tag in selectedTagList" :key="tag.id" class="tagChip">
                  <text class="tagChipText"># {{ tag.value.replace(/^#/, '') }}</text>
                  <text class="tagChipClose" @click="removeSelectedTag(tag)">×</text>
                </view>
              </view>
            </view>
          </template>
          <view class="txtBox" v-if="activeCategory === 'normal'">
            <wd-textarea
              v-model="postContent"
              :placeholder="t('publish.index.content.placeholder')"
              custom-textarea-class="pubTextArea"
              auto-height
              :maxlength="1000"
              show-word-limit
              :ignoreCompositionEvent="false"
              :auto-focus="true"
              :cursor-spacing="100"
              hold-keyboard
            />
          </view>
          <view class="uploadBox">
            <wd-upload
              :file-list="fileList"
              multiple
              :limit="9"
              :size-type="['original']"
              :action="ossConfig?.host"
              :build-form-data="buildFormData"
              @change="handleChange"
              @success="handleOssUploadSuccess"
              custom-class="pubUpload"
            ></wd-upload>
          </view>
        </view>

        <!-- 普通模式发布卡片 -->
        <view v-if="activeCategory === 'normal'" class="card">
          <!-- 保存草稿按钮 -->
          <view
            v-if="!isEditMode || isDraftEdit"
            class="adBtn draftBtn"
            :class="{ disabled: !isPublish }"
            @click.stop="debouncedCreatePost?.(0)"
          >
            {{ t('publish.index.promotion.draft_btn') }}
          </view>

          <!-- 发布按钮 -->
          <view
            class="adBtn publishBtn"
            :class="{ disabled: !isPublish }"
            @click.stop="debouncedCreatePost?.(1)"
          >
            {{ t('publish.index.header.publish_btn') }}
          </view>
        </view>

        <!-- 推广表单 -->
        <template v-if="activeCategory === 'promotion'">
          <!-- 推广类型卡片 -->
          <view class="card">
            <view class="cardTitle">
              {{ t('publish.index.promotion.type') }}
              <text class="required">*</text>
            </view>
            <view class="typeGrid">
              <view
                v-for="item in promotionTypes"
                :key="item.value"
                class="typeChip"
                :class="{ active: promotionType === item.id }"
                @click="promotionType = item.id"
              >
                {{ item.name }}
              </view>
            </view>
          </view>

          <!-- 联系方式卡片 -->
          <view class="card">
            <view class="cardTitle">{{ t('publish.index.promotion.contact') }}</view>
            <view class="contactItem">
              <view class="formLabel">{{ t('publish.index.promotion.email') }}</view>

              <wd-input
                type="text"
                v-model="contactEmail"
                :placeholder="t('publish.index.promotion.email.placeholder')"
                @change="handleChange"
                custom-class="pubInput"
                clearable
                inputmode="email"
                :adjust-position="true"
                :cursor-spacing="100"
                :focus-when-clear="false"
                hold-keyboard
              />
            </view>
            <view class="contactItem">
              <view class="formLabel">{{ t('publish.index.promotion.wechat') }}</view>
              <wd-input
                v-model="contactWechat"
                :placeholder="t('publish.index.promotion.wechat.placeholder')"
                custom-class="pubInput"
                clearable
                :adjust-position="true"
                :cursor-spacing="100"
                :focus-when-clear="false"
                hold-keyboard
              />
            </view>
          </view>
        </template>

        <!-- 推广模式发布卡片 -->
        <view v-if="activeCategory === 'promotion'" class="card">
          <!-- 可见范围 -->
          <!-- <view class="visibilityRow">
            <view class="visibilityOption" @click="visibility = 'public'">
              <view class="visibilityRadio" :class="{ checked: visibility === 'public' }">
                <view v-if="visibility === 'public'" class="radioDot"></view>
              </view>
              <text class="visibilityText">{{ t('publish.index.promotion.visibility') }}</text>
            </view>
            <view class="visibilityOption" @click="visibility = 'friends'">
              <view class="visibilityRadio" :class="{ checked: visibility === 'friends' }">
                <view v-if="visibility === 'friends'" class="radioDot"></view>
              </view>
              <text class="visibilityText">
                {{ t('publish.index.promotion.visibility_friends_only') }}
              </text>
            </view>
          </view> -->

          <!-- 阅读并同意协议 -->
          <!-- <view class="agreementRow" @click="hasAgreed = !hasAgreed">
            <view class="agreementCheckbox" :class="{ checked: hasAgreed }">
              <wd-icon name="check" size="24rpx" color="#ffffff" />
            </view>
            <text class="agreementText">{{ t('publish.index.promotion.agreement') }}</text>
          </view> -->

          <!-- 保存草稿按钮 -->
          <view
            v-if="!isEditMode || isDraftEdit"
            class="adBtn draftBtn"
            :class="{ disabled: !isAddDraft }"
            @click.stop="debouncedCreatePromotionPost(0)"
          >
            {{ t('publish.index.promotion.draft_btn') }}
          </view>

          <!-- 发布按钮 -->
          <view
            class="adBtn publishBtn"
            :class="{ disabled: !isAddPublish }"
            @click.stop="debouncedCreatePromotionPost(1)"
          >
            {{ t('publish.index.promotion.publish_btn') }}
          </view>
          <!-- 注释 -->
          <view class="footerNote">{{ t('publish.index.promotion.footer_note') }}</view>
        </view>
      </template>

      <template #footer></template>
    </custom-nav>

    <!-- 标签选择弹出层 -->
    <view class="tag-popup-mask" v-if="tagPopupVisible" @click="closeTagPopup"></view>
    <view class="tag-popup" v-show="tagPopupVisible">
      <view class="popup-header">
        <text class="popup-title">{{ t('publish.index.tag.select_title') }}</text>
        <wd-icon name="close-bold" size="42rpx" @click="closeTagPopup" color="#999"></wd-icon>
      </view>
      <l-editor
        ref="editorRef"
        :clear-on-send="false"
        send-text=""
        @search-change="onSearchChange"
        @change="onEditorChange"
        :keyboard-height="keyboardHeight"
        placeholder="输入 # 搜索标签"
      >
        <template #hot="{ show, onSelect, close }">
          <view v-show="show" class="tag-popup-list">
            <view
              v-for="item in tagList"
              :key="item.id"
              class="popup-tag-item"
              @click="handleSelectTag(item, onSelect)"
            >
              <text class="popup-tag-name"># {{ item.name }}</text>
            </view>
          </view>
        </template>
      </l-editor>
      <view class="tag-popup-footer">
        <view class="tag-popup-confirm-btn" @click="confirmTagPopup">确定</view>
      </view>
    </view>

    <wd-toast />
    <wd-message-box selector="wd-message-box-slot" />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { navigateBack, toUrl, getImageUrl } from '@/utils'
import {
  createPostApi,
  createPromotionPostApi,
  updatePostApi,
  updatePromotionPostApi,
  getCommunityPostDetailApi,
  getAdTypeListApi,
  getHotAdTagsApi,
  searchAdTagsApi,
  checkPostStatusApi,
  checkAdEligibilityApi,
  type AdTagItem,
  type PromotionType,
  type PromotionValidity,
} from '@/service/api/community'
import { useToast, useMessage } from 'wot-design-uni'
import { useUserStore } from '@/store'
import { getAliyunOssConfigApi, type getAliyunOssConfigApiResponse } from '@/service/api/upload'
import { debounce } from 'lodash-es'
import CustomNav from '@/components/CustomNav/CustomNav.vue'
import LEditor from '@/components/l-editor/l-editor.vue'

const message = useMessage('wd-message-box-slot')

// 发帖权限状态
const canPost = ref(true)
// 是否为猫 holder（控制推广 tab 显示）
const isCatHolder = ref(false)
// 推广发布资格状态
const canPublishAd = ref(true)
const adEligibilityChecked = ref(false)
const adEligibilityMessage = ref('')
const adEligibilityReason = ref('')

// 语言
const locale = uni.getLocale()
const toast = useToast()
const userStore = useUserStore()

// l-editor 引用（用于标签选择弹出层）
const editorRef = ref<InstanceType<typeof LEditor> | null>(null)
// 编辑器内容（纯文本，用于判断是否有内容）
const editorContent = ref('')
// 推广模式文本内容
const promotionContent = ref('')
// 已选标签列表
const selectedTagList = ref<{ value: string; id: number | string }[]>([])

// 发布分类列表
type PublishCategory = 'normal' | 'promotion'
const categoryList = ref([
  {
    label: t('publish.index.tab.normal'),
    value: 'normal' as PublishCategory,
  },
  {
    label: t('publish.index.tab.promotion'),
    value: 'promotion' as PublishCategory,
  },
])
// 激活的分类
const activeCategory = ref<PublishCategory>('normal')

// 编辑模式
const editId = ref<number>(0)
const isEditMode = computed(() => editId.value > 0)
// 草稿编辑模式（不进入编辑模式，按正常发帖流程，仅预填草稿数据）
const draftId = ref<number>(0)
const isDraftEdit = computed(() => draftId.value > 0)

const pageTitle = computed(() => {
  if (isDraftEdit.value) return t('publish.index.edit_draft')
  if (isEditMode.value) return t('common.edit')
  return activeCategory.value === 'promotion'
    ? t('publish.index.tab.promotion')
    : t('publish.index.tab.normal')
})

const handleCategoryChange = ({ name }: { name: PublishCategory }) => {
  activeCategory.value = name
  // 切换到推广专区时展示发布资格检查结果
  if (name === 'promotion' && adEligibilityChecked.value) {
    showAdEligibilityResult()
  }
}

// 推广类型选项（从接口获取）
const promotionTypes = ref<{ label: string; value: PromotionType }[]>([])

// 加载推广类型列表
const loadAdTypes = async () => {
  try {
    const res = await getAdTypeListApi()
    if (res.code === 1 && res.data) {
      promotionTypes.value = res.data
    }
  } catch (e) {
    console.error('loadAdTypes failed', e)
  }
}

// 有效期选项
const validityOptions = computed(() => [
  { label: t('publish.index.promotion.validity.7days'), value: 7 as PromotionValidity },
  { label: t('publish.index.promotion.validity.30days'), value: 30 as PromotionValidity },
  { label: t('publish.index.promotion.validity.longterm'), value: 0 as PromotionValidity },
])

// ── 标签选择 ──
const tagPopupVisible = ref(false)
const tagList = ref<AdTagItem[]>([])
const tagSearchKeyword = ref('')
const tagSearchDebounce = ref<ReturnType<typeof setTimeout> | null>(null)

/** l-editor 内容变化回调 */
const onEditorChange = (data: { model: any[]; message: string; num: number }) => {
  editorContent.value = data.message || ''
}

/** l-editor 搜索变化回调：检测 # 标签触发 */
const onSearchChange = (data: {
  type: 'ate' | 'tag'
  trigger: string
  keyword: string
  content: string
}) => {
  if (data.type === 'tag') {
    tagSearchKeyword.value = data.keyword || ''
    if (data.keyword) {
      debouncedSearchTag(data.keyword)
    } else {
      loadHotTags()
    }
  }
}

/** 加载热门标签 */
const loadHotTags = async () => {
  try {
    const res = await getHotAdTagsApi()
    if (res.code === 1) {
      tagList.value = res.data || []
      editorRef.value?.setHotPanelVisible(tagList.value.length > 0)
    }
  } catch (e) {
    console.error('loadHotTags failed', e)
  }
}

/** 防抖搜索标签 */
const debouncedSearchTag = (keyword: string) => {
  if (tagSearchDebounce.value) {
    clearTimeout(tagSearchDebounce.value)
  }
  tagSearchDebounce.value = setTimeout(async () => {
    if (!keyword.trim()) {
      loadHotTags()
      return
    }
    try {
      const res = await searchAdTagsApi(keyword.trim())
      if (res.code === 1) {
        tagList.value = res.data || []
        editorRef.value?.setHotPanelVisible(tagList.value.length > 0)
      }
    } catch (e) {
      console.error('searchAdTags failed', e)
    }
  }, 300)
}

/** 弹窗内搜索框输入 */
const onTagSearchInput = () => {
  debouncedSearchTag(tagSearchKeyword.value)
}

/** 选中标签：通过 l-editor 的 insertHot 方法插入 */
const handleSelectTag = (
  item: AdTagItem,
  onSelect: (data: { name: string; id: number | string }) => void,
) => {
  if (editorRef.value) {
    editorRef.value.insertHot({ name: item.name, id: item.id })
  }
}

/** 打开标签弹出层 */
const openTagPopup = () => {
  tagPopupVisible.value = true
  // 将当前已选标签同步到 l-editor
  nextTick(() => {
    const model = selectedTagList.value.map((tag) => ({
      type: 'tag' as const,
      value: tag.value,
      id: tag.id,
    }))
    editorRef.value?.setValue(model)
    editorRef.value?.focus?.()
  })
  loadHotTags()
}

/** 关闭标签弹出层（不保存） */
const closeTagPopup = () => {
  tagPopupVisible.value = false
  tagSearchKeyword.value = ''
  if (editorRef.value) {
    editorRef.value.closeHotPanel?.()
  }
}

/** 确认标签选择：将 l-editor 中的标签写入 selectedTagList */
const confirmTagPopup = () => {
  const data = editorRef.value?.getValue()
  if (data) {
    selectedTagList.value = (data.model || []).filter((item: any) => item.type === 'tag')
  }
  tagPopupVisible.value = false
  tagSearchKeyword.value = ''
  if (editorRef.value) {
    editorRef.value.closeHotPanel?.()
  }
}

/** 移除已选标签（仅从 selectedTagList 移除，下次打开弹出层时同步到 l-editor） */
const removeSelectedTag = (tag: { value: string; id: number | string }) => {
  selectedTagList.value = selectedTagList.value.filter((item) => item.id !== tag.id)
}

/** 标签弹出层为独立遮罩，内容区无需额外留白 */
const contentPaddingBottom = computed(() => 0)

/** 清空编辑器内容 */
const clearEditor = () => {
  editorRef.value?.clear()
  editorContent.value = ''
  promotionContent.value = ''
  selectedTagList.value = []
}

// 图片上传
const fileList = ref([])
const ossUploadedFiles = ref<string[]>([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)
const ossUrlMap = ref<Record<string, string>>({})

// 推广表单
const title = ref('')
const promotionType = ref<PromotionType>('')
const contactEmail = ref('')
const contactWechat = ref('')
const validityDays = ref<PromotionValidity>(7)
const hasAgreed = ref(false)
type VisibilityType = 'public' | 'friends'
const visibility = ref<VisibilityType>('public')

const handleOssUploadSuccess = (e) => {
  const ossUrl = `${ossConfig.value?.host}/${e.formData.key}`
  // 以 uid 为 key 记录 ossUrl
  ossUrlMap.value[e.file.uid] = ossUrl

  // 用最新的 e.fileList 生成 ossUploadedFiles，顺序与 fileList 一致
  ossUploadedFiles.value = e.fileList.map((f) => ossUrlMap.value[f.uid]).filter(Boolean)
}

/**
 * 生成基于用户 ID 的唯一标识（用于上传文件名）
 */
function generateUniqueIdWithUser(): string {
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 10)
  return `${userStore.userInfo?.member_id || ''}_${timestamp}_${randomStr}`
}

/**
 * 构建 formData
 */
const buildFormData = ({ file, formData, resolve }) => {
  let imageName = file.url.substring(file.url.lastIndexOf('/') + 1)
  // #ifdef H5
  imageName = imageName + file.name
  // #endif
  const uniqueId = generateUniqueIdWithUser()

  const key = `${ossConfig.value?.dir}/${uniqueId}_${imageName}`
  // eslint-disable-next-line camelcase
  const success_action_status = '200'

  formData = {
    ...formData,
    key,
    OSSAccessKeyId: ossConfig.value?.accessKeyId,
    policy: ossConfig.value?.policy,
    signature: ossConfig.value?.signature,
    // eslint-disable-next-line camelcase
    success_action_status,
    x_oss_region: ossConfig.value?.region,
  }
  resolve(formData)
}

const handleChange = (e) => {
  ossUploadedFiles.value = e.fileList.map((f) => ossUrlMap.value[f.uid]).filter(Boolean)
}

const postContent = ref('')

// 导航栏尺寸计算（适配多端安全区）
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)
const keyboardHeight = ref(0)

const submitLoading = ref(false)

const isAddDraft = computed(() => {
  const hasContent = promotionContent.value.length > 0 || ossUploadedFiles.value.length > 0
  return (
    canPost.value &&
    userStore.isLogin &&
    hasContent &&
    title.value.length &&
    promotionType.value !== ''
  )
})

const isAddPublish = computed(() => {
  const hasContent = promotionContent.value.length > 0 || ossUploadedFiles.value.length > 0
  console.log(
    'hasContent',
    canPost.value &&
      canPublishAd.value &&
      userStore.isLogin &&
      hasContent &&
      title.value.length &&
      promotionType.value !== '',
  )
  return (
    canPost.value &&
    canPublishAd.value &&
    userStore.isLogin &&
    hasContent &&
    title.value.length &&
    promotionType.value !== ''
  )
})
const isPublish = computed(() => {
  return (
    canPost.value &&
    userStore.isLogin &&
    (postContent.value.length > 0 || ossUploadedFiles.value.length > 0)
  )
})

/** 检查发帖状态 */
const checkPostStatus = async () => {
  try {
    const res = await checkPostStatusApi()
    if (res.code === 1 && res.data) {
      canPost.value = res.data.can_post
      if (!res.data.can_post) {
        const banReason = res.data.ban_reason || t('publish.index.ban.unknown_reason')
        const banUntil = res.data.ban_until_date || t('publish.index.ban.permanent')
        message.alert({
          title: t('publish.index.ban.title'),
          msg: `${t('publish.index.ban.reason')}：${banReason}\n${t('publish.index.ban.until')}：${banUntil}`,
        })
      }
    }
  } catch (e) {
    console.error('checkPostStatus failed', e)
  }
}

/** 检查推广发布资格 */
const checkAdEligibility = async () => {
  try {
    const res = await checkAdEligibilityApi()
    if (res.code === 1 && res.data) {
      canPublishAd.value = res.data.can_publish
      // 读取 is_cat_holder，控制推广 tab 显示
      if (res.data.checks) {
        isCatHolder.value = res.data.checks.is_cat_holder
      }
      // 保存结果，切换到推广 tab 时再展示
      adEligibilityMessage.value = res.data.message || ''
      adEligibilityReason.value = res.data.reason || ''
    }
  } catch (e) {
    console.error('checkAdEligibility failed', e)
  } finally {
    adEligibilityChecked.value = true
  }
}

/** 切换到推广 tab 时展示发布资格检查结果 */
const showAdEligibilityResult = () => {
  if (isCatHolder.value && !canPublishAd.value && adEligibilityReason.value) {
    message.alert({
      title: t('publish.index.ban.title'),
      msg: adEligibilityMessage.value,
    })
  }
}

/** 加载帖子数据用于编辑 */
const loadPostForEdit = async (id: number) => {
  try {
    uni.showLoading({ title: t('common.loading') })
    const res = await getCommunityPostDetailApi(id)
    if (res.code === 1 && res.data) {
      const post = res.data
      // 根据帖子类型切换 Tab
      if (post.post_category === 'advertisement') {
        activeCategory.value = 'promotion'
        // 预填标题
        title.value = post.title || ''
        // 预填推广类型
        promotionType.value = (post.ad_type_id as PromotionType) || ''
        // 预填联系方式
        contactEmail.value = post.contact_email || ''
        contactWechat.value = post.contact_wechat || ''
        // 内容设置到 textarea
        promotionContent.value = post.content || ''
        // 标签设置到 l-editor（弹出层中的）
        const editorModel: { type: 'text' | 'tag'; value: string; id?: number | string }[] = []
        if (post.ad_tags?.length) {
          post.ad_tags.forEach((tag) => {
            editorModel.push({ type: 'tag', id: tag.id, value: tag.display_name })
          })
          selectedTagList.value = editorModel.filter((item) => item.type === 'tag')
        }
        // 等 editorRef 就绪后设置内容
        nextTick(() => {
          editorRef.value?.setValue(editorModel)
        })
      } else {
        activeCategory.value = 'normal'
        postContent.value = post.content || ''
      }
      // 预填图片
      if (post.images?.length) {
        ossUploadedFiles.value = [...post.images]
        fileList.value = post.images.map((img: string, index: number) => ({
          url: getImageUrl(img + '?x-oss-process=style/sqdt'),
          uid: `existing_${index}_${Date.now()}`,
          status: 'success',
        }))
        // 同步 ossUrlMap
        fileList.value.forEach((f: any, i: number) => {
          ossUrlMap.value[f.uid] = post.images[i]
        })
      }
    }
  } catch (e) {
    console.error('loadPostForEdit failed', e)
    toast.show(t('publish.index.edit.load_failed'))
  } finally {
    uni.hideLoading()
  }
}

onLoad((options) => {
  if (options.id && options.edit === 'true') {
    editId.value = Number(options.id)
  }
  if (options.id && options.draft === 'true') {
    draftId.value = Number(options.id)
  }
  if (options.category === 'promotion') {
    activeCategory.value = 'promotion'
  }
})

// 使用 ref 来存储防抖函数的引用
const debouncedCreatePost = ref<((publishStatus: number) => Promise<void>) | null>(null)
const debouncedCreatePromotionPost = ref<((publishStatus: number) => Promise<void>) | null>(null)

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value + 88

  getAliyunOssConfigApi().then((res) => {
    ossConfig.value = res.data
  })

  // 编辑模式：不需要做权限校验
  if (editId.value === 0 && draftId.value === 0) {
    // 检查发帖状态
    checkPostStatus()

    // 检查推广发布资格（控制推广 tab 显示）
    checkAdEligibility().then(() => {
      // 从推广 Tab 进入时直接展示检查结果
      if (activeCategory.value === 'promotion') {
        showAdEligibilityResult()
      }
    })
  }

  // 键盘高度监听（标签弹窗键盘适配）
  if (typeof uni.onKeyboardHeightChange === 'function') {
    uni.onKeyboardHeightChange((res) => {
      console.log(res, '-----')
      keyboardHeight.value = res.height || 0
    })
  }

  // 加载推广类型列表
  loadAdTypes()

  debouncedCreatePost.value = debounce(createPost, 1000, {
    leading: true,
    trailing: false,
  })
  debouncedCreatePromotionPost.value = debounce(createPromotionPost, 1000, {
    leading: true,
    trailing: false,
  })

  // 编辑模式：加载帖子数据（在 onMounted 中调用，确保 editorRef 已就绪）
  if (editId.value > 0) {
    loadPostForEdit(editId.value)
  }
  // 草稿编辑：预填草稿数据，按正常发帖流程处理
  if (draftId.value > 0) {
    loadPostForEdit(draftId.value)
  }
})

/** 公共：发布成功处理 */
const handlePublishSuccess = (res: any, publishStatus: number = 1) => {
  if (res.code === 1) {
    toast.show(t('common.toast.post_success'))

    if (isDraftEdit.value) {
      // 草稿编辑：始终刷新 list.vue 的"草稿"tab
      uni.$emit('refreshPostList')
      // publishStatus = 1（发布而非存草稿）时，刷新所有 tab + SocialTab/PromotionTab
      if (publishStatus === 1) {
        uni.$emit('refreshPostListAll')
        if (activeCategory.value === 'promotion') {
          uni.$emit('refreshPromotionTab')
        } else {
          uni.$emit('refreshSocialTab')
        }
      }
    } else if (isEditMode.value) {
      // 编辑模式
      if (activeCategory.value === 'promotion') {
        // 推广帖编辑：刷新 PromotionTab + promotion_search
        uni.$emit('refreshPromotionTab')
        uni.$emit('refreshPromotionPost')
      } else {
        // 普通帖编辑：替换 list.vue 中对应项（不刷新 SocialTab）
        uni.$emit('refreshNormalPost', editId.value)
      }
    } else {
      // 直接发布：publishStatus = 1 时才刷新 SocialTab/PromotionTab
      if (publishStatus === 1) {
        if (activeCategory.value === 'promotion') {
          uni.$emit('refreshPromotionTab')
          uni.$emit('switchToPromotionTab')
        } else {
          uni.$emit('refreshSocialTab')
          uni.$emit('switchToSocialTab')
        }
      }
    }

    navigateBack()
  } else {
    toast.show(res.msg)
  }
}

/** 公共：从编辑器获取内容和标签 */
const getEditorPayload = () => {
  const editorData = editorRef.value?.getValue()
  // 内容来自 wd-textarea
  const content = promotionContent.value
  const tags = (editorData?.tags || []).map((item: { value: string; id: number | string }) => {
    const numId = Number(item.id)
    // 自定义标签（id 为字符串）：与当前标签列表比对，匹配则用数据库 id 替换
    if (isNaN(numId)) {
      const tagName = item.value.startsWith('#') ? item.value.slice(1) : item.value
      const matched = tagList.value.find((t) => t.name === tagName)
      return matched ? matched.id : tagName
    }
    return numId
  })
  return { content, tags }
}

// 创建普通动态
// 创建原始的 createPost 函数
const createPost = async (publishStatus: number = 1) => {
  debugger
  console.log('publishStatus', publishStatus)
  if (!userStore.isLogin) {
    // toast.show(t('common.toast.pleaseLogin'))
    toUrl('/pages/cats/login/login', true, false)
    return
  }
  if (!postContent.value && ossUploadedFiles.value.length === 0) {
    toast.show(t('common.toast.pleaseInputContent'))
    return
  }

  const doSubmit = async () => {
    // 防止重复提交
    if (submitLoading.value) return
    submitLoading.value = true

    try {
      const content = postContent.value
      const files = ossUploadedFiles.value
      const status = publishStatus as 0 | 1
      let res
      if (isEditMode.value || isDraftEdit.value) {
        res = await updatePostApi(
          isEditMode.value ? editId.value : draftId.value,
          postContent.value,
          ossUploadedFiles.value,
          publishStatus as 0 | 1,
        )
      } else {
        res = await createPostApi(content, files, status)
      }
      handlePublishSuccess(res, publishStatus)
    } catch (error) {
      toast.info(t('common.toast.post_failed') + ': ' + error.errMsg)
    } finally {
      submitLoading.value = false
    }
  }

  if (isEditMode.value) {
    doSubmit()
  } else if (publishStatus === 1) {
    message
      .confirm({
        msg: t('social.publish.confirm_txt'),
        cancelButtonText: t('social.publish.confirm.no'),
        confirmButtonText: t('social.publish.confirm.yes'),
      })
      .then(doSubmit)
      .catch(() => {})
  } else {
    doSubmit()
  }
}

// 创建推广帖子
const createPromotionPost = async (publishStatus: number = 1) => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true, false)
    return
  }

  const { content, tags } = getEditorPayload()
  console.log({ content, tags })
  if (!content && ossUploadedFiles.value.length === 0) {
    toast.show(t('common.toast.pleaseInputContent'))
    return
  }
  // 推广模式邮箱校验
  if (contactEmail.value) {
    if (!/^\w+((-\w+)|(\.\w+))*@\w+((\.|\-)\w+)*\.\w+$/.test(contactEmail.value)) {
      toast.show(t('login.email_format_error'))
      return
    }
  }

  // 发布时需要确认，草稿不需要
  const doSubmit = async () => {
    if (submitLoading.value) return
    submitLoading.value = true

    try {
      if (isEditMode.value || isDraftEdit.value) {
        const res = await updatePromotionPostApi({
          id: isEditMode.value ? editId.value : draftId.value,
          content,
          images: ossUploadedFiles.value,
          ad_type_id: promotionType.value,
          contact_email: contactEmail.value || undefined,
          contact_wechat: contactWechat.value || undefined,
          validity_days: validityDays.value,
          title: title.value,
          publish_status: publishStatus as 0 | 1,
          tags,
        })
        handlePublishSuccess(res, publishStatus)
      } else {
        const res = await createPromotionPostApi({
          content,
          images: ossUploadedFiles.value,
          ad_type_id: promotionType.value,
          contact_email: contactEmail.value || undefined,
          contact_wechat: contactWechat.value || undefined,
          validity_days: validityDays.value,
          title: title.value,
          publish_status: publishStatus as 0 | 1,
          tags,
        })
        handlePublishSuccess(res, publishStatus)
      }
    } catch (error) {
      console.error('失败:' + error.errMsg)
    } finally {
      submitLoading.value = false
    }
  }

  if (isEditMode.value) {
    doSubmit()
  } else if (publishStatus === 1) {
    message
      .confirm({
        msg: t('social.publish.confirm_txt'),
        cancelButtonText: t('social.publish.confirm.no'),
        confirmButtonText: t('social.publish.confirm.yes'),
      })
      .then(doSubmit)
      .catch(() => {})
  } else {
    doSubmit()
  }
}

// 在组件卸载时清理防抖函数
onUnmounted(() => {
  if (debouncedCreatePost.value) {
    ;(debouncedCreatePost.value as any).cancel()
  }
  if (debouncedCreatePromotionPost.value) {
    ;(debouncedCreatePromotionPost.value as any).cancel()
  }
  if (typeof uni.offKeyboardHeightChange === 'function') {
    uni.offKeyboardHeightChange()
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

$border-color: var(--publish-border-color);
$border-radius: 8px;
$btn-border-raduis: 8px;
$tipColor: #999999;
$main-color: var(--text-color);
$minor-color: var(--wot-message-box-content-color);

:deep(.cnt) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.fbg) {
  background-color: var(--liberty-cats-page-background-color) !important;
}

:deep(.zh-Hans, .zh-Hant) {
  .wd-textarea * {
    font-family: Alibaba PuHuiTi2 !important;
  }
}

.page {
  background-color: var(--bg-primary);

  .pbl,
  .pbr {
    .fbg {
      background-color: var(--bg-primary);
    }
  }
}

:deep(.wd-tabs) {
  background-color: transparent;

  .wd-tabs__nav {
    position: fixed;
    width: 100vw;
    left: 0;
    z-index: 11;
  }
}

:deep(.custom-tab) {
  background-color: var(--bg-primary) !important;
  z-index: 10;

  .wd-tabs__nav {
    background-color: var(--bg-primary) !important;
    padding: 0 var(--liberty-cats-page-common-border-radius);
    box-sizing: border-box;
    font-family:
      Alimama FangYuanTi VF,
      sans-serif;

    height: var(--wot-tabs-nav-height, 88rpx);

    .wd-tabs__nav-container {
      height: 100%;
      width: 100%;

      .wd-tabs__nav-item {
        height: 100%;
      }
    }
  }
}

:deep(.cnt) {
  background-color: var(--bg-primary) !important;
  padding: 24rpx !important;
  padding-top: calc(80rpx + var(--liberty-cats-page-common-border-radius)) !important;
}

:deep(.default-cnt) {
  min-height: auto !important;
  padding-bottom: calc(var(--keyboard-height, 0px) + 200px) !important;
}

.navRightBox {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.draftBtnNav {
  font-size: 26rpx;
  color: var(--text-secondary);
}

.kf {
  font-size: 28rpx;
  font-weight: 500;
  line-height: 32rpx;
  color: var(--bg-card);
}

.kf.disabled {
  color: #ccc;
}

/* 卡片基础样式 */
.card {
  // margin: 0 32rpx 24rpx;
  padding: 32rpx 24rpx;
  background-color: var(--bg-card);
  border-radius: 12px;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 32rpx;
}

.cardTitle {
  margin-bottom: 24rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: $main-color;
  font-family: 'Alibaba PuHuiTi2' !important;

  .required {
    color: #ff6b03;
    margin-left: 4rpx;
  }
}

.title-card {
  .tip {
    font-family: 'Alibaba PuHuiTi2' !important;
    font-size: 26rpx;
    color: $tipColor;
    margin-top: 18rpx;
  }
}

:deep(.titleInput) {
  margin-bottom: 24rpx;
  border: 1px solid $border-color;

  .wd-input__inner {
    font-size: 28rpx;
    font-weight: 500;
    //padding: 20rpx 0;
    font-family: 'Alibaba PuHuiTi2' !important;
  }

  .uni-input-input {
    font-family: 'Alibaba PuHuiTi2' !important;
  }

  .wd-input__placeholder {
    font-family: 'Alibaba PuHuiTi2' !important;
  }
}

.txtBox {
  min-height: 300rpx;
  border-radius: $border-radius;
  border: 1px solid $border-color;
  padding: 0 12rpx;
  .wd-textarea {
    min-height: 300rpx;
  }
}

.editorBox {
  position: relative;
  // min-height: 300rpx;
  margin: 24rpx 0;
  border-radius: $border-radius;
  border: 1px solid $border-color;
  padding: 12rpx;

  // 覆写 l-editor 的 fixed 定位，使其内嵌在卡片中
  :deep(.l-editor) {
    position: relative !important;
    bottom: auto !important;
    box-shadow: none !important;
    z-index: auto !important;
    padding-bottom: 0 !important;
    font-family: 'Alibaba PuHuiTi2' !important;
  }

  // l-editor 编辑器内容及 placeholder 字体
  :deep(.editable) {
    font-family: 'Alibaba PuHuiTi2' !important;
    min-height: 300rpx;
    font-size: 26rpx;
    padding-left: 24rpx;

    &:empty::before {
      font-family: 'Alibaba PuHuiTi2' !important;
      // font-family: 'Alimama FangYuanTi VF' !important;
      color: #b0b0b0 !important;
    }

    .text-atom {
      font-family: 'Alibaba PuHuiTi2' !important;
      // font-family: 'Alimama FangYuanTi VF' !important;
      color: var(--wot-color-theme) !important;
    }
  }

  // 隐藏 l-editor 自带的发送按钮（使用页面自己的发布按钮）
  :deep(.send-btn) {
    display: none !important;
  }

  :deep(.tools) {
    justify-content: flex-end !important;
  }
}

:deep(.pubUpload) {
  .wd-upload__evoke,
  .wd-upload__preview {
    width: 200rpx;
    height: 200rpx;
  }

  .wd-upload__preview:nth-child(3n) {
    margin-right: 0;
  }
}

:deep(.pubTextArea) {
  background: transparent;

  .wd-textarea__value {
    color: rgba(0, 0, 0, 0.26);
    background: #ff6b03;
  }
}

.contactItem {
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;

  &:last-child {
    margin-bottom: 0;
  }

  .pubInput {
    flex: 1;
  }
}

.formLabel {
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: $minor-color;
  width: 18%;
}

:deep(.pubInput) {
  padding: 0 12rpx;
  border-radius: $border-radius;
  border: 1px solid $border-color;

  .wd-input__inner {
    height: 80rpx;
    // background-color: #f9f9f9;
  }
}

.typeGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.typeChip {
  padding: 14rpx 36rpx;
  border-radius: $border-radius;
  font-size: 26rpx;
  color: $minor-color;
  transition: all 0.2s ease;
  border: 1px solid $border-color;

  &.active {
    background-color: #ff6b03;
    border: 1px solid #ff6b03;
    color: var(--bg-card);
    font-weight: 600;
  }
}

.validityGrid {
  display: flex;
  gap: 16rpx;
}

.validityChip {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  border-radius: $border-radius;
  font-size: 26rpx;
  color: var(--wot-message-box-content-color);
  transition: all 0.2s ease;
  border: 1px solid $border-color;

  &.active {
    background-color: #ff6b03;
    border: 1px solid #ff6b03;
    color: var(--bg-card);
    font-weight: 600;
  }
}

.adBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: $btn-border-raduis;
  font-size: 32rpx;
  // font-weight: 600;
  margin-top: 24rpx;
  transition: opacity 0.2s ease;
  font-family: 'Alibaba PuHuiTi2' !important;
}

/* 草稿按钮 */
.draftBtn {
  background-color: var(--bg-card);
  color: $minor-color;
  border: 1px solid $border-color;

  &.disabled {
    background-color: #fafafa;
    color: #cccccc;
    border: 0;
  }
}

/* 发布按钮 */
.publishBtn {
  background-color: #ff6b03;
  color: var(--bg-card);

  &.disabled {
    background-color: #ffd4b8;
    color: var(--bg-card);
  }
}

/* 普通模式按钮外边距 */
.publishBtn:not(.card .publishBtn) {
  margin: 0 32rpx 32rpx;
}

/* 推广模式卡片内按钮 */
.card .publishBtn {
  margin-top: 24rpx;
}

/* 可见范围 */
.visibilityRow {
  display: flex;
  align-items: center;
  gap: 48rpx;
}

.visibilityOption {
  display: flex;
  align-items: center;
}

.visibilityRadio {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
  border-radius: 50%;
  background-color: var(--bg-card);
  transition: all 0.2s ease;
  border: 1px solid $border-color;

  &.checked {
    border-color: #ff6b03;
  }
}

.radioDot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #ff6b03;
}

.visibilityText {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--actions-text);
}

/* 注释文案 */
.footerNote {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: $tipColor;
  line-height: 1.5;
  text-align: center;
}

::v-deep .wd-input::after {
  height: 0;
}

/* 阅读并同意协议 */
.agreementRow {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}

.agreementCheckbox {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
  border-radius: $border-radius;
  background-color: var(--bg-card);
  transition: all 0.2s ease;
  border: 1px solid $border-color;

  &.checked {
    background-color: #ff6b03;
    border-color: #ff6b03;
  }
}

.agreementText {
  font-size: 24rpx;
  color: var(--wot-message-box-content-color);
}

/* ========== 标签选择弹窗 ========== */
:deep(.tagPopup) {
  border-radius: 24rpx 24rpx 0 0;
  max-height: 70vh;
}

.tagPopupHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 32rpx 16rpx;
}

.tagPopupTitle {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--actions-text);
}

.tagPopupClose {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  color: var(--text-secondary);
}

.tagSearchBox {
  padding: 0 32rpx 20rpx;
}

:deep(.tagSearchInput) {
  .wd-input__inner {
    height: 72rpx;
    background-color: var(--wot-action-sheet-active-color);
    border-radius: 36rpx;
    padding-left: 28rpx;
    font-size: 28rpx;
  }
}

.tagListScroll {
  max-height: 50vh;
  padding: 0 32rpx 48rpx;
}

.tagList {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tagItem {
  padding: 16rpx 32rpx;
  background-color: var(--wot-action-sheet-active-color);
  border-radius: 12rpx;
  transition: background-color 0.2s ease;

  &:active {
    background-color: #ffe0c4;
  }
}

.tagItemText {
  font-size: 28rpx;
  color: var(--actions-text);
}

.tagEmpty {
  text-align: center;
  padding: 80rpx 0;
  font-size: 28rpx;
  color: var(--text-secondary);
}

/* ---------- 遮罩层（固定全屏） ---------- */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  /* 毛玻璃背景，可选 */

  /* 默认隐藏（透明 + 禁止点击） */
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 0.35s ease,
    visibility 0.35s ease;

  /* 让弹出层在遮罩里垂直底部对齐 */
  display: flex;
  justify-content: center;
  align-items: flex-end;
  /* 关键：让子元素从底部弹出来 */
}

/* ---------- 弹出层主体（从下方滑入） ---------- */
.popup {
  background: var(--bg-card);
  width: 100%;
  max-width: 500px;
  /* 移动端适配，限制最大宽度 */
  max-height: 70vh;
  /* 防止内容过多顶出屏幕 */
  padding: 30px 28px 40px;
  border-radius: 24px 24px 0 0;
  /* 上方圆角，底部直角贴合 */
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);

  /* 位移动画核心：初始在下方一个屏幕外 */
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  /* cubic-bezier 带有轻微弹性效果，更自然 */

  overflow-y: auto;
  /* 内容过多时内部滚动 */
}

/* 当遮罩显示时：背景显现，弹出层滑入 */
.overlay.active {
  opacity: 1;
  visibility: visible;
}

.overlay.active .popup {
  transform: translateY(0);
}

/* ---------- 弹出层内部样式 ---------- */
.popup .close-btn {
  float: right;
  background: none;
  border: none;
  font-size: 28px;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1;
  transition: 0.2s;
}

.popup .close-btn:hover {
  color: var(--actions-text);
  transform: rotate(90deg);
}

.popup h2 {
  font-size: 22px;
  margin-bottom: 12px;
  color: #1a1a2e;
}

.popup p {
  font-size: 16px;
  line-height: 1.7;
  color: #555;
  margin-bottom: 20px;
}

.popup .action-btn {
  display: block;
  width: 100%;
  padding: 14px;
  background: #4f6ef7;
  color: var(--bg-card);
  border: none;
  border-radius: 16px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}

.popup .action-btn:hover {
  background: #3a56d4;
}

/* 方便展示占位内容 */
.popup .content-demo {
  background: #f8f9fc;
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  font-size: 14px;
  color: var(--wot-message-box-content-color);
}
</style>
<style>
/* ----- 遮罩层样式 & 淡入淡出动画 ----- */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

/* ----- 弹出层样式 & 底部滑动动画 ----- */
/* 用 .zh-Hans 前缀提升特异性，覆盖全局 .zh-Hans * 的字体设置 */
.zh-Hans .popup-box {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border-radius: 40rpx 40rpx 0 0;
  border-top: 1rpx solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.15);
  z-index: 999;
  box-sizing: border-box;
  max-height: calc(100vh - var(--message-nav-height, 0rpx));
  overflow-y: auto;
  font-family: 'Alibaba PuHuiTi2' !important;
  /* 注意：这里不要写 display:flex 干扰 v-show，由 Vue 控制 */
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 40rpx 20rpx;
  font-family: 'Alibaba PuHuiTi2' !important;
}

.popup-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--actions-text);
  font-family: 'Alibaba PuHuiTi2' !important;
}

.popup-close {
  font-size: 36rpx;
  color: var(--text-secondary);
  padding: 10rpx;
  font-family: 'Alibaba PuHuiTi2' !important;
}

.popup-tag-item {
  padding: 24rpx 40rpx;
  border-bottom: 1rpx solid var(--divider-color);
  font-family: 'Alibaba PuHuiTi2' !important;
}

.zh-Hans .popup-tag-item:last-child {
  border-bottom: none;
}

.popup-tag-name {
  font-size: 24rpx;
  color: var(--actions-text);
  font-family: 'Alibaba PuHuiTi2' !important;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.slide-up-enter,
.slide-up-leave-to {
  transform: translateY(100%);
  /* 初始在屏幕外 */
}

/* ----- 标签弹出层 ----- */
.tag-popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 998;
}

.tag-popup {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border-radius: 40rpx 40rpx 0 0;
  border-top: 1rpx solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 -8rpx 30rpx rgba(0, 0, 0, 0.15);
  z-index: 999;
  box-sizing: border-box;
  max-height: 70vh;
  overflow-y: auto;
  font-family: 'Alibaba PuHuiTi2' !important;
}

.tag-popup-list {
  max-height: 500rpx;
  overflow-y: auto;
}

.tag-popup :deep(.l-editor) {
  position: relative !important;
  bottom: auto !important;
  box-shadow: none !important;
  z-index: auto !important;
  padding-bottom: 0 !important;
}

.tag-popup :deep(.tools) {
  display: none !important;
}
.tag-popup-footer {
  padding: 20rpx 40rpx 40rpx;
}
.tag-popup-confirm-btn {
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  background: var(--wot-color-theme);
  color: var(--bg-card);
  font-size: 28rpx;
  border-radius: 40rpx;
  font-family: 'Alibaba PuHuiTi2' !important;
}

/* ----- 已选标签芯片 ----- */
.tagBar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 0 0 20rpx;
}

.selectedTagsBox {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  align-items: center;
}

.tagChip {
  display: flex;
  align-items: center;
  background: var(--divider-color);
  border-radius: 24rpx;
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  color: var(--actions-text);
  font-family: 'Alibaba PuHuiTi2' !important;
}

.tagChipText {
  font-size: 24rpx;
}

.tagChipClose {
  margin-left: 8rpx;
  font-size: 28rpx;
  color: var(--text-secondary);
}

:deep(.editable) {
  font-family: 'Alibaba PuHuiTi2' !important;
  min-height: 300rpx;
  font-size: 26rpx;
  padding-left: 24rpx;

  /* &:empty::before {
    font-family: 'Alibaba PuHuiTi2' !important;
    // font-family: 'Alimama FangYuanTi VF' !important;
    color: #b0b0b0 !important;
  } */

  .text-atom {
    font-family: 'Alibaba PuHuiTi2' !important;
    color: var(--wot-color-theme) !important;
  }
  .atom {
    font-family: 'Alibaba PuHuiTi2' !important;
    color: var(--wot-color-theme) !important;
  }
}
.uploadBox {
  margin-top: 12rpx;
}
</style>

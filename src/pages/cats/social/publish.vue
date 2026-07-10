<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Publish',
    backgroundColor: '#f7f6f4',
  },
}
</route>
<template>
  <view :style="{ '--message-nav-height': navHeight + 'rpx' }">
    <wd-tabs
      v-model="activeCategory"
      @click="handleCategoryChange"
      :line-width="20"
      :style="{ paddingTop: navHeight + 'rpx' }"
      custom-class="custom-tab"
    >
      <wd-tab
        v-for="item in categoryList"
        :key="item.value"
        :title="item.label"
        :name="item.value"
      ></wd-tab>
    </wd-tabs>
    <custom-nav :title="pageTitle" pageBackgroundColor="#f7f6f4">
      <template #right>
        <view
          v-if="activeCategory === 'normal'"
          class="kf"
          :class="{ disabled: !isPublish }"
          @click.stop="debouncedCreatePost"
        >
          {{ t('publish.index.header.publish_btn') }}
        </view>
      </template>
      <template #default>
        <!-- 内容卡片 -->
        <view class="card">
          <view v-if="activeCategory === 'promotion'" class="cardTitle">
            {{ t('publish.index.promotion.title') }}
          </view>
          <view class="txtBox">
            <wd-textarea
              v-model="postContent"
              :placeholder="t('publish.index.content.placeholder')"
              custom-textarea-class="pubTextArea"
              auto-height
              :maxlength="1000"
              show-word-limit
              :ignoreCompositionEvent="false"
              :auto-focus="true"
            />
          </view>
          <view class="uploadBox">
            <wd-upload
              :file-list="fileList"
              multiple
              :limit="9"
              :action="ossConfig?.host"
              :build-form-data="buildFormData"
              @change="handleChange"
              @success="handleOssUploadSuccess"
              custom-class="pubUpload"
            ></wd-upload>
          </view>
        </view>

        <!-- 推广表单 -->
        <template v-if="activeCategory === 'promotion'">
          <!-- 推广类型卡片 -->
          <view class="card">
            <view class="cardTitle">{{ t('publish.index.promotion.type') }}</view>
            <view class="typeGrid">
              <view
                v-for="item in promotionTypes"
                :key="item.value"
                class="typeChip"
                :class="{ active: promotionType === item.value }"
                @click="promotionType = item.value"
              >
                {{ item.label }}
              </view>
            </view>
          </view>

          <!-- 联系方式卡片 -->
          <view class="card">
            <view class="cardTitle">{{ t('publish.index.promotion.contact') }}</view>
            <view class="contactItem">
              <view class="formLabel">{{ t('publish.index.promotion.email') }}</view>

              <wd-input
                v-model="contactEmail"
                :placeholder="t('publish.index.promotion.email.placeholder')"
                custom-class="pubInput"
              />
            </view>
            <view class="contactItem">
              <view class="formLabel">{{ t('publish.index.promotion.wechat') }}</view>
              <wd-input
                v-model="contactWechat"
                :placeholder="t('publish.index.promotion.wechat.placeholder')"
                custom-class="pubInput"
              />
            </view>
          </view>

          <!-- 有效期卡片 -->
          <view class="card">
            <view class="cardTitle">{{ t('publish.index.promotion.validity') }}</view>
            <view class="validityGrid">
              <view
                v-for="item in validityOptions"
                :key="item.value"
                class="validityChip"
                :class="{ active: validityDays === item.value }"
                @click="validityDays = item.value"
              >
                {{ item.label }}
              </view>
            </view>

            <!-- 阅读并同意协议 -->
            <view class="agreementRow" @click="hasAgreed = !hasAgreed">
              <view class="agreementCheckbox" :class="{ checked: hasAgreed }">
                <wd-icon name="check" size="24rpx" color="#ffffff" />
              </view>
              <text class="agreementText">{{ t('publish.index.promotion.agreement') }}</text>
            </view>
          </view>
        </template>

        <!-- 推广模式发布卡片 -->
        <view v-if="activeCategory === 'promotion'" class="card">
          <!-- 可见范围 -->
          <view class="visibilityRow">
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
          </view>

          <!-- 发布按钮 -->
          <view
            class="publishBtn"
            :class="{ disabled: !isPublish }"
            @click.stop="debouncedCreatePost"
          >
            {{ t('publish.index.promotion.publish_btn') }}
          </view>
          <!-- 注释 -->
          <view class="footerNote">{{ t('publish.index.promotion.footer_note') }}</view>
        </view>
      </template>

      <template #footer></template>
    </custom-nav>
    <wd-toast />
    <wd-message-box selector="wd-message-box-slot" />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { navigateBack, toUrl } from '@/utils'
import {
  createPostApi,
  createPromotionPostApi,
  type PromotionType,
  type PromotionValidity,
} from '@/service/api/community'
import { useToast, useMessage } from 'wot-design-uni'
import { useUserStore } from '@/store'
import { getAliyunOssConfigApi, type getAliyunOssConfigApiResponse } from '@/service/api/upload'
import { debounce } from 'lodash-es'
import CustomNav from '@/components/CustomNav/CustomNav.vue'

const message = useMessage('wd-message-box-slot')

// 语言
const locale = uni.getLocale()
const toast = useToast()
const userStore = useUserStore()

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

const pageTitle = computed(() => {
  return activeCategory.value === 'promotion'
    ? t('publish.index.tab.promotion')
    : t('publish.index.tab.normal')
})

const handleCategoryChange = ({ name }: { name: PublishCategory }) => {
  activeCategory.value = name
}

// 推广类型选项
const promotionTypes = computed(() => [
  { label: t('publish.index.promotion.type.cooperation'), value: 'cooperation' as PromotionType },
  { label: t('publish.index.promotion.type.interaction'), value: 'interaction' as PromotionType },
  { label: t('publish.index.promotion.type.product'), value: 'product' as PromotionType },
  { label: t('publish.index.promotion.type.service'), value: 'service' as PromotionType },
  { label: t('publish.index.promotion.type.other'), value: 'other' as PromotionType },
])

// 有效期选项
const validityOptions = computed(() => [
  { label: t('publish.index.promotion.validity.7days'), value: 7 as PromotionValidity },
  { label: t('publish.index.promotion.validity.30days'), value: 30 as PromotionValidity },
  { label: t('publish.index.promotion.validity.longterm'), value: 0 as PromotionValidity },
])

// 文本内容
const postContent = ref('')

// 图片上传
const fileList = ref([])
const ossUploadedFiles = ref<string[]>([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)
const ossUrlMap = ref<Record<string, string>>({})

// 推广表单
const promotionType = ref<PromotionType>('cooperation')
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

// 导航栏尺寸计算（适配多端安全区）
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)
const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

const submitLoading = ref(false)

const isPublish = computed(() => {
  const hasContent = postContent.value.length > 0 || ossUploadedFiles.value.length > 0
  if (activeCategory.value === 'promotion') {
    return userStore.isLogin && hasContent && hasAgreed.value
  }
  return userStore.isLogin && hasContent
})

// 使用 ref 来存储防抖函数的引用
const debouncedCreatePost = ref<(() => Promise<void>) | null>(null)

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

  debouncedCreatePost.value = debounce(createPost, 1000, {
    leading: true,
    trailing: false,
  })
})

// 创建帖子
const createPost = async () => {
  if (!userStore.isLogin) {
    toUrl('/pages/cats/login/login', true, false)
    return
  }
  if (!postContent.value && ossUploadedFiles.value.length === 0) {
    toast.show(t('common.toast.pleaseInputContent'))
    return
  }
  if (activeCategory.value === 'promotion' && !hasAgreed.value) {
    toast.show(t('common.agree'))
    return
  }

  message
    .confirm({
      msg: t('social.publish.confirm_txt'),
      cancelButtonText: t('social.publish.confirm.no'),
      confirmButtonText: t('social.publish.confirm.yes'),
    })
    .then(async () => {
      // 防止重复提交
      if (submitLoading.value) return
      submitLoading.value = true

      try {
        let res
        if (activeCategory.value === 'promotion') {
          res = await createPromotionPostApi({
            content: postContent.value,
            images: ossUploadedFiles.value,
            promotion_type: promotionType.value,
            contact_email: contactEmail.value || undefined,
            contact_wechat: contactWechat.value || undefined,
            validity_days: validityDays.value,
          })
        } else {
          res = await createPostApi(postContent.value, ossUploadedFiles.value)
        }
        if (res.code === 1) {
          toast.show(t('common.toast.post_success'))
          uni.$emit('refreshSocialTab')
          uni.$emit('switchToSocialTab')
          navigateBack()
        } else {
          toast.show(res.msg)
        }
      } catch (error) {
        toast.info('失败:' + error.errMsg)
      } finally {
        submitLoading.value = false
      }
    })
    .catch(() => {})
}

// 在组件卸载时清理防抖函数
onUnmounted(() => {
  if (debouncedCreatePost.value) {
    ;(debouncedCreatePost.value as any).cancel()
  }
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

:deep(.zh-Hans, .zh-Hant) {
  .wd-textarea * {
    font-family: Alibaba PuHuiTi2 !important;
  }
}

.page {
  background-color: #f7f6f4;
  .pbl,
  .pbr {
    .fbg {
      background-color: #f7f6f4;
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
  background-color: #f7f6f4 !important;
  z-index: 10;
  .wd-tabs__nav {
    background-color: #f7f6f4 !important;
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
  background-color: #f7f6f4 !important;
  padding: 24rpx !important;
  padding-top: calc(80rpx + var(--liberty-cats-page-common-border-radius)) !important;
}

.kf {
  font-size: 28rpx;
  font-weight: 500;
  line-height: 32rpx;
  color: #ffffff;
}
.kf.disabled {
  color: #ccc;
}

/* 卡片基础样式 */
.card {
  // margin: 0 32rpx 24rpx;
  padding: 32rpx 24rpx;
  background-color: #ffffff;
  border-radius: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 32rpx;
}

.cardTitle {
  margin-bottom: 24rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333;
}

.txtBox {
  min-height: 200rpx;
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

  &:last-child {
    margin-bottom: 0;
  }
}

.formLabel {
  margin-bottom: 12rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #666;
}

:deep(.pubInput) {
  .wd-input__inner {
    height: 80rpx;
    // background-color: #f9f9f9;
    border-radius: 12rpx;
    padding-left: 12rpx;
    border: 1px solid #d0d0d0;
  }
}

.typeGrid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.typeChip {
  padding: 14rpx 36rpx;
  border-radius: 18rpx;
  border: 1px solid #d0d0d0;
  font-size: 26rpx;
  color: #666;
  transition: all 0.2s ease;

  &.active {
    background-color: #ff6b03;
    border: 1px solid #ff6b03;
    color: #ffffff;
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
  border-radius: 16rpx;
  border: 1px solid #d0d0d0;
  font-size: 26rpx;
  color: #666;
  transition: all 0.2s ease;

  &.active {
    background-color: #ff6b03;
    border: 1px solid #ff6b03;
    color: #ffffff;
    font-weight: 600;
  }
}

/* 发布按钮 */
.publishBtn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: 18rpx;
  background-color: #ff6b03;
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
  transition: opacity 0.2s ease;

  &.disabled {
    background-color: #ffd4b8;
    color: #ffffff;
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
  border: 1px solid #d0d0d0;
  border-radius: 50%;
  background-color: #ffffff;
  transition: all 0.2s ease;

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
  color: #333;
}

/* 注释文案 */
.footerNote {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #999;
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
  border: 1px solid #d0d0d0;
  border-radius: 6rpx;
  background-color: #ffffff;
  transition: all 0.2s ease;

  &.checked {
    background-color: #ff6b03;
    border-color: #ff6b03;
  }
}

.agreementText {
  font-size: 24rpx;
  color: #666;
}
</style>

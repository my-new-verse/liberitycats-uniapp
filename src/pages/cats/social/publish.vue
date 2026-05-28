<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: 'Publish',
  },
}
</route>

<template>
  <view class="page bg-white" :class="[locale]">
    <view class="customNav" :style="{ height: navHeight + 'rpx' }">
      <view class="navHeaderBg" :style="{ paddingTop: navHeaderPaddingTop + 'rpx' }">
        <view class="navCnt">
          <view class="left" @click="navigateBack()">
            <image src="/static/images/back2.png" mode="widthFix" />
          </view>
          <view class="kf" :class="{ disabled: !isPublish }" @click.stop="debouncedCreatePost">
            {{ t('publish.index.header.publish_btn') }}
          </view>
        </view>
      </view>
      <view class="navBg">
        <view class="pbl2">
          <view class="fbg"></view>
        </view>
        <view class="pbr2">
          <view class="fbg"></view>
        </view>
      </view>
    </view>

    <view class="cnt" :style="{ paddingTop: cntPaddingTop + 'rpx' }">
      <view class="txtBox">
        <wd-textarea
          v-model="postContent"
          :placeholder="t('publish.index.content.placeholder')"
          custom-textarea-class="pubTextArea"
          auto-height
          :maxlength="300"
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
    <wd-message-box selector="wd-message-box-slot" />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { navigateBack, toUrl } from '@/utils'
import { createPostApi } from '@/service/api/community'
import { useToast, useMessage } from 'wot-design-uni'
import { useUserStore } from '@/store'
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'
import { debounce } from 'lodash-es'

const message = useMessage('wd-message-box-slot')

// 语言
const locale = uni.getLocale()
const toast = useToast()
const userStore = useUserStore()

const fileList = ref([])
const ossUploadedFiles = ref<string[]>([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)

const ossUrlMap = ref<Record<string, string>>({})

const handleOssUploadSuccess = (e) => {
  const ossUrl = `${ossConfig.value?.host}/${e.formData.key}`
  // 以 uid 为 key 记录 ossUrl
  ossUrlMap.value[e.file.uid] = ossUrl

  // 用最新的 e.fileList 生成 ossUploadedFiles，顺序与 fileList 一致
  ossUploadedFiles.value = e.fileList.map((f) => ossUrlMap.value[f.uid]).filter(Boolean)

  console.log('上传成功', e.fileList, ossUploadedFiles.value)
}
/**
 * 生成基于用户 ID 的唯一标识（用于上传文件名）
 * @param userId 用户 ID（数字或字符串）
 * @returns 唯一字符串，格式如：`{userId}_{timestamp}_{random}`
 */
function generateUniqueIdWithUser(): string {
  const timestamp = Date.now() // 毫秒级时间戳
  const randomStr = Math.random().toString(36).substring(2, 10) // 随机 8 位字母数字
  return `${userStore.userInfo?.member_id || ''}_${timestamp}_${randomStr}`
}
/* *
 * 构建 formData
 * @param {Object} { file, formData, resolve }
 * @return {Object} formData
 * */
const buildFormData = ({ file, formData, resolve }) => {
  let imageName = file.url.substring(file.url.lastIndexOf('/') + 1) // 从图片路径中截取图片名称
  // #ifdef H5
  // h5端url中不包含扩展名，可以拼接一下name
  imageName = imageName + file.name
  const uniqueId = generateUniqueIdWithUser()
  // #endif
  const key = `${ossConfig.value?.dir}/${uniqueId}_${imageName}` // 图片上传到oss的路径(拼接你的文件夹和文件名)
  // eslint-disable-next-line camelcase
  const success_action_status = '200' // 将上传成功状态码设置为200，默认状态码为204

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
  resolve(formData) // 组装成功后返回 formData，必须返回
}

const handleChange = (e) => {
  // 删除时同步 ossUploadedFiles
  ossUploadedFiles.value = e.fileList.map((f) => ossUrlMap.value[f.uid]).filter(Boolean)
}

const postContent = ref('')

// 获取屏幕边界到安全区域距离
// 获取屏幕边界到安全区域距离
const { safeAreaInsets } = uni.getSystemInfoSync()
const safeTopRpx = ref<number>(0)

const navHeight = ref<number>(0)
const navHeaderPaddingTop = ref<number>(0)
const cntPaddingTop = ref<number>(0)

// 使用 ref 来存储防抖函数的引用
const debouncedCreatePost = ref<(() => Promise<void>) | null>(null)

onMounted(() => {
  // 获取状态栏高度
  const systemInfo = uni.getSystemInfoSync()
  const statusBarHeight = systemInfo.statusBarHeight || 0

  // 如果是Android设备，直接使用状态栏高度
  // 如果是iOS设备，使用safeAreaInsets.top
  safeTopRpx.value =
    systemInfo.platform === 'android' ? statusBarHeight : safeAreaInsets?.top || statusBarHeight

  // 转换为rpx
  safeTopRpx.value = safeTopRpx.value / (systemInfo.windowWidth / 750)

  navHeight.value = safeTopRpx.value + 40 + 104
  navHeaderPaddingTop.value = safeTopRpx.value
  cntPaddingTop.value = navHeight.value - 20

  console.log('safeAreaInsets', safeAreaInsets)
  console.log('safeTopRpx.value', safeTopRpx.value)
  console.log('navHeight.value', navHeight.value)
  console.log('navHeaderPaddingTop.value', navHeaderPaddingTop.value)
  console.log('cntPaddingTop.value', cntPaddingTop.value)

  getAliyunOssConfigApi().then((res) => {
    ossConfig.value = res.data
  })

  debouncedCreatePost.value = debounce(createPost, 1000, {
    leading: true, // 立即执行第一次
    trailing: false, // 不执行最后的回调
  })
})

// 创建原始的 createPost 函数
const createPost = async () => {
  if (!userStore.isLogin) {
    // toast.show(t('common.toast.pleaseLogin'))
    toUrl('/pages/cats/login/login', true, false)
    return
  }
  if (!postContent.value && ossUploadedFiles.value.length === 0) {
    toast.show(t('common.toast.pleaseInputContent'))
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
        const res = await createPostApi(postContent.value, ossUploadedFiles.value)
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

const submitLoading = ref(false)
const isPublish = computed(() => {
  return userStore.isLogin && (postContent.value.length > 0 || ossUploadedFiles.value.length > 0)
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
  background-color: #ffffff;
  .pbl,
  .pbr {
    .fbg {
      background-color: #ffffff;
    }
  }
}

.customNav {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 99;
  width: 100%;
  height: calc(104rpx + var(--liberty-cats-page-common-border-radius) + env(safe-area-inset-top));
  overflow: hidden;

  .navHeaderBg {
    width: 100%;
    height: 104rpx;
    padding-top: calc(env(safe-area-inset-top));
    overflow: hidden;
    background-color: var(--liberty-cats-primary-color);

    .navCnt {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: calc(100% - 48rpx);
      height: 104rpx;
      padding: 0 24rpx;

      .left {
        width: 48rpx;
        height: 48rpx;
        margin-right: 16rpx;
        image {
          width: 100%;
          height: 100%;
        }
      }
      .searchBox {
        display: flex;
        align-items: center;
        justify-content: center;
        width: calc(100% - 48rpx - 16rpx - 12rpx);
        height: 56rpx;
        padding: 6rpx;
        font-size: 32rpx;
        font-weight: 600;
        line-height: 48rpx;
        color: #ffffff;
        text-align: center;
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
    }
  }

  .navBg {
    position: relative;
    width: 100%;
    height: var(--liberty-cats-page-common-border-radius);
    background-color: transparent;

    .pbl2,
    .pbr2 {
      position: absolute;
      top: 0;
      z-index: 9;
      width: var(--liberty-cats-page-common-border-radius);
      height: var(--liberty-cats-page-common-border-radius);
      overflow: hidden;
      background-color: var(--liberty-cats-primary-color);

      .fbg {
        width: 100%;
        height: 100%;
        background-color: #fff;
      }
    }

    .pbl2 {
      left: 0;
      .fbg {
        border-radius: var(--liberty-cats-page-common-border-radius) 0 0 0;
      }
    }
    .pbr2 {
      right: 0;
      .fbg {
        border-radius: 0 var(--liberty-cats-page-common-border-radius) 0 0;
      }
    }
  }
}

.txtBox {
  min-height: 200rpx;
  margin-bottom: 32rpx;
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
</style>

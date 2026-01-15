<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: '%kf.add.page_title%',
  },
}
</route>

<template>
  <view class="page" :class="[locale]">
    <view class="pbl">
      <view class="fbg"></view>
    </view>
    <view class="pbr">
      <view class="fbg"></view>
    </view>
    <view class="cnt">
      <view class="menuBox">
        <view class="menuItem" @click="toUrl('/pages/cats/faq/list', true)">
          <view class="menuItemTitle">
            <view class="icon2">
              <image class="iconImg" src="@/static/images/order.png" mode="widthFix" />
            </view>
            <view class="title">{{ t('kf.add.help_center') }}</view>
          </view>
          <view class="menuItemRight">
            <view class="arrow"></view>
          </view>
        </view>
      </view>

      <view class="cell leftRight">
        <view class="label">{{ t('kf.add.email') }}</view>
        <view class="inputBox">
          <wd-input
            type="text"
            v-model="feedback.email"
            :placeholder="t('kf.add.email.placeholder')"
            :no-border="true"
            customInputClass="rightInput"
            inputmode="email"
            :ignoreCompositionEvent="false"
          />
        </view>
      </view>

      <view class="cell">
        <view class="label">{{ t('kf.add.question') }}</view>
        <view class="inputBox">
          <wd-textarea
            v-model="feedback.content"
            :placeholder="t('kf.add.question.placeholder')"
            custom-class="textArea"
            auto-height
            :maxlength="500"
            show-word-limit
            :ignoreCompositionEvent="false"
          />
        </view>

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

    <view class="fixedBtnBox">
      <wd-button custom-class="mainBtn" @click="save" :loading="subLoading" :disabled="subDisabled">
        {{ t('common.submit_btn_txt') }}
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import i18n, { t } from '@/locale/index'
import { feedbackContent, addFeedbackApi } from '@/service/api/feedback'
import { toUrl } from '@/utils'
import { useToast } from 'wot-design-uni'
import { ref } from 'vue'
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'

const toast = useToast()
// 语言
const locale = uni.getLocale()

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
  // #endif

  const key = `${ossConfig.value?.dir}/${imageName}` // 图片上传到oss的路径(拼接你的文件夹和文件名)
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

// 地址数据
const feedback = ref<feedbackContent>({
  id: 0,
  email: '',
  content: '',
  images: [],
  create_time: '',
})

const bak = ref<string>('')

onLoad((options) => {
  if (options?.bak) {
    bak.value = options.bak
  }
})

const subLoading = ref(false)
const subDisabled = ref(false)

const save = () => {
  const reg = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ // 修正邮箱正则
  if (!feedback.value.email || !reg.test(feedback.value.email)) {
    toast.show(t('kf.add.email.placeholder')) // 需要确保语言包有对应翻译
    return
  }
  if (feedback.value.content.length < 10) {
    toast.show(t('kf.add.question.placeholder'))
    return
  }

  subLoading.value = true
  subDisabled.value = true
  feedback.value.images = ossUploadedFiles.value
  addFeedbackApi(feedback.value)
    .then((res) => {
      if (res.code === 1) {
        toast.show(t('common.submit_success'))
        setTimeout(() => {
          if (bak.value) {
            toUrl(bak.value, true)
          } else {
            uni.navigateBack()
          }
        }, 3000)
      } else {
        toast.show(res.msg)
      }
    })
    .finally(() => {
      subLoading.value = false
    })
}

onMounted(() => {
  getAliyunOssConfigApi().then((res) => {
    ossConfig.value = res.data
  })
})
</script>

<style lang="scss" scoped>
@import '/src/style/base';

.phone-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.zh-Hans,
.zh-Hant {
  .cell {
    .label {
      white-space: nowrap;
    }
  }
}

:deep(.phoneAreaCode) {
  .wd-picker__cell {
    padding: 0;
  }
}

:deep(.uni-textarea-wrapper) {
  min-height: 200rpx;
}
</style>

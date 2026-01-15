<template>
  <view>
    <wd-upload
      :file-list="files"
      :action="ossConfig?.host"
      :build-form-data="buildFormData"
      @change="handleChange"
    ></wd-upload>
  </view>
</template>

<script lang="ts" setup>
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'
import { ref } from 'vue'

const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)

const files = ref<Record<string, any>[]>([])

function handleChange({ fileList }) {
  files.value = fileList
}

onMounted(() => {
  getAliyunOssConfigApi().then((res) => {
    ossConfig.value = res.data
  })
})

/* *
 * 构建 formData
 * @param {Object} { file, formData, resolve }
 * @return {Object} formData
 * */
const buildFormData = async ({ file, formData, resolve }) => {
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
  }
  resolve(formData) // 组装成功后返回 formData，必须返回
}
</script>

<style lang="scss" scoped></style>

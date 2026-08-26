<route lang="json5" type="page">
{
  style: {
    navigationStyle: 'custom',
    backgroundColor: '#f7f6f4',
  },
}
</route>

<template>
  <view>
    <custom-nav :title="t('setting.avatar.page_title')" pageBackgroundColor="#f7f6f4">
      <template #default>
        <view class="avatarBox">
          <view class="avatar">
            <image
              :src="getImageUrl(showAvatar + '?x-oss-process=style/jzcq')"
              mode="widthFix"
            ></image>
          </view>
          <view class="title">
            <wd-upload
              :file-list="fileList"
              :limit="9"
              :action="ossConfig?.host"
              :build-form-data="buildFormData"
              @change="handleChange"
              @success="handleOssUploadSuccess"
              custom-class="pubUpload"
            >
              {{ t('setting.avatar.select_image_txt') }}
            </wd-upload>
          </view>
        </view>
        <view class="selectBox">
          <view class="titleBox">{{ t('setting.avatar.select_avatar') }}</view>
          <view class="selectList">
            <view
              class="item"
              :class="{ active: showAvatar === item }"
              v-for="(item, index) in defaultAvatarList"
              :key="index"
              @click="changeAvatar(index)"
            >
              <image :src="getImageUrl(item)" mode="widthFix"></image>
            </view>
          </view>
          <view class="btnBox">
            <wd-button type="success" custom-class="mainBtn" @click="saveAvatar">
              {{ t('common.save_btn_txt') }}
            </wd-button>
          </view>
        </view>
      </template>
    </custom-nav>
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { useUserStore } from '@/store/user'
import { useToast } from 'wot-design-uni'
import { getAliyunOssConfigApi, getAliyunOssConfigApiResponse } from '@/service/api/upload'

import CustomNav from '@/components/CustomNav/CustomNav.vue'

import { getDefaultAvatarApi, updateBaseInfoApi, updateBaseInfoParams } from '@/service/api/user'
import { getImageUrl } from '@/utils'

const userStore = useUserStore()
const toast = useToast()

const fileList = ref([])
const ossConfig = ref<getAliyunOssConfigApiResponse | null>(null)

// 语言
const locale = uni.getLocale()

const showAvatar = ref<string>('')
showAvatar.value = userStore.userInfo.avatar
const selectIndex = ref<number>(0)

const defaultAvatarList = ref<string>()
getDefaultAvatarApi().then((res) => {
  defaultAvatarList.value = res.data
  if (showAvatar.value.length <= 10) {
    showAvatar.value = getImageUrl(defaultAvatarList.value[selectIndex.value])
  }
})

const changeAvatar = (index: number) => {
  selectIndex.value = index
  showAvatar.value = getImageUrl(defaultAvatarList.value[index])
}

const saveAvatar = () => {
  const params: updateBaseInfoParams = {
    field: 'avatar',
    value: showAvatar.value,
  }
  updateBaseInfoApi(params).then((res) => {
    if (res.code === 1) {
      toast.show(t('common.save_success'))
      userStore.getUserInfo()
    } else {
      toast.show(res.msg)
    }
  })
}

onMounted(() => {
  getAliyunOssConfigApi().then((res) => {
    ossConfig.value = res.data
  })
})

// upload start

const handleChange = (e) => {
  fileList.value = e.fileList
}

const handleOssUploadSuccess = (e) => {
  console.log('handleOssUploadSuccess->e', e, `${ossConfig.value?.host}/${e.formData.key}`)
  showAvatar.value = `${ossConfig.value?.host}/${e.formData.key}`
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
// upload end
</script>

<style lang="scss" scoped>
@import '/src/style/base';
.avatarBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 482rpx;
  background-color: var(--bg-card);
  border-radius: 40rpx;
  .avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 320rpx;
    height: 320rpx;
    overflow: hidden;
    background-color: #f7f7f7;
    border-radius: 50%;
    image {
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
  }
  .title {
    margin-top: 32rpx;
    font-size: 28rpx;
    font-style: normal;
    font-weight: 500;
    color: #ff6b03;
  }
}

.selectBox {
  padding: 32rpx;
  margin-top: 24rpx;
  background-color: var(--bg-card);
  border-radius: 40rpx;
  .titleBox {
    font-size: 28rpx;
    font-style: normal;
    font-weight: 500;
    line-height: 33rpx;
    color: var(--text-primary);
  }
  .selectList {
    margin-top: 24rpx;
    .item {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 96rpx;
      height: 96rpx;
      margin-top: 24rpx;
      margin-right: 24rpx;
      overflow: hidden;
      image {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    }
    .item:nth-child(5n) {
      margin-right: 0;
    }
    .item.active {
      border: 4rpx solid #ff6b03;
      border-radius: 50%;
    }
  }
  .btnBox {
    margin-top: 32rpx;
    .mainBtn {
      width: 100%;
      height: 88rpx;

      font-size: 32rpx;
      font-style: normal;
      font-weight: 600;
      color: var(--bg-card);
      text-align: center;
      background: #ff6b03;
    }
  }
}

:deep(.pubUpload) {
  .wd-upload__evoke,
  .wd-upload__preview {
    display: none;
  }
}
</style>

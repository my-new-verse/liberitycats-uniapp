<route lang="json5" type="page">
{
  layout: 'default',
  style: {
    navigationBarTitleText: 'Test Page',
    enablePullDownRefresh: true,
  },
}
</route>

<template>
  <view class="">
    <wd-cell-group border>
      <wd-cell title="测试新闻列表" @click="testNewsApi" clickable>
        <template #icon>
          <wd-icon class="mr-1" name="read" size="16px"></wd-icon>
        </template>
      </wd-cell>
      <wd-cell title="首页效果" is-link to="/pages/test/home">
        <template #icon>
          <wd-icon class="mr-1" name="minus-rectangle" size="16px"></wd-icon>
        </template>
      </wd-cell>
      <wd-cell title="欧易签名" @click="showToast" clickable>
        <template #icon>
          <wd-icon class="mr-1" name="rectangle" size="16px"></wd-icon>
        </template>
      </wd-cell>
      <wd-cell title="欧易支付" @click="showToast" clickable>
        <template #icon>
          <wd-icon class="mr-1" name="rectangle" size="16px"></wd-icon>
        </template>
      </wd-cell>
      <wd-cell title=" 启动时上报信息" label="APP启动时上报客户端信息" clickable>
        <template #icon>
          <wd-icon class="mr-1" name="read" size="16px"></wd-icon>
        </template>
      </wd-cell>
      <wd-cell
        title=" I18n和字体"
        label="测试I18n多语言切换和字体跟随切换"
        is-link
        to="/pages/test/i18n"
        clickable
      >
        <template #icon>
          <wd-icon class="mr-1" name="read" size="16px"></wd-icon>
        </template>
      </wd-cell>
    </wd-cell-group>

    <wd-cell
      title="通用列表内页模版"
      label="通用列表内页模版，可再次基层上直接对接业务"
      is-link
      to="/pages/demo/list_demo"
    >
      <template #icon>
        <wd-icon class="mr-1" name="read" size="16px"></wd-icon>
      </template>
    </wd-cell>

    <wd-cell
      title="通用详情内页模版"
      label="通用详情内页模版，可再次基层上直接对接业务"
      is-link
      to="/pages/demo/detail_demo"
    >
      <template #icon>
        <wd-icon class="mr-1" name="read" size="16px"></wd-icon>
      </template>
    </wd-cell>

    <view class="version-info">
      <p>版本号: {{ version }}</p>
      <p>构建时间: {{ buildTime }}</p>
    </view>
  </view>
</template>

<script lang="ts" setup>
//
import { useToast } from 'wot-design-uni'
import buildInfo from '@/../build-info.json'
import { getNewsListApi } from '@/service/api/news'

const toast = useToast()
const showToast = () => {
  toast.show('功能开发中...')
}

const version = ref('')
const buildTime = ref('')

const testNewsApi = async () => {
  try {
    const res = await getNewsListApi(1, 'en')
    console.log('新闻列表接口测试结果:', res)
    toast.show('请查看控制台输出')
  } catch (err) {
    console.error('新闻列表接口测试失败:', err)
    toast.show('接口调用失败')
  }
}

onMounted(() => {
  version.value = buildInfo.version
  buildTime.value = buildInfo.buildTime
})
</script>

<style lang="scss" scoped>
//
.version-info {
  margin-top: 30rpx;
  font-size: 12px;
  color: #efefef;
  text-align: center;
}
</style>

<route lang="json">
{
  "style": {
    "navigationBarTitleText": "%app.name%"
  }
}
</route>

<template>
  <view class="center flex-col mt-6" :class="[fontFamily]">
    <view class="text-red-500 p-4 leading-6">
      经过我的测试发现，里面会有2处BUG：
      <view>
        <text class="line-through">1. 页面标题多语言不生效</text>
        <text class="ml-2 text-green-500">已解决</text>
      </view>
      <view>
        <text class="line-through">2. 多语言传递的参数不生效，如下 heavy</text>
        <text class="ml-2 text-green-500">已解决</text>
        <view class="ml-2 text-green-500">把 $t 改为自定义的 t 即可</view>
      </view>
      <view>
        <text class="line-through">3. UI Component语言同步切换</text>
        <text class="ml-2 text-green-500">已解决</text>
      </view>
    </view>
    <view class="text-green-500">多语言测试</view>
    <view class="m-4">{{ $t('app.name') }}</view>
    <view class="m-4">{{ $t('weight', { heavy: 100 }) }}</view>
    <view class="m-4">{{ t('introduction', user) }}</view>

    <view class="text-green-500 mt-12">切换语言</view>
    <view class="uni-list">
      <radio-group @change="radioChange" class="radio-group">
        <label
          class="uni-list-cell uni-list-cell-pd"
          v-for="(item, index) in languages"
          :key="index"
        >
          <view>
            <radio :value="index" :checked="item.value === current" />
          </view>
          <view>{{ item.name }}</view>
        </label>
      </radio-group>
    </view>

    <!-- http://localhost:9000/#/pages/index/i18n -->
    <view>
      <button @click="testI18n" class="mt-20 mb-44">测试弹窗</button>
      <button @click="testI18n2" class="mt-20 mb-44">APP i18n Key转换</button>
    </view>

    <wd-loadmore state="loading" />
  </view>
</template>

<script lang="ts" setup>
import i18n, { t } from '@/locale/index'
import { testI18n, getServerI18nKey } from '@/utils/i18n'

const current = ref(uni.getLocale())
const user = { name: '张三', detail: { height: 178, weight: '75kg' } }
const languages = [
  {
    value: 'zh-Hans',
    value2: 'zh-CN',
    name: '中文',
    checked: 'true',
  },
  {
    value: 'en',
    value2: 'en-US',
    name: '英文',
  },
  {
    value: 'zh-Hant',
    value2: 'zh-TW',
    name: '繁体中文',
  },
  {
    value: 'ja',
    value2: 'ja-JP',
    name: '日文',
  },
]

const fontFamily = ref('')

const radioChange = async (evt) => {
  console.log('DDDDDDDDDDDDDDDDDDDDDDDDDD', evt)
  const index = evt.detail.value
  const item = languages[index]
  current.value = item.value
  // 下面2句缺一不可！！！
  uni.setLocale(item.value)
  i18n.global.locale = item.value
  fontFamily.value = item.value

  // 动态导入语言包
}

const testI18n2 = () => {
  const local = uni.getLocale()
  const serverI18nKey = getServerI18nKey()
  uni.showModal({
    title: '转换结果',
    content: `${local} -> ${serverI18nKey}`,
  })
}
</script>

<style lang="scss">
.uni-list {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: #fff;
  border-radius: 12px;
}

.radio-group {
  width: 200px;
  margin: 10px auto;
  border-radius: 12px;
}

.uni-list-cell {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: #bcecd1;
}
</style>

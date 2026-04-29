<route lang="json">
{
  "style": {
    "navigationBarTitleText": "LCAT AI"
  }
}
</route>
<template>
  <web-view :src="targetUrl" style="background-color: #ff6b03"></web-view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const targetUrl = ref('')

onLoad((options) => {
  if (options && options.url) {
    targetUrl.value = decodeURIComponent(options.url)
  }
})
</script>

<style>
page {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

<template>
  <ActivityPopup ref="popupRef" />
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import ActivityPopup from './ActivityPopup.vue'
import { usePopupStore } from '@/store/popup'

const popupStore = usePopupStore()
const popupRef = ref<InstanceType<typeof ActivityPopup> | null>(null)
const pageVisible = ref(false)

const tryShow = async () => {
  if (!pageVisible.value || !popupRef.value) return
  const data = popupStore.claimCurrent()
  if (!data) return
  await nextTick()
  popupRef.value?.show(data, popupStore.forceShow.value)
}

onShow(() => {
  pageVisible.value = true
  tryShow()
})

onHide(() => {
  pageVisible.value = false
})

watch([popupRef, popupStore.current], tryShow)
</script>

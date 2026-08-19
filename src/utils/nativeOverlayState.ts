import { ref } from 'vue'

/** Vue 弹层显示时，需要暂时隐藏会覆盖它的 App 原生 WebView。 */
export const nativeOverlayVisible = ref(false)

export const setNativeOverlayVisible = (visible: boolean) => {
  nativeOverlayVisible.value = visible
}

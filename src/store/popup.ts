import { ref } from 'vue'
import { getPopupCurrentApi, type PopupCurrentData } from '@/service/api/popup'

const current = ref<PopupCurrentData | null>(null)
const fetched = ref(false)
const claimed = ref(false)
const forceShow = ref(false)
let fetching: Promise<void> | null = null

const getApiLocale = () => {
  const localeMap: Record<string, string> = {
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    en: 'en-US',
    ja: 'ja-JP',
  }
  return localeMap[uni.getLocale()] || 'en-US'
}

/** 开启一轮新的弹窗展示，用于冷启动及从后台回到前台。 */
function resetStartupSession(force = false) {
  current.value = null
  fetched.value = false
  claimed.value = false
  forceShow.value = force
  fetching = null
}

/** 当前展示轮次只请求一次活动数据。 */
async function fetchForStartup() {
  if (fetched.value) return
  if (fetching) return fetching

  fetching = (async () => {
    try {
      const res = await getPopupCurrentApi(getApiLocale())
      current.value = res.code === 1 ? res.data || null : null
    } catch (error) {
      console.error('fetch activity popup failed', error)
      current.value = null
    } finally {
      fetched.value = true
      fetching = null
    }
  })()

  return fetching
}

/** 第一个可用布局领取展示权，避免切换布局或 tabbar 重复弹出。 */
function claimCurrent() {
  if (!current.value || claimed.value) return null
  claimed.value = true
  return current.value
}

export function usePopupStore() {
  return {
    current,
    fetched,
    claimed,
    forceShow,
    resetStartupSession,
    fetchForStartup,
    claimCurrent,
  }
}

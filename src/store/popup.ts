import { ref, computed } from 'vue'
import { getPopupCurrentApi, PopupData } from '@/service/api/popup'

export interface PopupItem {
  id: number
  code: string
  title: string
  subtitle: string
  images: string[]
  buttonText: string
  dismissible: boolean
  clickType: 'internal' | 'external' | 'webview' | 'none'
  clickUrl: string
  backgroundColor?: string
  displayFrequency: string
  revision: number
}

const queue = ref<PopupItem[]>([])
const current = computed<PopupItem | null>(() => {
  return queue.value.length > 0 ? queue.value[0] : null
})

function shouldShow(frequency: string, code: string, revision: number): boolean {
  if (frequency === 'every_entry') return true

  const key = `popup_${code}`
  const record = uni.getStorageSync(key)

  if (frequency === 'once') {
    if (!record) return true
    return record.revision !== revision
  }

  if (frequency === 'daily') {
    if (!record) return true
    const today = new Date().toDateString()
    return record.date !== today || record.revision !== revision
  }

  return false
}

function markShown(code: string, revision: number) {
  uni.setStorageSync(`popup_${code}`, {
    date: new Date().toDateString(),
    revision,
  })
}

function isInTimeWindow(startAt: string | null, endAt: string | null): boolean {
  const now = Date.now()
  if (startAt && now < new Date(startAt).getTime()) return false
  if (endAt && now > new Date(endAt).getTime()) return false
  return true
}

function mapTarget(target: PopupData['target']): { clickType: string; clickUrl: string } {
  switch (target.type) {
    case 'post':
      return { clickType: 'internal', clickUrl: `/pages/cats/social/detail?id=${target.id || ''}` }
    case 'comment':
      const postId = target.params?.root_post_id || target.id || ''
      return { clickType: 'internal', clickUrl: `/pages/cats/social/detail?id=${postId}` }
    case 'member':
      return {
        clickType: 'internal',
        clickUrl: `/pages/cats/user/home?member_id=${target.id || ''}`,
      }
    case 'webview':
      return { clickType: 'webview', clickUrl: target.url || '' }
    case 'external_url':
      return { clickType: 'external', clickUrl: target.url || '' }
    default:
      return { clickType: 'none', clickUrl: '' }
  }
}

async function fetchAndSet() {
  try {
    const res = await getPopupCurrentApi()
    if (res.code !== 1 || !res.data) {
      queue.value = []
      return
    }

    const data = res.data

    if (!isInTimeWindow(data.active_time.start_at, data.active_time.end_at)) {
      queue.value = []
      return
    }

    if (!shouldShow(data.display_frequency, data.code, data.revision)) {
      queue.value = []
      return
    }

    const { clickType, clickUrl } = mapTarget(data.target)
    const images = data.media.map((m) => m.url)

    queue.value = [
      {
        id: data.id,
        code: data.code,
        title: data.title,
        subtitle: data.subtitle,
        images,
        buttonText: data.button_text,
        dismissible: true,
        clickType: clickType as PopupItem['clickType'],
        clickUrl,
        displayFrequency: data.display_frequency,
        revision: data.revision,
      },
    ]
  } catch {
    queue.value = []
  }
}

function dismissCurrent() {
  const item = queue.value.shift()
  if (item) {
    markShown(item.code, item.revision)
  }
}

function clear() {
  queue.value = []
}

export function usePopupStore() {
  return {
    queue,
    current,
    fetchAndSet,
    dismissCurrent,
    clear,
  }
}

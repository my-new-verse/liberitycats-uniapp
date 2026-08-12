import { http } from '@/utils/http'

export interface PopupMedia {
  type: 'gif' | 'image'
  url: string
}

export interface PopupTarget {
  type: 'none' | 'post' | 'comment' | 'member' | 'webview' | 'external_url'
  id?: string
  url?: string
  params?: Record<string, string>
}

export interface PopupActiveTime {
  start_at: string | null
  end_at: string | null
}

export interface PopupData {
  id: number
  code: string
  scene: string
  content_type: string
  title: string
  subtitle: string
  media: PopupMedia[]
  rich_content: any
  button_text: string
  target: PopupTarget
  active_time: PopupActiveTime
  display_frequency: 'once' | 'daily' | 'every_entry'
  revision: number
}

export const getCurrentPopupApi = (locale?: string) => {
  const params: any = {}
  if (locale) params.locale = locale
  return http.get<PopupData>('/v1/system/popup/current', params)
}

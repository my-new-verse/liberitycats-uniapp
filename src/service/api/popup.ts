import { http } from '@/utils/http'

export interface PopupMedia {
  type: 'gif' | 'image'
  url: string
}
export interface PopupMediaItem {
  url: string
  type?: string
  [key: string]: unknown
}

export interface PopupTarget {
  type: 'none' | 'post' | 'comment' | 'member' | 'external_url'
  id?: number | string
  url?: string
  params?: Record<string, any>
}

export interface PopupCurrentData {
  id: number | string
  title: string
  subtitle: string
  media: PopupMediaItem[]
  button_text: string
  display_frequency: 'once' | 'daily' | 'every_entry'
  target: PopupTarget
}

/**
 * 获取当前活动弹窗内容
 */
export const getPopupCurrentApi = () => {
  return http.get<PopupCurrentData | null>('/v1/system/popup/current', {})
}

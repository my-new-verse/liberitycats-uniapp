import { http } from '@/utils/http'

export type IRootType = {
  id: number
  status: number
  pop_type: number
  sort: number | null
  i18n_content: I18n_content
  create_time: string | null
}

type I18n_content = {
  id: number
  announcement_id: number
  lang: string
  summary: string
  title: string
  content: string
}

/** GET 请求 */
export const getTest = (lang: string) => {
  return http.get<IRootType>('/v1/system/show', { lang })
}

import { http } from '@/utils/http'

export interface getNewsDetailApiResponse {
  id: number
  title: string
  summary: string
  cover: string
  create_time: number
  content: string
  views: number
  total_view: number
}

export interface getNewsListApiResponse {
  current_page: number
  data: getNewsDetailApiResponse[]
  last_page: number
}

/**
 * 获取新闻列表
 */
export const getNewsListApi = (page: number, type: number) => {
  return http.get<getNewsListApiResponse>('/v1/news/news/list', {
    page,
    size: 20,
    type,
  })
}

export const getNewsDetailApi = (id: number) => {
  return http.get<getNewsDetailApiResponse>('/v1/news/news/detail', {
    id,
  })
}

export interface InFocusListParams {
  page?: number
  limit?: number
  locale?: 'en-US' | 'zh-CN' | 'zh-TW'
  tweet_lang?: string
}

export interface InFocusAuthor {
  id: string | null
  username: string | null
  name: string | null
  avatar: string | null
}

export interface InFocusMedia {
  type?: string
  url?: string
  media_url_https?: string
  expanded_url?: string
  display_url?: string
  original_info?: {
    width?: number
    height?: number
  }
  video_info?: {
    variants?: Array<{
      content_type?: string
      url?: string
      bitrate?: number
    }>
  }
}

export interface InFocusArticle {
  title?: string
  preview_text?: string
  cover_media_img_url?: string
}

export interface InFocusItem {
  id: number
  twitterTweetId: string
  sourceListId: string
  locales: string[]
  tweetLang: string | null
  text: string | null
  url: string | null
  twitterUrl: string | null
  author: InFocusAuthor
  media: InFocusMedia[]
  article?: InFocusArticle
  metrics: Record<string, number | undefined>
  publishedAt: string | null
  createdAt: string | null
}

export interface InFocusListApiResponse {
  current_page: number
  data: InFocusItem[]
  last_page: number
  per_page: number
  total: number
}

export const getInFocusListApi = (params: InFocusListParams = {}) => {
  return http.get<InFocusListApiResponse>('/v1/news/in-focus/list', {
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    locale: params.locale,
    tweet_lang: params.tweet_lang,
  })
}

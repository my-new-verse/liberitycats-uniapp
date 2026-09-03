import { http } from '@/utils/http'

export interface PreloadResource {
  url: string
  ext?: string
  size?: number
  file_size?: number
  fileSize?: number
  content_length?: number
  contentLength?: number
}

export interface getGameParamsApiResponse {
  tempToken: string
  jumpUrl: string
  gameVersion: string // 新增游戏版本字段
  preloadResources?: PreloadResource[] // 可选：后端返回预加载资源列表时自动生效
}

/**
 * 获取资产明细列表
 */
export const getGameParamsApi = (type: string) => {
  return http.get<getGameParamsApiResponse>('/v1/open-api/game/get-new-token', {
    game_type: type,
  })
}

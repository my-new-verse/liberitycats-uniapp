import { http } from '@/utils/http'

export interface getAdListByKeysApiResponse {
  id: number
  quote_key: string
  name: string
  ads: Ads[]
}

export interface Ads {
  id: number
  position_id: number
  name: string
  icon: string
  sort: number
  status: number
  view_count: number
  create_time: string
  url: string
}

export const getAdListByKeysApi = (keys: Array<string>) => {
  return http.get<getAdListByKeysApiResponse[]>('/v1/ad/ad/get-ads', {
    keys,
  })
}

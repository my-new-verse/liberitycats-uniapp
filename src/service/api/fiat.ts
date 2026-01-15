import { http } from '@/utils/http'

export interface getFiatItemResponse {
  name: string
  icon: string
  short_name: string
  symbol: string
  rate: number
  id: number
  input: number | string
  placehodlertxt: number | string
}

export interface getFiatListApiResponse {
  current_page: number
  data: getFiatItemResponse[]
  last_page: number
}

export const getFiatListApi = (page: number) => {
  return http.get<getFiatListApiResponse>('/v1/fiat/rates/list', {
    page,
  })
}

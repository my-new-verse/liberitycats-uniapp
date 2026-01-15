import { http } from '@/utils/http'

export interface getGoodsCategoryApiResponse {
  id: number
  name: string
}

export const getGoodsCategoryApi = () => {
  return http.get<getGoodsCategoryApiResponse[]>('/v1/mall/mall/get-category-list')
}

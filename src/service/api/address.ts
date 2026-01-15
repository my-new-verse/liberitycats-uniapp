import { http } from '@/utils/http'

export interface addressItem {
  id: number
  name: string
  cellphone: string
  address: string
  is_default: number
  member_id: number
  create_time: string
  area_code: string
}

export interface getMyAddressListResponse {
  current_page: number
  data: addressItem[]
  last_page: number
}

/**
 * 获取用户地址列表
 */
export const getMyAddressListApi = (page: number, limit?: number) => {
  return http.get<getMyAddressListResponse>('/v1/member/address/get-lists', {
    page,
    limit,
  })
}

/**
 * 获取用户地址详情
 */
export const getMyAddressDetailApi = (id: number) => {
  return http.get<addressItem>('/v1/member/address/get-detail', {
    id,
  })
}

/**
 * 删除用户地址
 */
export const deleteMyAddressApi = (id: number) => {
  return http.post<any>('/v1/member/address/delete', {
    id,
  })
}

/**
 * 保存用户地址
 */
export const updateMyAddressApi = (param: addressItem) => {
  return http.post<any>('/v1/member/address/save', {
    ...param,
  })
}

/**
 * 设置默认地址
 */
export const setDefaultMyAddressApi = (id: number) => {
  return http.post<any>('/v1/member/address/set-default', {
    id,
  })
}

/**
 * 获取用户最后使用地址
 */
export const getMyLastUseAddressApi = () => {
  return http.get<addressItem>('/v1/member/address/get-my-last-use-address', {})
}

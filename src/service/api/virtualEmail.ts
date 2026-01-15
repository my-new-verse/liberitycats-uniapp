import { http } from '@/utils/http'

export interface accountItem {
  member_id: number
  nickname: string
  avatar: string
  id: number
  login_account: string
  main_member_id: number
}

export interface getVirtualEmailAccountListResponse {
  current_page: number
  data: accountItem[]
  last_page: number
}

/**
 * 获取用户地址列表
 */
export const getVirtualEmailAccountListApi = (page: number, limit?: number) => {
  return http.get<getVirtualEmailAccountListResponse>('/v1/member/virtual-email/get-account-list', {
    page,
    limit,
  })
}

export interface LoginResponse {
  token: string
  expire: number
}

// 切换虚拟账号
export const switchVirtualEmailAccountApi = (id: number) => {
  return http.post<LoginResponse>('/v1/member/virtual-email/switch-account', {
    id,
  })
}

import { http } from '@/utils/http'

export interface sendEmailResponse {
  status: boolean
  email: string
  queue_id: number
  time: number
  ttl: number
  expire: number
}

/**
 * 获取用户信息
 */
export const getUserInfoApi = () => {
  return http.get<sendEmailResponse>('/v1/member/user/get-base-info', {})
}

/**
 * 获取默认头像列表
 */
export const getDefaultAvatarApi = () => {
  return http.get<string>('/v1/member/user/get-default-avatar', {})
}

export interface updateBaseInfoParams {
  field?: string
  value?: string
}
/**
 * 更新昵称或头像
 * @returns
 */
export const updateBaseInfoApi = (params: updateBaseInfoParams) => {
  return http.post<any>('/v1/member/user/update-base-info', params)
}

/**
 * 检查token
 */
export const checkTokenApi = () => {
  return http.get<any>('/v1/member/user/check-token', {}, { priority: 'high' })
}

export interface getNotificationDetailResponse {
  id: number
  is_read: number
  member_id: number
  i18n: I18n
  create_time: string
}

type I18n = {
  title: string
  content: string
}

export interface getNotificationListResponse {
  current_page: number
  data: getNotificationDetailResponse[]
  last_page: number
}

/**
 * 获取通知列表
 */
export const getNotificationListApi = (page: number, limit?: number) => {
  return http.get<getNotificationListResponse>('/v1/member/notification/list', {
    page,
    limit,
  })
}

/**
 * 获取通知详情
 */
export const getNotificationDetailApi = (id: number) => {
  return http.get<getNotificationDetailResponse>('/v1/member/notification/detail', {
    id,
  })
}

// 获取未读通知数量
export const getUnReadNotificationCountApi = () => {
  return http.get<number>('/v1/member/notification/unread-count')
}

// 获取资产总余额
export const getAssetTotalBalanceApi = (assetId: number) => {
  return http.get<number>('/v1/member/user/get-assets', {
    asset_id: assetId,
  })
}

export const getSystemConfigApi = () => {
  return http.get<any>('/v1/member/user/get-system-config', {})
}

export const getSystemConfigApiV2 = (version: string, platform: string) => {
  return http.get<any>(
    '/v1/system/app-update/get-default-config',
    { version, platform },
    { priority: 'high' },
  )
}

// 刷新等级
export const refreshLevelApi = () => {
  return http.get<number>('/v1/member/user/refresh-level')
}

export interface assetInfo {
  asset_key: string
  name: string
  icon: string
  calc_decimal: number
  is_withdraw: number
  is_pay: number
  total_balance: number
  usable_balance: number
  frozen_balance: number
  total_income: number
  total_cost: number
}

export interface getAllAssetTotalBalanceApiResponse {
  [key: string]: assetInfo
}

export const getAllAssetTotalBalanceApi = () => {
  return http.get<getAllAssetTotalBalanceApiResponse>('/v1/member/user/get-all-assets', {})
}

// 绑定AR游戏
export const bindArGameApi = (code: string) => {
  return http.post<any>('/v1/open-api/game/bind-ar-game-member', { code })
}

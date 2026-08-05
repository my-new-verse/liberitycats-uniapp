import { http } from '@/utils/http'

/** 受限功能场景（会员资格准入场景） */
export type MembershipScene = 'publish_ad' | 'group_chat' | 'portfolio' | 'nft_holder'

/** 订阅方案（价格 / 周期由服务端或系统配置决定） */
export interface MembershipPlan {
  plan_id?: string | number
  name?: string
  price?: string
  currency_symbol?: string
  /** month | quarter | year */
  period?: string
  desc?: string
  /** 订阅确认页 / 支付流程地址（站内路径或外链） */
  subscribe_path?: string
  subscribe_url?: string
}

/** 订阅资格 */
export interface MembershipSubscriptionState {
  active: boolean
  expired: boolean
  expire_time?: string
  plan?: MembershipPlan
}

/** NFT Holder 资格 */
export interface MembershipNftState {
  active: boolean
  /** 当前绑定钱包中检测到的合规 NFT 数量 */
  count: number
  /** 持有条件（最少枚数） */
  min_hold: number
  wallet_address: string
  collection: string
  network: string
  /** 链上确认 / 索引数据同步中 */
  syncing: boolean
  /** 历史上曾经持有（用于识别"已转出"） */
  held_before: boolean
}

export interface MembershipEligibility {
  subscription: MembershipSubscriptionState
  nft: MembershipNftState
  /** 各场景是否已解锁，服务端可覆盖默认规则 */
  scenes?: Partial<Record<MembershipScene, boolean>>
}

/** 查询当前会员资格（含订阅与 NFT Holder） */
export const getMembershipEligibilityApi = (scene?: MembershipScene) => {
  return http.get<MembershipEligibility>('/v1/member/membership/get-eligibility', { scene })
}

/** 重新校验会员资格（订阅状态 + 链上 NFT 持有） */
export const refreshMembershipEligibilityApi = (scene?: MembershipScene) => {
  return http.post<MembershipEligibility>('/v1/member/membership/refresh-eligibility', { scene })
}

/** 获取订阅方案 */
export const getMembershipPlanApi = () => {
  return http.get<MembershipPlan>('/v1/member/membership/get-subscription-plan')
}

/** 创建订阅订单，返回项目现有支付流程所需信息 */
export const createMembershipSubscriptionApi = (planId?: string | number) => {
  return http.post<{ order_sn?: string; pay_url?: string }>(
    '/v1/member/membership/create-subscription',
    { plan_id: planId },
  )
}

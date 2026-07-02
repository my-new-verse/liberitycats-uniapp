import { http } from '@/utils/http'

export interface getPledgeAssetApiResponse {
  pledge_point: number
  pledge_expect_total_point: number
  rank: number
}

type rankingMember = {
  member_id: number
  nickname: string
  avatar: string
}
export interface getPledgeRankingApiResponse {
  rank: number
  member: rankingMember[]
  total_point: number
}

export interface getPledgeRankingListResponse {
  current_page: number
  data: getPledgeRankingApiResponse[]
  last_page: number
}

export const getPledgeAssetApi = () => {
  return http.get<getPledgeAssetApiResponse>('/v1/pledge/pledge/get-pledge-asset')
}

export const getPledgeRankingApi = (page: number) => {
  return http.get<getPledgeRankingListResponse>('/v2/pledge/pledge/get-ranking', { page })
}

export interface NftItem {
  id: number
  member_id: number
  owner_address: string
  token_id: string
  token_img: string
  token_attributes_json: TokenAttributes[]
  create_time: string
  pledge_id: number
  pledge_info: {
    active_pledge_days: number
    today_except_point: number
    total_except_point: number
    redeem_status: number
    pledge_start_time: string
  }
}

type TokenAttributes = {
  value: string
  trait_type: string
}

export interface NftValuation {
  floor_price: string
  quantity: number
  total_value: string
  currency_symbol: string
}

export interface getMemberNftsApiResponse {
  current_page: number
  data: NftItem[]
  last_page: number
  valuation?: NftValuation
}

// 获取 NFT 列表
export const getMemberNftsApi = (page: number, pledge: boolean, limit?: number) => {
  return http.get<getMemberNftsApiResponse>('/v1/pledge/member/get-nft-list', {
    page,
    limit,
    is_pledge: pledge,
  })
}

// 提交NFT后台刷新
export const refreshMemberNftsApi = () => {
  return http.post<any>('/v1/pledge/member/refresh-nft')
}

// 获取 NFT 详情
export const getNftDetailApi = (token_id: string) => {
  return http.get<NftItem>('/v1/pledge/member/get-nft-detail', { token_id })
}

// 赎回 NFT
export const redeemNftApi = (token_id: string) => {
  return http.post<any>('/v1/pledge/pledge/redeem-nft', { token_id })
}

export const createPledgeApi = (token_id: string) => {
  return http.post<any>('/v1/pledge/pledge/create-pledge', { token_id })
}

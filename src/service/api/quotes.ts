import { http } from '@/utils/http'

export interface getQuotesItemResponse {
  id: number
  name: string
  symbol: string
  short_name: string
  icon: string
  price: string
  up_down_rate: number
  sort: number
}

export interface getQuotesListApiResponse {
  current_page: number
  data: getQuotesItemResponse[]
  last_page: number
}

export const getQuotesListApi = (page: number) => {
  return http.get<getQuotesListApiResponse>('/v1/quotes/crypto/list', {
    page,
  })
}

export interface getCollectionDetailApiResponse {
  name: string
  image: string
  stats: {
    floorPrice: string | number
  }
}

export const getCollectionDetailApi = () => {
  return http.get<getCollectionDetailApiResponse>('/v1/quotes/collection/detail')
}

export interface getInvestmentPortfolioEntryTokenApiResponse {
  jumpUrl: string
}

export const getInvestmentPortfolioEntryTokenApi = () => {
  return http.post<getInvestmentPortfolioEntryTokenApiResponse>(
    '/v1/investment-portfolio/entry-token',
  )
}

import { http } from '@/utils/http'

type CreateWebDataForKeyApiResponse = {
  key: string
  url: string
}

export const createWebDataForKeyApi = (op: string, extend?: any, lang?: string) => {
  return http.post<CreateWebDataForKeyApiResponse>('/v1/web3/web3/create-web3-data-for-key', {
    op,
    extend,
    lang,
  })
}

// 断开钱包
export const disconnectWalletApi = () => {
  return http.post<any>('/v1/web3/wallet/disconnect-wallet')
}

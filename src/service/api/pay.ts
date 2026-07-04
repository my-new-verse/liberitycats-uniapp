import { http } from '@/utils/http'

export interface getPayStatusApiResponse {
  order_no: string
  pay_status: number
  pay_amount: string
  currency: currency
  pay_no: string
  pay_channel: string
  paid_member_id: number
  pay_start_time: number
}

export const getPayStatusApi = (orderNo: string) => {
  return http.get<getPayStatusApiResponse>('/v1/pay/pay/get-status', { order_no: orderNo })
}

export interface PaymentMethod {
  id: string
  type: 'wallet_dapp' | (string & {})
  channel: string
  wallet: string
  display_name: string
  icon?: string | null
  enabled: boolean
  sort: number
  url?: string | null
  link?: string | null
  fallback_url?: string | null
}

export interface PaymentMethodsApiResponse {
  default_method_id: string
  payment_methods: PaymentMethod[]
}

export interface CreatePayCheckoutApiResponse {
  type: string
  channel: string
  wallet?: string
  url?: string
  link?: string
  fallback_url?: string
}

export const getPaymentMethodsApi = (orderNo: string) => {
  return http.get<PaymentMethodsApiResponse>('/v1/pay/pay/payment-methods', { order_no: orderNo })
}

export const createPayCheckoutApi = (
  orderNo: string,
  payChannel: string,
  wallet?: string,
  lang?: string,
) => {
  return http.post<CreatePayCheckoutApiResponse>('/v1/pay/pay/create-checkout', {
    order_no: orderNo,
    pay_channel: payChannel,
    wallet,
    lang,
  })
}

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

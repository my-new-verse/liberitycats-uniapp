import { http } from '@/utils/http'

export interface createPaymentCheckoutApiResponse {
  publishableKey: string
  paymentIntent: string
  customer: string
  ephemeralKey: string
  billingDetails: {
    name: string
    email: string
    phone: string
    address: {
      city: string
      country: string
      line1: string
      line2: string
      postalCode: string
      state: string
    }
  }
}

export const testGetCheckoutApi = () => {
  return http.post<createPaymentCheckoutApiResponse>('/v1/pay/stripe/test-checkout')
}

export const createPaymentCheckoutApi = (orderNo: string, payChannel?: string) => {
  return http.post<createPaymentCheckoutApiResponse>('/v1/pay/pay/create-checkout', {
    order_no: orderNo,
    pay_channel: payChannel,
  })
}

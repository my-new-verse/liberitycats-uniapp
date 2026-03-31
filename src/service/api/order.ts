import { http } from '@/utils/http'

type SkuItem = {
  sku_id: number | string
  quantity: number
  goods_id: number
}

export interface CreateOrderRequest {
  address_id: number
  remark: string
  sku_items: SkuItem[]
  cart_ids: number[]
}

export interface CreateOrderResponse {
  member_id: number
  order_total_price: string
  discounted_total_price: number
  goods_total_price: string
  order_no: string
  order_status: number
  member_remark: string
  create_time: string
  update_time: string
  id: number
}
export const createOrderApi = (params: CreateOrderRequest) => {
  return http.post<CreateOrderResponse>('/v1/mall/order/create-order', params)
}

type addressOrderDetail = {
  order_id: number
  member_id: number
  address_id: number
  name: string
  cellphone: string
  province: string
  city: string
  district: string
  area: string
  address: string
  country: string
  area_code: string
}

export interface OrderDetailResponse {
  id: number
  member_id: number
  order_total_price: string
  discounted_total_price: string
  goods_total_price: string
  shipping_fee: string
  order_no: string
  order_status: number
  orderStatusDesc: string
  pay_status: number
  pay_id: number
  logistics_id: number
  member_remark: string
  create_time: string
  update_time: string
  order_currency: string
  sku_items: Sku_items[]
  address: addressOrderDetail
  pay_info: Pay_info
  logistics: Logistics
}

type Logistics = {
  logistic_no: string
  logistic_company: string
}

type Pay_info = {
  currency: string
  pay_amount: string
  pay_no: string
  pay_channel: string
  pay_status: number
  pay_start_time: number
  pay_time: number
}

type Sku_items = {
  order_id: number
  goods_id: number
  sku_id: number
  sku_cover: string
  goods_name: string
  currency_txt: string
  sku_attributes: string
  quantity: number
  original_price: string
  sku_price: string
}

export interface GetOrderListResponse {
  current_page: number
  data: OrderDetailResponse[]
  per_page: number
  last_page: number
}

export const getOrderListApi = (
  page: number,
  searchGoodsKeyword?: string,
  view_status?: string,
) => {
  return http.get<GetOrderListResponse>('/v1/mall/order/get-order-list', {
    page,
    searchGoodsKeyword,
    view_status,
  })
}

export const getOrderDetailApi = (orderNo: string) => {
  return http.get<OrderDetailResponse>('/v1/mall/order/get-order-detail', {
    order_no: orderNo,
  })
}

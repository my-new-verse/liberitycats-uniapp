import { http } from '@/utils/http'

export interface AddCartApiParam {
  goods_id: number
  sku_select_attrs_str: string
  quantity: number
}

type Sku_attributes = {
  attr_id: string
  attr_name: string
  attr_value: string
}
export interface CartInfo {
  id: number
  goods_id: number
  sku_id: number
  quantity: number
  sku_price: string
  member_id: number
  create_time: string
  sku_cover: string
  buy_enable: number
  available_inventory: number
  currency: currency
  sku_attributes: Sku_attributes[]
  name: string
}

// 添加商品到购物车 API 的功能。
export const addCartApi = (param: AddCartApiParam) => {
  return http.post<CartInfo>('/v1/mall/cart/add', param)
}

export interface getMyCartListApiResponse {
  current_page: number
  data: CartInfo[]
  last_page: number
}

// 获取我的购物车列表 API 的功能。
export const getMyCartListApi = (page: number, limit?: number) => {
  return http.get<getMyCartListApiResponse>('/v1/mall/cart/list', { page, limit })
}

// 删除购物车商品 API 的功能。
export const deleteCartApi = (cartId: number) => {
  return http.post<any>('/v1/mall/cart/delete', { cart_id: cartId })
}

// 修改购物车商品数量 API 的功能。
export const updateCartQuantityApi = (cartId: number, quantity: number) => {
  return http.post<any>('/v1/mall/cart/update-quantity', { cart_id: cartId, quantity })
}

export const getMyCartCountApi = () => {
  return http.get<any>('/v1/mall/cart/get-my-cart-count')
}

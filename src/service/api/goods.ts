import { http } from '@/utils/http'

type GoodsI18n = {
  id: number
  lang: string
  title: string
  content: string
  goods_id: number
}

export interface SkuItemResponse {
  id: number
  price: string
  original_price: string
  final_price: string
  saved_amount: string
  inventory: number
  sku_cover: string
  goods_id: number
  key: string
  is_default: number
  attributes: string
  currency: currency
  sku_id: string
  sku_name: string
  quantity: number
}

type AttrKeyValues = {
  value: string
  key: string
}

type SkuAttributeItem = {
  attrId: string
  attrName: string
  attrValues: string[]
  attrKeyValues: AttrKeyValues[]
  selectedKey: string
}

export interface NftDiscountTag {
  text: string
  color: string
}

export interface NftDiscountLevel {
  level: number
  icon: string
}

export interface NftDiscount {
  enabled: boolean
  mode: 'uniform' | 'level'
  discount_applied: boolean
  discount_rate: number
  member_has_nft: boolean
  member_level?: string
  level?: NftDiscountLevel | null
  tag: NftDiscountTag
}

export interface PresaleInfo {
  enabled: boolean
  sale_start_time: number
  sale_end_time: number
  estimated_ship_time: number
  level_purchase_limit_enabled: boolean
}

export interface LevelPurchaseLimit {
  purchase_limit: number | null
  purchase_enabled: boolean
}

export interface UserPurchaseInfo {
  bought_quantity: number
  max_can_buy: number
  remaining_quantity: number
  level_id: number
  level_name: string
  purchase_enabled: boolean
}

export interface NewGoodsDetailResponse {
  id: number
  category_id: number
  covers: string[]
  status: number
  is_gift: number
  stock_unit: string
  buyer_quantity: number
  limited_purchase_quantity: number
  purchase_flow: number
  specified_pay: any | null
  sku_range_price: string
  currency: currency
  i18n: GoodsI18n
  sku_maps: Record<string, SkuItemResponse>
  sku_attributes: Record<string, SkuAttributeItem>
  default_selected_sku_key: string[]
  total_inventory: number
  is_favorite: number
  nft_discount: NftDiscount
  presale_info?: PresaleInfo
  level_purchase_limits?: Record<string, LevelPurchaseLimit>
  sale_status?: 'coming_soon' | 'on_sale' | 'sold_out'
  can_buy?: boolean
  user_purchase_info?: UserPurchaseInfo
  reason?: string
}

// 获取商品详情 API 的功能。
export const getGoodsDetailApi = (goodsId: number) => {
  return http.get<NewGoodsDetailResponse>('/v1/mall/goods/goods-detail', {
    goods_id: goodsId,
  })
}

// 检查 SKU 数量 API 的请求参数。
export interface CheckSkuQuantityRequest {
  sku_id: string
  quantity: number
  goods_id: number
}

// 检查 SKU 数量 API 的功能。
export const checkSkuQuantityApi = (params: CheckSkuQuantityRequest[]) => {
  return http.post<any>('/v1/mall/goods/check-sku-quantity', {
    params,
  })
}

// 获取 SKU 信息 API 的功能。
export const getSkuItemsApi = (params: CheckSkuQuantityRequest[]) => {
  return http.post<SkuItemResponse[]>('/v1/mall/goods/get-sku-items-by-params', {
    params,
  })
}

// 添加收藏 API 的功能。
export const addFavoriteApi = (goodsId: number, skuId?: string | number) => {
  return http.post<any>('/v1/mall/goods/add-favorite', {
    goods_id: goodsId,
    sku_id: skuId,
  })
}

export interface GoodFavoriteList {
  cover: string
  title: string
  tags: any[]
  price: string
  currency: currency
  is_favorite: number
  goods_id: number
  sku_id: number
}

export interface MyFavoriteListResponse {
  current_page: number
  data: GoodFavoriteList[]
  last_page: number
}

// 获取我的收藏列表 API 的功能。
export const getMyFavoriteListApi = (page: number, limit?: number) => {
  return http.get<MyFavoriteListResponse>('/v1/mall/goods/get-favorite-list', {
    page,
    limit,
  })
}

export interface MallGoodsListResponse {
  current_page: number
  data: searchGoodsInfo[]
  last_page: number
  hash: string
}

// 定义搜索参数接口
export interface MallGoodsSearchParams {
  category_id?: number
  search?: string
  order?: string
  order_by?: string
  [key: string]: any // 允许其他动态参数
}

// 获取商品列表 API 的功能。
export const getMallGoodsListApi = (param: MallGoodsSearchParams) => {
  return http.get<MallGoodsListResponse>('/v1/mall/mall/get-goods-list', param)
}

export interface searchGoodsInfo {
  id: number
  title: string
  cover: string
  sale_price: string
  currency: currency
  tags: any[]
  is_favorite: number
}

export interface getSearchListByKeywordResponse {
  current_page: number
  data: searchGoodsInfo[]
  last_page: number
}

// 搜索 API 的功能。
export const getSearchListByKeywordApi = (keyword: string, page: number, limit?: number) => {
  return http.get<getSearchListByKeywordResponse>('/v1/mall/goods/search-by-keyword', {
    keyword,
    limit,
    page,
  })
}

export const getGoodsListByTagsApi = (tagIds: (string | number)[], limit?: number) => {
  return http.get<searchGoodsInfo[]>('/v1/mall/mall/get-goods-list-by-tag', {
    limit,
    tag_ids: tagIds,
  })
}

export interface MallSearchPopularKeywords {
  id: number
  name: string
}
// 获取商城搜索热词
export const getMallSearchPopularKeywordsApi = () => {
  return http.get<MallSearchPopularKeywords[]>('/v1/mall/mall/get-search-hot-words')
}

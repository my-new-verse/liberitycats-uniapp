import { http } from '@/utils/http'

export interface NotificationItem {
  id: number
  member_id: number
  is_read: 0 | 1
  create_time: string
  category: 'system' | 'community' | 'mall'
  subtype: string
  title: string
  content: string
  params: Record<string, string>
  context: Record<string, any> | null
  i18n: {
    title: string
    content: string
  }
}
// 消息列表分页返回类型
export interface getNotificationListResponse {
  current_page: number
  data: NotificationItem[]
  last_page: number
  per_page: number
  total?: number
}
// 各分类未读数量返回类型
export interface UnreadByCategoryResponse {
  system: number
  community: number
  mall: number
}

// 标为已读返回类型
export interface MarkCategoryReadResponse {
  marked: number
}

/**
 * 获取消息列表
 * @param page 页码
 * @param category 分类（system/community/mall/''）
 * @param subtype 子类型（可选，需配合category）
 * @param limit 每页条数
 */

export const getNotificationListApi = (
  page: number,
  limit: number,
  category?: string,
  subtype?: 'like' | 'follow' | 'comment',
) => {
  return http.get<getNotificationListResponse>('/v1/member/notification/list', {
    page,
    limit,
    category,
    subtype,
  })
}
// 按分类的未读数量
export const getUnreadByCategoryApi = () => {
  return http.get<UnreadByCategoryResponse>('/v1/member/notification/unread-by-category')
}
// 未读消息总数

export const getUnreadCountApi = () => {
  return http.get<getNotificationListResponse>('/v1/member/notification/unread-count')
}
/**
 * 获取各分类未读数量
 */
export function getNotificationUnreadByCategoryApi() {
  return http.get<UnreadByCategoryResponse>('/member/notification/unread-by-category')
}

// /**
//  * 获取消息详情
//  * @param id 消息ID
//  */
// export function getNotificationDetailApi(id: number | string) {
//   return request.get<NotificationItem>('/member/notification/detail', {
//     params: { id }
//   })
// }

// /**
//  * 获取消息总未读数量
//  */
export function getNotificationUnreadCountApi() {
  return http.get<number>('/v1/member/notification/unread-count')
}
// 单条标已读
export const handleMarkReadApi = (id: string) => {
  return http.post<MarkCategoryReadResponse>('/v1/member/notification/mark-read', { id })
}

/**
 * 按分类标为已读
 * @param category 分类
 */
export function markCategoryReadApi(category: string) {
  return http.post<MarkCategoryReadResponse>('/v1/member/notification/mark-category-read', {
    category,
  })
}

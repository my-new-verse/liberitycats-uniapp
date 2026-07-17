import { http } from '@/utils/http'

export interface getPostDetailResponse {
  id: number
  type: string
  member_id: number
  content: string
  images: string[]
  status: number
  view_count: number
  commit_count: number
  like_count: number
  create_time: string
  member: Member
  is_liked: number
  is_approved: number
  tag: tagDetail
  post_category?: string
  // 推广相关字段
  title?: string
  ad_type_id?: number | string
  ad_type_name?: string
  contact_email?: string
  contact_wechat?: string
  ad_tags?: { id: number; display_name: string }[]
}

type tagDetail = {
  id: number
  name: string
  icon: string
  extend_json: tagExtendJson
}

type tagExtendJson = {
  class: string
}

type Member = {
  id: number
  nickname: string
  avatar: string
  level: number
  level_id: number
}

// 社区帖子列表
export interface getCommunityPostListApiResponse {
  current_page: number
  data: getPostDetailResponse[]
  last_page: number
}

// 社区帖子列表
export const getCommunityPostListApi = (page: number, search?: any) => {
  return http.get<getCommunityPostListApiResponse>('/v1/community/post/list', {
    page,
    ...search,
  })
}

// 社区帖子详情
export const getCommunityPostDetailApi = (id: number) => {
  return http.get<getPostDetailResponse>('/v1/community/post/detail', {
    id,
  })
}

// 社区帖子评论列表
export const getCommunityPostCommentListApi = (
  id: number,
  sort: string,
  page: number,
  secondary_preview_limit: number = 1,
) => {
  return http.get<getCommunityPostListApiResponse>('/v1/community/post/get-comment-list', {
    id,
    sort,
    page,
    secondary_preview_limit,
  })
}

// 社区帖子点赞
export const likePostApi = (id: number) => {
  return http.post('/v1/community/post/like', {
    id,
  })
}

// 评论帖子
export const commitPostApi = (
  id: number,
  content: string,
  images: string[],
  request_id: string,
) => {
  return http.post('/v1/community/post/commit', {
    id,
    content,
    images,
    request_id,
  })
}

// 创建帖子
export const createPostApi = (content: string, images: string[], id?: number) => {
  return http.post('/v1/community/post/create', {
    content,
    images,
    id,
  })
}

// 更新帖子
export const updatePostApi = (id: number, content: string, images: string[]) => {
  return http({
    url: `/v1/community/post/update/${id}`,
    method: 'PUT',
    data: { content, images },
  })
}

// 发帖状态检查响应
export interface CheckPostStatusResponse {
  can_post: boolean
  ban_reason?: string
  ban_until_date?: string
}

// 检查发帖状态
export const checkPostStatusApi = (post_category: string = 'social') => {
  return http.get<CheckPostStatusResponse>('/v1/community/post/check-status', { post_category })
}

// 推广类型
export type PromotionType = string
// 推广有效期
export type PromotionValidity = 7 | 30 | 0 // 0 表示长期

// 推广类型列表项
export interface AdTypeItem {
  id: number
  name: string
  value: string
}

// 获取推广类型列表
export const getAdTypeListApi = () => {
  return http.get<AdTypeItem[]>('/v1/community/ad-type/list')
}

// 热门标签项
export interface AdTagItem {
  id: number
  name: string
}

// 获取热门标签
export const getHotAdTagsApi = () => {
  return http.get<AdTagItem[]>('/v1/community/ad-tag/hot')
}

// 搜索标签
export const searchAdTagsApi = (keyword: string) => {
  return http.get<AdTagItem[]>('/v1/community/ad-tag/search', { keyword })
}

// 推广发布资格检查响应
export interface CheckAdEligibilityResponse {
  can_publish: boolean
  reason?: string
}

// 检查推广发布资格
export const checkAdEligibilityApi = () => {
  return http.get<CheckAdEligibilityResponse>('/v1/community/ad-post/check-eligibility')
}

// 创建推广帖子
export const createPromotionPostApi = (params: {
  content: string
  images: string[]
  ad_type_id: PromotionType
  contact_email?: string
  contact_wechat?: string
  validity_days: PromotionValidity
  publish_status: 0 | 1
  tags?: number[]
  title: string
  id?: number
}) => {
  return http.post('/v1/community/ad-post/create', {
    ...params,
  })
}

// 更新推广帖子
export const updatePromotionPostApi = (params: {
  id: number
  content: string
  images: string[]
  ad_type_id: PromotionType
  contact_email?: string
  contact_wechat?: string
  validity_days: PromotionValidity
  publish_status: 0 | 1
  tags?: number[]
  title: string
}) => {
  const { id, ...rest } = params
  return http({
    url: `/v1/community/ad-post/update/${id}`,
    method: 'PUT',
    data: rest,
  })
}

type emotionDetail = {
  id: number
  name: string
  icon: string
}
export interface getCommunityEmotionListItem {
  id: number
  name: string
  icon: string
  emotions: emotionDetail[]
}
// 获取社区表情包列表
export const getCommunityEmotionListByCategoryApi = () => {
  return http.get<getCommunityEmotionListItem[]>('/v1/community/emotion/get-list-by-category')
}

// 删除帖子
export const deletePostApi = (id: number) => {
  return http.post('/v1/community/post/delete', {
    id,
  })
}

export type CommunityReportReason =
  | 'spam_ad'
  | 'pornographic'
  | 'violence'
  | 'illegal'
  | 'fraud'
  | 'harassment'
  | 'misinformation'
  | 'infringement'
  | 'other'

export const reportPostApi = (params: {
  target_type: 'post' | 'comment'
  target_id: number
  reason: CommunityReportReason
  description?: string
}) => {
  return http.post('/v1/community/post/report', params)
}

export const blockUserApi = (id: number) => {
  return http.post('/v1/community/post/block-user', {
    id,
  })
}

export const adminRemovalApi = (
  targetId: number,
  targetType: 'post' | 'comment',
  reason?: string,
) => {
  return http.post('/v1/community/post/admin-take-down', {
    target_id: targetId,
    target_type: targetType,
    ...(reason ? { reason } : {}),
  })
}

/** 查询用户发帖禁言状态 */
export const getPostBanStatusApi = (memberId: number) => {
  return http.get('/v1/member/admin/post-ban/check-status', { member_id: memberId } as any)
}

/** 禁止用户发帖 */
export const banPostApi = (memberId: number, days: number, reason?: string) => {
  return http.post('/v1/member/admin/post-ban/ban', {
    member_id: memberId,
    days,
    ...(reason ? { reason } : {}),
  })
}

/** 解除用户发帖禁止 */
export const unbanPostApi = (memberId: number) => {
  return http.post('/v1/member/admin/post-ban/unban', { member_id: memberId })
}

// 关注
export const createFollowApi = (memberId: number) => {
  return http.post('/v1/community/follow/create', {
    member_id: memberId,
  })
}

// 取消关注
export const deleteFollowApi = (memberId: number) => {
  return http.post('/v1/community/follow/delete', {
    member_id: memberId,
  })
}

// 我的帖子列表
export const getMyPostListApi = (page: number, search?: any) => {
  return http.get<getCommunityPostListApiResponse>('/v1/community/post/member-posts', {
    page,
    ...search,
  })
}

/** 我的帖子列表 */
export const getMyPostsApi = (page: number, search?: any) => {
  return http.get<getCommunityPostListApiResponse>('/v1/community/post/my-posts', {
    page,
    ...search,
  })
}

// 获取用户主页信息
export const getMemberHomepageApi = (memberId: number) => {
  return http.get('/v1/community/post/member-homepage', {
    member_id: memberId,
  })
}

export interface MemberHomepageResponse {
  member_info: {
    member_id: number
    nickname: string
    avatar: string
    level: any
  }
  post_list: any[]
  [key: string]: any
}

export interface ReplyToMember {
  id: number
  nickname: string
  avatar: string
}

export interface CommentItem extends getPostDetailResponse {
  reply_count?: number
  hidden_reply_count?: number
  reply_preview?: CommentItem[]

  reply_to_id?: number
  reply_member_id?: number
  is_post_author?: number
  is_l1_author?: number
  reply_to_member?: ReplyToMember
}

export interface CommentListResponse {
  current_page: number
  data: CommentItem[]
  last_page: number
}

export interface CommentThreadResponse {
  items: CommentItem[]
  next_last_id: string
  has_more: number
}

export const getCommunityPostThreadApi = (id: number, limit: number = 20, last_id?: string) => {
  return http.get<CommentThreadResponse>('/v1/community/post/get-comment-thread', {
    id,
    limit,
    last_id,
  })
}

export interface PostSharePosterTemplate {
  id: number
  code: string
  name: string
  previewUrl: string
}

export interface PostSharePosterConfig {
  enabled: boolean
  templates: PostSharePosterTemplate[]
}

export interface PostShareCopyData {
  summary: string
  url: string
  guide: string
  text: string
  discordText: string
  twitterText: string
  poster: PostSharePosterConfig
}

export interface PostShareCopyResponse {
  code: 1 | 0
  msg: string
  data: PostShareCopyData
}

export const getPostShareCopy = (params: { id: number | string; locale?: string }) => {
  return http.get<PostShareCopyData>('/v1/community/post/share-copy', params)
}

export interface GeneratePosterData {
  status: 'done' | 'processing'
  url?: string
}

// 调用生成海报接口
export const generatePostPosterApi = (params: {
  post_id: number
  template_id?: number
  locale?: string
}) => {
  return http.post<GeneratePosterData>('/v1/community/post/generate-poster', params)
}

/** 帖子搜索参数 */
export interface SearchPostsParams {
  keyword?: string
  member_ids?: number[]
  member_id?: number
  member_keyword?: string
  category_id?: number
  start_time?: number
  end_time?: number
  page?: number
  limit?: number
  sort?: string
  post_category?: string
  ad_type_id?: number
  tag_id?: number
  [key: string]: any
}

/** 帖子搜索响应 */
export interface SearchPostsResponse {
  posts: getPostDetailResponse[]
  total: number
  page: number
  limit: number
}

/** 帖子搜索 */
export const searchPostsApi = (params: SearchPostsParams) => {
  return http.get<SearchPostsResponse>('/v1/community/post/search', params)
}

/** 设置/取消特别关注 */
export const setSpecialFollowApi = (memberId: number, isSpecial: number) => {
  return http.post<any>('/v1/community/follow/set-special', {
    member_id: memberId,
    is_special: isSpecial,
  })
}

/** 搜索成员 */
export const searchMembersApi = (keyword: string, page = 1, limit = 50) => {
  return http.get<{ list: any[] }>('/v1/member/user/search-members', {
    keyword,
    page,
    limit,
  })
}

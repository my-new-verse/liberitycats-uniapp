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
export const getCommunityPostCommentListApi = (id: number, sort: string, page: number) => {
  return http.get<getCommunityPostListApiResponse>('/v1/community/post/get-comment-list', {
    id,
    sort,
    page,
  })
}

// 社区帖子点赞
export const likePostApi = (id: number) => {
  return http.post('/v1/community/post/like', {
    id,
  })
}

// 评论帖子
export const commitPostApi = (id: number, content: string, images: string[]) => {
  return http.post('/v1/community/post/commit', {
    id,
    content,
    images,
  })
}

// 创建帖子
export const createPostApi = (content: string, images: string[]) => {
  return http.post('/v1/community/post/create', {
    content,
    images,
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

// 举报帖子
export const reportPostApi = (id: number) => {
  return http.post('/v1/community/post/report', {
    id,
  })
}

export const blockUserApi = (id: number) => {
  return http.post('/v1/community/post/block-user', {
    id,
  })
}

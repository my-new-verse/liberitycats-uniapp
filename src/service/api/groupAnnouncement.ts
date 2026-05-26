import { http } from '@/utils/http'

// ─── Content Blocks ───────────────────────────────────────────────────────────

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

export interface ImageBlock {
  type: 'image'
  image: {
    url: string
    width?: number
    height?: number
    alt?: string
  }
}

export interface InfoListItem {
  label?: string
  value: string
  icon?: string
}

export interface InfoListBlock {
  type: 'infoList'
  items: InfoListItem[]
}

export interface TipBlock {
  type: 'tip'
  text: string
}

export type ContentBlock = ParagraphBlock | ImageBlock | InfoListBlock | TipBlock

export interface AnnouncementContent {
  version?: string
  blocks: ContentBlock[]
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface CoverImage {
  url: string
  width: number
  height: number
}

export interface AnnouncementAuthor {
  id: number
  name: string
}

/** 公告摘要（用于列表） */
export interface AnnouncementSummary {
  id: number
  roomId: number
  title: string
  summary: string
  coverImage: CoverImage | null
  status: 'PUBLISHED' | 'DRAFT' | 'DELETED'
  isPinned: boolean
  displayPosition: 'CHAT_TOP' | 'NOTICE_LIST'
  viewCount: number
  publishTime: number
  updateTime: number
}

/** 公告详情（含 author + content） */
export interface AnnouncementDetail extends AnnouncementSummary {
  author: AnnouncementAuthor
  content: AnnouncementContent
}

export interface Pagination {
  pageNo: number
  pageSize: number
  total: number
  hasMore: boolean
}

// ─── API Functions ────────────────────────────────────────────────────────────

const BASE = '/v1/community/chat/rooms'

/**
 * 当前公告（聊天顶部展示）
 * GET /rooms/{roomId}/announcements/current
 */
export const getCurrentGroupAnnouncementApi = (roomId: number) =>
  http.get<{ announcement: AnnouncementSummary | null }>(`${BASE}/${roomId}/announcements/current`)

/**
 * 公告列表
 * GET /rooms/{roomId}/announcements
 */
export const getGroupAnnouncementListApi = (roomId: number, page = 1, limit = 20) =>
  http.get<{ list: AnnouncementSummary[]; pagination: Pagination }>(
    `${BASE}/${roomId}/announcements`,
    { page, limit },
  )

/**
 * 公告详情
 * GET /rooms/{roomId}/announcements/{announcementId}
 */
export const getGroupAnnouncementDetailApi = (roomId: number, announcementId: number) =>
  http.get<AnnouncementDetail>(`${BASE}/${roomId}/announcements/${announcementId}`)

/**
 * 置顶公告
 * PUT /rooms/{roomId}/announcements/{announcementId}/pin
 */
export const pinGroupAnnouncementApi = (roomId: number, announcementId: number) =>
  http<{ announcement: AnnouncementSummary }>({
    url: `${BASE}/${roomId}/announcements/${announcementId}/pin`,
    method: 'PUT',
  })

/**
 * 取消置顶
 * DELETE /rooms/{roomId}/announcements/{announcementId}/pin
 */
export const unpinGroupAnnouncementApi = (roomId: number, announcementId: number) =>
  http<{ announcement: AnnouncementSummary }>({
    url: `${BASE}/${roomId}/announcements/${announcementId}/pin`,
    method: 'DELETE',
  })

/**
 * 删除公告（软删除）
 * DELETE /rooms/{roomId}/announcements/{announcementId}
 */
export const deleteGroupAnnouncementApi = (roomId: number, announcementId: number) =>
  http<Record<string, never>>({
    url: `${BASE}/${roomId}/announcements/${announcementId}`,
    method: 'DELETE',
  })

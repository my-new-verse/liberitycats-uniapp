import { http } from '@/utils/http'

export type ChatMessageType = 'text' | 'image' | 'emotion' | 'rich' | 'system' | 'system'

export interface ChatRoomLastMessage {
  message_id: number
  message_type: ChatMessageType
  summary: string
  create_time: number
}

export interface ChatRoom {
  id: number
  code: string
  name: string
  avatar: string
  description: string
  member_count: number
  access_rule: string
  min_nft_count: number
  is_joined: 0 | 1
  is_accessible: 0 | 1
  inaccessible_reason: string
  speak_mode: string
  unread_count: number
  last_message?: ChatRoomLastMessage | null
  member_preview?: string[]
}

export interface ChatRoomDetail {
  room: ChatRoom & {
    status?: number
    open_chat_start_at?: number
    open_chat_end_at?: number
  }
  access: {
    is_joined: 0 | 1
    is_accessible: 0 | 1
    reason: string
    current_nft_count: number
  }
  speaking: {
    can_speak: 0 | 1
    reason: string
    is_room_muted: 0 | 1
    is_member_muted: 0 | 1
    mute_until: number
    role: string
  }
}

export interface ChatMember {
  member_id: number
  nickname: string
  avatar: string
  role: 'founder' | 'owner' | 'host' | 'moderator' | 'admin' | 'member'
  join_time: number
  is_muted: 0 | 1
  mute_until?: number
  is_self?: boolean
  level?: {
    level: number
    name?: string
    icon?: string
  }
}

export interface ChatMembersResponse {
  current_page: number
  data: ChatMember[]
  from: number
  last_page: number
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

export interface ChatMessagePayload {
  // text 消息
  text?: string
  segments?: Array<{ type: string; text: string }>
  params?: Record<string, any>

  // image 消息
  url?: string
  thumb_url?: string
  width?: number
  height?: number
  size?: number
  mime?: string

  // emotion 消息
  emotion_id?: number

  // rich 消息
  parts?: ChatMessagePart[]
}

// rich 消息的 parts 数组元素类型
export interface ChatMessagePart {
  type: 'text' | 'emotion' | 'image'

  // type=text 时必填
  text?: string

  // type=emotion 时必填
  emotion_id?: number

  // type=image 时必填
  url?: string
  thumb_url?: string
  width?: number
  height?: number
  size?: number
  mime?: string
}

export interface ChatMessageSender {
  member_id: number
  nickname: string
  avatar: string
  role: string
  member_status?: number
}

export interface ChatMessagePlaceholder {
  text?: string
}

export interface ChatMessageReactionItem {
  reaction_type: string
  reaction_value: string
  count: number
}

export interface ChatMessageMyReactionItem {
  reaction_type: string
  reaction_value: string
}

export interface ChatMessageReplyTo {
  message_id: number
  sender_member_id: number
  sender_nickname: string
  content: string
}

export interface ChatMessage {
  id: number
  room_seq: number
  room_id: number
  member_id: number
  message_type: ChatMessageType
  payload: ChatMessagePayload
  status: number
  display_status?: string
  placeholder?: ChatMessagePlaceholder
  reaction_summary?: ChatMessageReactionItem[]
  my_reactions?: ChatMessageMyReactionItem[]
  create_time: number
  sender: ChatMessageSender
  is_self: 0 | 1
  client_message_id?: string
  local_id?: string
  local_status?: 'sending' | 'failed' | 'sent'
  reply_to?: ChatMessageReplyTo
  reply_message?: ChatMessage
}

export interface ChatMessageListResponse {
  room_id: number
  messages: ChatMessage[]
  has_more_history: 0 | 1
  has_more_latest: 0 | 1
  next_before_message_id: number
  next_after_message_id: number
}

export interface ChatRoomsResponse {
  rooms: ChatRoom[]
}

let chatRoomsPreloadPromise: Promise<any> | null = null
let cachedChatRoomsResponse: ChatRoomsResponse | null = null
let cachedChatRoomsAt = 0
const CHAT_ROOMS_CACHE_TTL_MS = 5 * 60 * 1000

export interface UnreadSummaryRoom {
  room_id: number
  unread_count: number
}

export interface UnreadSummaryResponse {
  total_unread_count: number
  rooms: UnreadSummaryRoom[]
}

export interface SendChatMessageResponse {
  message: ChatMessage
  server_time: number
}

export interface MarkReadResponse {
  room_id: number
  last_read_message_id: number
  unread_count: number
}

export const getChatRoomsApi = (withMemberPreview?: number) => {
  return http.get<ChatRoomsResponse>('/v1/community/chat/rooms', {
    with_member_preview: withMemberPreview,
  })
}

export const getCachedChatRoomsApi = (maxAgeMs = CHAT_ROOMS_CACHE_TTL_MS) => {
  if (!cachedChatRoomsResponse) return null
  if (!cachedChatRoomsAt) return cachedChatRoomsResponse
  if (Date.now() - cachedChatRoomsAt > maxAgeMs) return null
  return cachedChatRoomsResponse
}

export const preloadChatRoomsApi = (withMemberPreview?: number, forceRefresh = false) => {
  const cachedRooms = getCachedChatRoomsApi()
  if (cachedRooms && !forceRefresh) {
    return Promise.resolve({
      code: 1,
      msg: '',
      data: cachedRooms,
    })
  }

  if (chatRoomsPreloadPromise) return chatRoomsPreloadPromise

  chatRoomsPreloadPromise = getChatRoomsApi(withMemberPreview)
    .then((res) => {
      if (res?.code === 1 && res.data) {
        cachedChatRoomsResponse = res.data
        cachedChatRoomsAt = Date.now()
      }
      return res
    })
    .finally(() => {
      chatRoomsPreloadPromise = null
    })

  return chatRoomsPreloadPromise
}

export const clearPreloadedChatRoomsApi = () => {
  cachedChatRoomsResponse = null
  cachedChatRoomsAt = 0
  chatRoomsPreloadPromise = null
}

/** 用最新 API 响应整体替换房间列表缓存 */
export const setCachedChatRoomsApi = (data: ChatRoomsResponse) => {
  cachedChatRoomsResponse = data
  cachedChatRoomsAt = Date.now()
}

export const patchCachedChatRoom = (roomId: number, patch: Partial<ChatRoom>) => {
  if (!cachedChatRoomsResponse?.rooms?.length) return
  cachedChatRoomsResponse = {
    ...cachedChatRoomsResponse,
    rooms: cachedChatRoomsResponse.rooms.map((room) =>
      room.id === roomId ? { ...room, ...patch } : room,
    ),
  }
  cachedChatRoomsAt = Date.now()
}

export const getChatRoomDetailApi = (code: string) => {
  return http.get<ChatRoomDetail>('/v1/community/chat/room/detail', {
    code,
  })
}

export const getChatRoomMembersApi = (
  roomId: number,
  roleFilter?: string,
  page?: number,
  limit?: number,
  keyword?: string,
) => {
  const params: Record<string, any> = {
    room_id: roomId,
    page: page || 1,
    limit: limit || 30,
  }

  if (typeof roleFilter === 'string' && roleFilter.trim()) {
    params.role_filter = roleFilter.trim()
  }

  if (keyword && keyword.trim()) {
    params.keyword = keyword.trim()
  }

  return http.get<ChatMembersResponse>('/v1/community/chat/room/members', params)
}

// 搜索成员智能
export const getSmartMembersApi = (
  roomId: number,
  page?: number,
  limit?: number,
  keyword?: string,
) => {
  const params: Record<string, any> = {
    room_id: roomId,
    page: page || 1,
    limit: limit || 20,
  }
  if (keyword && keyword.trim()) {
    params.keyword = keyword.trim()
  }

  return http.get<ChatMembersResponse>(
    '/v1/community/chat/room/recommend-members-for-mention',
    params,
  )
}

export const joinChatRoomApi = (roomId: number) => {
  return http.post<{ success: boolean }>('/v1/community/chat/room/join', {
    room_id: roomId,
  })
}

export const muteMemberApi = (
  roomId: number,
  memberId: number,
  muteUntil: number = 0,
  reason?: string,
) => {
  return http.post<{
    room_id: number
    member_id: number
    muted_until: number
    status: number
  }>('/v1/community/chat/member/mute', {
    room_id: roomId,
    member_id: memberId,
    mute_until: muteUntil,
    reason,
  })
}

export const unmuteMemberApi = (roomId: number, memberId: number, reason?: string) => {
  return http.post<{
    room_id: number
    member_id: number
    status: number
  }>('/v1/community/chat/member/unmute', {
    room_id: roomId,
    member_id: memberId,
    reason,
  })
}

export const updateMemberRoleApi = (
  roomId: number,
  memberId: number,
  role: 'moderator' | 'member',
) => {
  return http.post<{
    room_id: number
    member_id: number
    old_role: string
    new_role: string
    status: number
  }>('/v1/community/chat/member/set-role', {
    room_id: roomId,
    member_id: memberId,
    role,
  })
}

export const removeMemberApi = (roomId: number, memberId: number, reason?: string) => {
  return http.post<{
    room_id: number
    member_id: number
    status: number
  }>('/v1/community/chat/member/kick', {
    room_id: roomId,
    member_id: memberId,
    reason,
  })
}

export const sendChatMessageApi = (
  roomId: number,
  messageType: ChatMessageType,
  clientMessageId: string,
  payload: ChatMessagePayload,
  mentioned_member_ids?: number[],
  reply_message_id?: number,
) => {
  return http.post<SendChatMessageResponse>('/v1/community/chat/message/send', {
    room_id: roomId,
    message_type: messageType,
    client_message_id: clientMessageId,
    payload,
    mentioned_member_ids,
    reply_message_id,
  })
}

export const getUnreadSummaryApi = () => {
  return http.get<UnreadSummaryResponse>('/v1/community/chat/unread-summary')
}

export interface UnreadNotification {
  important_unread_count: number
  important_unread_messages: Array<{ message_id: number }>
}

export const getUnreadNotificationsApi = (roomId: number) => {
  return http.get<UnreadNotification>('/v1/community/chat/room/unread-notifications', {
    room_id: roomId,
  })
}

export const getChatMessageListApi = (params: {
  room_id: number
  before_message_id?: number
  after_message_id?: number
  limit?: number
}) => {
  return http.get<ChatMessageListResponse>('/v1/community/chat/message/list', params)
}

export const getChatMessageContextApi = (roomId: number, messageId: number) => {
  return http.get<ChatMessageListResponse>('/v1/community/chat/message/context', {
    room_id: roomId,
    message_id: messageId,
  })
}

export const markMessageReadApi = (roomId: number, lastReadMessageId: number) => {
  return http.post<MarkReadResponse>('/v1/community/chat/message/read', {
    room_id: roomId,
    last_read_message_id: lastReadMessageId,
  })
}

export const leaveChatRoomApi = (roomId: number) => {
  return http.post<{ success: boolean }>('/v1/community/chat/home/leave', {
    room_id: roomId,
  })
}

export interface RecallChatMessageResponse {
  message_id: number
  room_id: number
  room_seq: number
  display_status: string
  server_time: number
}

export interface ReactChatMessageResponse {
  message_id: number
  room_id: number
  room_seq: number
  reaction_summary: ChatMessageReactionItem[]
  my_reactions: ChatMessageMyReactionItem[]
  server_time: number
}

/**
 * 撤回消息
 */
export const recallChatMessageApi = (roomId: number, messageId: number) => {
  return http.post<RecallChatMessageResponse>('/v1/community/chat/message/recall', {
    room_id: roomId,
    message_id: messageId,
  })
}

export const reactChatMessageApi = (
  roomId: number,
  messageId: number,
  reactionType: string,
  reactionValue: string,
  action: 'add' | 'remove',
) => {
  return http.post<ReactChatMessageResponse>('/v1/community/chat/message/react', {
    room_id: roomId,
    message_id: messageId,
    reaction_type: reactionType,
    reaction_value: reactionValue,
    action,
  })
}

export interface DeleteChatMessageResponse {
  message_id: number
  room_id: number
  status: number
}

export const deleteChatMessageApi = (messageId: number, reason?: string) => {
  return http.post<DeleteChatMessageResponse>('/v1/community/chat/message/delete', {
    message_id: messageId,
    reason,
  })
}

/** 聊天消息搜索参数 */
export interface SearchChatMessagesParams {
  room_id: number
  keyword?: string
  member_ids?: number[]
  member_keyword?: string
  start_time?: number
  end_time?: number
  page?: number
  limit?: number
}

/** 聊天消息搜索响应 */
export interface SearchChatMessagesResponse {
  messages: any[]
  total: number
  page: number
  limit: number
}

/** 搜索聊天消息 */
export const searchChatMessagesApi = (params: SearchChatMessagesParams) => {
  return http.get<SearchChatMessagesResponse>('/v1/community/chat/message/search', params)
}

/** 单个房间通知摘要 */
export interface NotificationSummaryRoom {
  room_id: number
  unread_mentions: number
  unread_replies: number
}

/** 通知摘要响应 */
export interface NotificationsSummaryResponse {
  rooms: NotificationSummaryRoom[]
}

/** 获取各聊天室未读 @提及 和 未读回复 汇总 */
export const getNotificationsSummaryApi = () => {
  return http.get<NotificationsSummaryResponse>('/v1/community/chat/room/notifications-summary')
}

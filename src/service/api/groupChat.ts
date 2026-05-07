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
  role: 'owner' | 'admin' | 'member'
  join_time: number
  is_muted: 0 | 1
  mute_until?: number
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

export const getCachedChatRoomsApi = () => cachedChatRoomsResponse

export const preloadChatRoomsApi = (withMemberPreview?: number, forceRefresh = false) => {
  if (cachedChatRoomsResponse && !forceRefresh) {
    return Promise.resolve({
      code: 1,
      msg: '',
      data: cachedChatRoomsResponse,
    })
  }

  if (chatRoomsPreloadPromise) return chatRoomsPreloadPromise

  chatRoomsPreloadPromise = getChatRoomsApi(withMemberPreview)
    .then((res) => {
      if (res?.code === 1 && res.data) {
        cachedChatRoomsResponse = res.data
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
  chatRoomsPreloadPromise = null
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
  pageSize?: number,
) => {
  return http.get<ChatMembersResponse>('/v1/community/chat/room/members', {
    room_id: roomId,
    role_filter: roleFilter || 'member',
    page: page || 1,
    page_size: pageSize || 50,
  })
}

export const joinChatRoomApi = (roomId: number) => {
  return http.post<{ success: boolean }>('/v1/community/chat/room/join', {
    room_id: roomId,
  })
}

export const muteMemberApi = (roomId: number, memberId: number, muteUntil: number = 0) => {
  return http.post<{ success: boolean }>('/v1/community/chat/governance/mute-member', {
    room_id: roomId,
    member_id: memberId,
    mute_until: muteUntil,
  })
}

export const unmuteMemberApi = (roomId: number, memberId: number) => {
  return http.post<{ success: boolean }>('/v1/community/chat/governance/unmute-member', {
    room_id: roomId,
    member_id: memberId,
  })
}

export const updateMemberRoleApi = (
  roomId: number,
  memberId: number,
  role: 'moderator' | 'member',
) => {
  console.log('memberId', memberId)

  return http.post<{ success: boolean }>('/v1/community/chat/governance/update-member-role', {
    room_id: roomId,
    member_id: memberId,
    role,
  })
}

export const sendChatMessageApi = (
  roomId: number,
  messageType: ChatMessageType,
  clientMessageId: string,
  payload: ChatMessagePayload,
) => {
  return http.post<SendChatMessageResponse>('/v1/community/chat/message/send', {
    room_id: roomId,
    message_type: messageType,
    client_message_id: clientMessageId,
    payload,
  })
}

export const getUnreadSummaryApi = () => {
  return http.get<UnreadSummaryResponse>('/v1/community/chat/unread-summary')
}

export const getChatMessageListApi = (params: {
  room_id: number
  before_message_id?: number
  after_message_id?: number
  limit?: number
}) => {
  return http.get<ChatMessageListResponse>('/v1/community/chat/message/list', params)
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

import type { ChatMessage } from '@/service/api/groupChat'
import { enrichChatMessageAssets } from '@/utils/chatAssetCache'

export type ChatMessagePatch = Partial<ChatMessage>

export interface NormalizeMessageOptions {
  currentMemberId?: number
  defaultLocalStatus?: ChatMessage['local_status']
  skipAssetEnrichment?: boolean
}

export interface MessageApplyResult {
  messages: ChatMessage[]
  changed: boolean
  insertedCount: number
}

const isServerMessageId = (id?: number) => Number.isFinite(Number(id)) && Number(id) > 0
const getMessageKey = (message: Pick<ChatMessage, 'id' | 'client_message_id'>) => {
  if (message.client_message_id) return `client:${message.client_message_id}`
  return `id:${message.id}`
}

export const normalizeChatMessage = (
  message: ChatMessage,
  options: NormalizeMessageOptions = {},
): ChatMessage => {
  const currentMemberId = Number(options.currentMemberId || 0)
  const senderMemberId = Number(message.sender?.member_id || message.member_id || 0)

  const normalized = {
    ...message,
    is_self: currentMemberId && senderMemberId === currentMemberId ? 1 : message.is_self,
    local_status: message.local_status || options.defaultLocalStatus || 'sent',
  }

  if (options.skipAssetEnrichment) {
    return normalized
  }

  return enrichChatMessageAssets(normalized)
}

export const sortChatMessages = (messages: ChatMessage[]) => {
  return [...messages].sort((a, b) => {
    const seqA = Number(a.room_seq || 0)
    const seqB = Number(b.room_seq || 0)
    if (seqA && seqB && seqA !== seqB) return seqA - seqB

    const createdA = Number(a.create_time || 0)
    const createdB = Number(b.create_time || 0)
    if (createdA !== createdB) return createdA - createdB

    return Number(a.id || 0) - Number(b.id || 0)
  })
}

export const mergeChatMessages = (messageList: ChatMessage[]) => {
  const mergedMessages: ChatMessage[] = []
  const idIndexMap = new Map<number, number>()
  const clientMessageIdIndexMap = new Map<string, number>()

  messageList.forEach((message) => {
    const matchedByClientMessageId = message.client_message_id
      ? clientMessageIdIndexMap.get(message.client_message_id)
      : undefined
    const matchedById = isServerMessageId(message.id)
      ? idIndexMap.get(Number(message.id))
      : undefined
    const matchedIndex = matchedByClientMessageId ?? matchedById

    if (typeof matchedIndex === 'number') {
      const current = mergedMessages[matchedIndex]
      const merged = {
        ...current,
        ...message,
        sender: {
          ...current.sender,
          ...message.sender,
        },
        payload: {
          ...current.payload,
          ...message.payload,
        },
        local_status: message.local_status || current.local_status || 'sent',
      }
      mergedMessages.splice(matchedIndex, 1, merged)
      if (isServerMessageId(merged.id)) idIndexMap.set(Number(merged.id), matchedIndex)
      if (merged.client_message_id)
        clientMessageIdIndexMap.set(merged.client_message_id, matchedIndex)
      return
    }

    mergedMessages.push(message)
    const nextIndex = mergedMessages.length - 1
    if (isServerMessageId(message.id)) idIndexMap.set(Number(message.id), nextIndex)
    if (message.client_message_id) clientMessageIdIndexMap.set(message.client_message_id, nextIndex)
  })

  return sortChatMessages(mergedMessages)
}

export const applyIncomingChatMessages = (
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
  options: NormalizeMessageOptions = {},
): MessageApplyResult => {
  const normalizedIncomingMessages = incomingMessages
    .filter((message) => !!message?.id || !!message?.client_message_id)
    .map((message) => normalizeChatMessage(message, options))

  if (normalizedIncomingMessages.length === 0) {
    return {
      messages: currentMessages,
      changed: false,
      insertedCount: 0,
    }
  }

  const beforeKeys = new Set(currentMessages.map(getMessageKey))
  const messages = mergeChatMessages([...currentMessages, ...normalizedIncomingMessages])
  const insertedCount = normalizedIncomingMessages.filter(
    (message) => !beforeKeys.has(getMessageKey(message)),
  ).length

  return {
    messages,
    changed: true,
    insertedCount,
  }
}

export const patchChatMessageById = (
  messages: ChatMessage[],
  messageId: number,
  patch: ChatMessagePatch,
) => {
  const index = messages.findIndex((message) => Number(message.id) === Number(messageId))
  if (index < 0) return { messages, changed: false }

  const nextMessages = [...messages]
  nextMessages.splice(index, 1, {
    ...messages[index],
    ...patch,
  })
  return { messages: nextMessages, changed: true }
}

export const patchChatMessageByClientMessageId = (
  messages: ChatMessage[],
  clientMessageId: string | undefined,
  patch: ChatMessagePatch,
) => {
  if (!clientMessageId) return { messages, changed: false }

  const index = messages.findIndex((message) => message.client_message_id === clientMessageId)
  if (index < 0) return { messages, changed: false }

  const nextMessages = [...messages]
  nextMessages.splice(index, 1, {
    ...messages[index],
    ...patch,
  })
  return { messages: nextMessages, changed: true }
}

export const hasRoomSeqGap = (messages: ChatMessage[], incomingMessage: ChatMessage) => {
  const persistedMessages = messages.filter((message) => isServerMessageId(message.id))
  const maxRoomSeq = persistedMessages.reduce(
    (maxSeq, message) => Math.max(maxSeq, Number(message.room_seq || 0)),
    0,
  )
  const incomingRoomSeq = Number(incomingMessage.room_seq || 0)
  return Boolean(maxRoomSeq && incomingRoomSeq && incomingRoomSeq > maxRoomSeq + 1)
}

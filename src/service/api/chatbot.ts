import { http } from '@/utils/http'

export interface ChatBotTokenInfo {
  tempToken: string
  openId: string
  openMemberId: string
  chatbotUrl: string
  jumpUrl: string
}

export const getChatBotTempTokenApi = () => {
  return http.get<ChatBotTokenInfo>('/v1/chatbot/get-temp-token')
}

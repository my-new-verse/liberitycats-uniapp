import { http } from '@/utils/http'

type getDiscordOauthUriApiResponse = {
  url: string
}

export const getDiscordOauthUriApi = () => {
  return http.get<getDiscordOauthUriApiResponse>('/v1/member/login/discord/get-auth-url')
}

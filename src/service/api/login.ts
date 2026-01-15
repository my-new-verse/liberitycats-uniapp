import { http } from '@/utils/http'

export interface sendEmailResponse {
  status: boolean
  email: string
  queue_id: number
  time: number
  ttl: number
  expire: number
}

export interface LoginResponse {
  token: string
  expire: number
}

/** POST 请求 */
export const sendEmailApi = (email: string) => {
  return http.post<sendEmailResponse>('/v1/member/login/email-code/send-mail', {
    email,
  })
}

/** POST 请求 */
export const loginApi = (email: string, code: string, extend?: Record<string, any>) => {
  return http.post<LoginResponse>('/v1/member/login/email-code/login', {
    email,
    code,
    // extend,
  })
}

/** POST 请求 */
export const logoutApi = () => {
  return http.post<LoginResponse>('/v1/member/login/email-code/logout', {})
}

export const loginDiscordApi = (code: string) => {
  return http.post<LoginResponse>('/v1/member/login/discord/login', {
    code,
  })
}

// 虚拟邮箱，登录和验证
export const sendVirtualEmailApi = (email: string) => {
  return http.post<sendEmailResponse>('/v1/member/virtual-login/send-mail', {
    email,
  })
}

export const virtualLoginApi = (email: string, code: string, extend?: Record<string, any>) => {
  return http.post<LoginResponse>('/v1/member/virtual-login/login', {
    email,
    code,
    // extend,
  })
}

// 查询虚拟邮箱是否存在
export const queryVirtualEmailApi = (email: string) => {
  return http.get<any>('/v1/member/virtual-login/query-email', {
    email,
  })
}

// 发送绑定虚拟邮箱的邮件
export const sendBindVirtualEmailApi = (email: string) => {
  return http.post<sendEmailResponse>('/v1/member/virtual-email/send-bind-mail', {
    email,
  })
}

export const bindVirtualEmailApi = (email: string, code: string, extend?: Record<string, any>) => {
  return http.post<LoginResponse>('/v1/member/virtual-email/bind-and-register', {
    email,
    code,
    // extend,
  })
}

// apple 登录
export const loginAppleApi = (info: any) => {
  return http.post<LoginResponse>('/v1/member/login/apple/login', info)
}

// 注销账号
export const logoffApi = () => {
  return http.post<LoginResponse>('/v1/member/user/logoff', {})
}

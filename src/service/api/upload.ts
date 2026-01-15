import { http } from '@/utils/http'

export interface getAliyunOssConfigApiResponse {
  accessKeyId: string
  policy: string
  signature: string
  dir: string
  host: string
  expire: number
  region: string
}

export const getAliyunOssConfigApi = () => {
  return http.get<getAliyunOssConfigApiResponse>('/v1/upload/oss/config')
}

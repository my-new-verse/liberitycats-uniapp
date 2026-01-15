import { http } from '@/utils/http'

type dayInfo = {
  date: string
  is_check: boolean
  continuous_days: number
  reward_amount: number
}

export interface getCheckInDataApiResponse {
  list: dayInfo[]
  today: dayInfo
  continuous_days: number
}

export const getCheckInDataApi = () => {
  return http.get<getCheckInDataApiResponse>('/v1/checkin/checkin/list')
}

export const checkInApi = () => {
  return http.post('/v1/checkin/checkin/checkin')
}

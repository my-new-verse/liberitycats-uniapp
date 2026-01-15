import { http } from '@/utils/http'

type I18n_content = {
  id: number
  agreement_id: number
  name: string
  lang: string
  content: string
  create_time: string
}

export interface AgreementType {
  id: number
  agreement_key: string
  sign_type: number
  refused_type: number
  status: number
  create_time: string
  i18n_content: I18n_content
}

export interface QuoteKeyAgreementList {
  user_login_agreement: AgreementType
  user_privacy_policy: AgreementType
  user_pledge_nft_agreement: AgreementType
  user_pledge_nft_guide: AgreementType
  user_pledge_nft_popup_content: AgreementType
  user_redeem_nft_popup_content: AgreementType
  virtual_email_intro: AgreementType
}

// 获取协议列表
export const getAgreementsByKeys = (quoteKey: string) => {
  return http.get<QuoteKeyAgreementList>('/v1/system/agreement/get-agreements-by-key', {
    quote_key: quoteKey,
  })
}

// 获取协议详情
export const getAgreementDetailApi = (id: number) => {
  return http.get<AgreementType>('/v1/system/agreement/detail', {
    id,
  })
}

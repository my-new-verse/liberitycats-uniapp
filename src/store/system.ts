import { defineStore } from 'pinia'
import { getSystemConfigApiV2 } from '@/service/api/user'
import { getAgreementsByKeys } from '@/service/api/agreement'
import buildInfo from '@/../build-info.json'

export const useSystemStore = defineStore('system', {
  state: () => ({
    config: null as any,
    ready: false,
    configReady: false,
    agreements: null as any,
    agreementsReady: false,
  }),

  getters: {
    // 是否已就绪（兼容旧 .ready 引用）
    ready: (state) => state.configReady,
  },

  actions: {
    setConfig(data: any) {
      this.config = data
      this.ready = true
      this.configReady = true
      uni.setStorageSync('systemConfigV2', data)
    },

    setAgreements(data: any) {
      this.agreements = data
      this.agreementsReady = true
      uni.setStorageSync('agreements', data)
    },

    /**
     * 确保 systemConfig 已就绪，如果未就绪则主动获取
     * 多次调用只发一次请求（通过 configReady 守卫）
     */
    async ensureConfig() {
      if (this.configReady && this.config) return this.config
      const systemInfo = uni.getSystemInfoSync()
      const platform = systemInfo.platform?.toLowerCase() || systemInfo.osName?.toLowerCase()
      const version = `${buildInfo.version}`
      try {
        const res = await getSystemConfigApiV2(version, platform)
        if (res.data) {
          this.setConfig(res.data)
        }
      } catch (e) {
        console.warn('ensureConfig fetch failed:', e)
      }
      return this.config
    },

    /**
     * 确保 agreements 已就绪，如果未就绪则主动获取
     */
    async ensureAgreements() {
      if (this.agreementsReady && this.agreements) return this.agreements
      try {
        const res = await getAgreementsByKeys(
          'user_login_agreement,user_privacy_policy,user_pledge_nft_agreement,user_pledge_nft_guide,user_pledge_nft_popup_content,user_redeem_nft_popup_content,virtual_email_intro',
        )
        if (res.data) {
          this.setAgreements(res.data)
        }
      } catch (e) {
        console.warn('ensureAgreements fetch failed:', e)
      }
      return this.agreements
    },
  },
})

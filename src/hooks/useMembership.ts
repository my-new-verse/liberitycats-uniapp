import { ref, computed } from 'vue'
import { getServerOnOff } from '@/utils'
import { getMemberNftsApi, refreshMemberNftsApi } from '@/service/api/pledge'
import {
  getMembershipEligibilityApi,
  refreshMembershipEligibilityApi,
  type MembershipEligibility,
  type MembershipScene,
} from '@/service/api/membership'
import { useUserStore } from '@/store/user'

export type { MembershipScene }

/** 完整会员权益（资格开放范围由服务端配置覆盖，此处为默认业务规则） */
export interface MembershipBenefit {
  key: string
  /** 订阅会员是否可获得 */
  subscription: boolean
  /** NFT Holder 是否可获得 */
  holder: boolean
}

export const MEMBERSHIP_BENEFITS: MembershipBenefit[] = [
  { key: 'identity', subscription: true, holder: true },
  { key: 'group_chat', subscription: true, holder: true },
  { key: 'publish_ad', subscription: true, holder: true },
  { key: 'portfolio', subscription: true, holder: true },
  { key: 'mall', subscription: true, holder: true },
  { key: 'pledge', subscription: false, holder: true },
]

const configValue = (key: string, fallback = '') => {
  const value = getServerOnOff(key, 'common', true)
  return typeof value === 'string' && value !== '' ? value : fallback
}

/** NFT 系列 / 网络 / 市场入口 / 教程入口 / 订阅方案，均优先读取服务端系统配置 */
export const getMembershipConfig = () => ({
  collection: configValue('nft_collection_name', 'Liberty Cats'),
  network: configValue('nft_network_name', 'Ethereum'),
  minHold: Number(configValue('nft_min_hold_count', '1')) || 1,
  okx: {
    url: configValue('nft_market_okx_url', 'https://www.okx.com/web3/marketplace/nft'),
    guide: configValue('nft_market_okx_guide_url', 'https://www.okx.com/help/section/faq-web3-nft'),
  },
  opensea: {
    url: configValue('nft_market_opensea_url', 'https://opensea.io'),
    guide: configValue(
      'nft_market_opensea_guide_url',
      'https://support.opensea.io/en/collections/2074152-buying',
    ),
  },
  troubleshootUrl: configValue('nft_holder_troubleshoot_url', ''),
  plan: {
    price: configValue('membership_subscription_price', ''),
    currency: configValue('membership_subscription_currency', '$'),
    period: configValue('membership_subscription_period', 'month'),
    subscribePath: configValue('membership_subscribe_path', ''),
    subscribeUrl: configValue('membership_subscribe_url', ''),
  },
})

const createDefaultEligibility = (): MembershipEligibility => ({
  subscription: { active: false, expired: false },
  nft: {
    active: false,
    count: 0,
    min_hold: 1,
    wallet_address: '',
    collection: '',
    network: '',
    syncing: false,
    held_before: false,
  },
})

/**
 * 会员资格状态
 * - 优先使用服务端资格接口（订阅 + NFT Holder 综合判定）
 * - 接口不可用时降级为本地 NFT 持有判定，避免阻断用户当前任务
 */
export const useMembershipEligibility = () => {
  const userStore = useUserStore()
  const eligibility = ref<MembershipEligibility>(createDefaultEligibility())
  const loading = ref(false)
  const failed = ref(false)
  /** 数据是否来自服务端资格接口（false 表示为降级判定，不用于阻断） */
  const reliable = ref(false)

  const fillLocalContext = (data: MembershipEligibility) => {
    const config = getMembershipConfig()
    data.nft.min_hold = data.nft.min_hold || config.minHold
    data.nft.wallet_address = data.nft.wallet_address || userStore.userInfo.wallet_address || ''
    data.nft.collection = data.nft.collection || config.collection
    data.nft.network = data.nft.network || config.network
    if (!data.subscription.plan) {
      data.subscription.plan = {
        price: config.plan.price,
        currency_symbol: config.plan.currency,
        period: config.plan.period,
      }
    }
    return data
  }

  /** 降级判定：仅依据当前绑定钱包的 NFT 数量 */
  const loadFallback = async () => {
    const data = createDefaultEligibility()
    const res = await getMemberNftsApi(1, false, 4)
    const list = (res.data?.data || []).filter((item) => item !== null)
    const count = res.data?.valuation?.quantity ?? list.length
    data.nft.count = count
    data.nft.active = count >= getMembershipConfig().minHold
    eligibility.value = fillLocalContext(data)
    reliable.value = false
  }

  const load = async (scene?: MembershipScene) => {
    if (!userStore.isLogin) {
      eligibility.value = fillLocalContext(createDefaultEligibility())
      return eligibility.value
    }
    loading.value = true
    failed.value = false
    try {
      const res = await getMembershipEligibilityApi(scene)
      if (res.code === 1 && res.data) {
        eligibility.value = fillLocalContext({ ...createDefaultEligibility(), ...res.data })
        reliable.value = true
      } else {
        await loadFallback()
      }
    } catch (error) {
      console.log('[v0] membership eligibility fallback', error)
      try {
        await loadFallback()
      } catch (fallbackError) {
        console.log('[v0] membership eligibility failed', fallbackError)
        failed.value = true
      }
    } finally {
      loading.value = false
    }
    return eligibility.value
  }

  /** 主动刷新资格（订阅状态 + 链上 NFT 索引） */
  const refresh = async (scene?: MembershipScene) => {
    if (!userStore.isLogin) return eligibility.value
    loading.value = true
    failed.value = false
    try {
      const res = await refreshMembershipEligibilityApi(scene)
      if (res.code === 1 && res.data) {
        eligibility.value = fillLocalContext({ ...createDefaultEligibility(), ...res.data })
        reliable.value = true
        return eligibility.value
      }
      throw new Error(res.msg || 'refresh unavailable')
    } catch (error) {
      console.log('[v0] membership refresh fallback', error)
      try {
        await refreshMemberNftsApi()
        await loadFallback()
        // 链上索引通常存在延迟，未检测到时提示同步中
        if (!eligibility.value.nft.active) {
          eligibility.value.nft.syncing = true
        }
      } catch (fallbackError) {
        console.log('[v0] membership refresh failed', fallbackError)
        failed.value = true
      }
    } finally {
      loading.value = false
    }
    return eligibility.value
  }

  const isMember = computed(
    () => eligibility.value.subscription.active || eligibility.value.nft.active,
  )
  const hasBoth = computed(
    () => eligibility.value.subscription.active && eligibility.value.nft.active,
  )

  const isSceneUnlocked = (scene: MembershipScene) => {
    const sceneFlag = eligibility.value.scenes?.[scene]
    if (typeof sceneFlag === 'boolean') return sceneFlag
    if (scene === 'nft_holder') return eligibility.value.nft.active
    return isMember.value
  }

  return {
    eligibility,
    loading,
    failed,
    reliable,
    isMember,
    hasBoth,
    load,
    refresh,
    isSceneUnlocked,
  }
}

/**
 * 受限功能解锁弹层的调用方
 * - 保留当前页面上下文，关闭后停留在原页面
 * - 服务端资格接口不可用时不阻断操作（fail-open），由服务端最终校验兜底
 */
export const useMembershipUnlock = () => {
  const visible = ref(false)
  const scene = ref<MembershipScene>('publish_ad')
  let pendingAction: (() => void) | null = null

  const open = (nextScene: MembershipScene, onUnlocked?: () => void) => {
    scene.value = nextScene
    pendingAction = onUnlocked || null
    visible.value = true
  }

  const close = () => {
    visible.value = false
  }

  const handleUnlocked = () => {
    visible.value = false
    const action = pendingAction
    pendingAction = null
    action?.()
  }

  /**
   * 在执行受限操作前确认资格
   * @returns true 表示可以继续当前操作
   */
  const ensure = async (nextScene: MembershipScene, action?: () => void) => {
    const { load, reliable, isSceneUnlocked } = useMembershipEligibility()
    await load(nextScene)
    if (!reliable.value || isSceneUnlocked(nextScene)) return true
    open(nextScene, action)
    return false
  }

  return { visible, scene, open, close, handleUnlocked, ensure }
}

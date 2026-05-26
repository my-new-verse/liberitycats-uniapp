import { defineStore } from 'pinia'
import type { GameType } from '@/service/api/game'

export interface GameConfig {
  gameType: GameType
  url: string
  tempToken?: string
}

export interface WebViewState {
  instance: any | null // PlusWebviewObject类型在非App环境下无法定义
  config: GameConfig | null
  isPreloading: boolean
  isLoaded: boolean
  retryCount: number
  lastPreloadTime: number | null
  gameVersion: string | null // 新增：存储游戏版本号，用于资源更新检测
}

export interface GameWebViewStoreState {
  webViews: Record<GameType, WebViewState>
  isInitialized: boolean
  preloadScheduled: boolean
}

export const useGameWebViewStore = defineStore('gameWebview', {
  state: (): GameWebViewStoreState => ({
    webViews: {
      MATCH_THREE: {
        instance: null,
        config: null,
        isPreloading: false,
        isLoaded: false,
        retryCount: 0,
        lastPreloadTime: null,
        gameVersion: null,
      },
      JUMP: {
        instance: null,
        config: null,
        isPreloading: false,
        isLoaded: false,
        retryCount: 0,
        lastPreloadTime: null,
        gameVersion: null,
      },
    },
    isInitialized: false,
    preloadScheduled: false,
  }),

  actions: {
    // 设置单个游戏配置
    setGameConfig(gameType: GameType, config: GameConfig) {
      this.webViews[gameType].config = config
    },

    // 清理所有游戏配置
    clearGameConfigs() {
      Object.keys(this.webViews).forEach((key) => {
        const gameType = key as GameType
        this.webViews[gameType].config = null
        this.webViews[gameType].instance = null
        this.webViews[gameType].isPreloading = false
        this.webViews[gameType].isLoaded = false
        this.webViews[gameType].retryCount = 0
        this.webViews[gameType].lastPreloadTime = null
        this.webViews[gameType].gameVersion = null
      })
    },

    // 更新WebView实例
    setWebViewInstance(gameType: GameType, instance: any) {
      this.webViews[gameType].instance = instance
    },

    // 更新预加载状态
    updatePreloadStatus(gameType: GameType, status: Partial<WebViewState>) {
      Object.assign(this.webViews[gameType], status)
      if (status.isLoaded) {
        this.webViews[gameType].lastPreloadTime = Date.now()
      }
    },

    // 标记初始化完成
    markInitialized() {
      this.isInitialized = true
    },

    // 标记预加载已调度
    markPreloadScheduled() {
      this.preloadScheduled = true
    },

    // 重置指定游戏的状态
    resetGameState(gameType: GameType) {
      this.webViews[gameType] = {
        instance: null,
        config: null,
        isPreloading: false,
        isLoaded: false,
        retryCount: 0,
        lastPreloadTime: null,
        gameVersion: null,
      }
    },

    // 重置所有状态
    resetAll() {
      this.$reset()
    },

    // 检查是否需要重新预加载（基于时间或状态）
    shouldRepreload(gameType: GameType, maxAgeMs: number = 300000): boolean {
      const state = this.webViews[gameType]
      const now = Date.now()
      // 如果从未预加载过
      if (!state.lastPreloadTime) return true
      // 如果预加载失败且重试次数未达到上限
      if (state.retryCount > 0 && state.retryCount < 3) return true
      // 如果预加载时间超过最大年龄
      if (now - state.lastPreloadTime > maxAgeMs) return true
      // 如果实例不存在但有配置
      if (!state.instance && state.config) return true
      return false
    },

    // 检查并更新游戏版本（新增功能）
    async checkAndUpdateGameVersion(gameType: GameType, newConfig: GameConfig, newVersion: string) {
      const currentState = this.webViews[gameType]
      const currentVersion = currentState.gameVersion

      // 如果版本相同，无需更新
      if (currentVersion === newVersion) {
        console.log(`[GameStore] ${gameType} 版本未变化，跳过更新: ${newVersion}`)
        return false
      }

      console.log(`[GameStore] ${gameType} 检测到版本更新: ${currentVersion} -> ${newVersion}`)

      // 更新 store 中的版本信息
      this.webViews[gameType].gameVersion = newVersion
      this.webViews[gameType].config = newConfig

      return true
    },

    // 获取当前游戏版本
    getGameVersion(gameType: GameType): string | null {
      return this.webViews[gameType].gameVersion
    },
  },
  persist: false,
})

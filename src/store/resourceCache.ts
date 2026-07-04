import { defineStore } from 'pinia'
import type { PreloadResource } from '@/service/api/game'

/**
 * 资源缓存 Pinia Store
 *
 * 存储 preloadResources 快照和 gameVersion，
 * 用于在打开游戏时与接口返回的最新 preloadResources 比对，
 * 判断是否需要重新下载资源。
 */
export const useResourceCacheStore = defineStore('resourceCache', {
  state: () => ({
    /** 每个 gameType 对应的 preloadResources 快照 */
    preloadResources: {} as Record<string, PreloadResource[]>,
    /** 每个 gameType 对应的 gameVersion */
    gameVersions: {} as Record<string, string>,
  }),

  actions: {
    /**
     * 保存某个 gameType 的 preloadResources 快照
     */
    setPreloadResources(gameType: string, resources: PreloadResource[], gameVersion: string) {
      this.preloadResources[gameType] = resources
      this.gameVersions[gameType] = gameVersion
    },

    /**
     * 获取某个 gameType 的 preloadResources 快照
     */
    getPreloadResources(gameType: string): PreloadResource[] | null {
      return this.preloadResources[gameType] || null
    },

    /**
     * 获取某个 gameType 的 gameVersion
     */
    getGameVersion(gameType: string): string | null {
      return this.gameVersions[gameType] || null
    },

    /**
     * 比较 preloadResources 是否发生变化
     * @returns true 表示已变化或首次存储
     */
    isPreloadResourcesChanged(gameType: string, resources: PreloadResource[]): boolean {
      const stored = this.preloadResources[gameType]
      if (!stored) return true
      return JSON.stringify(stored) !== JSON.stringify(resources)
    },

    /**
     * 清空所有缓存
     */
    clear() {
      this.preloadResources = {}
      this.gameVersions = {}
    },
  },

  persist: true,
})

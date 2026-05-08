import { defineStore } from 'pinia'

export const useSystemStore = defineStore('system', {
  state: () => ({
    config: null as any,
    ready: false,
  }),

  actions: {
    setConfig(data: any) {
      this.config = data
      this.ready = true
    },
  },
})

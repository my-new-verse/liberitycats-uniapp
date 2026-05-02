type ReconnectingWebSocketOptions = {
  reconnectInterval?: number
  maxReconnectAttempts?: number
  debug?: boolean
}

type SocketMessageHandler = (message: any) => void
type SocketVoidHandler = () => void
type SocketErrorHandler = (error: any) => void

const WS_OPEN_STATE = 1

export class ReconnectingWebSocket {
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts = 0
  private socketTask: UniApp.SocketTask | null = null
  private manuallyClosed = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isOpen = false
  private debug: boolean

  private messageHandler?: SocketMessageHandler
  private openHandler?: SocketVoidHandler
  private closeHandler?: SocketVoidHandler
  private errorHandler?: SocketErrorHandler

  constructor(url: string, options: ReconnectingWebSocketOptions = {}) {
    this.url = url
    this.reconnectInterval = options.reconnectInterval ?? 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
    this.debug = options.debug ?? false
  }

  connect() {
    if (this.socketTask || this.manuallyClosed) return

    this.log('connecting', this.url)
    const task = uni.connectSocket({
      url: this.url,
      complete: () => {},
    })

    this.socketTask = task

    task.onOpen(() => {
      this.log('opened')
      this.isOpen = true
      this.reconnectAttempts = 0
      this.clearReconnectTimer()
      this.openHandler?.()
    })

    task.onMessage((event) => {
      const parsed = this.parseMessage(event?.data)
      if (!parsed) return

      if (parsed.event === 'pusher:ping') {
        this.sendJson({
          event: 'pusher:pong',
          data: {},
        })
        return
      }

      this.messageHandler?.(parsed)
    })

    task.onError((error) => {
      this.log('error', error)
      this.errorHandler?.(error)
    })

    task.onClose(() => {
      this.log('closed')
      this.isOpen = false
      this.socketTask = null
      this.closeHandler?.()
      if (!this.manuallyClosed) {
        this.reconnect()
      }
    })
  }

  disconnect() {
    this.manuallyClosed = true
    this.clearReconnectTimer()
    this.isOpen = false
    const task = this.socketTask
    this.socketTask = null
    if (task) {
      task.close({})
    }
  }

  reconnect() {
    if (this.manuallyClosed) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('reconnect stopped: max attempts reached')
      return
    }

    this.reconnectAttempts += 1
    this.clearReconnectTimer()
    this.log(`reconnect attempt ${this.reconnectAttempts}`)
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  send(data: string) {
    if (!this.socketTask || !this.isOpen) return false

    this.socketTask.send({
      data,
    })
    return true
  }

  sendJson(payload: Record<string, any>) {
    return this.send(JSON.stringify(payload))
  }

  onMessage(callback: SocketMessageHandler) {
    this.messageHandler = callback
  }

  onOpen(callback: SocketVoidHandler) {
    this.openHandler = callback
  }

  onClose(callback: SocketVoidHandler) {
    this.closeHandler = callback
  }

  onError(callback: SocketErrorHandler) {
    this.errorHandler = callback
  }

  private parseMessage(raw: any) {
    try {
      const outer = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!outer) return null
      if (typeof outer.data === 'string') {
        try {
          return {
            ...outer,
            data: JSON.parse(outer.data),
          }
        } catch {
          return outer
        }
      }
      return outer
    } catch (error) {
      this.log('parse failed', error)
      return null
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private log(...args: any[]) {
    if (this.debug) {
      console.log('[ReconnectingWebSocket]', ...args)
    }
  }
}

export const isSocketOpen = (task: UniApp.SocketTask | null) =>
  // Some runtimes expose readyState, some don't. Keep helper if needed later.
  (task as any)?.readyState === WS_OPEN_STATE

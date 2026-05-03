import { ReconnectingWebSocket } from './reconnectingWebSocket'

type ConnectionState = {
  current?: string
  previous?: string
}

type EchoPrivateChannelClientOptions = {
  key: string
  wsHost: string
  authEndpoint: string
  getToken: () => string
  forceTLS?: boolean
  cluster?: string
  enabledTransports?: Array<'ws' | 'wss'>
  activityTimeout?: number
  pongTimeout?: number
  reconnectInterval?: number
  maxReconnectAttempts?: number
  debug?: boolean
  eventHandlers?: Record<string, (payload: any) => Promise<void> | void>
  beforeReconnect?: (reason: string) => Promise<void> | void
  onMessage: (payload: any) => Promise<void> | void
  onAllEvent?: (eventName: string, data: any) => void
  onSubscribed?: (privateChannelName: string) => void
  onAuthStart?: (payload: { socket_id: string; channel_name: string; endpoint: string }) => void
  onAuthResponse?: (payload: { statusCode?: number; data: any }) => void
  onConnectionConnected?: (payload: { socketId?: string; state?: string }) => void
  onConnectionDisconnected?: () => void
  onConnectionStateChange?: (states: ConnectionState) => void
  onConnectionError?: (error: any) => void
  onPrivateChannelError?: (error: any) => void
}

const PUSHER_PROTOCOL_VERSION = '7'
const PUSHER_CLIENT_NAME = 'uniapp'
const PUSHER_CLIENT_VERSION = '1.0.0'

export class EchoPrivateChannelClient {
  private socket: ReconnectingWebSocket | null = null
  private currentChannelName = ''
  private subscribedChannelName = ''
  private pendingChannelName = ''
  private currentSocketId = ''
  private connectionState = 'disconnected'
  private manuallyClosed = true
  private keepAliveOnHide = false
  private isAuthorizing = false
  private readonly defaultEventNames = ['GroupMessageEvent', '.GroupMessageEvent']

  constructor(private readonly options: EchoPrivateChannelClientOptions) {}

  async subscribe(channelName: string) {
    if (!channelName) return

    this.currentChannelName = channelName
    this.manuallyClosed = false
    this.ensureSocket()

    if (this.isConnected()) {
      await this.subscribeCurrentChannel()
      return
    }

    this.socket?.connect()
  }

  disconnect(manual = true) {
    this.manuallyClosed = manual
    this.leaveCurrentChannel()
    this.updateConnectionState('disconnected')
    this.currentSocketId = ''
    this.isAuthorizing = false
    this.socket?.disconnect()
    this.socket = null
  }

  destroy() {
    this.disconnect(true)
    this.currentChannelName = ''
    this.keepAliveOnHide = false
  }

  isConnected() {
    return this.connectionState === 'connected' && !!this.currentSocketId
  }

  setKeepAliveOnHide(value: boolean) {
    this.keepAliveOnHide = value
  }

  async handlePageShow() {
    this.keepAliveOnHide = false
    if (!this.currentChannelName) return
    if (this.isConnected()) return

    await this.options.beforeReconnect?.('foreground_resume')
    this.manuallyClosed = false
    this.ensureSocket()
    this.socket?.connect()
  }

  handlePageHide() {
    if (this.keepAliveOnHide) return
    this.disconnect(true)
  }

  private ensureSocket() {
    if (this.socket) return

    this.socket = new ReconnectingWebSocket(this.buildSocketUrl(), {
      reconnectInterval: this.options.reconnectInterval ?? 3000,
      maxReconnectAttempts: this.options.maxReconnectAttempts ?? 10,
      debug: this.options.debug ?? false,
    })

    this.socket.onOpen(() => {
      this.updateConnectionState('connecting')
    })

    this.socket.onMessage((packet) => {
      void this.handleSocketPacket(packet)
    })

    this.socket.onClose(() => {
      this.currentSocketId = ''
      this.isAuthorizing = false
      this.subscribedChannelName = ''
      this.pendingChannelName = ''
      this.options.onConnectionDisconnected?.()
      this.updateConnectionState('disconnected')
    })

    this.socket.onError((error) => {
      this.options.onConnectionError?.(error)
    })
  }

  private async handleSocketPacket(packet: any) {
    const eventName = packet?.event
    const data = packet?.data

    if (!eventName) return

    if (eventName === 'pusher:connection_established') {
      this.currentSocketId = data?.socket_id || ''
      this.updateConnectionState('connected')
      this.options.onConnectionConnected?.({
        socketId: this.currentSocketId,
        state: this.connectionState,
      })
      await this.subscribeCurrentChannel()
      return
    }

    if (
      eventName === 'pusher_internal:subscription_succeeded' ||
      eventName === 'pusher:subscription_succeeded'
    ) {
      this.subscribedChannelName = this.pendingChannelName || this.subscribedChannelName
      this.pendingChannelName = ''
      if (this.subscribedChannelName) {
        this.options.onSubscribed?.(this.subscribedChannelName)
      }
      return
    }

    if (eventName === 'pusher:error') {
      this.options.onPrivateChannelError?.(data)
      return
    }

    this.options.onAllEvent?.(eventName, data)

    const handler = this.getEventHandler(eventName)
    if (handler) {
      await handler(data)
      return
    }

    await this.options.onMessage(data)
  }

  private async subscribeCurrentChannel() {
    if (!this.currentChannelName || !this.currentSocketId || this.isAuthorizing) return

    const privateChannelName = this.ensurePrivateChannelName(this.currentChannelName)
    if (this.subscribedChannelName === privateChannelName) return

    const token = this.options.getToken()
    if (!token) return

    this.isAuthorizing = true
    try {
      const authResponse = await this.authorizeChannel(
        privateChannelName,
        this.currentSocketId,
        token,
      )
      this.pendingChannelName = privateChannelName

      const payload: Record<string, any> = {
        channel: privateChannelName,
        auth: authResponse?.auth || '',
      }

      if (authResponse?.channel_data) {
        payload.channel_data = authResponse.channel_data
      }

      this.socket?.sendJson({
        event: 'pusher:subscribe',
        data: payload,
      })
    } finally {
      this.isAuthorizing = false
    }
  }

  private authorizeChannel(channelName: string, socketId: string, token: string) {
    this.options.onAuthStart?.({
      socket_id: socketId,
      channel_name: channelName,
      endpoint: this.options.authEndpoint,
    })

    return new Promise<any>((resolve, reject) => {
      uni.request({
        url: this.options.authEndpoint,
        method: 'POST',
        header: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: this.encodeFormBody({
          socket_id: socketId,
          channel_name: channelName,
        }),
        success: (res) => {
          this.options.onAuthResponse?.({
            statusCode: res.statusCode,
            data: res.data,
          })

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
            return
          }

          const error = new Error(`频道鉴权失败(${res.statusCode || 'unknown'})`)
          this.options.onPrivateChannelError?.(error)
          reject(error)
        },
        fail: (error) => {
          this.options.onConnectionError?.(error)
          reject(error)
        },
      })
    })
  }

  private leaveCurrentChannel() {
    const channelName = this.subscribedChannelName || this.pendingChannelName
    if (channelName) {
      this.socket?.sendJson({
        event: 'pusher:unsubscribe',
        data: {
          channel: channelName,
        },
      })
    }

    this.subscribedChannelName = ''
    this.pendingChannelName = ''
  }

  private ensurePrivateChannelName(channelName: string) {
    return channelName.startsWith('private-') ? channelName : `private-${channelName}`
  }

  private buildSocketUrl() {
    const protocol = this.resolveTransportProtocol()
    const normalizedHost = this.options.wsHost.replace(/^wss?:\/\//, '')
    const query = [
      `protocol=${PUSHER_PROTOCOL_VERSION}`,
      `client=${PUSHER_CLIENT_NAME}`,
      `version=${PUSHER_CLIENT_VERSION}`,
      'flash=false',
    ].join('&')

    return `${protocol}://${normalizedHost}/app/${this.options.key}?${query}`
  }

  private resolveTransportProtocol() {
    const transports = this.options.enabledTransports ?? ['wss']
    if (this.options.forceTLS !== false) {
      return 'wss'
    }

    return transports.includes('ws') ? 'ws' : 'wss'
  }

  private updateConnectionState(current: string) {
    const previous = this.connectionState
    this.connectionState = current
    this.options.onConnectionStateChange?.({
      current,
      previous,
    })
  }

  private encodeFormBody(payload: Record<string, string>) {
    return Object.entries(payload)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
  }

  private getEventHandler(eventName: string) {
    const handlers = this.getEventHandlers()
    if (handlers[eventName]) return handlers[eventName]

    const normalizedEventName = eventName.startsWith('.') ? eventName.slice(1) : eventName
    if (handlers[normalizedEventName]) return handlers[normalizedEventName]

    const dotPrefixedEventName = `.${normalizedEventName}`
    return handlers[dotPrefixedEventName]
  }

  private getEventHandlers() {
    if (this.options.eventHandlers && Object.keys(this.options.eventHandlers).length > 0) {
      return this.options.eventHandlers
    }

    return this.defaultEventNames.reduce(
      (acc, eventName) => {
        acc[eventName] = this.options.onMessage
        return acc
      },
      {} as Record<string, (payload: any) => Promise<void> | void>,
    )
  }
}

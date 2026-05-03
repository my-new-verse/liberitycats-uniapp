import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

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

export class EchoPrivateChannelClient {
  private echo: InstanceType<typeof Echo> | null = null
  private channel: any = null
  private subscribedChannelName = ''
  private currentChannelName = ''
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private manuallyClosed = true
  private keepAliveOnHide = false
  private readonly defaultEventNames = ['GroupMessageEvent', '.GroupMessageEvent']

  constructor(private readonly options: EchoPrivateChannelClientOptions) {}

  async subscribe(channelName: string) {
    if (!channelName) return

    this.currentChannelName = channelName
    this.manuallyClosed = false
    this.ensureEcho()
    if (!this.echo) return

    const privateChannelName = `private-${channelName}`
    if (this.subscribedChannelName === privateChannelName) return

    this.leaveCurrentChannel()
    this.log('subscribing channel', {
      channelName,
      privateChannelName,
    })

    const channel = this.echo.private(channelName)
    const eventHandlers = this.getEventHandlers()
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      channel.listen(eventName, handler)
    })
    channel.listenToAll?.((eventName: string, data: any) => {
      this.options.onAllEvent?.(eventName, data)
    })
    channel.error?.((error: any) => {
      this.options.onPrivateChannelError?.(error)
    })
    channel.subscribed?.(() => {
      this.options.onSubscribed?.(privateChannelName)
    })

    this.channel = channel
    this.subscribedChannelName = privateChannelName
  }

  disconnect(manual = true) {
    this.manuallyClosed = manual
    this.clearReconnectTimer()
    this.leaveCurrentChannel()
    this.echo?.disconnect()
    this.echo = null
  }

  destroy() {
    this.disconnect(true)
    this.currentChannelName = ''
    this.keepAliveOnHide = false
  }

  isConnected() {
    return this.getConnection()?.state === 'connected'
  }

  setKeepAliveOnHide(value: boolean) {
    this.keepAliveOnHide = value
  }

  async handlePageShow() {
    this.keepAliveOnHide = false
    if (!this.currentChannelName) return
    if (this.isConnected()) return
    await this.reconnect('foreground_resume')
  }

  handlePageHide() {
    if (this.keepAliveOnHide) {
      this.log('keep socket alive while page hides')
      return
    }

    this.disconnect(true)
  }

  private ensureEcho() {
    if (this.echo) return

    const token = this.options.getToken()
    if (!token) return
    ;(globalThis as any).Pusher = Pusher

    this.echo = new Echo({
      broadcaster: 'pusher',
      key: this.options.key,
      wsHost: this.options.wsHost,
      forceTLS: this.options.forceTLS ?? true,
      cluster: this.options.cluster ?? 'mt1',
      enabledTransports: this.options.enabledTransports ?? ['ws', 'wss'],
      activityTimeout: this.options.activityTimeout ?? 30000,
      pongTimeout: this.options.pongTimeout ?? 15000,
      authEndpoint: this.options.authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
      authorizer: (channel: any) => {
        return {
          authorize: (socketId: string, callback: Function) => {
            this.options.onAuthStart?.({
              socket_id: socketId,
              channel_name: channel.name,
              endpoint: this.options.authEndpoint,
            })

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
                channel_name: channel.name,
              }),
              success: (res) => {
                this.options.onAuthResponse?.({
                  statusCode: res.statusCode,
                  data: res.data,
                })

                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                  callback(null, res.data)
                  return
                }

                callback(new Error(`频道鉴权失败(${res.statusCode || 'unknown'})`), res.data)
              },
              fail: (error) => {
                this.options.onConnectionError?.(error)
                callback(error, null)
              },
            })
          },
        }
      },
    })

    this.bindConnectionEvents(this.echo)
  }

  private bindConnectionEvents(echoInstance: InstanceType<typeof Echo>) {
    const connection = (echoInstance.connector as any)?.pusher?.connection
    if (!connection?.bind) return

    connection.bind('connected', () => {
      this.resetReconnectState()
      this.options.onConnectionConnected?.({
        socketId: connection.socket_id,
        state: connection.state,
      })
    })

    connection.bind('error', (error: any) => {
      this.options.onConnectionError?.(error)
      const errorCode = error?.data?.code || error?.error?.data?.code || error?.code
      if (errorCode === 4201) {
        this.scheduleReconnect('pusher_pong_timeout')
      }
    })

    connection.bind('disconnected', () => {
      this.options.onConnectionDisconnected?.()
      this.scheduleReconnect('disconnected')
    })

    connection.bind('state_change', (states: ConnectionState) => {
      this.options.onConnectionStateChange?.(states)
      if (states?.current === 'connected') {
        this.resetReconnectState()
        return
      }

      if (states?.current === 'unavailable' || states?.current === 'failed') {
        this.scheduleReconnect(`state_${states.current}`)
      }
    })
  }

  private async reconnect(reason: string) {
    if (!this.currentChannelName) return

    this.log('reconnecting chat socket', reason)
    this.disconnect(false)
    await this.options.beforeReconnect?.(reason)
    await this.subscribe(this.currentChannelName)
  }

  private scheduleReconnect(reason: string) {
    if (this.manuallyClosed) return
    if (this.keepAliveOnHide) return
    if (this.reconnectTimer) return
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts ?? 10)) {
      this.log('reconnect stopped: max attempts reached', {
        reason,
        attempts: this.reconnectAttempts,
      })
      return
    }

    this.reconnectAttempts += 1
    const reconnectInterval = this.options.reconnectInterval ?? 3000
    this.log('schedule reconnect', {
      reason,
      attempt: this.reconnectAttempts,
      delay: reconnectInterval,
    })

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      await this.reconnect(reason)
    }, reconnectInterval)
  }

  private leaveCurrentChannel() {
    if (this.subscribedChannelName && this.echo) {
      this.echo.leave(this.subscribedChannelName.replace(/^private-/, ''))
    }

    if (this.channel?.stopListening) {
      Object.keys(this.getEventHandlers()).forEach((eventName) => {
        this.channel.stopListening(eventName)
      })
      this.channel.stopListeningToAll?.()
    }

    this.channel = null
    this.subscribedChannelName = ''
  }

  private getConnection() {
    return (this.echo?.connector as any)?.pusher?.connection
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private resetReconnectState() {
    this.clearReconnectTimer()
    this.reconnectAttempts = 0
  }

  private encodeFormBody(payload: Record<string, string>) {
    return Object.entries(payload)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
  }

  private log(message: string, payload?: any) {
    if (!this.options.debug) return
    if (typeof payload === 'undefined') {
      console.log('[EchoPrivateChannelClient]', message)
      return
    }

    console.log('[EchoPrivateChannelClient]', message, payload)
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

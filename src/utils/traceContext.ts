/**
 * 前端链路追踪上下文
 * 遵循 W3C Trace Context 规范，实现端到端日志关联
 *
 * traceparent 格式: {version}-{trace-id}-{parent-id}-{trace-flags}
 * 示例: 00-4bf92f3577b34da6a3ce929d0e0e4736-a1b2c3d4e5f67890-01
 */

/**
 * 生成随机十六进制字节串
 * - App (iOS/Android) / H5: 使用 crypto.getRandomValues
 * - 微信小程序: 使用 wx.getRandomValues
 * @param byteLength 字节长度
 */
function generateRandomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)

  // #ifdef MP-WEIXIN
  // 微信小程序不支持 crypto.getRandomValues，使用 wx.getRandomValues
  wx.getRandomValues({
    length: byteLength,
  } as any)
  // wx.getRandomValues 是同步填充 buffer 的，直接读取 bytes
  // #endif

  // #ifndef MP-WEIXIN
  // App / H5 环境使用 crypto.getRandomValues
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    // 降级：使用 Math.random（不推荐，但保证可用）
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  // #endif

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

class TraceContext {
  /** 当前会话的 trace_id（32位十六进制），用户会话期间保持不变 */
  private currentTraceId: string | null = null
  /** 当前 span_id（16位十六进制） */
  private currentSpanId: string | null = null
  /** 请求 ID，用于标识单个请求 */
  private requestId: string

  constructor() {
    this.requestId = this.generateRequestId()
  }

  /**
   * 生成 trace_id（32位十六进制 = 16字节）
   * 要求：不能全为 0
   */
  generateTraceId(): string {
    let traceId = generateRandomHex(16)
    // 确保不全为 0
    if (traceId === '0'.repeat(32)) {
      traceId = generateRandomHex(16)
    }
    return traceId
  }

  /**
   * 生成 span_id（16位十六进制 = 8字节）
   * 要求：不能全为 0
   */
  generateSpanId(): string {
    let spanId = generateRandomHex(8)
    // 确保不全为 0
    if (spanId === '0'.repeat(16)) {
      spanId = generateRandomHex(8)
    }
    return spanId
  }

  /**
   * 生成 X-Request-Id
   * 格式: req-{timestamp}-{random}
   */
  generateRequestId(): string {
    return 'req-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 构建 traceparent 请求头
   * 格式: 00-{trace-id}-{span-id}-01
   * - trace_id: 会话期间保持不变（首次调用时自动生成）
   * - span_id: 每次请求都生成新的
   */
  buildTraceparent(): string {
    if (!this.currentTraceId) {
      this.currentTraceId = this.generateTraceId()
    }
    // console.log(this.currentTraceId, '======')
    const spanId = this.generateSpanId()
    this.currentSpanId = spanId
    return `00-${this.currentTraceId}-${spanId}-01`
  }

  /**
   * 获取新的 X-Request-Id（每次请求生成新的）
   */
  getNewRequestId(): string {
    this.requestId = this.generateRequestId()
    return this.requestId
  }

  /**
   * 从响应头中提取 traceparent，更新当前 trace_id 和 span_id
   * 后端返回的 traceparent 包含后端生成的 span_id
   */
  updateFromResponse(traceparent: string): void {
    if (!traceparent) return
    const parts = traceparent.split('-')
    if (parts.length === 4) {
      this.currentTraceId = parts[1]
      this.currentSpanId = parts[2]
    }
  }

  /**
   * 获取当前 trace_id（用于日志注入）
   * 如果尚未初始化，返回 'unknown'
   */
  getCurrentTraceId(): string {
    return this.currentTraceId || 'unknown'
  }

  /**
   * 获取当前 span_id
   */
  getCurrentSpanId(): string {
    return this.currentSpanId || 'unknown'
  }

  /**
   * 获取当前 request_id
   */
  getRequestId(): string {
    return this.requestId
  }

  /**
   * 重置链路上下文（用户登出时调用）
   */
  reset(): void {
    this.currentTraceId = null
    this.currentSpanId = null
    this.requestId = this.generateRequestId()
  }
}

export default new TraceContext()

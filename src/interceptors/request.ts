/* eslint-disable no-param-reassign */
import qs from 'qs'
import { useUserStore } from '@/store'
import { platform } from '@/utils/platform'
import { getEnvBaseUrl } from '@/utils'
import buildInfo from '@/../build-info.json'
import traceContext from '@/utils/traceContext'

const version = `${buildInfo.version}`

/**
 * 自定义请求配置
 */
export type CustomRequestOptions = UniApp.RequestOptions & {
  /** 查询参数，会自动转换为 queryString */
  query?: Record<string, any>
  /** 出错时是否隐藏错误提示 */
  hideErrorToast?: boolean
  /** 跳过并发队列，直接发起请求（适用于埋点上报等无需排队的场景） */
  skipQueue?: boolean
  /** 请求优先级：high 高优插队，normal 正常排队，默认 normal */
  priority?: 'high' | 'normal'
  /** 自定义配置 */
  custom?: {
    /** 是否是外部请求，如果是则跳过内部请求拦截器 */
    isOutRequest?: boolean
  }
} & IUniUploadFileOptions // 添加uni.uploadFile参数类型

// 请求基准地址
const baseUrl = getEnvBaseUrl()

// 拦截器配置
const httpInterceptor = {
  // 拦截前触发
  invoke(options: CustomRequestOptions) {
    // 如果是外部请求，跳过内部请求的处理
    if (options.custom?.isOutRequest) {
      return
    }

    // 接口请求支持通过 query 参数配置 queryString
    if (options.query) {
      const queryStr = qs.stringify(options.query)
      if (options.url.includes('?')) {
        options.url += `&${queryStr}`
      } else {
        options.url += `?${queryStr}`
      }
    }
    // 非 http 开头需拼接地址
    if (!options.url.startsWith('http')) {
      // 所有平台都需要拼接 baseUrl（H5 通过代理转发）
      options.url = baseUrl + options.url
    }
    // 1. 请求超时
    options.timeout = 30000 // 10s
    // 2. （可选）添加小程序端请求头标识
    options.header = {
      platform, // 可选，与 uniapp 定义的平台一致，告诉后台来源
      ...options.header,
    }
    // 3. 添加 token 请求头标识
    const userStore = useUserStore()
    const { token } = userStore.userInfo as unknown as IUserInfo
    if (token) {
      options.header.Authorization = `Bearer ${token}`
    }
    options.header['X-App-Environment'] =
      process.env.VITE_MODE === 'production' ? 'production' : 'test'
    if (version != null) options.header['X-App-Version'] = version

    // 4. 添加链路追踪请求头（W3C Trace Context）
    options.header.traceparent = traceContext.buildTraceparent()
    options.header['X-Request-Id'] = traceContext.getNewRequestId()
  },
  // 响应成功后从响应头提取 traceparent，更新 trace 上下文
  success(res: any, options: any) {
    // console.log(
    //   '[Trace] response callback:',
    //   Date.now(),
    //   res?.header?.['X-Request-Id'],
    //   '---url:',
    //   options.url,
    // )
    if (res?.header) {
      // 响应头可能大小写不一致，兼容处理
      const traceparent = res.header.traceparent || res.header.Traceparent
      if (traceparent) {
        traceContext.updateFromResponse(traceparent)
      }
    }
  },
}

/**
 * 请求拦截器
 */
export const requestInterceptor = {
  install() {
    // 拦截 request 请求
    uni.addInterceptor('request', httpInterceptor)
    // 拦截 uploadFile 文件上传
    // uni.addInterceptor('uploadFile', httpInterceptor)
  },
}

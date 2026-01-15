import { getNewsHostUrl } from '@/utils'
import qs from 'qs'
import type { CustomRequestOptions } from '@/interceptors/request'

const newsHostUrl = getNewsHostUrl()

/**
 * 外部请求函数
 * 用于请求第三方API，不经过内部请求拦截器处理
 */
export const httpOut = <T>(options: {
  url: string
  method?: 'GET' | 'POST'
  query?: Record<string, any>
  data?: any
  hideErrorToast?: boolean
}) => {
  // 1. 处理 URL
  let finalUrl = options.url
  if (!finalUrl.startsWith('http')) {
    finalUrl = newsHostUrl + finalUrl
  }

  // 2. 处理查询参数
  if (options.query) {
    const queryStr = qs.stringify(options.query)
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryStr
  }

  // 3. 构造请求配置
  const requestOptions: CustomRequestOptions = {
    url: finalUrl,
    data: options.data,
    method: options.method || 'GET',
    header: {}, // 清空请求头
    timeout: 10000,
    custom: {
      isOutRequest: true, // 标记为外部请求，跳过内部请求拦截器
    },
  }

  return new Promise<T>((resolve, reject) => {
    uni.request({
      ...requestOptions,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          !options.hideErrorToast &&
            uni.showToast({
              icon: 'none',
              title: '请求失败',
            })
          reject(res)
        }
      },
      fail(err) {
        !options.hideErrorToast &&
          uni.showToast({
            icon: 'none',
            title: '网络错误，请稍后再试',
          })
        reject(err)
      },
    })
  })
}

/**
 * GET请求
 * @param url 请求地址
 * @param query 查询参数
 */
export const httpGet = <T>(url: string, query?: Record<string, any>) => {
  return httpOut<T>({
    url,
    query,
    method: 'GET',
  })
}

/**
 * POST请求
 * @param url 请求地址
 * @param data POST数据
 * @param query 查询参数
 */
export const httpPost = <T>(
  url: string,
  data?: Record<string, any>,
  query?: Record<string, any>,
) => {
  return httpOut<T>({
    url,
    query,
    data,
    method: 'POST',
  })
}

// 导出便捷方法
httpOut.get = httpGet
httpOut.post = httpPost

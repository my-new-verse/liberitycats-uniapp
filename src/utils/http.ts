import { CustomRequestOptions } from '@/interceptors/request'
import { getServerI18nKey } from './i18n'
import { useUserStore } from '@/store/user'
import { t } from '@/locale/index'

/**
 * 异步并发控制队列
 * - 限制同时进行的请求数量，避免瞬时大量请求导致移动端网络拥塞
 * - 支持 priority 分级：high 优先级插队执行
 */
class AsyncQueue {
  private running = 0
  private concurrency = 6
  private highQueue: Array<() => void> = []
  private normalQueue: Array<() => void> = []

  enqueue<T>(fn: () => Promise<T>, priority: 'high' | 'normal' = 'normal'): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = async () => {
        this.running++
        try {
          resolve(await fn())
        } catch (e) {
          reject(e)
        } finally {
          this.running--
          this.next()
        }
      }

      if (priority === 'high') {
        this.highQueue.push(task)
      } else {
        this.normalQueue.push(task)
      }
      this.next()
    })
  }

  /** 高优队列优先，然后普通队列 */
  private next() {
    if (this.running >= this.concurrency) return
    const task = this.highQueue.shift() || this.normalQueue.shift()
    if (task) task()
  }
}

/** 全局请求队列，限制最大并发 6 个 */
const requestQueue = new AsyncQueue()

/** 核心请求方法：直接发起 uni.request，不进队列 */
const rawRequest = <T>(options: CustomRequestOptions): Promise<IResData<T>> => {
  const start = Date.now()
  return new Promise<IResData<T>>((resolve, reject) => {
    uni.request({
      ...options,
      timeout: options.timeout || 30000, // 默认30秒超时
      // accept:*/*，把这个设置成json，以便服务端可以识别为ajax请求
      header: {
        Accept: 'application/json',
        locale: getServerI18nKey(),
      },
      dataType: options.dataType || 'json',
      // #ifndef MP-WEIXIN
      responseType: 'json',
      // #endif
      // 响应成功
      success(res) {
        // console.log(
        //   '[Trace] http.ts success:',
        //   Date.now(),
        //   options.url,
        //   res?.header?.['X-Request-Id'],
        // )
        // 状态码 2xx，参考 axios 的设计
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 2.1 提取核心数据 res.data
          resolve(res.data as IResData<T>)
        } else if (res.statusCode === 401) {
          // 401错误  -> 清理用户信息，跳转到登录页
          const userStore = useUserStore()
          userStore.clearUserInfo()
          // uni.navigateTo({ url: '/pages/login/login' })
          console.log('401错误dddddddddddddddddddddd,清空登录')
          reject(res)
        } else {
          // 其他错误 -> 根据后端错误信息轻提示
          !options.hideErrorToast &&
            uni.showToast({
              icon: 'none',
              title:
                (res.data as IResData<T>).msg ||
                (res.data as IResData<T>).message ||
                t('common.request.error'),
            })
          reject(res)
        }
      },
      // 响应失败
      fail(err) {
        const duration = Date.now() - start
        console.error(`[Trace][${options.url}]    ${Date.now()}. 接口耗时：${duration}ms`)
        let errorMsg = ''
        if (err.errMsg.indexOf('timeout')) {
          errorMsg = t('common.request.network.slow')
        } else if (err.errMsg.indexOf('abort') !== -1) {
          errorMsg = t('common.request.cancelled')
        } else {
          errorMsg = t('common.request.network.error')
        }
        // 通过 uni.getNetworkType 判断是否为断网
        uni.getNetworkType({
          success: (res) => {
            const isDisconnected = res.networkType === 'none'
            uni.showToast({
              icon: 'none',
              title: isDisconnected ? t('common.request.network.disconnected') : errorMsg,
            })
          },
          fail: () => {
            // getNetworkType 失败时回退到原提示
            uni.showToast({
              icon: 'none',
              title: errorMsg,
            })
          },
        })
        reject(err)
      },
    })
  })
}

export const http = <T>(options: CustomRequestOptions) => {
  // 跳过排队：直接发起请求（适用于需要立即响应的场景，如埋点上报）
  if (options.skipQueue) {
    return rawRequest<T>(options)
  }

  // 进入并发队列
  return requestQueue.enqueue(() => rawRequest<T>(options), options.priority || 'normal')
}

/**
 * GET 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @returns
 */
export const httpGet = <T>(
  url: string,
  query?: Record<string, any>,
  options?: Partial<CustomRequestOptions>,
) => {
  return http<T>({
    url,
    query,
    method: 'GET',
    ...options,
  })
}

/**
 * POST 请求
 * @param url 后台地址
 * @param data 请求body参数
 * @param query 请求query参数，post请求也支持query，很多微信接口都需要
 * @returns
 */
export const httpPost = <T>(
  url: string,
  data?: Record<string, any>,
  query?: Record<string, any>,
  options?: Partial<CustomRequestOptions>,
) => {
  return http<T>({
    url,
    query,
    data,
    method: 'POST',
    ...options,
  })
}

http.get = httpGet
http.post = httpPost

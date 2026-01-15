import { CustomRequestOptions } from '@/interceptors/request'
import { getServerI18nKey } from './i18n'
import { useUserStore } from '@/store/user'
import { t } from '@/locale/index'

export const http = <T>(options: CustomRequestOptions) => {
  // 1. 返回 Promise 对象
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
              title: (res.data as IResData<T>).msg || t('common.request.error'),
            })
          reject(res)
        }
      },
      // 响应失败
      fail(err) {
        console.error('uni.request fail->', err, 'options==========', options)
        uni.showToast({
          icon: 'none',
          title: t('common.request.network.error'),
        })
        reject(err)
      },
    })
  })
}

/**
 * GET 请求
 * @param url 后台地址
 * @param query 请求query参数
 * @returns
 */
export const httpGet = <T>(url: string, query?: Record<string, any>) => {
  return http<T>({
    url,
    query,
    method: 'GET',
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
) => {
  return http<T>({
    url,
    query,
    data,
    method: 'POST',
  })
}

http.get = httpGet
http.post = httpPost

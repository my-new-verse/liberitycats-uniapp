import pagesConfig from '@/pages.json'
import { isMp } from './platform'
import { t } from '@/locale'
import CryptoJS from 'crypto-js'

const { pages = [], subPackages = [], tabBar } = pagesConfig

let navigationLocked = false
let navigationUnlockTimer: ReturnType<typeof setTimeout> | null = null
type NavigationLifecycleCallbacks = {
  success: () => void
  fail: () => void
  complete: () => void
}

const unlockNavigation = () => {
  navigationLocked = false
  if (navigationUnlockTimer) {
    clearTimeout(navigationUnlockTimer)
    navigationUnlockTimer = null
  }
}

const scheduleNavigationUnlock = (delay = 800) => {
  if (navigationUnlockTimer) {
    clearTimeout(navigationUnlockTimer)
  }
  navigationUnlockTimer = setTimeout(() => {
    unlockNavigation()
  }, delay)
}

const runNavigationOnce = (navigate: (callbacks: NavigationLifecycleCallbacks) => void) => {
  if (navigationLocked) return false

  navigationLocked = true
  scheduleNavigationUnlock()

  navigate({
    success: () => {
      scheduleNavigationUnlock()
    },
    fail: () => {
      unlockNavigation()
    },
    complete: () => {
      scheduleNavigationUnlock(300)
    },
  })

  return true
}

const getLastPage = () => {
  // getCurrentPages() 至少有1个元素，所以不再额外判断
  // const lastPage = getCurrentPages().at(-1)
  // 上面那个在低版本安卓中打包回报错，所以改用下面这个【虽然我加了src/interceptions/prototype.ts，但依然报错】
  const pages = getCurrentPages()
  return pages[pages.length - 1]
}

/** 判断当前页面是否是tabbar页  */
export const getIsTabbar = () => {
  if (!tabBar) {
    return false
  }
  if (!tabBar.list.length) {
    // 通常有tabBar的话，list不能有空，且至少有2个元素，这里其实不用处理
    return false
  }
  const lastPage = getLastPage()
  const currPath = lastPage.route
  return !!tabBar.list.find((e) => e.pagePath === currPath)
}

/**
 * 获取当前页面路由的 path 路径和 redirectPath 路径
 * path 如 ‘/pages/login/index’
 * redirectPath 如 ‘/pages/demo/base/route-interceptor’
 */
export const currRoute = () => {
  const lastPage = getLastPage()
  const currRoute = (lastPage as any).$page
  // console.log('lastPage.$page:', currRoute)
  // console.log('lastPage.$page.fullpath:', currRoute.fullPath)
  // console.log('lastPage.$page.options:', currRoute.options)
  // console.log('lastPage.options:', (lastPage as any).options)
  // 经过多端测试，只有 fullPath 靠谱，其他都不靠谱
  const { fullPath } = currRoute as { fullPath: string }
  // console.log(fullPath)
  // eg: /pages/login/index?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor (小程序)
  // eg: /pages/login/index?redirect=%2Fpages%2Froute-interceptor%2Findex%3Fname%3Dfeige%26age%3D30(h5)
  return getUrlObj(fullPath)
}

const ensureDecodeURIComponent = (url: string) => {
  if (url.startsWith('%')) {
    return ensureDecodeURIComponent(decodeURIComponent(url))
  }
  return url
}
/**
 * 解析 url 得到 path 和 query
 * 比如输入url: /pages/login/index?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor
 * 输出: {path: /pages/login/index, query: {redirect: /pages/demo/base/route-interceptor}}
 */
export const getUrlObj = (url: string) => {
  const [path, queryStr] = url.split('?')
  // console.log(path, queryStr)

  if (!queryStr) {
    return {
      path,
      query: {},
    }
  }
  const query: Record<string, string> = {}
  queryStr.split('&').forEach((item) => {
    const [key, value] = item.split('=')
    // console.log(key, value)
    query[key] = ensureDecodeURIComponent(value) // 这里需要统一 decodeURIComponent 一下，可以兼容h5和微信y
  })
  return { path, query }
}
/**
 * 得到所有的需要登录的pages，包括主包和分包的
 * 这里设计得通用一点，可以传递key作为判断依据，默认是 needLogin, 与 route-block 配对使用
 * 如果没有传 key，则表示所有的pages，如果传递了 key, 则表示通过 key 过滤
 */
export const getAllPages = (key = 'needLogin') => {
  // 这里处理主包
  const mainPages = [
    ...pages
      .filter((page) => !key || page[key])
      .map((page) => ({
        ...page,
        path: `/${page.path}`,
      })),
  ]
  // 这里处理分包
  const subPages: any[] = []
  subPackages.forEach((subPageObj) => {
    // console.log(subPageObj)
    const { root } = subPageObj

    subPageObj.pages
      .filter((page) => !key || page[key])
      .forEach((page: { path: string } & Record<string, any>) => {
        subPages.push({
          ...page,
          path: `/${root}/${page.path}`,
        })
      })
  })
  const result = [...mainPages, ...subPages]
  // console.log(`getAllPages by ${key} result: `, result)
  return result
}

/**
 * 得到所有的需要登录的pages，包括主包和分包的
 * 只得到 path 数组
 */
export const getNeedLoginPages = (): string[] => getAllPages('needLogin').map((page) => page.path)

/**
 * 得到所有的需要登录的pages，包括主包和分包的
 * 只得到 path 数组
 */
export const needLoginPages: string[] = getAllPages('needLogin').map((page) => page.path)

/**
 * 根据微信小程序当前环境，判断应该获取的BaseUrl
 */
export const getEnvBaseUrl = () => {
  // 请求基准地址
  let baseUrl = import.meta.env.VITE_SERVER_BASEURL

  // 小程序端环境区分
  if (isMp) {
    const {
      miniProgram: { envVersion },
    } = uni.getAccountInfoSync()

    switch (envVersion) {
      case 'develop':
        baseUrl = 'http://demo.easyadmin.cn/api'
        break
      case 'trial':
        baseUrl = 'https://ukw0y1.laf.run'
        break
      case 'release':
        baseUrl = 'https://ukw0y1.laf.run'
        break
    }
  }

  return baseUrl
}

/**
 * 根据微信小程序当前环境，判断应该获取的UPLOAD_BASEURL
 */
export const getEnvBaseUploadUrl = () => {
  // 请求基准地址
  let baseUploadUrl = import.meta.env.VITE_UPLOAD_BASEURL

  // 小程序端环境区分
  if (isMp) {
    const {
      miniProgram: { envVersion },
    } = uni.getAccountInfoSync()

    switch (envVersion) {
      case 'develop':
        baseUploadUrl = 'https://ukw0y1.laf.run/upload'
        break
      case 'trial':
        baseUploadUrl = 'https://ukw0y1.laf.run/upload'
        break
      case 'release':
        baseUploadUrl = 'https://ukw0y1.laf.run/upload'
        break
    }
  }

  return baseUploadUrl
}

export const getNewsHostUrl = () => {
  return import.meta.env.VITE_NEWS_HOST_URL
}

/**
 * 跳转到指定的页面
 * @param url 页面地址
 */
export const toUrl = (url: string, needLogin?: boolean, redirect?: boolean) => {
  const hasToken = uni.getStorageSync('hasToken')
  if (needLogin) {
    if (hasToken) {
      if (redirect) {
        uni.redirectTo({
          url,
        })
      } else {
        uni.navigateTo({
          url,
        })
      }
    } else {
      // uni.showToast({
      //   title: t('common.toast.pleaseLogin'),
      //   icon: 'none',
      // })
      // uni.setStorageSync('loginUrl', url);//这里跳转实在不好处理，先不管
      uni.navigateTo({
        url: '/pages/cats/login/login',
      })
    }
  } else {
    if (redirect) {
      uni.redirectTo({
        url,
      })
    } else {
      uni.navigateTo({
        url,
      })
    }
  }
}
export const toUrlOnce = (url: string, needLogin?: boolean, redirect?: boolean) => {
  const hasToken = uni.getStorageSync('hasToken')
  if (needLogin) {
    if (hasToken) {
      if (redirect) {
        runNavigationOnce((callbacks) => {
          uni.redirectTo({
            url,
            ...callbacks,
          })
        })
      } else {
        runNavigationOnce((callbacks) => {
          uni.navigateTo({
            url,
            ...callbacks,
          })
        })
      }
    } else {
      runNavigationOnce((callbacks) => {
        uni.navigateTo({
          url: '/pages/cats/login/login',
          ...callbacks,
        })
      })
    }
  } else {
    if (redirect) {
      runNavigationOnce((callbacks) => {
        uni.redirectTo({
          url,
          ...callbacks,
        })
      })
    } else {
      runNavigationOnce((callbacks) => {
        uni.navigateTo({
          url,
          ...callbacks,
        })
      })
    }
  }
}

export const navigateToOnce = (url: string) => {
  return runNavigationOnce((callbacks) => {
    uni.navigateTo({
      url,
      ...callbacks,
    })
  })
}

export const todoMsg = () => {
  uni.showToast({
    title: 'Upcoming release,stay tuned',
    icon: 'none',
  })
}

export const navigateBack = () => {
  uni.navigateBack({ delta: 1 })
}

export const getImageUrl = (path: string, useCache?: boolean) => {
  if (!path) return ''
  let url = ''
  // 如果是 gif 格式，去掉 ? 及其后参数
  if (path.match(/\.gif($|\?)/i)) {
    // path = path.split('?')[0] + '?x-oss-process=image/resize,m_lfit,w_200,h_200,limit_1/format,gif'
    path = path.split('?')[0] + '?x-oss-process=image/resize,w_200,h_200,m_fill/format,gif'
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    url = path
  } else {
    url = `${import.meta.env.VITE_IMAGE_HOST}${path}`
  }
  if (useCache) {
    const md5Url = CryptoJS.MD5(url).toString()
    url = getImageCache(url, md5Url)
    // console.log('getImageUrl:', url)
  }
  return url
}
// 解决merge
export const getStickerUrl = (path: string, useCache?: boolean) => {
  if (!path) return ''
  const systemConfig = uni.getStorageSync('systemConfigV2')?.config || {}
  const systemInfo = uni.getSystemInfoSync()
  const isIOS =
    systemInfo.platform?.toLowerCase() === 'ios' || systemInfo.osName?.toLowerCase() === 'ios'
  let url = ''
  // 如果是 gif 格式，去掉 ? 及其后参数
  if (!isIOS) {
    if (path.match(/\.gif($|\?)/i)) {
      // path = path.split('?')[0] + '?x-oss-process=image/resize,m_lfit,w_200,h_200,limit_1/format,gif'
      path = path.split('?')[0] + '?x-oss-process=image/resize,w_200,h_200,m_fill/format,gif'
    }
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    url = path
  } else {
    url = `${import.meta.env.VITE_IMAGE_HOST}${path}`
  }
  if (useCache) {
    const md5Url = CryptoJS.MD5(url).toString()
    url = getImageCache(url, md5Url)
    // console.log('getImageUrl:', url)
  }
  return url
}

const getImageCache = (filePath, fileMd5) => {
  // #ifndef H5
  const storageKey = 'IMAGE_CACHE_INFO_' + fileMd5
  const cacheFileInfo = uni.getStorageSync(storageKey)
  if (cacheFileInfo) {
    // 有缓存，直接返回缓存路径
    // console.log('getImageCache:', cacheFileInfo)
    return cacheFileInfo
  } else {
    // 无缓存，直接返回原始 url，并异步下载缓存
    uni.downloadFile({
      url: filePath,
      success: (res) => {
        // console.log('下载图片:', filePath,res)
        if (res.statusCode === 200) {
          uni.saveFile({
            tempFilePath: res.tempFilePath,
            success: function (res2) {
              // console.log('saveFile:', res2)
              uni.setStorageSync(storageKey, res2.savedFilePath)
            },
            fail: function (err) {
              console.log('saveFile fail:', err)
            },
          })
        }
      },
    })
    return filePath
  }
  // #endif
}

export const getI18nNameMap = () => {
  return {
    'zh-Hant': '繁體中文',
    'zh-Hans': '简体中文',
    en: 'English',
    ja: '日本語',
  }
}

export const formatTime = (time: number | string, format = 'YYYY-M-D H:i:s') => {
  if (typeof time === 'string') {
    time = Date.parse(time) / 1000
  }
  const date = new Date(time * 1000)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return format
    .replace('YYYY', year.toString())
    .replace('M', month.toString().padStart(2, '0'))
    .replace('D', day.toString().padStart(2, '0'))
    .replace('H', hour.toString().padStart(2, '0'))
    .replace('i', minute.toString().padStart(2, '0'))
    .replace('s', second.toString().padStart(2, '0'))
}

/**
 * 多语言智能时间格式化
 * @param time 时间字符串或时间戳
 * @param locale 语言（可选，默认自动用 t()）
 * @returns string
 */
export const formatRelativeTime = (
  time: string | number | null | undefined,
  timeZone?: string, // time参数的时区，如 'Asia/Shanghai'
) => {
  if (!time) return ''
  // 1. 解析 timeZone，默认为 Asia/Shanghai
  timeZone = timeZone || uni.getStorageSync('timeZone') || 'Asia/Shanghai'

  // 2. 解析 time 为 Date 对象（确保字符串带时区偏移，避免 iOS 解析错误）
  let date: Date
  if (typeof time === 'number' && time < 1e12) {
    time = time * 1000
  }
  if (typeof time === 'string') {
    let str = time.trim()
    // 'YYYY-MM-DD HH:mm:ss' => 'YYYY-MM-DDTHH:mm:ss+08:00'
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)) {
      str = str.replace(' ', 'T') + getTimeZoneOffsetStr(timeZone)
      date = new Date(str)
    } else {
      str = str.replace(/-/g, '/')
      date = new Date(str)
    }
  } else {
    date = new Date(time)
  }
  if (isNaN(date.getTime())) return '-'

  // 3. 获取当前时区下的“现在”时间
  // 用 Intl.DateTimeFormat 拆分出 timeZone 下的当前年月日时分秒
  let nowInTz: Date
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    const getDateParts = (d: Date, tz: string) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
        .formatToParts(d)
        .reduce(
          (acc, cur) => {
            if (cur.type !== 'literal') acc[cur.type] = cur.value
            return acc
          },
          {} as Record<string, string>,
        )
      return parts
    }
    const now = new Date()
    const nowParts = getDateParts(now, timeZone)
    nowInTz = new Date(
      `${nowParts.year}-${nowParts.month}-${nowParts.day}T${nowParts.hour}:${nowParts.minute}:${nowParts.second}${getTimeZoneOffsetStr(timeZone)}`,
    )
  } else {
    // Intl 不可用时，直接用本地时间
    nowInTz = new Date()
  }

  // 4. 计算时间差（以同一时区的时间戳为准）
  const diffSec = Math.floor((nowInTz.getTime() - date.getTime()) / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  // 5. 格式化输出
  const Y = date.getFullYear().toString()
  const M = (date.getMonth() + 1).toString().padStart(2, '0')
  const D = date.getDate().toString().padStart(2, '0')
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  const nowY = nowInTz.getFullYear()

  // 判断是否昨天（同一时区下）
  const yesterday = new Date(nowInTz)
  yesterday.setDate(nowInTz.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()

  if (diffSec < 60) {
    return t('time.justNow')
  } else if (diffMin < 3) {
    return t('time.justNow')
  } else if (diffMin < 5) {
    return t('time.minAgo', { n: 5 })
  } else if (diffMin < 10) {
    return t('time.minAgo', { n: 10 })
  } else if (diffMin < 20) {
    return t('time.minAgo', { n: 20 })
  } else if (diffMin < 30) {
    return t('time.minAgo', { n: 30 })
  } else if (diffMin < 60) {
    return t('time.hourAgo', { n: 1 })
  } else if (diffHour < 24) {
    return t('time.hourAgo', { n: diffHour })
  } else if (isYesterday) {
    return t('time.yesterday', { h, m })
  } else if (date.getFullYear() === nowY) {
    return `${M}-${D} ${h}:${m}`
  } else {
    return `${Y}-${M}-${D} ${h}:${m}`
  }
}

// 辅助函数：根据时区字符串返回+08:00/-05:00等
function getTimeZoneOffsetStr(timeZone: string) {
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') {
    // Intl 不可用时，直接返回东八区
    return '+08:00'
  }
  try {
    const now = new Date()
    const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const tz = new Date(now.toLocaleString('en-US', { timeZone }))
    const offset = (tz.getTime() - utc.getTime()) / 60000
    const sign = offset >= 0 ? '+' : '-'
    const absOffset = Math.abs(offset)
    const hours = Math.floor(absOffset / 60)
    const minutes = absOffset % 60
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  } catch {
    return '+08:00'
  }
}

/**
 * 处理富文本内容，确保图片宽度不超过容器
 * @param content 富文本内容
 */
export const processRichText = (content: string) => {
  if (!content) return ''

  // 处理图片标签，移除内联宽高并添加响应式样式
  content = content.replace(/<img([^>]*)>/gi, (match, attrs) => {
    // 1. 移除内联的width和height属性
    let processedAttrs = attrs
      .replace(/\s(width|height)=["'][^"']*["']/gi, '') // 移除width/height属性
      .replace(/\sstyle=(["'])([^"']*?)\1/gi, '') // 完全移除原有的style属性

    // 2. 添加响应式样式
    processedAttrs += ` style="max-width:100%;height:auto;display:block;margin:10px 0;"`

    // 3. 确保标签正确闭合
    return `<img${processedAttrs}>`
  })

  return content
}

/**
 * 处理富文本点击事件
 * @param e 点击事件对象
 * @param content 可选的富文本内容，用于图片预览
 */
export function handleRichTextClick(e: any, content: string = '') {
  const { node } = e.detail || {}

  // 处理链接点击
  if (node?.name === 'a' && node?.attrs?.href) {
    handleLinkClick(node.attrs.href)
    return
  }

  // 处理图片点击
  if (node?.name === 'img' && node?.attrs?.src) {
    handleImageClick(node.attrs.src, content)
  }
}

/**
 * 处理链接点击
 * @param href 链接地址
 */
function handleLinkClick(href: string) {
  if (!href) return

  const url = href.startsWith('http')
    ? `/pages/cats/webview/webview?url=${encodeURIComponent(href)}`
    : href

  uni.navigateTo({ url })
}

/**
 * 处理图片点击
 * @param currentSrc 当前点击的图片地址
 * @param content 富文本内容
 */
function handleImageClick(currentSrc: string, content: string) {
  if (!currentSrc) return

  const imgUrls = extractImageUrls(content)
  if (imgUrls.length === 0) return

  const currentIndex = Math.max(0, imgUrls.indexOf(currentSrc))

  uni.previewImage({
    current: imgUrls[currentIndex],
    urls: imgUrls,
    success: () => console.log('预览图片成功'),
    fail: (err: any) => console.error('预览图片失败', err),
  })
}

/**
 * 多张图片预览
 * @param images 当前图片列表
 * @param needDealImg 是否需要用getImageUrl处理图片
 */
export const handlePreview = (images: string[], currentIndex: number = 0, needDealImg = true) => {
  // 1. 生成完整图片URL数组
  const urls: string[] = needDealImg ? images.map((item: string) => getImageUrl(item)) : images
  // 2. 调用 uni-app 原生预览（支持左右滑动）
  uni.previewImage({
    current: currentIndex,
    urls, // 所有图片数组
    indicator: 'number', // 显示页码
    loop: true, // 循环滑动
  })
}

/**
 * 从富文本中提取所有图片URL
 * @param content 富文本内容
 * @returns 图片URL数组
 */
function extractImageUrls(content: string): string[] {
  if (!content) return []

  const imgUrls: string[] = []
  const imgRegex = /<img[^>]+src=["']?([^>"']+)["']?[^>]*>/gi

  let match
  while ((match = imgRegex.exec(content)) !== null) {
    const url = match[1]?.trim()
    if (url && !imgUrls.includes(url)) {
      imgUrls.push(url)
    }
  }

  return imgUrls
}

export const formatWalletAddress = (address: string, prefixLength = 6, suffixLength = 4) => {
  if (!address || typeof address !== 'string') return ''
  const addr = address.trim()
  if (addr.length <= prefixLength + suffixLength) return addr
  return `${addr.slice(0, prefixLength)}...${addr.slice(-suffixLength)}`
}

export const openOkx = (dappUrl: string) => {
  const okxUrl = `okx://wallet/dapp/url?dappUrl=${encodeURIComponent(dappUrl)}`
  const webUrl =
    'https://www.okx.com/download?deeplink=' +
    encodeURIComponent('okx://wallet/dapp/url?dappUrl=' + encodeURIComponent(dappUrl))

  // #ifdef APP-PLUS
  if (
    plus.runtime.isApplicationExist({
      pname: 'com.okinc.okex.gp',
      action: 'okx://',
    })
  ) {
    console.log('欧易已安装,可以直接打开')
    plus.runtime.openURL(okxUrl, function (res) {
      console.log('plus.runtime.openURL', res)
    })
  } else {
    console.log('欧易未安装，通过H5打开')
    plus.runtime.openURL(webUrl, function (res) {
      console.log('plus.runtime.openURL', res)
    })
  }
  // #endif

  // #ifndef APP-PLUS
  window.open(dappUrl, '_blank')
  // #endif
}

export const openUrl = (url: string) => {
  // #ifdef APP-PLUS
  plus.runtime.openURL(url, function (res) {
    console.log('plus.runtime.openURL', res)
  })
  // #endif
  // #ifndef APP-PLUS
  window.open(url, '_blank')
  // #endif
}

export const formatNickname = (nickname: string | null, length = 14) => {
  if (!nickname) return ''

  // 以太坊地址（快速判断）
  if (nickname.length === 42 && nickname.startsWith('0x')) {
    const hex = nickname.slice(2)
    if (/^[a-fA-F0-9]{40}$/.test(hex)) {
      return `${nickname.slice(0, 4)}...${nickname.slice(-6)}`
    }
  }

  // 邮箱（快速判断，避免重型正则）
  const at = nickname.indexOf('@')
  if (at > 0) {
    const dot = nickname.lastIndexOf('.')
    if (dot > at + 1 && dot < nickname.length - 1) {
      const tld = nickname.slice(dot + 1)
      const domainNoTld = nickname.slice(at + 1, dot)
      const available = length - (tld.length + 1 + 3) // 预留 @ 和 ...
      if (available > 0) {
        const prefixLen = Math.floor(available / 2)
        const domainLen = available - prefixLen
        return `${nickname.slice(0, prefixLen)}...@${domainNoTld.slice(0, domainLen)}.${tld}`
      }
      return `...@${tld}`
    }
  }

  // 通用场景：按显示宽度截断（中日韩/表情=2，其他=1），一次遍历，避免两次循环
  let width = 0
  let out = ''
  for (const ch of nickname) {
    const code = ch.codePointAt(0) as number
    // CJK Unified Ideographs & Extensions
    const isCJK =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df) ||
      (code >= 0x2a700 && code <= 0x2b73f) ||
      (code >= 0x2b740 && code <= 0x2b81f) ||
      (code >= 0x2b820 && code <= 0x2ceaf)
    // 常见 Emoji 区间（近似处理，避免引入第三方库）
    const isEmoji = (code >= 0x1f300 && code <= 0x1faff) || (code >= 0x1f900 && code <= 0x1f9ff)

    const w = isCJK || isEmoji ? 2 : 1
    if (width + w > length) break
    out += ch
    width += w
  }
  return out.length === nickname.length ? nickname : out + '...'
}

export const formatNickname2 = (nickname: string | null, length = 14) => {
  if (!nickname) return ''
  // 如果nickname >=14 则进行处理，如果判断是邮箱，则取@之前的部分判断是否>=14,如果是以太坊地址，则取前4****后6位，否则截取10位显示省略号
  const nicknameLength = nickname.length
  if (nicknameLength <= length) {
    // 如果昵称长度小于等于14，直接返回
    return nickname
  }

  // 如果包含汉字，每个汉字算2个字符
  const hasChinese = /[\u4e00-\u9fa5]/.test(nickname)
  if (hasChinese) {
    return `${nickname.slice(0, Math.floor(length / 2))}...` // 取前10位，加上...
  }

  // 其他情况
  return `${nickname.slice(0, length)}...` // 取前10位，加上...
}

// 跳转到广告页面
export const toAdUrl = (url: string, needLogin?: boolean) => {
  if (!url) return ''
  if (needLogin) {
    const hasToken = uni.getStorageSync('hasToken')
    if (!hasToken) {
      // uni.showToast({
      //   title: t('common.toast.pleaseLogin'),
      //   icon: 'none',
      // })
      uni.navigateTo({
        url: '/pages/cats/login/login',
      })
      return
    }
  }
  // 判断URL是否是/pages/cats的本地URL，如果是，则使用uni.navigateTo
  if (url.startsWith('/pages/cats')) {
    uni.navigateTo({
      url,
    })
  } else if (url.startsWith('http://') || url.startsWith('https://')) {
    uni.navigateTo({
      url: '/pages/cats/webview/webview?url=' + encodeURIComponent(url),
    })
  }
  // 在webview打开？
}

export const calculateLength = (str) => {
  let length = 0
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    // 中文字符范围：\u4e00-\u9fa5
    if (charCode >= 0x4e00 && charCode <= 0x9fa5) {
      length += 2
    } else {
      length += 1
    }
  }
  return length
}

export const shareToSystem = (url: string) => {
  console.log('shareToSystem', url)
  console.log('platform:', uni.getSystemInfoSync().platform)
  uni.shareWithSystem({
    summary: 'LibertyCats',
    href: 'https://uniapp.dcloud.io',
    success() {
      console.log('shareWithSystem success')
    },
    fail(e) {
      console.log('shareWithSystem fail', JSON.stringify(e))
    },
  })
}

/**
 * 格式化数字显示，小数点后为0则不显示小数位，否则保留指定的小数位数
 *
 * @param num 数字或字符串
 * @param digits 小数位数，默认2位
 * @returns
 */
export const formatNumber = (num: number | string, digits = 2) => {
  if (typeof num === 'string') {
    num = parseFloat(num)
  }
  if (isNaN(num)) return '0'

  // 当 digits 为 0 时，直接返回整数部分
  if (digits === 0) {
    return Math.round(num).toString()
  }

  // 保留指定位数的小数
  let fixedNum = num.toFixed(digits)
  // 去除多余的0和小数点
  fixedNum = fixedNum.replace(/\.?0+$/, '')
  return fixedNum
}

/**
 * 获取服务器开关状态
 * @param key
 * @returns
 */
export const getServerOnOff = (key: string, platformKey?: string, getValue?: boolean) => {
  const systemConfig = uni.getStorageSync('systemConfigV2')?.config || {}
  const systemInfo = uni.getSystemInfoSync()
  const isIOS =
    systemInfo.platform?.toLowerCase() === 'ios' || systemInfo.osName?.toLowerCase() === 'ios'
  const platformKey2 = platformKey || (isIOS ? 'ios' : 'android')
  // console.log('platformKey:', platformKey2, systemInfo)
  return getValue
    ? systemConfig?.[platformKey2]?.[key]
    : systemConfig?.[platformKey2]?.[key] !== '0'
}
export const getChatImageUrl = (
  path: string,
  width: number,
  height: number,
  useCache?: boolean,
) => {
  if (!path) return ''
  let url = ''
  const imageExtRegex = /\.(jpg|jpeg|png|webp)($|\?)/i
  const matchResult = path.match(imageExtRegex)
  if (matchResult) {
    const ext = matchResult[1].toLowerCase()

    // 4. 拼接新的 OSS 处理 URL，format 替换为对应的后缀
    path = `${path.split('?')[0]}?x-oss-process=image/resize,w_${Math.trunc(width / 2)},h_${Math.trunc(height / 2)},m_fill/format,${ext}`
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    url = path
  } else {
    url = `${import.meta.env.VITE_IMAGE_HOST}${path}`
  }
  if (useCache) {
    const md5Url = CryptoJS.MD5(url).toString()
    url = getImageCache(url, md5Url)
    // console.log('getImageUrl:', url)
  }
  return url
}

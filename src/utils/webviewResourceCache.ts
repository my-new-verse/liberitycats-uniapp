/**
 * WebView 资源离线缓存
 *
 * 核心思路：
 * 1. 按需下载：用户点击游戏入口后，用 plus.downloader.createDownload 将 WebView
 *    所需的静态资源直接下载到 _doc/webview_cache/
 * 2. 拦截返回：WebView 发出资源请求时，用 overrideResourceRequest 拦截，
 *    若本地已有匹配的文件则直接返回本地路径，不走网络
 *
 * 文件命名规则：libertycatsgame_{ext}_{version}
 * 例：libertycatsgame_wasm_1_0_0, libertycatsgame_data_2_3_1
 * 同一 ext + version 组合不变则无需重新下载
 *
 * 注意：iOS WKWebView 不支持 overrideResourceRequest，仅 Android 有效
 */

// #ifdef APP-PLUS
// #endif

import { ref } from 'vue'
import { getGameParamsApi } from '@/service/api/game'
import type { getGameParamsApiResponse } from '@/service/api/game'
import { useResourceCacheStore } from '@/store/resourceCache'
declare const plus: any

/** iOS 预加载完成时的游戏版本，旧版布尔标记不再复用。 */
const IOS_GAME_PRELOAD_COMPLETED_KEY = 'ios_game_webview_preload_completed_version_v3'
const LEGACY_IOS_GAME_PRELOAD_COMPLETED_KEY = 'ios_game_webview_preload_completed_v2'

const getCompletedIosGameVersion = () => {
  const version = uni.getStorageSync(IOS_GAME_PRELOAD_COMPLETED_KEY)
  console.log('getCompletedIosGameVersion', version)
  return typeof version === 'string' ? version : ''
}

/** 下载进度文案，供 UI 层展示，如 ['wasm: 45%', 'data: 12%'] */
export const downloadProgressLines = ref<string[]>([])

/** Android 游戏资源整体加载状态，供游戏入口拦截使用 */
export const gameResourceLoadState = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')

/** iOS 游戏 WebView 预加载状态，由游戏的完成或失败消息更新。 */
export const iosGameResourceLoadState = ref<'idle' | 'loading' | 'ready' | 'failed'>(
  getCompletedIosGameVersion() ? 'ready' : 'idle',
)

export const hasCompletedIosGamePreload = (gameVersion?: string) => {
  console.log('hasCompletedIosGamePreload', gameVersion)
  const completedVersion = getCompletedIosGameVersion()
  return gameVersion ? completedVersion === gameVersion : !!completedVersion
}

export const markIosGamePreloadCompleted = (gameVersion: string) => {
  console.log('markIosGamePreloadCompleted', gameVersion)
  if (!gameVersion) return
  uni.setStorageSync(IOS_GAME_PRELOAD_COMPLETED_KEY, gameVersion)
  uni.removeStorageSync(LEGACY_IOS_GAME_PRELOAD_COMPLETED_KEY)
  iosGameResourceLoadState.value = 'ready'
}

export const clearIosGamePreloadCompleted = () => {
  uni.removeStorageSync(IOS_GAME_PRELOAD_COMPLETED_KEY)
  uni.removeStorageSync(LEGACY_IOS_GAME_PRELOAD_COMPLETED_KEY)
}

// ======================== 类型 ========================

/** 资源描述（调用方传入） */
export interface ResourceDescriptor {
  /** 远程下载 URL */
  url: string
  /** 文件扩展名，如 wasm / data */
  ext: string
  /** 版本号，如 1_0_0 或 2_3_1 */
  version: string
  /** 服务端提供的文件大小（字节），用于断点续传完整性校验 */
  size?: number
}

/** 缓存清单条目 */
export interface CacheEntry {
  /** 远程 URL */
  url: string
  /** 文件扩展名 */
  ext: string
  /** 版本号 */
  version: string
  /** 本地文件名（libertycatsgame_{ext}_{version}） */
  localName: string
  /** 下载状态 */
  status: 'pending' | 'downloading' | 'done' | 'error'
  /** 本地文件路径（下载完成后赋值） */
  localPath?: string
  /** 已验证的本地文件大小 */
  fileSize?: number
  /** 预期文件大小 */
  expectedSize?: number
  /** 资源物理地址变更时，下次下载前清理旧文件 */
  needsCleanDownload?: boolean
  /** 最后一次下载失败的 HTTP 状态码（用于判断是否可重试） */
  lastErrorStatusCode?: number
}

// ======================== 常量 ========================

/** 缓存根目录（App 私有目录下） */
const CACHE_DIR = '_doc/webview_cache/'
/** 文件名前缀 */
const FILE_PREFIX = 'libertycatsgame'
/** 清单存储 key */
const MANIFEST_KEY = 'webview_cache_manifest'
/** 是否已初始化标记 */
let initialized = false
/** 内存中的缓存清单："{ext}_{version}" -> CacheEntry */
let manifest: Map<string, CacheEntry> = new Map()
/** 同一 ext + version 只允许一个真实下载任务 */
const activeDownloadPromises = new Map<string, Promise<void>>()
/** 当前由游戏缓存创建的 Downloader 任务，用于 App 前后台暂停/恢复 */
const activeDownloadTasks = new Map<string, any>()
/** App 是否处于后台；后台期间不启动完整性校验中的自动重试。 */
let appInBackground = false
/** 本轮游戏版本要求的全部资源，用于下载结束后的完整性校验 */
let expectedGameResources: ResourceDescriptor[] = []

// ======================== 后台下载管理 ========================

/** 后台下载状态（响应式，供 UI 层监听） */
export const backgroundDownloadState = ref<{
  /** 是否正在下载 */
  running: boolean
  /** 资源总数 */
  total: number
  /** 已完成数 */
  completed: number
  /** 失败数 */
  failed: number
  /** 综合下载进度（0-100） */
  progress: number
}>({
  running: false,
  total: 0,
  completed: 0,
  failed: 0,
  progress: 0,
})

/** 当前后台下载的 Promise（用于防重入和等待） */
let backgroundDownloadPromise: Promise<void> | null = null
/** 获取系统平台 */
function getPlatform(): string {
  try {
    const info = uni.getSystemInfoSync()
    return (info.platform || '').toLowerCase()
  } catch {
    return ''
  }
}

// ======================== 工具方法 ========================

/** 根据 ext + version 生成本地文件名（保留 .wasm/.data 后缀） */
function buildLocalName(ext: string, version: string): string {
  return `${FILE_PREFIX}_${ext}_${version}.${ext}`
}

/** 根据 ext + version 生成 manifest key */
function buildCacheKey(ext: string, version: string): string {
  return `${ext}_${version}`
}

/** 从 URL 中提取文件扩展名（兜底，优先用调用方显式传入的 ext）
 *  不使用 new URL，兼容 App 真机环境
 */
function extractExtFromUrl(url: string): string {
  // 取路径部分：去掉 query 和 hash
  let path = url
  const qIdx = path.indexOf('?')
  if (qIdx !== -1) path = path.slice(0, qIdx)
  const hIdx = path.indexOf('#')
  if (hIdx !== -1) path = path.slice(0, hIdx)
  // 去掉协议和域名，只留路径
  // https://xxx.com/path/file.wasm?x=1 -> /path/file.wasm
  const slash3 = path.indexOf('/', path.indexOf('//') + 2)
  if (slash3 !== -1) path = path.slice(slash3)
  const dotIdx = path.lastIndexOf('.')
  if (dotIdx !== -1) return path.slice(dotIdx + 1)
  return 'bin'
}

function extractResourceSize(item: any): number | undefined {
  if (!item || typeof item === 'string') return undefined
  const size = Number(
    item.size ??
      item.file_size ??
      item.fileSize ??
      item.filesize ??
      item.content_length ??
      item.contentLength,
  )
  return Number.isFinite(size) && size > 0 ? size : undefined
}

/** 去掉临时签名参数，用于判断两个游戏是否引用同一个物理资源。 */
function getResourceIdentity(url: string): string {
  let identity = url
  const hashIndex = identity.indexOf('#')
  if (hashIndex !== -1) identity = identity.slice(0, hashIndex)
  const queryIndex = identity.indexOf('?')
  if (queryIndex !== -1) identity = identity.slice(0, queryIndex)
  return identity
}

function isSameResourceUrl(firstUrl: string, secondUrl: string): boolean {
  return getResourceIdentity(firstUrl) === getResourceIdentity(secondUrl)
}

/** JUMP 与 MATCH_THREE 引用相同资源时只保留一个下载任务。 */
function dedupeResources(resources: ResourceDescriptor[]): ResourceDescriptor[] {
  const uniqueResources = new Map<string, ResourceDescriptor>()
  resources.forEach((resource) => {
    const identity = `${getResourceIdentity(resource.url)}|${resource.ext}|${resource.version}`
    if (!uniqueResources.has(identity)) {
      uniqueResources.set(identity, resource)
    }
  })
  return Array.from(uniqueResources.values())
}

/** 确保缓存目录存在（返回 Promise，可 await） */
function ensureCacheDir(): Promise<void> {
  return new Promise((resolve) => {
    try {
      plus.io.resolveLocalFileSystemURL(
        CACHE_DIR,
        () => resolve(),
        () => {
          plus.io.resolveLocalFileSystemURL(
            '_doc/',
            (entry: any) => {
              entry.getDirectory(
                'webview_cache',
                { create: true },
                () => resolve(),
                () => resolve(),
              )
            },
            () => resolve(),
          )
        },
      )
    } catch {
      resolve()
    }
  })
}

/** 获取本地完整路径 */
function getLocalPath(localName: string): string {
  return `${CACHE_DIR}${localName}`
}

// ======================== 清单持久化 ========================

/** 将清单保存到 storage */
function saveManifest(): void {
  const obj: Record<string, CacheEntry> = {}
  manifest.forEach((v, k) => {
    obj[k] = v
  })
  uni.setStorageSync(MANIFEST_KEY, JSON.stringify(obj))
}

/** 从 storage 加载清单 */
function loadManifest(): void {
  try {
    const raw = uni.getStorageSync(MANIFEST_KEY)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, CacheEntry>
      manifest = new Map(Object.entries(obj))
    }
  } catch {
    manifest = new Map()
  }
}

// ======================== 下载 ========================

/** 下载单个资源到 App 私有目录（使用 HTML5+ Downloader） */
function getLocalFileSize(localPath: string): Promise<number | null> {
  return new Promise((resolve) => {
    plus.io.resolveLocalFileSystemURL(
      localPath,
      (fileEntry: any) => {
        fileEntry.file(
          (file: any) => resolve(Number(file?.size) || null),
          () => resolve(null),
        )
      },
      () => resolve(null),
    )
  })
}

function downloadOne(
  entry: CacheEntry,
  onProgress?: (localName: string, progress: number) => void,
): Promise<void> {
  const resourceKey = buildCacheKey(entry.ext, entry.version)
  const activePromise = activeDownloadPromises.get(resourceKey)
  if (activePromise) {
    console.log(`[WebViewCache] 复用正在下载的任务: ${resourceKey}`)
    return activePromise
  }

  const downloadPromise = new Promise<void>((resolve) => {
    entry.status = 'downloading'
    entry.lastErrorStatusCode = undefined
    saveManifest()
    const targetPath = getLocalPath(entry.localName)

    console.log(`[WebViewCache] 开始下载: ${entry.url} -> ${targetPath}`)

    const startDownload = () => {
      try {
        let callbackHandled = false

        const finishDownload = async (task: any, status: number) => {
          if (callbackHandled) return
          const pausedByApp =
            appInBackground || task.state === 5 || Date.now() < Number(task.__ignorePause999Until)
          const downloadedPath = task.filename || targetPath
          const taskTotalSize = Number(task.totalSize) || 0
          const expectedSize = entry.expectedSize || taskTotalSize
          const localFileSize = await getLocalFileSize(downloadedPath)

          const sizeMatches = expectedSize
            ? Number(localFileSize) === Number(expectedSize)
            : (status === 200 || status === 206) && !!localFileSize
          const responseSucceeded = status === 200 || status === 206 || status === 416

          if (sizeMatches && (responseSucceeded || !!expectedSize)) {
            callbackHandled = true
            activeDownloadTasks.delete(resourceKey)
            entry.status = 'done'
            entry.localPath = downloadedPath
            entry.fileSize = Number(localFileSize)
            entry.expectedSize = Number(expectedSize || localFileSize)
            entry.needsCleanDownload = false
            entry.lastErrorStatusCode = undefined
            saveManifest()
            console.log(`[WebViewCache] 下载完成: ${resourceKey} -> ${downloadedPath}`)
            resolve()
            return
          }

          if (status === 999 && pausedByApp) {
            entry.status = 'downloading'
            entry.lastErrorStatusCode = undefined
            saveManifest()
            console.log(`[WebViewCache] 忽略暂停产生的 999: ${resourceKey}`)

            // 回到前台后给原任务一个恢复窗口；窗口结束仍终止才算真失败。
            if (!appInBackground && !task.__failureCheckTimer) {
              task.__failureCheckTimer = setTimeout(() => {
                task.__failureCheckTimer = undefined
                if (callbackHandled || task.state !== 4) return
                task.__ignorePause999Until = 0
                void finishDownload(task, 999)
              }, 3100)
            }
            return
          }

          callbackHandled = true
          activeDownloadTasks.delete(resourceKey)
          entry.status = 'error'
          entry.localPath = undefined
          entry.needsCleanDownload =
            status === 416 || (!!localFileSize && !!expectedSize && !sizeMatches)
          entry.lastErrorStatusCode = status > 0 ? status : undefined
          console.warn(
            `[WebViewCache] 下载失败: ${entry.url}, statusCode=${status}, fileSize=${localFileSize}, expectedSize=${expectedSize}`,
          )
          saveManifest()
          resolve()
        }

        const downloadTask = plus.downloader.createDownload(
          entry.url,
          {
            filename: targetPath,
            priority: 100,
            timeout: 0,
            // 禁止原生自动重试，避免旧连接未关闭时又创建新的 data/wasm 请求。
            retry: 0,
          },
          (task: any, status: number) => void finishDownload(task, status),
        )

        downloadTask.addEventListener(
          'statechanged',
          (task: any) => {
            if (task.state !== 3 || !task.totalSize) return
            const totalSize = Number(task.totalSize) || 0
            const downloadedSize = Number(task.downloadedSize) || 0
            if (totalSize > 0 && !entry.expectedSize) {
              entry.expectedSize = totalSize
              saveManifest()
            }
            const progress = Math.min(100, Math.round((downloadedSize / totalSize) * 100))
            console.log(
              `[WebViewCache] 下载进度 ${entry.localName}: ${progress}% (${task.downloadedSize}/${task.totalSize})`,
            )
            onProgress?.(entry.localName, progress)
          },
          false,
        )

        // OSS 默认会对越界 Range 返回 200 + 完整对象；标准模式改为 416，防止全量流量放大。
        const isSignedOssUrl = /[?&](?:OSSAccessKeyId|Signature|x-oss-signature)=/i.test(entry.url)
        if (entry.url.includes('.aliyuncs.com/') && !isSignedOssUrl) {
          downloadTask.setRequestHeader?.('x-oss-range-behavior', 'standard')
        } else if (isSignedOssUrl) {
          console.warn(
            '[WebViewCache] OSS 签名 URL 未添加 x-oss-range-behavior，需要服务端将该请求头纳入签名',
          )
        }
        activeDownloadTasks.set(resourceKey, downloadTask)
        if (appInBackground) {
          console.log(`[WebViewCache] App 已在后台，延迟启动下载: ${resourceKey}`)
        } else {
          downloadTask.start()
        }
      } catch (error) {
        activeDownloadTasks.delete(resourceKey)
        entry.status = 'error'
        entry.localPath = undefined
        entry.lastErrorStatusCode = undefined
        console.warn(`[WebViewCache] 创建下载任务失败: ${entry.url}`, error)
        saveManifest()
        resolve()
      }
    }

    // 新的业务任务不复用上一个任务的残片，避免从文件末尾产生越界 Range。
    // Downloader 单任务内部仍可按 retry 配置续传。
    ensureCacheDir().then(async () => {
      const existingSize = await getLocalFileSize(targetPath)
      const expectedSize = entry.expectedSize
      if (
        !entry.needsCleanDownload &&
        existingSize &&
        expectedSize &&
        Number(existingSize) === Number(expectedSize)
      ) {
        entry.status = 'done'
        entry.localPath = targetPath
        entry.fileSize = Number(existingSize)
        entry.lastErrorStatusCode = undefined
        saveManifest()
        resolve()
        return
      }

      if (!existingSize) {
        entry.needsCleanDownload = false
        saveManifest()
        startDownload()
        return
      }

      plus.io.resolveLocalFileSystemURL(
        targetPath,
        (fileEntry: any) => {
          fileEntry.remove(
            () => {
              entry.needsCleanDownload = false
              saveManifest()
              startDownload()
            },
            () => {
              entry.status = 'error'
              entry.localPath = undefined
              entry.needsCleanDownload = true
              entry.lastErrorStatusCode = undefined
              saveManifest()
              console.warn(`[WebViewCache] 清理不完整文件失败，已取消本次下载: ${targetPath}`)
              resolve()
            },
          )
        },
        () => {
          // resolveLocalFileSystemURL 失败表示目标不存在，可以安全新建下载任务。
          entry.needsCleanDownload = false
          saveManifest()
          startDownload()
        },
      )
    })
  })

  let trackedPromise: Promise<void>
  trackedPromise = downloadPromise.finally(() => {
    if (activeDownloadPromises.get(resourceKey) === trackedPromise) {
      activeDownloadPromises.delete(resourceKey)
    }
  })
  activeDownloadPromises.set(resourceKey, trackedPromise)
  return trackedPromise
}

// ======================== 拦截 ========================

/**
 * 检查本地文件是否真实存在
 * 使用 plus.io.resolveLocalFileSystemURL 验证
 */
function checkFileExists(localPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    plus.io.resolveLocalFileSystemURL(
      localPath,
      () => resolve(true),
      () => resolve(false),
    )
  })
}

/**
 * manifest 丢失或状态未及时落盘时，从固定缓存路径恢复已下载资源。
 * 同时把最新签名 URL 写回 manifest，供 WebView 拦截规则使用。
 */
async function restoreCacheEntryFromDisk(res: ResourceDescriptor): Promise<boolean> {
  const key = buildCacheKey(res.ext, res.version)
  const existing = manifest.get(key)
  const localName = buildLocalName(res.ext, res.version)
  const localPath = getLocalPath(localName)

  if (existing) {
    if (existing.needsCleanDownload) return false
    const existingPath = existing.localPath || localPath
    const fileSize = await getLocalFileSize(existingPath)
    const expectedSize = res.size || existing.expectedSize || existing.fileSize
    const isComplete =
      !!fileSize &&
      (expectedSize
        ? Number(fileSize) === Number(expectedSize)
        : existing.status === 'done' && !!existing.localPath)
    if (isComplete) {
      if (existing.url !== res.url) {
        existing.url = res.url
      }
      existing.status = 'done'
      existing.localPath = existingPath
      existing.fileSize = Number(fileSize)
      existing.expectedSize = expectedSize || Number(fileSize)
      existing.lastErrorStatusCode = undefined
      saveManifest()
      return true
    }
    return false
  }

  const fileSize = await getLocalFileSize(localPath)
  if (!fileSize || (res.size && Number(fileSize) !== Number(res.size))) return false

  manifest.set(key, {
    url: res.url,
    ext: res.ext,
    version: res.version,
    localName,
    localPath,
    status: 'done',
    fileSize: Number(fileSize),
    expectedSize: res.size || Number(fileSize),
  })
  saveManifest()
  console.log(`[WebViewCache] 从磁盘恢复缓存记录: ${key} -> ${localPath}`)
  return true
}

/**
 * 构建 overrideResourceRequest 的匹配规则（异步，先验证文件存在）
 * 将已下载资源的远程 URL 映射到本地文件路径
 *
 * 注意：
 * 1. match 使用正则匹配基础 URL（忽略 query 参数差异）
 * 2. redirect 使用 _doc/... 相对路径（官方文档格式，如 '_www/logo.png'）
 *    不使用 plus.io.convertLocalFileSystemURL 转出的 file:// 绝对路径
 * 3. 加入规则前先用 plus.io.resolveLocalFileSystemURL 确认文件存在
 */
async function buildOverrideRules(): Promise<Array<{ match: string; redirect: string }>> {
  const rules: Array<{ match: string; redirect: string }> = []
  const checks: Promise<void>[] = []

  manifest.forEach((entry) => {
    if (entry.status === 'done' && entry.localPath) {
      checks.push(
        (async () => {
          try {
            // 先验证本地文件真实存在
            const exists = await checkFileExists(entry.localPath)
            if (!exists) {
              console.warn(
                `[WebViewCache] 文件不存在，跳过拦截规则: ${entry.localPath}，标记为 pending 待重新下载`,
              )
              entry.status = 'pending'
              entry.localPath = undefined
              saveManifest()
              return
            }

            // match 用正则匹配基础 URL（忽略 query 参数）
            let baseUrl = entry.url
            const qIdx = baseUrl.indexOf('?')
            if (qIdx !== -1) baseUrl = baseUrl.slice(0, qIdx)
            const hIdx = baseUrl.indexOf('#')
            if (hIdx !== -1) baseUrl = baseUrl.slice(0, hIdx)

            // 转义正则特殊字符，末尾加 .* 以匹配带 query 的请求
            const escaped = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const matchPattern = `^${escaped}.*`

            rules.push({
              match: matchPattern,
              redirect: entry.localPath, // 使用 _doc/... 相对路径，与官方文档 _www/... 格式一致
            })

            console.log(
              `[WebViewCache] 拦截规则: match=${matchPattern} -> redirect=${entry.localPath}`,
            )
          } catch (e) {
            console.warn(`[WebViewCache] 构建拦截规则失败: ${entry.localPath}`, e)
          }
        })(),
      )
    }
  })

  await Promise.all(checks)
  return rules
}

// ======================== 对外 API ========================

/**
 * 初始化缓存系统（从 storage 恢复清单）
 * 在 App onLaunch 时调用
 */
export function initWebViewResourceCache(): void {
  if (initialized) return
  if (typeof plus === 'undefined') return

  loadManifest()
  ensureCacheDir()
  initialized = true
  console.log(`[WebViewCache] 初始化完成，已有 ${manifest.size} 条缓存记录`)

  // 对已下载但本地文件可能丢失的条目做校验（异步）
  manifest.forEach((entry) => {
    // App 被杀后内存中已无对应任务，持久化的 downloading 必须转回 pending。
    if (entry.status === 'downloading') {
      entry.status = 'pending'
      saveManifest()
    }
    if (entry.status === 'done' && entry.localPath) {
      plus.io.resolveLocalFileSystemURL(
        entry.localPath,
        () => {}, // 文件存在
        () => {
          // 文件丢失，重置状态
          entry.status = 'pending'
          entry.localPath = undefined
          saveManifest()
        },
      )
    }
  })
}

/**
 * 下载一组资源
 * @param resources 资源描述列表，每项包含 url / ext / version
 *   - ext: 文件扩展名，如 "wasm"、"data"
 *   - version: 版本号，如 "1_0_0"
 *   - 同一 ext + version 组合不变则跳过下载
 */
export async function downloadResources(
  resources: ResourceDescriptor[],
  options?: {
    /** 单个资源下载完成回调（成功/失败） */
    onResourceComplete?: (success: boolean) => void
  },
): Promise<void> {
  if (typeof plus === 'undefined') return
  if (!initialized) initWebViewResourceCache()

  // 跟踪每个文件的下载进度
  const progressMap = new Map<string, number>()

  /** 从 localName 提取简短显示名（如 wasm、data） */
  const getDisplayName = (localName: string) => {
    const dotIdx = localName.lastIndexOf('.')
    return dotIdx !== -1 ? localName.slice(dotIdx + 1) : localName
  }

  /** 更新响应式进度文案 */
  const updateProgressLines = () => {
    const lines: string[] = []
    progressMap.forEach((progress, name) => {
      lines.push(`${getDisplayName(name)}: ${progress}%`)
    })
    downloadProgressLines.value = lines
  }

  const tasks: Promise<void>[] = []

  for (const res of resources) {
    const key = buildCacheKey(res.ext, res.version)
    console.log('------------key', key)
    const existing = manifest.get(key)

    console.log('------------manifest', manifest)

    // manifest 状态异常但磁盘文件存在时直接恢复，不重复下载。
    if (await restoreCacheEntryFromDisk(res)) {
      options?.onResourceComplete?.(true)
      continue
    }

    // 版本变了或首次下载（或旧记录未完成的重新下载）
    const entry: CacheEntry = existing || {
      url: res.url,
      ext: res.ext,
      version: res.version,
      localName: buildLocalName(res.ext, res.version),
      status: 'pending',
      expectedSize: res.size,
    }

    // 兜底：确保 localName 始终是最新的（旧 manifest 可能存的是不带扩展名的格式）
    const correctLocalName = buildLocalName(res.ext, res.version)
    if (entry.localName !== correctLocalName) {
      entry.localName = correctLocalName
    }

    // 更新 URL（版本不变但 URL 变了的情况上面已处理；版本变了要更新 URL）
    if (entry.url && !isSameResourceUrl(entry.url, res.url)) {
      entry.needsCleanDownload = true
      entry.fileSize = undefined
      entry.expectedSize = res.size
    }
    entry.url = res.url
    if (res.size) entry.expectedSize = res.size
    if (!existing) {
      manifest.set(key, entry)
    }
    console.log('-----------------entry', entry)

    tasks.push(
      downloadOne(entry, (localName, progress) => {
        progressMap.set(localName, progress)
        updateProgressLines()
      }).finally(() => {
        progressMap.delete(entry.localName)
        updateProgressLines()
        options?.onResourceComplete?.(entry.status === 'done')
      }),
    )
  }

  // 控制并发：最多同时 3 个
  const concurrency = 3
  const results: PromiseSettledResult<void>[] = []
  console.log('-============', tasks)
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch)
    results.push(...settled)
  }

  const failed = results.filter((r) => r.status === 'rejected').length
  if (failed > 0) {
    console.warn(`[WebViewCache] ${failed} 个资源下载失败`)
  }
  console.log(`[WebViewCache] 下载完成，成功 ${results.length - failed}/${results.length}`)

  // 下载完成后，校验所有资源完整性并重试未完成的
  await verifyAndRetryResources(resources)
}

/**
 * 验证单个资源是否已完整下载到本地
 * 检查 manifest 状态 + 文件是否真实存在
 */
async function verifyResourceComplete(res: ResourceDescriptor): Promise<boolean> {
  const key = buildCacheKey(res.ext, res.version)
  const entry = manifest.get(key)
  if (!entry || entry.status !== 'done' || !entry.localPath) {
    return await restoreCacheEntryFromDisk(res)
  }
  // 检查文件是否真实存在
  return await checkFileExists(entry.localPath)
}

/** 根据本轮所需资源的实际文件状态更新入口可用状态 */
async function refreshGameResourceLoadState(): Promise<void> {
  if (expectedGameResources.length === 0) {
    gameResourceLoadState.value = 'ready'
    return
  }

  const results = await Promise.all(expectedGameResources.map(verifyResourceComplete))
  gameResourceLoadState.value = results.every(Boolean) ? 'ready' : 'loading'
}

/**
 * 校验所有资源完整性，对未完成的资源自动重试下载
 * @param resources 原始资源列表
 * @param maxRetries 最大自动重试次数（默认 0，由用户在弹窗中明确重试）
 */
async function verifyAndRetryResources(
  resources: ResourceDescriptor[],
  maxRetries = 0,
): Promise<void> {
  // 确保缓存目录存在
  await ensureCacheDir()

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (appInBackground) {
      console.log('[WebViewCache] App 处于后台，暂停资源校验重试，等待回到前台后刷新 URL')
      return
    }

    const incomplete: ResourceDescriptor[] = []

    // 逐个检查资源是否完整
    for (const res of resources) {
      const isComplete = await verifyResourceComplete(res)
      if (!isComplete) {
        const key = buildCacheKey(res.ext, res.version)
        const entry = manifest.get(key)
        console.warn(
          `[WebViewCache] 资源未完成 (第${attempt + 1}次校验): ${key}, status=${entry?.status || 'missing'}, url=${res.url}`,
        )
        incomplete.push(res)
      }
    }

    if (incomplete.length === 0) {
      console.log(`[WebViewCache] 所有资源校验通过 (第${attempt + 1}次)`)
      return
    }

    if (attempt >= maxRetries) {
      console.warn(
        `[WebViewCache] 已达最大重试次数 ${maxRetries}，仍有 ${incomplete.length} 个资源未完成:`,
        incomplete.map((r) => `${r.ext}_${r.version}`).join(', '),
      )
      return
    }

    console.log(
      `[WebViewCache] 第 ${attempt + 1} 次重试下载 ${incomplete.length} 个资源:`,
      incomplete.map((r) => `${r.ext}_${r.version}`).join(', '),
    )

    // 重置未完成资源的状态为 pending
    for (const res of incomplete) {
      const key = buildCacheKey(res.ext, res.version)
      const entry = manifest.get(key)
      if (entry) {
        entry.status = 'pending'
        entry.localPath = undefined
      } else {
        // manifest 中不存在，创建新条目
        manifest.set(key, {
          url: res.url,
          ext: res.ext,
          version: res.version,
          localName: buildLocalName(res.ext, res.version),
          status: 'pending',
          expectedSize: res.size,
        })
      }
    }
    saveManifest()

    // 确保缓存目录存在后重新下载
    await ensureCacheDir()

    const retryTasks = incomplete.map((res) => {
      const key = buildCacheKey(res.ext, res.version)
      const entry = manifest.get(key)!
      entry.url = res.url // 确保使用最新的 URL
      return downloadOne(entry)
    })

    await Promise.allSettled(retryTasks)
  }
}

/**
 * 为 WebView 应用资源拦截
 * 在 WebView 创建后调用，将已缓存的资源拦截到本地
 *
 * 如果发现本地文件缺失，会自动触发重新下载并等待完成后再注入规则。
 * 下载进度通过 backgroundDownloadState 暴露，UI 层可监听展示 loading。
 *
 * @param webview plus.webview 创建的 WebView 实例
 */
export async function applyResourceOverride(webview: any): Promise<void> {
  if (typeof plus === 'undefined') return
  if (!webview) return
  // 仅 Android 支持 overrideResourceRequest，iOS WKWebView 不支持
  if (getPlatform() !== 'android') return

  // 1. 构建拦截规则（同时校验文件是否存在，缺失的会被标记为 pending）
  let rules = await buildOverrideRules()

  // 2. 检查是否有缺失资源需要重新下载
  const missingResources: ResourceDescriptor[] = []
  const expectedKeys = new Set(
    expectedGameResources.map((resource) => buildCacheKey(resource.ext, resource.version)),
  )
  manifest.forEach((entry, key) => {
    if (expectedKeys.size > 0 && !expectedKeys.has(key)) return
    if (entry.status !== 'done') {
      missingResources.push({
        url: entry.url,
        ext: entry.ext,
        version: entry.version,
        size: entry.expectedSize,
      })
    }
  })

  // 3. 如果有缺失资源，触发下载并等待完成
  if (missingResources.length > 0) {
    console.log(
      `[WebViewCache] applyResourceOverride: 发现 ${missingResources.length} 个资源缺失，触发重新下载`,
    )
    startBackgroundDownload(missingResources)
    await waitForBackgroundDownload()

    // 下载完成后重新构建拦截规则
    rules = await buildOverrideRules()
  }

  if (rules.length === 0) {
    console.warn('[WebViewCache] 暂无可用拦截规则（资源可能仍未下载完成或文件丢失）')
    return
  }
  console.log(`[WebViewCache] 准备注入 ${rules.length} 条拦截规则`, rules)
  console.log(webview.overrideResourceRequest, ' webview.overrideResourceRequest')

  try {
    webview.overrideResourceRequest(rules)
    console.log(`[WebViewCache] 已为 WebView 注入 ${rules.length} 条资源拦截规则`)
  } catch (e) {
    console.warn('[WebViewCache] overrideResourceRequest 失败（iOS WKWebView 不支持）:', e)
  }
}

/**
 * 包装 WebView 的 loadURL 方法，使其在首次加载 URL 前自动注入资源拦截规则。
 *
 * 设计要点：
 * 1. overrideResourceRequest 的规则一旦设置便在整个 WebView 生命周期内生效，
 *    因此只需在首次 loadURL 前注入一次，后续 loadURL 无需重复注入。
 * 2. applyResourceOverride 是异步的（需验证本地文件是否存在），
 *    包装后的 loadURL 会等待规则注入完成后再真正加载 URL。
 * 3. 若规则注入失败，会降级为直接加载 URL，不阻塞页面。
 *
 * 用于 plusGameWebViewPool 创建的 WebView 实例。
 *
 * @param webview plus.webview.create() 返回的 WebView 实例
 */
export function wrapWebViewForCache(webview: any): void {
  if (typeof plus === 'undefined') return
  if (!webview || typeof webview.loadURL !== 'function') return
  // 仅 Android 支持 overrideResourceRequest，iOS WKWebView 不支持
  if (getPlatform() !== 'android') return

  let rulesApplied = false
  const originalLoadURL = webview.loadURL.bind(webview)

  webview.loadURL = function (url: string, ...args: any[]) {
    if (rulesApplied) {
      // 已注入过拦截规则，直接调用原始 loadURL
      originalLoadURL(url, ...args)
      return
    }

    // 首次 loadURL：先注入拦截规则，再加载 URL
    console.log('[WebViewCache] wrapWebViewForCache: 注入拦截规则...')
    applyResourceOverride(webview)
      .then(() => {
        rulesApplied = true
        console.log('[WebViewCache] wrapWebViewForCache: 规则已注入，加载 URL:', url)
        originalLoadURL(url, ...args)
      })
      .catch(() => {
        // 注入失败时不阻塞，降级为直接加载（资源走网络）
        console.warn('[WebViewCache] wrapWebViewForCache: 注入失败，降级直接加载:', url)
        originalLoadURL(url, ...args)
      })
  }
}

/**
 * 根据 ext + version 查找本地缓存路径
 * 用于在知道资源类型和版本时直接获取本地文件，无需遍历清单
 */
export function getCachedLocalPath(ext: string, version: string): string | null {
  const key = buildCacheKey(ext, version)
  const entry = manifest.get(key)
  if (entry && entry.status === 'done' && entry.localPath) {
    return entry.localPath
  }
  return null
}

/**
 * 清除指定资源的缓存
 * @param keys 要清除的缓存 key 列表（格式 "{ext}_{version}"），不传则清除全部
 */
export function clearResourceCache(keys?: string[]): void {
  if (!initialized) return

  if (!keys || keys.length === 0) {
    manifest.forEach((entry) => {
      if (entry.localPath) {
        try {
          plus.io.resolveLocalFileSystemURL(entry.localPath, (fileEntry: any) => {
            fileEntry.remove(
              () => {},
              () => {},
            )
          })
        } catch {}
      }
    })
    manifest.clear()
    uni.removeStorageSync(MANIFEST_KEY)
    console.log('[WebViewCache] 已清除全部缓存')
    return
  }

  for (const key of keys) {
    const entry = manifest.get(key)
    if (entry) {
      if (entry.localPath) {
        try {
          plus.io.resolveLocalFileSystemURL(entry.localPath, (fileEntry: any) => {
            fileEntry.remove(
              () => {},
              () => {},
            )
          })
        } catch {}
      }
      manifest.delete(key)
    }
  }
  saveManifest()
  console.log(`[WebViewCache] 已清除 ${keys.length} 条缓存`)
}

/**
 * 获取当前缓存状态
 */
export function getCacheStatus(): {
  total: number
  done: number
  pending: number
  error: number
  downloading: number
} {
  let done = 0
  let pending = 0
  let error = 0
  let downloading = 0
  manifest.forEach((entry) => {
    switch (entry.status) {
      case 'done':
        done++
        break
      case 'pending':
        pending++
        break
      case 'error':
        error++
        break
      case 'downloading':
        downloading++
        break
    }
  })
  return { total: manifest.size, done, pending, error, downloading }
}

/**
 * 重新下载失败的资源
 */
export async function retryFailed(): Promise<void> {
  manifest.forEach((entry) => {
    if (entry.status === 'error') {
      entry.status = 'pending'
      entry.lastErrorStatusCode = undefined
    }
  })
  saveManifest()

  // 失败后不能直接复用 manifest 中的旧地址。资源 URL 可能带短期签名，
  // 重新请求游戏参数后再下载，才能处理切后台后出现的 HTTP 400。
  await downloadGameResources()
}

// ======================== 后台下载 API ========================

/**
 * 在后台下载资源（非阻塞，单例防重入）
 *
 * - 如果已有下载在进行中，直接返回现有 Promise（不会重复下载）
 * - 如果没有，立即启动下载并返回 Promise
 * - 调用方可选择 await 等待完成，也可忽略返回值
 * - 自动过滤已完成的资源，只下载未完成的
 *
 * @param resources 资源描述列表
 * @returns Promise<void>，下载完成后 resolve
 */
export function startBackgroundDownload(resources: ResourceDescriptor[]): Promise<void> {
  // 已有下载在进行中，复用
  if (backgroundDownloadPromise) {
    console.log('[WebViewCache] 后台下载已在进行中，复用现有任务')
    return backgroundDownloadPromise
  }

  if (resources.length === 0) return Promise.resolve()

  // 先跨游戏去重，再过滤已完成的资源，避免相同 URL 同时创建多个 Download 任务。
  const needDownload = dedupeResources(resources).filter((res) => {
    const key = buildCacheKey(res.ext, res.version)
    const existing = manifest.get(key)
    return !(existing && existing.status === 'done' && existing.localPath)
  })

  if (needDownload.length === 0) {
    console.log('[WebViewCache] 所有资源已缓存，无需后台下载')
    return Promise.resolve()
  }

  console.log(`[WebViewCache] 启动后台下载: ${needDownload.length} 个资源`)

  backgroundDownloadState.value = {
    running: true,
    total: needDownload.length,
    completed: 0,
    failed: 0,
    progress: 0,
  }

  backgroundDownloadPromise = downloadResources(needDownload, {
    onResourceComplete: (success) => {
      const state = backgroundDownloadState.value
      if (success) {
        state.completed++
      } else {
        state.failed++
      }
      state.progress = Math.round(((state.completed + state.failed) / state.total) * 100)
    },
  }).finally(() => {
    backgroundDownloadState.value.running = false
    backgroundDownloadState.value.progress = 100
    backgroundDownloadPromise = null
    console.log(
      `[WebViewCache] 后台下载结束 (成功 ${backgroundDownloadState.value.completed}/${backgroundDownloadState.value.total})`,
    )
  })

  return backgroundDownloadPromise
}

/**
 * 检查后台下载是否正在进行
 */
export function isBackgroundDownloading(): boolean {
  return backgroundDownloadState.value.running
}

/**
 * 等待后台下载完成（如果正在下载）
 * 如果没有正在进行的下载，立即 resolve
 */
export function waitForBackgroundDownload(): Promise<void> {
  if (backgroundDownloadPromise) {
    return backgroundDownloadPromise
  }
  return Promise.resolve()
}

/**
 * App 进入后台时暂停由游戏缓存创建的 DownloadTask。
 */
export function handleAppBackgroundDownload(): void {
  appInBackground = true
  activeDownloadTasks.forEach((task, resourceKey) => {
    try {
      const totalSize = Number(task.totalSize) || 0
      const downloadedSize = Number(task.downloadedSize) || 0
      if (totalSize > 0 && downloadedSize >= totalSize) {
        // 字节已齐时不 pause，仍等 Downloader 最终回调和文件校验。
        console.log(`[WebViewCache] App 进入后台，资源已齐等待最终回调: ${resourceKey}`)
      } else if (task.state === 1 || task.state === 2 || task.state === 3) {
        task.__ignorePause999Until = Number.MAX_SAFE_INTEGER
        task.pause()
        console.log(`[WebViewCache] App 进入后台，已暂停游戏资源: ${resourceKey}`)
      }
    } catch (error) {
      console.warn(`[WebViewCache] 暂停游戏资源失败: ${resourceKey}`, error)
    }
  })
}

/**
 * App 回到前台时只恢复本次点击游戏后已创建的任务。
 * 不扫描 manifest，也不在启动/登录/普通 onShow 时发起新下载。
 */
export async function resumeBackgroundDownloadIfNeeded(): Promise<void> {
  appInBackground = false
  activeDownloadTasks.forEach((task, resourceKey) => {
    try {
      const totalSize = Number(task.totalSize) || 0
      const downloadedSize = Number(task.downloadedSize) || 0
      if (totalSize > 0 && downloadedSize >= totalSize) {
        // 不从 EOF resume，仍等 Downloader 最终回调。
        console.log(`[WebViewCache] App 回到前台，资源已齐等待最终回调: ${resourceKey}`)
      } else if (task.__ignorePause999Until === Number.MAX_SAFE_INTEGER) {
        task.__ignorePause999Until = Date.now() + 3000
        task.resume()
        console.log(`[WebViewCache] App 回到前台，恢复后台暂停资源: ${resourceKey}`)
      } else if (task.state === 0) {
        task.start()
        console.log(`[WebViewCache] App 回到前台，已启动游戏资源: ${resourceKey}`)
      } else if (task.state === 5) {
        task.__ignorePause999Until = Date.now() + 3000
        task.resume()
        console.log(`[WebViewCache] App 回到前台，已恢复游戏资源: ${resourceKey}`)
      }
    } catch (error) {
      console.warn(`[WebViewCache] 恢复游戏资源失败: ${resourceKey}`, error)
    }
  })
}

/**
 * 根据游戏接口下载游戏资源。
 *
 * 注意：仅 Android 平台执行。iOS WKWebView 不支持 overrideResourceRequest，
 * 预下载后无法重定向，因此跳过。
 */
export async function downloadGameResources(): Promise<void> {
  if (getPlatform() !== 'android') return
  gameResourceLoadState.value = 'loading'
  try {
    const types = ['MATCH_THREE', 'JUMP']
    const allResources: ResourceDescriptor[] = []
    let validGameConfigCount = 0
    const resourceCacheStore = useResourceCacheStore()
    for (const type of types) {
      const res = await getGameParamsApi(type)
      console.log('[WebViewCache] getGameParamsApi', type, res)
      if (res.code !== 1 || !res.data) continue

      const gameVersion = res.data.gameVersion || ''
      const jumpUrl = res.data.jumpUrl || ''
      if (!gameVersion || !jumpUrl) continue
      validGameConfigCount++

      const ver = gameVersion.replace(/\./g, '_')
      const preloadResources = res.data.preloadResources || []

      // 保存 preloadResources 快照到 Pinia
      resourceCacheStore.setPreloadResources(type, preloadResources, gameVersion)

      // 优先使用后端返回的 preloadResources
      if (Array.isArray(preloadResources) && preloadResources.length > 0) {
        preloadResources.forEach((item: any) => {
          const url = typeof item === 'string' ? item : item?.url
          let ext = typeof item === 'string' ? '' : item?.ext || ''
          if (!ext && url) {
            ext = extractExtFromUrl(url)
          }
          if (url && ext) {
            allResources.push({ url, ext, version: ver, size: extractResourceSize(item) })
          }
        })
      }
    }
    const uniqueResources = dedupeResources(allResources)
    console.log(
      `[WebViewCache] 游戏资源去重: ${allResources.length} -> ${uniqueResources.length}`,
      uniqueResources,
    )
    expectedGameResources = uniqueResources
    if (validGameConfigCount === 0) return

    if (uniqueResources.length > 0) {
      await startBackgroundDownload(uniqueResources)
    }
    await refreshGameResourceLoadState()
  } catch (e) {
    console.warn('[WebViewCache] 预下载游戏资源失败:', e)
  }
}

// ======================== 游戏资源就绪检查 ========================

/**
 * 确保指定游戏的资源已准备就绪
 *
 * 流程：
 * 1. 调用接口获取最新的 preloadResources
 * 2. 与 Pinia 中存储的 preloadResources 比对
 * 3. 如果不一致，将 URL 变化的资源重置为 pending 强制重下，并更新 Pinia
 * 4. 如果有未完成的资源（pending/error/downloading），继续下载
 * 5. 等待下载完成
 *
 * @param gameType 游戏类型，如 'MATCH_THREE' / 'JUMP'
 * @returns 本次接口返回的游戏参数，供跳转直接复用，避免重复获取 token
 */
export async function ensureGameResourcesReady(
  gameType: string,
  options: {
    onDownloadRequired?: () => void
    onGameParamsError?: (message?: string) => void
  } = {},
): Promise<getGameParamsApiResponse | undefined> {
  console.log(`[WebViewCache] ensureGameResourcesReady: ${gameType}`)
  // 仅 Android 平台需要预下载+重定向，iOS 直接跳过
  if (getPlatform() !== 'android') return undefined

  // 1. 调用接口获取最新参数
  const res = await getGameParamsApi(gameType)
  if (res.code !== 1 || !res.data) {
    options.onGameParamsError?.(res.msg)
    throw new Error(`获取游戏参数失败: ${gameType}`)
  }

  const gameVersion = res.data.gameVersion || ''
  const jumpUrl = res.data.jumpUrl || ''
  if (!gameVersion || !jumpUrl) {
    throw new Error(`游戏参数不完整: ${gameType}`)
  }

  const ver = gameVersion.replace(/\./g, '_')
  const apiPreloadResources = res.data.preloadResources || []

  // 2. 与 Pinia 中存储的 preloadResources 比对
  const resourceCacheStore = useResourceCacheStore()
  const hasChanged = resourceCacheStore.isPreloadResourcesChanged(gameType, apiPreloadResources)

  // 更新 Pinia 快照
  resourceCacheStore.setPreloadResources(gameType, apiPreloadResources, gameVersion)

  // 3. 构建 ResourceDescriptor 列表
  const allResources: ResourceDescriptor[] = []
  if (Array.isArray(apiPreloadResources) && apiPreloadResources.length > 0) {
    apiPreloadResources.forEach((item: any) => {
      const url = typeof item === 'string' ? item : item?.url
      let ext = typeof item === 'string' ? '' : item?.ext || ''
      if (!ext && url) {
        ext = extractExtFromUrl(url)
      }
      if (url && ext) {
        allResources.push({ url, ext, version: ver, size: extractResourceSize(item) })
      }
    })
  }

  // 4. 如果 preloadResources 变化，检查是否有 URL 变化需要强制重下
  if (hasChanged) {
    console.log(`[WebViewCache] ${gameType} preloadResources 已变化，检查 URL 差异`)
    allResources.forEach((res) => {
      const key = buildCacheKey(res.ext, res.version)
      const existing = manifest.get(key)
      if (existing && existing.status === 'done' && existing.url !== res.url) {
        if (isSameResourceUrl(existing.url, res.url)) {
          // 仅临时签名参数变化：保留本地文件，只更新拦截所需的最新 URL。
          existing.url = res.url
          console.log(`[WebViewCache] 资源签名已更新，复用本地缓存: ${key}`)
        } else {
          // 资源物理地址确实变化，才强制重新下载。
          existing.status = 'error'
          existing.localPath = undefined
          existing.fileSize = undefined
          existing.expectedSize = res.size
          existing.needsCleanDownload = true
          existing.lastErrorStatusCode = undefined
          console.log(`[WebViewCache] 资源地址变化，强制重下: ${key}`)
        }
      }
    })
    saveManifest()
  }

  // 5. 检查是否有未完成的资源，如有则触发/继续下载
  await Promise.all(allResources.map((resource) => restoreCacheEntryFromDisk(resource)))
  const needDownload = allResources.filter((res) => {
    const key = buildCacheKey(res.ext, res.version)
    const existing = manifest.get(key)
    return !(existing && existing.status === 'done' && existing.localPath)
  })

  if (needDownload.length > 0) {
    gameResourceLoadState.value = 'loading'
    expectedGameResources = allResources
    console.log(
      `[WebViewCache] ${gameType} 有 ${needDownload.length}/${allResources.length} 个资源未完成，触发下载`,
    )
    // startBackgroundDownload 会自动跳过已完成的，并单例防重入
    startBackgroundDownload(allResources)
    // 只在下载任务已启动后通知 UI，资源检测阶段不展示弹窗。
    options.onDownloadRequired?.()
  } else {
    console.log(`[WebViewCache] ${gameType} 所有资源已就绪`)
    expectedGameResources = allResources
    await refreshGameResourceLoadState()
    return res.data
  }

  // 6. 等待当前批次完成。一次点击不自动创建第二批请求。
  await waitForBackgroundDownload()
  const readiness = await Promise.all(
    allResources.map((resource) => verifyResourceComplete(resource)),
  )
  const notReady = allResources.filter((_, index) => !readiness[index])

  if (notReady.length > 0) {
    gameResourceLoadState.value = 'failed'
    throw new Error(
      `${gameType} 仍有 ${notReady.length} 个资源未就绪: ${notReady
        .map((resource) => `${resource.ext}_${resource.version}`)
        .join(', ')}`,
    )
  }

  // 当前点击的游戏资源已逐个校验通过，直接收口弹窗状态。
  gameResourceLoadState.value = 'ready'
  return res.data
}

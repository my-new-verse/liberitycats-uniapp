/**
 * WebView 资源离线缓存
 *
 * 核心思路：
 * 1. 提前下载：App 启动 / 登录成功后，用 uni.downloadFile 将 WebView 所需的静态资源
 *    下载到 App 临时目录，再移动到 _doc/webview_cache/
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

import { getGameParamsApi } from '@/service/api/game'
declare const plus: any

// ======================== 类型 ========================

/** 资源描述（调用方传入） */
export interface ResourceDescriptor {
  /** 远程下载 URL */
  url: string
  /** 文件扩展名，如 wasm / data */
  ext: string
  /** 版本号，如 1_0_0 或 2_3_1 */
  version: string
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
/** 当前正在下载的 url 集合，防止重复 */
const activeDownloadUrls = new Set<string>()

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

/** 确保缓存目录存在 */
function ensureCacheDir(): void {
  try {
    plus.io.resolveLocalFileSystemURL(
      CACHE_DIR,
      () => {},
      () => {
        plus.io.resolveLocalFileSystemURL('_doc/', (entry: any) => {
          entry.getDirectory(
            'webview_cache',
            { create: true },
            () => {},
            () => {},
          )
        })
      },
    )
  } catch {}
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

/** 下载单个资源到本地（使用 uni.downloadFile） */
function downloadOne(entry: CacheEntry): Promise<void> {
  return new Promise((resolve) => {
    entry.status = 'downloading'
    const targetPath = getLocalPath(entry.localName)

    console.log(`[WebViewCache] 开始下载: ${entry.url} -> ${targetPath}`)

    const timeout = 30 * 60 * 1000 // 结果为 1800000
    const downloadTask = uni.downloadFile({
      url: entry.url,
      timeout,
      success: (res: any) => {
        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath
          console.log(`[WebViewCache] 下载到临时文件: ${tempFilePath}，正在移动到 ${targetPath}`)
          // uni.downloadFile 下载到临时目录，需要移动到目标路径
          // #ifdef APP-PLUS
          plus.io.resolveLocalFileSystemURL(
            targetPath,
            () => {
              // 目标文件已存在，先删除再移动
              plus.io.resolveLocalFileSystemURL(targetPath, (fileEntry: any) => {
                fileEntry.remove(
                  () => moveTempFile(tempFilePath, targetPath, entry, resolve),
                  () => moveTempFile(tempFilePath, targetPath, entry, resolve),
                )
              })
            },
            () => {
              // 目标不存在，直接移动
              moveTempFile(tempFilePath, targetPath, entry, resolve)
            },
          )
          // #endif
          // #ifndef APP-PLUS
          entry.status = 'done'
          entry.localPath = tempFilePath
          saveManifest()
          resolve()
          // #endif
        } else {
          entry.status = 'error'
          console.warn(`[WebViewCache] 下载失败: ${entry.url}, statusCode=${res.statusCode}`)
          saveManifest()
          resolve()
        }
      },
      fail: (err: any) => {
        activeDownloadUrls.delete(entry.url)
        entry.status = 'error'
        console.warn(`[WebViewCache] 下载失败: ${entry.url}`, err)
        saveManifest()
        resolve()
      },
    })

    // 监听下载进度
    downloadTask.onProgressUpdate((res: any) => {
      console.log(
        `[WebViewCache] 下载进度 ${entry.localName}: ${res.progress}% (${res.totalBytesWritten}/${res.totalBytesExpectedToWrite})`,
      )
    })

    activeDownloadUrls.add(entry.url)
  })
}

/** 将临时文件移动到目标路径（plus.io） */
function moveTempFile(
  tempFilePath: string,
  targetPath: string,
  entry: CacheEntry,
  resolve: () => void,
): void {
  // 强兜底：确保 localName 一定带扩展名
  let newName = entry.localName
  if (entry.ext && !newName.endsWith(`.${entry.ext}`)) {
    newName = `${newName}.${entry.ext}`
    console.warn(`[WebViewCache] localName 缺少扩展名，已修正为: ${newName}`)
  }

  console.log(
    `[WebViewCache] moveTempFile: temp=${tempFilePath}, newName=${newName}, targetPath=${targetPath}`,
  )

  // #ifdef APP-PLUS
  plus.io.resolveLocalFileSystemURL(
    tempFilePath,
    (tempEntry: any) => {
      plus.io.resolveLocalFileSystemURL(
        CACHE_DIR,
        (dirEntry: any) => {
          tempEntry.moveTo(
            dirEntry,
            newName,
            () => {
              activeDownloadUrls.delete(entry.url)
              entry.status = 'done'
              entry.localPath = targetPath
              console.log(`[WebViewCache] 移动完成: ${entry.url} -> ${targetPath}`)
              saveManifest()
              resolve()
            },
            (err: any) => {
              activeDownloadUrls.delete(entry.url)
              entry.status = 'error'
              console.warn(`[WebViewCache] 移动文件失败: ${tempFilePath} -> ${targetPath}`, err)
              saveManifest()
              resolve()
            },
          )
        },
        () => {
          // 缓存目录不存在，尝试先创建
          ensureCacheDir()
          // 简单重试一次
          plus.io.resolveLocalFileSystemURL(
            CACHE_DIR,
            (dirEntry2: any) => {
              tempEntry.moveTo(
                dirEntry2,
                newName,
                () => {
                  activeDownloadUrls.delete(entry.url)
                  entry.status = 'done'
                  entry.localPath = targetPath
                  console.log(`[WebViewCache] 移动完成: ${entry.url} -> ${targetPath}`)
                  saveManifest()
                  resolve()
                },
                (err2: any) => {
                  activeDownloadUrls.delete(entry.url)
                  entry.status = 'error'
                  console.warn(
                    `[WebViewCache] 移动文件失败(重试): ${tempFilePath} -> ${targetPath}`,
                    err2,
                  )
                  saveManifest()
                  resolve()
                },
              )
            },
            () => {
              activeDownloadUrls.delete(entry.url)
              entry.status = 'error'
              console.warn(`[WebViewCache] 缓存目录不可用: ${CACHE_DIR}`)
              saveManifest()
              resolve()
            },
          )
        },
      )
    },
    () => {
      activeDownloadUrls.delete(entry.url)
      entry.status = 'error'
      console.warn(`[WebViewCache] 临时文件不存在: ${tempFilePath}`)
      saveManifest()
      resolve()
    },
  )
  // #endif
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
export async function downloadResources(resources: ResourceDescriptor[]): Promise<void> {
  if (typeof plus === 'undefined') return
  if (!initialized) initWebViewResourceCache()

  const tasks: Promise<void>[] = []

  for (const res of resources) {
    const key = buildCacheKey(res.ext, res.version)
    console.log('------------key', key)
    const existing = manifest.get(key)

    console.log('------------manifest', manifest)

    // 同一 ext + version 组合已下载完成，跳过
    if (existing && existing.status === 'done' && existing.localPath) {
      // URL 可能变了（换 CDN 等），更新 URL 以便拦截匹配
      if (existing.url !== res.url) {
        existing.url = res.url
        saveManifest()
      }
      continue
    }

    // 版本变了或首次下载（或旧记录未完成的重新下载）
    const entry: CacheEntry = existing || {
      url: res.url,
      ext: res.ext,
      version: res.version,
      localName: buildLocalName(res.ext, res.version),
      status: 'pending',
    }

    // 兜底：确保 localName 始终是最新的（旧 manifest 可能存的是不带扩展名的格式）
    const correctLocalName = buildLocalName(res.ext, res.version)
    if (entry.localName !== correctLocalName) {
      entry.localName = correctLocalName
    }

    // 更新 URL（版本不变但 URL 变了的情况上面已处理；版本变了要更新 URL）
    entry.url = res.url
    if (!existing) {
      manifest.set(key, entry)
    }
    console.log('-----------------entry', entry)

    tasks.push(downloadOne(entry))
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
}

/**
 * 为 WebView 应用资源拦截
 * 在 WebView 创建后调用，将已缓存的资源拦截到本地
 *
 * @param webview plus.webview 创建的 WebView 实例
 */
export async function applyResourceOverride(webview: any): Promise<void> {
  if (typeof plus === 'undefined') return
  if (!webview) return
  const rules = await buildOverrideRules()
  if (rules.length === 0) {
    console.warn('[WebViewCache] 暂无可用拦截规则（资源可能尚未下载完成或文件丢失）')
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
  const failedKeys: string[] = []
  manifest.forEach((entry, key) => {
    if (entry.status === 'error') {
      entry.status = 'pending'
      failedKeys.push(key)
    }
  })
  if (failedKeys.length > 0) {
    saveManifest()
    const failed = failedKeys
      .map((k) => manifest.get(k))
      .filter((e): e is CacheEntry => !!e)
      .map((e) => ({ url: e.url, ext: e.ext, version: e.version }))
    await downloadResources(failed)
  }
}

/**
 * 根据游戏接口预下载游戏资源
 * 在 App onLaunch 已登录态 或 登录成功后调用
 */
export async function downloadGameResources(): Promise<void> {
  try {
    const types = ['MATCH_THREE', 'JUMP']
    const allResources: ResourceDescriptor[] = []
    for (const type of types) {
      const res = await getGameParamsApi(type)
      console.log('[WebViewCache] getGameParamsApi', type, res)
      if (res.code !== 1 || !res.data) continue

      const gameVersion = res.data.gameVersion || ''
      const jumpUrl = res.data.jumpUrl || ''
      if (!gameVersion || !jumpUrl) continue

      const ver = gameVersion.replace(/\./g, '_')

      // 优先使用后端返回的 preloadResources
      if (Array.isArray(res.data.preloadResources) && res.data.preloadResources.length > 0) {
        res.data.preloadResources.forEach((item: any) => {
          const url = typeof item === 'string' ? item : item?.url
          let ext = typeof item === 'string' ? '' : item?.ext || ''
          if (!ext && url) {
            ext = extractExtFromUrl(url)
          }
          if (url && ext) {
            allResources.push({ url, ext, version: ver })
          }
        })
      }
    }
    console.log('[WebViewCache] downloadGameResources allResources:', allResources)
    if (allResources.length > 0) {
      await downloadResources(allResources)
    }
  } catch (e) {
    console.warn('[WebViewCache] 预下载游戏资源失败:', e)
  }
}

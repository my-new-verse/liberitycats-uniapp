/** APK 下载跨组件实例单例锁，避免全局弹窗与手动检查弹窗重复下载。 */
const activeApkDownloads = new Set<string>()

export function acquireAppUpdateDownload(key: string): boolean {
  if (!key || activeApkDownloads.has(key)) return false
  activeApkDownloads.add(key)
  return true
}

export function releaseAppUpdateDownload(key: string): void {
  if (key) activeApkDownloads.delete(key)
}

import { generatePostPosterApi } from '@/service/api/community'

const POLL_INTERVAL = 3000 // 3秒
const MAX_RETRIES = 10 // 最多轮询10次

export async function generatePostPoster(postId: number): Promise<string> {
  for (let i = 0; i < MAX_RETRIES; i++) {
    const res = await generatePostPosterApi(postId)

    if (res.code !== 1) {
      // 频率限制错误 → 立即停止轮询，抛出错误
      if (res.msg?.includes('操作过于频繁')) {
        throw new Error(res.msg)
      }
      // 其他错误 → 停止轮询
      throw new Error(res.msg || '生成海报失败')
    }
    if (res.data?.status === 'done' && res.data?.url) {
      return res.data.url
    }
    if (res.data?.status === 'processing') {
      if (i < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL))
      }
    }
  }
  throw new Error('生成超时，请稍后重试')
}

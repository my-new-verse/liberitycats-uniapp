const splitUrlParts = (jumpUrl: string) => {
  const hashIndex = jumpUrl.indexOf('#')
  const hash = hashIndex >= 0 ? jumpUrl.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? jumpUrl.slice(0, hashIndex) : jumpUrl
  const queryIndex = withoutHash.indexOf('?')
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : ''

  return { path, query, hash }
}

const safeDecodeURIComponent = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

const parseQuery = (query: string) => {
  const params: Record<string, string> = {}
  if (!query) return params

  query.split('&').forEach((pair) => {
    if (!pair) return

    const eqIndex = pair.indexOf('=')
    const rawKey = eqIndex >= 0 ? pair.slice(0, eqIndex) : pair
    const rawValue = eqIndex >= 0 ? pair.slice(eqIndex + 1) : ''
    const key = safeDecodeURIComponent(rawKey)

    if (!key) return
    params[key] = safeDecodeURIComponent(rawValue)
  })

  return params
}

const buildQuery = (params: Record<string, string>) => {
  return Object.keys(params)
    .filter((key) => key)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key] || '')}`)
    .join('&')
}

/**
 * 将接口返回的 tempToken 写入 jumpUrl（替换已有 token 参数）
 * 使用字符串解析，兼容真机环境（不依赖 URL / URLSearchParams）
 */
export const buildGameUrlWithToken = (jumpUrl: string, tempToken: string) => {
  if (!jumpUrl) return ''
  if (!tempToken) return jumpUrl

  const { path, query, hash } = splitUrlParts(jumpUrl)
  const params = parseQuery(query)
  params.token = tempToken

  const nextQuery = buildQuery(params)
  return `${path}${nextQuery ? `?${nextQuery}` : ''}${hash}`
}

/**
 * polyfills.ts
 * 专门解决 pusher-js 等 Web 库在 App 端的环境缺失问题
 */

// #ifdef APP-PLUS
const g = globalThis as any

if (typeof g.window === 'undefined') {
  g.window = g
  g.navigator = { userAgent: 'uni-app', onLine: true }
  g.document = {
    createElement: () => ({ style: {} }),
    getElementsByTagName: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  }
  g.location = {
    protocol: 'https:',
    hostname: 'localhost',
    href: 'https://localhost',
    origin: 'https://localhost',
  }
  g.addEventListener = () => {}
  g.removeEventListener = () => {}
}
// #endif

export {}

// 字号缩放：标准/大/特大 三档
// - H5 端：applyFontScale 直接注入 --font-scale 到 documentElement
// - App 端：JS 层拿不到 DOM，由 layout 的 renderjs 在视图层注入
//   通过 uni.$emit('fontScaleChanged', mode) 通知 layout 更新
export type FontScaleMode = 'standard' | 'large' | 'xlarge'

export const FONT_SCALE_MAP: Record<FontScaleMode, number> = {
  standard: 1,
  large: 1.15,
  xlarge: 1.5,
}

/** 读取存储的字号档位，无值/非法值默认 standard */
export function getStoredFontScale(): FontScaleMode {
  const saved = uni.getStorageSync('app_font_scale')
  if (saved === 'standard' || saved === 'large' || saved === 'xlarge') return saved
  return 'standard'
}

/** 档位解析成缩放系数 */
export function resolveFontScale(mode: FontScaleMode): number {
  return FONT_SCALE_MAP[mode]
}

/** 应用字号：H5 直接注入变量；App 端由 layout renderjs 处理 */
export function applyFontScale() {
  const scale = resolveFontScale(getStoredFontScale())
  // #ifdef H5
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--font-scale', String(scale))
    // 特大档（1.5x）挂类，页面用它做溢出适配；1 倍档不挂，样式保持原样
    document.documentElement.classList.toggle('font-scale-xlarge', scale === FONT_SCALE_MAP.xlarge)
  }
  // #endif
}

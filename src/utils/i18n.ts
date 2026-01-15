import { t } from '@/locale/index'

/** 非vue 文件使用 i18n */
export const testI18n = () => {
  // 下面同样生效
  uni.showModal({
    title: t('app.name'),
    content: t('app.name'),
  })
}

/** 把uniapp i18n key 转换成服务端i18n key */
export const getServerI18nKey = () => {
  // uniapp i18n key : 服务端i18n key
  const i18nMap = {
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    en: 'en-US',
    ja: 'ja-JP',
  }
  const locale = uni.getLocale()
  if (i18nMap[locale]) {
    return i18nMap[locale]
  }
  return i18nMap.en
}

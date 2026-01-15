import { createI18n } from 'vue-i18n'

import en from './en.json'
import zhHans from './zh-Hans.json' // 简体中文
import zhHant from './zh-Hant.json'
import ja from './ja.json'

// 设置UI组件的语言包
import { Locale } from 'wot-design-uni'

import enUS from 'wot-design-uni/locale/lang/en-US'
import zhTW from 'wot-design-uni/locale/lang/zh-TW'
import zhCN from 'wot-design-uni/locale/lang/zh-CN'
import jaJP from 'wot-design-uni/locale/lang/ja-JP'

const messages = {
  en,
  'zh-Hans': zhHans, // key 不能乱写，查看截图 screenshots/i18n.png
  'zh-Hant': zhHant,
  // ja,
}

const i18n = createI18n({
  locale: uni.getLocale(), // 获取已设置的语言，fallback 语言需要再 manifest.config.ts 中设置
  legacy: false, // 使用组合式API，这个选项必须设置为false
  globalInjection: true, // 全局注入 $t 函数
  messages,
  fallbackLocale: 'en',
  allowComposition: true,
})

const langMap = {
  'zh-Hant': zhTW,
  'zh-Hans': {
    ...zhCN,
    loadmore: {
      finished: '到底了喵!',
      loading: '正在努力加载中...',
      error: '加载失败',
      retry: '点击重试',
    },
  },
  en: enUS,
  ja: jaJP,
}
Locale.use(uni.getLocale(), langMap[uni.getLocale()])
// end

/**
 * 可以拿到原始的语言模板，非 vue 文件使用这个方法，
 * @param { string } key 多语言的key，eg: "app.name"
 * @returns {string} 返回原始的多语言模板，eg: "{heavy}KG"
 */
export const getTemplateByKey = (key: string) => {
  if (!key) {
    console.error(`[i18n] Function getTemplateByKey(), key param is required`)
    return ''
  }
  const locale = uni.getLocale()
  // console.log('locale:', locale)

  const message = messages[locale] // 拿到某个多语言的所有模板（是一个对象)
  if (Object.keys(message).includes(key)) {
    return message[key]
  }

  try {
    const keyList = key.split('.')
    return keyList.reduce((pre, cur) => {
      return pre[cur]
    }, message)
  } catch (error) {
    console.error(`[i18n] Function getTemplateByKey(), key param ${key} is not existed.`)
    return ''
  }
}

/**
 * formatI18n('我是{name},身高{detail.height},体重{detail.weight}',{name:'张三',detail:{height:178,weight:'75kg'}})
 * 暂不支持数组
 * @param template 多语言模板字符串，eg: `我是{name}`
 * @param {Object|undefined} data 需要传递的数据对象，里面的key与多语言字符串对应，eg: `{name:'菲鸽'}`
 * @returns
 */
export const formatI18n = (template: string, data?: any) => {
  if (!template) return ''
  if (!data) return template

  return template.replace(/\{([^}]+)\}/g, (match, key) => {
    const keys = key.split('.')
    let value = data
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) break
    }
    return value !== undefined ? value : match
  })
}

/**
 * t('introduction',{name:'张三',detail:{height:178,weight:'75kg'}})
 * => formatI18n('我是{name},身高{detail.height},体重{detail.weight}',{name:'张三',detail:{height:178,weight:'75kg'}})
 * 没有key的，可以不传 data；暂不支持数组
 * @param template 多语言模板字符串，eg: `我是{name}`
 * @param {Object|undefined} data 需要传递的数据对象，里面的key与多语言字符串对应，eg: `{name:'菲鸽'}`
 * @returns
 */
export const t = (key: string, data?: any) => {
  const template = getTemplateByKey(key)
  return formatI18n(template, data)
}
export default i18n

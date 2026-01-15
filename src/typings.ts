// 全局要用的类型放到这里

type IResData<T> = {
  code: number
  msg: string
  data: T
}

// uni.uploadFile文件上传参数
type IUniUploadFileOptions = {
  file?: File
  files?: UniApp.UploadFileOptionFiles[]
  filePath?: string
  name?: string
  formData?: any
}

type ILevelInfo = {
  name: string
  icon: string
  level: number
}

type IUserInfo = {
  nickname?: string
  avatar?: string
  level?: ILevelInfo
  wallet_address?: string
  /** 微信的 openid，非微信没有这个字段 */
  openid?: string
  token?: string
  currency_unit?: string
  member_id?: number
  login_account?: string
  login_account_is_real_mail?: number
  show_switch_virtual_account: number // 是否显示切换虚拟邮箱
  show_add_virtual_account: number // 是否显示添加虚拟邮箱
  bind_ar: {
    open_id: string
    third_open_id: string
    temp_code: string
  }
}

type currency = {
  icon: string
  name: string
  symbol: string
  unit: string
}

enum TestEnum {
  A = 'a',
  B = 'b',
}

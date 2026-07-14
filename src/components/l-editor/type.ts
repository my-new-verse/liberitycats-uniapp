/** 编辑器内容模型 */
export interface ParsedModel {
  type: 'text' | 'ate' | 'tag' | 'image'
  id?: number | string
  value: string
}

/** 光标位置与操作类型 */
export interface Cursor {
  index: number
  action: 'insert' | 'delete' | 'move' | 'other'
}

/** @/# 面板选择项 */
export interface AtomSelectItem {
  name: string
  id: number | string
}

/** 编辑器值快照 */
export interface EditorValue {
  model: ParsedModel[]
  message: string
  num: number
  ateUsers: { value: string; id: number | string }[]
  tags: { value: string; id: number | string }[]
}

export interface EditorSearchPayload {
  type: 'ate' | 'tag'
  trigger: '@' | '#'
  keyword: string
  content: string
}

export interface EditorInputPayload {
  data: string | null
  inputType?: string
  trigger?: '@' | '#'
  keyword?: string
  cursorIndex?: number
}

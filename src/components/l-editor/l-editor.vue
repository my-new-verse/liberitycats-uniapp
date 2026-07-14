<template>
  <view class="l-editor">
    <!-- 非小程序：renderjs 编辑器 -->
    <!-- #ifdef H5 || APP -->
    <slot
      name="at"
      :show="ateParams.show"
      :keyword="ateParams.keyword"
      :content="ateParams.content"
      :onSelect="insertAt"
      :close="closeAtPanel"
    />
    <slot
      name="hot"
      :show="hotParams.show"
      :keyword="hotParams.keyword"
      :content="hotParams.content"
      :onSelect="insertHot"
      :close="closeHotPanel"
    />
    <view class="editor-wrap">
      <Editorial
        class="editor"
        ref="refEditorial"
        :placeholder="placeholder"
        :disabled="props.disabled"
        @json-model="onJsonModel"
        @cursor="onCursorChange"
        @onHandleInput="onHandleInput"
      />
      <view class="tools">
        <view
          v-show="message.num > 0"
          :class="['text-num', { 'text-num--warn': message.num > maxLimit }]"
        >
          {{ message.num }} / {{ maxLimit }}
        </view>
        <view :class="btnClass" @click.stop="send">
          {{ isSending ? '发送中...' : props.sendText }}
        </view>
      </view>
    </view>
    <slot name="emoji" :show="emojiParams.show" :onSelect="insertEmoji" :close="closeEmojiPanel" />
    <!-- #endif -->

    <!-- 小程序：textarea 降级 -->
    <!-- #ifdef MP -->
    <slot
      name="at"
      :show="mpAtShow"
      :keyword="mpAtKeyword"
      :onSelect="mpInsertAt"
      :close="mpClosePanel"
    />
    <slot
      name="hot"
      :show="mpHotShow"
      :keyword="mpHotKeyword"
      :onSelect="mpInsertHot"
      :close="mpClosePanel"
    />
    <view class="editor-wrap">
      <!-- 富文本标签预览区：显示已插入的 @ / # / 图片标签 -->
      <view v-if="mpAtoms.length > 0" class="mp-atoms">
        <view v-for="(a, i) in mpAtoms" :key="i" class="mp-atom-chip" @click="mpRemoveAtom(i)">
          <text v-if="a.type === 'image'" class="mp-atom--image">[图片]</text>
          <text v-else :class="a.type === 'ate' ? 'mp-atom--ate' : 'mp-atom--tag'">
            {{ a.value }}
          </text>
          <text class="mp-atom-close">×</text>
        </view>
      </view>
      <textarea
        class="mp-textarea"
        :value="mpTextValue"
        :placeholder="placeholder"
        :maxlength="maxLimit"
        :disabled="props.disabled"
        :adjust-position="true"
        :auto-height="true"
        @input="mpOnTextInput"
        @focus="mpOnFocus"
        @blur="mpOnBlur"
      />
      <view class="tools">
        <view
          v-show="message.num > 0"
          :class="['text-num', { 'text-num--warn': message.num > maxLimit }]"
        >
          {{ message.num }} / {{ maxLimit }}
        </view>
        <view :class="btnClass" @click.stop="send">
          {{ isSending ? '发送中...' : props.sendText }}
        </view>
      </view>
    </view>
    <slot
      name="emoji"
      :show="mpEmojiShow"
      :onSelect="(e: any) => mpInsertEmoji(e)"
      :close="mpClosePanel"
    />
    <!-- #endif -->
  </view>
</template>

<script lang="ts" setup>
// #ifdef H5 || APP
import Editorial from './editorial.vue'
// #endif
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ParsedModel } from './type'

// Props
interface Props {
  modelValue?: ParsedModel[]
  placeholder?: string
  maxNum?: number
  loading?: boolean
  disabled?: boolean
  clearOnSend?: boolean
  sendText?: string
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  placeholder: '说点什么...',
  maxNum: 300,
  loading: false,
  disabled: false,
  clearOnSend: true,
  sendText: '发送',
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [model: ParsedModel[]]
  change: [data: { model: ParsedModel[]; message: string; num: number }]
  send: [
    data: {
      model: ParsedModel[]
      message: string
      num: number
      ateUsers: { value: string; id: number | string }[]
      tags: { value: string; id: number | string }[]
    },
  ]
  'search-change': [
    data: { type: 'ate' | 'tag'; trigger: '@' | '#'; keyword: string; content: string },
  ]
  input: [data: { model: ParsedModel[]; message: string; num: number }]
}>()

// 状态
// #ifdef H5 || APP
const refEditorial = ref()
let lastValidModel: ParsedModel[] = []
// #endif
const sending = ref(false)
const syncing = ref(false)
let skipWatch = false
const message = reactive({ model: [] as ParsedModel[], message: '', num: 0 })
const maxLimit = computed(() => props.maxNum)
const isSending = computed(() => props.loading || sending.value)
const canSend = computed(
  () => message.num > 0 && message.num <= maxLimit.value && !isSending.value && !props.disabled,
)
const btnClass = computed(() => [
  'send-btn',
  {
    'send-btn--active': canSend.value,
    'send-btn--sending': isSending.value,
    'send-btn--disabled': props.disabled,
  },
])

// setTimeout 清理
let sendTimer: ReturnType<typeof setTimeout> | null = null
onBeforeUnmount(() => {
  if (sendTimer) clearTimeout(sendTimer)
})

// H5/APP：@/#/emoji 面板状态
// #ifdef H5 || APP
let cursorIndex = 0
const ateParams = reactive({ content: '', keyword: '', start: -1, show: false })
const hotParams = reactive({ content: '', keyword: '', start: -1, show: false })
const emojiParams = reactive({ show: false })
// #endif

// 小程序：降级状态
// #ifdef MP
const mpTextValue = ref('')
const mpAtoms = ref<{ type: 'ate' | 'tag' | 'image'; value: string; id?: number | string }[]>([])
const mpAtShow = ref(false)
const mpHotShow = ref(false)
const mpEmojiShow = ref(false)
let mpFocused = false
// #endif

// 数据工具
const normalize = (m?: ParsedModel[]) => (Array.isArray(m) ? m : [])

/**
 * 消息编码
 */
const encodeMessage = (model: ParsedModel[]) => {
  let msg = ''
  const ateUsers: { value: string; id: number | string }[] = []
  const tags: { value: string; id: number | string }[] = []
  let num = 0

  model.forEach((item) => {
    if (!item) return
    if (item.type === 'text') {
      msg += item.value
      num += item.value.length
    } else if (item.type === 'ate') {
      ateUsers.push({ value: item.value, id: item.id! })
      msg += `⁣{at_${ateUsers.length - 1}}⁣`
      num += (item.value || '').length
    } else if (item.type === 'tag') {
      tags.push({ value: item.value, id: item.id! })
      msg += `⁣{tag_${tags.length - 1}}⁣`
      num += (item.value || '').length
    } else if (item.type === 'image') {
      msg += '⁣{image}⁣'
      num += 1
    }
  })

  return { message: msg, num, ateUsers, tags }
}

const updateMessage = (model: ParsedModel[], shouldEmit = true) => {
  const normalized = normalize(model)
  const encoded = encodeMessage(normalized)
  message.model = normalized
  message.message = encoded.message
  message.num = encoded.num
  if (shouldEmit) {
    emit('update:modelValue', normalized)
    emit('change', { model: normalized, message: encoded.message, num: encoded.num })
    emit('input', { model: normalized, message: encoded.message, num: encoded.num })
  }
}

const getValue = () => {
  const encoded = encodeMessage(message.model)
  return {
    model: message.model,
    message: encoded.message,
    num: encoded.num,
    ateUsers: encoded.ateUsers,
    tags: encoded.tags,
  }
}

const isSame = (a: ParsedModel[], b: ParsedModel[]) => JSON.stringify(a) === JSON.stringify(b)

// H5/APP：@/# 面板触发
// #ifdef H5 || APP
const emitSearch = (type: 'ate' | 'tag') => {
  const p = type === 'ate' ? ateParams : hotParams
  emit('search-change', {
    type,
    trigger: type === 'ate' ? '@' : '#',
    keyword: p.keyword,
    content: p.content,
  })
}

const onCursorChange = (data: { index: number }) => {
  cursorIndex = data.index
}
const onJsonModel = (data: ParsedModel[]) => {
  const encoded = encodeMessage(normalize(data))
  // 超过字数限制时，回退到上一个有效状态
  if (encoded.num > maxLimit.value) {
    skipWatch = true
    updateMessage(lastValidModel, true)
    nextTick(() => {
      refEditorial.value?.setModel?.(lastValidModel)
      skipWatch = false
    })
    return
  }
  lastValidModel = JSON.parse(JSON.stringify(data))
  updateMessage(data, !syncing.value)
}

const onHandleInput = (value: string) => {
  // 初始状态：检测 @ 或 # 触发
  if (ateParams.start === -1 && hotParams.start === -1) {
    if (value === '@') {
      ateParams.start = cursorIndex
      ateParams.show = true
      ateParams.content = '@'
      ateParams.keyword = ''
      hotParams.show = false
      return emitSearch('ate')
    }
    if (value === '#') {
      hotParams.start = cursorIndex
      hotParams.show = true
      hotParams.content = '#'
      hotParams.keyword = ''
      ateParams.show = false
      return emitSearch('tag')
    }
  }

  // @ 激活状态
  if (ateParams.show) {
    if (cursorIndex <= ateParams.start) return closeAtPanel()
    if (value) {
      ateParams.content += value
      ateParams.keyword += value
    } else {
      cursorIndex--
      ateParams.content = ateParams.content.slice(0, -1)
      ateParams.keyword = ateParams.keyword.slice(0, -1)
    }
    return emitSearch('ate')
  }

  // # 激活状态
  if (hotParams.show) {
    if (cursorIndex <= hotParams.start) return closeHotPanel()
    if (value) {
      hotParams.content += value
      hotParams.keyword += value
    } else {
      cursorIndex--
      hotParams.content = hotParams.content.slice(0, -1)
      hotParams.keyword = hotParams.keyword.slice(0, -1)
    }
    return emitSearch('tag')
  }
}

const insertAt = (data: { name: string; id: number | string }) => {
  refEditorial.value?.replaceWithAtom({
    delText: ateParams.start !== -1 ? ateParams.content : '',
    atom: { type: 'ate', value: data.name, id: data.id },
  })
  closeAtPanel()
}
const closeAtPanel = () =>
  Object.assign(ateParams, { show: false, start: -1, content: '', keyword: '' })

const insertHot = (data: { name: string; id: number | string }) => {
  refEditorial.value?.replaceWithAtom({
    delText: hotParams.start !== -1 ? hotParams.content : '',
    atom: { type: 'tag', value: data.name, id: data.id },
  })
  closeHotPanel()
}
const closeHotPanel = () =>
  Object.assign(hotParams, { show: false, start: -1, content: '', keyword: '' })

const insertEmoji = (data: { value: string }) => {
  refEditorial.value?.onAtomChange?.({ type: 'text', value: data.value })
  closeEmojiPanel()
}
const closeEmojiPanel = () => Object.assign(emojiParams, { show: false })
// #endif

// 小程序
// #ifdef MP
const mpPrevText = ref('')
const mpAtTriggerIndex = ref(-1) // @ 触发位置
const mpHotTriggerIndex = ref(-1) // # 触发位置
const mpAtKeyword = ref('')
const mpHotKeyword = ref('')

const mpBuildModelFromAtoms = (): ParsedModel[] => {
  const model: ParsedModel[] = []

  if (mpTextValue.value.trim().length > 0) {
    model.push({ type: 'text', value: mpTextValue.value })
  }
  mpAtoms.value.forEach((a) => {
    model.push({ type: a.type, value: a.value, id: a.id })
  })

  return model
}

const mpRebuildFromTextAtoms = () => {
  const model = mpBuildModelFromAtoms()
  updateMessage(model, true)
}

const mpOnTextInput = (e: any) => {
  const newValue: string = e.detail?.value ?? e.target?.value ?? ''
  const prev = mpPrevText.value

  // 找出本次新增的字符
  if (newValue.length > prev.length && newValue.startsWith(prev)) {
    const inserted = newValue.slice(prev.length)

    // 逐字符处理新增内容——检测 @ / # 触发
    for (let i = 0; i < inserted.length; i++) {
      const ch = inserted[i]

      // 检测 @ 触发——且不在已有面板激活状态
      if (ch === '@' && !mpAtShow.value && !mpHotShow.value) {
        mpAtShow.value = true
        mpHotShow.value = false
        mpEmojiShow.value = false
        // 触发位置 = 之前长度 + 当前位置（含 @ 本身之前）
        mpAtTriggerIndex.value = prev.length + i
        mpAtKeyword.value = ''
        emit('search-change', { type: 'ate', trigger: '@', keyword: '', content: '@' })
      } else if (ch === '#' && !mpHotShow.value && !mpAtShow.value) {
        mpHotShow.value = true
        mpAtShow.value = false
        mpEmojiShow.value = false
        mpHotTriggerIndex.value = prev.length + i
        mpHotKeyword.value = ''
        emit('search-change', { type: 'tag', trigger: '#', keyword: '', content: '#' })
      } else if (mpAtShow.value) {
        // @ 面板激活中——累积关键字
        mpAtKeyword.value += ch
        emit('search-change', {
          type: 'ate',
          trigger: '@',
          keyword: mpAtKeyword.value,
          content: '@' + mpAtKeyword.value,
        })
      } else if (mpHotShow.value) {
        mpHotKeyword.value += ch
        emit('search-change', {
          type: 'tag',
          trigger: '#',
          keyword: mpHotKeyword.value,
          content: '#' + mpHotKeyword.value,
        })
      }
    }
  } else {
    if (!mpAtShow.value && !mpHotShow.value && newValue.length > prev.length) {
      let prefixLen = 0
      while (prefixLen < prev.length && prev[prefixLen] === newValue[prefixLen]) prefixLen++
      let suffixLen = 0
      while (
        suffixLen < prev.length - prefixLen &&
        prev[prev.length - 1 - suffixLen] === newValue[newValue.length - 1 - suffixLen]
      )
        suffixLen++
      const inserted = newValue.slice(prefixLen, newValue.length - suffixLen)
      const triggerPos = prefixLen

      for (let i = 0; i < inserted.length; i++) {
        const ch = inserted[i]
        if (ch === '@' && !mpAtShow.value && !mpHotShow.value) {
          mpAtShow.value = true
          mpHotShow.value = false
          mpEmojiShow.value = false
          mpAtTriggerIndex.value = triggerPos + i
          mpAtKeyword.value = ''
          emit('search-change', { type: 'ate', trigger: '@', keyword: '', content: '@' })
        } else if (ch === '#' && !mpHotShow.value && !mpAtShow.value) {
          mpHotShow.value = true
          mpAtShow.value = false
          mpEmojiShow.value = false
          mpHotTriggerIndex.value = triggerPos + i
          mpHotKeyword.value = ''
          emit('search-change', { type: 'tag', trigger: '#', keyword: '', content: '#' })
        } else if (mpAtShow.value) {
          mpAtKeyword.value += ch
          emit('search-change', {
            type: 'ate',
            trigger: '@',
            keyword: mpAtKeyword.value,
            content: '@' + mpAtKeyword.value,
          })
        } else if (mpHotShow.value) {
          mpHotKeyword.value += ch
          emit('search-change', {
            type: 'tag',
            trigger: '#',
            keyword: mpHotKeyword.value,
            content: '#' + mpHotKeyword.value,
          })
        }
      }
    }

    // 面板激活中
    if (mpAtShow.value && newValue.length <= mpAtTriggerIndex.value) {
      mpClosePanel()
    } else if (mpHotShow.value && newValue.length <= mpHotTriggerIndex.value) {
      mpClosePanel()
    }
    // 面板激活中但文本变了
    if (mpAtShow.value && newValue.length > mpAtTriggerIndex.value) {
      mpAtKeyword.value = newValue.slice(mpAtTriggerIndex.value + 1) // +1 跳过 @ 本身
      emit('search-change', {
        type: 'ate',
        trigger: '@',
        keyword: mpAtKeyword.value,
        content: '@' + mpAtKeyword.value,
      })
    }
    if (mpHotShow.value && newValue.length > mpHotTriggerIndex.value) {
      mpHotKeyword.value = newValue.slice(mpHotTriggerIndex.value + 1)
      emit('search-change', {
        type: 'tag',
        trigger: '#',
        keyword: mpHotKeyword.value,
        content: '#' + mpHotKeyword.value,
      })
    }
  }

  mpPrevText.value = newValue
  mpTextValue.value = newValue
  mpRebuildFromTextAtoms()
}

const mpOnFocus = () => {
  mpFocused = true
}
const mpOnBlur = () => {
  mpFocused = false
}

/**
 * @面板选择后
 */
const mpInsertAt = (data: { name: string; id: number | string }) => {
  if (!mpAtShow.value) return

  // 删除从触发位置到当前光标/末尾的 @keyword 文本
  const prefixLen = 1 + mpAtKeyword.value.length // @ + keyword
  const before = mpTextValue.value.slice(0, mpAtTriggerIndex.value)
  const after = mpTextValue.value.slice(mpAtTriggerIndex.value + prefixLen)
  mpTextValue.value = before + after
  mpPrevText.value = mpTextValue.value

  mpAtoms.value.push({ type: 'ate', value: '@' + data.name, id: data.id })
  mpRebuildFromTextAtoms()
  mpClosePanel()
}

const mpInsertHot = (data: { name: string; id: number | string }) => {
  if (!mpHotShow.value) return

  const prefixLen = 1 + mpHotKeyword.value.length
  const before = mpTextValue.value.slice(0, mpHotTriggerIndex.value)
  const after = mpTextValue.value.slice(mpHotTriggerIndex.value + prefixLen)
  mpTextValue.value = before + after
  mpPrevText.value = mpTextValue.value

  mpAtoms.value.push({ type: 'tag', value: '#' + data.name, id: data.id })
  mpRebuildFromTextAtoms()
  mpClosePanel()
}

const mpInsertEmoji = (data: { value: string }) => {
  mpTextValue.value += data.value
  mpPrevText.value = mpTextValue.value
  mpRebuildFromTextAtoms()
  mpClosePanel()
}

const mpRemoveAtom = (index: number) => {
  mpAtoms.value.splice(index, 1)
  mpRebuildFromTextAtoms()
}

const mpClosePanel = () => {
  mpAtShow.value = false
  mpHotShow.value = false
  mpEmojiShow.value = false
  mpAtTriggerIndex.value = -1
  mpHotTriggerIndex.value = -1
  mpAtKeyword.value = ''
  mpHotKeyword.value = ''
}

// #endif

// 发送（跨平台统一）
const send = () => {
  if (isSending.value || props.disabled) return
  if (message.num === 0) return uni.showToast({ title: '请输入内容', icon: 'none' })
  if (message.num > maxLimit.value)
    return uni.showToast({ title: `字数超过限制(${maxLimit.value}字)`, icon: 'none' })
  sending.value = true
  emit('send', getValue())
  if (props.clearOnSend) clear()
  if (!props.loading) {
    sendTimer = setTimeout(() => {
      sending.value = false
    }, 300)
  }
}

const clear = () => {
  // #ifdef H5 || APP
  refEditorial.value?.setDelMsgEmpty()
  closeAtPanel()
  closeHotPanel()
  // #endif
  // #ifdef MP
  mpTextValue.value = ''
  mpPrevText.value = ''
  mpAtoms.value = []
  mpClosePanel()
  // #endif
  updateMessage([], true)
}

// 暴露方法
const setValue = (model: ParsedModel[]) => {
  const n = normalize(model)
  syncing.value = true
  updateMessage(n, true)
  // #ifdef H5 || APP
  lastValidModel = JSON.parse(JSON.stringify(n))
  nextTick(() => {
    refEditorial.value?.setModel?.(n)
  })
  // #endif
  // #ifdef MP
  const texts: string[] = []
  const atoms: typeof mpAtoms.value = []
  n.forEach((m) => {
    if (m.type === 'text') texts.push(m.value)
    else if (m.type === 'ate' || m.type === 'tag') {
      const prefix = m.type === 'ate' ? '@' : '#'
      const val = (m.value || '').startsWith(prefix) ? m.value : prefix + (m.value || '')
      atoms.push({ type: m.type, value: val, id: m.id! })
    }
  })
  mpTextValue.value = texts.join('')
  mpAtoms.value = atoms
  mpPrevText.value = mpTextValue.value
  // #endif
  setTimeout(() => {
    syncing.value = false
  }, 200)
}

const insertAtom = (atom: { type: string; value: string; id?: number | string }) => {
  // #ifdef H5 || APP
  refEditorial.value?.onAtomChange?.(atom)
  // #endif
  // #ifdef MP
  if (atom.type === 'text') {
    mpTextValue.value += atom.value
  } else if (atom.type === 'ate' || atom.type === 'tag') {
    const prefix = atom.type === 'ate' ? '@' : '#'
    const val = (atom.value || '').startsWith(prefix) ? atom.value : prefix + (atom.value || '')
    mpAtoms.value.push({ type: atom.type as 'ate' | 'tag', value: val, id: atom.id! })
  } else if (atom.type === 'image') {
    mpAtoms.value.push({ type: 'image', value: atom.value, id: atom.id })
  }
  mpRebuildFromTextAtoms()
  // #endif
}
const insertText = (text: string) => insertAtom({ type: 'text', value: text })
const insertImage = (url: string, id?: number | string) =>
  insertAtom({ type: 'image', value: url, id })

defineExpose({
  // #ifdef H5 || APP
  focus: () => refEditorial.value?.setFocus(),
  // #endif
  // #ifdef MP
  focus: () => {
    /* textarea 自动获焦，无需额外操作 */
  },
  // #endif
  clear,
  getValue,
  setValue,
  insertAtom,
  insertText,
  insertImage,
  // #ifdef H5 || APP
  insertHot: (data: { name: string; id: number | string }) => {
    refEditorial.value?.replaceWithAtom({
      delText: hotParams.start !== -1 ? hotParams.content : '',
      atom: { type: 'tag', value: data.name, id: data.id },
    })
    closeHotPanel()
  },
  closeHotPanel,
  // #endif
})

// loading prop 监听
watch(
  () => props.loading,
  (val) => {
    if (!val && sending.value) sending.value = false
  },
)

// v-model 双向绑定
watch(
  () => props.modelValue,
  (value) => {
    if (value === undefined) return
    const n = normalize(value)
    if (isSame(n, message.model)) return
    if (skipWatch) return
    syncing.value = true
    updateMessage(n, false)
    // #ifdef H5 || APP
    lastValidModel = JSON.parse(JSON.stringify(n))
    nextTick(() => {
      refEditorial.value?.setModel?.(n)
    })
    // #endif
    // #ifdef MP
    const texts: string[] = []
    const atoms: typeof mpAtoms.value = []
    n.forEach((m) => {
      if (m.type === 'text') texts.push(m.value)
      else if (m.type === 'ate' || m.type === 'tag') {
        const prefix = m.type === 'ate' ? '@' : '#'
        const val = (m.value || '').startsWith(prefix) ? m.value : prefix + (m.value || '')
        atoms.push({ type: m.type, value: val, id: m.id! })
      }
    })
    mpTextValue.value = texts.join('')
    mpAtoms.value = atoms
    mpPrevText.value = mpTextValue.value
    // #endif
    setTimeout(() => {
      syncing.value = false
    }, 200)
  },
  { deep: true, immediate: true },
)
</script>

<style lang="scss" scoped>
.l-editor {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--l-editor-bg, #fff);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.05);
  z-index: 999;
  padding-bottom: env(safe-area-inset-bottom);
  transition: bottom 0.15s ease-out;
}

.editor-wrap {
  padding: 16rpx 0;
}

.tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16rpx;
}

.text-num {
  font-size: 24rpx;
  color: var(--l-editor-text-muted, #999);
  transition: color 0.3s;

  &--warn {
    color: var(--l-editor-danger, #f56c6c);
    font-weight: bold;
  }
}

.send-btn {
  padding: 10rpx 40rpx;
  background-color: var(--l-editor-btn-disabled-bg, #e0e0e0);
  color: var(--l-editor-btn-disabled-color, #999);
  border-radius: 32rpx;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.3s;
  user-select: none;

  &--active {
    background-color: var(--l-editor-primary, #07c160);
    color: var(--l-editor-btn-active-color, #fff);
    &:active {
      opacity: 0.8;
    }
  }

  &--sending {
    background-color: var(--l-editor-primary, #07c160);
    color: var(--l-editor-btn-active-color, #fff);
    opacity: 0.7;
    pointer-events: none;
  }

  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

// 小程序端样式
.mp-atoms {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.mp-atom-chip {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 8rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  gap: 4rpx;
}

.mp-atom--ate {
  color: var(--l-editor-link, #09408e);
  background: rgba(9, 64, 142, 0.08);
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
}

.mp-atom--tag {
  color: var(--l-editor-primary, #07c160);
  background: rgba(7, 193, 96, 0.08);
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
}

.mp-atom-close {
  color: #999;
  font-size: 28rpx;
  line-height: 1;
  padding: 0 4rpx;
}

.mp-textarea {
  width: 100%;
  min-height: 72rpx;
  max-height: 240rpx;
  font-size: 28rpx;
  color: var(--l-editor-text, #333);
  background: transparent;
  box-sizing: border-box;
}

.mp-atom--image {
  color: #999;
  font-style: italic;
}
</style>

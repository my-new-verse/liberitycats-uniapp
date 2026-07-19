<template>
  <!-- @vue-ignore -->
  <div
    id="editable"
    ref="editorRef"
    class="editable"
    :class="{ 'editable--disabled': disabled }"
    :contenteditable="disabled ? 'false' : 'true'"
    :placeholder="placeholder"
    :data-uid="uid"
    :action="renderAction"
    :change:action="editorModule.handleRenderAction"
  ></div>
</template>

<script lang="ts">
import { type ParsedModel, type Cursor } from './type'
import { defineComponent, ref, getCurrentInstance } from 'vue'

export default defineComponent({
  name: 'RichEditor',
  props: {
    placeholder: { type: String, default: '说点什么...' },
    disabled: { type: Boolean, default: false },
  },
  emits: {
    'json-model': (value: ParsedModel[]) => true,
    onHandleInput: (value: any) => true,
    cursor: (value: Cursor) => true,
  },
  setup(props, { emit }) {
    const renderAction = ref<any>(null)
    const instance = getCurrentInstance()
    const uid = `l-editor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

    // 动作分发器
    const dispatchAction = (actionType: string, payload?: any) => {
      renderAction.value = { actionType, payload, _t: Date.now() }
    }

    // 统一跨端方法调用
    const callMethod = (method: string, payload?: any) => {
      // #ifdef APP
      dispatchAction(method, payload)
      // #endif
      // #ifndef APP
      ;(instance?.proxy as any)?.[method]?.(payload)
      // #endif
    }

    const notifyModel = (m: ParsedModel[]) => emit('json-model', m || [])
    const changeCursor = (d: Cursor) => emit('cursor', d)
    const onHandleInput = (d: any) => emit('onHandleInput', d)

    return {
      uid,
      renderAction,
      notifyModel,
      changeCursor,
      onHandleInput,
      onAtomChange: (data: any) => callMethod('rj_onAtomChange', data),
      setDelMsg: (text: string) => callMethod('rj_setDelMsg', text),
      setDelMsgEmpty: () => callMethod('rj_setDelMsgEmpty'),
      setFocus: () => callMethod('rj_setFocus'),
      replaceWithAtom: (data: { delText?: string; atom: any }) =>
        callMethod('rj_replaceWithAtom', data),
      setModel: (data: ParsedModel[]) => callMethod('rj_setModel', data),
    }
  },
})
</script>

<script module="editorModule" lang="renderjs">
export default {
  data() {
    return { isComposing: false };
  },
  mounted() {
    const uid = this.$ownerInstance?.$el?.getAttribute?.("data-uid") || this.$ownerInstance?.$el?.dataset?.uid;
    this.uid = uid;
    this.editable = document.querySelector(`[data-uid="${uid}"]`);
    if (!this.editable) {
      const fallback = document.querySelector(".editable");
      if (fallback) this.editable = fallback;
    }
    if (!this.editable) return;
    this.owner = this.$ownerInstance;

    // 组合输入（中文输入法）状态跟踪
    this._onCompositionStart = () => (this.isComposing = true);
    this._onCompositionEnd   = (e) => { this.isComposing = false; this.onInput(e); };

    // 原生事件监听
    this._onInput     = (e) => this.onInput(e);
    this._onKeydown   = (e) => this.onKeydown(e);
    this._onPaste     = (e) => this.onPaste(e);
    this._onMouseDown = (e) => this.onMouseDown(e);
    this._onKeyup     = (e) => this.onKeyup(e);

    this.editable.addEventListener("compositionstart", this._onCompositionStart);
    this.editable.addEventListener("compositionend",   this._onCompositionEnd);
    this.editable.addEventListener("input",            this._onInput);
    this.editable.addEventListener("keydown",          this._onKeydown);
    this.editable.addEventListener("paste",            this._onPaste);
    this.editable.addEventListener("mousedown",        this._onMouseDown);
    this.editable.addEventListener("keyup",            this._onKeyup);
    this._onTouchStart = (e) => {
      setTimeout(() => this.updateCaretInfo("move"), 0);
    };
    this.editable.addEventListener("touchstart", this._onTouchStart);
  },
  beforeDestroy() {
    if (!this.editable) return;
    this.editable.removeEventListener("compositionstart", this._onCompositionStart);
    this.editable.removeEventListener("compositionend",   this._onCompositionEnd);
    this.editable.removeEventListener("input",            this._onInput);
    this.editable.removeEventListener("keydown",          this._onKeydown);
    this.editable.removeEventListener("paste",            this._onPaste);
    this.editable.removeEventListener("mousedown",        this._onMouseDown);
    this.editable.removeEventListener("keyup",            this._onKeyup);
    this.editable.removeEventListener("touchstart",       this._onTouchStart);
    this.editable = null;
    this.owner = null;
  },
  methods: {
    // 跨层通信
    handleRenderAction(newVal) {
      if (!newVal?.actionType) return;
      if (typeof this[newVal.actionType] === "function") {
        this[newVal.actionType](newVal.payload);
      }
    },

    // 光标与选区工具
    updateCaretInfo(action = "other") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !this.owner) return;
      const range = sel.getRangeAt(0);
      let cursorIndex = 0;
      const walker = document.createTreeWalker(this.editable, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === range.startContainer) { cursorIndex += range.startOffset; break; }
        cursorIndex += (node.textContent || "").length;
      }
      if (typeof this.owner.callMethod === "function") {
        this.owner.callMethod("changeCursor", { index: cursorIndex, action });
      }
    },

    // 光标移到内容末尾，确保键盘弹出时光标可见
    placeCaretToEnd(el) {
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    },

    // 光标移到指定节点后面
    setCaretAfter(node) {
      // 节点已从 DOM 中移除，无法定位光标
      if (!node || !node.parentNode) return;
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        if (this.editable && typeof this.editable.focus === "function") this.editable.focus();
      } catch (e) {
        // 降级处理：光标移到末尾
        this.placeCaretToEnd(this.editable);
      }
    },

    // 获取 editable 内的选区
    getEditableRange() {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        if (this.editable && this.editable.contains(r.startContainer)) return r;
      }
      return null;
    },

    // 获取当前选区（不限 editable 内）
    getSelectionRange() {
      const sel = window.getSelection();
      return sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    },

    // 恢复保存的选区
    restoreRange(range) {
      try {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        if (this.editable && typeof this.editable.focus === "function") this.editable.focus();
      } catch (e) {}
    },

    // Atom 节点创建
    createTextAtom(text, type, id) {
      const el = document.createElement("view");
      el.className = "atom text-atom";
      el.setAttribute("data-type", type);
      el.setAttribute("contenteditable", "false");
      el.setAttribute("tabindex", "-1");
      if (id != null) {
        el.setAttribute("data-id", id);
        el.setAttribute(`data-${type}-id`, id);
      }
      el.innerText = text;
      return el;
    },

    // 创建图片原子
    createImageAtom(url, id) {
      const img = document.createElement("img");
      img.setAttribute("src", url);
      img.setAttribute("contenteditable", "false");
      img.className = "atom-wrapper atom image-atom";
      img.setAttribute("data-type", "image");
      img.setAttribute("draggable", "false");
      if (id != null) img.setAttribute("data-id", id);
      return img;
    },

    // 节点插入
    insertNodeAtCursor(node) {
      const sel = window.getSelection();
      // DocumentFragment 插入后子节点会被移走，需记录最后一个子节点用于定位光标
      const isFragment = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
      const lastChild = isFragment && node.lastChild ? node.lastChild : node;

      if (!sel || sel.rangeCount === 0) {
        this.editable.appendChild(node);
        this.setCaretAfter(lastChild);
        return;
      }
      const range = sel.getRangeAt(0);
      range.deleteContents();
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const tn = range.startContainer;
        const off = range.startOffset;
        if (off > 0 && off < (tn.textContent || "").length) {
          tn.parentNode.insertBefore(node, tn.splitText(off));
        } else if (off === (tn.textContent || "").length) {
          tn.nextSibling
            ? tn.parentNode.insertBefore(node, tn.nextSibling)
            : tn.parentNode.appendChild(node);
        } else {
          tn.parentNode.insertBefore(node, tn);
        }
      } else {
        range.insertNode(node);
      }
      this.setCaretAfter(lastChild);
    },

    insertZWSAfter(node) {
      const zws = document.createTextNode("​");
      if (node.parentNode) node.parentNode.insertBefore(zws, node.nextSibling);
      this.setCaretAfter(zws);
    },

    insertBlankAfter(node) {
      const blank = document.createTextNode(" ");
      if (node.parentNode) node.parentNode.insertBefore(blank, node.nextSibling);
      this.setCaretAfter(blank);
    },

    rj_onAtomChange(newVal) {
      if (!newVal) return;
      let atom = null;
      if (newVal.type === "ate") {
        atom = this.createTextAtom(newVal.value ? `@${newVal.value}` : "@", "ate", newVal.id);
      } else if (newVal.type === "tag") {
        atom = this.createTextAtom(newVal.value ? `#${newVal.value}` : "#", "tag", newVal.id);
      } else if (newVal.type === "image") {
        atom = this.createImageAtom(newVal.value || "", newVal.id);
      } else {
        const val = newVal.value || "";
        if (val === "@" || val === "#") this.onInput({ data: val });
        return this.insertText(val);
      }
      if (atom) {
        this.insertNodeAtCursor(atom);
        this.insertZWSAfter(atom);
        this.insertBlankAfter(atom);
        this.parseModelAndNotify();
      }
    },

    rj_setFocus() {
      let tries = 0;
      const uid = this.uid;
      const maxTries = 5;
      const attempt = () => {
        tries++;
        const el = this.editable || (uid ? document.querySelector(`[data-uid="${uid}"]`) : document.getElementById("editable"));
        if (el) {
          this.editable = el;
          el.focus();
          this.placeCaretToEnd(el);
          if (document.activeElement === el) return;
        }
        if (tries < maxTries) setTimeout(attempt, 30);
      };
      attempt();
    },

    rj_setDelMsg(text) {
      if (!text || !this.editable) return;
      const atoms = this.editable.querySelectorAll('[data-type="ate"],[data-type="tag"]');
      for (const atom of atoms) {
        const atomText = atom.innerText || "";
        if (atomText === `@${text}` || atomText === text || atomText === `#${text}`) {
          const prev = atom.previousSibling;
          const next = atom.nextSibling;
          atom.parentNode.removeChild(atom);
          if (prev && prev.nodeType === Node.TEXT_NODE && /^[\s​]*$/.test(prev.textContent))
            prev.parentNode.removeChild(prev);
          if (next && next.nodeType === Node.TEXT_NODE && /^[\s​]*$/.test(next.textContent))
            next.parentNode.removeChild(next);
          this.parseModelAndNotify();
          return;
        }
      }
      const sel = window.getSelection();
      if (sel && sel.focusNode && sel.focusNode.textContent != null) {
        const sn = this.findSubStrRange(sel.focusNode.textContent, text);
        if (sn) {
          const r = document.createRange();
          r.setStart(sel.focusNode, sn.start);
          r.setEnd(sel.focusNode, sn.end);
          r.deleteContents();
          this.parseModelAndNotify();
          return;
        }
      }
      const dr = this.deleteTextInEditable(text);
      if (dr) { this.restoreRange(dr); this.parseModelAndNotify(); }
    },

    rj_replaceWithAtom(payload) {
      if (!payload) return;
      if (payload.delText) {
        let deleted = false;
        const range = this.getEditableRange();
        if (range && range.startContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
          const sn = this.findSubStrRange(range.startContainer.textContent || "", payload.delText);
          if (sn) {
            const dr = document.createRange();
            dr.setStart(range.startContainer, sn.start);
            dr.setEnd(range.startContainer, sn.end);
            dr.deleteContents();
            dr.collapse(true);
            this.restoreRange(dr);
            deleted = true;
          }
        }
        if (!deleted) {
          const dr = this.deleteTextInEditable(payload.delText);
          if (dr) this.restoreRange(dr);
        }
      }
      this.rj_onAtomChange(payload.atom);
    },

    // 清空编辑器
    rj_setDelMsgEmpty() {
      if (this.editable) {
        this.editable.innerHTML = "";
        this.parseModelAndNotify();
      }
    },

    rj_setModel(model) {
      if (!this.editable || !Array.isArray(model)) return;
      this.editable.innerHTML = "";
      model.forEach((item) => {
        if (!item) return;
        if (item.type === "text") {
          this.editable.appendChild(document.createTextNode(item.value || ""));
        } else if (item.type === "ate" || item.type === "tag") {
          const prefix = item.type === "ate" ? "@" : "#";
          const text = (item.value || "").startsWith(prefix) ? item.value : prefix + (item.value || "");
          const atom = this.createTextAtom(text, item.type, item.id);
          this.editable.appendChild(atom);
          this.editable.appendChild(document.createTextNode("\u200b")); // 零宽分隔
          if (item.type === "tag") {
            this.editable.appendChild(document.createTextNode(" ")); // 标签后加空格
          }
        } else if (item.type === "image") {
          const atom = this.createImageAtom(item.value || "", item.id);
          this.editable.appendChild(atom);
          this.editable.appendChild(document.createTextNode("​"));
        }
      });
      this.placeCaretToEnd(this.editable);
      this.parseModelAndNotify();
    },

    // 文本操作
    insertText(text) {
      const sel = window.getSelection();
      let range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      const textNode = document.createTextNode(text);
      if (range) {
        range.deleteContents();
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (this.editable) {
        this.editable.appendChild(textNode);
        const newRange = document.createRange();
        newRange.setStartAfter(textNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
      this.parseModelAndNotify();
    },

    // 在字符串中查找子串位置
    findSubStrRange(str0, str1) {
      const start = str0.indexOf(str1);
      return start === -1 ? null : { start, end: start + str1.length };
    },

    // 在 editable 的文本节点中查找并删除指定文本
    deleteTextInEditable(text) {
      if (!this.editable || !text) return null;
      const walker = document.createTreeWalker(this.editable, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) =>
          this.findClosestAtom(node.parentNode) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
      });
      let match = null;
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const idx = (node.textContent || "").indexOf(text);
        if (idx !== -1) match = { node, start: idx, end: idx + text.length };
      }
      if (!match) return null;
      const dr = document.createRange();
      dr.setStart(match.node, match.start);
      dr.setEnd(match.node, match.end);
      dr.deleteContents();
      dr.collapse(true);
      return dr;
    },

    // 事件处理
    onInput(e) {
      if (this.isComposing) return;
      this.parseModelAndNotify();
      if (e.data) this.updateCaretInfo("insert");
      if (this.owner) {
        try { if (typeof this.owner.callMethod === "function") { this.owner.callMethod("onHandleInput", e.data); return; } } catch (err) {}
        try { if (typeof this.owner.onHandleInput === "function") { this.owner.onHandleInput(e.data); } } catch (err) {}
      }
    },

    onKeydown(e) {
      if (e.key === "Backspace" || e.key === "Delete") {
        this.updateCaretInfo("delete");
        const range = this.getSelectionRange();
        if (!range) return;
        const { startContainer, startOffset } = range;

        if (startContainer.nodeType === Node.TEXT_NODE) {
          const tn = startContainer;
          if (e.key === "Backspace" && startOffset === 0) {
            const prev = tn.previousSibling;
            if (this.isAtomNode(prev)) {
              e.preventDefault();
              prev.parentNode.removeChild(prev);
              if (tn.previousSibling && this.isZeroWidthNode(tn.previousSibling))
                tn.previousSibling.parentNode.removeChild(tn.previousSibling);
              this.parseModelAndNotify();
              return;
            }
          }
          if (e.key === "Delete" && startOffset === (tn.textContent || "").length) {
            const next = tn.nextSibling;
            if (this.isAtomNode(next)) {
              e.preventDefault();
              next.parentNode.removeChild(next);
              if (tn.nextSibling && this.isZeroWidthNode(tn.nextSibling))
                tn.nextSibling.parentNode.removeChild(tn.nextSibling);
              this.parseModelAndNotify();
              return;
            }
          }
        }

        if (startContainer.nodeType === Node.ELEMENT_NODE) {
          const ec = startContainer;
          const idx = e.key === "Backspace" ? startOffset - 1 : startOffset;
          if (idx >= 0 && ec.childNodes[idx] && this.isAtomNode(ec.childNodes[idx])) {
            e.preventDefault();
            ec.removeChild(ec.childNodes[idx]);
            this.parseModelAndNotify();
          }
        }
      } else if (e.key.startsWith("Arrow")) {
        this.updateCaretInfo("move");
      }
    },

    onPaste(e) {
      e.preventDefault();
      const text = (e.clipboardData && e.clipboardData.getData("text/plain")) || "";
      if (!text) return;
      const lines = text.split("\n");
      const frag = document.createDocumentFragment();
      lines.forEach((line, i) => {
        if (i > 0) frag.appendChild(document.createElement("br"));
        if (line.length > 0) frag.appendChild(document.createTextNode(line));
      });
      this.insertNodeAtCursor(frag);
      this.parseModelAndNotify();
      this.updateCaretInfo("insert");
    },

    onMouseDown(e) {
      const atom = this.findClosestAtom(e.target);
      if (atom) {
        e.preventDefault();
        setTimeout(() => this.setCaretAfter(atom), 0);
      }
      setTimeout(() => this.updateCaretInfo("move"), 0);
    },

    onKeyup(e) {
      if (e.key && e.key.startsWith("Arrow")) this.updateCaretInfo("move");
    },

    // DOM → Model 解析
    parseModelAndNotify() {
      const parsed = [];
      if (!this.editable) return;

      const walk = (node, isRoot = false) => {
        if (!node) return;
        if (node.nodeType === Node.TEXT_NODE) {
          const raw = (node.textContent || "").replace(/​/g, "");
          if (raw.length > 0) parsed.push({ type: "text", value: raw });
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node;
          const tagName = el.tagName.toLowerCase();
          if (tagName === "br") { parsed.push({ type: "text", value: "\n" }); return; }
          if (!isRoot && tagName === "div") {
            parsed.push({ type: "text", value: "\n" });
            Array.from(el.childNodes).forEach((child) => walk(child));
            return;
          }
          if (el.dataset && el.dataset.ateId) {
            parsed.push({ type: "ate", value: el.innerText, id: el.dataset.ateId });
            return;
          }
          if (el.dataset && el.dataset.tagId) {
            parsed.push({ type: "tag", value: el.innerText, id: el.dataset.tagId });
            return;
          }
          const dt = el.getAttribute && el.getAttribute("data-type");
          if (dt === "ate")   { parsed.push({ type: "ate",   value: el.innerText, id: el.getAttribute("data-id") || undefined }); return; }
          if (dt === "tag")   { parsed.push({ type: "tag",   value: el.innerText, id: el.getAttribute("data-id") || undefined }); return; }
          if (dt === "image") { parsed.push({ type: "image", value: el.getAttribute("src"), id: el.getAttribute("data-id") || undefined }); return; }
          Array.from(el.childNodes).forEach((child) => walk(child));
        }
      };

      Array.from(this.editable.childNodes).forEach((child) => walk(child, false));

      if (this.owner) {
        try { if (typeof this.owner.callMethod === "function") { this.owner.callMethod("notifyModel", parsed); return; } } catch (err) {}
        try { if (typeof this.owner.notifyModel === "function") { this.owner.notifyModel(parsed); } } catch (err) {}
      }
      // #ifdef H5
      if (!this.owner) console.warn("[l-editor] parseModelAndNotify: owner is null, model not dispatched");
      // #endif
    },

    // DOM 辅助判断
    isAtomNode(node) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
      const el = node;
      return !!(
        (el.classList && (el.classList.contains("atom") || el.classList.contains("atom-wrapper") || el.classList.contains("text-atom"))) ||
        (el.dataset && (el.dataset.ateId || el.dataset.tagId)) ||
        (el.getAttribute && el.getAttribute("data-type"))
      );
    },

    // 判断节点是否为零宽空格
    isZeroWidthNode(node) {
      return node && node.nodeType === Node.TEXT_NODE && node.textContent === "​";
    },

    // 向上查找最近的 Atom 祖先
    findClosestAtom(target) {
      if (!target) return null;
      let el = target;
      while (el && el !== this.editable) {
        if (el.nodeType === Node.ELEMENT_NODE) {
          if (el.dataset && (el.dataset.ateId || el.dataset.tagId)) return el;
          if (el.classList && (el.classList.contains("atom") || el.classList.contains("atom-wrapper") || el.classList.contains("text-atom"))) return el;
          if (el.getAttribute && el.getAttribute("data-type")) return el;
        }
        el = el.parentElement;
      }
      return null;
    },
  },
};
</script>

<style lang="scss">
.editable {
  width: 100%;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
  color: var(--l-editor-text, #333);
  background-color: var(--l-editor-bg, #fff);

  &:empty::before {
    content: attr(placeholder);
    color: var(--l-editor-placeholder, #808080);
  }

  &--disabled {
    opacity: 0.5;
    pointer-events: none;
    user-select: none;
    background-color: var(--l-editor-disabled-bg, #f5f5f5);
  }
}

::v-deep .atom {
  display: contents;
  color: var(--l-editor-link, #09408e);
}

::v-deep .text-atom {
  display: inline-flex;
  align-items: center;
  line-height: 1.4;
}

::v-deep .image-atom {
  display: inline-block;
  width: 80rpx;
  height: auto;
  vertical-align: middle;
  border-radius: 4px;
}

::v-deep .atom-wrapper.image-wrapper {
  display: inline-block;
  width: 40rpx;
  height: 40rpx;
  background: #fff;

  image,
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6rpx;
  }
}
</style>

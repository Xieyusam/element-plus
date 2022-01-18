import {
  defineComponent,
  Fragment,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  watch,
} from 'vue'
import {
  addResizeListener,
  removeResizeListener,
} from '@element-plus/utils/resize-event'
import { formItemContextKey, formContextKey } from '@element-plus/tokens'
import { useNamespace } from '@element-plus/hooks'
import type { ResizableElement } from '@element-plus/utils/resize-event'

import type { CSSProperties } from 'vue'

export default defineComponent({
  name: 'ElLabelWrap',
  props: {
    isAutoWidth: Boolean,
    updateAll: Boolean,
  },
  setup(props, { slots }) {
    const formContext = inject(formContextKey)
    const formItemContext = inject(formItemContextKey)
    const ns = useNamespace('form')

    const el = ref<HTMLElement>()
    const computedWidth = ref(0)

    watch(computedWidth, (val, oldVal) => {
      if (props.updateAll) {
        formContext?.registerLabelWidth(val, oldVal)
        formItemContext?.updateComputedLabelWidth(val)
      }
    })

    const getLabelWidth = () => {
      if (el.value?.firstElementChild) {
        const width = window.getComputedStyle(el.value.firstElementChild).width
        return Math.ceil(parseFloat(width))
      } else {
        return 0
      }
    }

    const updateLabelWidth = (action = 'update') => {
      nextTick(() => {
        if (slots.default && props.isAutoWidth) {
          if (action === 'update') {
            computedWidth.value = getLabelWidth()
          } else if (action === 'remove') {
            formContext?.deregisterLabelWidth(computedWidth.value)
          }
        }
      })
    }
    const updateLabelWidthFn = () => updateLabelWidth('update')

    onMounted(() => {
      addResizeListener(
        el.value!.firstElementChild as ResizableElement,
        updateLabelWidthFn
      )
      updateLabelWidthFn()
    })

    onUpdated(updateLabelWidthFn)

    onBeforeUnmount(() => {
      updateLabelWidth('remove')
      removeResizeListener(
        el.value?.firstElementChild as ResizableElement,
        updateLabelWidthFn
      )
    })

    return () => {
      if (!slots) return null
      if (props.isAutoWidth) {
        const autoLabelWidth = formContext?.autoLabelWidth
        const style = {} as CSSProperties
        if (autoLabelWidth && autoLabelWidth !== 'auto') {
          const marginWidth = Math.max(
            0,
            parseInt(autoLabelWidth, 10) - computedWidth.value
          )
          const marginPosition =
            formContext.labelPosition === 'left' ? 'marginRight' : 'marginLeft'
          if (marginWidth) {
            style[marginPosition] = `${marginWidth}px`
          }
        }
        return h(
          'div',
          {
            ref: el,
            class: [ns.be('item', 'label-wrap')],
            style,
          },
          slots.default?.()
        )
      } else {
        return h(Fragment, { ref: el }, slots.default?.())
      }
    }
  },
})

import { computed, ref } from 'vue'
import {
  buildProps,
  componentSize,
  definePropType,
} from '@element-plus/utils/props'
import { debugWarn } from '@element-plus/utils/error'
import { isString } from '@element-plus/utils/util'
import type { FormItemRule } from './form-item'
import type { FormItemContext } from '@element-plus/tokens'
import type { ExtractPropTypes } from 'vue'
import type { ValidateFieldsError } from 'async-validator'

export type FormRulesMap<T extends string = string> = Partial<
  Record<T, FormItemRule | FormItemRule[]>
>

export const formProps = buildProps({
  model: Object,
  rules: {
    type: definePropType<FormRulesMap>(Object),
  },
  labelPosition: String,
  labelWidth: {
    type: [String, Number],
    default: '',
  },
  labelSuffix: {
    type: String,
    default: '',
  },
  inline: Boolean,
  inlineMessage: Boolean,
  statusIcon: Boolean,
  showMessage: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String,
    values: componentSize,
  },
  disabled: Boolean,
  validateOnRuleChange: {
    type: Boolean,
    default: true,
  },
  hideRequiredAsterisk: {
    type: Boolean,
    default: false,
  },
  scrollToError: Boolean,
} as const)
export type FormProps = ExtractPropTypes<typeof formProps>

export const formEmits = {
  validate: () => true,
}
export type FormEmits = typeof formEmits

export type FormValidateCallback = (
  isValid?: boolean,
  invalidFields?: ValidateFieldsError
) => void

export function useFormLabelWidth() {
  const potentialLabelWidthArr = ref<number[]>([])

  const autoLabelWidth = computed(() => {
    if (!potentialLabelWidthArr.value.length) return '0'
    const max = Math.max(...potentialLabelWidthArr.value)
    return max ? `${max}px` : ''
  })

  function getLabelWidthIndex(width: number) {
    const index = potentialLabelWidthArr.value.indexOf(width)
    if (index === -1) {
      debugWarn('Form', `unexpected width ${width}`)
    }
    return index
  }

  function registerLabelWidth(val: number, oldVal: number) {
    if (val && oldVal) {
      const index = getLabelWidthIndex(oldVal)
      potentialLabelWidthArr.value.splice(index, 1, val)
    } else if (val) {
      potentialLabelWidthArr.value.push(val)
    }
  }

  function deregisterLabelWidth(val: number) {
    const index = getLabelWidthIndex(val)
    index > -1 && potentialLabelWidthArr.value.splice(index, 1)
  }

  return {
    autoLabelWidth,
    registerLabelWidth,
    deregisterLabelWidth,
  }
}

export const filterFields = (
  fields: FormItemContext[],
  props: string | string[]
) => {
  const normalized = isString(props) ? [props] : props
  return normalized.length > 0
    ? fields.filter((field) => field.prop && normalized.includes(field.prop))
    : fields
}

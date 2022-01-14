import {
  buildProps,
  componentSize,
  definePropType,
} from '@element-plus/utils/props'
import type { ExtractPropTypes } from 'vue'
import type { RuleItem } from 'async-validator'

export interface FormItemRule extends RuleItem {
  trigger?: string
}

export const formItemProps = buildProps({
  label: String,
  labelWidth: {
    type: [String, Number],
    default: '',
  },
  prop: String,
  required: {
    type: Boolean,
    default: undefined,
  },
  rules: {
    type: definePropType<FormItemRule | FormItemRule[]>([Object, Array]),
  },
  error: String,
  validateStatus: String,
  for: String,
  inlineMessage: {
    type: [String, Boolean],
    default: '',
  },
  showMessage: {
    type: Boolean,
    default: true,
  },
  size: {
    values: componentSize,
  },
} as const)
export type FormItemProps = ExtractPropTypes<typeof formItemProps>

import type {
  useFormLabelWidth,
  FormProps,
  FormEmits,
  FormItemProps,
  FormValidateCallback,
} from '@element-plus/components/form'
import type { InjectionKey, SetupContext, UnwrapRef } from 'vue'
import type { ComponentSize } from '@element-plus/utils/types'

export type FormContext = FormProps &
  UnwrapRef<ReturnType<typeof useFormLabelWidth>> & {
    emit: SetupContext<FormEmits>['emit']

    // expose
    addField: (field: FormItemContext) => void
    removeField: (field: FormItemContext) => void
    resetFields: () => void
    clearValidate: (props: string | string[]) => void
    validateField: (props: string | string[], cb: FormValidateCallback) => void
  }

export type FormItemContext = FormItemProps & {
  $el: HTMLDivElement | undefined
  prop?: string
  size?: ComponentSize
  validateState: string
  validate(trigger: string, callback?: FormValidateCallback): void
  updateComputedLabelWidth(width: string | number): void
  evaluateValidationEnabled(): void
  resetField(): void
  clearValidate(): void
}

export const formContextKey: InjectionKey<FormContext> =
  Symbol('formContextKey')
export const formItemContextKey: InjectionKey<FormItemContext> =
  Symbol('formItemContextKey')

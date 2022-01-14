<template>
  <form :class="formKls">
    <slot></slot>
  </form>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  provide,
  reactive,
  toRefs,
  watch,
} from 'vue'
import { formContextKey } from '@element-plus/tokens'
import { debugWarn } from '@element-plus/utils/error'
import { useSize } from '@element-plus/hooks'
import { useFormLabelWidth, formProps, formEmits, filterFields } from './form'
import type { FormValidateCallback } from './form'
import type { ValidateFieldsError } from 'async-validator'

import type { FormItemContext, FormContext } from '@element-plus/tokens'

const COMPONENT_NAME = 'ElForm'

export default defineComponent({
  name: COMPONENT_NAME,
  props: formProps,
  emits: formEmits,

  setup(props, { emit }) {
    const formSize = useSize()
    const formKls = computed(() => {
      const prefix = 'el-form'
      const { labelPosition, inline } = props
      return [
        prefix,
        `${prefix}--${formSize.value}`,
        labelPosition ? `${prefix}--label-${labelPosition}` : '',
        inline ? `${prefix}--inline` : '',
      ]
    })
    const fields: FormItemContext[] = []

    const addField: FormContext['addField'] = (field) => fields.push(field)

    const removeField: FormContext['removeField'] = (field) => {
      if (field.prop) {
        fields.splice(fields.indexOf(field), 1)
      }
    }

    const resetFields: FormContext['resetFields'] = () => {
      if (!props.model) {
        debugWarn(COMPONENT_NAME, 'model is required for resetFields to work.')
        return
      }

      fields.forEach((field) => field.resetField())
    }

    const clearValidate: FormContext['clearValidate'] = (props = []) => {
      filterFields(fields, props).forEach((field) => field.clearValidate())
    }

    const validate = (callback?: FormValidateCallback) => {
      if (!callback) {
        return new Promise((resolve, reject) => {
          validate((valid, invalidFields) => {
            if (valid) resolve(true)
            else reject(invalidFields)
          })
        })
      }

      if (!props.model) {
        debugWarn(COMPONENT_NAME, 'model is required for validate to work!')
        return
      }

      if (fields.length === 0) {
        callback(true)
      }

      let valid = true
      let count = 0
      let invalidFields = {}
      let firstInvalidFields: ValidateFieldsError

      for (const field of fields) {
        field.validate('', (message, field) => {
          if (message) {
            valid = false
            if (!firstInvalidFields && field) firstInvalidFields = field
          }

          count++
          invalidFields = { ...invalidFields, ...field }

          if (count === fields.length) {
            callback(valid, invalidFields)
          }
        })
      }

      if (!valid && props.scrollToError) {
        scrollToField(Object.keys(firstInvalidFields!)[0])
      }
    }

    const validateField: FormContext['validateField'] = (props, cb) => {
      const fds = filterFields(fields, props)
      if (!fds.length) {
        debugWarn(COMPONENT_NAME, 'please pass correct props!')
        return
      }
      fds.forEach((field) => field.validate('', cb))
    }

    const scrollToField = (prop: string) => {
      const field = filterFields(fields, prop)[0]
      if (field) {
        field.$el?.scrollIntoView()
      }
    }

    watch(
      () => props.rules,
      () => {
        fields.forEach((field) => {
          field.evaluateValidationEnabled()
        })

        if (props.validateOnRuleChange) {
          validate(() => ({}))
        }
      }
    )

    provide(
      formContextKey,
      reactive({
        ...toRefs(props),
        emit,

        resetFields,
        clearValidate,
        validateField,
        addField,
        removeField,

        ...useFormLabelWidth(),
      })
    )

    return {
      formKls,

      // expose
      validate,
      resetFields,
      clearValidate,
      validateField,
      scrollToField,
    }
  },
})
</script>

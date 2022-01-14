<template>
  <div ref="formItemRef" class="el-form-item" :class="formItemClass">
    <label-wrap
      :is-auto-width="labelStyle.width === 'auto'"
      :update-all="formContext?.labelWidth === 'auto'"
    >
      <label
        v-if="label || $slots.label"
        :for="labelFor"
        class="el-form-item__label"
        :style="labelStyle"
      >
        <slot name="label" :label="currentLabel">
          {{ currentLabel }}
        </slot>
      </label>
    </label-wrap>
    <div class="el-form-item__content" :style="contentStyle">
      <slot></slot>
      <transition name="el-zoom-in-top">
        <slot v-if="shouldShowError" name="error" :error="validateMessage">
          <div
            class="el-form-item__error"
            :class="{
              'el-form-item__error--inline':
                typeof inlineMessage === 'boolean'
                  ? inlineMessage
                  : formContext?.inlineMessage || false,
            }"
          >
            {{ validateMessage }}
          </div>
        </slot>
      </transition>
    </div>
  </div>
</template>

<script lang="ts">
import {
  computed,
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  toRefs,
  watch,
  nextTick,
} from 'vue'
import { NOOP } from '@vue/shared'
import AsyncValidator from 'async-validator'
import { addUnit, getPropByPath } from '@element-plus/utils/util'
import { formItemContextKey, formContextKey } from '@element-plus/tokens'
import { useSize } from '@element-plus/hooks'
import { formItemProps } from './form-item'
import LabelWrap from './label-wrap'

import type { FormValidateCallback } from './form'
import type { FormItemRule } from './form-item'
import type { CSSProperties } from 'vue'
import type { FormItemContext } from '@element-plus/tokens'

export default defineComponent({
  name: 'ElFormItem',
  components: {
    LabelWrap,
  },
  props: formItemProps,

  setup(props, { slots }) {
    const vm = getCurrentInstance()!
    const sizeClass = useSize(undefined, { formItem: false })
    const formContext = inject(formContextKey, undefined)
    const validateState = ref('')
    const validateMessage = ref('')
    const isValidationEnabled = ref(false)
    const computedLabelWidth = ref('')
    const formItemRef = ref<HTMLDivElement>()
    let initialValue: any = undefined

    const labelStyle = computed<CSSProperties>(() => {
      if (formContext?.labelPosition === 'top') {
        return {}
      }

      const labelWidth = addUnit(
        props.labelWidth || formContext?.labelWidth || ''
      )
      if (labelWidth) return { width: labelWidth }
      return {}
    })
    const contentStyle = computed<CSSProperties>(() => {
      if (formContext?.labelPosition === 'top' || formContext?.inline) {
        return {}
      }
      if (!props.label && !props.labelWidth && isNested.value) {
        return {}
      }
      const labelWidth = addUnit(
        props.labelWidth || formContext?.labelWidth || ''
      )
      if (!props.label && !slots.label) {
        return { marginLeft: labelWidth }
      }
      return {}
    })
    const formItemClass = computed(() => [
      {
        'el-form-item--feedback': formContext?.statusIcon,
        'is-error': validateState.value === 'error',
        'is-validating': validateState.value === 'validating',
        'is-success': validateState.value === 'success',
        'is-required': isRequired.value || props.required,
        'is-no-asterisk': formContext?.hideRequiredAsterisk,
      },
      sizeClass.value ? `el-form-item--${sizeClass.value}` : '',
    ])
    const labelFor = computed(() => props.for || props.prop)
    const isNested = computed(() => {
      let parent = vm.parent
      while (parent && parent.type.name !== 'ElForm') {
        if (parent.type.name === 'ElFormItem') {
          return true
        }
        parent = parent.parent
      }
      return false
    })
    const fieldValue = computed(() => {
      const model = formContext?.model
      if (!model || !props.prop) return

      let path = props.prop
      if (path.includes(':')) {
        path = path.replace(/:/, '.')
      }

      return getPropByPath(model, path, true).v
    })

    const getRules = () => {
      const formRules = formContext?.rules
      const selfRules = props.rules
      const requiredRule: FormItemRule[] =
        props.required !== undefined ? [{ required: !!props.required }] : []

      const prop: any = getPropByPath(formRules, props.prop || '', false)
      const normalizedRule = formRules ? prop.o[props.prop || ''] || prop.v : []

      return ([] as FormItemRule[])
        .concat(selfRules || normalizedRule || [])
        .concat(requiredRule)
    }
    const isRequired = computed(() => {
      const rules = getRules()
      if (rules.length === 0) return false
      return rules.some((rule) => rule.required === true)
    })
    const shouldShowError = computed(() => {
      return (
        validateState.value === 'error' &&
        props.showMessage &&
        formContext?.showMessage
      )
    })
    const currentLabel = computed(
      () => (props.label || '') + (formContext?.labelSuffix || '')
    )

    const validate: FormItemContext['validate'] = (
      trigger: string,
      callback: FormValidateCallback = NOOP
    ) => {
      if (!isValidationEnabled.value) {
        callback()
        return
      }
      const rules = getFilteredRule(trigger)
      if ((!rules || rules.length === 0) && props.required === undefined) {
        callback()
        return
      }
      validateState.value = 'validating'
      const descriptor = {}
      if (rules && rules.length > 0) {
        rules.forEach((rule) => {
          delete rule.trigger
        })
      }
      descriptor[props.prop] = rules
      const validator = new AsyncValidator(descriptor)
      const model = {}
      model[props.prop] = fieldValue.value
      validator.validate(model, { firstFields: true }, (errors, fields) => {
        validateState.value = !errors ? 'success' : 'error'
        validateMessage.value = errors
          ? errors[0].message || `${props.prop} is required`
          : ''
        // fix: #3860 after version 3.5.2, async-validator also return fields if validation fails
        callback(validateMessage.value, errors ? fields : {})
        formContext.emit?.(
          'validate',
          props.prop,
          !errors,
          validateMessage.value || null
        )
      })
    }

    const clearValidate: FormItemContext['clearValidate'] = () => {
      validateState.value = ''
      validateMessage.value = ''
    }

    const resetField: FormItemContext['resetField'] = () => {
      const model = formContext?.model
      const value = fieldValue.value
      let path = props.prop
      if (!path) return
      if (path.indexOf(':') !== -1) {
        path = path.replace(/:/, '.')
      }
      const prop: any = getPropByPath(model, path, true)
      if (Array.isArray(value)) {
        prop.o[prop.k] = [].concat(initialValue)
      } else {
        prop.o[prop.k] = initialValue
      }
      nextTick(() => {
        clearValidate()
      })
    }

    const getFilteredRule = (trigger) => {
      const rules = getRules()

      return rules
        .filter((rule) => {
          if (!rule.trigger || trigger === '') return true
          if (Array.isArray(rule.trigger)) {
            return rule.trigger.indexOf(trigger) > -1
          } else {
            return rule.trigger === trigger
          }
        })
        .map((rule) => ({ ...rule }))
    }

    const evaluateValidationEnabled: FormItemContext['evaluateValidationEnabled'] =
      () => {
        isValidationEnabled.value = !!getRules()?.length
      }

    const updateComputedLabelWidth: FormItemContext['updateComputedLabelWidth'] =
      (width) => {
        computedLabelWidth.value = width ? `${width}px` : ''
      }

    watch(
      () => props.error,
      (val) => {
        validateMessage.value = val || ''
        validateState.value = val ? 'error' : ''
      },
      { immediate: true }
    )
    watch(
      () => props.validateStatus,
      (val) => {
        validateState.value = val || ''
      }
    )

    const formItemContext: FormItemContext = reactive({
      ...toRefs(props),
      $el: formItemRef,
      size: sizeClass,
      validateState,
      evaluateValidationEnabled,
      resetField,
      clearValidate,
      validate,
      updateComputedLabelWidth,
    })
    provide(formItemContextKey, formItemContext)

    onMounted(() => {
      if (props.prop) {
        formContext?.addField(formItemContext)

        const value = fieldValue.value
        initialValue = Array.isArray(value) ? [...value] : value

        evaluateValidationEnabled()
      }
    })
    onBeforeUnmount(() => {
      formContext?.removeField(formItemContext)
    })

    return {
      formItemRef,
      formItemClass,
      shouldShowError,
      formContext,
      labelStyle,
      contentStyle,
      validateMessage,
      labelFor,
      resetField,
      clearValidate,
      currentLabel,
    }
  },
})
</script>

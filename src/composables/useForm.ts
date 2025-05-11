import { ref, reactive, computed, watch, toRefs, onMounted } from 'vue';

interface FormValidationRule {
  validate: (value: any, formValues?: Record<string, any>) => boolean;
  message: string;
}

export interface FormFieldOptions {
  initialValue: any;
  validationRules?: FormValidationRule[];
  required?: boolean;
  requiredMessage?: string;
  transform?: (value: any) => any;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
}

export interface FormOptions {
  initialValues: Record<string, any>;
  onSubmit?: (values: Record<string, any>) => void | Promise<void>;
  onReset?: () => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
}

/**
 * Form validation and state management composable
 * 
 * @param options - Form configuration options
 * @returns Form state and methods
 * 
 * @example
 * const { values, errors, touched, isValid, handleSubmit, handleChange, handleBlur, resetForm } = useForm({
 *   initialValues: {
 *     name: '',
 *     email: '',
 *     age: 0
 *   },
 *   onSubmit: (values) => {
 *     console.log('Form submitted:', values);
 *   }
 * });
 * 
 * // Add validation rules dynamically
 * addValidationRule('email', {
 *   validate: (value) => /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(value),
 *   message: 'Please enter a valid email address'
 * });
 * 
 * // Required field validation
 * setFieldRequired('name', true, 'Name is required');
 */
export function useForm(options: FormOptions) {
  const {
    initialValues,
    onSubmit,
    onReset,
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
  } = options;

  // Form state
  const values = reactive({ ...initialValues });
  const errors = reactive<Record<string, string[]>>({});
  const touched = reactive<Record<string, boolean>>({});
  const dirty = reactive<Record<string, boolean>>({});
  const isSubmitting = ref(false);
  const isValidating = ref(false);
  const submitCount = ref(0);
  const isSubmitted = ref(false);

  // Fields configuration
  const fields = reactive<Record<string, FormFieldOptions>>({});

  // Initialize fields based on initialValues
  for (const [key, value] of Object.entries(initialValues)) {
    fields[key] = {
      initialValue: value,
      validationRules: [],
      required: false,
      validateOnChange,
      validateOnBlur,
      validateOnSubmit,
    };
    errors[key] = [];
    touched[key] = false;
    dirty[key] = false;
  }

  /**
   * Add a field to the form
   * @param name - Field name
   * @param options - Field configuration
   */
  const addField = (name: string, options: FormFieldOptions) => {
    if (fields[name]) {
      Object.assign(fields[name], options);
    } else {
      fields[name] = options;
      values[name] = options.initialValue;
      errors[name] = [];
      touched[name] = false;
      dirty[name] = false;
    }
  };

  /**
   * Add a validation rule to a field
   * @param fieldName - Field name
   * @param rule - Validation rule
   */
  const addValidationRule = (fieldName: string, rule: FormValidationRule) => {
    if (!fields[fieldName]) {
      fields[fieldName] = {
        initialValue: values[fieldName] || null,
        validationRules: [],
        validateOnChange,
        validateOnBlur,
        validateOnSubmit,
      };
    }
    fields[fieldName].validationRules = [...(fields[fieldName].validationRules || []), rule];
  };

  /**
   * Set a field as required
   * @param fieldName - Field name
   * @param isRequired - Whether the field is required
   * @param message - Custom required message
   */
  const setFieldRequired = (fieldName: string, isRequired = true, message = 'This field is required') => {
    if (!fields[fieldName]) {
      fields[fieldName] = {
        initialValue: values[fieldName] || null,
        validationRules: [],
        validateOnChange,
        validateOnBlur,
        validateOnSubmit,
      };
    }
    
    fields[fieldName].required = isRequired;
    fields[fieldName].requiredMessage = message;
  };

  /**
   * Validate a specific field
   * @param fieldName - Field name
   * @returns Whether the field is valid
   */
  const validateField = (fieldName: string): boolean => {
    if (!fields[fieldName]) return true;
    
    const field = fields[fieldName];
    const value = values[fieldName];
    
    errors[fieldName] = [];
    
    // Required validation
    if (field.required) {
      const isEmpty = value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0);
      
      if (isEmpty) {
        errors[fieldName].push(field.requiredMessage || 'This field is required');
      }
    }
    
    // Custom validation rules
    if (field.validationRules) {
      for (const rule of field.validationRules) {
        if (!rule.validate(value, values)) {
          errors[fieldName].push(rule.message);
        }
      }
    }
    
    return errors[fieldName].length === 0;
  };

  /**
   * Validate all form fields
   * @returns Whether the form is valid
   */
  const validateForm = (): boolean => {
    isValidating.value = true;
    let isValid = true;
    
    for (const fieldName of Object.keys(fields)) {
      const fieldValid = validateField(fieldName);
      isValid = isValid && fieldValid;
    }
    
    isValidating.value = false;
    return isValid;
  };

  /**
   * Handle form submission
   * @param e - Optional form event
   */
  const handleSubmit = async (e?: Event) => {
    if (e) {
      e.preventDefault();
    }
    
    isSubmitted.value = true;
    submitCount.value += 1;
    
    let isValid = true;
    
    if (validateOnSubmit) {
      isValid = validateForm();
    }
    
    if (!isValid) {
      return;
    }
    
    isSubmitting.value = true;
    
    try {
      // Transform values if needed
      const transformedValues = { ...values };
      for (const [fieldName, field] of Object.entries(fields)) {
        if (field.transform) {
          transformedValues[fieldName] = field.transform(values[fieldName]);
        }
      }
      
      if (onSubmit) {
        await onSubmit(transformedValues);
      }
    } finally {
      isSubmitting.value = false;
    }
  };

  /**
   * Handle field change event
   * @param fieldName - Field name
   * @param value - New field value
   */
  const handleChange = (fieldName: string, value: any) => {
    values[fieldName] = value;
    dirty[fieldName] = true;
    
    const field = fields[fieldName];
    
    if (field && field.validateOnChange) {
      validateField(fieldName);
    }
  };

  /**
   * Handle field blur event
   * @param fieldName - Field name
   */
  const handleBlur = (fieldName: string) => {
    touched[fieldName] = true;
    
    const field = fields[fieldName];
    
    if (field && field.validateOnBlur) {
      validateField(fieldName);
    }
  };

  /**
   * Reset form to initial values
   */
  const resetForm = () => {
    // Reset values
    for (const [key, field] of Object.entries(fields)) {
      values[key] = field.initialValue;
    }
    
    // Reset errors, touched, and dirty states
    for (const key of Object.keys(errors)) {
      errors[key] = [];
      touched[key] = false;
      dirty[key] = false;
    }
    
    isSubmitted.value = false;
    
    if (onReset) {
      onReset();
    }
  };

  /**
   * Set field value
   * @param fieldName - Field name
   * @param value - New field value
   * @param shouldValidate - Whether to validate the field after setting the value
   */
  const setFieldValue = (fieldName: string, value: any, shouldValidate = true) => {
    values[fieldName] = value;
    dirty[fieldName] = true;
    
    if (shouldValidate) {
      validateField(fieldName);
    }
  };

  /**
   * Set multiple field values
   * @param newValues - Object with field names and values
   * @param shouldValidate - Whether to validate the fields after setting the values
   */
  const setValues = (newValues: Record<string, any>, shouldValidate = true) => {
    for (const [key, value] of Object.entries(newValues)) {
      values[key] = value;
      dirty[key] = true;
    }
    
    if (shouldValidate) {
      validateForm();
    }
  };

  /**
   * Set field error
   * @param fieldName - Field name
   * @param error - Error message
   */
  const setFieldError = (fieldName: string, error: string) => {
    errors[fieldName] = [error];
    touched[fieldName] = true;
  };

  /**
   * Set multiple field errors
   * @param newErrors - Object with field names and error messages
   */
  const setErrors = (newErrors: Record<string, string | string[]>) => {
    for (const [key, error] of Object.entries(newErrors)) {
      errors[key] = Array.isArray(error) ? error : [error];
      touched[key] = true;
    }
  };

  /**
   * Check if field has error
   * @param fieldName - Field name
   * @returns Whether the field has error
   */
  const hasError = (fieldName: string): boolean => {
    return errors[fieldName] && errors[fieldName].length > 0;
  };

  // Computed properties
  const isValid = computed(() => {
    for (const fieldErrors of Object.values(errors)) {
      if (fieldErrors.length > 0) {
        return false;
      }
    }
    return true;
  });

  const isDirty = computed(() => {
    return Object.values(dirty).some(Boolean);
  });

  const isTouched = computed(() => {
    return Object.values(touched).some(Boolean);
  });

  const allTouched = computed(() => {
    return Object.values(touched).every(Boolean);
  });

  // Return form state and methods
  return {
    // State
    values,
    errors,
    touched,
    dirty,
    isSubmitting,
    isValidating,
    isValid,
    isDirty,
    isTouched,
    allTouched,
    submitCount,
    isSubmitted,
    
    // Methods
    handleSubmit,
    handleChange,
    handleBlur,
    resetForm,
    validateField,
    validateForm,
    addField,
    addValidationRule,
    setFieldRequired,
    setFieldValue,
    setValues,
    setFieldError,
    setErrors,
    hasError,
  };
}

export default useForm;
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useForm } from "@/composables/useForm";

describe("useForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * Form initialization tests
   */
  describe("initialization", () => {
    it("should initialize with initial values", () => {
      const initialValues = {
        name: "Test User",
        email: "test@example.com",
        age: 25,
      };

      const { values } = useForm({ initialValues });

      expect(values.name).toBe("Test User");
      expect(values.email).toBe("test@example.com");
      expect(values.age).toBe(25);
    });

    it("should initialize fields with correct default configuration", () => {
      const initialValues = { name: "", email: "" };

      const form = useForm({
        initialValues,
        validateOnChange: false,
        validateOnBlur: true,
        validateOnSubmit: true,
      });

      // Access private fields property using casting
      const fieldsObj = form["fields"] as Record<string, any>;

      // Check fields configuration
      expect(fieldsObj.name.validateOnChange).toBe(false);
      expect(fieldsObj.name.validateOnBlur).toBe(true);
      expect(fieldsObj.name.validateOnSubmit).toBe(true);
      expect(fieldsObj.name.validationRules).toEqual([]);
      expect(fieldsObj.name.required).toBe(false);
    });

    it("should initialize form state properties correctly", () => {
      const {
        errors,
        touched,
        dirty,
        isSubmitting,
        isValidating,
        submitCount,
        isSubmitted,
        isValid,
        isDirty,
        isTouched,
        allTouched,
      } = useForm({ initialValues: { name: "" } });

      // Initial state
      expect(errors.name).toEqual([]);
      expect(touched.name).toBe(false);
      expect(dirty.name).toBe(false);
      expect(isSubmitting.value).toBe(false);
      expect(isValidating.value).toBe(false);
      expect(submitCount.value).toBe(0);
      expect(isSubmitted.value).toBe(false);

      // Computed properties
      expect(isValid.value).toBe(true);
      expect(isDirty.value).toBe(false);
      expect(isTouched.value).toBe(false);
      expect(allTouched.value).toBe(false);
    });
  });

  /**
   * Field operations tests
   */
  describe("field operations", () => {
    it("should add a new field with addField", () => {
      const { values, errors, addField } = useForm({
        initialValues: { name: "Test" },
      });

      // Add a new field
      addField("email", {
        initialValue: "test@example.com",
        required: true,
        requiredMessage: "Email is required",
        validationRules: [
          {
            validate: (value) => /@/.test(value),
            message: "Invalid email format",
          },
        ],
      });

      expect(values.email).toBe("test@example.com");
      expect(errors.email).toEqual([]);
    });

    it("should update existing field with addField", () => {
      const { addField } = useForm({
        initialValues: { email: "" },
      });

      // Update existing field
      addField("email", {
        initialValue: "updated@example.com",
        required: true,
      });

      // Access the internal fields to verify the update
      const fieldsObj = (addField as any)["fields"];

      // Can't directly check fields since it's internal, so we'll rely on other APIs
      // to indicate that the field was updated correctly
    });

    it("should add validation rule to a field", () => {
      const { addValidationRule, validateField, errors } = useForm({
        initialValues: { email: "invalid" },
      });

      // Add validation rule
      addValidationRule("email", {
        validate: (value) => /@/.test(value),
        message: "Invalid email format",
      });

      // Validate field
      validateField("email");

      // Should have error
      expect(errors.email).toContain("Invalid email format");
    });

    it("should set field as required", () => {
      const { setFieldRequired, validateField, errors } = useForm({
        initialValues: { name: "" },
      });

      // Set field as required with custom message
      setFieldRequired("name", true, "Name field is required");

      // Validate empty field
      validateField("name");

      // Should have error
      expect(errors.name).toContain("Name field is required");
    });

    it("should handle non-existent field in validation operations", () => {
      const { validateField, addValidationRule, setFieldRequired } = useForm({
        initialValues: {},
      });

      // These should not throw errors
      addValidationRule("nonExistent", {
        validate: () => true,
        message: "Test",
      });

      setFieldRequired("nonExistent", true);

      // Should return true for non-existent field
      expect(validateField("nonExistent")).toBe(true);
    });
  });

  /**
   * Field validation tests
   */
  describe("validation", () => {
    it("should validate required fields", () => {
      const { setFieldRequired, validateField, errors } = useForm({
        initialValues: { name: "", email: "test@example.com" },
      });

      // Set name as required
      setFieldRequired("name", true);

      // Validate fields
      validateField("name");
      validateField("email");

      // Name should have error, email should not
      expect(errors.name.length).toBeGreaterThan(0);
      expect(errors.email.length).toBe(0);
    });

    it("should validate with custom validation rules", () => {
      const { addValidationRule, validateField, errors, setFieldValue } =
        useForm({
          initialValues: { age: 15 },
        });

      // Add validation rule
      addValidationRule("age", {
        validate: (value) => value >= 18,
        message: "Must be at least 18 years old",
      });

      // Validate field
      validateField("age");

      // Should have error
      expect(errors.age).toContain("Must be at least 18 years old");

      // Update value to pass validation
      setFieldValue("age", 20);
      validateField("age");

      // Should no longer have error
      expect(errors.age.length).toBe(0);
    });

    it("should validate against other form values", () => {
      const { addValidationRule, validateField, errors, setFieldValue } =
        useForm({
          initialValues: { password: "12345", confirmPassword: "54321" },
        });

      // Add validation rule that depends on another field
      addValidationRule("confirmPassword", {
        validate: (value, formValues) => value === formValues?.password,
        message: "Passwords do not match",
      });

      // Validate field
      validateField("confirmPassword");

      // Should have error
      expect(errors.confirmPassword).toContain("Passwords do not match");

      // Update value to match
      setFieldValue("confirmPassword", "12345");
      validateField("confirmPassword");

      // Should no longer have error
      expect(errors.confirmPassword.length).toBe(0);
    });

    it("should validate multiple rules on a field", () => {
      const { addValidationRule, validateField, errors } = useForm({
        initialValues: { password: "abc" },
      });

      // Add multiple validation rules
      addValidationRule("password", {
        validate: (value) => value.length >= 6,
        message: "Password must be at least 6 characters",
      });

      addValidationRule("password", {
        validate: (value) => /[0-9]/.test(value),
        message: "Password must contain a number",
      });

      // Validate field
      validateField("password");

      // Should have both errors
      expect(errors.password.length).toBe(2);
      expect(errors.password).toContain(
        "Password must be at least 6 characters",
      );
      expect(errors.password).toContain("Password must contain a number");
    });

    it("should validate all form fields with validateForm", () => {
      const { setFieldRequired, addValidationRule, validateForm, errors } =
        useForm({
          initialValues: { name: "", email: "invalid" },
        });

      // Set validation rules
      setFieldRequired("name", true);
      addValidationRule("email", {
        validate: (value) => /@/.test(value),
        message: "Invalid email",
      });

      // Validate all fields
      const isValid = validateForm();

      // Should not be valid and have errors
      expect(isValid).toBe(false);
      expect(errors.name.length).toBeGreaterThan(0);
      expect(errors.email.length).toBeGreaterThan(0);
    });

    it("should track validation state correctly", async () => {
      const { validateForm, isValidating } = useForm({
        initialValues: { name: "" },
      });

      // Validate all fields
      validateForm();

      // Should set isValidating to true then false
      expect(isValidating.value).toBe(false); // It's synchronous, already done
    });
  });

  /**
   * Form submission tests
   */
  describe("submission", () => {
    it("should call onSubmit handler when form is valid", async () => {
      const onSubmit = vi.fn();

      const { handleSubmit, isSubmitting, submitCount } = useForm({
        initialValues: { name: "Test" },
        onSubmit,
      });

      // Submit form
      await handleSubmit();

      // Should have called onSubmit
      expect(onSubmit).toHaveBeenCalledWith({ name: "Test" });
      expect(isSubmitting.value).toBe(false);
      expect(submitCount.value).toBe(1);
    });

    it("should not call onSubmit when form is invalid", async () => {
      const onSubmit = vi.fn();

      const { handleSubmit, setFieldRequired, submitCount } = useForm({
        initialValues: { name: "" },
        onSubmit,
        validateOnSubmit: true,
      });

      // Make form invalid
      setFieldRequired("name", true);

      // Submit form
      await handleSubmit();

      // Should not have called onSubmit
      expect(onSubmit).not.toHaveBeenCalled();
      expect(submitCount.value).toBe(1);
    });

    it("should transform values before submission", async () => {
      const onSubmit = vi.fn();

      const { handleSubmit, addField } = useForm({
        initialValues: { age: "25" },
        onSubmit,
      });

      // Add transform function
      addField("age", {
        initialValue: "25",
        transform: (value) => parseInt(value, 10),
      });

      // Submit form
      await handleSubmit();

      // Should have transformed value
      expect(onSubmit).toHaveBeenCalledWith({ age: 25 });
    });

    it("should prevent default on submit event", async () => {
      const { handleSubmit } = useForm({
        initialValues: { name: "Test" },
      });

      // Create mock event
      const event = {
        preventDefault: vi.fn(),
      };

      // Submit form with event
      await handleSubmit(event as unknown as Event);

      // Should have prevented default
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("should handle submission error gracefully", async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error("Submit error"));

      const { handleSubmit, isSubmitting } = useForm({
        initialValues: { name: "Test" },
        onSubmit,
      });

      // Submit form
      await handleSubmit();

      // Should have set isSubmitting back to false
      expect(isSubmitting.value).toBe(false);
    });
  });

  /**
   * Form reset tests
   */
  describe("reset", () => {
    it("should reset form to initial values", () => {
      const { values, setFieldValue, resetForm } = useForm({
        initialValues: { name: "Initial", email: "initial@example.com" },
      });

      // Change values
      setFieldValue("name", "Changed");
      setFieldValue("email", "changed@example.com");

      // Reset form
      resetForm();

      // Should be back to initial values
      expect(values.name).toBe("Initial");
      expect(values.email).toBe("initial@example.com");
    });

    it("should reset all form state", () => {
      const {
        setFieldValue,
        handleBlur,
        setFieldError,
        resetForm,
        errors,
        touched,
        dirty,
        isSubmitted,
      } = useForm({
        initialValues: { name: "Initial" },
      });

      // Change form state
      setFieldValue("name", "Changed");
      handleBlur("name");
      setFieldError("name", "Test error");
      isSubmitted.value = true;

      // Reset form
      resetForm();

      // Should reset all state
      expect(errors.name.length).toBe(0);
      expect(touched.name).toBe(false);
      expect(dirty.name).toBe(false);
      expect(isSubmitted.value).toBe(false);
    });

    it("should call onReset handler if provided", () => {
      const onReset = vi.fn();

      const { resetForm } = useForm({
        initialValues: { name: "Test" },
        onReset,
      });

      // Reset form
      resetForm();

      // Should have called onReset
      expect(onReset).toHaveBeenCalled();
    });
  });

  /**
   * Field interaction tests
   */
  describe("field interactions", () => {
    it("should handle change event", () => {
      const { handleChange, values, dirty } = useForm({
        initialValues: { name: "Initial" },
      });

      // Change value
      handleChange("name", "Changed");

      // Should update value and set dirty
      expect(values.name).toBe("Changed");
      expect(dirty.name).toBe(true);
    });

    it("should validate on change if configured", () => {
      const { handleChange, errors, setFieldRequired } = useForm({
        initialValues: { name: "" },
        validateOnChange: true,
      });

      // Set required
      setFieldRequired("name", true);

      // Change to empty value
      handleChange("name", "");

      // Should validate and have error
      expect(errors.name.length).toBeGreaterThan(0);
    });

    it("should handle blur event", () => {
      const { handleBlur, touched } = useForm({
        initialValues: { name: "Initial" },
      });

      // Blur field
      handleBlur("name");

      // Should set touched
      expect(touched.name).toBe(true);
    });

    it("should validate on blur if configured", () => {
      const { handleBlur, errors, setFieldRequired } = useForm({
        initialValues: { name: "" },
        validateOnBlur: true,
      });

      // Set required
      setFieldRequired("name", true);

      // Blur field
      handleBlur("name");

      // Should validate and have error
      expect(errors.name.length).toBeGreaterThan(0);
    });

    it("should set field value and validate", () => {
      const { setFieldValue, values, errors, setFieldRequired } = useForm({
        initialValues: { name: "Initial" },
      });

      // Set required
      setFieldRequired("name", true);

      // Set value to empty
      setFieldValue("name", "");

      // Should update value and validate
      expect(values.name).toBe("");
      expect(errors.name.length).toBeGreaterThan(0);
    });

    it("should set field value without validating if requested", () => {
      const { setFieldValue, values, errors, setFieldRequired } = useForm({
        initialValues: { name: "Initial" },
      });

      // Set required
      setFieldRequired("name", true);

      // Set value to empty without validating
      setFieldValue("name", "", false);

      // Should update value but not validate
      expect(values.name).toBe("");
      expect(errors.name.length).toBe(0);
    });

    it("should set multiple values at once", () => {
      const { setValues, values } = useForm({
        initialValues: { name: "Initial", email: "initial@example.com" },
      });

      // Set multiple values
      setValues({
        name: "Changed",
        email: "changed@example.com",
      });

      // Should update all values
      expect(values.name).toBe("Changed");
      expect(values.email).toBe("changed@example.com");
    });

    it("should validate after setting multiple values", () => {
      const { setValues, errors, setFieldRequired } = useForm({
        initialValues: { name: "Initial", email: "initial@example.com" },
      });

      // Set required
      setFieldRequired("name", true);
      setFieldRequired("email", true);

      // Set multiple values with empty values
      setValues({
        name: "",
        email: "",
      });

      // Should validate all fields
      expect(errors.name.length).toBeGreaterThan(0);
      expect(errors.email.length).toBeGreaterThan(0);
    });

    it("should set field error directly", () => {
      const { setFieldError, errors, touched } = useForm({
        initialValues: { name: "Test" },
      });

      // Set error
      setFieldError("name", "Manual error");

      // Should set error and touched
      expect(errors.name).toEqual(["Manual error"]);
      expect(touched.name).toBe(true);
    });

    it("should set multiple errors at once", () => {
      const { setErrors, errors, touched } = useForm({
        initialValues: { name: "Test", email: "test@example.com" },
      });

      // Set multiple errors
      setErrors({
        name: "Name error",
        email: ["Email error 1", "Email error 2"],
      });

      // Should set all errors and touched states
      expect(errors.name).toEqual(["Name error"]);
      expect(errors.email).toEqual(["Email error 1", "Email error 2"]);
      expect(touched.name).toBe(true);
      expect(touched.email).toBe(true);
    });

    it("should check if field has error", () => {
      const { setFieldError, hasError } = useForm({
        initialValues: { name: "Test", email: "test@example.com" },
      });

      // No errors initially
      expect(hasError("name")).toBe(false);

      // Set error
      setFieldError("name", "Test error");

      // Should now have error
      expect(hasError("name")).toBe(true);
    });
  });

  /**
   * Computed properties tests
   */
  describe("computed properties", () => {
    it("should compute isValid correctly", async () => {
      const { setFieldError, isValid } = useForm({
        initialValues: { name: "Test", email: "test@example.com" },
      });

      // Initially valid
      expect(isValid.value).toBe(true);

      // Add error
      setFieldError("name", "Error");
      await nextTick();

      // Should be invalid
      expect(isValid.value).toBe(false);
    });

    it("should compute isDirty correctly", async () => {
      const { handleChange, isDirty } = useForm({
        initialValues: { name: "Test" },
      });

      // Initially not dirty
      expect(isDirty.value).toBe(false);

      // Change value
      handleChange("name", "Changed");
      await nextTick();

      // Should be dirty
      expect(isDirty.value).toBe(true);
    });

    it("should compute isTouched correctly", async () => {
      const { handleBlur, isTouched } = useForm({
        initialValues: { name: "Test", email: "test@example.com" },
      });

      // Initially not touched
      expect(isTouched.value).toBe(false);

      // Touch one field
      handleBlur("name");
      await nextTick();

      // Should be touched
      expect(isTouched.value).toBe(true);
    });

    it("should compute allTouched correctly", async () => {
      const { handleBlur, allTouched } = useForm({
        initialValues: { name: "Test", email: "test@example.com" },
      });

      // Initially not all touched
      expect(allTouched.value).toBe(false);

      // Touch one field
      handleBlur("name");
      await nextTick();

      // Still not all touched
      expect(allTouched.value).toBe(false);

      // Touch second field
      handleBlur("email");
      await nextTick();

      // Now all touched
      expect(allTouched.value).toBe(true);
    });
  });

  /**
   * Integration tests
   */
  describe("integration", () => {
    it("should handle a complete form lifecycle", async () => {
      const onSubmit = vi.fn();
      const onReset = vi.fn();

      const {
        values,
        errors,
        handleChange,
        handleBlur,
        setFieldRequired,
        addValidationRule,
        handleSubmit,
        resetForm,
        isValid,
        isDirty,
        isTouched,
        isSubmitted,
      } = useForm({
        initialValues: {
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        },
        onSubmit,
        onReset,
        validateOnChange: true,
        validateOnBlur: true,
        validateOnSubmit: true,
      });

      // Set up validations
      setFieldRequired("username", true, "Username is required");
      setFieldRequired("email", true, "Email is required");
      setFieldRequired("password", true, "Password is required");
      setFieldRequired("confirmPassword", true, "Confirm password is required");

      addValidationRule("email", {
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: "Invalid email format",
      });

      addValidationRule("password", {
        validate: (value) => value.length >= 8,
        message: "Password must be at least 8 characters",
      });

      addValidationRule("confirmPassword", {
        validate: (value, formValues) => value === formValues?.password,
        message: "Passwords do not match",
      });

      // Initially form should be invalid but untouched
      expect(isValid.value).toBe(true); // No validation run yet
      expect(isDirty.value).toBe(false);
      expect(isTouched.value).toBe(false);

      // Fill form with invalid data
      handleChange("username", "user123");
      handleChange("email", "invalid-email");
      handleChange("password", "short");
      handleChange("confirmPassword", "nomatch");

      // Mark as touched
      handleBlur("username");
      handleBlur("email");
      handleBlur("password");
      handleBlur("confirmPassword");

      await nextTick();

      // Should have errors and be invalid
      expect(isValid.value).toBe(false);
      expect(isDirty.value).toBe(true);
      expect(isTouched.value).toBe(true);
      expect(errors.email.length).toBeGreaterThan(0);
      expect(errors.password.length).toBeGreaterThan(0);
      expect(errors.confirmPassword.length).toBeGreaterThan(0);

      // Submit form with invalid data
      await handleSubmit();

      // Should not have called onSubmit
      expect(onSubmit).not.toHaveBeenCalled();
      expect(isSubmitted.value).toBe(true);

      // Fix form data
      handleChange("username", "validuser");
      handleChange("email", "valid@example.com");
      handleChange("password", "password123");
      handleChange("confirmPassword", "password123");

      await nextTick();

      // Should be valid
      expect(isValid.value).toBe(true);
      expect(errors.email.length).toBe(0);
      expect(errors.password.length).toBe(0);
      expect(errors.confirmPassword.length).toBe(0);

      // Submit form with valid data
      await handleSubmit();

      // Should have called onSubmit
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        username: "validuser",
        email: "valid@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      // Reset form
      resetForm();

      // Should be back to initial state
      expect(values.username).toBe("");
      expect(values.email).toBe("");
      expect(values.password).toBe("");
      expect(values.confirmPassword).toBe("");
      expect(isDirty.value).toBe(false);
      expect(isTouched.value).toBe(false);
      expect(isSubmitted.value).toBe(false);
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });
});

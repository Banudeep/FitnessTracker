/**
 * Validation Schema Unit Tests
 */
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  getPasswordStrength,
  getFirstError,
  getFieldErrors,
} from "../authSchemas";

describe("loginSchema", () => {
  it("should validate valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "password123",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("Email");
  });

  it("should reject invalid email format", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("valid email");
  });

  it("should reject empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("Password");
  });
});

describe("signupSchema", () => {
  it("should validate valid signup data", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      confirmPassword: "Password1",
      displayName: "John Doe",
    });
    expect(result.success).toBe(true);
  });

  it("should reject weak password - too short", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "Pass1",
      confirmPassword: "Pass1",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("8 characters");
  });

  it("should reject password without uppercase", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "password1",
      confirmPassword: "password1",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("uppercase");
  });

  it("should reject password without number", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "Password",
      confirmPassword: "Password",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("number");
  });

  it("should reject mismatched passwords", () => {
    const result = signupSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      confirmPassword: "Password2",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("don't match");
  });
});

describe("forgotPasswordSchema", () => {
  it("should validate valid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("should validate valid password change", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "OldPassword1",
      newPassword: "NewPassword1",
      confirmPassword: "NewPassword1",
    });
    expect(result.success).toBe(true);
  });

  it("should reject if new password same as current", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "Password1",
      newPassword: "Password1",
      confirmPassword: "Password1",
    });
    expect(result.success).toBe(false);
    expect(getFirstError(result)).toContain("different");
  });
});

describe("getPasswordStrength", () => {
  it("should return Weak for short passwords", () => {
    const result = getPasswordStrength("abc");
    expect(result.label).toBe("Weak");
    expect(result.score).toBeLessThan(3);
  });

  it("should return Good for complex passwords", () => {
    const result = getPasswordStrength("Password1");
    expect(["Good", "Strong"]).toContain(result.label);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  it("should return Strong for very complex passwords", () => {
    const result = getPasswordStrength("MyP@ssw0rd123!");
    expect(result.label).toBe("Strong");
    expect(result.score).toBe(4);
  });
});

describe("getFieldErrors", () => {
  it("should return empty object for valid data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password",
    });
    expect(getFieldErrors(result)).toEqual({});
  });

  it("should return field-specific errors", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "",
    });
    const errors = getFieldErrors(result);
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

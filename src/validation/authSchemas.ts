/**
 * Authentication Validation Schemas
 * Uses Zod for runtime validation of auth form inputs
 */
import { z } from "zod";

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REQUIREMENTS = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

// Custom password validation
const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .refine(
    (val) => /[A-Z]/.test(val),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    (val) => /[a-z]/.test(val),
    "Password must contain at least one lowercase letter"
  )
  .refine(
    (val) => /[0-9]/.test(val),
    "Password must contain at least one number"
  );

// Email validation
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

// Display name validation
const displayNameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be less than 50 characters")
  .optional();

/**
 * Login form validation schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Signup form validation schema
 */
export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    displayName: displayNameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;

/**
 * Forgot password validation schema
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Change password validation schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Helper function to extract first error message from Zod validation
 */
export function getFirstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  const firstError = result.error.errors[0];
  return firstError?.message || "Validation error";
}

/**
 * Helper to get all field errors from Zod validation
 */
export function getFieldErrors(
  result: z.SafeParseReturnType<unknown, unknown>
): Record<string, string> {
  if (result.success) return {};
  
  const errors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const field = error.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = error.message;
    }
  }
  return errors;
}

/**
 * Password strength indicator
 */
export function getPasswordStrength(password: string): {
  score: number; // 0-4
  label: "Weak" | "Fair" | "Good" | "Strong";
  color: string;
} {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  // Normalize to 0-4
  score = Math.min(4, score);
  
  const labels: Array<"Weak" | "Fair" | "Good" | "Strong"> = ["Weak", "Fair", "Good", "Strong"];
  const colors = ["#EF4444", "#F59E0B", "#22C55E", "#22C55E"];
  
  const index = Math.max(0, score - 1);
  
  return {
    score,
    label: labels[index] || "Weak",
    color: colors[index] || "#EF4444",
  };
}

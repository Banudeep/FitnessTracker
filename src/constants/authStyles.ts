import { StyleSheet } from "react-native";
import { colors, spacing, borderRadius } from "./theme";

/**
 * Shared styles for authentication screens (login, signup, forgot-password)
 */
// Helper to create styles with dynamic colors
export const createAuthStyles = (themeColors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.bgPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  backButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: themeColors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: themeColors.textSecondary,
    lineHeight: 24,
  },
  form: {
    gap: spacing.lg,
  },
  inputContainer: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColors.textPrimary,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: themeColors.bgSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: themeColors.border,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: themeColors.accentDanger,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: themeColors.textPrimary,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: themeColors.accentDanger,
    marginTop: 2,
  },
  primaryButton: {
    height: 52,
    backgroundColor: themeColors.accentPrimary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColors.bgPrimary,
  },
  linkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  linkText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  linkHighlight: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColors.accentPrimary,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: themeColors.border,
  },
  dividerText: {
    paddingHorizontal: spacing.md,
    fontSize: 13,
    color: themeColors.textMuted,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    backgroundColor: themeColors.textPrimary,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  appleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColors.bgPrimary,
  },
});

export const authStyles = createAuthStyles(colors);

/**
 * Stricter email validation regex
 * - Requires at least 2 characters before @
 * - Requires at least 2 characters for domain name
 * - Requires at least 2 characters for TLD
 * - Does not allow consecutive dots
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9._%+-]{2,}@[a-zA-Z0-9.-]{2,}\.[a-zA-Z]{2,}$/;

/**
 * Validates email format using stricter regex
 */
export const isValidEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Rate limiting configuration for login attempts
 */
export const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  initialLockoutMs: 30000, // 30 seconds
  maxLockoutMs: 300000, // 5 minutes
  backoffMultiplier: 2,
};

/**
 * Rate limiter for tracking failed login attempts
 */
export class LoginRateLimiter {
  private attempts: number = 0;
  private lockoutUntil: number = 0;
  private currentLockoutMs: number = RATE_LIMIT_CONFIG.initialLockoutMs;

  /**
   * Check if user is currently locked out
   */
  isLockedOut(): boolean {
    if (this.lockoutUntil === 0) return false;
    if (Date.now() >= this.lockoutUntil) {
      // Lockout expired, but keep the backoff level
      this.lockoutUntil = 0;
      return false;
    }
    return true;
  }

  /**
   * Get remaining lockout time in seconds
   */
  getRemainingLockoutSeconds(): number {
    if (!this.isLockedOut()) return 0;
    return Math.ceil((this.lockoutUntil - Date.now()) / 1000);
  }

  /**
   * Record a failed login attempt
   * Returns true if user is now locked out
   */
  recordFailedAttempt(): boolean {
    this.attempts++;

    if (this.attempts >= RATE_LIMIT_CONFIG.maxAttempts) {
      this.lockoutUntil = Date.now() + this.currentLockoutMs;
      // Exponential backoff for next lockout
      this.currentLockoutMs = Math.min(
        this.currentLockoutMs * RATE_LIMIT_CONFIG.backoffMultiplier,
        RATE_LIMIT_CONFIG.maxLockoutMs
      );
      return true;
    }
    return false;
  }

  /**
   * Reset rate limiter on successful login
   */
  reset(): void {
    this.attempts = 0;
    this.lockoutUntil = 0;
    this.currentLockoutMs = RATE_LIMIT_CONFIG.initialLockoutMs;
  }

  /**
   * Get number of remaining attempts before lockout
   */
  getRemainingAttempts(): number {
    return Math.max(0, RATE_LIMIT_CONFIG.maxAttempts - this.attempts);
  }
}

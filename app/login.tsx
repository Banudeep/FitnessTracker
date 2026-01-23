import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors as defaultColors, spacing } from "../src/constants/theme";
import { useColors } from "../src/contexts/ThemeContext";
import {
  authStyles as defaultAuthStyles,
  createAuthStyles,
  isValidEmail,
  LoginRateLimiter,
} from "../src/constants/authStyles";
import { useAuthStore } from "../src/stores/authStore";
import { showToast } from "../src/components/ui";
import { loginSchema, getFieldErrors } from "../src/validation/authSchemas";
import { performFullSync } from "../src/services/syncService";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signIn, signInApple, isLoading } = useAuthStore();

  const authStyles = React.useMemo(() => createAuthStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );
  const [appleLoading, setAppleLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Refs for input focus management
  const passwordRef = useRef<TextInput>(null);
  const rateLimiter = useRef(new LoginRateLimiter()).current;

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const timer = setTimeout(
        () => setLockoutSeconds(lockoutSeconds - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lockoutSeconds]);

  const validate = (): boolean => {
    const result = loginSchema.safeParse({ email, password });

    if (!result.success) {
      const fieldErrors = getFieldErrors(result);
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSignIn = async () => {
    // Check rate limiting
    if (rateLimiter.isLockedOut()) {
      const remaining = rateLimiter.getRemainingLockoutSeconds();
      setLockoutSeconds(remaining);
      showToast({
        type: "error",
        title: `Too many attempts. Try again in ${remaining} seconds`,
      });
      return;
    }

    if (!validate()) return;

    const result = await signIn(email.trim(), password);

    if (result.success) {
      rateLimiter.reset();
      setLoginError(null);
      showToast({ type: "success", title: "Welcome back!" });

      // Trigger background sync
      performFullSync().then((res) => {
        if (res.success && res.downloaded > 0) {
          showToast({
            type: "success",
            title: "Data Synced",
            message: `Downloaded ${res.downloaded} items`,
          });
        }
      });

      router.replace("/(tabs)");
    } else {
      const isLockedOut = rateLimiter.recordFailedAttempt();
      const remaining = rateLimiter.getRemainingAttempts();

      if (isLockedOut) {
        const lockoutTime = rateLimiter.getRemainingLockoutSeconds();
        setLockoutSeconds(lockoutTime);
        setLoginError(`Too many attempts. Please try again in ${lockoutTime} seconds.`);
      } else {
        // Check if this is an invalid-credential error - show signup prompt
        if (result.errorCode === "auth/invalid-credential") {
          setShowSignupPrompt(true);
        }
        const errorMsg = result.error || "Sign in failed";
        const attemptsMsg = remaining <= 3 ? ` (${remaining} attempts left)` : "";
        setLoginError(errorMsg + attemptsMsg);
      }
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const result = await signInApple();

      if (result.success) {
        showToast({ type: "success", title: "Welcome!" });

        // Trigger background sync
        performFullSync().then((res) => {
          if (res.success && res.downloaded > 0) {
            showToast({
              type: "success",
              title: "Data Synced",
              message: `Downloaded ${res.downloaded} items`,
            });
          }
        });

        router.replace("/(tabs)");
      } else {
        showToast({
          type: "error",
          title: result.error || "Apple sign in failed",
        });
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const localStyles = React.useMemo(() => createLocalStyles(colors), [colors]);

  return (
    <SafeAreaView style={authStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <TouchableOpacity
            style={authStyles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous screen"
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={authStyles.header}>
            <Text style={authStyles.title}>Welcome Back</Text>
            <Text style={authStyles.subtitle}>
              Sign in to sync your workouts and access your data
            </Text>
          </View>

          {/* Form */}
          <View style={authStyles.form}>
            {/* Email */}
            <View style={authStyles.inputContainer}>
              <Text style={authStyles.label}>Email</Text>
              <View
                style={[
                  authStyles.inputWrapper,
                  errors.email && authStyles.inputError,
                ]}
              >
                <Mail
                  size={20}
                  color={colors.textMuted}
                  style={authStyles.inputIcon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors({ ...errors, email: undefined });
                    if (loginError) setLoginError(null);
                    if (showSignupPrompt) setShowSignupPrompt(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Email address"
                  accessibilityHint="Enter your email to sign in"
                />
              </View>
              {errors.email && (
                <Text
                  style={authStyles.errorText}
                  accessibilityLiveRegion="polite"
                >
                  {errors.email}
                </Text>
              )}
            </View>

            {/* Password */}
            <View style={authStyles.inputContainer}>
              <Text style={authStyles.label}>Password</Text>
              <View
                style={[
                  authStyles.inputWrapper,
                  errors.password && authStyles.inputError,
                ]}
              >
                <Lock
                  size={20}
                  color={colors.textMuted}
                  style={authStyles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={authStyles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password)
                      setErrors({ ...errors, password: undefined });
                    if (loginError) setLoginError(null);
                    if (showSignupPrompt) setShowSignupPrompt(false);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  accessibilityLabel="Password"
                  accessibilityHint="Enter your password to sign in"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={authStyles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                  accessibilityHint="Toggles password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text
                  style={authStyles.errorText}
                  accessibilityLiveRegion="polite"
                >
                  {errors.password}
                </Text>
              )}
            </View>

            {/* Inline Error Display */}
            {loginError && (
              <View style={localStyles.loginErrorContainer}>
                <Text style={localStyles.loginErrorText}>{loginError}</Text>
              </View>
            )}

            {/* Signup Prompt - shown when login fails with invalid credential */}
            {showSignupPrompt && (
              <View style={localStyles.signupPromptContainer}>
                <Text style={localStyles.signupPromptText}>
                  Don't have an account?
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/signup")}
                  accessibilityRole="link"
                  accessibilityLabel="Create an account"
                >
                  <Text style={localStyles.signupPromptLink}>Sign up here</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Forgot Password */}
            <TouchableOpacity
              style={localStyles.forgotPassword}
              onPress={() => router.push("/forgot-password")}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
              accessibilityHint="Navigate to password reset screen"
            >
              <Text style={localStyles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[
                authStyles.primaryButton,
                (isLoading || lockoutSeconds > 0) && authStyles.buttonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isLoading || lockoutSeconds > 0}
              accessibilityRole="button"
              accessibilityLabel={
                lockoutSeconds > 0
                  ? `Sign in disabled. Try again in ${lockoutSeconds} seconds`
                  : "Sign in"
              }
              accessibilityState={{ disabled: isLoading || lockoutSeconds > 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.bgPrimary} />
              ) : lockoutSeconds > 0 ? (
                <Text style={authStyles.primaryButtonText}>
                  Wait {lockoutSeconds}s
                </Text>
              ) : (
                <Text style={authStyles.primaryButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Sign Up Link */}
            <View style={authStyles.linkContainer}>
              <Text style={authStyles.linkText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push("/signup")}
                accessibilityRole="link"
                accessibilityLabel="Sign up"
                accessibilityHint="Navigate to create account screen"
              >
                <Text style={authStyles.linkHighlight}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Apple Sign-In (iOS only) */}
            {Platform.OS === "ios" && (
              <>
                <View style={authStyles.dividerContainer}>
                  <View style={authStyles.divider} />
                  <Text style={authStyles.dividerText}>or</Text>
                  <View style={authStyles.divider} />
                </View>

                <TouchableOpacity
                  style={[
                    authStyles.appleButton,
                    appleLoading && authStyles.buttonDisabled,
                  ]}
                  onPress={handleAppleSignIn}
                  disabled={isLoading || appleLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Apple"
                  accessibilityHint="Sign in using your Apple ID"
                  accessibilityState={{ disabled: isLoading || appleLoading }}
                >
                  {appleLoading ? (
                    <ActivityIndicator color={colors.bgPrimary} />
                  ) : (
                    <>
                      <Ionicons
                        name="logo-apple"
                        size={22}
                        color={colors.bgPrimary}
                      />
                      <Text style={authStyles.appleButtonText}>
                        Continue with Apple
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Continue without account */}
          <View style={localStyles.skipContainer}>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              accessibilityRole="link"
              accessibilityLabel="Continue without an account"
              accessibilityHint="Skip sign in and use app with local data only"
            >
              <Text style={localStyles.skipText}>Continue without an account</Text>
            </TouchableOpacity>
            <Text style={localStyles.skipNote}>
              Your data will only be stored locally on this device
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Screen-specific styles (shared styles imported from authStyles)
const createLocalStyles = (themeColors: any) => StyleSheet.create({
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    fontSize: 14,
    color: themeColors.accentPrimary,
    fontWeight: "500",
  },
  skipContainer: {
    marginTop: "auto",
    paddingTop: spacing.xxxl,
    alignItems: "center",
  },
  skipText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    fontWeight: "500",
    textDecorationLine: "underline",
    marginBottom: spacing.sm,
  },
  skipNote: {
    fontSize: 12,
    color: themeColors.textMuted,
    textAlign: "center",
  },
  signupPromptContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232, 149, 106, 0.1)",
    padding: spacing.md,
    borderRadius: 8,
    gap: 4,
  },
  signupPromptText: {
    fontSize: 14,
    color: themeColors.textSecondary,
  },
  signupPromptLink: {
    fontSize: 14,
    fontWeight: "600",
    color: themeColors.accentPrimary,
    textDecorationLine: "underline",
  },
  loginErrorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  loginErrorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
});

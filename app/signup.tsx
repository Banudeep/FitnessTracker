import React, { useState, useRef } from "react";
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
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from "lucide-react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors as defaultColors, spacing } from "../src/constants/theme";
import { useColors } from "../src/contexts/ThemeContext";
import { authStyles as defaultAuthStyles, createAuthStyles, isValidEmail } from "../src/constants/authStyles";
import { useAuthStore } from "../src/stores/authStore";
import { showToast } from "../src/components/ui";
import {
  signupSchema,
  getFieldErrors,
  getPasswordStrength,
} from "../src/validation/authSchemas";
import { performFullSync } from "../src/services/syncService";

export default function SignUpScreen() {
  const router = useRouter();
  const colors = useColors();
  const { signUp, signInApple, isLoading } = useAuthStore();

  const authStyles = React.useMemo(() => createAuthStyles(colors), [colors]);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [appleLoading, setAppleLoading] = useState(false);

  // Refs for input focus management
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validate = (): boolean => {
    const result = signupSchema.safeParse({
      email,
      password,
      confirmPassword,
      displayName,
    });

    if (!result.success) {
      const fieldErrors = getFieldErrors(result);
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // Get password strength for UI
  const passwordStrength = getPasswordStrength(password);

  const handleSignUp = async () => {
    if (!validate()) return;

    const result = await signUp(email.trim(), password, displayName.trim());

    if (result.success) {
      showToast({ type: "success", title: "Account created successfully!" });

      // Trigger background sync (to upload any local data)
      performFullSync().then((res) => {
        if (res.success && res.uploaded > 0) {
          showToast({
            type: "success",
            title: "Data Synced",
            message: `Uploaded ${res.uploaded} items to cloud`,
          });
        }
      });

      router.replace("/(tabs)");
    } else {
      showToast({ type: "error", title: result.error || "Sign up failed" });
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
          if (res.success && res.uploaded > 0) {
            showToast({
              type: "success",
              title: "Data Synced",
              message: `Uploaded ${res.uploaded} items to cloud`,
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
            <Text style={authStyles.title}>Create Account</Text>
            <Text style={authStyles.subtitle}>
              Sign up to sync your workouts across devices
            </Text>
          </View>

          {/* Form */}
          <View style={authStyles.form}>
            {/* Display Name */}
            <View style={authStyles.inputContainer}>
              <Text style={authStyles.label}>Name</Text>
              <View
                style={[
                  authStyles.inputWrapper,
                  errors.displayName && authStyles.inputError,
                ]}
              >
                <User
                  size={20}
                  color={colors.textMuted}
                  style={authStyles.inputIcon}
                />
                <TextInput
                  style={authStyles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={displayName}
                  onChangeText={(text) => {
                    setDisplayName(text);
                    if (errors.displayName)
                      setErrors({ ...errors, displayName: undefined });
                  }}
                  autoCapitalize="words"
                  autoFocus
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Name"
                  accessibilityHint="Enter your display name"
                />
              </View>
              {errors.displayName && (
                <Text
                  style={authStyles.errorText}
                  accessibilityLiveRegion="polite"
                >
                  {errors.displayName}
                </Text>
              )}
            </View>

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
                  ref={emailRef}
                  style={authStyles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Email address"
                  accessibilityHint="Enter your email for your account"
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
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password)
                      setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  blurOnSubmit={false}
                  accessibilityLabel="Password"
                  accessibilityHint="Create a password with at least 6 characters"
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

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={localStyles.passwordStrengthContainer}>
                <View style={localStyles.passwordStrengthBars}>
                  {[0, 1, 2, 3].map((index) => (
                    <View
                      key={index}
                      style={[
                        localStyles.passwordStrengthBar,
                        {
                          backgroundColor:
                            index < passwordStrength.score
                              ? passwordStrength.color
                              : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text
                  style={[
                    localStyles.passwordStrengthText,
                    { color: passwordStrength.color },
                  ]}
                >
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            {/* Confirm Password */}
            <View style={authStyles.inputContainer}>
              <Text style={authStyles.label}>Confirm Password</Text>
              <View
                style={[
                  authStyles.inputWrapper,
                  errors.confirmPassword && authStyles.inputError,
                ]}
              >
                <Lock
                  size={20}
                  color={colors.textMuted}
                  style={authStyles.inputIcon}
                />
                <TextInput
                  ref={confirmPasswordRef}
                  style={authStyles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword)
                      setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  accessibilityLabel="Confirm password"
                  accessibilityHint="Re-enter your password to confirm"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={authStyles.eyeButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  accessibilityHint="Toggles confirm password visibility"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={colors.textMuted} />
                  ) : (
                    <Eye size={20} color={colors.textMuted} />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text
                  style={authStyles.errorText}
                  accessibilityLiveRegion="polite"
                >
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                authStyles.primaryButton,
                isLoading && authStyles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.bgPrimary} />
              ) : (
                <Text style={authStyles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={authStyles.linkContainer}>
              <Text style={authStyles.linkText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push("/login")}
                accessibilityRole="link"
                accessibilityLabel="Sign in"
                accessibilityHint="Navigate to sign in screen"
              >
                <Text style={authStyles.linkHighlight}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Apple Sign-In - iOS only */}
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
                  accessibilityLabel="Sign up with Apple"
                  accessibilityHint="Create an account using your Apple ID"
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
                        Sign up with Apple
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Terms */}
          <Text style={localStyles.terms}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Screen-specific styles (shared styles imported from authStyles)
const createLocalStyles = (themeColors: any) => StyleSheet.create({
  terms: {
    fontSize: 12,
    color: themeColors.textMuted,
    textAlign: "center",
    marginTop: "auto",
    paddingTop: spacing.xxl,
    lineHeight: 18,
  },
  passwordStrengthContainer: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  passwordStrengthBars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 4,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
  },
});

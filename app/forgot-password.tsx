import React, { useState } from "react";
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
import { Mail, ArrowLeft, CheckCircle } from "lucide-react-native";
import { colors as defaultColors, spacing } from "../src/constants/theme";
import { useColors } from "../src/contexts/ThemeContext";
import { authStyles as defaultAuthStyles, createAuthStyles, isValidEmail } from "../src/constants/authStyles";
import { useAuthStore } from "../src/stores/authStore";
import { showToast } from "../src/components/ui";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const { forgotPassword } = useAuthStore();
  
  const authStyles = React.useMemo(() => createAuthStyles(colors), [colors]);
  const localStyles = React.useMemo(() => createLocalStyles(colors), [colors]);

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  const validate = (): boolean => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setIsLoading(true);
    const result = await forgotPassword(email.trim());
    setIsLoading(false);

    if (result.success) {
      setEmailSent(true);
    } else {
      showToast({
        type: "error",
        title: result.error || "Failed to send reset email",
      });
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={authStyles.container}>
        <View style={localStyles.successContainer}>
          <View style={localStyles.successIcon}>
            <CheckCircle size={64} color={colors.accentSecondary} />
          </View>
          <Text style={localStyles.successTitle}>Check Your Email</Text>
          <Text style={localStyles.successMessage}>
            If an account exists for{"\n"}
            <Text style={localStyles.emailHighlight}>{email}</Text>
            {"\n"}you'll receive a password reset link.
          </Text>
          <Text style={localStyles.successNote}>
            • Check your spam/junk folder{"\n"}
            • Make sure you entered the correct email{"\n"}
            • If you never signed up, create an account instead
          </Text>

          <TouchableOpacity
            style={localStyles.backToLoginButton}
            onPress={() => router.replace("/login")}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
            accessibilityHint="Returns to the sign in screen"
          >
            <Text style={localStyles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.resendButton}
            onPress={() => setEmailSent(false)}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Go back to enter a different email"
          >
            <Text style={localStyles.resendText}>Didn't receive it? Try again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={localStyles.createAccountButton}
            onPress={() => router.replace("/signup")}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
          >
            <Text style={localStyles.createAccountText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={authStyles.title}>Reset Password</Text>
            <Text style={authStyles.subtitle}>
              Enter your email address and we'll send you a link to reset your
              password
            </Text>
          </View>

          {/* Form */}
          <View style={authStyles.form}>
            <View style={authStyles.inputContainer}>
              <Text style={authStyles.label}>Email</Text>
              <View
                style={[
                  authStyles.inputWrapper,
                  error && authStyles.inputError,
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
                    if (error) setError("");
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                  accessibilityLabel="Email address"
                  accessibilityHint="Enter the email associated with your account"
                />
              </View>
              {error && (
                <Text
                  style={authStyles.errorText}
                  accessibilityLiveRegion="polite"
                >
                  {error}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                authStyles.primaryButton,
                isLoading && authStyles.buttonDisabled,
              ]}
              onPress={handleResetPassword}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.bgPrimary} />
              ) : (
                <Text style={authStyles.primaryButtonText}>
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={localStyles.backToSignIn}
              onPress={() => router.back()}
              accessibilityRole="link"
              accessibilityLabel="Back to sign in"
              accessibilityHint="Returns to the sign in screen"
            >
              <Text style={localStyles.backToSignInText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Screen-specific styles (shared styles imported from authStyles)
const createLocalStyles = (themeColors: any) => StyleSheet.create({
  backToSignIn: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  backToSignInText: {
    fontSize: 14,
    color: themeColors.accentPrimary,
    fontWeight: "500",
  },
  // Success state styles
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  successIcon: {
    marginBottom: spacing.xxl,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: themeColors.textPrimary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: themeColors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  emailHighlight: {
    color: themeColors.textPrimary,
    fontWeight: "600",
  },
  successNote: {
    fontSize: 14,
    color: themeColors.textMuted,
    textAlign: "center",
    marginBottom: spacing.xxxl,
  },
  backToLoginButton: {
    width: "100%",
    height: 52,
    backgroundColor: themeColors.accentPrimary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backToLoginText: {
    fontSize: 16,
    fontWeight: "600",
    color: themeColors.bgPrimary,
  },
  resendButton: {
    padding: spacing.md,
  },
  resendText: {
    fontSize: 14,
    color: themeColors.textSecondary,
    textDecorationLine: "underline",
  },
  createAccountButton: {
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  createAccountText: {
    fontSize: 14,
    color: themeColors.accentPrimary,
    fontWeight: "500",
  },
});

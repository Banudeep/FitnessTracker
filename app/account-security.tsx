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
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Trash2,
} from "lucide-react-native";
import {
  colors as defaultColors,
  spacing,
  borderRadius,
  typography,
} from "../src/constants/theme";
import { useColors } from "../src/contexts/ThemeContext";
import {
  changePassword,
  deleteAccountWithPassword,
} from "../src/services/auth";
import { useAuthStore } from "../src/stores/authStore";
import { showToast } from "../src/components/ui";
import { ConfirmModal } from "../src/components/ui/BottomSheet";

type SecuritySection = "main" | "change-password" | "delete-account";

export default function AccountSecurityScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, signOut } = useAuthStore();

  const [activeSection, setActiveSection] = useState<SecuritySection>("main");
  const [isLoading, setIsLoading] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Refs
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validatePasswordChange = (): boolean => {
    const errors: { current?: string; new?: string; confirm?: string } = {};

    if (!currentPassword) {
      errors.current = "Current password is required";
    }

    if (!newPassword) {
      errors.new = "New password is required";
    } else if (newPassword.length < 6) {
      errors.new = "Password must be at least 6 characters";
    } else if (newPassword === currentPassword) {
      errors.new = "New password must be different from current";
    }

    if (!confirmPassword) {
      errors.confirm = "Please confirm your new password";
    } else if (newPassword !== confirmPassword) {
      errors.confirm = "Passwords do not match";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordChange()) return;

    setIsLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setIsLoading(false);

    if (result.success) {
      showToast({ type: "success", title: "Password changed successfully" });
      setActiveSection("main");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      showToast({
        type: "error",
        title: result.error || "Failed to change password",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showToast({ type: "error", title: "Please enter your password" });
      return;
    }

    setShowDeleteConfirm(false);
    setIsLoading(true);
    const result = await deleteAccountWithPassword(deletePassword);
    setIsLoading(false);

    if (result.success) {
      showToast({ type: "success", title: "Account deleted successfully" });
      await signOut();
      router.replace("/(tabs)");
    } else {
      showToast({
        type: "error",
        title: result.error || "Failed to delete account",
      });
    }
  };

  const renderMainSection = () => (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Account Security</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Manage your password and account settings
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.bgSecondary }]}>
        <TouchableOpacity
          style={[styles.securityItem, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
          onPress={() => setActiveSection("change-password")}
          activeOpacity={0.7}
        >
          <View style={styles.securityItemLeft}>
            <View style={[styles.iconContainer, { backgroundColor: colors.accentPrimary + '20' }]}>
              <Lock size={20} color={colors.accentPrimary} />
            </View>
            <View>
              <Text style={[styles.securityItemTitle, { color: colors.textPrimary }]}>Change Password</Text>
              <Text style={[styles.securityItemSubtitle, { color: colors.textMuted }]}>
                Update your account password
              </Text>
            </View>
          </View>
          <ArrowLeft
            size={20}
            color={colors.textMuted}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.securityItem, styles.dangerItem, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}
          onPress={() => setActiveSection("delete-account")}
          activeOpacity={0.7}
        >
          <View style={styles.securityItemLeft}>
            <View style={[styles.iconContainer, styles.dangerIconContainer]}>
              <Trash2 size={20} color={colors.accentDanger} />
            </View>
            <View>
              <Text style={[styles.securityItemTitle, styles.dangerText]}>
                Delete Account
              </Text>
              <Text style={[styles.securityItemSubtitle, { color: colors.textMuted }]}>
                Permanently delete your account and data
              </Text>
            </View>
          </View>
          <ArrowLeft
            size={20}
            color={colors.textMuted}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.infoBox, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
        <Shield size={20} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Your account is secured with Firebase Authentication. We never store
          your password directly.
        </Text>
      </View>
    </>
  );

  const renderChangePasswordSection = () => (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Change Password</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter your current password and choose a new one
        </Text>
      </View>

      <View style={[styles.form, { backgroundColor: colors.bgSecondary }]}>
        {/* Current Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Password</Text>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.bgSecondary, borderColor: colors.border },
              passwordErrors.current && styles.inputError,
            ]}
          >
            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Enter current password"
              placeholderTextColor={colors.textMuted}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (passwordErrors.current) {
                  setPasswordErrors({ ...passwordErrors, current: undefined });
                }
              }}
              secureTextEntry={!showCurrentPassword}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => newPasswordRef.current?.focus()}
            />
            <TouchableOpacity
              onPress={() => setShowCurrentPassword(!showCurrentPassword)}
              style={styles.eyeButton}
            >
              {showCurrentPassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          {passwordErrors.current && (
            <Text style={styles.errorText}>{passwordErrors.current}</Text>
          )}
        </View>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.bgSecondary, borderColor: colors.border },
              passwordErrors.new && styles.inputError,
            ]}
          >
            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              ref={newPasswordRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Enter new password"
              placeholderTextColor={colors.textMuted}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (passwordErrors.new) {
                  setPasswordErrors({ ...passwordErrors, new: undefined });
                }
              }}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
              style={styles.eyeButton}
            >
              {showNewPassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          {passwordErrors.new && (
            <Text style={styles.errorText}>{passwordErrors.new}</Text>
          )}
        </View>

        {/* Confirm New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: colors.bgSecondary, borderColor: colors.border },
              passwordErrors.confirm && styles.inputError,
            ]}
          >
            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              ref={confirmPasswordRef}
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Confirm new password"
              placeholderTextColor={colors.textMuted}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (passwordErrors.confirm) {
                  setPasswordErrors({ ...passwordErrors, confirm: undefined });
                }
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleChangePassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeButton}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
          {passwordErrors.confirm && (
            <Text style={styles.errorText}>{passwordErrors.confirm}</Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.bgPrimary} />
          ) : (
            <Text style={styles.primaryButtonText}>Update Password</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderDeleteAccountSection = () => (
    <>
      <View style={styles.header}>
        <Text style={[styles.title, styles.dangerText]}>Delete Account</Text>
        <Text style={styles.subtitle}>
          This action is permanent and cannot be undone
        </Text>
      </View>

      <View style={[styles.warningBox, { backgroundColor: colors.accentDanger + "15", borderColor: colors.accentDanger + "30" }]}>
        <Text style={[styles.warningTitle, { color: colors.accentDanger }]}>⚠️ Warning</Text>
        <Text style={[styles.warningText, { color: colors.textPrimary }]}>Deleting your account will:</Text>
        <Text style={styles.warningItem}>
          • Remove all your cloud-synced data
        </Text>
        <Text style={styles.warningItem}>
          • Cancel any active subscriptions
        </Text>
        <Text style={styles.warningItem}>
          • Delete your workout history from our servers
        </Text>
        <Text style={styles.warningNote}>
          Local data on this device will remain unless you uninstall the app.
        </Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Enter your password to confirm</Text>
          <View style={[styles.inputWrapper, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Lock size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry={!showDeletePassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowDeletePassword(!showDeletePassword)}
              style={styles.eyeButton}
            >
              {showDeletePassword ? (
                <EyeOff size={20} color={colors.textMuted} />
              ) : (
                <Eye size={20} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.dangerButton, isLoading && styles.buttonDisabled]}
          onPress={() => setShowDeleteConfirm(true)}
          disabled={isLoading || !deletePassword}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.dangerButtonText}>Delete My Account</Text>
          )}
        </TouchableOpacity>
      </View>

      <ConfirmModal
        visible={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account?"
        message="Are you absolutely sure? This will permanently delete your account and all associated data. This action cannot be undone."
        confirmText="Delete Forever"
        cancelText="Cancel"
        destructive
      />
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (activeSection === "main") {
                router.back();
              } else {
                setActiveSection("main");
                // Reset form states
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                setDeletePassword("");
                setPasswordErrors({});
              }
            }}
          >
            <ArrowLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          {activeSection === "main" && renderMainSection()}
          {activeSection === "change-password" && renderChangePasswordSection()}
          {activeSection === "delete-account" && renderDeleteAccountSection()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultColors.bgPrimary,
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
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: defaultColors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: defaultColors.textSecondary,
    lineHeight: 24,
  },
  section: {
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  securityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: defaultColors.border,
  },
  securityItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: defaultColors.accentPrimary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  dangerIconContainer: {
    backgroundColor: defaultColors.accentDanger + "20",
  },
  securityItemTitle: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "600",
  },
  securityItemSubtitle: {
    ...typography.caption,
    color: defaultColors.textSecondary,
    marginTop: 2,
  },
  dangerItem: {
    borderBottomWidth: 0,
  },
  dangerText: {
    color: defaultColors.accentDanger,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    ...typography.bodySmall,
    color: defaultColors.textMuted,
    lineHeight: 20,
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
    color: defaultColors.textPrimary,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: defaultColors.border,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: defaultColors.accentDanger,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: defaultColors.textPrimary,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: defaultColors.accentDanger,
    marginTop: 2,
  },
  primaryButton: {
    height: 52,
    backgroundColor: defaultColors.accentPrimary,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: defaultColors.bgPrimary,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  warningBox: {
    backgroundColor: defaultColors.accentDanger + "15",
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: defaultColors.accentDanger + "30",
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: defaultColors.accentDanger,
    marginBottom: spacing.sm,
  },
  warningText: {
    ...typography.body,
    color: defaultColors.textPrimary,
    marginBottom: spacing.sm,
  },
  warningItem: {
    ...typography.bodySmall,
    color: defaultColors.textSecondary,
    marginLeft: spacing.sm,
    marginBottom: 4,
  },
  warningNote: {
    ...typography.caption,
    color: defaultColors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
  },
  dangerButton: {
    height: 52,
    backgroundColor: defaultColors.accentDanger,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.md,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

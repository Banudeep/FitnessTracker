import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { X, Check, AlertTriangle, Info } from "lucide-react-native";
import {
  colors as defaultColors,
  spacing,
  borderRadius,
  typography,
} from "../../constants/theme";
import { useColors } from "../../contexts/ThemeContext";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Whether content should be scrollable */
  scrollable?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  scrollable = true,
}: BottomSheetProps) {
  const themeColors = useColors(); // Dynamic theme colors
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayTouchable} />
        </TouchableWithoutFeedback>
        <View style={[styles.container, { backgroundColor: themeColors.bgSecondary }]}>
          <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
          <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: themeColors.bgTertiary }]}>
              <X size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {scrollable ? (
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={true}
              bounces={true}
              nestedScrollEnabled={true}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.content}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

interface OptionItemProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
}

export function OptionItem({ label, selected, onPress }: OptionItemProps) {
  const themeColors = useColors(); // Dynamic theme colors
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionItem,
        { backgroundColor: themeColors.bgTertiary },
        { backgroundColor: selected ? themeColors.accentPrimary + "15" : themeColors.bgTertiary },
        pressed && { backgroundColor: themeColors.bgElevated },
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionLabel, 
          { color: selected ? themeColors.accentPrimary : themeColors.textPrimary }
        ]}
      >
        {label}
      </Text>
      {selected && <Check size={20} color={themeColors.accentPrimary} />}
    </Pressable>
  );
}

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  centered?: boolean;
}

export function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  destructive = false,
  centered = false,
}: ConfirmModalProps) {
  const colors = useColors();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              {/* Icon indicator */}
              <View
                style={[
                  styles.modalIconContainer,
                  {
                    backgroundColor: destructive
                      ? colors.accentDanger + "20"
                      : colors.accentWarning + "20",
                  },
                ]}
              >
                <AlertTriangle
                  size={28}
                  color={
                    destructive ? colors.accentDanger : colors.accentWarning
                  }
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{message}</Text>
              <View
                style={[
                  styles.modalButtons,
                  centered && styles.modalButtonsCentered,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonCancel,
                    { backgroundColor: colors.bgTertiary, borderColor: colors.border },
                    centered && styles.modalButtonCentered,
                  ]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalButtonCancelText, { color: colors.textSecondary }]}>{cancelText}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonConfirm,
                    { backgroundColor: colors.accentPrimary },
                    destructive && { backgroundColor: colors.accentDanger },
                    centered && styles.modalButtonCentered,
                  ]}
                  onPress={async () => {
                    await onConfirm();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.modalButtonConfirmText,
                      { color: "#FFFFFF" },
                      destructive && styles.modalButtonDestructiveText,
                    ]}
                  >
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export function InfoModal({
  visible,
  onClose,
  title,
  message,
}: InfoModalProps) {
  const colors = useColors();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContainer, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
              {/* Info icon */}
              <View
                style={[
                  styles.modalIconContainer,
                  { backgroundColor: colors.accentInfo + "20" },
                ]}
              >
                <Info size={28} color={colors.accentInfo} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
              <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{message}</Text>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonFull, { backgroundColor: colors.accentPrimary }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalButtonConfirmText, { color: "#FFFFFF" }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  // Bottom Sheet overlay - darker for better contrast
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    flex: 1,
  },
  // Bottom Sheet container - consistent dark theme
  container: {
    backgroundColor: defaultColors.bgSecondary,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: "85%",
    borderTopWidth: 1,
    borderTopColor: defaultColors.border,
  },
  scrollView: {
    flex: 1,
  },
  // Scrollable content area
  scrollContent: {
    maxHeight: 500,
  },
  scrollContentContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Handle bar - subtle indicator
  handle: {
    width: 36,
    height: 4,
    backgroundColor: defaultColors.borderLight,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  // Header - clean with proper spacing
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: defaultColors.border,
  },
  title: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: defaultColors.bgTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  // Content area
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: 500,
  },
  // Option items - for selection lists
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
    backgroundColor: defaultColors.bgTertiary,
  },
  optionItemSelected: {
    backgroundColor: defaultColors.accentPrimary + "20",
    borderWidth: 1,
    borderColor: defaultColors.accentPrimary + "40",
  },
  optionItemPressed: {
    backgroundColor: defaultColors.bgElevated,
    opacity: 0.9,
  },
  optionLabel: {
    ...typography.body,
    color: defaultColors.textPrimary,
  },
  optionLabelSelected: {
    color: defaultColors.accentPrimary,
    fontWeight: "600",
  },
  // Center Modal styles (ConfirmModal, InfoModal)
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  modalContainer: {
    backgroundColor: defaultColors.bgSecondary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: defaultColors.border,
    // Subtle shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.heading3,
    color: defaultColors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  modalMessage: {
    ...typography.body,
    color: defaultColors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  modalButtonsCentered: {
    flexDirection: "column",
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  modalButtonCentered: {
    flex: undefined,
    width: "100%",
    marginVertical: spacing.sm,
  },
  modalButtonCancel: {
    backgroundColor: defaultColors.bgTertiary,
    borderWidth: 1,
    borderColor: defaultColors.border,
  },
  modalButtonCancelText: {
    ...typography.body,
    color: defaultColors.textSecondary,
    fontWeight: "600",
  },
  modalButtonConfirm: {
    backgroundColor: defaultColors.accentPrimary,
  },
  modalButtonConfirmText: {
    ...typography.body,
    color: defaultColors.textPrimary,
    fontWeight: "700",
  },
  modalButtonDestructive: {
    backgroundColor: defaultColors.accentDanger,
  },
  modalButtonDestructiveText: {
    color: defaultColors.textPrimary,
    fontWeight: "700",
  },
  modalButtonFull: {
    backgroundColor: defaultColors.accentPrimary,
    flex: undefined,
    width: "100%",
  },
});

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
} from "lucide-react-native";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";
import { create } from "zustand";

// Toast types
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Toast store for global access
interface ToastState {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Helper function to show toasts from anywhere
export const showToast = (toast: Omit<ToastMessage, "id">) => {
  useToastStore.getState().addToast(toast);
};

// Individual Toast Component
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastMessage;
  onDismiss: () => void;
}) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const duration = toast.duration || 4000;
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIcon = () => {
    const iconSize = 20;
    switch (toast.type) {
      case "success":
        return <CheckCircle size={iconSize} color={colors.accentSecondary} />;
      case "error":
        return <AlertCircle size={iconSize} color={colors.accentDanger} />;
      case "warning":
        return <AlertTriangle size={iconSize} color={colors.accentWarning} />;
      case "info":
      default:
        return <Info size={iconSize} color={colors.accentInfo} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case "success":
        return colors.accentSecondary;
      case "error":
        return colors.accentDanger;
      case "warning":
        return colors.accentWarning;
      case "info":
      default:
        return colors.accentInfo;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY }],
          opacity,
          borderLeftColor: getBorderColor(),
        },
      ]}
    >
      <View style={styles.toastIcon}>{getIcon()}</View>
      <View style={styles.toastContent}>
        <Text style={styles.toastTitle}>{toast.title}</Text>
        {toast.message && (
          <Text style={styles.toastMessage}>{toast.message}</Text>
        )}
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.dismissButton}>
        <X size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Toast Container - renders all active toasts
export function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIcon: {
    marginRight: spacing.md,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  toastMessage: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
  dismissButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});

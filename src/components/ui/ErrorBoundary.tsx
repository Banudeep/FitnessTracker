import React, { Component, ErrorInfo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { AlertTriangle, RefreshCw, Home } from "lucide-react-native";
import {
  colors,
  spacing,
  typography,
  borderRadius,
} from "../../constants/theme";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console (in production, send to error tracking service)
    console.error("ErrorBoundary caught an error:", error);
    console.error("Error info:", errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle size={48} color={colors.accentDanger} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We're sorry, but something unexpected happened. Please try again
              or restart the app.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView
                style={styles.errorDetails}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.errorTitle}>Error Details (Dev Only):</Text>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                activeOpacity={0.7}
              >
                <RefreshCw size={20} color={colors.textPrimary} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  content: {
    alignItems: "center",
    maxWidth: 320,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${colors.accentDanger}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.heading2,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  errorDetails: {
    marginTop: spacing.xl,
    maxHeight: 200,
    backgroundColor: colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: "100%",
  },
  errorTitle: {
    ...typography.bodySmall,
    color: colors.accentWarning,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    color: colors.accentDanger,
    fontFamily: "monospace",
  },
  errorStack: {
    ...typography.caption,
    color: colors.textMuted,
    fontFamily: "monospace",
    marginTop: spacing.sm,
    fontSize: 10,
  },
  actions: {
    marginTop: spacing.xxl,
    flexDirection: "row",
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentPrimary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  retryButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});

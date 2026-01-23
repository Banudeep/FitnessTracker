import React from 'react';
import {
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { borderRadius, spacing, typography } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';
import { lightImpact, warningFeedback } from '../../services/haptics';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  enableHaptics?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  enableHaptics = true,
}) => {
  const colors = useColors();
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 10, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const handlePress = async () => {
    if (enableHaptics) {
      // Use warning haptic for danger variant, light for others
      if (variant === 'danger') {
        await warningFeedback();
      } else {
        await lightImpact();
      }
    }
    onPress();
  };

  const getBackgroundColor = () => {
    if (isDisabled) return colors.bgTertiary;
    switch (variant) {
      case 'primary':
        return colors.accentPrimary;
      case 'secondary':
        return 'transparent';
      case 'danger':
        return colors.accentDanger;
      case 'ghost':
        return 'transparent';
      default:
        return colors.accentPrimary;
    }
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.textPrimary;
      case 'danger':
        return '#FFFFFF';
      case 'ghost':
        return colors.accentPrimary;
      default:
        return '#FFFFFF';
    }
  };

  const getBorderColor = () => {
    if (variant === 'secondary') return colors.border;
    return 'transparent';
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 36;
      case 'md':
        return 44;
      case 'lg':
        return 52;
      default:
        return 44;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'md':
        return 16;
      case 'lg':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <AnimatedTouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1} // Disable default opacity change since we are scaling
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          height: getHeight(),
          borderWidth: variant === 'secondary' ? 1 : 0,
        },
        fullWidth && styles.fullWidth,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon ? spacing.sm : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </AnimatedTouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: '600',
  },
});

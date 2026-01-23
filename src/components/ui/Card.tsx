import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { borderRadius, spacing, shadows } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevated = false,
  padding = 'md',
}) => {
  const colors = useColors();
  
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'md':
        return spacing.lg;
      case 'lg':
        return spacing.xl;
      default:
        return spacing.lg;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: elevated ? colors.bgElevated : colors.bgSecondary,
    borderRadius: borderRadius.lg,
    padding: getPadding(),
    ...(elevated ? shadows.md : {}),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({});


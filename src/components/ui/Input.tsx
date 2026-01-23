import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { borderRadius, spacing, typography } from '../../constants/theme';
import { useColors } from '../../contexts/ThemeContext';
import { Minus, Plus } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.bgTertiary, color: colors.textPrimary },
          isFocused && { borderColor: colors.accentPrimary },
          error && { borderColor: colors.accentDanger },
          style,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={[styles.errorText, { color: colors.accentDanger }]}>{error}</Text>}
    </View>
  );
};

// Number input with +/- buttons
interface NumberInputProps {
  value: number;
  onValueChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onValueChange,
  step = 1,
  min = 0,
  max = 9999,
  label,
  unit,
  size = 'md',
}) => {
  const colors = useColors();
  
  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
  };

  const handleTextChange = (text: string) => {
    const numValue = parseFloat(text) || 0;
    const clampedValue = Math.min(max, Math.max(min, numValue));
    onValueChange(clampedValue);
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return { button: 32, input: 60, fontSize: 18 };
      case 'md':
        return { button: 40, input: 80, fontSize: 24 };
      case 'lg':
        return { button: 48, input: 100, fontSize: 32 };
      default:
        return { button: 40, input: 80, fontSize: 24 };
    }
  };

  const sizeConfig = getSize();

  return (
    <View style={styles.numberInputContainer}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.numberInputRow}>
        <TouchableOpacity
          onPress={handleDecrement}
          style={[
            styles.numberButton,
            { width: sizeConfig.button, height: sizeConfig.button, backgroundColor: colors.bgTertiary },
          ]}
          activeOpacity={0.7}
        >
          <Minus size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.numberValueContainer}>
          <TextInput
            style={[
              styles.numberValue,
              { fontSize: sizeConfig.fontSize, width: sizeConfig.input, color: colors.textPrimary },
            ]}
            value={value.toString()}
            onChangeText={handleTextChange}
            keyboardType="numeric"
            selectTextOnFocus
          />
          {unit && <Text style={[styles.unitText, { color: colors.textSecondary }]}>{unit}</Text>}
        </View>

        <TouchableOpacity
          onPress={handleIncrement}
          style={[
            styles.numberButton,
            { width: sizeConfig.button, height: sizeConfig.button, backgroundColor: colors.bgTertiary },
          ]}
          activeOpacity={0.7}
        >
          <Plus size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  numberInputContainer: {
    alignItems: 'center',
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  numberButton: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberValueContainer: {
    alignItems: 'center',
  },
  numberValue: {
    fontWeight: '700',
    textAlign: 'center',
  },
  unitText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});

// ============================================================================
// EVENTUALLY.VET - Input Component
// Styled text input with label support
// ============================================================================

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function Input({
  label,
  error,
  containerStyle,
  required,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ marginBottom: spacing.md }, containerStyle]}>
      {label && (
        <Text
          style={[
            typography.label,
            {
              color: focused ? theme.primary : theme.textSecondary,
              marginBottom: spacing.xs,
            },
          ]}
        >
          {label}
          {required && <Text style={{ color: theme.error }}> *</Text>}
        </Text>
      )}
      <TextInput
        style={[
          {
            backgroundColor: theme.surface,
            color: theme.text,
            borderWidth: 1.5,
            borderColor: error
              ? theme.error
              : focused
              ? theme.primary
              : theme.border,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md - 2,
            ...typography.body,
          },
        ]}
        placeholderTextColor={theme.textMuted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && (
        <Text
          style={[
            typography.caption,
            { color: theme.error, marginTop: spacing.xs },
          ]}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

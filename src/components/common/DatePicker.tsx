// ============================================================================
// EVENTUALLY.VET - DatePicker Component
// Native date picker (calendar modal) for all date fields
// Shows a tappable field that opens iOS/Android native date selector
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  StyleSheet,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';

interface DatePickerProps {
  label?: string;
  value: string; // ISO date string (YYYY-MM-DD) or empty
  onChange: (dateString: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  required,
  error,
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const { theme } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  // Parse the current value or default to today
  const currentDate = value ? new Date(value + 'T00:00:00') : new Date();

  function handleChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD
      onChange(dateString);
      if (Platform.OS === 'ios') {
        // Keep picker open on iOS until they dismiss
      }
    }
    if (event.type === 'dismissed') {
      setShowPicker(false);
    }
  }

  function handleDismissIOS() {
    setShowPicker(false);
  }

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label && (
        <Text
          style={[
            typography.label,
            { color: theme.textSecondary, marginBottom: spacing.xs },
          ]}
        >
          {label}
          {required && <Text style={{ color: theme.error }}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.error : theme.border,
          },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${label || 'Date'}. ${value ? formatDisplayDate(value) : 'Not set'}. Tap to select date.`}
      >
        <Ionicons name="calendar-outline" size={18} color={value ? theme.primary : theme.textMuted} />
        <Text
          style={[
            typography.body,
            { color: value ? theme.text : theme.textMuted, flex: 1 },
          ]}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        {value && (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityLabel="Clear date"
          >
            <Ionicons name="close-circle" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {error && (
        <Text style={[typography.caption, { color: theme.error, marginTop: spacing.xs }]}>
          {error}
        </Text>
      )}

      {/* iOS: Show in a modal */}
      {Platform.OS === 'ios' && showPicker && (
        <Modal transparent animationType="slide" visible={showPicker}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.surfaceElevated }]}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={handleDismissIOS}>
                  <Text style={[typography.bodyBold, { color: theme.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDate}
                mode="date"
                display="spinner"
                onChange={handleChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant="dark"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android: Shows inline */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display="default"
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
  },
});

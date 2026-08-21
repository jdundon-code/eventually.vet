// ============================================================================
// EVENTUALLY.VET - Add/Edit Note Screen
// Rich text note attached to any record type
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { typography, spacing } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { database } from '../../services/database';
import { Note } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

interface AddNoteScreenProps {
  navigation: any;
  route: {
    params: {
      parentId: string;
      parentType: 'appointment' | 'deployment' | 'duty_station' | 'condition' | 'general';
      noteId?: string;
    };
  };
}

export function AddNoteScreen({ navigation, route }: AddNoteScreenProps) {
  const { theme } = useTheme();
  const { parentId, parentType, noteId } = route.params;
  const isEdit = !!noteId;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Required';
    if (!content.trim()) newErrors.content = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      const note: Note = {
        id: noteId || generateId(),
        parentId,
        parentType,
        title: title.trim(),
        content: content.trim(),
        createdAt: getNowISO(),
        updatedAt: getNowISO(),
      };

      await database.saveNote(note);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save note.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  const parentLabel =
    parentType === 'appointment'
      ? 'Medical Appointment'
      : parentType === 'deployment'
      ? 'Deployment'
      : parentType === 'duty_station'
      ? 'Duty Station'
      : parentType === 'condition'
      ? 'Service Condition'
      : 'General';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>
            {isEdit ? 'Edit Note' : 'Add Note'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.parentInfo}>
          <Ionicons name="link" size={14} color={theme.textMuted} />
          <Text style={[typography.caption, { color: theme.textMuted }]}>
            Attached to: {parentLabel}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Summary of this note..."
          required
          error={errors.title}
        />

        <Input
          label="Content"
          value={content}
          onChangeText={setContent}
          placeholder="Write your detailed notes here. Include anything relevant to your VA claim — symptoms, conversations with providers, observations..."
          multiline
          numberOfLines={12}
          required
          error={errors.content}
          containerStyle={{ flex: 1 }}
        />

        <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.sm }]}>
          💡 Tip: The more detail you include now, the stronger your claim evidence later.
          Document specific dates, provider names, and exact symptoms.
        </Text>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title={isEdit ? 'Update Note' : 'Save Note'}
          onPress={handleSave}
          variant="primary"
          size="large"
          loading={saving}
          style={{ width: '100%' }}
          icon={<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: spacing.lg,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});

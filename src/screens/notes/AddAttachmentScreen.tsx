// ============================================================================
// EVENTUALLY.VET - Add Attachment Screen
// Allows picking documents or images to attach to records
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { database } from '../../services/database';
import { Attachment } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO } from '../../utils/dates';

interface AddAttachmentScreenProps {
  navigation: any;
  route: {
    params: {
      parentId: string;
      parentType: 'appointment' | 'deployment' | 'duty_station' | 'condition' | 'note';
    };
  };
}

export function AddAttachmentScreen({ navigation, route }: AddAttachmentScreenProps) {
  const { theme } = useTheme();
  const { parentId, parentType } = route.params;

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document.');
      console.error(error);
    }
  }

  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant photo library access to attach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = asset.uri.split('/').pop() || 'photo.jpg';
        setSelectedFile({
          uri: asset.uri,
          name: filename,
          type: asset.mimeType || 'image/jpeg',
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
      console.error(error);
    }
  }

  async function takePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please grant camera access to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const filename = `photo_${Date.now()}.jpg`;
        setSelectedFile({
          uri: asset.uri,
          name: filename,
          type: 'image/jpeg',
          size: asset.fileSize || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo.');
      console.error(error);
    }
  }

  async function handleSave() {
    if (!selectedFile) {
      Alert.alert('No File', 'Please select a file or take a photo first.');
      return;
    }

    setSaving(true);
    try {
      const attachment: Attachment = {
        id: generateId(),
        parentId,
        parentType,
        fileName: selectedFile.name,
        fileUri: selectedFile.uri,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        description: description.trim() || undefined,
        createdAt: getNowISO(),
      };

      await database.saveAttachment(attachment);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save attachment.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const isImage = selectedFile?.type?.startsWith('image/');

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Add Attachment</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <View style={styles.content}>
        {/* Source Selection */}
        <Text style={[typography.label, { color: theme.primary, marginBottom: spacing.md }]}>
          SELECT SOURCE
        </Text>

        <View style={styles.sourceGrid}>
          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={pickDocument}
          >
            <Ionicons name="document-text" size={32} color={theme.primary} />
            <Text style={[typography.bodySmall, { color: theme.text }]}>Document</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>PDF, records</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={pickImage}
          >
            <Ionicons name="images" size={32} color={theme.primary} />
            <Text style={[typography.bodySmall, { color: theme.text }]}>Photo Library</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>Existing photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sourceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={takePhoto}
          >
            <Ionicons name="camera" size={32} color={theme.primary} />
            <Text style={[typography.bodySmall, { color: theme.text }]}>Camera</Text>
            <Text style={[typography.caption, { color: theme.textMuted }]}>Take photo</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {selectedFile && (
          <Card style={{ marginTop: spacing.lg }}>
            <Text style={[typography.label, { color: theme.success, marginBottom: spacing.sm }]}>
              ✓ FILE SELECTED
            </Text>
            {isImage && (
              <Image
                source={{ uri: selectedFile.uri }}
                style={styles.preview}
                resizeMode="cover"
              />
            )}
            <View style={styles.fileInfo}>
              <Ionicons
                name={isImage ? 'image' : 'document'}
                size={24}
                color={theme.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={[typography.caption, { color: theme.textMuted }]}>
                  {selectedFile.type} • {formatFileSize(selectedFile.size)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={24} color={theme.error} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Description */}
        <View style={{ marginTop: spacing.lg }}>
          <Input
            label="Description (Optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What is this document? e.g., MRI results, DD-214, LOD..."
            multiline
            numberOfLines={2}
          />
        </View>

        <Text style={[typography.caption, { color: theme.textMuted, marginTop: spacing.sm }]}>
          📎 Attach medical records, lab results, photos of injuries, DD-214, LOD statements,
          buddy letters, or any other supporting documentation.
        </Text>
      </View>

      {/* Save Button */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          title="Save Attachment"
          onPress={handleSave}
          variant="primary"
          size="large"
          loading={saving}
          disabled={!selectedFile}
          style={{ width: '100%' }}
          icon={<Ionicons name="attach" size={20} color="#FFFFFF" />}
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  sourceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sourceCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  preview: {
    width: '100%',
    height: 150,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});

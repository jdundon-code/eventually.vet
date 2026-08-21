// ============================================================================
// EVENTUALLY.VET - Calendar Import Screen
// Reads device calendar and prompts user to import medical appointments
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { useTheme } from '../../theme';
import { typography, spacing, borderRadius } from '../../theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { database } from '../../services/database';
import { MedicalAppointment } from '../../models/types';
import { generateId } from '../../utils/uuid';
import { getNowISO, formatDateTime } from '../../utils/dates';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location?: string;
  notes?: string;
  calendarId: string;
  calendarTitle: string;
  alreadyImported: boolean;
}

// Keywords that suggest a medical appointment
const medicalKeywords = [
  'doctor', 'dr.', 'dr ', 'md', 'medical', 'appointment', 'clinic',
  'hospital', 'health', 'dental', 'dentist', 'therapy', 'physical therapy',
  'pt ', 'mental health', 'counseling', 'psychiatr', 'psycholog',
  'orthoped', 'surgery', 'specialist', 'referral', 'lab', 'blood',
  'x-ray', 'mri', 'ct scan', 'ultrasound', 'radiology', 'pharmacy',
  'prescription', 'rx', 'check-up', 'checkup', 'annual', 'physical',
  'optometry', 'vision', 'eye', 'audiolog', 'hearing', 'cardio',
  'dermatol', 'neurol', 'urgent care', 'er ', 'emergency',
  'tricare', 'va ', 'womack', 'walter reed', 'bethesda', 'bamc',
  'madigan', 'darnall', 'winn', 'blanchfield', 'mtf',
];

export function CalendarImportScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hasPermission, setHasPermission] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    requestPermissionAndLoad();
  }, []);

  async function requestPermissionAndLoad() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      setHasPermission(true);
      await loadCalendarEvents();
    } catch (error) {
      console.error('Calendar permission error:', error);
      setLoading(false);
    }
  }

  async function loadCalendarEvents() {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

      // Get events from the past 2 years and future 6 months
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 2);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      const allEvents: CalendarEvent[] = [];

      for (const calendar of calendars) {
        try {
          const calEvents = await Calendar.getEventsAsync(
            [calendar.id],
            startDate,
            endDate
          );

          for (const event of calEvents) {
            // Filter for likely medical appointments
            const titleLower = (event.title || '').toLowerCase();
            const locationLower = (event.location || '').toLowerCase();
            const notesLower = (event.notes || '').toLowerCase();
            const combinedText = `${titleLower} ${locationLower} ${notesLower}`;

            const isMedical = medicalKeywords.some((keyword) =>
              combinedText.includes(keyword)
            );

            if (isMedical) {
              allEvents.push({
                id: event.id,
                title: event.title || 'Untitled Event',
                startDate: event.startDate,
                endDate: event.endDate,
                location: event.location || undefined,
                notes: event.notes || undefined,
                calendarId: calendar.id,
                calendarTitle: calendar.title,
                alreadyImported: false, // We'll check this below
              });
            }
          }
        } catch (e) {
          // Skip calendars we can't read
        }
      }

      // Check which events are already imported
      const profile = await database.getUserProfile();
      if (profile) {
        const existingAppointments = await database.getAppointments(profile.id);
        const importedCalendarIds = new Set(
          existingAppointments
            .filter((a) => a.calendarEventId)
            .map((a) => a.calendarEventId)
        );

        allEvents.forEach((event) => {
          if (importedCalendarIds.has(event.id)) {
            event.alreadyImported = true;
          }
        });
      }

      // Sort by date (newest first)
      allEvents.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      Alert.alert('Error', 'Failed to read calendar events.');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(eventId: string) {
    const newSelected = new Set(selected);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelected(newSelected);
  }

  function selectAll() {
    const importable = events.filter((e) => !e.alreadyImported);
    if (selected.size === importable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importable.map((e) => e.id)));
    }
  }

  async function handleImport() {
    if (selected.size === 0) {
      Alert.alert('None Selected', 'Please select at least one event to import.');
      return;
    }

    setImporting(true);
    try {
      const profile = await database.getUserProfile();
      if (!profile) return;

      let imported = 0;
      for (const eventId of selected) {
        const event = events.find((e) => e.id === eventId);
        if (!event) continue;

        const appointment: MedicalAppointment = {
          id: generateId(),
          userId: profile.id,
          title: event.title,
          appointmentType: guessAppointmentType(event.title),
          provider: '', // User will need to fill in
          facility: event.location || '',
          date: event.startDate,
          endDate: event.endDate,
          chiefComplaint: event.notes || 'Imported from calendar — add details',
          followUpRequired: false,
          relatedToService: false,
          source: 'calendar_import',
          calendarEventId: event.id,
          notes: `Imported from calendar: ${event.calendarTitle}`,
          createdAt: getNowISO(),
          updatedAt: getNowISO(),
        };

        await database.saveAppointment(appointment);
        imported++;
      }

      // Update last sync time
      await database.setSetting('lastCalendarSync', getNowISO());

      Alert.alert(
        'Import Complete',
        `Successfully imported ${imported} appointment${imported !== 1 ? 's' : ''}.\n\nPlease review each one to add provider names, chief complaints, and mark service-connected items.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import some events.');
      console.error(error);
    } finally {
      setImporting(false);
    }
  }

  function renderEvent({ item }: { item: CalendarEvent }) {
    const isSelected = selected.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.eventCard,
          {
            backgroundColor: item.alreadyImported
              ? theme.surface
              : isSelected
              ? theme.primary + '15'
              : theme.surface,
            borderColor: item.alreadyImported
              ? theme.border
              : isSelected
              ? theme.primary
              : theme.border,
            opacity: item.alreadyImported ? 0.6 : 1,
          },
        ]}
        onPress={() => !item.alreadyImported && toggleSelect(item.id)}
        disabled={item.alreadyImported}
        activeOpacity={0.7}
      >
        <View style={styles.eventCheckbox}>
          {item.alreadyImported ? (
            <Ionicons name="checkmark-done" size={22} color={theme.success} />
          ) : isSelected ? (
            <Ionicons name="checkbox" size={22} color={theme.primary} />
          ) : (
            <Ionicons name="square-outline" size={22} color={theme.textMuted} />
          )}
        </View>
        <View style={styles.eventInfo}>
          <Text style={[typography.bodyBold, { color: theme.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[typography.bodySmall, { color: theme.textSecondary }]}>
            {formatDateTime(item.startDate)}
          </Text>
          {item.location && (
            <View style={styles.eventLocation}>
              <Ionicons name="location-outline" size={12} color={theme.textMuted} />
              <Text style={[typography.caption, { color: theme.textMuted }]} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>
        {item.alreadyImported && (
          <View style={[styles.importedBadge, { backgroundColor: theme.success + '20' }]}>
            <Text style={[typography.overline, { color: theme.success }]}>IMPORTED</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // No permission state
  if (!loading && !hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[typography.h3, { color: theme.text }]}>Import Calendar</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={styles.centeredContent}>
          <Ionicons name="calendar-outline" size={64} color={theme.textMuted} />
          <Text style={[typography.h4, { color: theme.text, marginTop: spacing.lg }]}>
            Calendar Access Required
          </Text>
          <Text style={[typography.body, { color: theme.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
            EVENTUALLY.VET needs access to your calendar to find medical appointments.
            Please grant calendar access in your device settings.
          </Text>
          <Button
            title="Open Settings"
            onPress={() => Alert.alert('Settings', 'Please open device Settings > Privacy > Calendars')}
            variant="primary"
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </View>
    );
  }

  const importableCount = events.filter((e) => !e.alreadyImported).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[typography.h3, { color: theme.text }]}>Import Calendar</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: spacing.xs }]}>
          Medical events detected from your device calendar
        </Text>

        {/* Select All / Count */}
        {!loading && events.length > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={selectAll} style={styles.selectAllBtn}>
              <Ionicons
                name={selected.size === importableCount ? 'checkbox' : 'square-outline'}
                size={18}
                color={theme.primary}
              />
              <Text style={[typography.buttonSmall, { color: theme.primary }]}>
                {selected.size === importableCount ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {selected.size} of {importableCount} selected
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[typography.body, { color: theme.textSecondary, marginTop: spacing.md }]}>
            Scanning your calendar...
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEvent}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.centeredContent}>
              <Ionicons name="search-outline" size={56} color={theme.textMuted} />
              <Text style={[typography.h4, { color: theme.textMuted, marginTop: spacing.md }]}>
                No medical events found
              </Text>
              <Text style={[typography.bodySmall, { color: theme.textMuted, textAlign: 'center' }]}>
                We scanned your calendar for medical keywords but didn't find any matches.
                You can add appointments manually.
              </Text>
            </View>
          }
        />
      )}

      {/* Import Button */}
      {!loading && selected.size > 0 && (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Button
            title={`Import ${selected.size} Appointment${selected.size !== 1 ? 's' : ''}`}
            onPress={handleImport}
            variant="primary"
            size="large"
            loading={importing}
            style={{ width: '100%' }}
            icon={<Ionicons name="download" size={20} color="#FFFFFF" />}
          />
        </View>
      )}
    </View>
  );
}

// Guess appointment type from title text
function guessAppointmentType(title: string): MedicalAppointment['appointmentType'] {
  const lower = title.toLowerCase();
  if (lower.includes('dental') || lower.includes('dentist')) return 'dental';
  if (lower.includes('mental') || lower.includes('psych') || lower.includes('counseling')) return 'mental_health';
  if (lower.includes('physical therapy') || lower.includes(' pt ')) return 'physical_therapy';
  if (lower.includes('eye') || lower.includes('optom') || lower.includes('vision')) return 'vision';
  if (lower.includes('audio') || lower.includes('hearing')) return 'audiology';
  if (lower.includes('ortho') || lower.includes('bone') || lower.includes('joint')) return 'orthopedic';
  if (lower.includes('cardio') || lower.includes('heart')) return 'cardiology';
  if (lower.includes('derm') || lower.includes('skin')) return 'dermatology';
  if (lower.includes('neuro')) return 'neurology';
  if (lower.includes('x-ray') || lower.includes('mri') || lower.includes('ct scan')) return 'radiology';
  if (lower.includes('surgery') || lower.includes('surgical')) return 'surgery';
  if (lower.includes('emergency') || lower.includes('er ') || lower.includes('urgent')) return 'emergency';
  if (lower.includes('va ') || lower.includes('c&p')) return 'va_exam';
  return 'primary_care';
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.sm,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing.md,
  },
  eventCheckbox: {
    width: 28,
    alignItems: 'center',
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  importedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
});

// ============================================================================
// EVENTUALLY.VET - App Navigator
// Main navigation structure with bottom tabs and stack screens
// All screens properly wired including Settings, Security, Buddy Letters,
// VA Content, Resources, Cloud Backup, Paywall, and Privacy Policy
// ============================================================================

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

// Core Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AppointmentsListScreen } from '../screens/appointments/AppointmentsListScreen';
import { AddAppointmentScreen } from '../screens/appointments/AddAppointmentScreen';
import { AppointmentDetailScreen } from '../screens/appointments/AppointmentDetailScreen';
import { DeploymentsListScreen } from '../screens/deployments/DeploymentsListScreen';
import { AddDeploymentScreen } from '../screens/deployments/AddDeploymentScreen';
import { DutyStationsListScreen } from '../screens/dutystations/DutyStationsListScreen';
import { AddDutyStationScreen } from '../screens/dutystations/AddDutyStationScreen';
import { VAClaimScreen } from '../screens/vaclaim/VAClaimScreen';
import { CalendarImportScreen } from '../screens/calendar/CalendarImportScreen';
import { AddNoteScreen } from '../screens/notes/AddNoteScreen';
import { AddAttachmentScreen } from '../screens/notes/AddAttachmentScreen';
import { AddConditionScreen } from '../screens/conditions/AddConditionScreen';

// v2.0 Screens
import { CloudBackupScreen } from '../screens/settings/CloudBackupScreen';
import { SecuritySettingsScreen } from '../screens/settings/SecuritySettingsScreen';
import { PrivacyPolicyScreen } from '../screens/settings/PrivacyPolicyScreen';
import { BuddyLettersListScreen } from '../screens/buddyletters/BuddyLettersListScreen';
import { CreateBuddyLetterScreen } from '../screens/buddyletters/CreateBuddyLetterScreen';
import { BuddyLetterDetailScreen } from '../screens/buddyletters/BuddyLetterDetailScreen';
import { VAContentScreen } from '../screens/vacontent/VAContentScreen';
import { ResourcesListScreen } from '../screens/resources/ResourcesListScreen';
import { ResourceDetailScreen } from '../screens/resources/ResourceDetailScreen';
import { PaywallScreen } from '../screens/subscription/PaywallScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// === Tab Screens with their own stacks ===

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardMain" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function AppointmentsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AppointmentsList" component={AppointmentsListScreen} />
    </Stack.Navigator>
  );
}

function ServiceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DeploymentsList" component={DeploymentsListScreen} />
    </Stack.Navigator>
  );
}

function StationsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DutyStationsList" component={DutyStationsListScreen} />
    </Stack.Navigator>
  );
}

function ClaimStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VAClaimMain" component={VAClaimScreen} />
    </Stack.Navigator>
  );
}

// === Main Tab Navigator ===

function TabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 25,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Appointments':
              iconName = focused ? 'medical' : 'medical-outline';
              break;
            case 'Deployments':
              iconName = focused ? 'globe' : 'globe-outline';
              break;
            case 'DutyStations':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'VAClaim':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsStack}
        options={{ tabBarLabel: 'Medical' }}
      />
      <Tab.Screen
        name="Deployments"
        component={ServiceStack}
        options={{ tabBarLabel: 'Deploy' }}
      />
      <Tab.Screen
        name="DutyStations"
        component={StationsStack}
        options={{ tabBarLabel: 'Stations' }}
      />
      <Tab.Screen
        name="VAClaim"
        component={ClaimStack}
        options={{ tabBarLabel: 'Claim' }}
      />
    </Tab.Navigator>
  );
}

// === Root Stack (tabs + all modal/push screens) ===

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={TabNavigator} />

      {/* Appointments */}
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />

      {/* Deployments */}
      <Stack.Screen name="AddDeployment" component={AddDeploymentScreen} />
      <Stack.Screen name="DeploymentDetail" component={DeploymentsListScreen} />

      {/* Duty Stations */}
      <Stack.Screen name="AddDutyStation" component={AddDutyStationScreen} />
      <Stack.Screen name="DutyStationDetail" component={DutyStationsListScreen} />

      {/* Calendar */}
      <Stack.Screen name="CalendarImport" component={CalendarImportScreen} />

      {/* Notes & Attachments */}
      <Stack.Screen name="AddNote" component={AddNoteScreen} />
      <Stack.Screen name="AddAttachment" component={AddAttachmentScreen} />

      {/* Conditions */}
      <Stack.Screen name="AddCondition" component={AddConditionScreen} />
      <Stack.Screen name="Conditions" component={AddConditionScreen} />

      {/* Settings & Security */}
      <Stack.Screen name="Settings" component={SecuritySettingsScreen} />
      <Stack.Screen name="Security" component={SecuritySettingsScreen} />
      <Stack.Screen name="CloudBackup" component={CloudBackupScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

      {/* Buddy Letters */}
      <Stack.Screen name="BuddyLetters" component={BuddyLettersListScreen} />
      <Stack.Screen name="CreateBuddyLetter" component={CreateBuddyLetterScreen} />
      <Stack.Screen name="BuddyLetterDetail" component={BuddyLetterDetailScreen} />

      {/* VA Content & Resources */}
      <Stack.Screen name="VAContent" component={VAContentScreen} />
      <Stack.Screen name="Resources" component={ResourcesListScreen} />
      <Stack.Screen name="ResourceDetail" component={ResourceDetailScreen} />

      {/* Subscription */}
      <Stack.Screen name="Paywall" component={PaywallScreen} />
    </Stack.Navigator>
  );
}

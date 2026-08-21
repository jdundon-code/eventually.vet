# EVENTUALLY.VET

> **Your Service. Your Records. Your Future.**

A mobile app designed for active duty military members and veterans to track medical appointments, deployments, duty stations, and build evidence for VA disability claims — from the first day of service through separation, retirement, and beyond.

---

## 🎯 Purpose

The VA disability claims process requires extensive documentation of medical visits, service conditions, deployments, and exposures — often spanning 20+ years of service. EVENTUALLY.VET helps service members start documenting from day one, so when they eventually file, they have a comprehensive evidence package ready.

## 🏗️ Architecture

- **React Native (Expo)** — Cross-platform iOS/Android
- **TypeScript** — Full type safety
- **expo-sqlite** — Persistent local storage (data never leaves the device)
- **expo-calendar** — Calendar integration for appointment import
- **expo-document-picker / expo-image-picker** — Attachment support
- **React Navigation** — Tab + stack navigation

## 📱 Features

### Branch Theming
Choose your branch of service (Army, Navy, Air Force, Marines, Coast Guard, Space Force) for personalized military branding with authentic colors, mottos, and rank structures.

### Medical Appointments
- Full appointment tracking with 17 specialty types
- Provider, facility, chief complaint, diagnosis, treatment plans
- Mark appointments as service-connected
- Import from device calendar (smart keyword detection)
- Attach documents, photos, and lab results

### Deployments
- Operation name, location, base/FOB
- Combat zone, HFP, IDP indicators
- **Environmental hazard tracking** (16 common hazards + custom)
  - Burn pits, Agent Orange, DU, radiation, PFAS, etc.
- Critical for PACT Act presumptive claims

### Duty Stations (PCS History)
- Timeline view of assignments
- Base, unit, location, job title
- Supervisor info (for buddy letters)
- Current station highlighting

### Service Conditions
- Track conditions believed to be service-connected
- Onset date, diagnosis date, current status
- Link to deployments, duty stations, appointments
- VA claim status and rating tracking

### VA Claim Preparation
- **Readiness Score** (0-100%) showing documentation completeness
- Documentation checklist
- Evidence summary
- Conditions-to-claim list
- Environmental exposures summary (PACT Act ready)
- Export claim summary as formatted text

### Notes & Attachments
- Add notes to any record (appointments, deployments, stations)
- Attach documents (PDFs, medical records, DD-214)
- Photo attachments (injury photos, paperwork)
- Camera capture for in-the-moment documentation

### Calendar Integration
- Reads device calendar for medical events
- Smart detection using 50+ medical/military keywords
- Multi-select import
- Prevents duplicate imports
- Auto-categorizes by appointment type

## 🎨 Military Branding

Each branch has an authentic dark-mode theme:

| Branch | Primary | Secondary |
|--------|---------|-----------|
| Army | Gold (#C1A63D) | OD Green (#4B5320) |
| Navy | Navy Blue (#003B7A) | Gold (#C5A54E) |
| Air Force | Ultramarine (#00308F) | Silver (#A8B4C2) |
| Marines | Scarlet (#C62828) | Gold (#C5A54E) |
| Coast Guard | Blue (#003366) | Orange (#FF6600) |
| Space Force | Dark Blue (#0B1B3A) | Silver (#C0C0C0) |

## 🔒 Data Privacy

- **All data stored locally** on the device via SQLite
- No cloud sync, no external servers, no data collection
- Data persists indefinitely (critical for lifetime VA claim updates)
- Biometric lock support (planned)

## 📁 Project Structure

```
eventually-vet/
├── App.tsx                          # Root component
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
└── src/
    ├── components/common/           # Reusable UI components
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   └── Input.tsx
    ├── models/
    │   └── types.ts                 # All TypeScript interfaces
    ├── navigation/
    │   └── AppNavigator.tsx         # Tab + stack navigation
    ├── screens/
    │   ├── appointments/            # Medical appointment CRUD
    │   ├── calendar/                # Calendar import
    │   ├── conditions/              # Service condition tracking
    │   ├── dashboard/               # Home screen
    │   ├── deployments/             # Deployment tracking
    │   ├── dutystations/            # PCS history
    │   ├── notes/                   # Notes & attachments
    │   ├── onboarding/              # First-run setup
    │   └── vaclaim/                 # VA claim preparation
    ├── services/
    │   └── database.ts              # SQLite database layer
    ├── theme/
    │   ├── branchInfo.ts            # Branch metadata
    │   ├── colors.ts                # 6 branch color themes
    │   ├── ThemeContext.tsx          # React context provider
    │   ├── typography.ts            # Type system
    │   └── index.ts                 # Theme exports
    └── utils/
        ├── dates.ts                 # Date formatting
        └── uuid.ts                  # ID generation
```

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start Expo
npx expo start

# Run on iOS Simulator
npx expo run:ios

# Run on Android Emulator
npx expo run:android
```

## 📋 Requirements

- Node.js 18+
- Expo CLI
- iOS 15+ or Android 10+
- Xcode (for iOS development)
- Android Studio (for Android development)

## ⚠️ Disclaimer

EVENTUALLY.VET is not affiliated with, endorsed by, or connected to the U.S. Department of Veterans Affairs, the Department of Defense, or any branch of the U.S. military. This is a personal record-keeping tool designed to help service members organize their documentation.

---

*Built for those who serve — because your service deserves to be documented.*

# EVENTUALLY.VET — Getting Started (Working Prototype)

> **Goal:** Get the app running on your Chromebook browser AND your iPhone in under 10 minutes.

---

## Prerequisites

You need these installed on your Chromebook (in the Linux terminal):

### 1. Enable Linux on Chromebook (if not already done)
- Settings → Advanced → Developers → Turn on Linux

### 2. Install Node.js
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
```

### 3. Install Expo CLI
```bash
npm install -g expo-cli
```

### 4. Install Expo Go on iPhone
- Download **Expo Go** from the App Store (free)

---

## Quick Start

### Step 1: Clone the repo
```bash
git clone https://github.com/jdundon-code/eventually.vet.git
cd eventually.vet
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Start the development server
```bash
npx expo start --tunnel
```

> **Important:** The `--tunnel` flag is required on Chromebook. It routes through Expo's servers so your iPhone can connect.

### Step 4: Open on your devices

| Device | How |
|--------|-----|
| **Chromebook** | Press `w` in the terminal to open in Chrome |
| **iPhone** | Open Expo Go app → scan the QR code from the terminal |

**That's it.** The app is running on both devices simultaneously.

---

## What You'll See

On first launch, the app loads with **demo data** already populated so you can immediately explore all features:

- **23 medical appointments** (various types, some service-connected)
- **3 deployments** (with hazard exposures)
- **4 duty stations** (PCS timeline)
- **5 service conditions** (linked to appointments/deployments)
- **Sample buddy letters** (showing the pipeline)

The demo data matches a Marine Sergeant with 6 years of service — the same profile shown in the HTML demo.

---

## Testing Each Feature

### On Chromebook (Chrome browser):
✅ All screens and navigation work
✅ Data entry forms work
✅ Theme switching works
✅ VA presumptive matching works
✅ Subscription/paywall screens work
⚠️ Calendar import — not available in browser
⚠️ Biometric lock — not available in browser (PIN works)
⚠️ Camera/document picker — limited in browser

### On iPhone (Expo Go):
✅ Everything works including:
- Calendar import (reads your real calendar!)
- Face ID / Touch ID
- Camera for attachments
- Document picker
- Email composer for buddy letters
- Native share sheet
- Push notifications (when configured)

---

## Troubleshooting

### "Cannot connect" when scanning QR code
```bash
# Kill the server and restart with tunnel
npx expo start --tunnel --clear
```

### Dependency errors during `npm install`
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules
npm install
```

### "Expo Go is outdated" warning
- Update Expo Go from the App Store
- Or run: `npx expo install expo@latest`

### Web view shows blank screen
```bash
# Install web dependencies
npx expo install react-dom react-native-web @expo/metro-runtime
npx expo start --web
```

---

## Developing

### Live Reload
Edit any file → save → the app updates instantly on both devices. No rebuild needed.

### File Structure (key files to edit)
```
src/
├── screens/          ← UI screens (what you see)
├── services/         ← Business logic (data, cloud, auth)
├── components/       ← Reusable UI pieces
├── theme/            ← Colors, fonts, branch themes
└── models/types.ts   ← Data model definitions
```

### Key commands
```bash
npx expo start --tunnel    # Start for Chromebook + iPhone
npx expo start --web       # Start for Chromebook only (faster)
npx expo start --ios       # Start for iPhone only
```

---

## Next Steps After Testing

1. **Supabase setup** (for cloud backup): See `supabase/schema.sql`
2. **RevenueCat setup** (for subscriptions): Configure in `subscriptionService.ts`
3. **Build standalone app**: `npx expo prebuild` then `eas build`
4. **Submit to App Store**: `eas submit --platform ios`

---

## Support

All code is at: https://github.com/jdundon-code/eventually.vet

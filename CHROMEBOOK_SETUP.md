# EVENTUALLY.VET — Chromebook + iPhone/iPad Development Guide

> **Yes, you can develop and test this app entirely from a Chromebook!**

This guide covers how to get the app running on your iPhone/iPad using only your Chromebook — no Mac or PC required.

---

## ✅ What You Need

| Item | Required? | Notes |
|------|-----------|-------|
| Chromebook | ✅ | Any Chromebook from the last 3-4 years with Linux (Crostini) support |
| iPhone or iPad | ✅ | iOS 16+ (iPhone 8 or newer, iPad 6th gen or newer) |
| Internet connection | ✅ | For Expo and EAS builds |
| Expo Go app (free) | ✅ | Download from App Store on your iPhone/iPad |
| Expo account (free) | ✅ | Sign up at expo.dev |
| Apple Developer account | ❌ (for testing) | Only needed for App Store submission ($99/yr) |

---

## 🚀 Step-by-Step: Chromebook Setup

### 1. Enable Linux on Chromebook

1. Go to **Settings** → **Advanced** → **Developers**
2. Click **Turn on** next to "Linux development environment"
3. Follow the prompts (allocate at least 10GB disk space)
4. A Terminal window will open when ready

### 2. Install Node.js

In the Linux terminal:

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal, then:
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x
npm --version
```

### 3. Clone & Install the App

```bash
git clone https://github.com/jdundon-code/eventually.vet.git
cd eventually.vet
npm install
```

### 4. Start the Development Server

```bash
npx expo start --tunnel
```

> **Important:** Use `--tunnel` flag on Chromebook! This routes through Expo's servers so your iPhone can connect even if they're not on the same network/subnet.

### 5. Run on iPhone/iPad

1. Open the **Expo Go** app on your iPhone/iPad (free from App Store)
2. Scan the QR code shown in your terminal
3. The app loads and runs on your actual device! 🎉

**That's it.** Live reload works — edit code on Chromebook, see changes instantly on your phone.

---

## 📱 Supported Devices (Minimum Requirements)

We target modern devices only — no legacy support needed:

### iOS
| Device | Minimum |
|--------|---------|
| iPhone | iPhone 8 or newer (2017+) |
| iPad | iPad 6th gen or newer (2018+) |
| iOS Version | iOS 16+ |

### Android (if needed later)
| Device | Minimum |
|--------|---------|
| Android | Android 10+ (API 29) |
| RAM | 3GB+ |

### Why these minimums?
- iPhone 8+ supports all modern APIs (Face ID on X+, but Touch ID works fine)
- iOS 16+ covers ~95% of active iPhones
- Ensures smooth performance for SQLite, camera, file system
- No need to support iPhone 6/7 or older iPads

---

## 🏗️ Building a Real App (No Mac Required!)

### Option A: EAS Build (Recommended — Cloud Build)

EAS Build compiles your app in the cloud. You don't need a Mac or Xcode.

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Build for iOS (runs in Expo's cloud)
eas build --platform ios --profile preview

# Build for Android
eas build --platform android --profile preview
```

**After ~15 minutes**, you get a download link. For iOS:
- **Development builds** → Install via Expo Go or a development client
- **TestFlight builds** → Requires Apple Developer account ($99/yr)
- **Production builds** → Submit to App Store

### Option B: Expo Go (Development Only)

This is what you're already doing with `npx expo start --tunnel`. It's instant but limited to Expo SDK features (which is everything we use).

---

## 📋 Complete Workflow (Chromebook Only)

```
1. Edit code in Linux terminal (nano/vim) or install VS Code
2. Run `npx expo start --tunnel`
3. Test on iPhone via Expo Go
4. When ready for real build: `eas build --platform ios`
5. Install TestFlight build on your iPhone
6. Submit to App Store when ready
```

### Install VS Code on Chromebook (Optional but Recommended)

```bash
# Download the .deb package
wget https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-arm64
# Or for x64 Chromebooks:
wget https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64

# Install
sudo dpkg -i code_*.deb
sudo apt-get install -f
```

---

## 📐 Responsive Design

The app is built with React Native which handles responsiveness natively:

- **iPhone SE (small)** → Compact layout, scrollable
- **iPhone 14/15 (standard)** → Optimal layout
- **iPhone 15 Pro Max (large)** → Expanded layout with more visible content
- **iPad** → Same app scales up, larger touch targets, more grid columns

React Native's `Dimensions` API and flex layout handle all screen sizes automatically. The app uses:
- Percentage-based widths where appropriate
- `flex: 1` for dynamic content areas
- Fixed sizes only for icons/buttons (always ≥44pt for accessibility)
- ScrollView for content that may exceed screen height

---

## 🔧 Troubleshooting

### "Cannot connect to development server"
- Make sure you're using `--tunnel` flag
- Check that your Chromebook has internet access
- Try: `npx expo start --tunnel --clear`

### "Linux container not starting"
- Restart your Chromebook
- Check Settings → Developers → Linux is still enabled

### "npm install fails"
- Make sure you have enough disk space (10GB+)
- Try: `npm cache clean --force && npm install`

### "Expo Go shows blank screen"
- Make sure your iPhone and Chromebook are both online
- Kill and reopen Expo Go
- Re-scan the QR code

---

## 💡 Tips

- **Save battery:** Close the Expo Go app when not testing
- **Fast iterations:** Shake your iPhone to open Expo dev menu (reload, debug)
- **Multiple devices:** Scan the same QR code on iPhone AND iPad to test both
- **Offline testing:** The app works offline after first load (local SQLite)

---

## 🚫 What You CAN'T Do on Chromebook

| Task | Solution |
|------|----------|
| Run iOS Simulator | Not possible — use real device via Expo Go |
| Use Xcode | Not needed — EAS Build handles compilation |
| Submit to App Store directly | Use `eas submit` from terminal (still needs Apple Dev account) |
| Debug native crashes | Use Expo's error reporting; native debugging requires Mac |

---

*Bottom line: Chromebook + iPhone + Expo = fully functional development setup. No Mac needed until you want to submit to the App Store (and even then, EAS Submit handles it from terminal).*

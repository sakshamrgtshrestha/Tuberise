# TubeRise 🎬🪙

> Earn coins by engaging with YouTube. Spend coins to grow your channel.

---

## Quick Start (Expo Go)

### 1. Install dependencies
```bash
cd "c:\Users\Acer Nitro v 15\Desktop\starts app\Tuberise"
npm install
```

### 2. Start the dev server
```bash
npx expo start --clear
```

### 3. Scan the QR code
- Install **Expo Go** on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) | [iOS](https://apps.apple.com/app/expo-go/id982107779))
- Scan the QR code shown in the terminal
- The app will load on your device

---

## App Structure

```
TubeRise/
├── App.js                        ← Root entry point
├── babel.config.js               ← Reanimated plugin
├── app.json                      ← Expo config
└── src/
    ├── theme/
    │   ├── colors.js             ← All brand colors
    │   └── typography.js         ← Roboto font tokens
    ├── data/
    │   └── mockData.js           ← Mock users, tasks, campaigns
    ├── context/
    │   ├── AuthContext.js        ← Google auth state (mock)
    │   └── CoinContext.js        ← Global coin balance
    ├── components/
    │   ├── YouTubeWebView.js     ← Core WebView component
    │   ├── TimerStrip.js         ← Countdown strip (black bar)
    │   └── ToastPill.js          ← Dark pill toast
    ├── navigation/
    │   └── AppNavigator.js       ← All routes + bottom tabs
    └── screens/
        ├── LoginScreen.js        ← Sign in with Google
        ├── HomeScreen.js         ← 4 task cards + stats
        ├── TaskDetailScreen.js   ← Routes to YouTubeWebView
        ├── CoinSuccessScreen.js  ← Coins earned animation
        ├── CampaignScreen.js     ← My campaigns list
        ├── CampaignCreationScreen.js ← Create a campaign
        ├── CampaignDetailScreen.js   ← Campaign progress
        ├── ProfileScreen.js      ← Profile + history
        └── AdminScreen.js        ← Warn / ban users
```

---

## Color Palette

| Token | Hex | Use |
|-------|-----|-----|
| Primary Red | `#E53935` | Logo, buttons, primary CTA |
| Dark Red | `#C62828` | Gradients |
| Blue | `#1A73E8` | "Return to App" button |
| Gold | `#FFC107` | Coin balance display |
| Success | `#43A047` | Coin credited, success states |
| Warning | `#E65100` | Warning banners, orange dots |

---

## Coin System

| Action | Coins Earned |
|--------|-------------|
| ▶ Watch video (full timer) | +25 🪙 |
| 🔔 Subscribe to channel | +40 🪙 |
| 👍 Like a video | +15 🪙 |
| 💬 Post a comment | +20 🪙 |

---

## Timer Logic

```
timer > 0     → YouTube blocked (transparent overlay)
              → "Return to App" → toast: "Watch the video first!"

timer = 0     → YouTube unlocked
              → action not done → toast: "You have not [action]..."
              → action done     → coins credited ✅
```

---

## Adding Firebase (Phase 2)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Add Android + iOS apps
3. Download `google-services.json` → place in `android/app/`
4. Download `GoogleService-Info.plist` → place in `ios/`
5. Replace mock auth in `src/context/AuthContext.js` with `@react-native-google-signin`
6. Replace coin operations in `src/context/CoinContext.js` with Firestore transactions
7. Deploy Cloud Functions from `functions/index.js`

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Create three separate Client IDs:
   - **Web application**: Required for Expo Go. Add `https://auth.expo.io` to Authorized redirect URIs.
   - **Android**: Package name must match your `app.json`.
   - **iOS**: Bundle ID must match your `app.json`.
6. Open `src/screens/LoginScreen.js` and replace the placeholder `YOUR_*_CLIENT_ID` values with your actual keys:

```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
  androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Replace with Android Client ID
  iosClientId: 'YOUR_IOS_CLIENT_ID',         // Replace with iOS Client ID
  webClientId: 'YOUR_WEB_CLIENT_ID',         // Replace with Web Client ID
});
```

---

## Running on Android Emulator

```bash
npx expo start --android
```

## Running on iOS Simulator (Mac only)

```bash
npx expo start --ios
```

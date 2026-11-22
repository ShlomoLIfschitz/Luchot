## 2026-11-23 — Portrait hardware feature not required (Play blocked build 22)
### What was done
- Play Console blocked sending build 22 (1.0.0) on the Alpha track: "הזמינות של האפליקציה מוגבלת בגלל הצהרות על תכונות חומרה נדרשות" — `android.hardware.screen.portrait`, affecting phone, tablet, Desktop, Android XR users.
- Cause: `"orientation": "portrait"` → `android:screenOrientation="portrait"` on MainActivity; Play infers the portrait feature as required. No explicit `uses-feature` existed (checked with `npx expo config --type introspect`).
- New config plugin `plugins/withPortraitNotRequired.js`, registered in `app.json`: adds `<uses-feature android:name="android.hardware.screen.portrait" android:required="false"/>`. The app stays locked to portrait.
- Shlomo chose to fix before sending ("לתקן קודם"), so build 22 is not sent; build 23 replaces it.
### Open issues / blocked
- Native change (`app.json` plugin): needs a full EAS build (production, versionCode 23), then the Alpha upload. Build 22's draft on the Alpha track is replaced by the new upload.
- Not known why build 20 passed without this warning.
### Next steps
- Production build 23 → Alpha, check that the issue is gone before sending.

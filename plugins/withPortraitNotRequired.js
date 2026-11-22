// plugins/withPortraitNotRequired.js
//
// `"orientation": "portrait"` sets android:screenOrientation="portrait" on
// MainActivity. Google Play infers from it the hardware feature
// android.hardware.screen.portrait as *required*, and blocked build 22 on the
// Alpha track (2026-11-23: "availability limited by required hardware
// features": Desktop, Android XR, some tablets). Declaring the feature explicitly as not required
// keeps the app locked to portrait while every device can install it.

const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withPortraitNotRequired(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const existing = features.find((f) => f.$['android:name'] === FEATURE);
    if (existing) {
      existing.$['android:required'] = 'false';
    } else {
      features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    }
    return cfg;
  });
};

## 2026-11-17 — Keyboard covers the note editor's Save button (Android)
### What was done
- Tester feedback: on Android, while typing in the event/note editor, the Save button was hidden; the keyboard had to be closed to reach it.
- Cause: the footer (Save / Cancel) was the last child of the ScrollView, and the `KeyboardAvoidingView` used `behavior="height"` on Android, which does nothing in a Modal under SDK 58's edge-to-edge (the window is no longer resized for the keyboard).
- Fix (`src/components/notes/NoteEditor.tsx`): the footer moved out of the ScrollView, so it sits at the bottom of the sheet; the `KeyboardAvoidingView` uses `padding` on both platforms, fills the overlay (`pointerEvents="box-none"` keeps backdrop taps working), and the sheet and ScrollView shrink to the space above the keyboard.
- JS-only: the Android fingerprint is unchanged (`77ff1c9…`, same as main at `1dd980a`, which production build 20 was built from), so this can reach build 20 as an OTA update.
### Decisions made
- Expo released 5 more SDK 58 patches overnight (expo, expo-calendar, expo-file-system, expo-router, expo-sqlite), so expo-doctor failed again. They are native packages: installing them changes the fingerprint, and the fix could no longer reach build 20 by OTA. They are listed in `package.json` `expo.install.exclude` for now (fingerprint verified unchanged); remove the exclude and run `npx expo install --fix` in the next release that is a full build anyway.
### Open issues / blocked
- Not verified on a device: needs a check on Android with the keyboard open (new event, long text).
### Next steps
- After merge: OTA to `preview`, device check; then Shlomo's OTA to `production` for the testers on build 20.
- Next full build: drop `expo.install.exclude`, `npx expo install --fix`.

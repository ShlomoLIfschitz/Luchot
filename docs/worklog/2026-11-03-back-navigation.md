## 2026-11-03 — Android back: drawer, main calendar, exit prompt (branch `fix/back-navigation`)
### What was done
- Shlomo: back with the drawer open navigated the screen behind it and left the drawer open; repeated back ended on "זמנים"; he wants back to end on the month view chosen in settings, and then a confirmation before exiting.
- `Drawer.tsx`: while open, Android back closes the drawer (same as tapping the backdrop).
- `app/(tabs)/_layout.tsx`: a back handler while the tab group is focused. From any other tab it goes to the main calendar. On the main calendar it shows "יציאה מהאפליקציה / האם אתה בטוח שברצונך לצאת?" with ביטול / יציאה, and only יציאה exits (`BackHandler.exitApp`). Cause of the old behaviour: the tab router's default `backBehavior: 'firstRoute'` returns to the first declared tab, which is זמנים because the tabs are declared in reverse for RTL.
- The tab handler uses `useFocusEffect`, which fires on the focus event after the navigation container has subscribed. It is therefore newer than navigation's listener and runs first. A v2 (`backBehavior="none"` plus a module-level listener) was written on the wrong assumption that v1 had failed on the device; in fact the OTA had not arrived yet. It was reverted after Shlomo confirmed v1 working.
- `settings.tsx`: the row "לוח ראשי" (עברי / לועזי), first in "לוח שנה". `defaultCalendarType` was already stored and persisted (`save` and `loadFromStorage`) but had no UI.
### Decisions made
- The setting row was added because the requested behaviour depends on a preference the app did not expose.
- The app still opens on the Hebrew tab at launch, whatever the setting. Changing that is Shlomo's call.
### Open issues / blocked
- Verified on Shlomo's device 2026-11-03. Stack screens (settings, converter…) keep normal back, because the handler is registered only while the tabs are focused.
### Next steps
- Device check through a preview OTA, then merge.

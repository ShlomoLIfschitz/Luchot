## 2026-11-16 — Fixes from a tester's holiday/learning feedback
### What was done
- Nach Yomi / Tanakh Yomi / Psalms: @hebcal/learning renders the book in English even in 'he' ("Ezekiel כ׳"). `DateService.hebraizeBookName` translates the leading book name ("יחזקאל כ׳"). Tanakh Yomi and Psalms had the same bug.
- Month cell chips wrap to two lines instead of truncating ("ראש חוד…", "שבת שו…"). Span bars stay one line. `tagsArea` clips so a wrapped chip can't spill out of the cell.
- Day view showed only `holidays[0]`. On 30 Shevat (Family Day + Rosh Chodesh Adar) Rosh Chodesh was hidden. Every holiday now gets its own banner.
- New setting "ימים ממלכתיים נוספים" (default off) in the "לוח שנה" card: off hides `isOptionalCivilDay()` events. In both `save()` and `loadFromStorage()`, applied in `_layout.tsx` init.
- Expo SDK 58 patch updates (expo-doctor failed on main). `app.json` gained the `expo-sqlite` and `expo-status-bar` plugins, so the next release is a full build.
### Decisions made
- Hidden by the setting: every hebcal `MODERN_HOLIDAY` except Yom HaShoah, Yom HaZikaron, Yom HaAtzma'ut, Yom Yerushalayim (Hallel) and Sigd (a religious festival), plus Chag HaBanot (hebcal `MINOR_HOLIDAY`). That covers Rabin Memorial Day (Shlomo: "יום ממלכתי לגמרי"), Ben-Gurion, Herzl and Jabotinsky days, Hebrew Language Day, Family Day, Yom HaAliyah (+ school observance).
- Default off (Shlomo, 2026-11-16): shown only when the user turns the setting on.
### Open issues / blocked
- Not verified on a device (no emulator here); the month cell wrap needs a screenshot before merge.
- Not addressed: on Android the keyboard covers the save button in the long-note form (same feedback thread).
### Next steps
- Device check through a preview build, then merge.

## 2026-11-03 — Date converter screen (branch `feat/date-converter`)
### What was done
- Built the converter from the approved frames D1–D5 (handoff `docs/handoffs/2026-11-03-date-converter.md`): `app/converter.tsx`, `src/components/converter/ConverterField.tsx` (`PickerField`, `YearField`), `src/components/converter/OptionSheet.tsx` (day/month list sheet). Drawer item "ממיר תאריכים" (ArrowLeftRight) after "פרטי לימוד" (D6).
- `DateService`: added `gregorianToHebrew()` (builds the Date with `setFullYear`, so years 1–99 don't jump to 1900–1999; optional after-sunset), `toHebrewDay()` (ה׳, י״ט) and `toHebrewYearFull()` (ד׳תתק״ס; the 5000s are written without the millennium unless asked). No existing function changed.
- Checked: 14/5/1948 → ה׳ אייר תש״ח (after sunset ו׳); י״ט כסלו 5559 → 27/11/1798; 1/1/1200 → ה׳ טבת ד׳תתק״ס; 1/3/50 → כ״א אדר ג׳תת״י; 1/1/1 → י״ח טבת ג׳תשס״א; 1 תשרי 3762 → 6/9/1; the month list has 13 in 5559 and 12 in 5558.
- Before 1582 the result is on the proleptic Gregorian calendar. Verified in `@hebcal/hdate` greg.js (pure Gregorian R.D. arithmetic) and in ECMAScript `Date`.
### Decisions made
- Year ranges: Gregorian 1–6000, Hebrew 3762–9999. The frame's error copy said "1 ל-9999", but Gregorian years after 6239 give Hebrew years above 9999, which have no single millennium letter (it rendered "undefined׳"). Hebrew 3762 is the first year that lies entirely after 1 CE.
- Switching direction carries the current result over as the new input.
### Open issues / blocked
- No visual verification: no Android emulator on this machine, and `react-native-web` is not installed (the temporary install was blocked). No screenshots at 375/768/1280 yet.
- Not tested on a device. No native change (lucide icons already bundled, no app.json edit), so an OTA to `preview` is enough.
### Next steps
- Device check (OTA to preview, or Shlomo's screenshots), then merge.

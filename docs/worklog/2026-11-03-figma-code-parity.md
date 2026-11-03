## 2026-11-03 — Figma ↔ code parity pass (branch `claude/figma-code-parity-7236ac`)

Source of truth: Figma "Luchot — Design System & Screens" (`yFaCDCb17k2BVTGLzwj64a`), pages 01 Foundations, 03 Screens · Light, 04 Screens · Dark. Page 05 (sync/import, not built yet) skipped. Values below were read from the file with the Figma plugin API (fills, strokes, radius, padding, gap, font size/style), not by eye.

### Inventory

| Figma frame (light / dark) | Code |
|---|---|
| לוח עברי 7:2 / 20:2 | `app/(tabs)/index.tsx` → `MonthGrid.tsx`, `DayCell.tsx`, tab bar in `app/(tabs)/_layout.tsx` |
| לועזי 19:2 / 20:1376 | `app/(tabs)/gregorian.tsx` → same `MonthGrid` |
| יום 10:2 / 20:222 | `app/(tabs)/day.tsx`, `ShabbatCard.tsx`, `ScreenHeader.tsx` |
| זמנים 14:2 / 20:344 | `app/(tabs)/zmanim.tsx`, `ZmanimFullList.tsx` |
| הגדרות 14:112 / 20:453 | `app/settings.tsx` |
| שבוע 16:2 / 20:571 | `app/week.tsx`, `WeekTimeline.tsx`, `weekTimelineLayout.ts` |
| ניווט 17:2 / 20:705 | `Drawer.tsx`, `DrawerItem.tsx` |
| עורך אירוע 17:270 / 20:973 | `NoteEditor.tsx` |
| בחירת מיקום 18:3 / 20:1276 | `app/locationPicker.tsx` |
| לימוד יומי 19:211 / 20:1585 | `app/details.tsx` |
| Foundations 3:2 (35 colour variables, Light/Dark) | `src/constants/colors.ts`, `typography.ts`, `radius.ts`, `elevation.ts`, `overlay.ts` |

No frame exists for: About, QuickActionSheet, ExportModal, MonthYearPicker, Hebrew date pickers, Settings picker modals, NoteList, time pickers. Not compared.

### Tokens (Foundations)
- Colours: all 35 Figma variables equal `colors.ts` in both modes. ✅ No change.
- Every fill/stroke in all 20 screen frames maps to a token of its own mode; the only non-token value is the scrim `#000000 @ 0.45` = `overlay.modal`. ✅
- Dark frames are the light frames with tokens swapped, node for node. One difference: switch thumb is `#FFFFFF` (light) and `textPrimary` `#F0F0EC` (dark). Code used `surface` (dark `#1A1A18`). ❌
- Elevation sm/md/lg specimens equal `elevation.ts`. ✅
- Radius: Foundations scale 4/6/8/12/16/999 equals `radius.ts`, but screens also use 3 (day-cell chip), 5 (week event block), 10 (drawer item, search field, learning badge), 14 (cards — already `radius.card`), 20 (bottom sheet). ❌ Missing tokens.
- Type: screens use an 8 px step (week gutter label, week event title, week holiday chip) that the scale lacks. ❌

### Deviations found (❌ = fixed in this PR, ⚠️ = listed for Shlomo, not changed)

**Shared header (all screens)**
1. ❌ Header background is `surface` in Figma; code used `background` (MonthGrid, ScreenHeader, week).
2. ❌ Header padding 4–6 / 14 / 10–12 / 14; code 8 / 12 / 12 / 12.
3. ❌ No bottom border under the header in Figma (the border sits under the weekday row / day columns); code drew a hairline under every header.
4. ❌ Subtitle colour `textTertiary`; code `textSecondary`.
5. ❌ Jump-to-today icon: Figma draws a target (two rings, accent, 24). Code used `CalendarCheck` (month) and `CalendarDays` 22 in `textPrimary` (week); Day and Zmanim had no today button at all.
6. ❌ Day / Zmanim / Details: Figma puts a small line above or below a 19 Bold title (Day: weekday above Hebrew date; Zmanim: "יום שישי · ד׳ בתשרי" above "זמני היום"; Details: "לימוד יומי" with the Hebrew date below). Code showed the Hebrew/Gregorian date pair plus a chevron-down hint.
7. ❌ Settings, Location picker, Details: Figma has a back chevron "‹" on the left, not the hamburger.
8. ❌ Zmanim and Details repeated the date as a large block at the top of the content; Figma has none.

**Bottom tab bar**
9. ❌ Icons: Figma עברי = calendar with header line, לועזי = calendar with a day square, יום = page with lines, זמנים = clock, all 22 px. Code used BookOpenText / Calendar / Sun / Clock at the navigator default size.
10. ❌ Padding top 8 (code 6), label gap 3 (code 2).

**Month grid (עברי + לועזי)**
11. ❌ Grid runs edge to edge (390 wide); code had 8 px side padding.
12. ❌ Weekday row: `surface` background, bottom border `border`, padding 6 / 8; code no background, no border, 8 / 8.
13. ❌ Day cell padding 4 vertical / 3 horizontal; code 5.
14. ❌ Chip radius 3, horizontal padding 3; code 4 / 4.
15. ❌ "+N" overflow 9 Medium; code 10 Medium.
16. ❌ Empty (other-month) cells: `surface` with the top hairline; code transparent with no hairline.
17. ❌ FAB (56, accent, plus 24, bottom-left 16) on the month screens; code had none.
17a. ❌ Gregorian grid: weekday header "S M T W T F S" in tertiary with no Shabbat emphasis (code "Sun…Sat" with a purple bold Saturday); the Gregorian number sits top-LEFT and the Hebrew numeral top-right (code put the primary number on the right in both modes).
17b. ⚠️ Friday candle icon next to the Gregorian number: in the code, not drawn in Figma. Kept (feature).

**Day screen**
18. ❌ Content padding 14 / 16, items 12 apart; code 16 / 20 with 16 between items.
19. ❌ Gregorian date line (13 Regular, tertiary, right) at the top of the content; code had none (it lived in the header).
20. ❌ Parasha card radius 14 (code 12), padding 13 / 14 (code 14), gap 12, icon 26 (code 22).
21. ❌ ShabbatCard: radius 14 (code 12), border 1 `border` (code hairline), padding 14 (code 16), header 15 Bold + candle icon 20, column headers 10 Medium, rows 29 tall (padding 5), cell text 13, havdalah column `textSecondary` Regular, candle column 13 SemiBold, user's row accent Bold with a top hairline.
22. ❌ Tabs are a pill segmented control (track `surfaceMuted`, 39 tall, active segment `surface` + shadow, 13 Bold / 13 Medium tertiary); code drew underline tabs.
23. ❌ Hourly schedule sits inside a card (surface, border, r14); rows top hairline, padding 8 / 12, gap 10, hour label 11 Medium tertiary 38 wide on the left, no vertical divider; event block r8, padding 7 / 10, title 13 SemiBold, time 11 Regular, no opacity. Code: no card, vertical divider, title 11, time at 0.75 opacity, "לוח שעות" heading.
24. ❌ Add-event: Figma uses the FAB; code had an inline "+ הוסף אירוע" button. Replaced by the FAB (same action).
25. ⚠️ Key-zmanim card ("זמני היום" + "כל הזמנים →") is in the code, not in Figma. Kept — it is a feature.
26. ⚠️ Special-Shabbat line ("שבת שובה") under the parasha name: needs a `DayData` field (already deferred in WORK_LOG 2026-08-31).

**Zmanim screen**
27. ❌ Location card radius 14 (code 12); pin 24 (code 20); chevron 20; badge gap 5 (code 4); GPS glyph sits to the RIGHT of the badge text (code left), crosshair icon 12.
28. ❌ Segmented control: labels "הגר״א" / "מגן אברהם" (code "גר״א" / "מג״א"); segment 33 tall with padding 7 (code 13) — touch target kept at 48 with hitSlop; inactive text `textTertiary` (code `textSecondary`).
29. ❌ Section labels sit flush with the card edge (16 inset), 14 apart from neighbours; code 20 inset and 24 / 8 padding.
30. ⚠️ Structure: Figma has two cards ("בוקר", "צהריים וערב") with one time per row for the selected shita and the candle-lighting row highlighted inside the list. Code has four cards, both shitot side by side in two rows, 14 zmanim, and separate candle / havdalah banners. Kept: changing it drops zmanim and the side-by-side comparison.

**Week screen**
31. ❌ Hour labels 9 Regular (code 10 Medium); all-day gutter label 8 Medium (code 9); event title 8 SemiBold (code 9); event radius 5 (code 6); event padding 3 (code 5 / 2); stripe 3 wide (code 2.5); all-day bar 17 tall (code 18); now line 2 (code 1.5).
32. ❌ FAB at left 16, plus icon 24 (code 20 / 26).
33. ⚠️ Parasha: Figma shows it as a small chip in the Shabbat column of the all-day row; code shows a green banner above the timeline. Kept; changing it needs a design call on a long parasha name in a 51 px column.

**Drawer**
34. ❌ Item radius 10 (code 8), padding 13 / 14 (code 14 / 16), gap 12 (code 16), icon 21 (code 22), rows 2 apart (code 4), list top padding 10 (code 8).
35. ❌ Active item (current screen) highlighted `accentLight` + accent Bold; code never passed `active`.
36. ❌ Header padding 18 sides (code 20), top status bar + 11; divider inset 14; version text 11 Regular, padding 24, bottom 28.
37. ❌ Labels: "תצוגת שבוע" (code "שבוע"), "לימוד יומי" (code "פרטי לימוד"), "ייצוא ליומן" (code "ייצוא יומן"). Icons follow the Figma glyphs (calendar, week, book, share, gear, info).
38. ⚠️ Code has four more items than Figma (לוח לועזי, יום, זמנים, מיקום). Kept.

**Settings**
39. ❌ Row padding 13 / 14 (code 12 / 16), gap 10 (code 14), min height 48 (switch rows 54); icon colour accent (code `textSecondary`); value 14 Medium `textTertiary` (code `textSecondary`); chevron glyph "‹" 23 Regular (code "›" 20).
40. ❌ Switch track off = `borderStrong` (code `border`); thumb white / dark `textPrimary`.
41. ❌ Copy: "תחילת שבוע" (code "יום ראשון בשבוע"), "חו״ל (יום טוב שני)" (code "תפוצות (חגים)"), "לפי המערכת" (code "לפי המכשיר"), "הדלקת נרות" (code "התראות הדלקת נרות"), "ספירת העומר" (code "תזכורת ספירת העומר").
42. ❌ Icons: no icon on "שעון 24 שעות" and "חו״ל" rows; bell (not flame) on "הדלקת נרות".
43. ❌ Section spacing 8 (code 24 above / 8 below), label inset 16.
44. ⚠️ Lead time: Figma row "זמן התראה · 15 דק׳ לפני ‹" (a picker); code has chips 5/10/15/30. Kept.
45. ⚠️ Code rows not in Figma: "עברית למעלה", "הרשאת התראות", "התראות מתוזמנות". Kept.

**Location picker**
46. ❌ Title "בחירת מיקום" (code "בחר מיקום"); GPS button "השתמש במיקום המכשיר" (code "...הנוכחי"), padding 15, gap 9, icon 19 to the RIGHT of the text (code left).
47. ❌ GPS status strip: glyph on the RIGHT (code left), headline 13 Bold, detail 10 Regular at 0.8 opacity, padding 10 / 12, gap 10; "acquiring" in `textSecondary` on `surface`; detail "ממתין לקליטת GPS (עד 12 שניות)".
48. ❌ Search radius 10 (code 8), padding 11 / 12, icon 17, placeholder "חפש עיר…".
49. ❌ Cards radius 12 (code 14); city rows gap 11 (code 12), pin 18 (code 16), min height 48; selected row `accentLight` background and 15 Bold (code 600, no background).

**Details (לימוד יומי)**
50. ❌ One card per item (r14, 10 apart, padding 13 / 14, gap 12), whole card opens Sefaria, chevron "‹" on the left. Code grouped rows in one card with a "ספריא" button.
51. ❌ Badge 38, radius 10 (code 8), background = item colour at 12 % (code tag-bg token), book icon 20 for every item; colours per item: דף יומי / משנה blue, רמב״ם green, נ״ך orange, חפץ חיים red, תהילים purple (code: per section, הלכה orange).
52. ❌ Labels "משנה יומית" (code "משנה יומי"), "רמב״ם — פרק אחד" (code "רמב״ם יומי (פרק אחד)"); footer note "לחיצה על פריט פותחת אותו בספריא".

**Note editor**
53. ❌ Sheet radius 20 (code 16), horizontal padding 18 (code 20), handle 10 / 6, header padding 6 / 14, close icon X 22 tertiary on the left.
54. ❌ Title field background `background`, radius 12 (code 8), padding 14 (code 12).
55. ❌ Field group background `background` (code `surface`), rows padding 12 / 14, value 14 Medium `textSecondary`, row icons 19 accent, chevrons 18.
56. ❌ Chips padding 8 / 14 (type chips code 9), recurrence gap 8 (code 6).
57. ❌ Footer: top border, padding 14 / 18 / 28, buttons 50 tall, cancel `surfaceMuted` + `textSecondary` 15 Bold.
57a. ❌ Type chips are text only (code had an icon in each chip); "צבע" is a section label above the swatches, swatches 12 apart (code: inline tertiary label, 6 apart).
57b. ⚠️ Copy tied to the data model: Figma type chips read "אירוע / יום הולדת / יארצייט / תזכורת" and the title "אירוע חדש"; the code's types are note / birthday / yahrzeit / anniversary ("הערה / יום הולדת / יארצייט / יום שנה", title "הערה חדשה"). Not renamed: "תזכורת" is not "יום שנה".
57c. ⚠️ Figma pins the footer to the bottom of the sheet; in the code it stays at the end of the scrolling body (moving it out of the ScrollView is a structural change of a 1,364-line component).
57d. No frame for the editor's view mode, reminder chips, time chips or location row; they got the shared row colours only.

**Figma vs Figma (the file disagrees with itself) — ⚠️ for Shlomo, code unchanged**
58. Line heights: Foundations specifies them (e.g. caption 11 / 14, screenTitle 19 / 24); every screen frame uses "auto" (Heebo ≈ 1.47 × size, e.g. 11 → 16, 19 → 28). Code follows Foundations, so text boxes are a few px shorter than in the frames.
59. Foundations cell.primary 18 Bold / cell.secondary 11 / cell.tag 10; the screens use 15 SemiBold / 10 / 9. Code follows the screens (approved 2026-08-31).
60. FAB shadow: Foundations lg = y4 r12 12 %; screen FABs draw 20 %. Code uses lg.
61. Foundations radius lg 12 "Sheets"; the note-editor sheet is drawn at 20. Code now follows the frame (new `radius.sheet`).

**Navigation (⚠️)**
62. Figma shows the bottom tab bar on Week, Settings, Location picker and Details; in the code these are stack screens without it.
63. Figma has a FAB on the month and day screens; added. Gregorian frame has none drawn but is the same component.

**Approved deviations kept** (DESIGN.md): zmanim rows 48 (Figma 44); day-cell chips 17 (Figma 15) with the wider chip gap.

### What was done
- Orchestrator did the work directly (no sub-agents; parallel work needs Shlomo's OK). Figma read with the plugin API, every value above from the file.
- Tokens: `radius.chip/event/item/sheet`, `typography.nano/glyph/glyphSmall`, colour `switchThumb`; `docs/DESIGN.md` updated.
- New shared pieces: `FigmaIcons.tsx` (the frames' icons rebuilt from their own geometry), `Fab.tsx`, `utils/hebrewLabels.ts`; `ScreenHeader` rebuilt and now used by the month grid and week screen too; `Card` (1 px border, inset/radius props) and `SectionLabel` (inset/gap props).
- Screens: month (Hebrew + Gregorian), day, zmanim, details, settings, location picker, week, drawer, note editor. One commit per unit.
- Not changed: `NotificationService.ts`, `app.json`, `assets/sounds/`, `StorageService.ts`, data layer. No native change, no new dependency: OTA-deliverable.

### Decisions made
- Where a Figma control is shorter than 48 dp (segmented control, header icons), the visual size follows Figma and the touch target is kept at 48 with `hitSlop`.

### Open issues / blocked
- Not verified on a device or in screenshots (no emulator in this session). Every fix is layout-only and gates cannot see layout. Highest-risk spots: the Day screen sticky segmented control (sticky-header hoisting rule, DECISIONS 2026-08-31), header heights with `StatusBar.currentHeight` under edge-to-edge, the Gregorian date row (plain `row`, deliberately LTR), the location picker card insets (were doubled before).
- Commits 2 and 3 do not typecheck on their own (the new `ScreenHeader` props land before the Day/Zmanim/Details call sites); the branch tip does.
- Branch `claude/ics-import-88978c` (another session) may touch the drawer or the note editor: expect a merge conflict there.
- ⚠️ items 25, 26, 30, 33, 38, 44, 45, 58–62 wait for Shlomo.

### Next steps
- Shlomo: device check of every screen in light and dark against the frames, then answer the ⚠️ list.

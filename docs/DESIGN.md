# Luchot — Design System

> Complete design system: color palette, typography, spacing, components, and tokens — for both Light and Dark modes. This is the authoritative source for all visual decisions in Luchot v2.

> מערכת עיצוב מלאה: פלטת צבעים, טיפוגרפיה, מרווחים, רכיבים, ו-tokens — לשני המצבים Light ו-Dark. זה המקור הקובע לכל החלטה ויזואלית ב-Luchot v2.

---

## 🇬🇧 English

### Design Philosophy

Luchot's visual language is built on three principles:

1. **Soft neutrality, not sterility** — Off-white base instead of pure white. Easier on the eyes, makes accent colors stand out more without screaming.
2. **Strong accents, used sparingly** — Color is used for meaning (holidays, events, today), not for decoration. White space is the primary tool.
3. **Hebrew-first typography** — Type stack optimized for Hebrew letter clarity, with Latin fallback for Gregorian dates and English text.

**Not:** parchment, warm browns, decorative borders, "Judaica kitsch."
**Yes:** clean, modern, system-app quality, with subtle warmth.

---

### Color System

#### Light Mode

```typescript
const lightColors = {
  // Backgrounds — slightly warm off-white, not pure white
  background:        '#FAFAF7',  // Main app background
  surface:           '#FFFFFF',  // Cards, modals, sheets (elevated)
  surfaceElevated:   '#F4F4F0',  // Pressed states, secondary surfaces
  surfaceMuted:      '#EFEFEA',  // Disabled, inactive

  // Borders
  border:            '#E5E5E0',  // Standard borders, dividers
  borderStrong:      '#C8C8C2',  // Emphasized borders, focused inputs
  borderSubtle:      '#F0F0EB',  // Very faint, grid lines

  // Text
  textPrimary:       '#1A1A18',  // Headlines, primary text
  textSecondary:     '#5A5A55',  // Subtitles, secondary text
  textTertiary:      '#9A9A93',  // Hints, placeholders, disabled
  textInverse:       '#FFFFFF',  // Text on colored backgrounds

  // Brand accent — Deep slate-blue (calm, scholarly, not aggressive)
  accent:            '#3D5A80',  // Primary actions, tab active, links
  accentLight:       '#E6EBF2',  // Backgrounds for selected/active states
  accentStrong:      '#2C4360',  // Pressed state for primary actions

  // Semantic — Tag categories (the 5 from SCREENS.md)
  tagHoliday:        '#2E7D32',  // Green: Jewish holidays
  tagHolidayBg:      '#E8F5E9',
  tagShabbat:        '#6A4FB8',  // Purple: Shabbat
  tagShabbatBg:      '#EEEAF7',
  tagSpecial:        '#D77A2E',  // Orange: Special days (Rosh Chodesh, national)
  tagSpecialBg:      '#FCEFE0',
  tagEvent:          '#1E6FB8',  // Blue: User events
  tagEventBg:        '#E1EEFA',
  tagPersonal:       '#C2185B',  // Red: Yahrzeit, birthdays, anniversaries
  tagPersonalBg:     '#FCE4EC',

  // States
  today:             '#3D5A80',  // Same as accent — today indicator
  todayBg:           '#E6EBF2',
  selected:          '#3D5A80',  // Border for selected day cell
  selectedBg:        '#F0F4F9',  // Background tint for selected
  success:           '#2E7D32',
  warning:           '#D77A2E',
  error:             '#C62828',

  // Special: candle icon color (Friday indicator)
  candle:            '#E8A33D',  // Warm amber, not too saturated
};
```

#### Dark Mode

```typescript
const darkColors = {
  // Backgrounds — deep near-black with subtle warmth
  background:        '#0F0F0D',  // Main app background
  surface:           '#1A1A18',  // Cards, modals, sheets
  surfaceElevated:   '#252522',  // Pressed states
  surfaceMuted:      '#2D2D2A',  // Disabled

  // Borders
  border:            '#2E2E2A',
  borderStrong:      '#454540',
  borderSubtle:      '#1F1F1D',

  // Text
  textPrimary:       '#F0F0EC',
  textSecondary:     '#9A9A93',
  textTertiary:      '#5A5A55',
  textInverse:       '#1A1A18',

  // Brand accent — Lighter slate-blue for dark mode contrast
  accent:            '#7B9BC8',
  accentLight:       '#1F2935',
  accentStrong:      '#A0BCDE',

  // Tag categories
  tagHoliday:        '#66BB6A',
  tagHolidayBg:      '#1B2E1D',
  tagShabbat:        '#9C82DC',
  tagShabbatBg:      '#252035',
  tagSpecial:        '#E8A05B',
  tagSpecialBg:      '#2E2218',
  tagEvent:          '#5BA3E8',
  tagEventBg:        '#162635',
  tagPersonal:       '#E84F86',
  tagPersonalBg:     '#2E1822',

  // States
  today:             '#7B9BC8',
  todayBg:           '#1F2935',
  selected:          '#7B9BC8',
  selectedBg:        '#181E27',
  success:           '#66BB6A',
  warning:           '#E8A05B',
  error:             '#E84F86',

  // Candle
  candle:            '#F0B860',
};
```

---

### Typography

#### Type Stack

```typescript
const fonts = {
  // Hebrew-first — system fonts that have excellent Hebrew rendering
  hebrew: {
    regular: 'System',           // iOS: San Francisco Hebrew; Android: Roboto + Hebrew fallback
    medium: 'System',
    bold: 'System',
  },
  // Latin — for Gregorian dates, English UI text
  latin: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  // Hebrew numerals (gematria) — uses Hebrew font; treated as text
};
```

**Note:** Using system fonts (`System` in React Native) for now. Both iOS and Android render Hebrew well with system stack. If specific custom font needed later (e.g., Frank Ruhl Libre for Hebrew elegance), can be added via `expo-font`.

#### Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display.large` | 32 | 700 | 38 | Hebrew year title in headers |
| `display.medium` | 24 | 700 | 30 | Month name in calendar header |
| `display.small` | 20 | 600 | 26 | Section titles, modal titles |
| `body.large` | 17 | 500 | 24 | Primary text, settings labels |
| `body.medium` | 15 | 400 | 22 | Default body text |
| `body.small` | 13 | 400 | 18 | Secondary text, hints |
| `caption` | 11 | 500 | 14 | Tags, badges, day names |
| `caption.bold` | 11 | 700 | 14 | Section headers (uppercase) |
| `cell.primary` | 18 | 700 | 22 | Day cell primary number/letter |
| `cell.secondary` | 11 | 400 | 14 | Day cell secondary number/letter |
| `cell.tag` | 10 | 500 | 13 | Tag text inside day cell |

---

### Spacing

```typescript
const spacing = {
  xxs: 2,
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl: 32,
};
```

#### Common Patterns
- Screen padding: `xl` (20px) horizontal, `lg` (16px) vertical
- Card padding: `lg` (16px)
- Section spacing: `xxl` (24px) between major sections
- Cell internal padding: `xs` (4px) to `sm` (8px)
- Tag padding: `xs` (4px) horizontal, `xxs` (2px) vertical

---

### Border Radius

```typescript
const radius = {
  xs:  4,    // Tags, small badges
  sm:  6,    // Day cells
  md:  8,    // Buttons, input fields
  lg:  12,   // Cards, sheets
  xl:  16,   // Modals
  full: 999, // Pills, circular buttons
};
```

---

### Elevation / Shadows

```typescript
const elevation = {
  // Use sparingly — flat design preferred
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sm: {
    // For selected day cell, slight lift
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    // For cards, modals
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    // For floating buttons (FAB)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};
```

---

### Component Primitives

#### Tag (in day cells)

```
Visual:
┌─────────────┐
│ פסח ראשון  │  ← Filled background (tagXxxBg), text color (tagXxx)
└─────────────┘

Specs:
- Background: tagHolidayBg / tagEventBg / etc. (light tinted background)
- Text color:  tagHoliday  / tagEvent  / etc. (full saturation)
- Padding: 2px vertical, 4px horizontal
- Border radius: 4 (xs)
- Font: cell.tag (10px / 500)
- Max width: cell width minus padding
- Text overflow: ellipsis after 1 line
- Height: 14-16px
```

#### Day Cell

```
Visual (Hebrew Calendar):
┌──────────────┐
│ כז       14  │  ← cell.primary on left, cell.secondary opposite corner
│ ━━━━━━━━━━━ │
│ פסח ראשון   │  ← tag #1 (holiday)
│ ━━━━━━━━━━━ │
│ ישיבת צוות  │  ← tag #2 (user event)
└──────────────┘

Specs:
- Width: (screen width - padding) / 7
- Height: 110px (medium)
- Background: surface (white) / surface (dark)
- Border: 0.5px borderSubtle
- Border radius: sm (6)
- Padding: xs (4)
- Internal gap between rows: 2px

States:
- Default:   border-color: borderSubtle
- Today:     border-color: today (2px), background: surface
- Selected:  border-color: selected (2px), background: selectedBg, elevation.sm
- Shabbat:   slight purple tint on background (5% opacity of tagShabbat)
- Holiday:   slight green tint on background (5% opacity of tagHoliday)
- Empty:     transparent, no border
```

#### Button (Primary)

```
Specs:
- Background: accent
- Text color: textInverse (white)
- Padding: sm (8px) vertical, lg (16px) horizontal
- Border radius: md (8)
- Font: body.large
- Min height: 44 (iOS HIG)
- Pressed state: accentStrong
```

#### Button (Secondary / Ghost)

```
Specs:
- Background: transparent
- Text color: accent
- Border: 1px accent
- Same padding/radius as Primary
- Pressed state: accentLight background
```

#### Tab Bar

```
Specs:
- Background: surface
- Border-top: 0.5px border
- Height: 56 + bottom safe area
- Active tab: accent (icon + label)
- Inactive tab: textTertiary
- Font: caption (11px / 500)
- Icon size: 24
- Padding: sm vertical
```

#### Hamburger Menu (Side Drawer)

```
Specs:
- Width: 80% of screen, max 320px
- Background: surface
- Overlay (rest of screen): rgba(0,0,0,0.45)
- Slide direction: from left (hamburger is top-left; anchored left:0, initial translateX -drawerWidth)
- Animation: 250ms ease-out
- Item height: 48px
- Item padding: lg (16px) horizontal
- Item icon size: 22, icon margin-end: md (12px)
- Active item: accentLight background, accent text
```

#### Modal / Bottom Sheet

```
Specs:
- Background: surface
- Border radius: xl (16) top-left + top-right only
- Handle indicator: 36x4 px, border, centered, top
- Padding: xl (20)
- Snap points: 50%, 85%
- Backdrop: rgba(0,0,0,0.5), tap to close
- Android: Hardware back button closes
```

#### FAB (Floating Action Button)

```
Specs:
- Size: 56x56
- Background: accent
- Icon color: textInverse
- Icon size: 24
- Border radius: full (999)
- Elevation: lg
- Position: bottom-end, 16px from edges
- Above tab bar
```

---

### RTL Behavior

**RTL layout (LOCKED — see DECISIONS.md):** Hebrew RTL rows use `flexDirection: 'row-reverse'` explicitly. Do NOT rely on `flexDirection: 'row'` auto-flipping via `I18nManager.isRTL`, and do NOT use CSS/transform mirroring (`scaleX: -1`) — both are banned (the `scaleX` hack breaks gesture events and accessibility). The first JSX child renders on the right; fix wrong icon/text order by swapping JSX child order, not by adding flips. Add explicit `gap` between a `flex: 1` Hebrew label and an adjacent value so they don't touch. Prefer explicit dimensions over Yoga inference for row heights.

Additional notes:
- **Text alignment:** `right` for Hebrew, `left` for Latin
- **Icons:** Direction-sensitive icons (arrows, back) flip automatically
- **Calendar grid:** Day-of-week order is RTL (שבת on left, ראשון on right)
- **Tab bar:** Order respects RTL — first tab is on the right
- **Numbers:** Gregorian numbers stay LTR even in RTL context (use `writingDirection: 'ltr'` for those specific Text elements)

---

### Animation

```typescript
const motion = {
  // Durations
  fast:    150,  // Color changes, hover states
  medium:  250,  // Drawer slide, modal open
  slow:    400,  // Page transitions

  // Easing
  easeOut:    'ease-out',
  easeInOut:  'ease-in-out',
  spring:     { tension: 100, friction: 12 },
};
```

**Principles:**
- Animations under 250ms for most UI feedback
- No animations longer than 400ms
- Use `LayoutAnimation` or Reanimated for fluid interactions
- Respect `reduceMotion` accessibility setting (skip animations when enabled)

---

## 🇮🇱 עברית

### פילוסופיית עיצוב

השפה הויזואלית של Luchot בנויה על שלושה עקרונות:

1. **נייטרליות רכה, לא סטריליות** — בסיס off-white במקום לבן טהור. נוח יותר לעיניים, גורם לצבעי accent להיראות בולטים יותר בלי לצרוח
2. **מבטאים חזקים, בשימוש מדוד** — צבע משמש למשמעות (חגים, אירועים, היום), לא לקישוט. שטח לבן הוא הכלי העיקרי
3. **טיפוגרפיה מובילת-עברית** — type stack מותאם לבהירות אותיות עבריות, עם fallback לטיני לתאריכי לועזי וטקסט אנגלי

**לא:** parchment, חומים חמים, מסגרות מקושטות, "יודאיקה קיטשית"
**כן:** נקי, מודרני, ברמת אפליקציית מערכת, עם חמימות עדינה

---

### מערכת צבעים

**Light Mode — סיכום:**
- רקע ראשי: `#FAFAF7` (off-white רך)
- משטחים: `#FFFFFF` (כרטיסים, modals)
- accent ראשי: `#3D5A80` (slate-blue רגוע ולמדני)
- 5 צבעי tags:
  - 🟢 ירוק `#2E7D32` — חגים יהודיים
  - 🟣 סגול `#6A4FB8` — שבת
  - 🟠 כתום `#D77A2E` — ימים מיוחדים
  - 🔵 כחול `#1E6FB8` — אירועי משתמש
  - 🔴 אדום `#C2185B` — יארצייט, יום הולדת, יום נישואין
- נר שישי: `#E8A33D` (amber חמים)

**Dark Mode** — אותה מערכת אבל מהופכת: רקע `#0F0F0D` (כמעט שחור, חמים מעט), טקסט בהיר, צבעי accent מוארים יותר לקונטרסט.

לפרטים מלאים — ראה הקטע באנגלית למעלה.

---

### טיפוגרפיה

**Type Stack:** System fonts לשני העברית והלטינית — בשני iOS ו-Android יש רינדור עברי טוב מובנה. אם יידרש פונט מותאם (כמו Frank Ruhl Libre לאלגנטיות עברית) — אפשר להוסיף בעתיד דרך `expo-font`.

**סולם גדלים עיקרי:**
- `display.large` — 32/700 — שנה עברית בכותרת
- `display.medium` — 24/700 — שם חודש בכותרת
- `body.medium` — 15/400 — טקסט גוף ברירת מחדל
- `cell.primary` — 18/700 — מספר/אות ראשי בתא יום
- `cell.tag` — 10/500 — טקסט tag בתא יום

לטבלה מלאה — ראה הקטע באנגלית.

---

### מרווחים

```
xxs: 2,    xs: 4,    sm: 8,    md: 12,
lg: 16,    xl: 20,   xxl: 24,  xxxl: 32
```

**שימושים נפוצים:**
- ריווח מסך: `xl` (20px) אופקי, `lg` (16px) אנכי
- ריווח כרטיס: `lg` (16px)
- בין סקציות גדולות: `xxl` (24px)
- ריווח פנימי תא: `xs` עד `sm`
- ריווח tag: `xs` אופקי, `xxs` אנכי

---

### Border Radius

- `xs` (4) — tags, badges קטנים
- `sm` (6) — תאי יום
- `md` (8) — כפתורים, שדות קלט
- `lg` (12) — כרטיסים, sheets
- `xl` (16) — modals
- `full` (999) — pills, כפתורים עגולים

---

### צללים / Elevation

עיצוב flat מועדף — צללים בשימוש מדוד.

- `none` — ברירת מחדל
- `sm` — תא יום נבחר (lift קל)
- `md` — כרטיסים, modals
- `lg` — כפתורים צפים (FAB)

---

### Component Primitives — סיכום

**Tag (בתאי יום):**
- רקע מטונרי בהיר, טקסט בצבע מלא
- 4px אופקי, 2px אנכי, רדיוס 4
- פונט 10/500, ellipsis לאחר שורה

**תא יום:**
- רוחב: (רוחב מסך - padding) / 7
- גובה: 110px (בינוני)
- מספר 1 גדול בפינה, מספר 2 קטן בפינה הנגדית
- עד 2 tags גלויים, "+N" אם יש יותר

**Tab Bar:**
- גובה: 56 + safe area
- 4 טאבים: עברי | לועזי | יום | זמנים
- טאב פעיל: accent, טאב לא פעיל: textTertiary

**תפריט המבורגר:**
- מחליק משמאל (הכפתור ממוקם שמאל-עליון; anchored left:0)
- רוחב 80% מהמסך, max 320px
- overlay רגיל מאחור

**Modal / Bottom Sheet:**
- רדיוס עליון בלבד
- snap points: 50%, 85%
- כפתור חזרה אנדרואיד **סוגר** (לתקן ב-Phase 1)

**FAB:**
- 56x56, עגול לחלוטין
- bottom-end, 16px מהקצוות
- מעל ה-tab bar

---

### התנהגות RTL

**RTL (נעול — ראה DECISIONS.md):** שורות RTL עבריות משתמשות ב-`flexDirection: 'row-reverse'` במפורש. אסור להסתמך על auto-flip של `flexDirection: 'row'` עם `I18nManager.isRTL`, ואסור להשתמש ב-`scaleX: -1` — שתי הגישות הישנות אסורות (גרמו לאשכול הבאגים של Phase 4.7). הילד הראשון ב-JSX נוחת מימין; לתקן סדר icon/text שגוי — מחליפים סדר JSX, לא מוסיפים flips. להוסיף `gap` מפורש בין label בעל `flex: 1` לערך סמוך. להעדיף ממדים מפורשים על הסקת Yoga.

הערות עיקריות:
- **יישור טקסט:** ימינה לעברית, שמאלה ללטינית
- **איקונים:** איקונים תלויי כיוון (חצים, חזור) מתהפכים אוטומטית
- **גריד לוח:** סדר ימי השבוע RTL (שבת משמאל, ראשון מימין)
- **Tab bar:** הסדר מכבד RTL — טאב ראשון בצד ימין
- **מספרים:** מספרי לועזי נשארים LTR גם בהקשר RTL (השתמש ב-`writingDirection: 'ltr'` ל-Text elements ספציפיים)

---

### אנימציה

```
fast:    150ms   — שינויי צבע, hover
medium:  250ms   — drawer, modal פתיחה
slow:    400ms   — מעברי דף
```

**עקרונות:**
- מתחת ל-250ms לרוב משוב UI
- בלי אנימציות מעל 400ms
- כיבוד הגדרת `reduceMotion` (דילוג על אנימציות כשפעיל)

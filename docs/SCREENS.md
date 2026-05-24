# Luchot — Screens Map

> The complete map of all screens, tabs, and navigation in Luchot v2.

> מפת המסכים, הטאבים והניווט של Luchot v2.

---

## 🇬🇧 English

### Navigation Architecture

Luchot has two parallel navigation layers:

1. **Bottom Tab Bar (4 tabs)** — daily-use, one tap away
2. **Hamburger Menu (☰)** — extended access, secondary screens, settings

---

### Bottom Tab Bar

```
┌─────────────────────────────────────────────────┐
│  [ Hebrew Cal ] [ Greg Cal ] [ Day ]  [ Zmanim ]│
└─────────────────────────────────────────────────┘
```

| # | Tab | Hebrew Label | Icon | Purpose |
|---|-----|--------------|------|---------|
| 1 | Hebrew Calendar | עברי | ל | Month view, Hebrew-primary |
| 2 | Gregorian Calendar | לועזי | 31 | Month view, Gregorian-primary |
| 3 | Day | יום | 1 | Single-day detail (schedule + Torah info) |
| 4 | Zmanim | זמנים | 🕐 | Halachic times for current day |

**Default tab:** Hebrew Calendar (`עברי`).

---

### Hamburger Menu (☰) — Top-Left in every screen

```
┌──────────────────────────────────┐
│  Today's Date Header (clickable) │ ← Tapping jumps to Zmanim
├──────────────────────────────────┤
│  📅 Gregorian Month              │
│  🗓 Hebrew Month                 │
│  📆 Week                         │
│  1️⃣ Day                          │
│  ℹ️ Details (daily Torah learning)│
│  🕐 Zmanim                       │
│  ──────────                      │
│  ⚙️ Settings                     │
│  🎓 Tour / Onboarding            │
│  💬 Send Feedback                │
│  ℹ️ About                        │
└──────────────────────────────────┘
```

**Why hamburger AND tabs:** Tabs are for primary daily-use screens. The hamburger gives secondary access (Week view, Details, Tour) without overcrowding the tab bar.

---

### Screen Headers — universal format

Every screen has the same top header structure:

```
┌──────────────────────────────────────────────┐
│  ☰    📅(today)         י"ח אייר ה'תשפ"ו    │ ← Primary date (large, bold)
│                          5 במאי 2026         │ ← Secondary date (small, faded)
└──────────────────────────────────────────────┘
```

- **Left:** Hamburger menu icon
- **Center-Left:** "Today" jump button (a small calendar icon with today's day number). Tapping it jumps to the **Zmanim screen for today**.
- **Right:** Two-line date display (Hebrew primary, Gregorian secondary). Order respects `hebrewOnTop` setting.

---

### Screen 1: Hebrew Calendar (`/(tabs)/index.tsx`)

Default landing screen. Hebrew-primary month grid.

```
┌──────────────────────────────────────────────┐
│  ☰    📅(today)        אייר ה'תשפ"ו         │
│                         מאי 2026             │
├──────────────────────────────────────────────┤
│  <  Hebrew Month Name (large)              > │ ← Month navigation
├──────────────────────────────────────────────┤
│ ש  ו  ה  ד  ג  ב  א                          │ ← Day names (Hebrew, RTL)
├──────────────────────────────────────────────┤
│ ┌──────┐┌──────┐┌──────┐┌──────┐             │
│ │ל   17││כט  16││כח  15││כז 🕯14│             │ ← Hebrew letter + small Gregorian
│ │      ││━━━━━ ││━━━━━ ││━━━━━ │             │
│ │      ││פסח  ││פסח  ││פסח  │             │ ← Tag: holiday (green)
│ │      ││ראשון ││שני  ││שלישי │             │
│ │      ││━━━━━ ││      ││━━━━━ │             │
│ │      ││ישיבה ││      ││פגישה │             │ ← Tag: user event (blue/red)
│ └──────┘└──────┘└──────┘└──────┘             │
│  ...                                          │
├──────────────────────────────────────────────┤
│  [ עברי ] [ לועזי ] [ יום ] [ זמנים ]        │
└──────────────────────────────────────────────┘
```

**Cell content (top-down):**
1. **Date row:** Hebrew letter (large) + Gregorian number (small) on opposite corners. Friday: 🕯 candle icon
2. **Tags area:** Up to 2 visible tags. Each tag is a colored pill with text label
3. **Overflow indicator:** If more than 2 events/holidays, show "+N" at bottom (e.g., "+3")

**Tag ordering:**
- Holidays (Jewish) appear **first** (top)
- User events appear **below** holidays
- Within each group: order is internal (alphabetical for now)

**Tag color palette (5 categories):**
| Category | Color | Examples |
|---|---|---|
| Jewish Holidays | 🟢 Green | Pesach, Sukkot, Lag BaOmer, Yom Tov |
| Shabbat | 🟣 Purple | (only when explicitly marked) |
| Special Days | 🟠 Orange | Rosh Chodesh, Yom HaZikaron, Yom HaAtzmaut |
| User Events | 🔵 Blue | Meetings, work, general events |
| Personal | 🔴 Red | Yahrzeit, birthdays, anniversaries |

**Cell visual states:**
- **Default:** White background, subtle border
- **Today:** Bordered with accent color + slight tint
- **Shabbat:** Subtle background tint (very light)
- **Selected (tapped once):** Strong border highlight + slight elevation (shadow)
- **Holiday:** Background gets a subtle hint of holiday color

**Interactions:**
- **First tap on day** → Day becomes **selected** (highlighted). No screen transition. Tags remain visible.
- **Second tap on same selected day** → Switch to "Day" tab for that date
- **Long-press day** → Open quick action menu (see below)
- **Swipe horizontal** → Navigate between months
- **Tap month name in header** → Open month/year picker
- **Tap "today" icon in top header** → Jump to Zmanim screen

**Quick Action Menu (long-press):**
Three actions:
1. **Add Note / Event** — Opens NoteEditor for this date
2. **Add Birthday / Yahrzeit** (recurring) — Opens NoteEditor with recurring=true and category preset
3. **View Day Details** — Opens Day tab with focus on Torah Details section (Parasha, Daf Yomi, Rambam)

**Cell sizing:**
- Height: ~110px (medium) — fits 2 tags comfortably without losing month overview
- All 5-6 weeks visible without scrolling on standard devices

---

### Screen 2: Gregorian Calendar (`/(tabs)/gregorian.tsx`)

Identical structure, tags, interactions, and colors as Hebrew Calendar — only the primary/secondary date assignment is flipped.

```
┌──────────────────────────────────────────────┐
│  ☰    📅(today)        מאי 2026              │
│                         אייר ה'תשפ"ו         │
├──────────────────────────────────────────────┤
│  <  May 2026 (large)                       > │
├──────────────────────────────────────────────┤
│ Sat  Fri  Thu  Wed  Tue  Mon  Sun            │
├──────────────────────────────────────────────┤
│ ┌──────┐┌──────┐┌──────┐┌──────┐             │
│ │17  ל ││16  כט││15  כח││14 🕯כז│             │ ← Gregorian large, Hebrew small
│ │      ││━━━━━ ││━━━━━ ││━━━━━ │             │
│ │      ││פסח  ││פסח  ││פסח  │             │
│ │      ││ראשון ││שני  ││שלישי │             │
│ │      ││━━━━━ ││      ││━━━━━ │             │
│ │      ││ישיבה ││      ││פגישה │             │
│ └──────┘└──────┘└──────┘└──────┘             │
├──────────────────────────────────────────────┤
│  [ עברי ] [ לועזי ] [ יום ] [ זמנים ]        │
└──────────────────────────────────────────────┘
```

**Cell content:**
- **Top-large:** Gregorian number (e.g., 14)
- **Top-small (opposite corner):** Hebrew letter (e.g., כ"ז)
- All tags, colors, sizing, and interactions **identical** to Hebrew Calendar

**Same selected-day logic:**
- First tap → highlight
- Second tap → switch to Day tab
- Long-press → quick action menu (same 3 actions)

---

### Screen 3: Day (`/(tabs)/day.tsx`)

Single-day view, combining hourly schedule AND Torah/calendrical details.

```
┌──────────────────────────────────────────────┐
│  ☰    📅(today)        י"ח אייר ה'תשפ"ו     │
│                         5 במאי 2026          │
├──────────────────────────────────────────────┤
│  Holiday Banner (if applicable):             │
│  ┌────────────────────────────────────────┐  │
│  │ ✡ ל"ג בעומר — Lag BaOmer              │  │
│  └────────────────────────────────────────┘  │
├──────────────────────────────────────────────┤
│  ▼ Torah Details (collapsible section)       │
│  ──────────────────────────────────────      │
│  פרשת השבוע:  אמור                          │
│  ספירת העומר: י"ח לעומר                     │
│  דף יומי:    בבא קמא ה  →ספריא              │
│  רמב"ם יומי: הלכות תפילה פרק ז              │
├──────────────────────────────────────────────┤
│  ▼ Hourly Schedule                           │
│  ──────────────────────────────────────      │
│  06:00  │                                    │
│  07:00  │  ━━ Sunrise (5:51)                 │
│  08:00  │                                    │
│  09:00  │  User event: ישיבת צוות           │
│  ...                                          │
├──────────────────────────────────────────────┤
│           [ + Add Event ]                    │ ← FAB (floating button)
│  [ עברי ] [ לועזי ] [ יום ] [ זמנים ]        │
└──────────────────────────────────────────────┘
```

**Sections from top:**
1. **Holiday Banner** — Large colored banner if the day is a holiday/special date
2. **Torah Details** — Parasha, Omer count, Daf Yomi, Rambam — collapsible
3. **Hourly Schedule** — 00:00 to 23:00 timeline with user events
4. **FAB** — Floating "+" button to add a new event/note

**Date navigation:**
- **Swipe left/right** → Previous/next day
- **Tap date header** → Date picker

---

### Screen 4: Zmanim (`/(tabs)/zmanim.tsx`)

Halachic times for the current day, with location context.

```
┌──────────────────────────────────────────────┐
│  ☰    📅(today)        י"ח אייר ה'תשפ"ו     │
│                         5 במאי 2026          │
├──────────────────────────────────────────────┤
│  📍 ישראל, תל אביב   (tappable to change)  │
├──────────────────────────────────────────────┤
│  עלות השחר                       4:10       │
│  ──────────────────────────────────────      │
│  משיכיר                          4:56       │
│  ──────────────────────────────────────      │
│  נץ החמה                         5:51       │
│  ──────────────────────────────────────      │
│  סוף זמן ק"ש                   8:34 (גר"א) │
│                                  8:38 (מג"א) │
│  ──────────────────────────────────────      │
│  סוף זמן תפילה                  9:55 (גר"א) │
│                                  9:58 (מג"א) │
│  ──────────────────────────────────────      │
│  חצות                           12:37       │
│  מנחה גדולה                     13:11       │
│  מנחה קטנה                      16:34       │
│  פלג המנחה                      17:59       │
│  שקיעה                          19:24       │
│  צאת הכוכבים                    19:48       │
│  ──────────────────────────────────────      │
│  Friday only:                                │
│  🕯 הדלקת נרות                  18:54       │
│  הבדלה                          20:01       │
├──────────────────────────────────────────────┤
│  [ עברי ] [ לועזי ] [ יום ] [ זמנים ]        │
└──────────────────────────────────────────────┘
```

**Display rules:**
- Times sorted chronologically
- For times that vary by shita (גר"א / מג"א / רבנות) — show all methods, secondary methods smaller
- **Default shita:** Per settings (`zmanimMethod`)
- **Show seconds:** Optional (toggle in Settings)
- **Friday:** Show candle lighting and Havdalah times prominently
- **Today only:** Always shows current day. Date navigation arrow at top.

---

### Hamburger-only Screens (not in tab bar)

#### Week View
Three-day or seven-day horizontal layout, with Parasha for the week highlighted at top.
*(Lower priority — Phase 1.5)*

#### Details Screen
Extended daily Torah-learning list:
- Daf Yomi (Bavli)
- Daf Yomi (Yerushalmi — Vilna + Oz veHadar + Meshulav)
- Amud Yomi (Bavli + Dirshu)
- Mishna Yomit, Halacha Yomit, Tanach Yomi
- Rambam (1 chapter / 3 chapters)
- Tanya, Likutei Moharan, Hafetz Haim, etc.

This is for the **engaged observant user**. The traditional user won't open this screen.

#### Settings
Existing settings.tsx — minor visual refresh, no structural changes.

#### Tour / Onboarding
First-time user experience explaining navigation, settings, location permission.

#### Send Feedback
Mailto link or in-app form.

#### About
Version, credits, links to docs.

---

### Navigation Behaviors

#### Today Jump
The "today" icon (📅 with current day number) in every header → **Zmanim screen for today**.
*(Per user decision: emphasis on zmanim as the daily landing for engaged users.)*

#### Selected Day
The selected day is preserved across tabs:
- User taps a day on Hebrew Calendar → switches to Day tab for that date
- User switches back to Gregorian Calendar → the same day is still highlighted
- Zmanim tab shows times for the selected day (not just today)

#### Hardware Back Button (Android)
- Modal/sheet open → Close modal/sheet, stay on screen
- Tab screen → Behave as standard tab navigation back
- First tab → Confirm exit (or just exit)

---

## 🇮🇱 עברית

### ארכיטקטורת ניווט

Luchot כוללת שתי שכבות ניווט במקביל:

1. **טאב-בר תחתון (4 טאבים)** — שימוש יומי, במרחק קליק אחד
2. **תפריט המבורגר (☰)** — גישה מורחבת, מסכים משניים, הגדרות

---

### טאב-בר תחתון

```
┌─────────────────────────────────────────────────┐
│  [ עברי ]  [ לועזי ]  [ יום ]   [ זמנים ]      │
└─────────────────────────────────────────────────┘
```

| # | טאב | אייקון | מטרה |
|---|-----|--------|------|
| 1 | עברי | ל | תצוגת חודש, עברית כראשי |
| 2 | לועזי | 31 | תצוגת חודש, לועזי כראשי |
| 3 | יום | 1 | תצוגת יום יחיד (לוח שעות + מידע תורני) |
| 4 | זמנים | 🕐 | זמנים הלכתיים להיום |

**טאב ברירת מחדל:** עברי.

---

### תפריט המבורגר (☰) — שמאל-עליון בכל מסך

```
┌──────────────────────────────────┐
│  כותרת תאריך היום (ניתן ללחיצה)  │ ← לחיצה → זמנים
├──────────────────────────────────┤
│  📅 חודש לועזי                    │
│  🗓 חודש עברי                    │
│  📆 שבוע                          │
│  1️⃣ יום                          │
│  ℹ️ פרטים (לימוד יומי תורני)     │
│  🕐 זמנים                        │
│  ──────────                      │
│  ⚙️ הגדרות                       │
│  🎓 סיור / הכרות                  │
│  💬 שלח משוב                      │
│  ℹ️ אודות                         │
└──────────────────────────────────┘
```

**למה גם טאבים וגם המבורגר:** הטאבים לשימוש יומי-עיקרי. ההמבורגר נותן גישה למסכים משניים (שבוע, פרטים, סיור) בלי להעמיס על הטאב-בר.

---

### כותרת אחידה לכל מסך

לכל מסך אותה כותרת עליונה:

```
┌──────────────────────────────────────────────┐
│  ☰    📅(today)         י"ח אייר ה'תשפ"ו    │ ← תאריך ראשי (גדול, מודגש)
│                          5 במאי 2026         │ ← תאריך משני (קטן, דהוי)
└──────────────────────────────────────────────┘
```

- **שמאל:** איקון תפריט המבורגר
- **שמאל-מרכז:** כפתור "היום" (אייקון לוח קטן עם מספר היום). לחיצה → **מסך הזמנים של היום**
- **ימין:** תאריך בשתי שורות (עברי ראשי, לועזי משני). הסדר תלוי בהגדרת `hebrewOnTop`

---

### מסך 1: לוח עברי

מסך הנחיתה הראשי. תצוגת חודש עם עברית כראשי.

**תוכן התא (מלמעלה למטה):**
1. **שורת תאריך:** אות עברית גדולה + מספר לועזי קטן בפינה הנגדית. בשישי: איקון 🕯
2. **אזור tags:** עד 2 tags גלויים. כל tag הוא pill צבעוני עם תווית טקסט
3. **סימן עומס:** אם יש יותר מ-2 אירועים/חגים — מוצג "+N" בתחתית (למשל "+3")

**סדר ה-tags:**
- חגים יהודיים מופיעים **קודם** (למעלה)
- אירועי משתמש מופיעים **מתחת** לחגים
- בתוך כל קבוצה: סדר פנימי (אלפביתי לעת עתה)

**פלטת צבעי tags (5 קטגוריות):**
| קטגוריה | צבע | דוגמאות |
|---|---|---|
| חגים יהודיים | 🟢 ירוק | פסח, סוכות, ל"ג בעומר, יום טוב |
| שבת | 🟣 סגול | (רק כשמסומן במפורש) |
| ימים מיוחדים | 🟠 כתום | ראש חודש, יום הזיכרון, יום העצמאות |
| אירועי משתמש | 🔵 כחול | פגישות, עבודה, אירועים כלליים |
| אישי | 🔴 אדום | יארצייט, יום הולדת, יום נישואין |

**מצבי תא ויזואליים:**
- **ברירת מחדל:** רקע לבן, גבול עדין
- **היום:** גבול בצבע accent + רקע מטונרי קל
- **שבת:** רקע מטונרי עדין (קל מאוד)
- **נבחר (לחיצה ראשונה):** גבול מודגש + הצללה קלה (elevation)
- **חג:** רקע מקבל גוון עדין של צבע החג

**אינטראקציות:**
- **לחיצה ראשונה על יום** → היום הופך ל**נבחר** (מודגש). אין מעבר מסך. ה-tags נשארים גלויים.
- **לחיצה שנייה על אותו יום (כבר נבחר)** → מעבר לטאב "יום" עבור התאריך
- **לחיצה ארוכה (long-press)** → פתיחת תפריט פעולות מהיר (ראה למטה)
- **החלקה אופקית** → ניווט בין חודשים
- **לחיצה על שם החודש** → בורר חודש/שנה
- **לחיצה על איקון "היום" בכותרת** → מעבר למסך זמנים

**תפריט פעולות מהיר (לחיצה ארוכה):**
שלוש פעולות:
1. **הוסף הערה / אירוע** — פתיחת NoteEditor עבור התאריך
2. **הוסף יום הולדת / יארצייט** (חוזר) — פתיחת NoteEditor עם recurring=true וקטגוריה מוגדרת מראש
3. **צפה בפרטי היום** — מעבר לטאב "יום" עם פוקוס על סקציית פרטים תורניים (פרשה, דף יומי, רמב"ם)

**גודל תא:**
- גובה: ~110px (בינוני) — נכנסים 2 tags בנוחות בלי לאבד תצוגת חודש
- כל 5-6 שבועות נראים בלי גלילה במכשירים סטנדרטיים

---

### מסך 2: לוח לועזי

מבנה זהה ללוח עברי — אותם tags, אינטראקציות, וצבעים. רק הקצאת תאריך ראשי/משני מתהפכת.

**תוכן התא:**
- **חלק עליון, גדול:** מספר לועזי (14)
- **חלק עליון, קטן (בפינה הנגדית):** אות עברית (כ"ז)
- כל ה-tags, צבעים, גדלים ואינטראקציות **זהים** ללוח עברי

**אותה לוגיקה של יום נבחר:**
- לחיצה ראשונה → הדגשה
- לחיצה שנייה → מעבר לטאב "יום"
- לחיצה ארוכה → תפריט פעולות מהיר (אותן 3 פעולות)

---

### מסך 3: יום

תצוגת יום יחיד, משלבת לוח שעות **וגם** פרטים תורניים/לוחיים.

**סקציות מלמעלה למטה:**
1. **באנר חג** — באנר צבעוני גדול אם היום הוא חג / יום מיוחד
2. **פרטים תורניים** — פרשה, ספירת עומר, דף יומי, רמב"ם — מתכווץ
3. **לוח שעות** — 00:00 עד 23:00 עם אירועי משתמש
4. **כפתור צף (FAB)** — "+" להוספת אירוע/הערה

**ניווט תאריכים:**
- **החלקה ימינה/שמאלה** → יום הקודם/הבא
- **לחיצה על כותרת התאריך** → בורר תאריך

---

### מסך 4: זמנים

זמנים הלכתיים ליום הנוכחי, עם הקשר מיקום.

**כללי הצגה:**
- זמנים מסודרים כרונולוגית
- זמנים שמשתנים לפי שיטה (גר"א / מג"א / רבנות) — כל השיטות מוצגות, השניות בקטן יותר
- **שיטת ברירת מחדל:** לפי הגדרות (`zmanimMethod`)
- **הצגת שניות:** אופציונלי (toggle בהגדרות)
- **יום שישי:** הדלקת נרות והבדלה מוצגים בולט
- **רק היום:** תמיד מציג את היום הנוכחי. חץ ניווט תאריך למעלה

---

### מסכים שזמינים רק מההמבורגר (לא בטאב-בר)

#### תצוגת שבוע
פריסה אופקית של שלושה ימים או שבוע מלא, עם פרשת השבוע מובלטת למעלה.
*(עדיפות נמוכה — Phase 1.5)*

#### מסך פרטים
רשימה מורחבת של לימוד יומי תורני:
- דף יומי בבלי
- דף יומי ירושלמי (וילנא + עוז והדר + משולב)
- עמוד יומי (בבלי + דרשו)
- משנה יומית, הלכה יומית, תנ"ך יומי
- רמב"ם (פרק 1 / 3 פרקים)
- תניא, ליקוטי מוהר"ן, חפץ חיים, וכו'

זה למשתמש **הדתי המתקדם**. המסורתי לא ייפתח אותו.

#### הגדרות
ה-`settings.tsx` הקיים — רענון ויזואלי קל, ללא שינוי מבני.

#### סיור / הכרות
חוויית משתמש ראשונית שמסבירה ניווט, הגדרות, ובקשת הרשאת מיקום.

#### שלח משוב
קישור mailto או טופס בתוך האפליקציה.

#### אודות
גרסה, קרדיטים, קישורים לתיעוד.

---

### התנהגויות ניווט

#### כפתור "היום"
איקון "היום" (📅 עם מספר היום הנוכחי) בכל כותרת → **מסך הזמנים של היום**.
*(לפי החלטת המשתמש: הדגשת זמנים כנחיתה היומית לקהל הדתי המתקדם.)*

#### יום נבחר
היום הנבחר נשמר בין טאבים:
- משתמש לחץ על יום בלוח עברי → עובר לטאב "יום" עבור התאריך הזה
- משתמש חוזר ללוח לועזי → אותו יום עדיין מודגש
- טאב זמנים מציג זמנים עבור היום הנבחר (לא רק היום)

#### כפתור חזרה במכשיר (אנדרואיד)
- Modal/sheet פתוח → סוגר את ה-modal/sheet, נשאר במסך
- מסך טאב → התנהגות ניווט טאב סטנדרטית
- טאב ראשון → אישור יציאה (או פשוט יציאה)

# Luchot — Vision

> A bilingual Hebrew/Gregorian calendar app that unifies all the day's calendrical and Torah-related information in one clean, fast place — no clutter.

> אפליקציית לוח שנה דו-לשונית עברי/לועזי, המאחדת את כל המידע הלוחי והתורני של היום במקום אחד — נקי, מהיר, ובלי להעמיס.

---

## 🇬🇧 English

### Emotional Tone

**"Everything in one place."**

Luchot is not just another calendar app. It is the user's personal day-companion: Hebrew date, Gregorian date, holidays, halachic times, Parashat HaShavua, Daf Yomi, Rambam Yomi, Sefirat HaOmer, candle lighting, and personal notes — all in a single interface that works instantly, without internet, and without an account.

The user opens the app and, at a single glance, has their entire day.

---

### Target Audience

**Two audiences, one envelope:**

#### 1. The Engaged Observant User
Someone who starts the morning wanting to know:
- Today's Daf Yomi
- Today's Rambam chapter
- Prayer times according to their preferred shita (GRA / MGA / Rabbanut)
- Candle lighting time on Friday evening
- Whether today is Sefirat HaOmer, and which day
- Yahrzeits / Hebrew birthdays to remember

#### 2. The Traditional / Cultural Jewish User
Someone not strict about Daf Yomi, but wants to:
- See the Hebrew date next to the Gregorian
- Remember Mom's Hebrew birthday
- Know when Yom Kippur falls this year
- Remember a grandparent's yahrzeit
- See "ה' באדר תשפ״ו" without searching Google

**The principle:** The traditional user shouldn't need to understand what "MGA 16.1°" means — the app doesn't push it on them. The engaged user sees everything. Same app, two depth levels.

---

### What Luchot **IS**

- **All of a day's Torah-calendrical information in one place** — no need to open four apps
- **Full halachic accuracy** — time calculations via `kosher-zmanim`, holidays via `@hebcal/core`
- **As fast as a system app** — fully local, zero latency, zero loading spinners
- **100% offline** — works on Shabbat, abroad, in dead zones
- **Privacy-respecting** — no login, no server, no tracking, no analytics. Personal notes stay on the device
- **Bilingual at its core** — full Hebrew RTL + parallel Gregorian support

---

### What Luchot **IS NOT**

- **Not** a social app — no other users, no sharing feed
- **Not** a Torah study app — no Gemara or Rambam text inside. Links out to Sefaria
- **Not** an account-required app — ever. Even if sync is added later, it will be optional
- **Not** ad-supported — ever
- **Not** permission-hungry — only location (for zmanim) and notifications (for reminders)

---

### Guiding Principles

#### 1. Offline-first, forever
All computations happen on the device. Notes are stored in local SQLite. The app works without internet, login, or account. In a future Phase 2, optional sync may be added — but the core will always remain fully usable offline.

#### 2. Accuracy before beauty, beauty before features
- **Accuracy** — A wrong halachic calculation is disqualifying. Better to omit information than display inaccurate information
- **Beauty** — A serious Jewish app needs to look on par with a modern system app. Clean, clear, no visual noise
- **Features** — Added only after what exists works excellently

#### 3. Two depth levels, one interface
The main screen is simple and clear for any user. Additional depth (multiple calculation methods, advanced daily learning tracks) lives on dedicated screens — not surfaced on the main screen.

#### 4. Aesthetic: bright, clean, "system-like"
Inspired by modern Hebrew calendar apps (the standard Israeli Hebrew calendar) — white/light background, subtle color accents for holidays and event types, iOS/Android minimalism. **Not** parchment, **not** heavy ornamentation, **not** "kitsch Jewish design."

#### 5. Hebrew at the center, Gregorian alongside
The interface is Hebrew RTL. Gregorian dates are displayed with dignity, but the primary is Hebrew.

---

### Mid-term Vision (Phase 2 — post-MVP)

Not now, but kept in the roadmap:
- **Updatable content packs** — Content fixes and updates via CDN, no account required
- **Optional account** — Google/Apple sign-in for note sync across devices, **fully optional**. The schema is already Google Calendar API-compatible
- **Home screen widget** — Date + Parashat HaShavua + candle lighting on Friday evening
- **Family yahrzeit sharing** — Requires account, optional

---

### Success Metrics

How do we know Luchot succeeded?

1. **Daily return rate** — User opens the app at least once a day
2. **Multi-screen usage** — Not only the month screen; also zmanim/details
3. **Personal note additions** — Sign the user has "moved in"
4. **Positive reviews compared to other Jewish calendar apps**
5. **Stays installed** — Not deleted after a week

---

## 🇮🇱 עברית

### הקול הנפשי

**"הכל במקום אחד."**

Luchot היא לא עוד אפליקציית לוח שנה. היא הספרייה הלוחית-יומית האישית של המשתמש: תאריך עברי, תאריך לועזי, חגים, זמנים הלכתיים, פרשת השבוע, דף יומי, רמב״ם יומי, ספירת העומר, הדלקת נרות, וההערות האישיות שלו — הכל בממשק אחד שעובד מיד, בלי אינטרנט ובלי חשבון.

המשתמש פותח את האפליקציה, ובמבט אחד יש לו את היום.

---

### קהל היעד

**שני קהלים, מעטפת אחת:**

#### 1. הדתי המתקדם
מי שמתחיל את הבוקר ברצון לדעת:
- מה הדף היומי שאלמד היום
- מה פרק הרמב״ם
- מה זמני התפילה לפי השיטה שלו (גר״א / מג״א / רבנות)
- מתי הדלקת נרות בערב שבת
- האם היום ספירת העומר ומה היום של היום
- מי שיש לו יארצייט / יום הולדת עברי שצריך להיזכר בו

#### 2. המסורתי / היהודי השורשי
מי שלא בהכרח מקפיד על דף יומי, אבל רוצה:
- לראות תאריך עברי לצד התאריך הלועזי
- להיזכר ביום הולדת של אמא לפי הלוח העברי
- לדעת מתי יום כיפור השנה
- לזכור יארצייט של סבא
- לראות את "ה' באדר תשפ״ו" בלי לחפש בגוגל

**העיקרון:** המסורתי לא צריך להבין מה זה "מג״א 16.1°" — האפליקציה לא מציפה אותו. הדתי המתקדם רואה את הכל. אותה אפליקציה, שתי רמות עומק.

---

### מה Luchot **כן**

- **כל המידע התורני-לוחי של היום במקום אחד** — לא צריך לפתוח 4 אפליקציות
- **דיוק הלכתי מלא** — חישובי זמנים מבוססי `kosher-zmanim`, חגים מבוססי `@hebcal/core`
- **מהירה כמו אפליקציית מערכת** — הכל מקומי, אפס latency, אפס loading spinners
- **עובדת ב-100% offline** — מתאים לשבת, לחו״ל, למקומות בלי קליטה
- **שומרת פרטיות** — אין login, אין שרת, אין tracking, אין analytics. הערות אישיות נשארות במכשיר
- **דו-לשונית בליבה** — עברית RTL מלאה + תמיכה בלועזית מקבילה

---

### מה Luchot **לא**

- **לא** אפליקציית רשת חברתית — אין משתמשים אחרים, אין שיתוף, אין feed
- **לא** אפליקציית תלמוד תורה — אין טקסט גמרא או רמב״ם בפנים. יש קישור לספריא
- **לא** דורשת חשבון — לעולם. גם בעתיד, אם יתווסף סנכרון — יהיה אופציונלי
- **לא** מציגה פרסומות — לעולם
- **לא** דורשת הרשאות מיותרות — רק מיקום (לזמנים) ונוטיפיקציות (לתזכורות)

---

### עקרונות מנחים

#### 1. Offline-first, לתמיד
כל החישובים קורים במכשיר. הערות נשמרות ב-SQLite מקומי. האפליקציה עובדת ללא חיבור אינטרנט, ללא login, וללא חשבון. בעתיד (Phase 2) ייתכן ויתווסף סנכרון אופציונלי — אך הליבה תישאר תמיד שמישה במצב offline מלא.

#### 2. דיוק לפני יופי, יופי לפני פיצ'רים
- **דיוק** — חישוב הלכתי שגוי הוא פסילה. עדיף לא להציג מידע מאשר להציג מידע לא מדויק
- **יופי** — אפליקציה דתית רצינית צריכה להיראות ברמה של אפליקציית מערכת מודרנית. נקייה, ברורה, ללא רעש ויזואלי
- **פיצ'רים** — נוסיף רק אחרי שמה שיש עובד מצוין

#### 3. שתי רמות עומק, ממשק אחד
המסך הראשי פשוט וברור לכל קהל. עומק נוסף (שיטות חישוב מרובות, ספרי לימוד יומיים מתקדמים) זמין במסכים יעודיים, אבל לא מוקפץ למסך הראשי.

#### 4. אסתטיקה: בהירה, נקייה, "מערכתית"
בהשראת אפליקציות לוח שנה מודרניות (לוח עברי הסטנדרטי בישראל) — רקע לבן/בהיר, מבטאי צבע עדינים לחגים ולסוגי אירועים, מינימליזם בסגנון iOS/Android חדש. **לא** parchment, **לא** קישוטים כבדים, **לא** "עיצוב יהודי קיטשי".

#### 5. עברית במרכז, לועזית מקבילה
הממשק עברית RTL. תאריכים לועזיים מוצגים בכבוד, אבל הראשי הוא העברי.

---

### חזון לטווח בינוני (Phase 2 — אחרי MVP)

לא עכשיו, אבל שמור ב-roadmap:
- **חבילות תוכן מתעדכנות** — תיקונים ועדכוני תוכן דרך CDN, ללא דרישת חשבון
- **חשבון אופציונלי** — Google/Apple sign-in לסנכרון הערות בין מכשירים, **אופציונלי לחלוטין**, התשתית כבר תואמת Google Calendar API
- **Widget למסך הבית** — תאריך + פרשת השבוע + הדלקת נרות בערב שישי
- **שיתוף יארצייטים במשפחה** — דורש חשבון, אופציונלי

---

### מדדי הצלחה

איך נדע ש-Luchot הצליחה?

1. **חזרתיות יומית** — משתמש פותח את האפליקציה לפחות פעם ביום
2. **שימוש בכמה מסכים** — לא רק מסך החודש, גם זמנים/פרטים
3. **הוספת הערות אישיות** — סימן שהמשתמש "הזיז את הבית" לאפליקציה
4. **ביקורות חיוביות בהשוואה לאפליקציות לוח שנה דתיות אחרות**
5. **נשארת מותקנת** — לא נמחקת אחרי שבוע

# Luchot — לוחות

A bilingual Hebrew/Gregorian calendar app for Android (and iOS), built with React Native and Expo.
Hebrew and Gregorian dates, holidays, zmanim, Parashat HaShavua, Daf Yomi and the other daily
learning schedules, and personal notes and reminders, in one screen.

לוח שנה עברי-לועזי: תאריכים, חגים, זמנים, פרשת השבוע, דף יומי ולוחות לימוד נוספים, הערות ותזכורות. הכל במקום אחד.

- **Offline-first.** No backend, no account, no ads, no analytics. All data stays on the device
  (SQLite). See [docs/VISION.md](docs/VISION.md).
- **Privacy policy:** https://pricelog.fyi/he/luchot/privacy

## Development

```
npm install
npx expo start
```

Verification before a PR: `npm run typecheck; if ($?) { npx expo-doctor }`.
Project conventions are in [CLAUDE.md](CLAUDE.md) and [docs/](docs/).

## License

Copyright (C) 2026 Shlomo Lifschitz

Luchot is free software: you can redistribute it and/or modify it under the terms of the GNU
General Public License as published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version. See [LICENSE](LICENSE).

It builds on [@hebcal/core](https://github.com/hebcal/hebcal-es6) (GPL-2.0-or-later),
[kosher-zmanim](https://github.com/BehindTheMath/KosherZmanim) (LGPL-3.0) and other packages
under their own licenses; see each package in `package.json`. Place names come from
[OpenStreetMap](https://www.openstreetmap.org/copyright) via Nominatim, © OpenStreetMap
contributors (ODbL).

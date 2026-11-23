# 2026-11-23 Holiday display regression test

Retro item: ai-kit retro 2026-11-22 P2.

## Done
- `scripts/test-holiday-display.ts` (`npm run test:holidays`, node:test) covers the fixes in `2026-11-16-holiday-feedback.md`:
  - `hebraizeBookName`: Ezekiel, Psalms, I Kings and Song of Songs come out in Hebrew; Hebrew or unknown text is unchanged.
  - `isOptionalCivilDay`: over two years of hebcal events (Israel), the setting hides Rabin Memorial Day, Family Day, Hebrew Language Day, Yom HaAliyah and Chag HaBanot. It never hides Yom HaShoah, Yom HaZikaron, Yom HaAtzma'ut, Yom Yerushalayim or Sigd.
  - `DateService.getDayData` for 30 Shevat 5787: with the setting on, Family Day and Rosh Chodesh are both in the list; turned off, Family Day is gone and Rosh Chodesh stays.
- A resolve hook in the test adds `.ts` to extensionless relative imports, so plain Node can load `DateService.ts`. Metro needs no change.
- CI "Script tests" step now also runs `test:holidays`.

## Not covered
- The day-view component that renders one banner per holiday (`app/(tabs)/day.tsx`) is not tested. Only the data list it maps over is.

## Found while writing it
- The day cache is module-wide. A second `DateService` instance with a different `showCivilDays` would read the first one's cache. The app has one instance (`dateService`), so this is not a bug today.

## Verification
- `npm run test:holidays` → pass 5, fail 0
- `npm run typecheck` → exit 0
- Mutation check: `hebraizeBookName` returning its input, or `Sigd` dropped from the kept list → those tests fail.

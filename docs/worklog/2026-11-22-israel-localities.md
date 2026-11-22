## 2026-11-22 — Full Israeli localities list; candle-lighting offsets match hebcal.com
### What was done
- `src/constants/israelLocalities.ts` (generated, 1108 localities, ~94 KB source, Android bundle 8.4 → 8.5 MB): CBS "קובץ יישובים 2024" (bycode2024.xlsx), "דת יישוב" 1 (Jewish) and 4 (mixed: Jerusalem, Tel Aviv-Yafo, Haifa, Acre, Lod, Ramla, Ma'alot-Tarshiha, Nof HaGalil, Neve Shalom), plus new localities CBS has not coded yet (צורת יישוב 510, army camps excluded) and the Dead Sea hotels. ITM → lat/lng in `scripts/build-israel-localities.py` (re-run it with a newer CBS file to update).
- Location picker: Israel shows the 30 largest localities, then search (Hebrew/English, "קרית" ≈ "קריית") over all 1108; abroad keeps the curated hebcal cities. `setLocationFromLocality` stores the locality's centroid and its code (`location_locality` pref, read in `loadFromStorage`). A GPS fix within 3 km of a locality is named after it offline, before Nominatim.
- Candle lighting (`utils/candleLightingOffset.ts`) now matches hebcal.com: Jerusalem 40, Haifa 30, Zikhron Ya'akov 30 (new), rest of Israel 20 (was 18), abroad 18. Safed was 40; hebcal.com gives it 20, so it now follows the default. A picked locality is identified by its exact centroid, so neighbours inside the city boxes (Motza Illit, Beit Zayit, Har Gilo, Ramat Rachel, Tirat Carmel, HaHotrim, Kfar Galim, Ma'ayan Tzvi) get 20 as on hebcal.com; GPS and older saved cities still use the boxes.
- About screen credits the CBS as the source of the list.
### Findings (hebcal.com, checked 2026-11-22)
- hebcal.com computes each place from its own coordinates (GeoNames), not from a nearby city; sunset without elevation, same as ours.
- Its Israeli default is 20 min (`b=18` and no `b` both give sunset − 20); 40/30 only when the named city (Jerusalem / Haifa / Zikhron) is selected; raw coordinates in Jerusalem get 20.
- Check: 10 named localities (Fri 2026-11-27) and 40 random localities (winter and summer Fridays) — candle-lighting identical to the minute, 0 mismatches.
### Open issues / blocked
- Not seen on a device. main's fingerprint (`753ed38…`) differs from the testers' build 20, so this ships in the next full build (or a new preview build to check it first).
- "שקיעה נראית" (topographic visible sunset) is not implemented: it needs terrain data, not available offline.
### Next steps
- Preview build from main, check the picker and Shabbat times on a device; then production build 21 to the Alpha track.

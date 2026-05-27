// src/constants/cities.ts
//
// Phase 4.5 — Curated city list with Hebrew display names.
//
// Each entry maps a @hebcal/core Location key (augmented by the
// @hebcal/cities side-effect import) to its Hebrew display name.
//
// 22 Israeli cities + 14 international diaspora hubs = 36 cities.
// (Kefar Sava, Beit Shemesh, Rosh HaAyin, Antwerp were dropped —
// @hebcal/cities@5.0.1 does not include them under any known variant.)
//
// To add a city: confirm Hebcal knows it (Location.lookup('Name')
// returns non-null after `import '@hebcal/cities'`), then add a row.
// The lat/lng comes from Hebcal at lookup time — we don't duplicate it.

export interface CityEntry {
  hebcalKey: string;   // The exact string Location.lookup() accepts
  nameHe: string;      // Hebrew display name
  country: 'IL' | 'INTL';
}

export const CITIES: CityEntry[] = [
  // Israel — 22 cities, ordered by population/relevance
  { hebcalKey: 'Jerusalem',       nameHe: 'ירושלים',     country: 'IL' },
  { hebcalKey: 'Tel Aviv',        nameHe: 'תל אביב',     country: 'IL' },
  { hebcalKey: 'Haifa',           nameHe: 'חיפה',        country: 'IL' },
  { hebcalKey: 'Rishon LeZiyyon', nameHe: 'ראשון לציון', country: 'IL' },
  { hebcalKey: 'Petach Tikvah',   nameHe: 'פתח תקווה',   country: 'IL' },
  { hebcalKey: 'Ashdod',          nameHe: 'אשדוד',       country: 'IL' },
  { hebcalKey: 'Netanya',         nameHe: 'נתניה',       country: 'IL' },
  { hebcalKey: 'Beer Sheva',      nameHe: 'באר שבע',     country: 'IL' },
  { hebcalKey: 'Bene Beraq',      nameHe: 'בני ברק',     country: 'IL' },
  { hebcalKey: 'Holon',           nameHe: 'חולון',       country: 'IL' },
  { hebcalKey: 'Ramat Gan',       nameHe: 'רמת גן',      country: 'IL' },
  { hebcalKey: 'Ashkelon',        nameHe: 'אשקלון',      country: 'IL' },
  { hebcalKey: 'Rehovot',         nameHe: 'רחובות',      country: 'IL' },
  { hebcalKey: 'Bat Yam',         nameHe: 'בת ים',       country: 'IL' },
  { hebcalKey: 'Herzliyya',       nameHe: 'הרצליה',      country: 'IL' },
  { hebcalKey: "Ra'anana",        nameHe: 'רעננה',       country: 'IL' },
  { hebcalKey: 'Modiin',          nameHe: 'מודיעין',     country: 'IL' },
  { hebcalKey: 'Nazareth',        nameHe: 'נצרת',        country: 'IL' },
  { hebcalKey: 'Tiberias',        nameHe: 'טבריה',       country: 'IL' },
  { hebcalKey: 'Safed',           nameHe: 'צפת',         country: 'IL' },
  { hebcalKey: 'Eilat',           nameHe: 'אילת',        country: 'IL' },
  { hebcalKey: 'Yavne',           nameHe: 'יבנה',        country: 'IL' },

  // International diaspora — 14 cities
  { hebcalKey: 'New York',        nameHe: 'ניו יורק',    country: 'INTL' },
  { hebcalKey: 'Brooklyn',        nameHe: 'ברוקלין',     country: 'INTL' },
  { hebcalKey: 'Los Angeles',     nameHe: "לוס אנג'לס",  country: 'INTL' },
  { hebcalKey: 'Lakewood',        nameHe: 'לייקווד',     country: 'INTL' },
  { hebcalKey: 'Miami',           nameHe: 'מיאמי',       country: 'INTL' },
  { hebcalKey: 'Chicago',         nameHe: 'שיקגו',       country: 'INTL' },
  { hebcalKey: 'Toronto',         nameHe: 'טורונטו',     country: 'INTL' },
  { hebcalKey: 'Montreal',        nameHe: 'מונטריאול',   country: 'INTL' },
  { hebcalKey: 'London',          nameHe: 'לונדון',      country: 'INTL' },
  { hebcalKey: 'Manchester',      nameHe: "מנצ'סטר",     country: 'INTL' },
  { hebcalKey: 'Paris',           nameHe: 'פריז',        country: 'INTL' },
  { hebcalKey: 'Melbourne',       nameHe: 'מלבורן',      country: 'INTL' },
  { hebcalKey: 'Sydney',          nameHe: 'סידני',       country: 'INTL' },
  { hebcalKey: 'Johannesburg',    nameHe: 'יוהנסבורג',   country: 'INTL' },
];

/**
 * Look up a city entry by its Hebcal key.
 * Returns undefined if the key is not in our curated list.
 */
export function findCityByKey(hebcalKey: string): CityEntry | undefined {
  return CITIES.find((c) => c.hebcalKey === hebcalKey);
}

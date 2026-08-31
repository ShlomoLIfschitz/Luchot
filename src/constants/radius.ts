export const radius = {
  xs:   4,    // Tags, small badges
  sm:   6,    // Day cells
  md:   8,    // Buttons, input fields
  lg:   12,   // Sheets
  // Figma-specific step, same root cause as the typography drift fix (see
  // typography.ts, 2026-08-31 notes): the generic scale (4/6/8/12/16) can't
  // express the Figma mock's cornerRadius: 14, used consistently across
  // every card surface (ParashaCard, Shabbat table, zmanim sections,
  // location card, day-screen cards). Named descriptively rather than
  // renumbering the xs/sm/md/lg/xl scale, to avoid drifting existing
  // surfaces already aligned to `lg`.
  card: 14,   // Cards
  xl:   16,   // Modals
  full: 9999, // Pills, circular buttons
} as const;

export type Radius = typeof radius;

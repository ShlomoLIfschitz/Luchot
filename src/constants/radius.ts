export const radius = {
  // Figma screen-level steps (2026-11-03 parity pass). The Foundations scale
  // is 4/6/8/12/16, but the approved screen frames also draw 3, 5, 10 and 20.
  // Named by what uses them, like `card`, so the generic scale stays as is.
  chip:  3,   // Month-grid day-cell chips
  xs:   4,    // Tags, small badges
  event: 5,   // Week timeline event blocks
  sm:   6,    // Day cells
  md:   8,    // Buttons, input fields
  item: 10,   // Drawer items, search field, Details badges
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
  sheet: 20,  // Bottom sheets (note editor) — top corners
  full: 9999, // Pills, circular buttons
} as const;

export type Radius = typeof radius;

export const radius = {
  xs:   4,    // Tags, small badges
  sm:   6,    // Day cells
  md:   8,    // Buttons, input fields
  lg:   12,   // Cards, sheets
  xl:   16,   // Modals
  full: 9999, // Pills, circular buttons
} as const;

export type Radius = typeof radius;

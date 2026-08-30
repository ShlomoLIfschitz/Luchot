// src/constants/colors.ts
// Authoritative palette — matches docs/DESIGN.md exactly.
// ThemeColors type is inferred from Colors.light (see useThemeColors.ts).

export const Colors = {
  light: {
    // Backgrounds
    background:       '#FAFAF7',   // Main app background
    surface:          '#FFFFFF',   // Cards, modals, sheets
    surfaceElevated:  '#F4F4F0',   // Pressed states, secondary surfaces
    surfaceMuted:     '#EFEFEA',   // Disabled, inactive

    // Borders
    border:           '#E5E5E0',   // Standard borders, dividers
    borderStrong:     '#C8C8C2',   // Emphasized borders, focused inputs
    borderSubtle:     '#F0F0EB',   // Grid lines, very faint

    // Text
    textPrimary:      '#1A1A18',   // Headlines, primary text
    textSecondary:    '#5A5A55',   // Subtitles, secondary text
    textTertiary:     '#9A9A93',   // Hints, placeholders, disabled
    textInverse:      '#FFFFFF',   // Text on colored backgrounds

    // Brand accent — deep slate-blue (scholarly, not aggressive)
    accent:           '#3D5A80',   // Primary actions, tab active, links
    accentLight:      '#E6EBF2',   // Selected/active backgrounds
    accentStrong:     '#2C4360',   // Pressed state

    // Tag categories (5 from SCREENS.md)
    tagHoliday:       '#2E7D32',   // Green: Jewish holidays
    tagHolidayBg:     '#E8F5E9',
    tagShabbat:       '#6A4FB8',   // Purple: Shabbat
    tagShabbatBg:     '#EEEAF7',
    tagSpecial:       '#D77A2E',   // Orange: Rosh Chodesh, national days
    tagSpecialBg:     '#FCEFE0',
    tagEvent:         '#1E6FB8',   // Blue: User events
    tagEventBg:       '#E1EEFA',
    tagPersonal:      '#C2185B',   // Red: Yahrzeit, birthday, anniversary
    tagPersonalBg:    '#FCE4EC',

    // States
    today:            '#3D5A80',   // Today indicator border (= accent)
    todayBg:          '#E6EBF2',   // Today cell background
    selected:         '#3D5A80',   // Selected day border
    selectedBg:       '#F0F4F9',   // Selected day background
    success:          '#2E7D32',
    warning:          '#D77A2E',
    error:            '#C62828',

    // Candle (Friday / Erev Shabbat indicator)
    candle:           '#E8A33D',

    // Tint backgrounds (day-cell / row highlights)
    holidayTint:      '#F4FAF5',   // Day-cell background tint on a holiday
    shabbatTint:      '#F8F6FC',   // Day-cell background tint on Shabbat
    candleBg:         '#FDF4E6',   // Highlighted candle-lighting row background
    successBg:        '#E8F5E9',   // GPS "located" state background
    warningBg:        '#FCEFE0',   // GPS "services disabled" state background
    errorBg:          '#FDEAEA',   // GPS "blocked / failed" state background
  },

  dark: {
    // Backgrounds
    background:       '#0F0F0D',
    surface:          '#1A1A18',
    surfaceElevated:  '#252522',
    surfaceMuted:     '#2D2D2A',

    // Borders
    border:           '#2E2E2A',
    borderStrong:     '#454540',
    borderSubtle:     '#1F1F1D',

    // Text
    textPrimary:      '#F0F0EC',
    textSecondary:    '#9A9A93',
    textTertiary:     '#5A5A55',
    textInverse:      '#1A1A18',

    // Brand accent — lighter slate-blue for dark contrast
    accent:           '#7B9BC8',
    accentLight:      '#1F2935',
    accentStrong:     '#A0BCDE',

    // Tag categories
    tagHoliday:       '#66BB6A',
    tagHolidayBg:     '#1B2E1D',
    tagShabbat:       '#9C82DC',
    tagShabbatBg:     '#252035',
    tagSpecial:       '#E8A05B',
    tagSpecialBg:     '#2E2218',
    tagEvent:         '#5BA3E8',
    tagEventBg:       '#162635',
    tagPersonal:      '#E84F86',
    tagPersonalBg:    '#2E1822',

    // States
    today:            '#7B9BC8',
    todayBg:          '#1F2935',
    selected:         '#7B9BC8',
    selectedBg:       '#181E27',
    success:          '#66BB6A',
    warning:          '#E8A05B',
    error:            '#E84F86',

    // Candle
    candle:           '#F0B860',

    // Tint backgrounds (day-cell / row highlights)
    holidayTint:      '#15211A',   // Day-cell background tint on a holiday
    shabbatTint:      '#1B1726',   // Day-cell background tint on Shabbat
    candleBg:         '#2E2218',   // Highlighted candle-lighting row background
    successBg:        '#1B2E1D',   // GPS "located" state background
    warningBg:        '#2E2218',   // GPS "services disabled" state background
    errorBg:          '#2E1822',   // GPS "blocked / failed" state background
  },
};

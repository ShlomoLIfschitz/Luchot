// src/components/zmanim/ShabbatCard.tsx
// Phase 5 — Shabbat summary card shown on Friday and Saturday in the Day screen.
// Friday:   4-city candle-lighting / havdalah table + optional user-location row.
// Saturday: tzeis + Rabbeinu Tam (single-location, prop-driven — unchanged).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CandleFlameIcon } from '../icons/FigmaIcons';
import { formatZmanTime, type ShabbatRow } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useShabbatTable } from '../../hooks/useShabbatTable';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';

interface Props {
  selectedDate: Date;
  candleLightingTime: Date | null;
  tzaisTime: Date | null;
  rabbeinuTamTime: Date | null;
  locationName: string | null;
  use24h: boolean;
}

export function ShabbatCard({
  selectedDate,
  candleLightingTime,
  tzaisTime,
  rabbeinuTamTime,
  locationName,
  use24h,
}: Props) {
  // ALL hooks before any early return (Rules of Hooks).
  const colors = useThemeColors();
  // useShabbatTable expects the Friday date; on Saturday we still call it
  // (hooks must not be conditional) but the result is only rendered on Friday.
  const rows = useShabbatTable(selectedDate);

  const day = selectedDate.getDay();
  if (day !== 5 && day !== 6) return null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {day === 5 ? (
        /* ── Friday branch — 4-city + user-row table ───────────────────── */
        <View>
          {/* Card header row — row-reverse: candle icon first (far right),
              title next to it filling toward the left (Figma). */}
          <View style={styles.cardHeader}>
            <CandleFlameIcon size={20} bodyColor={colors.borderStrong} flameColor={colors.candle} />
            <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>
              כניסת שבת
            </Text>
          </View>

          {/* Column header row */}
          <View style={styles.tableHeader}>
            {/* Column order JSX-first → rightmost (row-reverse):
                (a) empty spacer for the city-name column (right)
                (b) הדלקת נרות (center)
                (c) צאת שבת  (left)                                     */}
            <View style={styles.nameCell} />
            <Text style={[styles.columnHeaderLabel, styles.candleCell, { color: colors.textTertiary }]}>
              הדלקת נרות
            </Text>
            <Text style={[styles.columnHeaderLabel, styles.havdalahCell, { color: colors.textTertiary }]}>
              צאת שבת
            </Text>
          </View>

          {/* Data rows */}
          {rows.map((row: ShabbatRow) => {
            // Render a divider before the user row (index 4) only when there
            // is a 5th row — i.e. rows.length > 4.
            const showDivider = row.isUserRow === true && rows.length > 4;

            return (
              <React.Fragment key={row.isUserRow ? 'user' : row.nameHe}>
                {/* The user's own row is set off by a top hairline (Figma). */}
                <View
                  style={[
                    styles.tableRow,
                    showDivider && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                  ]}
                >
                  {/* (a) City name — flex: 1, rightmost */}
                  <Text
                    style={[
                      styles.nameCell,
                      {
                        color: row.isUserRow ? colors.accent : colors.textPrimary,
                        ...withFontFamily(typography.bodySmall, row.isUserRow ? '700' : '400'),
                      },
                    ]}
                  >
                    {row.isUserRow && row.nameHe !== 'המיקום שלי'
                      ? `${row.nameHe}  ·  המיקום שלי`
                      : row.nameHe}
                  </Text>
                  {/* (b) Candle lighting — fixed ~74, center. 13 SemiBold on
                      regular rows (heavier than the plain city-name/havdalah
                      columns), 13 Bold on the user row like every other column. */}
                  <Text
                    style={[
                      styles.timeCell,
                      styles.candleCell,
                      {
                        color: row.isUserRow ? colors.accent : colors.textPrimary,
                        ...withFontFamily(typography.bodySmall, row.isUserRow ? '700' : '600'),
                      },
                    ]}
                  >
                    {formatZmanTime(row.candleLighting, use24h)}
                  </Text>
                  {/* (c) Havdalah — fixed ~66, center; secondary text on regular rows */}
                  <Text
                    style={[
                      styles.timeCell,
                      styles.havdalahCell,
                      {
                        color: row.isUserRow ? colors.accent : colors.textSecondary,
                        ...withFontFamily(typography.bodySmall, row.isUserRow ? '700' : '400'),
                      },
                    ]}
                  >
                    {formatZmanTime(row.havdalah, use24h)}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        /* ── Saturday branch — UNCHANGED behavior/content; title kept as before ── */
        <>
          <Text style={[styles.title, { color: colors.tagShabbat }]}>שבת קודש</Text>

          {/* Location row — only when locationName is provided */}
          {!!locationName && (
            <View style={styles.row}>
              {/* label on the right (first child in row-reverse) */}
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {`מיקום: ${locationName}`}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>צאת השבת</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {formatZmanTime(tzaisTime, use24h)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>ר״ת</Text>
            <Text style={[styles.value, { color: colors.textPrimary }]}>
              {formatZmanTime(rabbeinuTamTime, use24h)}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Card shell ──────────────────────────────────────────────────────────
  // Figma: r14, 1 px border, padding 14, 12 above the next item.
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  // Saturday-branch title (unchanged content/position — kept centered above the rows).
  title: {
    ...withFontFamily(typography.cardTitle),
    textAlign: 'center',
    marginBottom: 12,
  },

  // ── Friday card header — row-reverse: title first/right, candle icon last/left ──
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardHeaderTitle: {
    flex: 1,
    ...withFontFamily(typography.bodyMedium, '700'),
    textAlign: 'right',
  },

  // ── Saturday branch (row/label/value — kept exactly as before) ──────────
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    gap: 12,
  },
  label: {
    ...withFontFamily(typography.bodyMedium),
    textAlign: 'right',
  },
  value: {
    ...withFontFamily(typography.bodyMedium, '500'),
  },

  // ── Friday table ─────────────────────────────────────────────────────────
  // Header row: same column layout as data rows, RTL.
  tableHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  // Data row: RTL, columns align with header.
  // Figma: rows 29 tall (padding 5), 10 apart.
  tableRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 5,
    marginTop: 10,
  },
  // (a) City-name cell — flex: 1, rightmost in the row-reverse layout.
  nameCell: {
    flex: 1,
    ...withFontFamily(typography.bodySmall),
    textAlign: 'right',
  },
  // (b)/(c) Time cells — fixed width, centered.
  timeCell: {
    ...withFontFamily(typography.bodySmall),
    textAlign: 'center',
  },
  // Candle-lighting column — fixed ~74pt.
  candleCell: {
    width: 74,
  },
  // Havdalah column — fixed ~66pt.
  havdalahCell: {
    width: 66,
  },
  // Column header labels — micro / textTertiary per approved design.
  columnHeaderLabel: {
    ...withFontFamily(typography.micro),
    textAlign: 'center',
  },
});

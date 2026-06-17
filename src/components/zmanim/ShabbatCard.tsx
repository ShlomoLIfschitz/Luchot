// src/components/zmanim/ShabbatCard.tsx
// Phase 5 — Shabbat summary card shown on Friday and Saturday in the Day screen.
// Friday:   4-city candle-lighting / havdalah table + optional user-location row.
// Saturday: tzeis + Rabbeinu Tam (single-location, prop-driven — unchanged).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatZmanTime, type ShabbatRow } from '../../services/ZmanimService';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useShabbatTable } from '../../hooks/useShabbatTable';
import { radius } from '../../constants/radius';

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
      {/* Title — colors.tagShabbat (purple). colors.holiday does not exist in
          ThemeColors (the token set only has tagShabbat for Shabbat-purple). */}
      <Text style={[styles.title, { color: colors.tagShabbat }]}>שבת קודש</Text>

      {day === 5 ? (
        /* ── Friday branch — 4-city + user-row table ───────────────────── */
        <View>
          {/* Header row */}
          <View style={styles.tableHeader}>
            {/* Column order JSX-first → rightmost (row-reverse):
                (a) empty spacer for the city-name column (right)
                (b) הדלקת נרות (center)
                (c) צאת שבת  (left)                                     */}
            <View style={styles.nameCell} />
            <Text style={[styles.headerLabel, { color: colors.textTertiary }]}>
              הדלקת נרות
            </Text>
            <Text style={[styles.headerLabel, { color: colors.textTertiary }]}>
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
                {showDivider && (
                  <View
                    style={[styles.divider, { backgroundColor: colors.border }]}
                  />
                )}
                <View style={styles.tableRow}>
                  {/* (a) City name — flex: 1, rightmost */}
                  <Text
                    style={[
                      styles.nameCell,
                      {
                        color: row.isUserRow ? colors.accent : colors.textPrimary,
                        fontWeight: row.isUserRow ? '700' : '400',
                      },
                    ]}
                  >
                    {row.nameHe}
                  </Text>
                  {/* (b) Candle lighting — fixed width, center */}
                  <Text style={[styles.timeCell, { color: colors.textPrimary }]}>
                    {formatZmanTime(row.candleLighting, use24h)}
                  </Text>
                  {/* (c) Havdalah — fixed width, center */}
                  <Text style={[styles.timeCell, { color: colors.textPrimary }]}>
                    {formatZmanTime(row.havdalah, use24h)}
                  </Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>
      ) : (
        /* ── Saturday branch — UNCHANGED ───────────────────────────────── */
        <>
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
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    textAlign: 'right',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
  },

  // ── Friday table ─────────────────────────────────────────────────────────
  // Header row: same column layout as data rows, RTL.
  tableHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
  },
  // Data row: RTL, columns align with header.
  tableRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 3,
  },
  // (a) City-name cell — flex: 1, rightmost in the row-reverse layout.
  nameCell: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  // (b)/(c) Time cells — fixed width, centered.
  timeCell: {
    width: 72,
    fontSize: 14,
    textAlign: 'center',
  },
  // Header labels sit above (b)/(c); same fixed width as timeCell.
  headerLabel: {
    width: 72,
    fontSize: 12,
    textAlign: 'center',
  },
  // Divider between the 4 fixed-city rows and the user row.
  divider: {
    height: 1,
    marginVertical: 8,
  },
});

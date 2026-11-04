// app/about.tsx
// Phase 3.7c — About screen. Standalone, accessible from the drawer.
// Shows app metadata: version (from expo-constants), description,
// the app's own licence and source link (GPL-3.0-or-later, DECISIONS.md
// 2026-11-04), and credits with their licences.

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
} from 'react-native';
import Constants from 'expo-constants';
import { useThemeColors } from '../src/hooks/useThemeColors';
import { getRunningUpdateInfo } from '../src/hooks/useOtaUpdates';
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { Card } from '../src/components/ui/Card';
import { SectionLabel } from '../src/components/ui/SectionLabel';
import { typography, withFontFamily } from '../src/constants/typography';
import type { ThemeColors } from '../src/hooks/useThemeColors';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface CreditItem {
  name: string;
  description: string;
  /** SPDX id, shown after the description. Omitted for linked services. */
  license?: string;
  url?: string;
}

const SOURCE_URL = 'https://github.com/ShlomoLIfschitz/Luchot';

const SOURCE: CreditItem = {
  name: 'קוד המקור',
  description: 'לוחות היא תוכנה חופשית. מותר להפיץ ולשנות אותה לפי תנאי הרישיון',
  license: 'GPL-3.0-or-later',
  url: SOURCE_URL,
};

// Licences as declared in each package.json (checked 2026-11-04).
const CREDITS: CreditItem[] = [
  {
    name: '@hebcal/core ו-@hebcal/learning',
    description: 'חישובי לוח עברי, חגים, פרשת השבוע, ולוחות לימוד יומי',
    license: 'GPL-2.0-or-later · BSD-2-Clause',
    url: 'https://github.com/hebcal',
  },
  {
    name: 'kosher-zmanim',
    description: 'חישובי זמנים הלכתיים מדויקים',
    license: 'LGPL-3.0',
    url: 'https://github.com/BehindTheMath/KosherZmanim',
  },
  {
    // ODbL requires this attribution wherever Nominatim results are shown.
    name: 'OpenStreetMap',
    description: 'שמות מקומות לפי מיקום (Nominatim). © OpenStreetMap contributors',
    license: 'ODbL',
    url: 'https://www.openstreetmap.org/copyright',
  },
  {
    name: 'Sefaria',
    description: 'מקור מקושר ללימוד דף יומי, רמב״ם, וכל מקורות התורה',
    url: 'https://www.sefaria.org.il',
  },
  {
    name: 'Lucide Icons',
    description: 'אייקונים נקיים ועקביים',
    license: 'ISC',
    url: 'https://lucide.dev',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AboutScreen() {
  const colors = useThemeColors();

  // expo-constants SDK 46+: expoConfig is the canonical accessor.
  // manifest is still present but deprecated; kept as fallback for safety.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const version: string =
    (Constants as any).expoConfig?.version ??
    (Constants as any).manifest?.version ??
    'unknown';

  // Diagnostic only — answers "did my change actually land?" without device
  // logs (see useOtaUpdates.ts). Quiet and secondary by design; not a
  // feature, so no loading/error state — these fields are static for the
  // life of the running JS instance (a reload restarts the whole app).
  const runningUpdate = getRunningUpdateInfo();
  const runningUpdateLabel = runningUpdate.isEmbeddedLaunch
    ? 'גרסה מוטמעת (ללא עדכון מקוון)'
    : runningUpdate.updateId
      ? `עדכון מקוון: ${runningUpdate.updateId.slice(0, 8)}${
          runningUpdate.createdAt
            ? ` · ${runningUpdate.createdAt.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : ''
        }`
      : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScreenHeader title="אודות" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App identity */}
        <View style={styles.identityBlock}>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>
            לוחות
          </Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            לוח שנה עברי-לועזי. הכל במקום אחד.
          </Text>
          <Text style={[styles.version, { color: colors.textTertiary }]}>
            גרסה {version}
          </Text>
          {runningUpdateLabel && (
            <Text
              style={[styles.updateInfo, { color: colors.textTertiary }]}
              accessibilityLabel={`מידע אבחון: ${runningUpdateLabel}`}
            >
              {runningUpdateLabel}
            </Text>
          )}
        </View>

        {/* Description — shared Card, so its gutters match the Credits
            card below rather than hand-rolling a duplicate card style. */}
        <Card colors={colors}>
          <Text style={[styles.cardBody, { color: colors.textPrimary }]}>
            לוחות מאחדת את כל המידע התורני-לוחי של היום במקום אחד:
            תאריך עברי, תאריך לועזי, חגים, זמנים הלכתיים, פרשת השבוע,
            דף יומי, רמב״ם, ספירת העומר, הדלקת נרות, והערות אישיות.
            {'\n\n'}
            עובדת ללא חיבור לאינטרנט. ללא חשבון. ללא פרסומות.
            כל הנתונים נשמרים במכשיר.
          </Text>
        </Card>

        {/* Licence and source — GPL requires the source to be reachable. */}
        <SectionLabel title="רישיון" colors={colors} inset={20} gapAbove={24} />
        <Card colors={colors}>
          <CreditRow credit={SOURCE} colors={colors} isLast />
        </Card>

        {/* Credits */}
        <SectionLabel title="קרדיטים" colors={colors} inset={20} gapAbove={24} />
        <Card colors={colors}>
          {CREDITS.map((credit, i) => (
            <CreditRow
              key={credit.name}
              credit={credit}
              colors={colors}
              isLast={i === CREDITS.length - 1}
            />
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

// ─── CreditRow ─────────────────────────────────────────────────────────────────

function CreditRow({
  credit,
  colors,
  isLast = false,
}: {
  credit: CreditItem;
  colors: ThemeColors;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={credit.url ? () => Linking.openURL(credit.url!) : undefined}
      android_ripple={{ color: colors.border }}
      style={[
        styles.creditRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.borderSubtle,
        },
      ]}
      accessibilityRole={credit.url ? 'link' : undefined}
      accessibilityLabel={credit.name}
    >
      <View style={styles.creditContent}>
        <Text style={[styles.creditName, { color: colors.textPrimary }]}>
          {credit.name}
        </Text>
        <Text style={[styles.creditDescription, { color: colors.textSecondary }]}>
          {credit.description}
        </Text>
        {credit.license && (
          <Text style={[styles.creditLicense, { color: colors.textTertiary }]}>
            {credit.license}
          </Text>
        )}
      </View>
      {credit.url && (
        <Text style={[styles.creditLink, { color: colors.accent }]}>
          ↗
        </Text>
      )}
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:          { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  identityBlock: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  appName:  { ...withFontFamily(typography.displayMedium), letterSpacing: -0.5, textAlign: 'center' },
  tagline:  { ...withFontFamily(typography.bodyMedium), marginTop: 4, textAlign: 'center' },
  version:  { ...withFontFamily(typography.caption), marginTop: 12, textAlign: 'center' },
  // Diagnostic, secondary to `version` — same token, tighter top margin so
  // it reads as an appendix to the version line rather than a peer of it.
  updateInfo: { ...withFontFamily(typography.caption), marginTop: 2, textAlign: 'center' },

  cardBody: {
    ...withFontFamily(typography.bodyMedium),
    textAlign: 'right',
    padding: 16,
  },

  creditRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 54,
  },
  creditContent: { flex: 1 },
  creditName: {
    ...withFontFamily(typography.bodySmall, '600'),
    textAlign: 'right',
  },
  creditDescription: {
    ...withFontFamily(typography.caption),
    marginTop: 2,
    textAlign: 'right',
  },
  creditLicense: {
    ...withFontFamily(typography.caption),
    marginTop: 2,
    textAlign: 'right',
  },
  // No exact type-scale step matches the previous hand-picked 18 — nearest
  // is cardTitle (17), and its baked-in fontWeight (700) already matches.
  creditLink: {
    ...withFontFamily(typography.cardTitle),
  },
});

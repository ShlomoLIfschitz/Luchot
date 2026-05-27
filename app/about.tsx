// app/about.tsx
// Phase 3.7c — About screen. Standalone, accessible from the drawer.
// Shows app metadata: version (from expo-constants), description,
// credits with Sefaria/hebcal/kosher-zmanim/Lucide links.

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
import { ScreenHeader } from '../src/components/common/ScreenHeader';
import { radius } from '../src/constants/radius';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface CreditItem {
  name: string;
  description: string;
  url?: string;
}

const CREDITS: CreditItem[] = [
  {
    name: '@hebcal/core ו-@hebcal/learning',
    description: 'חישובי לוח עברי, חגים, פרשת השבוע, ולוחות לימוד יומי',
    url: 'https://github.com/hebcal',
  },
  {
    name: 'kosher-zmanim',
    description: 'חישובי זמנים הלכתיים מדויקים',
    url: 'https://github.com/BehindTheMath/KosherZmanim',
  },
  {
    name: 'Sefaria',
    description: 'מקור מקושר ללימוד דף יומי, רמב״ם, וכל מקורות התורה',
    url: 'https://www.sefaria.org.il',
  },
  {
    name: 'Lucide Icons',
    description: 'אייקונים נקיים ועקביים',
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
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardBody, { color: colors.textPrimary }]}>
            לוחות מאחדת את כל המידע התורני-לוחי של היום במקום אחד:
            תאריך עברי, תאריך לועזי, חגים, זמנים הלכתיים, פרשת השבוע,
            דף יומי, רמב״ם, ספירת העומר, הדלקת נרות, והערות אישיות.
            {'\n\n'}
            עובדת ללא חיבור לאינטרנט. ללא חשבון. ללא פרסומות.
            כל הנתונים נשמרים במכשיר.
          </Text>
        </View>

        {/* Credits */}
        <Text style={[styles.sectionHeader, { color: colors.accent }]}>
          קרדיטים
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {CREDITS.map((credit, idx) => (
            <Pressable
              key={credit.name}
              onPress={credit.url ? () => Linking.openURL(credit.url!) : undefined}
              android_ripple={{ color: colors.border }}
              style={[
                styles.creditRow,
                idx !== CREDITS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.creditContent}>
                <Text style={[styles.creditName, { color: colors.textPrimary }]}>
                  {credit.name}
                </Text>
                <Text style={[styles.creditDescription, { color: colors.textSecondary }]}>
                  {credit.description}
                </Text>
              </View>
              {credit.url && (
                <Text style={[styles.creditLink, { color: colors.accent }]}>
                  ↗
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
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
  appName:  { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  tagline:  { fontSize: 14, marginTop: 4, textAlign: 'center' },
  version:  { fontSize: 12, marginTop: 12 },

  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
    padding: 16,
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 8,
    textAlign: 'right',
  },

  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  creditContent: { flex: 1 },
  creditName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  creditDescription: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  creditLink: {
    fontSize: 18,
    fontWeight: '700',
  },
});

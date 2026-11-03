// app/support.tsx
// "Support the project" — one-time tips via Google Play Billing
// (DECISIONS.md, 2026-11-03). States per the approved Figma frames:
// E2 amount selection, E3 thanks, E4 Google Play unavailable.
// A cancelled purchase returns silently to E2.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, CircleAlert } from 'lucide-react-native';
import { useThemeColors } from '../src/hooks/useThemeColors';
import type { ThemeColors } from '../src/hooks/useThemeColors';
import { radius } from '../src/constants/radius';
import { typography, withFontFamily } from '../src/constants/typography';
import {
  connectSupport,
  disconnectSupport,
  purchaseSupport,
  type SupportProduct,
} from '../src/services/BillingService';

/** Copy per product, in SUPPORT_PRODUCT_IDS order (Figma E2). */
const AMOUNT_COPY: Record<string, { title: string; subtitle: string }> = {
  support_10: { title: 'כוס קפה', subtitle: 'תודה קטנה' },
  support_25: { title: 'ארוחת צהריים', subtitle: 'תמיכה בפיתוח' },
  support_50: { title: 'תמיכה נדיבה', subtitle: 'עוזרת לממן את המשך העבודה' },
};
const DEFAULT_SELECTED = 'support_25';

type Phase =
  | { kind: 'loading' }
  | { kind: 'ready'; products: SupportProduct[]; purchasing: boolean }
  | { kind: 'success' }
  | { kind: 'unavailable' };

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [selected, setSelected] = useState<string>(DEFAULT_SELECTED);

  const connect = useCallback(async () => {
    setPhase({ kind: 'loading' });
    try {
      const products = await connectSupport();
      setSelected((cur) =>
        products.some((p) => p.id === cur) ? cur : products[Math.min(1, products.length - 1)].id,
      );
      setPhase({ kind: 'ready', products, purchasing: false });
    } catch {
      setPhase({ kind: 'unavailable' });
    }
  }, []);

  useEffect(() => {
    void connect();
    return disconnectSupport;
  }, [connect]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const buy = useCallback(async () => {
    if (phase.kind !== 'ready' || phase.purchasing) return;
    const { products } = phase;
    setPhase({ kind: 'ready', products, purchasing: true });
    const outcome = await purchaseSupport(selected);
    if (outcome === 'success') setPhase({ kind: 'success' });
    else if (outcome === 'failed') setPhase({ kind: 'unavailable' });
    else setPhase({ kind: 'ready', products, purchasing: false });
  }, [phase, selected]);

  let body: React.ReactNode;
  let actions: React.ReactNode;
  switch (phase.kind) {
    case 'loading':
    case 'ready': {
      const products = phase.kind === 'ready' ? phase.products : null;
      const price = products?.find((p) => p.id === selected)?.displayPrice;
      body = (
        <AmountBody
          colors={colors}
          products={products}
          selected={selected}
          onSelect={setSelected}
          disabled={phase.kind === 'ready' && phase.purchasing}
        />
      );
      actions = (
        <PrimaryButton
          colors={colors}
          label={price ? `תמיכה ב-${price}` : 'תמיכה'}
          onPress={() => { void buy(); }}
          loading={phase.kind === 'loading' || phase.purchasing}
        />
      );
      break;
    }
    case 'success':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.accentLight}
          icon={<Heart size={32} color={colors.accent} />}
          title="תודה רבה!"
          body="התמיכה שלך עוזרת להמשיך לפתח את לוחות ולשמור אותה חינמית, בלי פרסומות ובלי מעקב."
        />
      );
      actions = <PrimaryButton colors={colors} label="סגירה" onPress={close} />;
      break;
    case 'unavailable':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.errorBg}
          icon={<CircleAlert size={32} color={colors.error} />}
          title="לא ניתן להשלים את התמיכה"
          body="לא חויבת. בדקו שיש חיבור לאינטרנט ושחנות Google Play מותקנת במכשיר, ונסו שוב."
        />
      );
      actions = (
        <>
          <PrimaryButton colors={colors} label="נסו שוב" onPress={() => { void connect(); }} />
          <SecondaryButton colors={colors} label="סגירה" onPress={close} />
        </>
      );
      break;
  }

  const centered = phase.kind === 'success' || phase.kind === 'unavailable';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header: symmetric 3-slot row [close | title | spacer] — direction-neutral,
          so plain 'row' is correct here (CLAUDE.md RTL exception). */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, paddingTop: insets.top + 4 },
        ]}
      >
        <Pressable
          onPress={close}
          hitSlop={12}
          style={styles.headerSlot}
          accessibilityRole="button"
          accessibilityLabel="סגירה"
        >
          <X size={24} color={colors.textPrimary} />
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: colors.textPrimary }]}
          accessibilityRole="header"
          numberOfLines={1}
        >
          תמיכה בפרויקט
        </Text>
        <View style={styles.headerSlot} />
      </View>

      {centered ? (
        <View style={styles.centeredBody}>
          <View style={styles.column}>{body}</View>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>{body}</View>
        </ScrollView>
      )}

      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: 28 + insets.bottom,
          },
        ]}
      >
        <View style={styles.actionColumn}>{actions}</View>
      </View>
    </View>
  );
}

// ─── Amount selection (E2) ────────────────────────────────────────────────────

function AmountBody({
  colors,
  products,
  selected,
  onSelect,
  disabled,
}: {
  colors: ThemeColors;
  /** null while connecting to Play: rows show without prices. */
  products: SupportProduct[] | null;
  selected: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  const rows = products ?? Object.keys(AMOUNT_COPY).map((id) => ({ id, displayPrice: '' }));
  return (
    <View style={styles.content}>
      <View style={[styles.card, styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.heroBadge, { backgroundColor: colors.accentLight }]}>
          <Heart size={24} color={colors.accent} />
        </View>
        <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
          לוחות חינמית, בלי פרסומות ובלי מעקב
        </Text>
        <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
          אם האפליקציה עוזרת לך, אפשר לתמוך בפיתוח שלה בתשלום חד-פעמי. התמיכה לא פותחת תכונות נוספות — הכל נשאר חינמי לכולם.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.accent }]}>בחירת סכום</Text>

      <View
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="radiogroup"
      >
        {rows.map((p, i) => {
          const isSelected = p.id === selected;
          const copy = AMOUNT_COPY[p.id];
          return (
            <Pressable
              key={p.id}
              onPress={() => onSelect(p.id)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              accessibilityLabel={`${copy.title}, ${p.displayPrice}`}
              style={[
                styles.amountRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                isSelected && { backgroundColor: colors.accentLight },
              ]}
            >
              {/* row-reverse: radio (JSX-first) lands on the right, the reading start */}
              <View
                style={[
                  styles.radio,
                  isSelected
                    ? { borderWidth: 6, borderColor: colors.accent }
                    : { borderWidth: 2, borderColor: colors.borderStrong },
                ]}
              />
              <View style={styles.amountLabels}>
                <Text style={[styles.amountTitle, { color: colors.textPrimary }]}>{copy.title}</Text>
                <Text style={[styles.amountSub, { color: colors.textTertiary }]}>{copy.subtitle}</Text>
              </View>
              <Text style={[styles.amountPrice, { color: isSelected ? colors.accent : colors.textPrimary }]}>
                {p.displayPrice}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.footnote, { color: colors.textTertiary }]}>
        התשלום מתבצע דרך Google Play, והמחיר מוצג במטבע המקומי שלך. האפליקציה לא רואה ולא שומרת פרטי תשלום.
      </Text>
    </View>
  );
}

// ─── Centered states (E3, E4) ─────────────────────────────────────────────────

function CenteredState({
  colors,
  badgeBg,
  icon,
  title,
  body,
}: {
  colors: ThemeColors;
  badgeBg: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.centered}>
      <View style={[styles.badgeCircle, { backgroundColor: badgeBg }]}>{icon}</View>
      <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.centerBody, { color: colors.textSecondary }]}>{body}</Text>
    </View>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

function PrimaryButton({
  colors,
  label,
  onPress,
  loading = false,
}: {
  colors: ThemeColors;
  label: string;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={colors.textInverse} />
      ) : (
        <Text style={[styles.primaryText, { color: colors.textInverse }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function SecondaryButton({
  colors,
  label,
  onPress,
}: {
  colors: ThemeColors;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.secondaryBtn, { borderColor: colors.accent }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.secondaryText, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header (symmetric 3-slot, plain 'row' is intentional; no bottom border per Figma)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  headerSlot: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    flex: 1,
    ...withFontFamily(typography.screenTitle),
    textAlign: 'center',
  },

  // Body containers. Tablet: 560 column centered.
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  centeredBody: { flex: 1, justifyContent: 'center' },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center' },

  // Action bar
  actionBar: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  actionColumn: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 8 },
  primaryBtn: {
    height: 48,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { ...withFontFamily(typography.emphasis, '600'), textAlign: 'center' },
  secondaryBtn: {
    height: 50,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { ...withFontFamily(typography.emphasis, '600'), textAlign: 'center' },

  // E2 — Figma: content padding 14 / 16, gap 8
  content: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  card: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  // Hero: padding 20 / 16, gap 10, children right-aligned
  hero: { paddingVertical: 20, paddingHorizontal: 16, gap: 10, alignItems: 'flex-end' },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { ...withFontFamily(typography.emphasis, '700'), textAlign: 'right', alignSelf: 'stretch' },
  heroBody: {
    ...withFontFamily(typography.label, '400'),
    lineHeight: 21,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  sectionLabel: { ...withFontFamily(typography.captionBold), textAlign: 'right' },
  // Amount row: padding 12 / 14, gap 12, 20 px radio
  amountRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 60,
  },
  radio: { width: 20, height: 20, borderRadius: radius.full },
  amountLabels: { flex: 1, gap: 2 },
  amountTitle: { ...withFontFamily(typography.bodyMedium, '600'), textAlign: 'right' },
  amountSub: { ...withFontFamily(typography.subtitle, '400'), textAlign: 'right' },
  amountPrice: { ...withFontFamily(typography.sheetTitle) },
  footnote: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 18, textAlign: 'right' },

  // E3 / E4 — badge 72, then 4 extra px before the title
  centered: { paddingHorizontal: 32, gap: 12, alignItems: 'center' },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  centerTitle: { ...withFontFamily(typography.displayMedium), textAlign: 'center' },
  centerBody: { ...withFontFamily(typography.bodyMedium, '400'), textAlign: 'center' },
});

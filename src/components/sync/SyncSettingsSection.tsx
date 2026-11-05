// src/components/sync/SyncSettingsSection.tsx
// Settings › "יומן גוגל" — the device calendar sync section (Phase 3),
// Figma page `05 · Sync & Import`, frames B1–B6 (38:3 … 38:405), approved
// 2026-11-03.
//
//   B1 sync off (default) ............ toggle card + caption
//   B2 system permission dialog ...... Android's own dialog (not drawn here)
//   B3 sync on ....................... calendars to show (multi) + calendar to
//                                      write to (single) + holidays note
//   B4 permission denied ............. warning banner, "לנסות שוב"
//   B5 permanently blocked ........... error banner, "פתיחת הגדרות המערכת"
//   B6 no Google calendar ............ warning banner instead of the write list
//
// The calendar permission is requested ONLY from the switch / retry button
// here — never on launch (a fresh install shows no calendar prompt).
// Every row is RTL `row-reverse` with JSX in natural reading order.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet, AppState, Linking } from 'react-native';
import {
  RefreshCw, User, Smartphone, Check, Info, CircleAlert, Lock, ExternalLink,
} from 'lucide-react-native';
import { useSettingsStore } from '../../providers/SettingsProvider';
import {
  getPermissionState,
  requestPermission,
  listDeviceCalendars,
  writableGoogleCalendars,
  defaultSelection,
  type DeviceCalendarInfo,
} from '../../services/DeviceCalendarService';
import { pushExisting } from '../../services/DeviceSyncService';
import { SectionLabel } from '../ui/SectionLabel';
import { radius } from '../../constants/radius';
import { typography, withFontFamily } from '../../constants/typography';
import type { ThemeColors } from '../../hooks/useThemeColors';

type PermIssue = 'denied' | 'blocked' | null;

const DEVICE_GROUP = 'יומני המכשיר (לא מסונכרנים לגוגל)';

export function SyncSettingsSection({ colors }: { colors: ThemeColors }) {
  const {
    syncEnabled, syncShownCalendarIds, syncWriteCalendarId,
    setSyncEnabled, setSyncShownCalendarIds, setSyncWriteCalendarId,
  } = useSettingsStore();
  const [permIssue, setPermIssue] = useState<PermIssue>(null);
  const [calendars, setCalendars] = useState<DeviceCalendarInfo[] | null>(null);

  const loadCalendars = useCallback(async (): Promise<DeviceCalendarInfo[]> => {
    try {
      const cals = await listDeviceCalendars();
      setCalendars(cals);
      return cals;
    } catch {
      setCalendars([]);
      return [];
    }
  }, []);

  /** Fills in first-time defaults and drops a write calendar that no longer exists. */
  const applyDefaults = useCallback((cals: DeviceCalendarInfo[]) => {
    const s = useSettingsStore.getState();
    const defaults = defaultSelection(cals);
    if (s.syncShownCalendarIds === null) setSyncShownCalendarIds(defaults.shown);
    const writable = writableGoogleCalendars(cals);
    if (!s.syncWriteCalendarId || !writable.some((c) => c.id === s.syncWriteCalendarId)) {
      setSyncWriteCalendarId(defaults.write);
    }
  }, [setSyncShownCalendarIds, setSyncWriteCalendarId]);

  const enable = useCallback(async () => {
    let state = await getPermissionState();
    if (state !== 'granted' && state !== 'blocked') state = await requestPermission();
    if (state !== 'granted') {
      setPermIssue(state === 'blocked' ? 'blocked' : 'denied');
      return;
    }
    setPermIssue(null);
    applyDefaults(await loadCalendars());
    setSyncEnabled(true);
    // Existing events that have not passed yet go to Google too (Shlomo, 2026-11-03).
    void pushExisting();
  }, [applyDefaults, loadCalendars, setSyncEnabled]);

  const onToggle = useCallback((v: boolean) => {
    if (v) {
      void enable();
    } else {
      setSyncEnabled(false);
      setPermIssue(null);
    }
  }, [enable, setSyncEnabled]);

  // On open and whenever the app returns to the foreground (the user may have
  // changed the permission or added an account in system settings): re-check.
  // A revoked permission turns sync off, so nothing is read or written.
  useEffect(() => {
    let alive = true;
    const check = async () => {
      const state = await getPermissionState();
      if (!alive) return;
      const s = useSettingsStore.getState();
      if (state === 'granted') {
        if (s.syncEnabled) {
          applyDefaults(await loadCalendars());
        } else if (permIssue === 'blocked') {
          // Came back from system settings with access granted.
          await enable();
        }
      } else if (s.syncEnabled) {
        setSyncEnabled(false);
        setPermIssue(state === 'blocked' ? 'blocked' : 'denied');
      }
    };
    void check();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') void check(); });
    return () => { alive = false; sub.remove(); };
  }, [permIssue, applyDefaults, loadCalendars, enable, setSyncEnabled]);

  const shown = useMemo(() => new Set(syncShownCalendarIds ?? []), [syncShownCalendarIds]);
  const writable = useMemo(() => writableGoogleCalendars(calendars ?? []), [calendars]);

  // "יומנים להצגה" groups: one per Google account, then the device-only calendars.
  const groups = useMemo(() => {
    const byAccount = new Map<string, DeviceCalendarInfo[]>();
    const device: DeviceCalendarInfo[] = [];
    for (const c of calendars ?? []) {
      if (c.isGoogle) {
        const list = byAccount.get(c.accountName) ?? [];
        list.push(c);
        byAccount.set(c.accountName, list);
      } else {
        device.push(c);
      }
    }
    const out: Array<{ title: string; google: boolean; items: DeviceCalendarInfo[] }> = [];
    for (const [title, items] of byAccount) out.push({ title, google: true, items });
    if (device.length > 0) out.push({ title: DEVICE_GROUP, google: false, items: device });
    return out;
  }, [calendars]);

  const toggleShown = (id: string) => {
    const next = new Set(shown);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSyncShownCalendarIds([...next]);
  };

  const openAccounts = () => {
    Linking.sendIntent('android.settings.SYNC_SETTINGS').catch(() => { void Linking.openSettings(); });
  };

  return (
    <>
      <SectionLabel title="יומן גוגל" colors={colors} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Pressable
          onPress={() => onToggle(!syncEnabled)}
          android_ripple={{ color: colors.border }}
          style={styles.row}
          accessibilityRole="switch"
          accessibilityState={{ checked: syncEnabled }}
          accessibilityLabel="סנכרון עם יומן גוגל"
        >
          <RefreshCw size={20} color={colors.textSecondary} />
          <View style={styles.labels}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>סנכרון עם יומן גוגל</Text>
            <Text style={[styles.sub, { color: colors.textTertiary }]}>
              הצגת האירועים מגוגל כאן, ושמירת האירועים שלך בגוגל
            </Text>
          </View>
          <Switch
            value={syncEnabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.borderStrong, true: colors.accent }}
            thumbColor={colors.switchThumb}
          />
        </Pressable>
      </View>

      {!syncEnabled && permIssue === null && (
        <Caption colors={colors} gapAbove={8}>
          הסנכרון עובר דרך אפליקציית יומן גוגל שבמכשיר: אין חשבון ואין שרת של לוחות. בהפעלה תתבקש הרשאת גישה ליומן.
        </Caption>
      )}

      {!syncEnabled && permIssue === 'denied' && (
        <Banner
          kind="warning"
          colors={colors}
          title="לא ניתנה גישה ליומן"
          body="בלי הרשאה, לוחות לא יכולה להציג את האירועים מגוגל או לשמור בו את האירועים שלך. שום דבר לא השתנה."
          action={{ label: 'לנסות שוב', onPress: () => { void enable(); } }}
        />
      )}

      {!syncEnabled && permIssue === 'blocked' && (
        <Banner
          kind="error"
          colors={colors}
          title="הגישה ליומן חסומה"
          body="ההרשאה נחסמה בהגדרות המכשיר. כדי להפעיל סנכרון, פתח את הגדרות האפליקציה ואפשר גישה ליומן."
          action={{ label: 'פתיחת הגדרות המערכת', external: true, onPress: () => { void Linking.openSettings(); } }}
        />
      )}

      {syncEnabled && calendars !== null && (
        <>
          <SectionLabel title="יומנים להצגה" colors={colors} />
          <Caption colors={colors} gapBelow={8}>
            אירועים מהיומנים שנבחרו מוצגים בלוח ונערכים ביומן גוגל. הם לא מועתקים ללוחות.
          </Caption>
          {groups.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {groups.map((g, gi) => (
                <React.Fragment key={`${g.google ? 'g' : 'd'}:${g.title}`}>
                  <View
                    style={[
                      styles.groupHeader,
                      { backgroundColor: colors.surfaceElevated },
                      gi > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
                    ]}
                  >
                    {g.google
                      ? <User size={16} color={colors.textTertiary} />
                      : <Smartphone size={16} color={colors.textTertiary} />}
                    <Text style={[styles.groupTitle, { color: colors.textTertiary }]} numberOfLines={1}>
                      {g.title}
                    </Text>
                  </View>
                  {g.items.map((c) => {
                    const on = shown.has(c.id);
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => toggleShown(c.id)}
                        android_ripple={{ color: colors.border }}
                        style={[styles.row, styles.divided, { borderTopColor: colors.borderSubtle }]}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={c.title}
                      >
                        <ColorDot color={c.color} />
                        <View style={styles.labels}>
                          <Text style={[styles.label, { color: colors.textPrimary }]}>{c.title}</Text>
                          {c.isHoliday && (
                            <Text style={[styles.sub, { color: colors.textTertiary }]}>החגים כבר מוצגים בלוחות</Text>
                          )}
                        </View>
                        {on ? (
                          <View style={[styles.checkboxOn, { backgroundColor: colors.accent }]}>
                            <Check size={16} color={colors.textInverse} />
                          </View>
                        ) : (
                          <View style={[styles.checkboxOff, { borderColor: colors.borderStrong }]} />
                        )}
                      </Pressable>
                    );
                  })}
                </React.Fragment>
              ))}
            </View>
          )}

          <SectionLabel title="האירועים שלי נשמרים ביומן" colors={colors} />
          {writable.length > 0 ? (
            <>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {writable.map((c, i) => {
                  const on = syncWriteCalendarId === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSyncWriteCalendarId(c.id)}
                      android_ripple={{ color: colors.border }}
                      style={[styles.row, i > 0 && [styles.divided, { borderTopColor: colors.borderSubtle }]]}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${c.title}, ${c.accountName}`}
                    >
                      <ColorDot color={c.color} />
                      <View style={styles.labels}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>{c.title}</Text>
                        <Text style={[styles.sub, { color: colors.textTertiary }]}>{c.accountName}</Text>
                      </View>
                      {on ? (
                        <View style={[styles.radioOn, { borderColor: colors.accent }]}>
                          <View style={[styles.radioDot, { backgroundColor: colors.accent }]} />
                        </View>
                      ) : (
                        <View style={[styles.radioOff, { borderColor: colors.borderStrong }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
              <Caption colors={colors} gapAbove={8}>
                כל אירוע שתיצור, תערוך או תמחק כאן יתעדכן ביומן הזה. אירוע לפי תאריך עברי נשמר 10 שנים קדימה.
              </Caption>
            </>
          ) : (
            <Banner
              kind="warning"
              colors={colors}
              gapAbove={0}
              title="לא נמצא יומן גוגל במכשיר"
              body="כדי לשמור את האירועים שלך בגוגל, הוסף חשבון גוגל בהגדרות המכשיר והפעל בו סנכרון יומן. עד אז האירועים שלך נשארים רק בלוחות."
              action={{ label: 'פתיחת הגדרות החשבונות', external: true, onPress: openAccounts }}
            />
          )}

          <Banner
            kind="info"
            colors={colors}
            title="חגים, שבתות וזמנים לא נשמרים בגוגל"
            body="רק האירועים האישיים שלך נשמרים ביומן גוגל. לוח החגים של לוחות נשאר כאן בלבד."
          />
        </>
      )}
    </>
  );
}

// ── Pieces ────────────────────────────────────────────────────────────────────

/** Calendar color from the device (data, not a design token), 12 px dot. */
function ColorDot({ color }: { color?: string }) {
  return <View style={[styles.dot, { backgroundColor: color ?? 'transparent' }]} />;
}

/** Figma: 12 Regular / 18, textTertiary, outside the cards. */
function Caption({
  children, colors, gapAbove = 0, gapBelow = 0,
}: {
  children: string;
  colors: ThemeColors;
  gapAbove?: number;
  gapBelow?: number;
}) {
  return (
    <Text style={[styles.caption, { color: colors.textTertiary, paddingTop: gapAbove, paddingBottom: gapBelow }]}>
      {children}
    </Text>
  );
}

/** Figma `banner/info` · `banner/warning` · `banner/error`: r14, padding 14, gap 10. */
function Banner({
  kind, colors, title, body, action, gapAbove = 8,
}: {
  kind: 'info' | 'warning' | 'error';
  colors: ThemeColors;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void; external?: boolean };
  gapAbove?: number;
}) {
  const bg = kind === 'info' ? colors.accentLight : kind === 'warning' ? colors.warningBg : colors.errorBg;
  const Icon = kind === 'info' ? Info : kind === 'warning' ? CircleAlert : Lock;
  const iconColor = kind === 'info' ? colors.accent : kind === 'warning' ? colors.warning : colors.error;
  return (
    <View style={[styles.banner, { backgroundColor: bg, marginTop: gapAbove }]}>
      <View style={styles.bannerRow}>
        <Icon size={20} color={iconColor} />
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.bannerBody, { color: colors.textSecondary }]}>{body}</Text>
        </View>
      </View>
      {action && (
        <Pressable
          onPress={action.onPress}
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[styles.buttonText, { color: colors.accent }]}>{action.label}</Text>
          {action.external && <ExternalLink size={18} color={colors.accent} />}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Same shell as <Card>: 1 px border, r14, 16 inset. Drawn here because the
  // rows divide with a TOP stroke (Figma border-t) instead of Card's isLast.
  card: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // Figma: padding 13 / 14, gap 10.
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
    minHeight: 48,
  },
  divided: { borderTopWidth: 1 },
  labels: { flex: 1, gap: 2 },
  label: { ...withFontFamily(typography.bodyMedium, '400'), textAlign: 'right' },
  sub: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },
  // Figma `account/…`: surfaceElevated, padding 10 / 6 / 14, 12 Medium.
  groupHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 14,
  },
  groupTitle: { flex: 1, ...withFontFamily(typography.subtitle, '500'), lineHeight: 18, textAlign: 'right' },
  dot: { width: 12, height: 12, borderRadius: radius.full },
  checkboxOn: {
    width: 22, height: 22, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOff: { width: 22, height: 22, borderRadius: radius.sm, borderWidth: 1.5 },
  // Figma `radio/on`: 2 px accent ring (22 outer) + 10 px dot.
  radioOn: {
    width: 22, height: 22, borderRadius: radius.full, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: radius.full },
  radioOff: { width: 22, height: 22, borderRadius: radius.full, borderWidth: 1.5 },
  caption: {
    ...withFontFamily(typography.subtitle, '400'),
    lineHeight: 18,
    textAlign: 'right',
    paddingHorizontal: 16,
  },
  banner: {
    marginHorizontal: 16,
    borderRadius: radius.card,
    padding: 14,
    gap: 10,
  },
  bannerRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10 },
  bannerText: { flex: 1, gap: 3 },
  bannerTitle: { ...withFontFamily(typography.bodyMedium, '600'), textAlign: 'right' },
  bannerBody: { ...withFontFamily(typography.bodySmall, '400'), lineHeight: 19, textAlign: 'right' },
  // Figma `btn/secondary`: surface, 1 px accent, r8, padding 8 / 16, gap 8,
  // 16 SemiBold; sits at the reading-start (right) edge of the banner.
  button: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 42,
  },
  buttonText: { ...withFontFamily(typography.emphasis, '600'), lineHeight: 24, textAlign: 'center' },
});

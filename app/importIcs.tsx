// app/importIcs.tsx
// .ics import (Phase 2). Six states per the approved Figma frames
// (A1 preview, A2 parsing, A3 empty, A4 all duplicates, A5 invalid, A6 success).
// Opened from Settings (no `uri` -> system file picker) or from another app
// via a VIEW intent (`uri` param, see app/+native-intent.tsx).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import {
  X,
  Calendar,
  Repeat,
  Copy,
  File as FileIcon,
  FileX,
  CheckCircle,
  Loader,
} from 'lucide-react-native';
import { useThemeColors } from '../src/hooks/useThemeColors';
import type { ThemeColors } from '../src/hooks/useThemeColors';
import { useCalendarStore } from '../src/providers/CalendarProvider';
import { radius } from '../src/constants/radius';
import { typography, withFontFamily } from '../src/constants/typography';
import {
  readIcsFile,
  analyzeIcs,
  importIcs,
  type IcsAnalysis,
  type IcsImportResult,
} from '../src/services/IcsImportService';
import {
  formatEventMeta,
  formatFileSizeLine,
  formatGregorianDateColumn,
  formatGregorianRange,
  formatHebrewDateColumn,
  formatHebrewRange,
  importButtonLabel,
  importedTitle,
  skippedLine,
  allDuplicatesBody,
  fileNameFromUri,
} from '../src/components/import/importFormat';

type ReadyAnalysis = Extract<IcsAnalysis, { kind: 'ready' }>;

type Phase =
  | { kind: 'parsing' }
  | { kind: 'ready'; analysis: ReadyAnalysis; importing: boolean }
  | { kind: 'empty' }
  | { kind: 'allDuplicates'; total: number }
  | { kind: 'invalid' }
  | { kind: 'success'; result: IcsImportResult };

interface PickedFile {
  uri: string;
  name: string;
  sizeBytes?: number;
}

const PICKER_TYPES = ['text/calendar', 'application/octet-stream', '*/*'];
const PREVIEW_COUNT = 4;

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** The picker copies the file into the app cache; once read into memory the
 *  copy is not needed, so calendar data does not linger at rest. Only files
 *  inside our own cache directory are ever deleted. */
function discardCachedCopy(uri: string): void {
  try {
    if (!uri.startsWith(Paths.cache.uri)) return;
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // best effort: the OS evicts cache files anyway
  }
}

function safeFileSize(uri: string): number | undefined {
  try {
    const s = new File(uri).size;
    return typeof s === 'number' ? s : undefined;
  } catch {
    return undefined;
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ImportIcsScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ uri?: string; name?: string; size?: string }>();

  const [file, setFile] = useState<PickedFile | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'parsing' });

  const mountedRef = useRef(true);
  // Incremented on every file pick; a stale analysis (older token) is ignored.
  const loadTokenRef = useRef(0);
  const hasFileRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Hardware back = close.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const loadFile = useCallback(async (picked: PickedFile) => {
    const token = ++loadTokenRef.current;
    hasFileRef.current = true;
    setFile(picked);
    setPhase({ kind: 'parsing' });
    try {
      const text = await readIcsFile(picked.uri);
      discardCachedCopy(picked.uri);
      const analysis = await analyzeIcs(text);
      if (!mountedRef.current || token !== loadTokenRef.current) return;
      if (analysis.kind === 'invalid') setPhase({ kind: 'invalid' });
      else if (analysis.kind === 'empty') setPhase({ kind: 'empty' });
      else if (analysis.toImport.length === 0) {
        setPhase({ kind: 'allDuplicates', total: analysis.total });
      } else setPhase({ kind: 'ready', analysis, importing: false });
    } catch {
      if (!mountedRef.current || token !== loadTokenRef.current) return;
      setPhase({ kind: 'invalid' });
    }
  }, []);

  const pickFile = useCallback(async () => {
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: PICKER_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch {
      if (!mountedRef.current) return;
      if (hasFileRef.current) setPhase({ kind: 'invalid' });
      else close();
      return;
    }
    if (!mountedRef.current) return;
    if (result.canceled || result.assets.length === 0) {
      // Cancelling the very first pick closes the screen; later picks keep the current state.
      if (!hasFileRef.current) close();
      return;
    }
    const asset = result.assets[0];
    void loadFile({
      uri: asset.uri,
      name: asset.name,
      sizeBytes: asset.size ?? safeFileSize(asset.uri),
    });
  }, [close, loadFile]);

  // Initial entry: a `uri` param (VIEW intent) loads it; otherwise open the picker.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const uri = firstParam(params.uri);
    if (uri) {
      const sizeParam = Number(firstParam(params.size));
      void loadFile({
        uri,
        name: firstParam(params.name) ?? fileNameFromUri(uri),
        sizeBytes: Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : safeFileSize(uri),
      });
    } else {
      void pickFile();
    }
  }, [params.uri, params.name, params.size, loadFile, pickFile]);

  const runImport = useCallback(async () => {
    if (phase.kind !== 'ready' || phase.importing) return;
    const analysis = phase.analysis;
    const token = loadTokenRef.current;
    setPhase({ kind: 'ready', analysis, importing: true });
    try {
      const result = await importIcs(analysis);
      if (!mountedRef.current || token !== loadTokenRef.current) return;
      setPhase({ kind: 'success', result });
    } catch {
      if (!mountedRef.current || token !== loadTokenRef.current) return;
      setPhase({ kind: 'ready', analysis, importing: false });
      Alert.alert('הייבוא נכשל', 'לא ניתן היה לשמור את האירועים. נסו שוב.');
    }
  }, [phase]);

  const showInCalendar = useCallback((firstDate: string | undefined) => {
    if (!firstDate) { close(); return; }
    const y = Number(firstDate.slice(0, 4));
    const m = Number(firstDate.slice(5, 7));
    const d = Number(firstDate.slice(8, 10));
    const store = useCalendarStore.getState();
    store.navigateToMonth(y, m);
    store.setSelectedDate(new Date(y, m - 1, d));
    router.replace('/(tabs)/gregorian');
  }, [close, router]);

  const name = file?.name ?? '';

  // ── Body + actions per state ──
  let body: React.ReactNode;
  let actions: React.ReactNode;

  switch (phase.kind) {
    case 'parsing':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.accentLight}
          icon={<SpinningLoader color={colors.accent} />}
          title="קורא את הקובץ"
          body={name || undefined}
          bodyIsFileName
        />
      );
      actions = <SecondaryButton colors={colors} label="ביטול" onPress={close} />;
      break;
    case 'ready':
      body = <PreviewBody colors={colors} file={file} analysis={phase.analysis} />;
      actions = (
        <>
          <PrimaryButton
            colors={colors}
            label={importButtonLabel(phase.analysis.toImport.length)}
            onPress={() => { void runImport(); }}
            loading={phase.importing}
          />
          <SecondaryButton colors={colors} label="ביטול" onPress={close} disabled={phase.importing} />
        </>
      );
      break;
    case 'empty':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.surfaceElevated}
          icon={<FileIcon size={32} color={colors.textTertiary} />}
          title="אין אירועים בקובץ"
          body="הקובץ תקין, אבל אין בו אירועים לייבוא."
          fileName={name}
        />
      );
      actions = (
        <>
          <PrimaryButton colors={colors} label="בחירת קובץ אחר" onPress={() => { void pickFile(); }} />
          <SecondaryButton colors={colors} label="סגירה" onPress={close} />
        </>
      );
      break;
    case 'allDuplicates':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.accentLight}
          icon={<Copy size={32} color={colors.accent} />}
          title={phase.total === 1 ? 'האירוע כבר קיים' : 'כל האירועים כבר קיימים'}
          body={allDuplicatesBody(phase.total)}
          fileName={name}
        />
      );
      actions = <PrimaryButton colors={colors} label="סגירה" onPress={close} />;
      break;
    case 'invalid':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.errorBg}
          icon={<FileX size={32} color={colors.error} />}
          title="לא ניתן לקרוא את הקובץ"
          body="זה לא קובץ יומן תקין, או שהקובץ פגום."
          fileName={name}
          hint="אפשר לייצא שוב את היומן מהאפליקציה שממנה הגיע ולנסות שוב."
        />
      );
      actions = (
        <>
          <PrimaryButton colors={colors} label="בחירת קובץ אחר" onPress={() => { void pickFile(); }} />
          <SecondaryButton colors={colors} label="סגירה" onPress={close} />
        </>
      );
      break;
    case 'success':
      body = (
        <CenteredState
          colors={colors}
          badgeBg={colors.successBg}
          icon={<CheckCircle size={32} color={colors.success} />}
          title={importedTitle(phase.result.imported)}
          body={phase.result.skipped > 0 ? skippedLine(phase.result.skipped) : undefined}
        />
      );
      actions = (
        <>
          <PrimaryButton
            colors={colors}
            label="הצגה בלוח"
            onPress={() => showInCalendar(phase.result.firstImportedDate)}
          />
          <SecondaryButton colors={colors} label="סגירה" onPress={close} />
        </>
      );
      break;
  }

  const centered = phase.kind !== 'ready';

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
          ייבוא אירועים
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

// ─── Preview (A1) ─────────────────────────────────────────────────────────────

function PreviewBody({
  colors,
  file,
  analysis,
}: {
  colors: ThemeColors;
  file: PickedFile | null;
  analysis: ReadyAnalysis;
}) {
  const dupCount = analysis.duplicates.length;
  const preview = analysis.items.slice(0, PREVIEW_COUNT);
  const more = analysis.total - PREVIEW_COUNT;

  return (
    <View style={styles.previewContent}>
      {/* File card */}
      <View style={[styles.card, styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.fileIcon, { backgroundColor: colors.accentLight }]}>
          <Calendar size={20} color={colors.accent} />
        </View>
        <View style={styles.fileLabels}>
          <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>
            {file?.name ?? ''}
          </Text>
          <Text style={[styles.fileMeta, { color: colors.textTertiary }]}>
            {formatFileSizeLine(file?.sizeBytes)}
          </Text>
        </View>
      </View>

      {/* Summary card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <SummaryRow
          colors={colors}
          Icon={Calendar}
          label="אירועים בקובץ"
          value={String(analysis.total)}
        />
        <SummaryRow
          colors={colors}
          Icon={Repeat}
          label="טווח תאריכים"
          sub={formatHebrewRange(analysis.rangeStart, analysis.rangeEnd)}
          value={formatGregorianRange(analysis.rangeStart, analysis.rangeEnd)}
          divider
        />
        {dupCount > 0 && (
          <SummaryRow
            colors={colors}
            Icon={Copy}
            label="כבר קיימים ביומן"
            sub="יידלגו — זוהו לפי מזהה האירוע"
            value={String(dupCount)}
            divider
          />
        )}
      </View>

      <Text style={[styles.sectionLabel, { color: colors.accent }]}>תצוגה מקדימה</Text>

      {/* Preview card */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {preview.map(({ event, duplicate }, i) => {
          const tint = duplicate ? colors.textTertiary : colors.textPrimary;
          return (
            <View
              key={`${event.uid ?? 'x'}-${event.recurrenceId ?? ''}-${i}`}
              style={[
                styles.previewRow,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.dateColumn}>
                <Text style={[styles.dateHebrew, { color: tint }]}>
                  {formatHebrewDateColumn(event.startDate, event.endDate)}
                </Text>
                <Text style={[styles.dateGregorian, { color: colors.textTertiary }]}>
                  {formatGregorianDateColumn(event.startDate, event.endDate)}
                </Text>
              </View>
              <View style={styles.eventText}>
                <Text style={[styles.eventTitle, { color: tint }]} numberOfLines={1}>
                  {event.summary}
                </Text>
                <Text style={[styles.eventMeta, { color: colors.textTertiary }]} numberOfLines={1}>
                  {formatEventMeta(event)}
                </Text>
              </View>
              {duplicate && (
                <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
                  <Text style={[styles.badgeText, { color: colors.textTertiary }]}>קיים · יידלג</Text>
                </View>
              )}
            </View>
          );
        })}
        {more > 0 && (
          <View style={[styles.moreRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle }]}>
            <Text style={[styles.moreText, { color: colors.textTertiary }]}>
              {`ועוד ${more} אירועים`}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.footnote, { color: colors.textTertiary }]}>
        האירועים יישמרו כאירועים אישיים ביומן שלך.
      </Text>
    </View>
  );
}

function SummaryRow({
  colors,
  Icon,
  label,
  sub,
  value,
  divider = false,
}: {
  colors: ThemeColors;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  sub?: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        divider && { borderTopWidth: 1, borderTopColor: colors.borderSubtle },
      ]}
    >
      <Icon size={20} color={colors.textSecondary} />
      <View style={styles.summaryLabels}>
        <Text style={[styles.summaryLabel, { color: colors.textPrimary }]}>{label}</Text>
        {sub !== undefined && (
          <Text style={[styles.summarySub, { color: colors.textTertiary }]}>{sub}</Text>
        )}
      </View>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

// ─── Centered states (A2-A6) ──────────────────────────────────────────────────

function CenteredState({
  colors,
  badgeBg,
  icon,
  title,
  body,
  bodyIsFileName = false,
  fileName,
  hint,
}: {
  colors: ThemeColors;
  badgeBg: string;
  icon: React.ReactNode;
  title: string;
  body?: string;
  /** A2: the file name uses the body style (15 Regular textSecondary). */
  bodyIsFileName?: boolean;
  fileName?: string;
  hint?: string;
}) {
  return (
    <View style={styles.centered}>
      <View style={[styles.badgeCircle, { backgroundColor: badgeBg }]}>{icon}</View>
      <Text style={[styles.centerTitle, { color: colors.textPrimary }]}>{title}</Text>
      {body ? (
        <Text
          style={[styles.centerBody, { color: colors.textSecondary }]}
          numberOfLines={bodyIsFileName ? 1 : undefined}
        >
          {body}
        </Text>
      ) : null}
      {fileName ? (
        <Text style={[styles.centerFileName, { color: colors.textTertiary }]} numberOfLines={1}>
          {fileName}
        </Text>
      ) : null}
      {hint ? <Text style={[styles.centerHint, { color: colors.textTertiary }]}>{hint}</Text> : null}
    </View>
  );
}

function SpinningLoader({ color }: { color: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader size={32} color={color} />
    </Animated.View>
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
  disabled = false,
}: {
  colors: ThemeColors;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondaryBtn, { borderColor: colors.accent }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
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

  // A1
  previewContent: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  card: { borderRadius: radius.card, borderWidth: 1, overflow: 'hidden' },
  fileCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileLabels: { flex: 1, gap: 2 },
  fileName: { ...withFontFamily(typography.bodyMedium, '600'), textAlign: 'right' },
  fileMeta: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },

  summaryRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  summaryLabels: { flex: 1, gap: 2 },
  summaryLabel: { ...withFontFamily(typography.bodyMedium, '400'), textAlign: 'right' },
  summarySub: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 17, textAlign: 'right' },
  summaryValue: { ...withFontFamily(typography.label, '500') },

  sectionLabel: { ...withFontFamily(typography.captionBold), textAlign: 'right' },

  previewRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  dateColumn: { width: 78, gap: 1 },
  dateHebrew: { ...withFontFamily(typography.bodySmall, '700'), textAlign: 'right' },
  dateGregorian: { ...withFontFamily(typography.caption, '400'), textAlign: 'right' },
  eventText: { flex: 1, gap: 1 },
  eventTitle: { ...withFontFamily(typography.bodyMedium, '600'), textAlign: 'right' },
  eventMeta: { ...withFontFamily(typography.subtitle, '400'), textAlign: 'right' },
  badge: { borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { ...withFontFamily(typography.caption, '500') },
  moreRow: { paddingVertical: 11, alignItems: 'center' },
  moreText: { ...withFontFamily(typography.bodySmall, '500'), textAlign: 'center' },
  footnote: { ...withFontFamily(typography.subtitle, '400'), lineHeight: 18, textAlign: 'right' },

  // A2-A6
  centered: { paddingHorizontal: 32, gap: 12, alignItems: 'center' },
  badgeCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitle: { ...withFontFamily(typography.displaySmall, '700'), textAlign: 'center' },
  centerBody: { ...withFontFamily(typography.bodyMedium, '400'), textAlign: 'center' },
  centerFileName: { ...withFontFamily(typography.bodySmall, '500'), textAlign: 'center' },
  centerHint: { ...withFontFamily(typography.bodySmall, '400'), lineHeight: 19, textAlign: 'center' },
});

// src/services/IcsImportService.ts
// Orchestrates .ics import: read the file, parse it, classify duplicates against
// SQLite, and write the new events. The pure parsing/mapping lives in IcsParser.ts.
// Offline-only: the file is picked/opened locally; nothing leaves the device.
// Event contents are never logged.

import { File } from 'expo-file-system';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy';
import { StorageService } from './StorageService';
import { useCalendarStore } from '../providers/CalendarProvider';
import { generateUUID } from '../utils/dateUtils';
import {
  parseIcs,
  classifyDuplicates,
  toCalendarEvent,
  sourceKeyOf,
  luchotEventIdOf,
  type ParsedIcsEvent,
} from './IcsParser';

export const MAX_ICS_BYTES = 5 * 1024 * 1024; // 5 MB

export type IcsReadErrorCode = 'too_large' | 'unreadable';

/** Thrown by readIcsFile; the UI maps both codes to the "invalid file" state. */
export class IcsReadError extends Error {
  readonly code: IcsReadErrorCode;
  constructor(code: IcsReadErrorCode) {
    super(code);
    this.name = 'IcsReadError';
    this.code = code;
  }
}

export interface IcsPreviewItem {
  event: ParsedIcsEvent;
  duplicate: boolean;
}

export type IcsAnalysis =
  | { kind: 'invalid' }
  | { kind: 'empty' }
  | {
      kind: 'ready';
      /** All usable (non-cancelled) events, duplicates included. */
      total: number;
      toImport: ParsedIcsEvent[];
      duplicates: ParsedIcsEvent[];
      /** YYYY-MM-DD over all events (min start / max end). */
      rangeStart: string;
      rangeEnd: string;
      /** Sorted by startDate (stable), duplicates included and flagged. */
      items: IcsPreviewItem[];
      /** True when the file had more than MAX_VEVENTS events and the rest were ignored. */
      truncated: boolean;
    };

export interface IcsImportResult {
  imported: number;
  skipped: number;
  /** startDate of the earliest imported event (for "show in calendar"), if any. */
  firstImportedDate?: string;
}

/**
 * Reads the picked file as UTF-8 text. Rejects > 5 MB with IcsReadError('too_large')
 * before reading it, and an unknown size with IcsReadError('unreadable').
 * Tries the new File API first; content:// URIs from VIEW intents can fail there,
 * so it falls back to the legacy reader.
 */
export async function readIcsFile(uri: string): Promise<string> {
  // Size BEFORE reading, so an oversized file is never pulled into memory.
  // File.size comes from OpenableColumns.SIZE for content:// (may be missing);
  // the legacy getInfoAsync then asks the stream itself (available()), without reading it.
  let size: number | undefined;
  try {
    const s = new File(uri).size;
    if (typeof s === 'number' && s > 0) size = s;
  } catch {
    // fall through to the legacy probe
  }
  if (size === undefined) {
    try {
      const info = await getInfoAsync(uri);
      if (info.exists && typeof info.size === 'number') size = info.size;
    } catch {
      throw new IcsReadError('unreadable');
    }
  }
  if (size === undefined) throw new IcsReadError('unreadable');
  if (size > MAX_ICS_BYTES) throw new IcsReadError('too_large');

  let text: string | undefined;
  try {
    text = await new File(uri).text();
  } catch (e) {
    if (e instanceof IcsReadError) throw e;
    try {
      text = await readAsStringAsync(uri);
    } catch {
      throw new IcsReadError('unreadable');
    }
  }
  // Second guard on the decoded text (a provider may under-report its size).
  if (text.length > MAX_ICS_BYTES) throw new IcsReadError('too_large');
  return text;
}

/** Parses the text and checks duplicates with two batched SQLite lookups. */
export async function analyzeIcs(text: string): Promise<IcsAnalysis> {
  const parsed = parseIcs(text);
  if (!parsed.ok) return { kind: 'invalid' };
  if (parsed.events.length === 0) return { kind: 'empty' };

  const keys: string[] = [];
  const luchotIds: string[] = [];
  for (const ev of parsed.events) {
    const k = sourceKeyOf(ev);
    if (k) keys.push(k);
    const id = luchotEventIdOf(ev);
    if (id) luchotIds.push(id);
  }
  const [importedKeys, existingIds] = await Promise.all([
    StorageService.getImportedEventKeys(keys),
    StorageService.getExistingEventIds(luchotIds),
  ]);

  const { items, toImport, duplicates } = classifyDuplicates(parsed.events, importedKeys, existingIds);
  const sorted = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) =>
      a.item.event.startDate < b.item.event.startDate ? -1
        : a.item.event.startDate > b.item.event.startDate ? 1
        : a.index - b.index,
    )
    .map((x) => x.item);

  let rangeStart = parsed.events[0].startDate;
  let rangeEnd = parsed.events[0].endDate;
  for (const ev of parsed.events) {
    if (ev.startDate < rangeStart) rangeStart = ev.startDate;
    if (ev.endDate > rangeEnd) rangeEnd = ev.endDate;
  }

  return {
    kind: 'ready',
    total: parsed.events.length,
    toImport,
    duplicates,
    rangeStart,
    rangeEnd,
    items: sorted,
    truncated: parsed.truncated,
  };
}

/**
 * Writes analysis.toImport (events + ics_imports mapping) in one transaction,
 * then tells the UI to refresh. No notifications are scheduled (reminders are
 * not imported).
 */
export async function importIcs(analysis: IcsAnalysis): Promise<IcsImportResult> {
  if (analysis.kind !== 'ready') return { imported: 0, skipped: 0 };

  const nowIso = new Date().toISOString();
  const pairs = analysis.toImport.map((p) => ({
    event: toCalendarEvent(p, generateUUID(), nowIso),
    sourceKey: sourceKeyOf(p),
  }));

  await StorageService.saveImportedEvents(pairs);

  if (pairs.length > 0) {
    // Same refresh signal useNotes uses after a save: notesVersion drives
    // useNotes / WeekTimeline / MonthGrid; refreshMonth rebuilds monthData.
    const store = useCalendarStore.getState();
    store.incrementNotesVersion();
    store.refreshMonth();
  }

  let firstImportedDate: string | undefined;
  for (const p of analysis.toImport) {
    if (firstImportedDate === undefined || p.startDate < firstImportedDate) firstImportedDate = p.startDate;
  }

  return {
    imported: pairs.length,
    skipped: analysis.duplicates.length,
    firstImportedDate,
  };
}

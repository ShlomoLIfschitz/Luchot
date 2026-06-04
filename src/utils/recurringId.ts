// src/utils/recurringId.ts
// Helper for parsing composite recurring-instance ids produced by expandRecurringNotes.
// Format: "{masterUUID}:{YYYY-MM-DD}"  (a UUID never contains ':', so lastIndexOf is safe)

/**
 * Split a note id into its master id and occurrence date components.
 * - Plain UUID (one-off or master row): occurrenceDate is null.
 * - Composite id (recurring instance): occurrenceDate is the "YYYY-MM-DD" suffix.
 */
export function splitInstanceId(id: string): { masterId: string; occurrenceDate: string | null } {
  const i = id.lastIndexOf(':');
  if (i === -1) return { masterId: id, occurrenceDate: null };
  return { masterId: id.slice(0, i), occurrenceDate: id.slice(i + 1) };
}
